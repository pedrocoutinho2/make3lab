-- 032_arquivos_impressao.sql
-- Make3Lab, 21/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- STATUS: aplicado (bucket impressao confirmado no banco em 24/10/2026).
-- Arquivo de impressão (.3mf do Bambu Studio, G-code) guardado no item do orçamento e da venda,
-- para reimprimir o pedido depois sem procurar o arquivo. Fica fora do bucket personalizacoes,
-- que aceita só imagem e PDF até 10 MB: .3mf com peça pintada passa disso.
-- Bucket privado. Caminho obrigatório: {org_id}/{documento_id}/arquivo. O item guarda o caminho
-- em arquivos_impressao, nunca o arquivo. Cada organização só enxerga a própria pasta.
-- 50 MB é o teto por arquivo do plano gratuito do Supabase. Idempotente.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('impressao', 'impressao', false, 52428800,
        array['model/3mf','application/vnd.ms-package.3dmanufacturing-3dmodel+xml','text/x-gcode','application/octet-stream'])
on conflict (id) do nothing;

drop policy if exists imp_ler on storage.objects;
create policy imp_ler on storage.objects for select to authenticated
  using (bucket_id = 'impressao' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists imp_gravar on storage.objects;
create policy imp_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'impressao' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists imp_trocar on storage.objects;
create policy imp_trocar on storage.objects for update to authenticated
  using (bucket_id = 'impressao' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists imp_apagar on storage.objects;
create policy imp_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'impressao' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
