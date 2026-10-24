-- 040_frete_entrada_e_saida.sql · 23/10/2026
-- Make3Lab, projeto Supabase lvnavmtyselveozllcuy
--
-- Ajuste do Pedro em 23/10/2026 sobre o 039: frete pago lancado so como saida parecia
-- prejuizo no Financeiro. Frete cobrado do cliente passa a ter entrada propria, ao lado
-- da saida do frete pago, para os dois aparecerem juntos.
--
-- 1. fn_sinc_financeiro_venda (027): o a receber da venda deixa de levar o frete cobrado
--    (total - comissao - frete). Resto igual ao 027. A descricao "(liquido de comissao)"
--    passa a olhar a comissao, nao a diferenca para o total.
-- 2. fn_sinc_frete_venda (039): alem da saida do frete pago, mantem a entrada
--    "Frete da venda N" (tipo receber, dados.frete_venda_id, parte 'frete'):
--    - vence junto com o restante (sinal ligado: vencimento do restante; sem sinal: data da venda)
--    - pagamento efetuado da venda quita a entrada do frete junto
--    - venda cancelada: a aberta sai e a recebida se estorna, como o resto da venda
--    - mudou o frete com a entrada aberta: acompanha; recebida nao muda (estorno no Financeiro)
--    Frete gratis continua so com a saida: ali o frete e custo de verdade.
-- Depende do 027 e do 039. Pode rodar de novo sem estragar nada.
-- STATUS: testado no banco em transacao desfeita e aplicado em 23/10/2026 (era o 034 no branch; renumerado para 040 no rebase de 24/10/2026).
-- Para voltar: rodar o 027 e o 039 de novo.

create or replace function public.fn_sinc_financeiro_venda() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_soma numeric; v_pagos int; v_abertos int; v_lanc text; l record;
        v_receber numeric := new.total - coalesce(nullif(new.dados->>'comissao_valor','')::numeric, 0)
                              -- 040: frete cobrado tem a entrada propria (fn_sinc_frete_venda)
                              - case when coalesce(new.dados->'frete'->>'modo','') = 'cobrar'
                                      and coalesce(new.dados->>'origem','') <> 'consignacao'
                                     then round(greatest(coalesce(nullif(new.dados->'frete'->>'valor','')::numeric, 0), 0), 2) else 0 end;
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
    -- sinal retido (dados.sinal.reter, decidido caso a caso na tela): o lancamento
    -- pago do sinal fica como esta, marcado como retido; o resto se estorna
    for l in select id, dados from public.lancamentos
              where org_id = new.org_id and ativo and pago
                and dados->>'venda_id' = new.id and coalesce(dados->>'estornado_em','') = ''
                and coalesce(dados->>'estorno_de','') = '' loop
      if l.dados->>'parte' = 'sinal' and coalesce((new.dados->'sinal'->>'reter')::boolean, false) then
        update public.lancamentos
           set dados = dados || jsonb_build_object('sinal_retido', true),
               descricao = case when descricao like '%(retido)' then descricao else descricao || ' (retido)' end
         where org_id = new.org_id and id = l.id;
      else
        perform public.fn_estornar(new.org_id, l.id, 'venda cancelada');
      end if;
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
            v_desc || case when coalesce(nullif(new.dados->>'comissao_valor','')::numeric, 0) > 0 then ' (liquido de comissao)' else '' end, v_receber,
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

