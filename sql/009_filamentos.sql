-- ============================================================
-- Make3Lab · 009 · filamentos (bobinas) com tipo, cor, marca, preço e estoque
-- 19/09/2026 · roda depois do 008 · pode rodar de novo sem estragar nada
-- tipo_id aponta para materiais.id (o tipo: PLA, PETG...). preço por kg é calculado.
-- ============================================================
create table if not exists public.filamentos (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  tipo_id text,
  cor text not null default '',
  marca text,
  peso_g numeric(10,2) not null default 1000 check (peso_g > 0),
  preco numeric(14,4) not null default 0 check (preco >= 0),
  quantidade numeric(10,2) not null default 0 check (quantidade >= 0),
  preco_kg numeric(14,4) generated always as (preco / peso_g * 1000) stored,
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);
create index if not exists filamentos_tipo_idx on public.filamentos (org_id, tipo_id);

drop trigger if exists tocar on public.filamentos;
create trigger tocar before update on public.filamentos for each row execute function public.fn_tocar();

alter table public.filamentos enable row level security;
drop policy if exists ler on public.filamentos;
drop policy if exists inserir on public.filamentos;
drop policy if exists alterar on public.filamentos;
create policy ler on public.filamentos for select to authenticated
  using (org_id in (select public.fn_minhas_orgs()));
create policy inserir on public.filamentos for insert to authenticated
  with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id));
create policy alterar on public.filamentos for update to authenticated
  using (org_id in (select public.fn_minhas_orgs()))
  with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id));
revoke all on public.filamentos from authenticated, anon;
grant select on public.filamentos to authenticated;
grant insert, update on public.filamentos to authenticated;
