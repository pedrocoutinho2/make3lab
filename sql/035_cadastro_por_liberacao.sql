-- 035_cadastro_por_liberacao.sql
-- Make3Lab, 23/10/2026, projeto Supabase lvnavmtyselveozllcuy. Aplicado pelo SQL Editor (MCP).
-- Decisão de 23/10/2026: o cadastro aberto fecha. Conta nova só nasce de duas formas:
--   1. Liberação do admin (plataforma.liberacoes): link com código, preso a um e-mail, vale 30 dias.
--   2. Convite de equipe de uma loja que já existe (public.convites), dentro do limite de usuários do plano.
-- Sem nenhum dos dois, o trigger de auth.users recusa a criação e o app mostra "acesso por convite".
-- Quem já tem conta não muda nada. Idempotente.

create table if not exists plataforma.liberacoes (
  id          bigint generated always as identity primary key,
  email       text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nome        text,
  codigo      text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  lead_id     uuid references plataforma.lead_espera(id) on delete set null,
  criado_em   timestamptz not null default now(),
  expira_em   timestamptz not null default now() + interval '30 days',
  usado_em    timestamptz,
  user_id     uuid references auth.users(id) on delete set null,
  org_id      uuid references public.organizacoes(id) on delete set null,
  revogado_em timestamptz
);
create unique index if not exists liberacoes_aberta_uidx on plataforma.liberacoes (lower(email))
  where usado_em is null and revogado_em is null;
alter table plataforma.liberacoes enable row level security;
revoke all on plataforma.liberacoes from anon, authenticated;

-- liberação válida para um e-mail: aberta, não revogada e no prazo
create or replace function plataforma.liberacao_valida(p_email text)
returns plataforma.liberacoes language sql stable security definer set search_path = plataforma, public as $$
  select * from plataforma.liberacoes l
   where lower(l.email) = lower(p_email) and l.usado_em is null and l.revogado_em is null and l.expira_em > now()
   order by l.criado_em desc limit 1
$$;
revoke all on function plataforma.liberacao_valida(text) from public, anon, authenticated;

create or replace function public.fn_nova_conta() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_nome text; c record; v_convidado boolean := false; lib plataforma.liberacoes;
begin
  for c in select * from public.convites cv where lower(cv.email) = lower(new.email)
              and public.fn_convite_valido(cv) loop
    insert into public.membros (org_id, user_id, papel, email, nome) values (c.org_id, new.id, c.papel, new.email, new.raw_user_meta_data->>'nome')
      on conflict (org_id, user_id) do nothing;
    update public.convites set aceito_em = now() where id = c.id;
    v_convidado := true;
  end loop;
  if not v_convidado then
    lib := plataforma.liberacao_valida(new.email);
    if lib.id is null then
      raise exception 'cadastro_fechado: o Make3Lab está em acesso por convite' using errcode = 'P0001';
    end if;
  end if;
  if new.raw_user_meta_data ? 'aceite_versao' then
    insert into public.aceites (user_id, versao) values (new.id, new.raw_user_meta_data->>'aceite_versao');
  end if;
  if not v_convidado then
    v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'empresa', '')), '');
    insert into public.organizacoes (nome) values (coalesce(v_nome, split_part(new.email, '@', 1))) returning id into v_org;
    insert into public.membros (org_id, user_id, papel, email, nome) values (v_org, new.id, 'dono', new.email, new.raw_user_meta_data->>'nome');
    perform public.fn_semear_org_v2(v_org);
    update plataforma.liberacoes set usado_em = now(), user_id = new.id, org_id = v_org where id = lib.id;
    if lib.lead_id is not null then
      insert into plataforma.org_info (org_id, lead_id) values (v_org, lib.lead_id)
        on conflict (org_id) do update set lead_id = excluded.lead_id, atualizado_em = now();
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.fn_nova_conta() from public, anon, authenticated;

-- o app lê o link ?acesso=CODIGO antes do cadastro: e-mail travado, nome da pessoa
create or replace function public.fn_liberacao_info(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = plataforma, public as $$
declare l plataforma.liberacoes;
begin
  if coalesce(length(p_codigo), 0) < 32 then return jsonb_build_object('valido', false, 'motivo', 'invalido'); end if;
  select * into l from plataforma.liberacoes where codigo = p_codigo;
  if not found or l.revogado_em is not null then return jsonb_build_object('valido', false, 'motivo', 'invalido'); end if;
  if l.usado_em is not null then return jsonb_build_object('valido', false, 'motivo', 'usado'); end if;
  if l.expira_em <= now() then return jsonb_build_object('valido', false, 'motivo', 'vencido'); end if;
  return jsonb_build_object('valido', true, 'email', l.email, 'nome', l.nome,
    'conta_existe', exists (select 1 from auth.users u where lower(u.email) = lower(l.email)));
end $$;
revoke all on function public.fn_liberacao_info(text) from public;
grant execute on function public.fn_liberacao_info(text) to anon, authenticated;

-- admin: libera (ou devolve a liberação aberta do mesmo e-mail, com prazo renovado)
create or replace function public.admin_liberar(p_email text, p_nome text default null, p_lead uuid default null)
returns jsonb language plpgsql security definer set search_path = plataforma, public as $$
declare l plataforma.liberacoes; v_email text := lower(trim(p_email));
begin
  perform plataforma.exigir_admin();
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.' using errcode = 'P0001'; end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Este e-mail já tem conta no Make3Lab.' using errcode = 'P0001';
  end if;
  select * into l from plataforma.liberacoes where lower(email) = v_email and usado_em is null and revogado_em is null;
  if found then
    update plataforma.liberacoes set expira_em = now() + interval '30 days',
           nome = coalesce(nullif(trim(p_nome), ''), nome), lead_id = coalesce(p_lead, lead_id)
     where id = l.id returning * into l;
  else
    insert into plataforma.liberacoes (email, nome, lead_id) values (v_email, nullif(trim(p_nome), ''), p_lead) returning * into l;
  end if;
  if p_lead is not null then
    update plataforma.lead_espera set status = 'convidado' where id = p_lead and status in ('novo', 'contatado');
  end if;
  return jsonb_build_object('id', l.id, 'email', l.email, 'codigo', l.codigo, 'expira_em', l.expira_em);
end $$;

create or replace function public.admin_revogar_liberacao(p_id bigint)
returns void language plpgsql security definer set search_path = plataforma, public as $$
begin
  perform plataforma.exigir_admin();
  update plataforma.liberacoes set revogado_em = now() where id = p_id and usado_em is null;
end $$;

revoke all on function public.admin_liberar(text, text, uuid) from public, anon;
revoke all on function public.admin_revogar_liberacao(bigint) from public, anon;
grant execute on function public.admin_liberar(text, text, uuid) to authenticated;
grant execute on function public.admin_revogar_liberacao(bigint) to authenticated;

-- painel: liberações entram no admin_painel
create or replace function public.admin_liberacoes() returns jsonb
language plpgsql stable security definer set search_path = plataforma, public as $$
begin
  perform plataforma.exigir_admin();
  return coalesce((select jsonb_agg(to_jsonb(l) order by l.criado_em desc) from plataforma.liberacoes l), '[]'::jsonb);
end $$;
revoke all on function public.admin_liberacoes() from public, anon;
grant execute on function public.admin_liberacoes() to authenticated;
