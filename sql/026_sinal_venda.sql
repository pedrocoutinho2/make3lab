-- 026_sinal_venda.sql
-- Make3Lab, 09/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- Sinal (adiantamento que valida o pedido) na venda.
-- O 025 fica reservado para o refugo medido (decisao de 07/10).
--
-- A venda guarda em dados.sinal:
--   {valor, pct, tipo: 'pct'|'valor', pago, em, forma_id,
--    saldo_modo: 'entrega'|'definir'|'data', saldo_venc: 'AAAA-MM-DD' ou ''}
-- O app calcula valor (sinal em reais, ja limitado ao total) e saldo_venc
-- (data de entrega, data escolhida ou vazio para "a definir").
--
-- Venda com sinal tem dois lancamentos a receber, os dois origem 'auto':
--   dados.parte = 'sinal': valor do sinal, vence na data da venda
--   dados.parte = 'saldo': o resto, vence em saldo_venc (null = a definir)
-- Marcar o sinal como pago quita o lancamento do sinal (baixa parcial).
-- Pagamento efetuado (dados.pagamento.efetuado, do 022) quita o que estiver
-- aberto. Mudou o total ou o sinal: os abertos se ajustam; pago nao muda.
-- Sinal pago tambem vale quando o lancamento do sinal foi quitado direto no
-- Financeiro. Tirar o sinal (valor 0) so desfaz a divisao enquanto o sinal
-- estiver aberto.
-- Venda que ja tinha um unico lancamento aberto e ganha sinal: o lancamento
-- vira o do sinal e o saldo nasce ao lado.
-- Cancelar: igual ao 022/023, abertos saem e pagos se estornam (inclusive o
-- sinal). [CONFIRMAR] sinal nao reembolsavel ficaria retido.
-- Depende do 015 a 023 (redefine fn_sinc_financeiro_venda do 023). Idempotente.
-- STATUS: testado em Postgres 16 em 09/10/2026 (ferramentas/teste-026/casos.sql).
-- APLICADO em 09/10/2026 (migracao 026_sinal_venda), depois de rodar os 12 casos
-- contra o banco de producao numa transacao desfeita. Venda sem sinal segue como no 023.
-- Para voltar: rodar de novo o bloco fn_sinc_financeiro_venda do 023.

