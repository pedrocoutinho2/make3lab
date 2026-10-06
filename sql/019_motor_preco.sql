-- 019_motor_preco.sql
-- Make3Lab, 05/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- STATUS: testado em Postgres 16 e aplicado no Supabase em 05/10/2026.
-- Motor de preco em SQL. Base: calculo da Mimori (skill mimori-cadastro-shopee),
-- decisao do Pedro de 05/10/2026, com duas regras de 18/09 mantidas:
--   1. refugo incide sobre material, energia, maquina e preparo; acabamento,
--      embalar, insumos, embalagem e personalizacao ficam fora
--   2. maquina = depreciacao por hora de vida util + manutencao/h + energia,
--      pela impressora cadastrada
-- Mao de obra (hora padrao da org) entra ou sai pelo flag considerar_mao_obra.
-- Embalagem por pedido herda params.embalagem_padrao; 0 = sem embalagem.
-- Preco = menor valor terminado em ,90 cujo liquido (preco - taxa do canal por
-- faixa - imposto - taxa da forma de pagamento) cobre custo x (1 + margem)
-- + acrescimos de personalizacao. Sem arredondamento: gross up exato.
-- Espelhos: motor-019.js (front) e scripts/precificar.py (skill). Os tres
-- precisam bater nos casos de teste de teste-motor-019.
-- Idempotente.

-- ------------------------------------------------- 1. parametros com padrao
create or replace function public.fn_params_preco(p_org uuid, p_override jsonb default '{}'::jsonb)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
      'valor_hora_operador', 25, 'taxa_refugo', 0.08, 'tarifa_kwh', 0.881,
      'margem_padrao', 1.8, 'imposto_pct', 0, 'embalagem_padrao', 0,
      'considerar_mao_obra', true, 'arredondar_90', true, 'piso_lucro_hora', 15)
    || coalesce((select c.params from public.org_config c where c.org_id = p_org), '{}'::jsonb)
    || coalesce(p_override, '{}'::jsonb);
$$;

-- ------------------------------------------- 2. taxa do canal para um preco
-- faixas em canais.dados->'faixas' [{ate, taxa_pct, taxa_fixa}], fracoes.
create or replace function public.fn_taxa_canal(p_canal jsonb, p_preco numeric)
returns table (pct numeric, fixa numeric)
language sql immutable as $$
  with f as (
    select coalesce((x->>'ate')::numeric, 1e12) ate,
           coalesce((x->>'taxa_pct')::numeric,0) pct, coalesce((x->>'taxa_fixa')::numeric,0) fixa
      from jsonb_array_elements(coalesce(p_canal->'dados'->'faixas','[]'::jsonb)) x
  )
  select t.pct, t.fixa from (
    (select 1 ord, f.pct, f.fixa from f where p_preco <= f.ate order by f.ate limit 1)
    union all
    (select 2, f.pct, f.fixa from f order by f.ate desc limit 1)
    union all
    select 3, coalesce((p_canal->>'taxa_pct')::numeric,0), coalesce((p_canal->>'taxa_fixa')::numeric,0)
  ) t order by t.ord limit 1;
$$;

-- ------------------------------------------------ 3. um cenario de custo
create or replace function public.fn_precificar_cenario(p_e jsonb, p_p jsonb, p_imp jsonb, p_canal jsonb, p_com_mo boolean)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_pecas numeric := greatest(coalesce(nullif(p_e->>'pecas','')::numeric,1),1);
  v_horas numeric := coalesce(nullif(p_e->>'horas','')::numeric,0);
  v_hora  numeric := coalesce((p_p->>'valor_hora_operador')::numeric,0);
  v_imp   numeric := case when coalesce((p_e->>'com_nota')::boolean, true)
                          then coalesce((p_p->>'imposto_pct')::numeric,0) else 0 end;
  v_pag_pct numeric := coalesce(nullif(p_e->>'taxa_pagamento_pct','')::numeric,0);
  v_pag_fix numeric := coalesce(nullif(p_e->>'taxa_pagamento_fixa','')::numeric,0);
  v_margem numeric := coalesce(nullif(p_e->>'margem','')::numeric, (p_p->>'margem_padrao')::numeric, 0);
  v_arred boolean := coalesce((p_e->>'arredondar_90')::boolean, (p_p->>'arredondar_90')::boolean, true);
  f jsonb; g numeric;
  material numeric := 0; energia numeric := 0; maquina numeric := 0;
  preparo numeric; acabamento numeric; embalar numeric; mao numeric;
  refugo numeric; insumos numeric; embalagem numeric; acresc numeric; custo numeric;
  alvo numeric; preco numeric; t record; liq numeric; i int := 0;
  lim_ant numeric := 0; ok boolean := false; erro text;
