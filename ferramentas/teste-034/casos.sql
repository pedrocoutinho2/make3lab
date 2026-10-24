-- Casos do 034 (entrada e saida do frete). Rodar depois do 034, numa transacao que termina
-- em erro de proposito: o DO no fim levanta uma excecao com o resultado e nada fica gravado.
do $$
declare o uuid := (select id from public.organizacoes limit 1); r text := ''; l record; n int; v text := 'teste034' || substr(md5(random()::text),1,6);
  rec text;
begin
  -- 1. sem sinal: venda 109 com frete 20 cobrado, custo 16,50 => venda 89, entrada frete 20, saida 16,50
  insert into public.vendas (org_id, id, numero, status, cliente_id, data, total, dados)
  values (o, v, 99999, 'aberta', 'cli-teste', current_date, 109, '{"frete":{"modo":"cobrar","valor":20,"custo":16.5,"modalidade":"Correios"}}');
  select string_agg(tipo || ':' || descricao || '=' || valor::numeric(10,2) || case when pago then ' pago' else '' end, ' ; ' order by tipo, descricao) into rec
    from public.lancamentos where org_id = o and ativo and (dados->>'venda_id' = v or dados->>'frete_venda_id' = v);
  r := r || '1 [' || rec || ']';
  -- 2. pagamento efetuado: venda e frete quitados juntos, sem divergencia
  update public.vendas set dados = dados || '{"pagamento":{"efetuado":true,"em":"2026-10-23","forma_id":"f1"}}' where org_id = o and id = v;
  select count(*) into n from public.lancamentos where org_id = o and ativo and tipo = 'receber' and not pago and (dados->>'venda_id' = v or dados->>'frete_venda_id' = v);
  r := r || ' || 2 abertos=' || n || ' diverg=' || coalesce((select dados->>'divergencia_financeiro' from public.vendas where org_id = o and id = v), 'nao');
  -- 3. cancelar: entrada recebida do frete se estorna, saida paga continua (nao foi paga aqui, entao sai)
  update public.vendas set status = 'cancelada' where org_id = o and id = v;
  select count(*) into n from public.lancamentos where org_id = o and ativo and dados->>'estorno_de' is not null
     and dados->>'estorno_de' in (select id from public.lancamentos where org_id = o and dados->>'frete_venda_id' = v and tipo = 'receber');
  r := r || ' || 3 estorno_frete=' || n;
  -- 4. com sinal 44,50 de 89 e frete 20: sinal 44,50, saldo 44,50, frete 20 com vencimento do saldo
  insert into public.vendas (org_id, id, numero, status, cliente_id, data, total, dados)
  values (o, v || 'b', 99998, 'aberta', 'cli-teste', current_date, 109,
    '{"frete":{"modo":"cobrar","valor":20},"sinal":{"on":true,"valor":44.5,"saldo_venc":"2026-11-05"}}');
  select string_agg(descricao || '=' || valor::numeric(10,2) || '@' || coalesce(venc::text,'definir'), ' ; ' order by descricao) into rec
    from public.lancamentos where org_id = o and ativo and tipo = 'receber' and (dados->>'venda_id' = v || 'b' or dados->>'frete_venda_id' = v || 'b');
  r := r || ' || 4 [' || rec || '] diverg=' || coalesce((select dados->>'divergencia_financeiro' from public.vendas where org_id = o and id = v || 'b'), 'nao');
  -- 5. frete gratis: so a saida
  insert into public.vendas (org_id, id, numero, status, cliente_id, data, total, dados)
  values (o, v || 'c', 99997, 'aberta', 'cli-teste', current_date, 89, '{"frete":{"modo":"gratis","custo":12}}');
  select string_agg(tipo || '=' || valor::numeric(10,2), ' ; ' order by tipo) into rec
    from public.lancamentos where org_id = o and ativo and (dados->>'venda_id' = v || 'c' or dados->>'frete_venda_id' = v || 'c');
  r := r || ' || 5 [' || rec || ']';
  -- 6. venda sem frete continua igual ao 027
  insert into public.vendas (org_id, id, numero, status, cliente_id, data, total, dados)
  values (o, v || 'd', 99996, 'aberta', 'cli-teste', current_date, 50, '{}');
  select string_agg(descricao || '=' || valor::numeric(10,2), ' ; ') into rec
    from public.lancamentos where org_id = o and ativo and (dados->>'venda_id' = v || 'd' or dados->>'frete_venda_id' = v || 'd');
  r := r || ' || 6 [' || rec || ']';
  raise exception 'RESULTADO %', r;
end $$;
