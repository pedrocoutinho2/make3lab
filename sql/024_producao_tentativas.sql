-- 024_producao_tentativas.sql
-- Make3Lab, 07/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- Registro de tentativas de impressao, para o refugo medido (025) ter de onde
-- tirar a conta. Nao muda preco: fn_params_preco e fn_precificar nao mudam.
-- 1. producao_tentativas: uma linha por tentativa de impressao de uma ordem.
--    Iniciada = boa + perdida. Impressora e filamento vem do cadastro da peca
--    da ordem, gravados no dia (mudar o cadastro depois nao muda a tentativa).
-- 2. So insercao. Correcao e estorno: uma linha nova com estorna_id apontando
--    para a tentativa errada, com as mesmas quantidades, que anula o efeito
--    dela. Uma tentativa se estorna uma vez so; estorno nao se estorna.
--    Update e recusado sempre, por trigger, ate para o service role. Delete
--    tambem, salvo no expurgo de conta (abaixo).
-- 3. producao_tentativas_validas: o que conta para o refugo (sem as estornadas
--    e sem os estornos).
-- 4. Ordem de reimpressao (dados.origem = 'reimpressao'), criada pela fila com
--    so o que faltou, passa pelo dedupe do 015/018: ela divide a mesma peca e
--    linha da ordem de origem de proposito.
-- A producao antiga nao e migrada (1 ordem no banco, sem falha).
--
-- Expurgo de uma organizacao (so no SQL Editor ou com service role; o app,
-- como authenticated ou anon, nunca consegue, nem com o setting ligado):
--   begin;
--   select set_config('make3lab.expurgo', 'on', true);  -- true = so nesta transacao
--   delete from public.producao_tentativas where org_id = '<uuid da loja>';
--   -- depois as ordens_producao e o resto da loja (as tentativas apontam para as ordens)
--   commit;
-- Original e estorno saem no mesmo delete: a chave do estorno e conferida no
-- fim do comando (no action), nao linha a linha.
-- Depende do 007, 012, 015 e 018. Idempotente.
-- STATUS: APLICADO em 07/10/2026 (migracao 024_producao_tentativas). Tabela
-- criada, RLS ligada, so select e insert para authenticated. Os 27 casos de
-- ferramentas/teste-024/casos.sql passaram no Supabase, em transacao desfeita
-- (nada ficou gravado), e antes no PGlite (Postgres 17).

-- ------------------------------------------------------------ 1. tabela
create table if not exists public.producao_tentativas (
  org_id        uuid not null references public.organizacoes(id) on delete restrict,
  id            text not null,
  ordem_id      text not null,
  impressora_id text,
  material_id   text,
  filamento_id  text,
  qtd_iniciada  integer not null,
  qtd_boa       integer not null,
  qtd_perdida   integer not null,
  inicio_em     timestamptz,
  fim_em        timestamptz not null default now(),
  estorna_id    text,
  criado_por    uuid not null default auth.uid(),
  criado_em     timestamptz not null default now(),
  primary key (org_id, id),
  constraint tentativa_ordem_fk foreign key (org_id, ordem_id)
    references public.ordens_producao(org_id, id) on delete restrict,
  constraint tentativa_estorno_fk foreign key (org_id, estorna_id)
    references public.producao_tentativas(org_id, id),
  constraint tentativa_qtd_nao_negativa check (qtd_iniciada >= 0 and qtd_boa >= 0 and qtd_perdida >= 0),
  constraint tentativa_qtd_fecha check (qtd_boa + qtd_perdida = qtd_iniciada),
  constraint tentativa_com_peca check (estorna_id is not null or qtd_iniciada > 0),
  constraint tentativa_datas check (inicio_em is null or inicio_em <= fim_em),
  constraint tentativa_nao_estorna_a_si check (estorna_id is null or estorna_id <> id)
);
create unique index if not exists tentativas_estorno_uidx
  on public.producao_tentativas(org_id, estorna_id) where estorna_id is not null;