create or replace function public.fn_sinc_financeiro_venda() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_soma numeric; v_pagos int; v_abertos int; v_lanc text; l record;
        v_receber numeric := new.total - coalesce(nullif(new.dados->>'comissao_valor','')::numeric, 0);
        v_pago boolean := coalesce((new.dados->'pagamento'->>'efetuado')::boolean, false);
        v_pago_em text := coalesce(nullif(new.dados->'pagamento'->>'em',''),
                                   to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD'));
        v_forma text := coalesce(new.dados->'pagamento'->>'forma_id', new.dados->>'forma_id', '');
        -- sinal
        v_sinal numeric := round(coalesce(nullif(new.dados->'sinal'->>'valor','')::numeric, 0), 2);
        v_sinal_pago boolean := coalesce((new.dados->'sinal'->>'pago')::boolean, false);
        v_sinal_em text := coalesce(nullif(new.dados->'sinal'->>'em',''),
                                    to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD'));
        v_sinal_forma text := coalesce(nullif(new.dados->'sinal'->>'forma_id',''), new.dados->>'forma_id', '');
        v_saldo_venc date := nullif(new.dados->'sinal'->>'saldo_venc','')::date;
        v_desc text := 'Venda ' || coalesce(new.numero::text,'?');
        ls record; lsd record; v_partes int; v_sinal_ef numeric;
begin
  if pg_trigger_depth() > 1 then return null; end if;

  if not new.ativo or new.status = 'cancelada' then
    for l in select id from public.lancamentos
              where org_id = new.org_id and ativo and pago
                and dados->>'venda_id' = new.id and coalesce(dados->>'estornado_em','') = '' loop
      perform public.fn_estornar(new.org_id, l.id, 'venda cancelada');
    end loop;
    update public.lancamentos set ativo = false
     where org_id = new.org_id and ativo and not pago and dados->>'venda_id' = new.id;
    return null;
  end if;

  select coalesce(sum(valor),0),
         count(*) filter (where pago),
         count(*) filter (where not pago),
         count(*) filter (where dados->>'parte' in ('sinal','saldo'))
    into v_soma, v_pagos, v_abertos, v_partes
    from public.lancamentos
   where org_id = new.org_id and ativo and tipo = 'receber'
     and dados->>'venda_id' = new.id and coalesce(dados->>'estorno_de','') = '';

  if v_sinal >= v_receber then v_sinal := 0; end if;   -- sinal do total inteiro e pagamento, nao sinal

  -- ===================================================== modo sinal
  -- entra quando a venda tem sinal ou ja tem a divisao feita
  if (v_sinal > 0 and not (v_pago and v_pagos + v_abertos = 0)) or v_partes > 0 then
    select * into ls from public.lancamentos
     where org_id = new.org_id and ativo and tipo = 'receber' and dados->>'venda_id' = new.id
       and dados->>'parte' = 'sinal' and coalesce(dados->>'estorno_de','') = '' limit 1;
    select * into lsd from public.lancamentos
     where org_id = new.org_id and ativo and tipo = 'receber' and dados->>'venda_id' = new.id
       and dados->>'parte' = 'saldo' and coalesce(dados->>'estorno_de','') = '' limit 1;

    -- tirou o sinal com ele ainda aberto: volta a um lancamento so
    if v_sinal = 0 and ls.id is not null and not ls.pago then
      update public.lancamentos set ativo = false where org_id = new.org_id and id = ls.id;
      if lsd.id is not null and not lsd.pago then
        update public.lancamentos
           set valor = v_receber, venc = coalesce(new.data, current_date), descricao = v_desc,
               dados = (dados - 'parte') || jsonb_build_object('venc_a_definir', false)
         where org_id = new.org_id and id = lsd.id;
      end if;
      -- o resto (pagamento efetuado, divergencia) segue no caminho de um lancamento
      perform 1;
    else
      if ls.id is null and v_sinal > 0 then
        if v_pagos = 0 and v_abertos = 1 and v_partes = 0 then
          -- venda que ja tinha o a receber unico aberto: ele vira o do sinal
          update public.lancamentos
             set valor = v_sinal, descricao = v_desc || ', sinal',
                 dados = dados || jsonb_build_object('parte','sinal')
           where org_id = new.org_id and ativo and tipo = 'receber' and not pago
             and dados->>'venda_id' = new.id
          returning * into ls;
        elsif v_pagos + v_abertos = 0 then
          v_lanc := 'auto' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
          insert into public.lancamentos (org_id, id, tipo, descricao, valor, venc, pago, cliente_id, dados)
          values (new.org_id, v_lanc, 'receber', v_desc || ', sinal', v_sinal,
                  coalesce(new.data, current_date), false, new.cliente_id,
                  jsonb_build_object('venda_id', new.id, 'origem', 'auto', 'parte', 'sinal'))
          returning * into ls;
        end if;
      end if;

      if ls.id is not null then
        -- sinal aberto acompanha o valor; marcado como pago (ou venda paga) quita
        if not ls.pago then
          update public.lancamentos
             set valor = v_sinal,
                 pago = (v_sinal_pago or v_pago),
                 dados = dados || case when v_sinal_pago or v_pago
                   then jsonb_build_object('pago_em', case when v_sinal_pago then v_sinal_em else v_pago_em end,
                                           'forma_id', case when v_sinal_pago then v_sinal_forma else v_forma end)
                   else '{}'::jsonb end
           where org_id = new.org_id and id = ls.id
          returning * into ls;
        end if;
        v_sinal_ef := ls.valor;

        if lsd.id is null and v_receber - v_sinal_ef > 0 then
          v_lanc := 'auto' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
          insert into public.lancamentos (org_id, id, tipo, descricao, valor, venc, pago, cliente_id, dados)
          values (new.org_id, v_lanc, 'receber', v_desc || ', saldo', v_receber - v_sinal_ef, v_saldo_venc,
                  v_pago, new.cliente_id,
                  jsonb_build_object('venda_id', new.id, 'origem', 'auto', 'parte', 'saldo',
                                     'venc_a_definir', v_saldo_venc is null)
                  || case when v_pago then jsonb_build_object('pago_em', v_pago_em, 'forma_id', v_forma) else '{}'::jsonb end);
        elsif lsd.id is not null and not lsd.pago then
          update public.lancamentos
             set valor = v_receber - v_sinal_ef, venc = v_saldo_venc, pago = v_pago,
                 dados = dados || jsonb_build_object('venc_a_definir', v_saldo_venc is null)
                         || case when v_pago then jsonb_build_object('pago_em', v_pago_em, 'forma_id', v_forma) else '{}'::jsonb end
           where org_id = new.org_id and id = lsd.id;
        end if;

        -- conferencia: soma dos lancamentos da venda contra o valor a receber
        select coalesce(sum(valor),0) into v_soma from public.lancamentos
         where org_id = new.org_id and ativo and tipo = 'receber'
           and dados->>'venda_id' = new.id and coalesce(dados->>'estorno_de','') = '';
        if round(v_soma,2) = round(v_receber,2) then
          if coalesce(new.dados->>'divergencia_financeiro','') <> '' then
            update public.vendas set dados = dados - 'divergencia_financeiro' where org_id = new.org_id and id = new.id;
          end if;
        else
          update public.vendas
             set dados = dados || jsonb_build_object('divergencia_financeiro',
                   'a receber soma ' || to_char(v_soma,'FM999999990.00') || ' e o valor a receber da venda e ' || to_char(v_receber,'FM999999990.00'))
           where org_id = new.org_id and id = new.id;
        end if;
        return null;
      end if;
    end if;

    -- recontagem para o caminho de um lancamento
    select coalesce(sum(valor),0), count(*) filter (where pago), count(*) filter (where not pago)
      into v_soma, v_pagos, v_abertos
      from public.lancamentos
     where org_id = new.org_id and ativo and tipo = 'receber'
       and dados->>'venda_id' = new.id and coalesce(dados->>'estorno_de','') = '';
  end if;

  -- ===================================================== um lancamento (022/023)
  if v_pago and v_pagos = 0 and v_abertos = 1 then
    update public.lancamentos
       set pago = true, valor = v_receber,
           dados = dados || jsonb_build_object('pago_em', v_pago_em, 'forma_id', v_forma)
     where org_id = new.org_id and ativo and tipo = 'receber' and not pago
       and dados->>'venda_id' = new.id;
    return null;
  end if;

  if round(v_soma,2) = round(v_receber,2) then
    if coalesce(new.dados->>'divergencia_financeiro','') <> '' then
      update public.vendas set dados = dados - 'divergencia_financeiro'
       where org_id = new.org_id and id = new.id;
    end if;
    return null;
  end if;

  if v_pagos = 0 and v_abertos = 1 then
    update public.lancamentos set valor = v_receber
     where org_id = new.org_id and ativo and tipo = 'receber' and not pago
       and dados->>'venda_id' = new.id;
  elsif v_pagos = 0 and v_abertos = 0 and v_receber > 0 then
    v_lanc := 'auto' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
    insert into public.lancamentos (org_id, id, tipo, descricao, valor, venc, pago, cliente_id, dados)
    values (new.org_id, v_lanc, 'receber',
            v_desc || case when v_receber <> new.total then ' (liquido de comissao)' else '' end, v_receber,
            coalesce(new.data, current_date), v_pago, new.cliente_id,
            jsonb_build_object('venda_id', new.id, 'origem', 'auto')
            || case when v_pago then jsonb_build_object('pago_em', v_pago_em, 'forma_id', v_forma)
                    else '{}'::jsonb end);
  else
    update public.vendas
       set dados = dados || jsonb_build_object('divergencia_financeiro',
             'a receber soma ' || to_char(v_soma,'FM999999990.00') || ' e o valor a receber da venda e ' || to_char(v_receber,'FM999999990.00'))
     where org_id = new.org_id and id = new.id;
  end if;
  return null;
end $$;
