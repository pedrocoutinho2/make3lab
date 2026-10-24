-- 038_whatsapp_funil.sql · 22/10/2026
-- Make3Lab, projeto Supabase lvnavmtyselveozllcuy
--
-- WhatsApp oficial (Cloud API com Coexistence) alimentando o funil sozinho.
-- Fase 1: so leitura. O app recebe o que chega e o que sai do numero, mostra a
-- conversa e mantem o funil atualizado. Responder continua no WhatsApp Business.
--
-- Quem escreve aqui e so a Edge Function whatsapp-webhook (service_role), pela
-- fn_wa_registrar. A tela le e, para mudar etapa do lead ou zerar nao lidas,
-- usa fn_wa_lead e fn_wa_lidas. Nada se apaga.
--
-- Regras automaticas do funil:
--   1. Numero novo que escreve (ou para quem a loja escreve) vira cliente, com
--      origem do lead WhatsApp, e lead na etapa Contato.
--   2. O lead so aparece como card enquanto a conversa e mais nova que o ultimo
--      orcamento ou venda do cliente. Criou orcamento, o card do orcamento assume.
--      Cliente antigo que volta a escrever depois de comprar reaparece em Contato.
--   3. Cliente com orcamento em "Orcamento enviado" que responde passa o
--      orcamento para "Negociacao" (dados.etapa_auto = 'whatsapp').
--   4. Lead marcado como perdido volta para Contato se escrever de novo depois
--      de 3 dias. Antes disso, segue perdido (evita reabrir com "obrigado").
--   5. Mensagem vinda de anuncio click-to-WhatsApp guarda o anuncio no lead.
--
-- Telefone: o WhatsApp manda o numero brasileiro as vezes sem o 9. A busca de
-- cliente e de conversa compara DDD + 8 ultimos digitos (fn_wa_chave), e a
-- conversa fica no telefone do primeiro contato.
-- Pode rodar de novo sem estragar nada.
-- STATUS: aplicado em 24/10/2026 pelo SQL Editor.

-- ------------------------------------------------------------ tabelas
create table if not exists public.wa_numeros (
  phone_number_id text primary key,
  org_id     uuid not null references public.organizacoes(id) on delete restrict,
  numero     text,
  nome       text,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create table if not exists public.wa_contatos (
  org_id        uuid not null references public.organizacoes(id) on delete restrict,
  telefone      text not null,
  cliente_id    text,
  nome_perfil   text,
  etapa         text not null default 'contato' check (etapa in ('contato','perdido')),
  motivo_perda  text,
  perdido_em    timestamptz,
  anuncio       jsonb,
  primeiro_em   timestamptz not null default now(),
  ultimo_in     timestamptz,
  ultimo_out    timestamptz,
  ultimo_texto  text,
  ultimo_dir    text check (ultimo_dir in ('in','out')),
  nao_lidas     integer not null default 0 check (nao_lidas >= 0),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, telefone)
);
create index if not exists wa_contatos_cliente on public.wa_contatos (org_id, cliente_id);

create table if not exists public.wa_mensagens (
  org_id     uuid not null references public.organizacoes(id) on delete restrict,
  id         text not null,                       -- wamid da Meta
  telefone   text not null,                       -- numero do cliente, so digitos
  direcao    text not null check (direcao in ('in','out')),
  tipo       text not null,
  texto      text,
  enviado_em timestamptz not null,
  dados      jsonb not null default '{}'::jsonb,  -- mensagem crua, para auditoria
  criado_em  timestamptz not null default now(),
  primary key (org_id, id)
);
create index if not exists wa_mensagens_conversa on public.wa_mensagens (org_id, telefone, enviado_em);

