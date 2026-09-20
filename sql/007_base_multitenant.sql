-- ============================================================
-- Make3Lab · 007 · base multi-tenant para a V1 aberta a terceiros
-- 19/09/2026
--
-- Arquivo autossuficiente para projeto Supabase novo. Os arquivos
-- 005_saas.sql e 006_motor_e_hora_padrao.sql se perderam junto com os
-- containers das sessões de 14 e 18/09 e nunca rodaram em banco nenhum.
-- Este 007 cobre o que o 005 cobria e que o front usa hoje:
-- organização, membro, dados da empresa por organização, logo no Storage,
-- bloqueio de escrita por assinatura no banco e aceite de termos.
-- A função fn_precificar_v2 (006) NÃO está aqui. Ver pendências no README.
--
-- Onda 0 coberta: dinheiro em numeric, CHECK de não negativo,
-- nada se apaga (inativa), snapshot do custo dentro do documento.
-- Onda 0 não coberta: view única por métrica e estorno de lançamento.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- organização e membros ----------
create table if not exists public.organizacoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  status      text not null default 'beta' check (status in ('beta','trial','ativa','vencida','cancelada')),
  acesso_ate  date,
  criado_em   timestamptz not null default now()
);

create table if not exists public.membros (
  org_id    uuid not null references public.organizacoes(id) on delete restrict,
  user_id   uuid not null references auth.users(id) on delete cascade,
  papel     text not null default 'dono' check (papel in ('dono','operador')),
  criado_em timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists membros_user_idx on public.membros(user_id);

create table if not exists public.aceites (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  versao    text not null,
  aceito_em timestamptz not null default now()
);

-- organizações do usuário logado
create or replace function public.fn_minhas_orgs()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.membros where user_id = auth.uid()
$$;

-- bloqueio de escrita no banco, não só na tela
create or replace function public.assinatura_ativa(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organizacoes o
    where o.id = p_org
      and (o.status in ('beta','ativa')
           or (o.status = 'trial' and coalesce(o.acesso_ate, current_date) >= current_date))
  )
$$;

-- ---------- configuração da organização ----------
create table if not exists public.org_config (
  org_id        uuid primary key references public.organizacoes(id) on delete restrict,
  empresa       jsonb not null default '{}'::jsonb,
  params        jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  check (coalesce((params->>'valor_hora_operador')::numeric, 0) >= 0),
  check (coalesce((params->>'taxa_refugo')::numeric, 0) between 0 and 0.9),
  check (coalesce((params->>'tarifa_kwh')::numeric, 0) >= 0)
);

-- ---------- cadastros e documentos ----------
-- Padrão: PK (org_id, id), id texto gerado no front, ativo em vez de delete,
-- colunas para o que o banco precisa validar, resto em dados jsonb.
create table if not exists public.materiais (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  nome text not null default '',
  preco_kg numeric(14,4) not null default 0 check (preco_kg >= 0),
  perda_pct numeric(7,4) not null default 0 check (perda_pct between 0 and 1),
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists public.impressoras (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  nome text not null default '',
  potencia_w numeric(10,2) not null default 0 check (potencia_w >= 0),
  valor_compra numeric(14,4) not null default 0 check (valor_compra >= 0),
  vida_util_h numeric(10,2) not null default 5000 check (vida_util_h >= 0),
  manutencao_hora numeric(14,4) not null default 0 check (manutencao_hora >= 0),
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists public.canais (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  nome text not null default '',
  taxa_pct numeric(7,4) not null default 0 check (taxa_pct between 0 and 0.95),
  taxa_fixa numeric(14,4) not null default 0 check (taxa_fixa >= 0),
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists public.formas_pagamento (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  nome text not null default '',
  taxa_pct numeric(7,4) not null default 0 check (taxa_pct between 0 and 0.95),
  taxa_fixa numeric(14,4) not null default 0 check (taxa_fixa >= 0),
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists public.clientes (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  nome text not null default '',
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

-- ficha técnica do produto vai em dados: filamentos, tempo, insumos, lote
create table if not exists public.produtos (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  nome text not null default '',
  sku text,
  categoria text,
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

-- itens do orçamento carregam o snapshot do custo e dos parâmetros do momento
create table if not exists public.orcamentos (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  numero integer,
  status text not null default 'rascunho',
  cliente_id text,
  total numeric(14,4) not null default 0 check (total >= 0),
  custo_total numeric(14,4) not null default 0 check (custo_total >= 0),
  lucro numeric(14,4) not null default 0,
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists public.vendas (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  numero integer,
  status text not null default 'aberta',
  cliente_id text,
  data date,
  total numeric(14,4) not null default 0 check (total >= 0),
  custo_total numeric(14,4) not null default 0 check (custo_total >= 0),
  lucro numeric(14,4) not null default 0,
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists public.lancamentos (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  tipo text not null check (tipo in ('receber','pagar')),
  descricao text not null default '',
  valor numeric(14,4) not null default 0 check (valor >= 0),
  venc date,
  pago boolean not null default false,
  cliente_id text,
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);

-- ---------- atualizado_em automático ----------
create or replace function public.fn_tocar()
returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['org_config','materiais','impressoras','canais','formas_pagamento',
                           'clientes','produtos','orcamentos','vendas','lancamentos'] loop
    execute format('drop trigger if exists tocar on public.%I', t);
    execute format('create trigger tocar before update on public.%I for each row execute function public.fn_tocar()', t);
  end loop;
end $$;

-- ---------- RLS ----------
-- Leitura: só a própria organização. Escrita: própria organização e acesso ativo.
-- Sem política de DELETE: registro sai de cena com ativo = false.
alter table public.organizacoes enable row level security;
alter table public.membros      enable row level security;
alter table public.aceites      enable row level security;

drop policy if exists org_ler on public.organizacoes;
create policy org_ler on public.organizacoes for select to authenticated
  using (id in (select public.fn_minhas_orgs()));
drop policy if exists org_nome on public.organizacoes;
create policy org_nome on public.organizacoes for update to authenticated
  using (id in (select public.fn_minhas_orgs()))
  with check (id in (select public.fn_minhas_orgs()));
-- O Supabase concede tudo em tabela nova de public para anon e authenticated.
-- Aqui fica explícito o mínimo: status e acesso_ate só mudam pelo painel (service role).
revoke all on public.organizacoes, public.membros, public.aceites from anon, authenticated;
grant select on public.organizacoes, public.membros, public.aceites to authenticated;
grant update (nome) on public.organizacoes to authenticated;

drop policy if exists membro_ler on public.membros;
create policy membro_ler on public.membros for select to authenticated
  using (user_id = auth.uid());

drop policy if exists aceite_ler on public.aceites;
create policy aceite_ler on public.aceites for select to authenticated
  using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['org_config','materiais','impressoras','canais','formas_pagamento',
                           'clientes','produtos','orcamentos','vendas','lancamentos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists ler on public.%I', t);
    execute format('drop policy if exists inserir on public.%I', t);
    execute format('drop policy if exists alterar on public.%I', t);
    execute format($p$create policy ler on public.%I for select to authenticated
      using (org_id in (select public.fn_minhas_orgs()))$p$, t);
    execute format($p$create policy inserir on public.%I for insert to authenticated
      with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id))$p$, t);
    execute format($p$create policy alterar on public.%I for update to authenticated
      using (org_id in (select public.fn_minhas_orgs()))
      with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id))$p$, t);
    execute format('revoke all on public.%I from authenticated, anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------- conta nova: organização, membro, padrões ----------
create or replace function public.fn_semear_org(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_config (org_id, empresa, params) values (p_org,
    jsonb_build_object('nome', (select nome from public.organizacoes where id = p_org),
      'cnpj','', 'whatsapp','', 'email','', 'instagram','', 'cidade','', 'pix','',
      'logo_path', null, 'usarLogo', true),
    jsonb_build_object('tarifa_kwh', 0.881, 'valor_hora_operador', 25, 'margem_padrao', 1.8,
      'taxa_refugo', 0.08, 'imposto_pct', 0))
  on conflict (org_id) do nothing;

  insert into public.materiais (org_id, id, nome, preco_kg, perda_pct) values
    (p_org,'m1','PLA',96,0.05),(p_org,'m2','PLA+',110,0.05),(p_org,'m3','PLA Silk',120,0.06),
    (p_org,'m4','PETG',129,0.07),(p_org,'m5','ABS',110,0.12),(p_org,'m6','ASA',160,0.12),
    (p_org,'m7','TPU flex',189,0.10),(p_org,'m8','Nylon/PA',230,0.14),(p_org,'m9','PLA-CF',260,0.08),
    (p_org,'m10','PVA solúvel',400,0.05)
  on conflict do nothing;

  insert into public.impressoras (org_id, id, nome, potencia_w, valor_compra, vida_util_h, manutencao_hora)
  values (p_org,'i1','Impressora 1',150,2500,5000,0.15) on conflict do nothing;

  insert into public.canais (org_id, id, nome, taxa_pct, taxa_fixa) values
    (p_org,'c1','Balcão / WhatsApp',0,0),
    (p_org,'c2','Mercado Livre Clássico',0.14,6.75),
    (p_org,'c3','Mercado Livre Premium',0.19,6.75),
    (p_org,'c4','Shopee',0.14,4.00)
  on conflict do nothing;

  insert into public.formas_pagamento (org_id, id, nome, taxa_pct, taxa_fixa, dados) values
    (p_org,'f1','PIX',0,0,'{"ativa":true}'),(p_org,'f2','Dinheiro',0,0,'{"ativa":true}'),
    (p_org,'f3','Débito',0.0199,0,'{"ativa":true}'),(p_org,'f4','Crédito à vista',0.0399,0,'{"ativa":true}'),
    (p_org,'f5','Crédito parcelado',0.0599,0,'{"ativa":true}'),(p_org,'f6','Boleto',0,3.49,'{"ativa":true}')
  on conflict do nothing;
end $$;

create or replace function public.fn_nova_conta()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_nome text;
begin
  v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'empresa', '')), '');
  insert into public.organizacoes (nome) values (coalesce(v_nome, split_part(new.email, '@', 1)))
    returning id into v_org;
  insert into public.membros (org_id, user_id, papel) values (v_org, new.id, 'dono');
  if new.raw_user_meta_data ? 'aceite_versao' then
    insert into public.aceites (user_id, versao) values (new.id, new.raw_user_meta_data->>'aceite_versao');
  end if;
  perform public.fn_semear_org(v_org);
  return new;
end $$;

drop trigger if exists nova_conta on auth.users;
create trigger nova_conta after insert on auth.users
  for each row execute function public.fn_nova_conta();

revoke execute on function public.fn_semear_org(uuid) from public, anon, authenticated;
revoke execute on function public.fn_nova_conta() from public, anon, authenticated;

-- ---------- logo da empresa no Storage ----------
-- Bucket privado. Caminho obrigatório: {org_id}/arquivo. Cada organização só enxerga a própria pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos','logos', false, 1048576, array['image/png','image/jpeg','image/svg+xml','image/webp'])
on conflict (id) do nothing;

drop policy if exists logos_ler on storage.objects;
create policy logos_ler on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists logos_gravar on storage.objects;
create policy logos_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists logos_trocar on storage.objects;
create policy logos_trocar on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists logos_apagar on storage.objects;
create policy logos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
