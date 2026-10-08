-- Teste do SQL 024 no banco. Roda inteiro num bloco só e termina com erro de
-- propósito ("RESULTADO ..."): tudo o que o teste criou volta atrás, nada fica
-- gravado. O resultado vem na mensagem do erro, um caso por linha.
-- Uso: colar no SQL Editor do Supabase (ou execute_sql) depois de aplicar o 024.
do $teste$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  o1 uuid; o2 uuid; r text := ''; n int; v record;
  achou boolean;
begin
  insert into auth.users (id, email) values (ua, 'teste024a@exemplo.invalid'), (ub, 'teste024b@exemplo.invalid');
  insert into public.organizacoes (nome, status) values ('teste 024 loja 1', 'beta') returning id into o1;
  insert into public.organizacoes (nome, status) values ('teste 024 loja 2', 'beta') returning id into o2;
  insert into public.membros (org_id, user_id, papel) values (o1, ua, 'dono'), (o2, ub, 'dono');
  insert into public.ordens_producao (org_id, id, etapa, venda_id, dados) values
    (o1, 't024-op1', 'imprimindo', null, '{"peca_id":"p1","qtd":25}'),
    (o2, 't024-op2', 'imprimindo', null, '{"peca_id":"p1","qtd":5}'),
    (o1, 't024-op3', 'pronto', 't024-v1', '{"peca_id":"p1","linha":"L1","qtd":23,"origem":"auto"}');

  -- daqui para baixo, como o usuário A logado (papel authenticated, loja 1)
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. tentativa válida: 25 iniciadas, 23 boas, 2 perdidas
  begin
    insert into public.producao_tentativas (org_id, id, ordem_id, impressora_id, material_id, qtd_iniciada, qtd_boa, qtd_perdida, inicio_em)
    values (o1, 't1', 't024-op1', 'i1', 'm1', 25, 23, 2, now() - interval '3 hours');
    select criado_por = ua into achou from public.producao_tentativas where org_id = o1 and id = 't1';
    r := r || format(E'%s válida 25 = 23 + 2 grava, criado_por = usuário\n', case when achou then 'PASSOU' else 'FALHOU' end);
  exception when others then r := r || format(E'FALHOU válida 25 = 23 + 2: %s\n', sqlerrm); end;

  -- 2 a 6. inválidas: o banco tem que recusar
  for v in select * from (values
      ('boa + perdida diferente de iniciada (25 = 20 + 2)', $$insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida) values ('%1$s', 'x2', 't024-op1', 25, 20, 2)$$),
      ('quantidade negativa (2 = 3 + -1)',                  $$insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida) values ('%1$s', 'x3', 't024-op1', 2, 3, -1)$$),
      ('tentativa sem peça (0 = 0 + 0)',                    $$insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida) values ('%1$s', 'x4', 't024-op1', 0, 0, 0)$$),
      ('ordem que não existe',                              $$insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida) values ('%1$s', 'x5', 'nao-existe', 1, 1, 0)$$),
      ('fim antes do início',                               $$insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida, inicio_em, fim_em) values ('%1$s', 'x6', 't024-op1', 1, 1, 0, now(), now() - interval '1 hour')$$),
      ('em nome de outra pessoa (criado_por)',              $$insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida, criado_por) values ('%1$s', 'x7', 't024-op1', 1, 1, 0, '%2$s')$$),
      ('na loja de outra pessoa (RLS)',                     $$insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida) values ('%3$s', 'x8', 't024-op2', 1, 1, 0)$$),
      ('editar tentativa',                                  $$update public.producao_tentativas set qtd_perdida = 0, qtd_boa = 25 where org_id = '%1$s' and id = 't1'$$),
      ('apagar tentativa',                                  $$delete from public.producao_tentativas where org_id = '%1$s' and id = 't1'$$)
    ) c(nome, cmd) loop
    begin
      execute format(v.cmd, o1, ub, o2);
      get diagnostics n = row_count;
      r := r || format(E'FALHOU recusa %s (o banco aceitou, %s linha)\n', v.nome, n);
    exception when others then r := r || format(E'PASSOU recusa %s: %s\n', v.nome, sqlerrm); end;
  end loop;

  -- 7. leitura só da própria loja
  select count(*) into n from public.producao_tentativas where org_id = o2;
  r := r || format(E'%s não lê tentativa de outra loja\n', case when n = 0 then 'PASSOU' else 'FALHOU' end);

  -- 8. estorno: copia a original e as duas saem da conta
  begin
    insert into public.producao_tentativas (org_id, id, estorna_id) values (o1, 'e1', 't1');
    select count(*) into n from public.producao_tentativas where org_id = o1 and id = 'e1' and ordem_id = 't024-op1' and qtd_iniciada = 25 and qtd_perdida = 2;
    r := r || format(E'%s estorno grava com as quantidades da original\n', case when n = 1 then 'PASSOU' else 'FALHOU' end);
    select count(*) into n from public.producao_tentativas_validas where org_id = o1;
    r := r || format(E'%s estornada e estorno saem da conta (válidas: %s)\n', case when n = 0 then 'PASSOU' else 'FALHOU' end, n);
  exception when others then r := r || format(E'FALHOU estorno: %s\n', sqlerrm); end;
  begin
    insert into public.producao_tentativas (org_id, id, estorna_id) values (o1, 'e2', 't1');
    r := r || E'FALHOU recusa estornar duas vezes (o banco aceitou)\n';
  exception when others then r := r || format(E'PASSOU recusa estornar duas vezes: %s\n', sqlerrm); end;
  begin
    insert into public.producao_tentativas (org_id, id, estorna_id) values (o1, 'e3', 'e1');
    r := r || E'FALHOU recusa estorno de estorno (o banco aceitou)\n';
  exception when others then r := r || format(E'PASSOU recusa estorno de estorno: %s\n', sqlerrm); end;

  -- 9. reimpressão do que faltou entra; duplicata vinda da tela continua barrada
  insert into public.ordens_producao (org_id, id, etapa, venda_id, dados)
    values (o1, 't024-op4', 'fila', 't024-v1', '{"peca_id":"p1","linha":"L1","qtd":2,"origem":"reimpressao","de_ordem":"t024-op3"}');
  insert into public.ordens_producao (org_id, id, etapa, venda_id, dados)
    values (o1, 't024-op5', 'fila', 't024-v1', '{"peca_id":"p1","linha":"L1","qtd":2}');
  select count(*) into n from public.ordens_producao where org_id = o1 and id = 't024-op4';
  r := r || format(E'%s ordem de reimpressão passa pelo dedupe\n', case when n = 1 then 'PASSOU' else 'FALHOU' end);
  select count(*) into n from public.ordens_producao where org_id = o1 and id = 't024-op5';
  r := r || format(E'%s ordem duplicada da tela continua barrada\n', case when n = 0 then 'PASSOU' else 'FALHOU' end);

  reset role;

  -- 10. nem o dono do banco edita ou apaga (trigger, não só permissão)
  begin
    update public.producao_tentativas set qtd_boa = 25, qtd_perdida = 0 where org_id = o1 and id = 't1';
    r := r || E'FALHOU recusa editar como dono do banco (o banco aceitou)\n';
  exception when others then r := r || format(E'PASSOU recusa editar como dono do banco: %s\n', sqlerrm); end;
  begin
    delete from public.producao_tentativas where org_id = o1 and id = 't1';
    r := r || E'FALHOU recusa apagar como dono do banco (o banco aceitou)\n';
  exception when others then r := r || format(E'PASSOU recusa apagar como dono do banco: %s\n', sqlerrm); end;

  raise exception E'RESULTADO\n%', r;
end $teste$;