begin
  -- material: fatiador nao aplica perda; purga sempre entra
  for f in select * from jsonb_array_elements(coalesce(p_e->'filamentos','[]'::jsonb)) loop
    g := coalesce(nullif(f->>'gramas','')::numeric,0);
    if coalesce(f->>'origem','') <> 'fatiador' then
      g := g * (1 + coalesce(nullif(f->>'perda','')::numeric,0));
    end if;
    g := g + coalesce(nullif(f->>'purga_g','')::numeric,0);
    material := material + g / 1000 * coalesce(nullif(f->>'preco_kg','')::numeric,0);
  end loop;

  if p_imp is not null then
    energia := coalesce((p_imp->>'potencia_w')::numeric,0) / 1000 * v_horas * coalesce((p_p->>'tarifa_kwh')::numeric,0);
    maquina := (case when coalesce((p_imp->>'vida_util_h')::numeric,0) > 0
                     then coalesce((p_imp->>'valor_compra')::numeric,0) / (p_imp->>'vida_util_h')::numeric else 0 end
                + coalesce((p_imp->>'manutencao_hora')::numeric,0)) * v_horas;
  end if;

  preparo    := case when p_com_mo then coalesce(nullif(p_e->>'preparo_min','')::numeric,0) / 60 * v_hora else 0 end;
  acabamento := case when p_com_mo then coalesce(nullif(p_e->>'acabamento_min_peca','')::numeric,0) * v_pecas / 60 * v_hora else 0 end;
  embalar    := case when p_com_mo then coalesce(nullif(p_e->>'embalar_min_pedido','')::numeric,0) / 60 * v_hora else 0 end;
  mao := preparo + acabamento + embalar;

  refugo   := (material + energia + maquina + preparo) * coalesce((p_p->>'taxa_refugo')::numeric,0);
  insumos  := coalesce(nullif(p_e->>'insumos_peca','')::numeric,0) * v_pecas;
  embalagem := coalesce(nullif(p_e->>'embalagem','')::numeric, (p_p->>'embalagem_padrao')::numeric, 0);
  acresc   := coalesce(nullif(p_e->>'acrescimo_unidade','')::numeric,0) * v_pecas
              + coalesce(nullif(p_e->>'acrescimo_pedido','')::numeric,0);
  custo := material + energia + maquina + mao + refugo + insumos + embalagem;
  alvo  := custo * (1 + v_margem) + acresc;

  if v_arred then
    preco := ceil(greatest(alvo, 0.9) - 0.9 - 1e-9) + 0.9;
    loop
      select * into t from public.fn_taxa_canal(p_canal, preco);
      liq := preco - (preco * t.pct + t.fixa) - preco * v_imp - (preco * v_pag_pct + v_pag_fix);
      exit when liq >= alvo - 1e-9;
      preco := preco + 1; i := i + 1;
      if i > 20000 then erro := 'Taxa do canal mais imposto inviabiliza o preco.'; preco := 0; exit; end if;
    end loop;
  else
    -- gross up exato, faixa a faixa
    for t in select coalesce((x->>'ate')::numeric,1e12) ate, coalesce((x->>'taxa_pct')::numeric,0) pct,
                    coalesce((x->>'taxa_fixa')::numeric,0) fixa
               from jsonb_array_elements(coalesce(p_canal->'dados'->'faixas','[]'::jsonb)) x
              order by 1 loop
      if 1 - t.pct - v_imp - v_pag_pct > 0.05 then
        preco := (alvo + t.fixa + v_pag_fix) / (1 - t.pct - v_imp - v_pag_pct);
        if preco > lim_ant and preco <= t.ate then ok := true; exit; end if;
      end if;
      lim_ant := t.ate;
    end loop;
    if not ok then
      select * into t from public.fn_taxa_canal(p_canal, 1e12);
      if 1 - t.pct - v_imp - v_pag_pct <= 0.05 then
        erro := 'Taxa do canal mais imposto inviabiliza o preco.'; preco := 0;
      else
        preco := greatest((alvo + t.fixa + v_pag_fix) / (1 - t.pct - v_imp - v_pag_pct), lim_ant + 0.01);
      end if;
    end if;
    preco := round(preco, 2);
  end if;

  return public.fn_preco_leitura(preco, custo, v_horas, v_imp, v_pag_pct, v_pag_fix, p_canal, p_p)
    || jsonb_build_object(
      'erro', erro,
      'material', round(material,2), 'energia', round(energia,2), 'maquina', round(maquina,2),
      'preparo', round(preparo,2), 'acabamento', round(acabamento,2), 'embalar', round(embalar,2),
      'mao_obra', round(mao,2), 'base_refugo', round(material + energia + maquina + preparo,2),
      'refugo', round(refugo,2), 'insumos', round(insumos,2), 'embalagem', round(embalagem,2),
      'personalizacao', round(acresc,2),
      'custo_sem_embalagem', round(custo - embalagem,2),
      'margem', v_margem, 'alvo', round(alvo,2));
