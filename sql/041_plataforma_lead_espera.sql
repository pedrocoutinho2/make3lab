-- 041_plataforma_lead_espera.sql · 17/10/2026 (nasceu como 031 no vault; renumerado em 24/10/2026 porque o 031 do repo é venda_cliente_e_pronta_manual)
-- STATUS: aplicado (plataforma.lead_espera, plataforma.admin e registrar_lead_espera confirmados no banco em 24/10/2026).
-- ORDEM: numa base nova, rodar este ANTES do 033 (o 033 usa o schema plataforma e plataforma.admin criados aqui). O numero 041 so reflete quando entrou no repo.
-- Lista de espera do make3lab.com.br/espera e base do back-office da plataforma.
-- Substitui o 016 (nunca aplicado) e o 029 que nao chegou a ser salvo
-- (o numero 029 ficou com entregue_encerra_ordens e o app ja esta no 030).
--
-- Desenho:
--   * schema plataforma, fora da API: nada de anon ou authenticated lendo ou gravando direto
--   * gravacao so pela funcao public.registrar_lead_espera, executavel apenas pelo service_role
--     (a Edge Function lead-espera). Assim o schema plataforma nao precisa ser exposto no PostgREST
--   * limite de envios por IP (hash) dentro da propria funcao, numa unica ida ao banco
--   * e-mail repetido nao vira erro para quem esta do outro lado
-- Pode rodar de novo sem estragar nada. Nao apaga nem altera dado existente.

create schema if not exists plataforma;

-- quem pode ver o back-office
create table if not exists plataforma.admin (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  criado_em   timestamptz not null default now()
);

create or replace function plataforma.is_admin()
returns boolean
language sql
stable
security definer
set search_path = plataforma, public
as $$
  select exists (select 1 from plataforma.admin a where a.user_id = auth.uid());
$$;

do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
     where t.typname = 'lead_status' and n.nspname = 'plataforma'
  ) then
    create type plataforma.lead_status as enum
      ('novo','contatado','convidado','convertido','descartado');
  end if;
end $$;

create table if not exists plataforma.lead_espera (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null check (char_length(nome) between 2 and 120),
  email                text not null check (char_length(email) <= 160 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  whatsapp             text check (whatsapp is null or char_length(whatsapp) <= 30),

  qtd_impressoras      text,
  marcas               text[] not null default '{}',
  vende_onde           text[] not null default '{}',
  precifica_hoje       text,
  precifica_qual       text,
  quer_founder         boolean not null default false,

  consentimento        boolean not null default false check (consentimento is true),
  consentimento_em     timestamptz not null default now(),
  consentimento_versao text,

  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  referrer             text,
  origem_ip_hash       text,

  status               plataforma.lead_status not null default 'novo',
  nota_interna         text,
  criado_em            timestamptz not null default now()
);

create unique index if not exists lead_espera_email_uk
  on plataforma.lead_espera (lower(email));
create index if not exists lead_espera_criado_em_ix
  on plataforma.lead_espera (criado_em desc);
create index if not exists lead_espera_ip_ix
  on plataforma.lead_espera (origem_ip_hash, criado_em desc);

-- RLS: nega tudo, libera so para admin da plataforma (back-office futuro)
alter table plataforma.lead_espera enable row level security;
alter table plataforma.admin       enable row level security;

drop policy if exists lead_espera_admin_all on plataforma.lead_espera;
create policy lead_espera_admin_all on plataforma.lead_espera
  for all to authenticated
  using (plataforma.is_admin())
  with check (plataforma.is_admin());

drop policy if exists admin_self_read on plataforma.admin;
create policy admin_self_read on plataforma.admin
  for select to authenticated
  using (user_id = auth.uid());

revoke all on schema plataforma from public, anon;
revoke all on all tables in schema plataforma from public, anon;
grant usage on schema plataforma to authenticated, service_role;
grant select, update on plataforma.lead_espera to authenticated;   -- RLS restringe ao admin
grant select on plataforma.admin to authenticated;
grant all on all tables in schema plataforma to service_role;

-- visao de trabalho do back-office, respeitando o RLS de quem consulta
create or replace view plataforma.vw_lead_espera
with (security_invoker = true) as
select
  id, nome, email, whatsapp, qtd_impressoras, marcas, vende_onde,
  precifica_hoje, precifica_qual, quer_founder, status, criado_em,
  coalesce(qtd_impressoras, '0') <> '0'
    and precifica_hoje in ('chute','planilha','sistema')
    and quer_founder as elegivel_founder
from plataforma.lead_espera;
grant select on plataforma.vw_lead_espera to authenticated;

-- gravacao: chamada so pela Edge Function (service_role)
-- retorna 'ok', 'repetido' ou 'limite'
create or replace function public.registrar_lead_espera(
  p jsonb,
  p_ip_hash text,
  p_limite_hora int default 3
) returns text
language plpgsql
security definer
set search_path = plataforma, public
as $$
declare
  v_id uuid;
  v_recentes int;
begin
  select count(*) into v_recentes
    from plataforma.lead_espera
   where origem_ip_hash = p_ip_hash
     and criado_em > now() - interval '1 hour';
  if p_ip_hash is not null and v_recentes >= p_limite_hora then
    return 'limite';
  end if;

  insert into plataforma.lead_espera (
    nome, email, whatsapp, qtd_impressoras, marcas, vende_onde,
    precifica_hoje, precifica_qual, quer_founder,
    consentimento, consentimento_versao,
    utm_source, utm_medium, utm_campaign, referrer, origem_ip_hash
  ) values (
    btrim(p->>'nome'),
    lower(btrim(p->>'email')),
    nullif(btrim(coalesce(p->>'whatsapp','')), ''),
    nullif(p->>'qtd_impressoras', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p->'marcas','[]'::jsonb))), '{}'),
    coalesce(array(select jsonb_array_elements_text(coalesce(p->'vende_onde','[]'::jsonb))), '{}'),
    nullif(p->>'precifica_hoje', ''),
    nullif(p->>'precifica_qual', ''),
    coalesce((p->>'quer_founder')::boolean, false),
    coalesce((p->>'consentimento')::boolean, false),
    p->>'consentimento_versao',
    p->>'utm_source', p->>'utm_medium', p->>'utm_campaign', p->>'referrer',
    p_ip_hash
  )
  on conflict ((lower(email))) do nothing
  returning id into v_id;

  return case when v_id is null then 'repetido' else 'ok' end;
end $$;

revoke all on function public.registrar_lead_espera(jsonb, text, int) from public, anon, authenticated;
grant execute on function public.registrar_lead_espera(jsonb, text, int) to service_role;

-- liberar o admin depois (uma vez, no SQL Editor):
-- insert into plataforma.admin (user_id, nome)
-- select id, 'Pedro' from auth.users where email = 'SEU_EMAIL_DO_APP';
--
-- consultar os leads no SQL Editor:
-- select * from plataforma.vw_lead_espera order by criado_em desc;
