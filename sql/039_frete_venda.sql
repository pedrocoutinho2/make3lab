-- 039_frete_venda.sql · 23/10/2026
-- Make3Lab, projeto Supabase lvnavmtyselveozllcuy
--
-- Frete no orcamento e na venda (decisao do Pedro em 23/10/2026).
-- O documento guarda em dados.frete:
--   {modo: 'sem'|'cobrar'|'gratis'|'calcular', valor, custo, modalidade, custo_pago, custo_pago_em}
--
-- 1. Frete cobrado e repasse: o app soma no total (vendas.total), entao o a receber
--    da venda (fn_sinc_financeiro_venda, 026/027) ja inclui o frete sem mudanca.
--    O sinal incide so sobre produtos e insumos; o app manda o sinal em reais pronto.
-- 2. Frete pago (custo real) vira saida variavel no Financeiro: um lancamento a pagar
--    por venda, marcado com dados.frete_venda_id (e nao venda_id, para o fn_lanc_guarda
--    e o cancelamento da venda nao mexerem nele). Custo vazio no modo cobrar vale o cobrado.
--    - aberto acompanha valor, vencimento e "frete ja pago" da venda
--    - pago nao se edita (regra do 015); mudar o custo depois disso e estorno no Financeiro
--    - venda cancelada ou excluida, ou frete sem custo: o aberto sai; o pago fica,
--      porque o dinheiro da etiqueta ja saiu do caixa
-- 3. Valores de frete nunca negativos.
-- Sem mudanca em fn_sinc_financeiro_venda. Pode rodar de novo sem estragar nada.
-- STATUS: testado no banco em transacao desfeita e aplicado em 23/10/2026 (era o 033 no branch; renumerado para 039 no rebase de 24/10/2026).

create or replace function public.fn_valida_frete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(nullif(new.dados->'frete'->>'valor','')::numeric, 0) < 0
     or coalesce(nullif(new.dados->'frete'->>'custo','')::numeric, 0) < 0 then
    raise exception 'O valor do frete nao pode ser negativo.' using errcode = 'P0001';
  end if;
  if coalesce(new.dados->'frete'->>'modo','') not in ('','sem','cobrar','gratis','calcular') then
    raise exception 'Modo de frete invalido.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists a_valida_frete on public.vendas;
create trigger a_valida_frete before insert or update on public.vendas
  for each row execute function public.fn_valida_frete();
drop trigger if exists a_valida_frete on public.orcamentos;
create trigger a_valida_frete before insert or update on public.orcamentos
  for each row execute function public.fn_valida_frete();

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
begin
  if pg_trigger_depth() > 1 then return null; end if;

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

drop trigger if exists z_sinc_frete on public.vendas;
create trigger z_sinc_frete after insert or update on public.vendas
  for each row execute function public.fn_sinc_frete_venda();
