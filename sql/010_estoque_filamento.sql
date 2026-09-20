-- ============================================================
-- Make3Lab · 010 · estoque de filamento em gramas
-- 19/09/2026 · roda depois do 009 · pode rodar de novo sem estragar nada
-- A venda salva baixa o consumo (com perda) e guarda a baixa em vendas.dados.baixa;
-- cancelar ou excluir a venda devolve. quantidade (bobinas) fica só como legado.
-- ============================================================
alter table public.filamentos add column if not exists estoque_g numeric(12,2);
update public.filamentos set estoque_g = coalesce(quantidade, 0) * peso_g where estoque_g is null;
alter table public.filamentos alter column estoque_g set default 0;
alter table public.filamentos alter column estoque_g set not null;
do $$ begin
  alter table public.filamentos add constraint filamentos_estoque_nao_negativo check (estoque_g >= 0);
exception when duplicate_object then null; end $$;
