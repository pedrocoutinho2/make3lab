-- Casos do 039 (frete). Rodar depois do 039, numa transacao que termina em erro de proposito:
-- o DO no fim levanta uma excecao com o resultado, e nada fica gravado.
do $$
declare o uuid := (select id from public.organizacoes limit 1); r text := ''; l record; n int; v text := 'teste033' || substr(md5(random()::text),1,6);
begin
  -- 1. venda com frete cobrado 20, custo vazio: a receber 109 e a pagar 20 (vale o cobrado)
  insert into public.vendas (org_id, id, numero, status, cliente_id, data, total, dados)
  values (o, v, 99999, 'aberta', 'cli-teste', current_date, 109,
          '{"frete":{"modo":"cobrar","valor":20,"modalidade":"Correios"}}');
  select * into l from public.lancamentos where org_id = o and dados->>'frete_venda_id' = v and ativo;
  r := r || '1 pagar=' || coalesce(l.valor::text,'nada') || ' nat=' || coalesce(l.dados->>'natureza','') || ' desc=' || coalesce(l.descricao,'');
  select sum(valor) into l from public.lancamentos where org_id = o and dados->>'venda_id' = v and ativo and tipo='receber';
  r := r || ' | receber=' || coalesce(l.sum::text,'nada');
  -- 2. custo real 16,50 e pago: o aberto acompanha e quita
  update public.vendas set dados = dados || '{"frete":{"modo":"cobrar","valor":20,"custo":16.5,"custo_pago":true,"custo_pago_em":"2026-10-23"}}' where org_id = o and id = v;
  select * into l from public.lancamentos where org_id = o and dados->>'frete_venda_id' = v and ativo;
  r := r || ' || 2 valor=' || l.valor || ' pago=' || l.pago;
  -- 3. pago nao muda mais com novo custo
  update public.vendas set dados = dados || '{"frete":{"modo":"cobrar","valor":20,"custo":30,"custo_pago":true}}' where org_id = o and id = v;
  select * into l from public.lancamentos where org_id = o and dados->>'frete_venda_id' = v and ativo;
  r := r || ' || 3 valor=' || l.valor;
  -- 4. cancelar: o pago fica (sem estorno)
  update public.vendas set status = 'cancelada' where org_id = o and id = v;
  select count(*) into n from public.lancamentos where org_id = o and dados->>'frete_venda_id' = v and ativo and pago;
  r := r || ' || 4 pago_fica=' || n;
  -- 5. venda gratis com custo 12, depois sem frete: o aberto sai
  insert into public.vendas (org_id, id, numero, status, cliente_id, data, total, dados)
  values (o, v || 'b', 99998, 'aberta', 'cli-teste', current_date, 89, '{"frete":{"modo":"gratis","custo":12}}');
  select count(*) into n from public.lancamentos where org_id = o and dados->>'frete_venda_id' = v || 'b' and ativo and valor = 12;
  r := r || ' || 5 gratis=' || n;
  update public.vendas set dados = dados || '{"frete":{"modo":"sem"}}' where org_id = o and id = v || 'b';
  select count(*) into n from public.lancamentos where org_id = o and dados->>'frete_venda_id' = v || 'b' and ativo;
  r := r || ' sem=' || n;
  -- 6. negativo e recusado
  begin
    update public.vendas set dados = dados || '{"frete":{"modo":"cobrar","valor":-1}}' where org_id = o and id = v || 'b';
    r := r || ' || 6 negativo ACEITO';
  exception when others then r := r || ' || 6 negativo recusado'; end;
  raise exception 'RESULTADO %', r;
end $$;
