-- 034_revogar_rpc_internas.sql
-- Make3Lab, 23/10/2026, projeto Supabase lvnavmtyselveozllcuy. Aplicado pelo SQL Editor (MCP).
-- Achado no teste de isolamento antes dos Founders: três funções SECURITY DEFINER internas recebiam
-- p_org do chamador sem conferir se ele é membro da loja, e estavam abertas para anon e authenticated.
--   fn_estornar           criava estorno em lançamento de outra loja
--   fn_reconciliar_org    mexia nas vendas de outra loja (dispara os triggers de sincronização)
--   fn_itens_venda_pecas  lia itens e kits de outra loja
-- O app não chama nenhuma delas: só os triggers do banco, que rodam como dono e continuam funcionando.
-- Os gatilhos de limite do 033 também saem da API.

revoke execute on function public.fn_estornar(uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.fn_reconciliar_org(uuid) from public, anon, authenticated;
revoke execute on function public.fn_itens_venda_pecas(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.fn_limites(uuid) from public, anon;
revoke execute on function public.fn_limite_impressoras() from public, anon, authenticated;
revoke execute on function public.fn_limite_usuarios() from public, anon, authenticated;