end $$;

-- leitura de um preco contra um custo (tambem usada para preco manual)
create or replace function public.fn_preco_leitura(p_preco numeric, p_custo numeric, p_horas numeric,
  p_imp numeric, p_pag_pct numeric, p_pag_fix numeric, p_canal jsonb, p_p jsonb)
returns jsonb language plpgsql stable set search_path = public as $$
declare t record; v_taxa numeric; v_liq numeric; v_lucro numeric; v_lh numeric;
begin
  select * into t from public.fn_taxa_canal(p_canal, p_preco);
  v_taxa := p_preco * t.pct + t.fixa;
  v_liq := p_preco - v_taxa - p_preco * p_imp - (p_preco * p_pag_pct + p_pag_fix);
  v_lucro := v_liq - p_custo;
  v_lh := case when p_horas > 0 then v_lucro / p_horas end;
  return jsonb_build_object(
    'preco', round(p_preco,2), 'custo', round(p_custo,2),
    'taxa_canal', round(v_taxa,2), 'taxa_canal_pct', t.pct, 'taxa_canal_fixa', t.fixa,
    'imposto', round(p_preco * p_imp,2), 'taxa_pagamento', round(p_preco * p_pag_pct + p_pag_fix,2),
    'liquido', round(v_liq,2), 'lucro', round(v_lucro,2),
    'margem_pct', case when p_preco > 0 then round(v_lucro / p_preco * 100,1) end,
    'lucro_hora', round(v_lh,2),
    'abaixo_do_piso', coalesce(v_lh < coalesce((p_p->>'piso_lucro_hora')::numeric,0), false));
end $$;

-- ---------------------------------------------------------- 4. entrada
-- p_entrada: {impressora_id | impressora{}, canal_id | canal{}, pecas, horas,
--   filamentos:[{gramas, preco_kg, origem, perda, purga_g}], insumos_peca,
--   preparo_min, acabamento_min_peca, embalar_min_pedido, embalagem (null =
--   padrao da org, 0 = sem), considerar_mao_obra, margem, com_nota,
--   taxa_pagamento_pct, taxa_pagamento_fixa, acrescimo_unidade,
--   acrescimo_pedido, arredondar_90, preco_manual, params{} (override)}
create or replace function public.fn_precificar(p_org uuid, p_entrada jsonb)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  p jsonb := public.fn_params_preco(p_org, p_entrada->'params');
  imp jsonb := p_entrada->'impressora';
  can jsonb := p_entrada->'canal';
  v_mo boolean;
  sem jsonb; com jsonb; esc jsonb; v_imp numeric;
