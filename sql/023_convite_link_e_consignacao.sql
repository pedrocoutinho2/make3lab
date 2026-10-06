-- 023_convite_link_e_consignacao.sql
-- Make3Lab, 05/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- 1. Convite por link preso ao e-mail. Cada convite ganha um codigo aleatorio
--    (gen_random_uuid x2, 64 hex) e validade de 7 dias. Link:
--    app.make3lab.com.br/?convite=CODIGO. Antes do login, fn_convite_info
--    devolve so o nome da loja, o e-mail convidado e o papel. A entrada na loja
--    continua exigindo cadastro ou login com o mesmo e-mail do convite.
--    Revogar continua sendo apagar o convite (politica convite_cancelar).
-- 2. Venda de acerto de consignacao: o a receber automatico e o total menos
--    dados.comissao_valor. O front deixa de criar lancamento proprio no acerto.
-- Depende do 015 a 022 (redefine fn_sinc_financeiro_venda do 022). Idempotente.
-- STATUS: testado em Postgres 16 em 05/10/2026 (auth simulado). NAO aplicado.
-- Aplicar junto com o 022, antes do merge.

-- ------------------------------------------------- 1. convite com codigo
alter table public.convites add column if not exists codigo text;
alter table public.convites add column if not exists expira_em timestamptz;
alter table public.convites alter column codigo
  set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
alter table public.convites alter column expira_em set default now() + interval '7 days';
update public.convites
   set codigo = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
       expira_em = now() + interval '7 days'
 where codigo is null and aceito_em is null;
create unique index if not exists convites_codigo_uidx on public.convites(codigo) where codigo is not null;

create or replace function public.fn_convite_valido(c public.convites) returns boolean
language sql stable as $$
  select c.aceito_em is null and (c.expira_em is null or c.expira_em > now());
$$;

-- informacao publica minima do link (anon pode chamar)
create or replace function public.fn_convite_info(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.convites; v_loja text; v_conta boolean;
begin
  if coalesce(length(p_codigo),0) < 32 then
    return jsonb_build_object('valido', false, 'motivo', 'invalido');
  end if;
  select * into c from public.convites where codigo = p_codigo;
  if not found then return jsonb_build_object('valido', false, 'motivo', 'invalido'); end if;
  if c.aceito_em is not null then return jsonb_build_object('valido', false, 'motivo', 'usado'); end if;
  if c.expira_em is not null and c.expira_em <= now() then
    return jsonb_build_object('valido', false, 'motivo', 'vencido');
  end if;
  select coalesce(nullif(cf.empresa->>'marca',''), nullif(cf.empresa->>'nome',''), o.nome)
    into v_loja
    from public.organizacoes o left join public.org_config cf on cf.org_id = o.id
   where o.id = c.org_id;
  select exists (select 1 from auth.users u where lower(u.email) = lower(c.email)) into v_conta;
  return jsonb_build_object('valido', true, 'loja', v_loja, 'email', c.email,
                            'papel', c.papel, 'conta_existe', v_conta, 'expira_em', c.expira_em);
end $$;

-- usuario logado aceita pelo link (conta ja existia)
create or replace function public.fn_aceitar_convite(p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.convites; v_email text; v_nome text;
begin
  select email, raw_user_meta_data->>'nome' into v_email, v_nome from auth.users where id = auth.uid();
  if v_email is null then raise exception 'Entre na sua conta para aceitar o convite.' using errcode = 'P0001'; end if;
  select * into c from public.convites where codigo = p_codigo;
  if not found or not public.fn_convite_valido(c) then
    raise exception 'Este convite nao vale mais. Peca um novo link a quem convidou.' using errcode = 'P0001';
  end if;
  if lower(c.email) <> lower(v_email) then
    raise exception 'Este convite foi feito para outro e-mail. Entre com o e-mail convidado.' using errcode = 'P0001';
  end if;
  insert into public.membros (org_id, user_id, papel, email, nome)
    values (c.org_id, auth.uid(), c.papel, v_email, v_nome)
    on conflict (org_id, user_id) do nothing;
  update public.convites set aceito_em = now() where id = c.id;
  return jsonb_build_object('org_id', c.org_id);
end $$;

-- dono gera link novo (novo codigo e mais 7 dias); o link antigo para de valer
create or replace function public.fn_convite_renovar(p_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_cod text;
begin
  select org_id into v_org from public.convites where id = p_id and aceito_em is null;
  if v_org is null or not public.fn_sou_dono(v_org) then
    raise exception 'Convite nao encontrado.' using errcode = 'P0001';
  end if;
  v_cod := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update public.convites set codigo = v_cod, expira_em = now() + interval '7 days' where id = p_id;
  return v_cod;
end $$;

-- convite vencido nao entra mais pelo cadastro nem pelo aceite antigo
create or replace function public.aceitar_convites() returns integer
language plpgsql security definer set search_path = public as $$
declare v_email text; v_n integer := 0; c record;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;
  for c in select * from public.convites cv where lower(cv.email) = lower(v_email)
              and public.fn_convite_valido(cv) loop
    insert into public.membros (org_id, user_id, papel, email, nome)
      values (c.org_id, auth.uid(), c.papel, v_email,
              (select raw_user_meta_data->>'nome' from auth.users where id = auth.uid()))
      on conflict (org_id, user_id) do nothing;
    update public.convites set aceito_em = now() where id = c.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.fn_nova_conta() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_nome text; c record; v_convidado boolean := false;
begin
  for c in select * from public.convites cv where lower(cv.email) = lower(new.email)
              and public.fn_convite_valido(cv) loop
    insert into public.membros (org_id, user_id, papel, email, nome) values (c.org_id, new.id, c.papel, new.email, new.raw_user_meta_data->>'nome')
      on conflict (org_id, user_id) do nothing;
    update public.convites set aceito_em = now() where id = c.id;
    v_convidado := true;
  end loop;
  if new.raw_user_meta_data ? 'aceite_versao' then
    insert into public.aceites (user_id, versao) values (new.id, new.raw_user_meta_data->>'aceite_versao');
  end if;
  if not v_convidado then
    v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'empresa', '')), '');
    insert into public.organizacoes (nome) values (coalesce(v_nome, split_part(new.email, '@', 1))) returning id into v_org;
    insert into public.membros (org_id, user_id, papel, email, nome) values (v_org, new.id, 'dono', new.email, new.raw_user_meta_data->>'nome');
    perform public.fn_semear_org_v2(v_org);
  end if;
  return new;
