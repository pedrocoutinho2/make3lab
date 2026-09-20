-- ============================================================
-- Make3Lab · 008 · insumos cadastrados, usuários da empresa e convites
-- 19/09/2026 · roda depois do 007 · pode rodar de novo sem estragar nada
-- ============================================================

-- ---------- insumos ----------
-- custo_unit = preço do pacote ÷ quantidade no pacote, calculado no banco
create table if not exists public.insumos (
  org_id uuid not null references public.organizacoes(id) on delete restrict,
  id text not null,
  nome text not null default '',
  categoria text,
  unidade text not null default 'un',
  qtd_pacote numeric(14,4) not null default 1 check (qtd_pacote > 0),
  preco_pacote numeric(14,4) not null default 0 check (preco_pacote >= 0),
  custo_unit numeric(14,6) generated always as (preco_pacote / qtd_pacote) stored,
  dados jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (org_id, id)
);
create index if not exists insumos_nome_idx on public.insumos (org_id, lower(nome));

drop trigger if exists tocar on public.insumos;
create trigger tocar before update on public.insumos for each row execute function public.fn_tocar();

alter table public.insumos enable row level security;
drop policy if exists ler on public.insumos;
drop policy if exists inserir on public.insumos;
drop policy if exists alterar on public.insumos;
create policy ler on public.insumos for select to authenticated
  using (org_id in (select public.fn_minhas_orgs()));
create policy inserir on public.insumos for insert to authenticated
  with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id));
create policy alterar on public.insumos for update to authenticated
  using (org_id in (select public.fn_minhas_orgs()))
  with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id));
revoke all on public.insumos from authenticated, anon;
grant select, insert, update on public.insumos to authenticated;
grant select, insert, update (org_id, id, nome, categoria, unidade, qtd_pacote, preco_pacote, dados, ativo) on public.insumos to authenticated;

-- ---------- membros: nome e e-mail visíveis para a equipe ----------
alter table public.membros add column if not exists email text;
alter table public.membros add column if not exists nome text;
update public.membros m set email = u.email from auth.users u where u.id = m.user_id and m.email is null;

create or replace function public.fn_sou_dono(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membros where org_id = p_org and user_id = auth.uid() and papel = 'dono')
$$;

drop policy if exists membro_ler on public.membros;
create policy membro_ler on public.membros for select to authenticated
  using (org_id in (select public.fn_minhas_orgs()));
drop policy if exists membro_papel on public.membros;
create policy membro_papel on public.membros for update to authenticated
  using (public.fn_sou_dono(org_id) and user_id <> auth.uid())
  with check (public.fn_sou_dono(org_id) and user_id <> auth.uid());
drop policy if exists membro_proprio on public.membros;
create policy membro_proprio on public.membros for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists membro_remover on public.membros;
create policy membro_remover on public.membros for delete to authenticated
  using (public.fn_sou_dono(org_id) and user_id <> auth.uid());
grant update (papel, nome) on public.membros to authenticated;
grant delete on public.membros to authenticated;

-- ninguém se promove a dono: papel só muda por outro dono, e o próprio registro só troca o nome
create or replace function public.fn_guarda_membro()
returns trigger language plpgsql as $$
begin
  if new.user_id = auth.uid() and new.papel is distinct from old.papel then
    raise exception 'Você não pode mudar o próprio papel.';
  end if;
  new.org_id := old.org_id; new.user_id := old.user_id; new.email := old.email;
  return new;
end $$;
drop trigger if exists guarda_membro on public.membros;
create trigger guarda_membro before update on public.membros for each row execute function public.fn_guarda_membro();

-- ---------- convites ----------
create table if not exists public.convites (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizacoes(id) on delete cascade,
  email text not null,
  papel text not null default 'operador' check (papel in ('dono','operador')),
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  aceito_em timestamptz
);
create unique index if not exists convites_aberto_idx on public.convites (org_id, lower(email)) where aceito_em is null;

alter table public.convites enable row level security;
revoke all on public.convites from anon, authenticated;
grant select, insert, delete on public.convites to authenticated;
grant usage on sequence public.convites_id_seq to authenticated;
drop policy if exists convite_ler on public.convites;
create policy convite_ler on public.convites for select to authenticated
  using (public.fn_sou_dono(org_id));
drop policy if exists convite_criar on public.convites;
create policy convite_criar on public.convites for insert to authenticated
  with check (public.fn_sou_dono(org_id) and aceito_em is null and public.assinatura_ativa(org_id));
drop policy if exists convite_cancelar on public.convites;
create policy convite_cancelar on public.convites for delete to authenticated
  using (public.fn_sou_dono(org_id) and aceito_em is null);

-- quem entra com e-mail convidado ganha acesso às empresas que o convidaram
create or replace function public.aceitar_convites()
returns integer language plpgsql security definer set search_path = public as $$
declare v_email text; v_n integer := 0; c record;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;
  for c in select * from public.convites where lower(email) = lower(v_email) and aceito_em is null loop
    insert into public.membros (org_id, user_id, papel, email, nome)
      values (c.org_id, auth.uid(), c.papel, v_email,
              (select raw_user_meta_data->>'nome' from auth.users where id = auth.uid()))
      on conflict (org_id, user_id) do nothing;
    update public.convites set aceito_em = now() where id = c.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function public.aceitar_convites() from public, anon;
grant execute on function public.aceitar_convites() to authenticated;

-- conta nova: se houver convite para o e-mail, entra na empresa que convidou;
-- se não houver, cria a própria empresa como antes
create or replace function public.fn_nova_conta()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_nome text; c record; v_convidado boolean := false;
begin
  for c in select * from public.convites where lower(email) = lower(new.email) and aceito_em is null loop
    insert into public.membros (org_id, user_id, papel, email, nome)
      values (c.org_id, new.id, c.papel, new.email, new.raw_user_meta_data->>'nome')
      on conflict (org_id, user_id) do nothing;
    update public.convites set aceito_em = now() where id = c.id;
    v_convidado := true;
  end loop;

  if new.raw_user_meta_data ? 'aceite_versao' then
    insert into public.aceites (user_id, versao) values (new.id, new.raw_user_meta_data->>'aceite_versao');
  end if;

  if not v_convidado then
    v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'empresa', '')), '');
    insert into public.organizacoes (nome) values (coalesce(v_nome, split_part(new.email, '@', 1)))
      returning id into v_org;
    insert into public.membros (org_id, user_id, papel, email, nome)
      values (v_org, new.id, 'dono', new.email, new.raw_user_meta_data->>'nome');
    perform public.fn_semear_org(v_org);
  end if;
  return new;
end $$;
revoke execute on function public.fn_nova_conta() from public, anon, authenticated;

-- nome da empresa só o dono troca
drop policy if exists org_nome on public.organizacoes;
create policy org_nome on public.organizacoes for update to authenticated
  using (public.fn_sou_dono(id)) with check (public.fn_sou_dono(id));