create index if not exists tentativas_fim_idx on public.producao_tentativas(org_id, fim_em);
create index if not exists tentativas_ordem_idx on public.producao_tentativas(org_id, ordem_id);

-- ---------------------------------------------- 2. estorno copia a original
-- sem security definer: a busca passa pela RLS de select, entao tentativa de
-- outra loja da o mesmo erro de tentativa que nao existe
create or replace function public.fn_tentativa_estorno() returns trigger
language plpgsql set search_path = public as $$
declare t public.producao_tentativas;
begin
  if new.estorna_id is null then return new; end if;
  select * into t from public.producao_tentativas
   where org_id = new.org_id and id = new.estorna_id;
  if not found then
    raise exception 'Tentativa a estornar nao existe nesta loja.' using errcode = 'P0001';
  end if;
  if t.estorna_id is not null then
    raise exception 'Estorno nao se estorna. Registre a tentativa de novo com os numeros certos.' using errcode = 'P0001';
  end if;
  new.ordem_id := t.ordem_id; new.impressora_id := t.impressora_id;
  new.material_id := t.material_id; new.filamento_id := t.filamento_id;
  new.qtd_iniciada := t.qtd_iniciada; new.qtd_boa := t.qtd_boa; new.qtd_perdida := t.qtd_perdida;
  new.inicio_em := t.inicio_em; new.fim_em := t.fim_em;
  return new;
end $$;
revoke execute on function public.fn_tentativa_estorno() from public, anon, authenticated;

drop trigger if exists a_estorno on public.producao_tentativas;
create trigger a_estorno before insert on public.producao_tentativas
  for each row execute function public.fn_tentativa_estorno();

-- ------------------------------------- 3. so insercao, salvo expurgo de conta
-- sem security definer: current_user e quem roda o comando
create or replace function public.fn_tentativa_imutavel() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('make3lab.expurgo', true), '') = 'on'
     and current_user not in ('authenticated', 'anon')
  then
    return old;
  end if;
  raise exception 'Tentativa registrada nao se edita nem se apaga. Para corrigir, estorne.' using errcode = 'P0001';
end $$;
revoke execute on function public.fn_tentativa_imutavel() from public, anon, authenticated;

drop trigger if exists b_imutavel on public.producao_tentativas;
create trigger b_imutavel before update or delete on public.producao_tentativas
  for each row execute function public.fn_tentativa_imutavel();

-- ------------------------------------------------------------------ 4. RLS
alter table public.producao_tentativas enable row level security;
drop policy if exists ler on public.producao_tentativas;
drop policy if exists inserir on public.producao_tentativas;
create policy ler on public.producao_tentativas for select to authenticated
  using (org_id in (select public.fn_minhas_orgs()));
create policy inserir on public.producao_tentativas for insert to authenticated
  with check (org_id in (select public.fn_minhas_orgs()) and public.assinatura_ativa(org_id)
              and criado_por = auth.uid());
revoke all on public.producao_tentativas from authenticated, anon;
grant select, insert on public.producao_tentativas to authenticated;

-- ------------------------------------------- 5. o que conta para o refugo
create or replace view public.producao_tentativas_validas
with (security_invoker = true) as
  select t.* from public.producao_tentativas t
   where t.estorna_id is null
     and not exists (select 1 from public.producao_tentativas e
                      where e.org_id = t.org_id and e.estorna_id = t.id);
revoke all on public.producao_tentativas_validas from authenticated, anon;
grant select on public.producao_tentativas_validas to authenticated;

-- ------------------------------- 6. dedupe deixa passar a reimpressao
create or replace function public.fn_ordem_sem_duplicata() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.venda_id is not null
     and coalesce(new.dados->>'origem','') not in ('auto','reimpressao')
     and exists (
       select 1 from public.ordens_producao o
        where o.org_id = new.org_id and o.venda_id = new.venda_id and o.ativo
          and coalesce(o.dados->>'peca_id','') = coalesce(new.dados->>'peca_id','')
          and coalesce(o.dados->>'linha','') = coalesce(new.dados->>'linha','')
          and o.id <> new.id)
  then
    return null;
  end if;
  return new;
end $$;