-- ------------------------------------------------------------ RLS: membro le, ninguem escreve direto
alter table public.wa_numeros   enable row level security;
alter table public.wa_contatos  enable row level security;
alter table public.wa_mensagens enable row level security;
do $$
declare t text;
begin
  foreach t in array array['wa_numeros','wa_contatos','wa_mensagens'] loop
    execute format('drop policy if exists ler on public.%I', t);
    execute format($p$create policy ler on public.%I for select to authenticated
      using (org_id in (select public.fn_minhas_orgs()))$p$, t);
    execute format('revoke all on public.%I from authenticated, anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- tempo real: a tela escuta contatos e mensagens (o RLS vale no canal)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.wa_contatos;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.wa_mensagens; exception when duplicate_object then null; end;
  end if;
end $$;

-- ------------------------------------------------------------ telefone
-- DDD + 8 ultimos digitos. '5521987654321', '552187654321', '(21) 98765-4321' -> '2187654321'
create or replace function public.fn_wa_chave(p text)
returns text language sql immutable as $$
  with d as (select regexp_replace(coalesce(p,''), '\D', '', 'g') as n),
       s as (select case when length(n) >= 12 and left(n,2) = '55' then substr(n,3) else n end as n from d)
  select case when length(n) >= 10 then left(n,2) || right(n,8) else nullif(n,'') end from s
$$;

-- '5521987654321' -> '(21) 98765-4321'
create or replace function public.fn_wa_formatar(p text)
returns text language sql immutable as $$
  with d as (select regexp_replace(coalesce(p,''), '\D', '', 'g') as n),
       s as (select case when length(n) >= 12 and left(n,2) = '55' then substr(n,3) else null end as n from d)
  select case
    when s.n is null then '+' || (select n from d)
    when length(s.n) = 11 then '(' || left(s.n,2) || ') ' || substr(s.n,3,5) || '-' || right(s.n,4)
    when length(s.n) = 10 then '(' || left(s.n,2) || ') ' || substr(s.n,3,4) || '-' || right(s.n,4)
    else '+55' || s.n end
  from s
$$;

-- id do WhatsApp na lista de origens da organizacao (lista editavel em Configuracoes)
create or replace function public.fn_wa_origem(p_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select o->>'id' from public.org_config c, jsonb_array_elements(
        case when jsonb_typeof(c.params->'origens_lead') = 'array' then c.params->'origens_lead' else '[]'::jsonb end) o
      where c.org_id = p_org and lower(o->>'nome') like '%whats%' limit 1),
    'og-whatsapp')
$$;

