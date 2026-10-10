-- 028_mimori_pla_120.sql, 09/10/2026. Aplicado no Supabase lvnavmtyselveozllcuy pelo SQL Editor (MCP).
-- Dado, não esquema. Decisão do Pedro: filamento da Mimori a R$ 120/kg, média das bobinas em uso.
-- Ver vault 50-decisoes/2026-10-09-make3lab-motor-unico-parametros-e-conta.
-- Antes: material PLA (m1) a R$ 96/kg; produto Triminó (c45m2o6) com 6 linhas de filamento a R$ 96, sem bobina ligada.
-- Produtos com bobina ligada (Mini Microfone, Kit 12 Plaquinhas) já estavam em R$ 119 a 119,90 e não mudaram.

update materiais set preco_kg = 120
 where org_id = '2b08867c-d046-40f8-9975-b31c971c4a92' and id = 'm1' and preco_kg = 96;

update produtos p set dados = jsonb_set(p.dados, '{fils}', (
  select jsonb_agg(case when (f->>'material_id') = 'm1' and f->>'filamento_id' is null and (f->>'preco_kg')::numeric = 96
                        then jsonb_set(f, '{preco_kg}', '120') else f end order by o)
    from jsonb_array_elements(p.dados->'fils') with ordinality as t(f, o)))
 where p.org_id = '2b08867c-d046-40f8-9975-b31c971c4a92' and p.id = 'c45m2o6';
