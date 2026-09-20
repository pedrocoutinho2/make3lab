-- ============================================================
-- Make3Lab · 011 · estoque de insumos e marcas de filamento da base
-- 19/09/2026 · roda depois do 010 · pode rodar de novo sem estragar nada
-- ============================================================

-- estoque de insumo em unidades. null = não controla estoque deste insumo
alter table public.insumos add column if not exists estoque numeric(12,2);
alter table public.insumos add column if not exists estoque_min numeric(12,2);
do $$ begin
  alter table public.insumos add constraint insumos_estoque_nao_negativo check (estoque is null or estoque >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.insumos add constraint insumos_minimo_nao_negativo check (estoque_min is null or estoque_min >= 0);
exception when duplicate_object then null; end $$;

-- marcas de filamento: tabela global, igual para todas as empresas.
-- Só a Make3Lab mantém (painel do Supabase ou service role). O usuário só lê.
create table if not exists public.marcas_filamento (
  nome text primary key,
  logo_url text,
  ordem integer not null default 100,
  ativo boolean not null default true
);
alter table public.marcas_filamento enable row level security;
revoke all on public.marcas_filamento from anon, authenticated;
grant select on public.marcas_filamento to anon, authenticated;
drop policy if exists marcas_ler on public.marcas_filamento;
create policy marcas_ler on public.marcas_filamento for select to anon, authenticated using (ativo);

insert into public.marcas_filamento (nome, ordem) values
  ('Bambu Lab', 1), ('Voolt3D', 2), ('3D Fila', 3), ('3DLab', 4), ('GTMax3D', 5), ('Sethi3D', 6), ('eSun', 7),
  ('Sunlu', 8), ('Polymaker', 9), ('Creality', 10), ('Elegoo', 11), ('Prusament', 12), ('Anycubic', 13), ('Overture', 14)
on conflict (nome) do nothing;

-- logos das marcas: bucket público, só a Make3Lab grava.
-- Suba o arquivo em marcas/<nome>.png pelo painel e grave a URL pública em marcas_filamento.logo_url.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', true, 524288, array['image/png','image/svg+xml','image/webp','image/jpeg'])
on conflict (id) do nothing;
