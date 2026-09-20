-- ============================================================
-- Make3Lab · 013 · vínculo produto x canal
-- 20/09/2026 · roda depois do 012 · pode rodar de novo sem estragar nada
-- Agora: registra o que foi exportado em arquivo, com o preço e os parâmetros do dia.
-- Depois (V2): guarda o id do anúncio da integração nativa do Mercado Livre.
-- Nada aqui chama API, OAuth ou webhook.
-- ============================================================
create table if not exists public.produto_canal (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  produto_id text not null,
  canal_id text not null,
  id_externo text,                 -- id do anúncio no marketplace, quando existir
  sku_externo text,                -- SKU da linha exportada (pai ou variação)
  status text not null default 'exportado' check (status in ('exportado','publicado','pausado','encerrado','erro')),
  ultimo_preco numeric(14,4) check (ultimo_preco is null or ultimo_preco >= 0),
  ultimo_estoque numeric(12,2) check (ultimo_estoque is null or ultimo_estoque >= 0),
  exportado_em timestamptz not null default now(),
  dados jsonb not null default '{}'::jsonb, -- snapshot: preço, taxa do canal, faixas, imposto, hora, refugo, tarifa, margem, título, variação, data
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);
create index if not exists produto_canal_prod_idx on public.produto_canal (org_id, produto_id, canal_id);
create unique index if not exists produto_canal_externo_idx on public.produto_canal (org_id, canal_id, id_externo) where id_externo is not null;

drop trigger if exists tocar on public.produto_canal;
create trigger tocar before update on public.produto_canal for each row execute function public.fn_tocar();

alter table public.produto_canal enable row level security;
drop policy if exists ler on public.produto_canal;
drop policy if exists inserir on public.produto_canal;
drop policy if exists alterar on public.produto_canal;
create policy ler on public.produto_canal for select to authenticated using (org_id in (select public.fn_minhas_orgs()));
create policy inserir on public.produto_canal for insert to authenticated
  with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id));
create policy alterar on public.produto_canal for update to authenticated
  using (org_id in (select public.fn_minhas_orgs()))
  with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id));
revoke all on public.produto_canal from authenticated, anon;
grant select, insert, update on public.produto_canal to authenticated;
