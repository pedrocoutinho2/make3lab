-- 021_personalizacao_storage.sql
-- Make3Lab, 05/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- STATUS: aplicado no Supabase em 05/10/2026.
-- Arquivos da personalizacao (logo, imagem de referencia) que o cliente manda no
-- orcamento e na venda. Spec: spec-personalizacao-produto, secao 2.
-- Bucket privado. Caminho obrigatorio: {org_id}/{documento_id}/arquivo. O item do
-- documento guarda o caminho, nunca o arquivo. Cada organizacao so enxerga a propria pasta.
-- Numeracao: 020 fica reservado ao 016_plataforma_lead_espera do vault quando for aplicado.
-- Idempotente.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('personalizacoes', 'personalizacoes', false, 10485760,
        array['image/png','image/jpeg','image/svg+xml','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists pers_ler on storage.objects;
create policy pers_ler on storage.objects for select to authenticated
  using (bucket_id = 'personalizacoes' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists pers_gravar on storage.objects;
create policy pers_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'personalizacoes' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists pers_trocar on storage.objects;
create policy pers_trocar on storage.objects for update to authenticated
  using (bucket_id = 'personalizacoes' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
drop policy if exists pers_apagar on storage.objects;
create policy pers_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'personalizacoes' and (storage.foldername(name))[1] in (select id::text from public.fn_minhas_orgs() id));