-- ------------------------------------------------------------ entrada da Edge Function
-- p: { phone_number_id, id, telefone, direcao, tipo, texto, ts (epoch s), nome_perfil, referral, raw }
create or replace function public.fn_wa_registrar(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_org uuid; v_tel text; v_dir text; v_quando timestamptz; v_chave text;
  v_ct public.wa_contatos%rowtype; v_cli text; v_nome text; v_n int;
begin
  select org_id into v_org from public.wa_numeros
   where phone_number_id = p->>'phone_number_id' and ativo;
  if v_org is null then return 'numero_desconhecido'; end if;

  v_tel := regexp_replace(coalesce(p->>'telefone',''), '\D', '', 'g');
  v_dir := p->>'direcao';
  if v_tel = '' or v_dir not in ('in','out') or coalesce(p->>'id','') = '' then return 'ignorada'; end if;
  v_quando := coalesce(to_timestamp(nullif(p->>'ts','')::double precision), now());

  v_chave := public.fn_wa_chave(v_tel);

  -- o mesmo numero chega com e sem o 9: a conversa fica no telefone do primeiro contato
  select * into v_ct from public.wa_contatos
   where org_id = v_org and (telefone = v_tel or public.fn_wa_chave(telefone) = v_chave)
   order by (telefone = v_tel) desc, primeiro_em limit 1 for update;
  if found then v_tel := v_ct.telefone; end if;

  insert into public.wa_mensagens (org_id, id, telefone, direcao, tipo, texto, enviado_em, dados)
  values (v_org, p->>'id', v_tel, v_dir, coalesce(p->>'tipo','text'), p->>'texto', v_quando, coalesce(p->'raw','{}'::jsonb))
  on conflict (org_id, id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'repetida'; end if;     -- a Meta reenvia; so conta uma vez

  if v_ct.telefone is null then
    -- cliente que ja existe com esse numero
    select id into v_cli from public.clientes
     where org_id = v_org and ativo and public.fn_wa_chave(dados->>'whatsapp') = v_chave
     order by criado_em limit 1;
    if v_cli is null then
      v_cli := substr(md5(random()::text || clock_timestamp()::text), 1, 7);
      v_nome := coalesce(nullif(trim(p->>'nome_perfil'),''), public.fn_wa_formatar(v_tel));
      insert into public.clientes (org_id, id, nome, dados)
      values (v_org, v_cli, v_nome, jsonb_build_object(
        'whatsapp', public.fn_wa_formatar(v_tel), 'email', '', 'doc', '',
        'obs', 'Entrou pelo WhatsApp em ' || to_char(v_quando at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'),
        'origem_lead', public.fn_wa_origem(v_org), 'criado_por', 'whatsapp'));
    end if;
    insert into public.wa_contatos (org_id, telefone, cliente_id, nome_perfil, primeiro_em, anuncio)
    values (v_org, v_tel, v_cli, nullif(trim(p->>'nome_perfil'),''), v_quando, nullif(p->'referral','null'::jsonb))
    returning * into v_ct;
  end if;

  -- reabre lead perdido que voltou a escrever depois de 3 dias
  if v_dir = 'in' and v_ct.etapa = 'perdido' and v_ct.perdido_em < v_quando - interval '3 days' then
    v_ct.etapa := 'contato'; v_ct.motivo_perda := null; v_ct.perdido_em := null;
  end if;

  update public.wa_contatos set
    etapa        = v_ct.etapa,
    motivo_perda = v_ct.motivo_perda,
    perdido_em   = v_ct.perdido_em,
    nome_perfil  = coalesce(nullif(trim(p->>'nome_perfil'),''), nome_perfil),
    anuncio      = coalesce(nullif(p->'referral','null'::jsonb), anuncio),
    ultimo_in    = case when v_dir = 'in'  then greatest(coalesce(ultimo_in,  v_quando), v_quando) else ultimo_in  end,
    ultimo_out   = case when v_dir = 'out' then greatest(coalesce(ultimo_out, v_quando), v_quando) else ultimo_out end,
    ultimo_texto = case when v_quando >= greatest(coalesce(ultimo_in,'-infinity'), coalesce(ultimo_out,'-infinity')) then left(p->>'texto', 160) else ultimo_texto end,
    ultimo_dir   = case when v_quando >= greatest(coalesce(ultimo_in,'-infinity'), coalesce(ultimo_out,'-infinity')) then v_dir else ultimo_dir end,
    nao_lidas    = case when v_dir = 'in' then nao_lidas + 1 else 0 end,
    atualizado_em = now()
  where org_id = v_org and telefone = v_tel;

  -- cliente respondeu orcamento enviado: vai para Negociacao
  if v_dir = 'in' and v_ct.cliente_id is not null then
    update public.orcamentos set
      dados = dados || jsonb_build_object('etapa', 'negociacao',
        'etapa_em', to_char((v_quando at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD'), 'etapa_auto', 'whatsapp')
    where org_id = v_org and cliente_id = v_ct.cliente_id and ativo
      and status = 'enviado' and coalesce(dados->>'etapa', 'enviado') = 'enviado';
  end if;

  return 'ok';
end $$;
revoke all on function public.fn_wa_registrar(jsonb) from public, anon, authenticated;
-- interna (padrao do 034): le a config de qualquer loja, entao fica fora da API
revoke all on function public.fn_wa_origem(uuid) from public, anon, authenticated;
grant execute on function public.fn_wa_registrar(jsonb) to service_role;

-- ------------------------------------------------------------ acoes da tela
-- etapa do lead: 'perdido' (com motivo) ou 'contato' (reabrir)
create or replace function public.fn_wa_lead(p_org uuid, p_telefone text, p_etapa text, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_org not in (select public.fn_minhas_orgs()) or not public.assinatura_ativa(p_org) then
    raise exception 'Sem permissao para alterar este lead' using errcode = 'P0001';
  end if;
  if p_etapa not in ('contato','perdido') then raise exception 'Etapa invalida' using errcode = 'P0001'; end if;
  update public.wa_contatos set
    etapa = p_etapa,
    motivo_perda = case when p_etapa = 'perdido' then nullif(trim(p_motivo),'') end,
    perdido_em   = case when p_etapa = 'perdido' then now() end,
    atualizado_em = now()
  where org_id = p_org and telefone = p_telefone;
end $$;

create or replace function public.fn_wa_lidas(p_org uuid, p_telefone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_org not in (select public.fn_minhas_orgs()) then return; end if;
  update public.wa_contatos set nao_lidas = 0 where org_id = p_org and telefone = p_telefone and nao_lidas > 0;
end $$;

revoke all on function public.fn_wa_lead(uuid, text, text, text) from public, anon;
revoke all on function public.fn_wa_lidas(uuid, text) from public, anon;
grant execute on function public.fn_wa_lead(uuid, text, text, text) to authenticated;
grant execute on function public.fn_wa_lidas(uuid, text) to authenticated;

-- conferencia: deve voltar tabelas = 3
select count(*) as tabelas from information_schema.tables
 where table_schema = 'public' and table_name in ('wa_numeros','wa_contatos','wa_mensagens');