end $$;

revoke all on function public.fn_convite_info(text) from public;
grant execute on function public.fn_convite_info(text) to anon, authenticated;
grant execute on function public.fn_aceitar_convite(text) to authenticated;
grant execute on function public.fn_convite_renovar(bigint) to authenticated;

-- ------------------------------- 2. financeiro com comissao de consignacao
create or replace function public.fn_sinc_financeiro_venda() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_soma numeric; v_pagos int; v_abertos int; v_lanc text; l record;
        v_receber numeric := new.total - coalesce(nullif(new.dados->>'comissao_valor','')::numeric, 0);
        v_pago boolean := coalesce((new.dados->'pagamento'->>'efetuado')::boolean, false);
        v_pago_em text := coalesce(nullif(new.dados->'pagamento'->>'em',''),
                                   to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD'));
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
         count(*) filter (where not pago)
    into v_soma, v_pagos, v_abertos
    from public.lancamentos
   where org_id = new.org_id and ativo and tipo = 'receber'
     and dados->>'venda_id' = new.id and coalesce(dados->>'estorno_de','') = '';

  -- pagamento marcado com um unico lancamento aberto: quita
  if v_pago and v_pagos = 0 and v_abertos = 1 then
    update public.lancamentos
       set pago = true, valor = v_receber,
           dados = dados || jsonb_build_object('pago_em', v_pago_em, 'forma_id',
                     coalesce(new.dados->'pagamento'->>'forma_id', new.dados->>'forma_id', ''))
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
            'Venda ' || coalesce(new.numero::text,'?')
              || case when v_receber <> new.total then ' (liquido de comissao)' else '' end, v_receber,
            coalesce(new.data, current_date), v_pago, new.cliente_id,
            jsonb_build_object('venda_id', new.id, 'origem', 'auto')
            || case when v_pago then jsonb_build_object('pago_em', v_pago_em, 'forma_id',
                     coalesce(new.dados->'pagamento'->>'forma_id', new.dados->>'forma_id', ''))
                    else '{}'::jsonb end);
  else
    update public.vendas
       set dados = dados || jsonb_build_object('divergencia_financeiro',
             'a receber soma ' || to_char(v_soma,'FM999999990.00') || ' e o valor a receber da venda e ' || to_char(v_receber,'FM999999990.00'))
     where org_id = new.org_id and id = new.id;
  end if;
  return null;
end $$;
