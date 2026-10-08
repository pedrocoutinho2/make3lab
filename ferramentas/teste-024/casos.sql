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
  -- uma tentativa da loja 2, que o usuário A não pode ver
  insert into public.producao_tentativas (org_id, id, ordem_id, qtd_iniciada, qtd_boa, qtd_perdida, criado_por)
    values (o2, 't2', 't024-op2', 5, 5, 0, ub);

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

  -- 8b. estorno de tentativa de outra loja: mesmo erro de tentativa que não existe, nas duas formas
  for v in select * from (values
      ('de outra loja, lançado na própria loja', $$insert into public.producao_tentativas (org_id, id, estorna_id) values ('%1$s', 'e4', 't2')$$),
      ('de outra loja, lançado na loja dona dela', $$insert into public.producao_tentativas (org_id, id, estorna_id) values ('%2$s', 'e5', 't2')$$),
      ('de tentativa que não existe', $$insert into public.producao_tentativas (org_id, id, estorna_id) values ('%1$s', 'e6', 'nao-existe')$$)
    ) c(nome, cmd) loop
    begin
      execute format(v.cmd, o1, o2);
      r := r || format(E'FALHOU recusa estorno %s (o banco aceitou)\n', v.nome);
    exception when others then
      r := r || format(E'%s recusa estorno %s: %s\n', case when sqlerrm = 'Tentativa a estornar nao existe nesta loja.' then 'PASSOU' else 'FALHOU' end, v.nome, sqlerrm);
    end;
  end loop;

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

  -- 11. expurgo: usuário autenticado continua recusado com o setting ligado,
  --     inclusive se alguém der grant e política de delete por engano (o trigger segura)
  perform set_config('make3lab.expurgo', 'on', true);
  set local role authenticated;
  begin
    delete from public.producao_tentativas where org_id = o1 and id = 't1';
    r := r || E'FALHOU recusa apagar como authenticated com expurgo ligado (o banco aceitou)\n';
  exception when others then r := r || format(E'PASSOU recusa apagar como authenticated com expurgo ligado: %s\n', sqlerrm); end;
  reset role;
  -- só dentro deste teste, que é desfeito: sem grant e política, nem chega no trigger
  grant delete on public.producao_tentativas to authenticated;
  create policy t024_apagar on public.producao_tentativas for delete to authenticated using (true);
  set local role authenticated;
  begin
    delete from public.producao_tentativas where org_id = o1 and id = 't1';
    get diagnostics n = row_count;
    r := r || format(E'FALHOU recusa apagar como authenticated com expurgo ligado, grant e política de delete (apagou %s)\n', n);
  exception when others then r := r || format(E'PASSOU recusa apagar como authenticated com expurgo ligado, grant e política de delete: %s\n', sqlerrm); end;
  reset role;
  drop policy t024_apagar on public.producao_tentativas;
  revoke delete on public.producao_tentativas from authenticated;

  -- 12. expurgo pelo dono do banco: update continua recusado; delete da loja inteira passa,
  --     com original e estorno no mesmo comando
  begin
    update public.producao_tentativas set qtd_boa = 25, qtd_perdida = 0 where org_id = o1 and id = 't1';
    r := r || E'FALHOU recusa editar com expurgo ligado (o banco aceitou)\n';
  exception when others then r := r || format(E'PASSOU recusa editar com expurgo ligado: %s\n', sqlerrm); end;
  begin
    delete from public.producao_tentativas where org_id = o1;
    select count(*) into n from public.producao_tentativas where org_id = o1;
    r := r || format(E'%s expurgo apaga as tentativas da loja, original e estorno juntos (sobraram %s)\n', case when n = 0 then 'PASSOU' else 'FALHOU' end, n);
    select count(*) into n from public.producao_tentativas where org_id = o2;
    r := r || format(E'%s expurgo não toca na outra loja (loja 2: %s)\n', case when n = 1 then 'PASSOU' else 'FALHOU' end, n);
  exception when others then r := r || format(E'FALHOU expurgo pelo dono do banco: %s\n', sqlerrm); end;

  raise exception E'RESULTADO\n%', r;
end $teste$;
