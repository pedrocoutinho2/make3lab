-- Teste do SQL 026 (sinal da venda) no banco. Roda num bloco só e termina com erro de
-- propósito ("RESULTADO ..."): tudo o que o teste criou volta atrás, nada fica gravado.
-- Uso: colar no SQL Editor do Supabase (ou execute_sql) depois de aplicar o 026.
do $teste$
declare
  o uuid; r text := ''; x record;
begin
  insert into public.organizacoes (nome, status) values ('teste 026', 'beta') returning id into o;

  -- 1. venda nova de 200 com sinal de 50% (100), saldo na entrega 20/10
  insert into public.vendas (org_id, id, numero, status, data, total, dados)
  values (o, 'v1', 1, 'aberta', '2026-10-09', 200,
          '{"sinal":{"valor":100,"pct":0.5,"tipo":"pct","pago":false,"saldo_modo":"entrega","saldo_venc":"2026-10-20"}}');
  select string_agg(dados->>'parte' || '=' || valor::numeric(10,2) || '/' || coalesce(venc::text,'null') || '/' || pago, ' ' order by dados->>'parte' desc) into x
    from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v1';
  r := r || E'\n1 dois lancamentos: ' || (x.string_agg = 'sinal=100.00/2026-10-09/false saldo=100.00/2026-10-20/false') || '  ' || x.string_agg;

  -- 2. marcar sinal pago em 10/10 com forma f1: baixa parcial
  update public.vendas set dados = jsonb_set(dados, '{sinal}', dados->'sinal' || '{"pago":true,"em":"2026-10-10","forma_id":"f1"}') where org_id = o and id = 'v1';
  select string_agg(dados->>'parte' || '=' || pago || '/' || coalesce(dados->>'pago_em','') || '/' || coalesce(dados->>'forma_id',''), ' ' order by dados->>'parte' desc) into x
    from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v1';
  r := r || E'\n2 sinal pago, saldo aberto: ' || (x.string_agg = 'sinal=true/2026-10-10/f1 saldo=false//') || '  ' || x.string_agg;

  -- 3. total sobe para 260 e o sinal recalculado iria a 130: sinal pago fica 100, saldo vira 160
  update public.vendas set total = 260, dados = jsonb_set(dados, '{sinal,valor}', '130') where org_id = o and id = 'v1';
  select string_agg(dados->>'parte' || '=' || valor::numeric(10,2), ' ' order by dados->>'parte' desc) into x
    from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v1';
  r := r || E'\n3 pago nao muda, saldo absorve: ' || (x.string_agg = 'sinal=100.00 saldo=160.00') || '  ' || x.string_agg;

  -- 4. saldo passa a "a definir"
  update public.vendas set dados = jsonb_set(dados, '{sinal,saldo_venc}', '""') where org_id = o and id = 'v1';
  select venc, dados->>'venc_a_definir' d into x from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v1' and dados->>'parte' = 'saldo';
  r := r || E'\n4 saldo a definir: ' || (x.venc is null and x.d = 'true') || '  ' || coalesce(x.venc::text,'null') || '/' || x.d;

  -- 5. pagamento efetuado quita o saldo
  update public.vendas set dados = dados || '{"pagamento":{"efetuado":true,"em":"2026-10-21","forma_id":"f2"},"forma_id":"f2"}' where org_id = o and id = 'v1';
  select string_agg(dados->>'parte' || '=' || pago || '/' || coalesce(dados->>'pago_em',''), ' ' order by dados->>'parte' desc) into x
    from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v1';
  r := r || E'\n5 tudo pago: ' || (x.string_agg = 'sinal=true/2026-10-10 saldo=true/2026-10-21') || '  ' || x.string_agg;
  select coalesce(dados->>'divergencia_financeiro','') into x from public.vendas where org_id = o and id = 'v1';
  r := r || E'\n5b sem divergencia: ' || (x.coalesce = '');

  -- 6. venda antiga com um a receber unico aberto ganha sinal de 30
  insert into public.vendas (org_id, id, numero, status, data, total, dados) values (o, 'v2', 2, 'aberta', '2026-10-09', 90, '{}');
  update public.vendas set dados = '{"sinal":{"valor":30,"pago":false,"saldo_venc":""}}' where org_id = o and id = 'v2';
  select count(*) filter (where ativo), string_agg(case when ativo then dados->>'parte' || '=' || valor::numeric(10,2) end, ' ' order by dados->>'parte' desc) s into x
    from public.lancamentos where org_id = o and dados->>'venda_id' = 'v2';
  r := r || E'\n6 unico vira sinal + saldo: ' || (x.count = 2 and x.s = 'sinal=30.00 saldo=60.00') || '  ' || x.s;

  -- 7. tira o sinal ainda aberto: volta a um lancamento de 90
  update public.vendas set dados = jsonb_set(dados, '{sinal,valor}', '0') where org_id = o and id = 'v2';
  select count(*), string_agg(coalesce(dados->>'parte','-') || '=' || valor::numeric(10,2), ' ') s into x
    from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v2';
  r := r || E'\n7 sinal tirado: ' || (x.count = 1 and x.s = '-=90.00') || '  ' || x.s;

  -- 8. venda criada ja paga com sinal: um lancamento so, pago
  insert into public.vendas (org_id, id, numero, status, data, total, dados) values (o, 'v3', 3, 'aberta', '2026-10-09', 50,
    '{"sinal":{"valor":20},"pagamento":{"efetuado":true,"em":"2026-10-09","forma_id":"f1"}}');
  select count(*), bool_and(pago), sum(valor)::numeric(10,2) s into x from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v3';
  r := r || E'\n8 ja paga ignora sinal: ' || (x.count = 1 and x.bool_and and x.s = 50) || '  ' || x.count || '/' || x.s;

  -- 9. sinal quitado direto no Financeiro conta como pago: mudar total nao mexe nele
  insert into public.vendas (org_id, id, numero, status, data, total, dados) values (o, 'v4', 4, 'aberta', '2026-10-09', 100, '{"sinal":{"valor":40,"saldo_venc":"2026-10-30"}}');
  update public.lancamentos set pago = true, dados = dados || '{"pago_em":"2026-10-09"}' where org_id = o and dados->>'venda_id' = 'v4' and dados->>'parte' = 'sinal';
  update public.vendas set total = 120, dados = jsonb_set(dados, '{sinal,valor}', '48') where org_id = o and id = 'v4';
  select string_agg(dados->>'parte' || '=' || valor::numeric(10,2) || '/' || pago, ' ' order by dados->>'parte' desc) s into x
    from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v4';
  r := r || E'\n9 quitado no Financeiro: ' || (x.s = 'sinal=40.00/true saldo=80.00/false') || '  ' || x.s;

  -- 10. cancelar: saldo aberto sai, sinal pago se estorna
  update public.vendas set status = 'cancelada' where org_id = o and id = 'v4';
  select count(*) filter (where ativo and not pago and dados->>'parte' = 'saldo') abertos,
         count(*) filter (where ativo and tipo = 'pagar' and dados->>'origem' = 'estorno') estornos into x
    from public.lancamentos where org_id = o and dados->>'venda_id' = 'v4';
  r := r || E'\n10 cancelada: ' || (x.abertos = 0 and x.estornos = 1) || '  abertos ' || x.abertos || ' estornos ' || x.estornos;

  -- 11. sinal maior ou igual ao total nao divide
  insert into public.vendas (org_id, id, numero, status, data, total, dados) values (o, 'v5', 5, 'aberta', '2026-10-09', 30, '{"sinal":{"valor":30}}');
  select count(*), max(coalesce(dados->>'parte','-')) p into x from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v5';
  r := r || E'\n11 sinal = total: ' || (x.count = 1 and x.p = '-') || '  ' || x.count || '/' || x.p;

  -- 12. venda sem sinal segue igual ao 023
  insert into public.vendas (org_id, id, numero, status, data, total, dados) values (o, 'v6', 6, 'aberta', '2026-10-09', 70, '{}');
  update public.vendas set dados = '{"pagamento":{"efetuado":true,"em":"2026-10-09"}}' where org_id = o and id = 'v6';
  select count(*), bool_and(pago), sum(valor)::numeric(10,2) s into x from public.lancamentos where org_id = o and ativo and dados->>'venda_id' = 'v6';
  r := r || E'\n12 sem sinal: ' || (x.count = 1 and x.bool_and and x.s = 70) || '  ' || x.count || '/' || x.s;

  raise exception 'RESULTADO %', r;
end $teste$;
