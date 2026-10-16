-- 030_vida_util_10000h.sql · Make3Lab · 12/10/2026
-- Decisão do Pedro (12/10/2026): vida útil padrão de impressora passa de 5.000 h para 10.000 h,
-- em todas as organizações. Na A1 da Mimori (R$ 4.500), a hora de máquina cai de R$ 1,05 para R$ 0,60
-- (R$ 0,45 de depreciação + R$ 0,15 de manutenção).
-- Registro: Second Brain/50-decisoes/2026-10-12-vida-util-impressora-10000h.md
-- Aplicado no Supabase lvnavmtyselveozllcuy em 12/10/2026.

-- 1. Impressoras cadastradas que ainda estavam no padrão antigo
update public.impressoras set vida_util_h = 10000, atualizado_em = now()
 where vida_util_h = 5000;

-- 2. Padrão da coluna para impressora nova
alter table public.impressoras alter column vida_util_h set default 10000;

-- 3. Semente de organização nova (fn_semear_org): troca só o 5000 da impressora
do $$
declare d text;
begin
  d := pg_get_functiondef('public.fn_semear_org'::regproc);
  if position('150,2500,5000,0.15' in d) = 0 then
    raise exception 'fn_semear_org mudou: trecho 150,2500,5000,0.15 não encontrado';
  end if;
  execute replace(d, '150,2500,5000,0.15', '150,2500,10000,0.15');
end $$;