begin
  if imp is null and coalesce(p_entrada->>'impressora_id','') <> '' then
    select to_jsonb(i) into imp from public.impressoras i
     where i.org_id = p_org and i.id = p_entrada->>'impressora_id';
  end if;
  if can is null and coalesce(p_entrada->>'canal_id','') <> '' then
    select to_jsonb(c) into can from public.canais c
     where c.org_id = p_org and c.id = p_entrada->>'canal_id';
  end if;
  v_mo := coalesce((p_entrada->>'considerar_mao_obra')::boolean, (p->>'considerar_mao_obra')::boolean, true);

  sem := public.fn_precificar_cenario(p_entrada, p, imp, can, false);
  com := public.fn_precificar_cenario(p_entrada, p, imp, can, true);
  esc := case when v_mo then com else sem end;

  if coalesce(nullif(p_entrada->>'preco_manual','')::numeric,0) > 0 then
    v_imp := case when coalesce((p_entrada->>'com_nota')::boolean, true) then coalesce((p->>'imposto_pct')::numeric,0) else 0 end;
    esc := esc || jsonb_build_object('manual', public.fn_preco_leitura(
      (p_entrada->>'preco_manual')::numeric, (esc->>'custo')::numeric,
      coalesce(nullif(p_entrada->>'horas','')::numeric,0), v_imp,
      coalesce(nullif(p_entrada->>'taxa_pagamento_pct','')::numeric,0),
      coalesce(nullif(p_entrada->>'taxa_pagamento_fixa','')::numeric,0), can, p));
  end if;

  return esc || jsonb_build_object(
    'considera_mao_obra', v_mo,
    'sem_mao_obra', jsonb_build_object('custo', sem->'custo', 'preco', sem->'preco', 'lucro', sem->'lucro', 'lucro_hora', sem->'lucro_hora'),
    'com_mao_obra', jsonb_build_object('custo', com->'custo', 'preco', com->'preco', 'lucro', com->'lucro', 'lucro_hora', com->'lucro_hora'),
    'params', jsonb_build_object('hora', p->'valor_hora_operador', 'refugo', p->'taxa_refugo',
       'tarifa_kwh', p->'tarifa_kwh', 'imposto', p->'imposto_pct', 'embalagem_padrao', p->'embalagem_padrao',
       'piso_lucro_hora', p->'piso_lucro_hora'),
    'motor', '019', 'em', now());
end $$;

-- ------------------------------------------- 5. embalagem da venda herda
-- Venda nova sem embalagem informada recebe a embalagem padrao da org.
-- O front pode editar o valor ou zerar (sem embalagem). Valor nunca negativo.
create or replace function public.fn_venda_embalagem() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not (coalesce(new.dados,'{}'::jsonb) ? 'embalagem') then
    new.dados := coalesce(new.dados,'{}'::jsonb) || jsonb_build_object('embalagem', jsonb_build_object(
      'valor', coalesce((public.fn_params_preco(new.org_id)->>'embalagem_padrao')::numeric, 0),
      'origem', 'padrao'));
  end if;
  if coalesce(nullif(new.dados->'embalagem'->>'valor','')::numeric,0) < 0 then
    raise exception 'O valor da embalagem nao pode ser negativo.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists a_venda_embalagem on public.vendas;
create trigger a_venda_embalagem before insert or update on public.vendas
  for each row execute function public.fn_venda_embalagem();

drop trigger if exists a_orc_embalagem on public.orcamentos;
create trigger a_orc_embalagem before insert or update on public.orcamentos
  for each row execute function public.fn_venda_embalagem();

grant execute on function public.fn_params_preco(uuid,jsonb) to authenticated;
grant execute on function public.fn_taxa_canal(jsonb,numeric) to authenticated;
grant execute on function public.fn_precificar_cenario(jsonb,jsonb,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.fn_preco_leitura(numeric,numeric,numeric,numeric,numeric,numeric,jsonb,jsonb) to authenticated;
grant execute on function public.fn_precificar(uuid,jsonb) to authenticated;
