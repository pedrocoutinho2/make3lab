-- ============================================================
-- Make3Lab · 012 · fila de produção, kits, consignação e canais novos
-- 20/09/2026 · roda depois do 011 · pode rodar de novo sem estragar nada
-- ============================================================

do $$
declare t text; extra text;
begin
  foreach t in array array['ordens_producao','kits','pontos_venda','consignacoes'] loop
    extra := case t
      when 'ordens_producao' then 'etapa text not null default ''fila'' check (etapa in (''fila'',''imprimindo'',''pos'',''pronto'')), venda_id text,'
      when 'kits' then 'nome text not null default '''','
      when 'pontos_venda' then 'nome text not null default '''','
      when 'consignacoes' then 'ponto_id text,'
    end;
    execute format($f$create table if not exists public.%I (
      org_id uuid not null references public.organizacoes(id) on delete restrict,
      id text not null, %s
      dados jsonb not null default '{}'::jsonb,
      ativo boolean not null default true,
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now(),
      primary key (org_id, id))$f$, t, extra);
    execute format('drop trigger if exists tocar on public.%I', t);
    execute format('create trigger tocar before update on public.%I for each row execute function public.fn_tocar()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists ler on public.%I', t);
    execute format('drop policy if exists inserir on public.%I', t);
    execute format('drop policy if exists alterar on public.%I', t);
    execute format($p$create policy ler on public.%I for select to authenticated using (org_id in (select public.fn_minhas_orgs()))$p$, t);
    execute format($p$create policy inserir on public.%I for insert to authenticated
      with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id))$p$, t);
    execute format($p$create policy alterar on public.%I for update to authenticated
      using (org_id in (select public.fn_minhas_orgs()))
      with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id))$p$, t);
    execute format('revoke all on public.%I from authenticated, anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;
create index if not exists ordens_venda_idx on public.ordens_producao (org_id, venda_id);

-- canais novos com taxa de referência 09/2026 (conferir na central de cada plataforma)
-- Elo7 ficou de fora: encerrou a operação em maio de 2026.
create or replace function public.fn_canais_padrao(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.canais (org_id, id, nome, taxa_pct, taxa_fixa, dados) values
    (p_org, 'c5', 'Amazon (plano Individual)', 0.12, 2, '{}'),
    (p_org, 'c6', 'TikTok Shop', 0.10, 4, '{"faixas":[{"ate":49.99,"taxa_pct":0.10,"taxa_fixa":4},{"ate":999999,"taxa_pct":0.06,"taxa_fixa":6}]}'),
    (p_org, 'c7', 'Instagram (venda direta)', 0, 0, '{}')
  on conflict do nothing;
  update public.canais set dados = dados || '{"faixas":[{"ate":79.99,"taxa_pct":0.20,"taxa_fixa":4},{"ate":99.99,"taxa_pct":0.14,"taxa_fixa":16},{"ate":199.99,"taxa_pct":0.14,"taxa_fixa":20},{"ate":999999,"taxa_pct":0.14,"taxa_fixa":26}]}'::jsonb,
    taxa_pct = 0.20, taxa_fixa = 4
   where org_id = p_org and id = 'c4' and not (dados ? 'faixas');
end $$;
revoke execute on function public.fn_canais_padrao(uuid) from public, anon, authenticated;
select public.fn_canais_padrao(id) from public.organizacoes;

-- conta nova também nasce com os canais novos
create or replace function public.fn_semear_org_v2(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin perform public.fn_semear_org(p_org); perform public.fn_canais_padrao(p_org); end $$;
revoke execute on function public.fn_semear_org_v2(uuid) from public, anon, authenticated;
create or replace function public.fn_nova_conta()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_nome text; c record; v_convidado boolean := false;
begin
  for c in select * from public.convites where lower(email) = lower(new.email) and aceito_em is null loop
    insert into public.membros (org_id, user_id, papel, email, nome) values (c.org_id, new.id, c.papel, new.email, new.raw_user_meta_data->>'nome')
      on conflict (org_id, user_id) do nothing;
    update public.convites set aceito_em = now() where id = c.id;
    v_convidado := true;
  end loop;
  if new.raw_user_meta_data ? 'aceite_versao' then
    insert into public.aceites (user_id, versao) values (new.id, new.raw_user_meta_data->>'aceite_versao');
  end if;
  if not v_convidado then
    v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'empresa', '')), '');
    insert into public.organizacoes (nome) values (coalesce(v_nome, split_part(new.email, '@', 1))) returning id into v_org;
    insert into public.membros (org_id, user_id, papel, email, nome) values (v_org, new.id, 'dono', new.email, new.raw_user_meta_data->>'nome');
    perform public.fn_semear_org_v2(v_org);
  end if;
  return new;
end $$;
revoke execute on function public.fn_nova_conta() from public, anon, authenticated;
