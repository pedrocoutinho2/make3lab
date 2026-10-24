-- 037_admin_pedro_make3lab.sql
-- Make3Lab, 24/10/2026, projeto Supabase lvnavmtyselveozllcuy. Aplicado pelo SQL Editor (MCP).
-- Pedro pediu o acesso de admin em pedro@make3lab.com.br. A conta de admin (7ae45689…) troca de e-mail
-- em vez de nascer outra: mesma senha, mesma loja, mesmo admin. Recuperar senha agora chega na caixa da Hostinger.
-- O gatilho guarda_membro trava o e-mail do membro; desligado só durante o update e religado na mesma transação.

update auth.users set email = 'pedro@make3lab.com.br', updated_at = now(),
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', 'pedro@make3lab.com.br')
 where id = '7ae45689-6b0e-4794-a2d2-8d5af9c08f91';
update auth.identities set identity_data = identity_data || jsonb_build_object('email', 'pedro@make3lab.com.br'), updated_at = now()
 where user_id = '7ae45689-6b0e-4794-a2d2-8d5af9c08f91' and provider = 'email';
begin;
alter table public.membros disable trigger guarda_membro;
update public.membros set email = 'pedro@make3lab.com.br' where user_id = '7ae45689-6b0e-4794-a2d2-8d5af9c08f91';
alter table public.membros enable trigger guarda_membro;
commit;