create or replace function public.fn_sinc_frete_venda() returns trigger
language plpgsql security definer set search_path = public as $$
declare f jsonb := coalesce(new.dados->'frete', '{}'::jsonb);
        v_modo text := coalesce(f->>'modo','');
        v_custo numeric := 0;
        v_pago boolean := coalesce((f->>'custo_pago')::boolean, false);
        v_pago_em text := coalesce(nullif(f->>'custo_pago_em',''),
                                   to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD'));
        v_venc date;
        v_desc text;
        l record;
        le record; v_cob numeric; v_rvenc date; v_rdesc text;
        v_vpago boolean := coalesce((new.dados->'pagamento'->>'efetuado')::boolean, false);
        v_vpago_em text := coalesce(nullif(new.dados->'pagamento'->>'em',''),
                                    to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD'));
        v_vforma text := coalesce(new.dados->'pagamento'->>'forma_id', new.dados->>'forma_id', '');
begin
  if pg_trigger_depth() > 1 then return null; end if;

  -- ------------------------------------------------ entrada do frete cobrado (040)
  v_cob := case when v_modo = 'cobrar' and new.ativo and new.status <> 'cancelada'
                     and coalesce(new.dados->>'origem','') <> 'consignacao'
                then round(greatest(coalesce(nullif(f->>'valor','')::numeric, 0), 0), 2) else 0 end;
  select * into le from public.lancamentos
   where org_id = new.org_id and ativo and tipo = 'receber'
     and dados->>'frete_venda_id' = new.id and coalesce(dados->>'estorno_de','') = ''
   order by criado_em limit 1;
  if (not new.ativo or new.status = 'cancelada') and le.id is not null and le.pago
     and coalesce(le.dados->>'estornado_em','') = '' then
    perform public.fn_estornar(new.org_id, le.id, 'venda cancelada');
  elsif v_cob = 0 then
    if le.id is not null and not le.pago then
      update public.lancamentos set ativo = false where org_id = new.org_id and id = le.id;
    end if;
  else
    v_rvenc := case when coalesce((new.dados->'sinal'->>'on')::boolean, false)
                         or coalesce(nullif(new.dados->'sinal'->>'valor','')::numeric, 0) > 0
                    then nullif(new.dados->'sinal'->>'saldo_venc','')::date
                    else coalesce(new.data, current_date) end;
    v_rdesc := 'Frete da venda ' || coalesce(new.numero::text,'?')
               || case when coalesce(f->>'modalidade','') <> '' then ' (' || (f->>'modalidade') || ')' else '' end;
    if le.id is null then
      insert into public.lancamentos (org_id, id, tipo, descricao, valor, venc, pago, cliente_id, dados)
      values (new.org_id, 'auto' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
              'receber', v_rdesc, v_cob, v_rvenc, v_vpago, new.cliente_id,
              jsonb_build_object('frete_venda_id', new.id, 'origem', 'auto_frete', 'parte', 'frete',
                                 'venc_a_definir', v_rvenc is null)
              || case when v_vpago then jsonb_build_object('pago_em', v_vpago_em, 'forma_id', v_vforma) else '{}'::jsonb end);
    elsif not le.pago then
      update public.lancamentos
         set valor = v_cob, venc = v_rvenc, pago = v_vpago, descricao = v_rdesc, cliente_id = new.cliente_id,
             dados = dados || jsonb_build_object('venc_a_definir', v_rvenc is null)
                     || case when v_vpago then jsonb_build_object('pago_em', v_vpago_em, 'forma_id', v_vforma) else '{}'::jsonb end
       where org_id = new.org_id and id = le.id;
    end if;
  end if;

  -- ------------------------------------------------ saida do frete pago (039)
  if v_modo = 'cobrar' then
    v_custo := coalesce(nullif(f->>'custo','')::numeric, nullif(f->>'valor','')::numeric, 0);
  elsif v_modo = 'gratis' then
    v_custo := coalesce(nullif(f->>'custo','')::numeric, 0);
  end if;
  v_custo := round(greatest(v_custo, 0), 2);
  if not new.ativo or new.status = 'cancelada' or coalesce(new.dados->>'origem','') = 'consignacao' then
    v_custo := 0;
  end if;

  select * into l from public.lancamentos
   where org_id = new.org_id and ativo and tipo = 'pagar'
     and dados->>'frete_venda_id' = new.id and coalesce(dados->>'estorno_de','') = ''
   order by criado_em limit 1;

  if v_custo = 0 then
    if l.id is not null and not l.pago then
      update public.lancamentos set ativo = false where org_id = new.org_id and id = l.id;
    end if;
    return null;
  end if;

  v_venc := case when v_pago then v_pago_em::date
                 else coalesce(nullif(new.dados->>'entrega_em','')::date, new.data, current_date) end;
  v_desc := 'Frete da venda ' || coalesce(new.numero::text,'?')
            || case when coalesce(f->>'modalidade','') <> '' then ' (' || (f->>'modalidade') || ')' else '' end;

  if l.id is null then
    insert into public.lancamentos (org_id, id, tipo, descricao, valor, venc, pago, cliente_id, dados)
    values (new.org_id, 'auto' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
            'pagar', v_desc, v_custo, v_venc, v_pago, null,
            jsonb_build_object('frete_venda_id', new.id, 'origem', 'auto_frete', 'natureza', 'variavel')
            || case when v_pago then jsonb_build_object('pago_em', v_pago_em) else '{}'::jsonb end);
  elsif not l.pago then
    update public.lancamentos
       set valor = v_custo, venc = v_venc, pago = v_pago, descricao = v_desc,
           dados = dados || case when v_pago then jsonb_build_object('pago_em', v_pago_em) else '{}'::jsonb end
     where org_id = new.org_id and id = l.id;
  end if;
  return null;
end $$;
