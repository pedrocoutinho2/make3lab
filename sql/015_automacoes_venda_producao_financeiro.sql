-- 015_automacoes_venda_producao_financeiro.sql
-- Make3Lab, 20/09/2026, projeto Supabase lvnavmtyselveozllcuy
-- Corrente venda -> producao -> financeiro garantida no banco, nao no navegador.
-- Aplicado em 20/09 em tres migracoes (015, 016 correcao do dedupe, 017 correcao
-- do estorno na propria linha). Este arquivo ja esta consolidado no estado final
-- e e idempotente: pode rodar de novo inteiro.

-- ---------------------------------------------------------------- 1. guardas
alter table public.vendas drop constraint if exists vendas_status_check;
alter table public.vendas add constraint vendas_status_check
  check (status in ('aberta','producao','entregue','cancelada'));

create unique index if not exists vendas_numero_uidx
  on public.vendas(org_id, numero) where numero is not null and ativo;
create unique index if not exists orcamentos_numero_uidx
  on public.orcamentos(org_id, numero) where numero is not null and ativo;

create index if not exists ordens_venda_idx on public.ordens_producao(org_id, venda_id) where ativo;
create index if not exists lanc_venda_idx on public.lancamentos(org_id, (dados->>'venda_id')) where ativo;

-- ------------------------------------------------- 2. numero unico por org
create or replace function public.fn_numero_doc() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prox int; v_existe boolean;
begin
  execute format('select exists(select 1 from public.%I where org_id=$1 and numero=$2 and id<>$3 and ativo)', tg_table_name)
    into v_existe using new.org_id, new.numero, new.id;
  if new.numero is null or new.numero <= 0 or v_existe then
    execute format('select coalesce(max(numero),0)+1 from public.%I where org_id=$1', tg_table_name)
      into v_prox using new.org_id;
    new.numero := v_prox;
  end if;
  return new;
end $$;

drop trigger if exists a_numero on public.vendas;
create trigger a_numero before insert on public.vendas
  for each row execute function public.fn_numero_doc();
drop trigger if exists a_numero on public.orcamentos;
create trigger a_numero before insert on public.orcamentos
  for each row execute function public.fn_numero_doc();

-- ------------------------------------- 3. itens da venda -> demanda de pecas
create or replace function public.fn_itens_venda_pecas(p_org uuid, p_dados jsonb)
returns table (peca_id text, qtd numeric, descricao text)
language sql stable security definer set search_path = public as $$
  with itens as (
    select t.i from jsonb_array_elements(coalesce(p_dados->'itens','[]'::jsonb)) as t(i)
  ),
  direto as (
    select i->>'peca_id' as peca_id,
           coalesce(nullif(i->>'qtd','')::numeric,0) as qtd,
           coalesce(i->>'descricao','') as descricao
      from itens where coalesce(i->>'peca_id','') <> ''
  ),
  de_kit as (
    select k.it->>'peca_id' as peca_id,
           coalesce(nullif(k.it->>'qtd','')::numeric,0) * coalesce(nullif(i.i->>'qtd','')::numeric,0) as qtd,
           coalesce(to_jsonb(kt)->>'nome', kt.id) as descricao
      from itens i
      join public.kits kt on kt.org_id = p_org and kt.id = i.i->>'kit_id' and kt.ativo
      cross join lateral jsonb_array_elements(coalesce(kt.dados->'itens','[]'::jsonb)) as k(it)
     where coalesce(i.i->>'kit_id','') <> ''
  )
  select x.peca_id, sum(x.qtd)::numeric, max(x.descricao)
    from (select * from direto union all select * from de_kit) x
   where coalesce(x.peca_id,'') <> '' and x.qtd > 0
   group by x.peca_id;
$$;

-- ------------------------------------------ 4. venda -> fila de producao
create or replace function public.fn_sinc_ordens_venda() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; v_tem numeric;
        v_hoje text := to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD');
begin
  if pg_trigger_depth() > 1 then return null; end if;

  if not new.ativo or new.status = 'cancelada' then
    update public.ordens_producao set ativo = false
     where org_id = new.org_id and venda_id = new.id and ativo and etapa = 'fila';
    return null;
  end if;

  if new.status = 'entregue' then return null; end if;

  for r in select * from public.fn_itens_venda_pecas(new.org_id, new.dados) loop
    select coalesce(sum(coalesce(nullif(dados->>'qtd','')::numeric,0)),0) into v_tem
      from public.ordens_producao
     where org_id = new.org_id and venda_id = new.id and ativo and dados->>'peca_id' = r.peca_id;

    if v_tem < r.qtd then
      insert into public.ordens_producao (org_id, id, etapa, venda_id, dados)
      values (new.org_id,
              'op' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
              'fila', new.id,
              jsonb_build_object(
                'peca_id', r.peca_id,
                'qtd', r.qtd - v_tem,
                'descricao', coalesce(nullif(r.descricao,''),'Peca'),
                'venda_numero', new.numero,
                'cliente_id', coalesce(new.cliente_id,''),
                'prazo', coalesce(new.dados->>'entrega_em',''),
                'criado_em', v_hoje,
                'falhas', 0,
                'origem', 'auto'));
    end if;
  end loop;

  update public.ordens_producao o set ativo = false
   where o.org_id = new.org_id and o.venda_id = new.id and o.ativo and o.etapa = 'fila'
     and not exists (select 1 from public.fn_itens_venda_pecas(new.org_id, new.dados) p
                      where p.peca_id = o.dados->>'peca_id');
  return null;
end $$;

drop trigger if exists z_sinc_ordens on public.vendas;
create trigger z_sinc_ordens after insert or update on public.vendas
  for each row execute function public.fn_sinc_ordens_venda();

-- ------------------------- 5. ordem duplicada do front e caminho inverso
-- o dedupe so vale para ordem vinda do front. A ordem 'auto' nasce com a
-- diferenca ja calculada e nao pode ser descartada (correcao 016).
create or replace function public.fn_ordem_sem_duplicata() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.venda_id is not null
     and coalesce(new.dados->>'origem','') <> 'auto'
     and exists (
       select 1 from public.ordens_producao o
        where o.org_id = new.org_id and o.venda_id = new.venda_id and o.ativo
          and coalesce(o.dados->>'peca_id','') = coalesce(new.dados->>'peca_id','')
          and o.id <> new.id)
  then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists a_ordem_dedupe on public.ordens_producao;
create trigger a_ordem_dedupe before insert on public.ordens_producao
  for each row execute function public.fn_ordem_sem_duplicata();

create or replace function public.fn_sinc_venda_ordem() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_hoje text := to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD');
begin
  if pg_trigger_depth() > 1 or new.venda_id is null then return null; end if;

  if new.etapa in ('imprimindo','pos','pronto') then
    update public.vendas set status = 'producao'
     where org_id = new.org_id and id = new.venda_id and ativo and status = 'aberta';
  end if;

  if not exists (select 1 from public.ordens_producao o
                  where o.org_id = new.org_id and o.venda_id = new.venda_id
                    and o.ativo and o.etapa <> 'pronto') then
    update public.vendas
       set dados = dados || jsonb_build_object('producao_pronta_em', v_hoje)
     where org_id = new.org_id and id = new.venda_id and ativo
       and coalesce(dados->>'producao_pronta_em','') = '';
  end if;
  return null;
end $$;

drop trigger if exists z_sinc_venda on public.ordens_producao;
create trigger z_sinc_venda after insert or update on public.ordens_producao
  for each row execute function public.fn_sinc_venda_ordem();

-- ------------------------------------------------------------ 6. estorno
-- p_marcar=false insere so a contrapartida e devolve o id, para uso dentro do
-- BEFORE UPDATE da propria linha, que nao pode atualiza-la de novo (correcao 017).
create or replace function public.fn_estornar(p_org uuid, p_id text, p_motivo text default '', p_marcar boolean default true)
returns text language plpgsql security definer set search_path = public as $$
declare l public.lancamentos%rowtype; v_novo text;
begin
  select * into l from public.lancamentos where org_id = p_org and id = p_id;
  if not found then raise exception 'lancamento % nao encontrado', p_id; end if;
  if coalesce(l.dados->>'estorno_de','') <> '' then raise exception 'estorno nao se estorna'; end if;
  if exists (select 1 from public.lancamentos where org_id = p_org and dados->>'estorno_de' = p_id and ativo) then
    return null;
  end if;

  v_novo := 'est' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  insert into public.lancamentos (org_id, id, tipo, descricao, valor, venc, pago, cliente_id, dados)
  values (p_org, v_novo,
          case when l.tipo = 'receber' then 'pagar' else 'receber' end,
          'Estorno de ' || l.descricao, l.valor, l.venc, l.pago, l.cliente_id,
          jsonb_build_object('estorno_de', l.id, 'motivo', coalesce(p_motivo,''),
                             'venda_id', coalesce(l.dados->>'venda_id',''), 'origem', 'estorno'));

  if p_marcar then
    update public.lancamentos
       set dados = dados || jsonb_build_object('estornado_em', to_char(now(),'YYYY-MM-DD'), 'estornado_por', v_novo)
     where org_id = p_org and id = p_id;
  end if;
  return v_novo;
end $$;

-- ------------------------- 7. financeiro da venda, sem duplicar o front
create or replace function public.fn_lanc_guarda() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_est text;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.dados->>'venda_id','') <> ''
       and coalesce(new.dados->>'origem','') not in ('auto','estorno') then
      update public.lancamentos set ativo = false
       where org_id = new.org_id and ativo and not pago
         and dados->>'origem' = 'auto'
         and dados->>'venda_id' = new.dados->>'venda_id';
    end if;
    return new;
  end if;

  -- lancamento pago nao se edita, se estorna
  if old.pago and new.pago and new.valor <> old.valor then
    new.valor := old.valor;
    new.dados := new.dados || jsonb_build_object('bloqueio','valor de lancamento pago nao pode ser editado, use estorno');
  end if;

  if old.ativo and not new.ativo and old.pago and coalesce(old.dados->>'estornado_em','') = '' then
    v_est := public.fn_estornar(old.org_id, old.id, 'exclusao pelo app', false);
    if v_est is not null then
      new.dados := new.dados || jsonb_build_object('estornado_em', to_char(now(),'YYYY-MM-DD'), 'estornado_por', v_est);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists a_lanc_guarda on public.lancamentos;
create trigger a_lanc_guarda before insert or update on public.lancamentos
  for each row execute function public.fn_lanc_guarda();

create or replace function public.fn_sinc_financeiro_venda() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_soma numeric; v_pagos int; v_abertos int; v_lanc text; l record;
begin
  if pg_trigger_depth() > 1 then return null; end if;

  if not new.ativo or new.status = 'cancelada' then
    for l in select id from public.lancamentos
              where org_id = new.org_id and ativo and pago
                and dados->>'venda_id' = new.id and coalesce(dados->>'estornado_em','') = '' loop
      perform public.fn_estornar(new.org_id, l.id, 'venda cancelada');
    end loop;
    update public.lancamentos set ativo = false
     where org_id = new.org_id and ativo and not pago and dados->>'venda_id' = new.id;
    return null;
  end if;

  select coalesce(sum(valor),0),
         count(*) filter (where pago),
         count(*) filter (where not pago)
    into v_soma, v_pagos, v_abertos
    from public.lancamentos
   where org_id = new.org_id and ativo and tipo = 'receber'
     and dados->>'venda_id' = new.id and coalesce(dados->>'estorno_de','') = '';

  if round(v_soma,2) = round(new.total,2) then
    if coalesce(new.dados->>'divergencia_financeiro','') <> '' then
      update public.vendas set dados = dados - 'divergencia_financeiro'
       where org_id = new.org_id and id = new.id;
    end if;
    return null;
  end if;

  if v_pagos = 0 and v_abertos = 1 then
    update public.lancamentos set valor = new.total
     where org_id = new.org_id and ativo and tipo = 'receber' and not pago
       and dados->>'venda_id' = new.id;
  elsif v_pagos = 0 and v_abertos = 0 and new.total > 0 then
    v_lanc := 'auto' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
    insert into public.lancamentos (org_id, id, tipo, descricao, valor, venc, pago, cliente_id, dados)
    values (new.org_id, v_lanc, 'receber',
            'Venda ' || coalesce(new.numero::text,'?'), new.total,
            coalesce(new.data, current_date), false, new.cliente_id,
            jsonb_build_object('venda_id', new.id, 'origem', 'auto'));
  else
    update public.vendas
       set dados = dados || jsonb_build_object('divergencia_financeiro',
             'a receber soma ' || to_char(v_soma,'FM999999990.00') || ' e o total da venda e ' || to_char(new.total,'FM999999990.00'))
     where org_id = new.org_id and id = new.id;
  end if;
  return null;
end $$;

drop trigger if exists z_sinc_financeiro on public.vendas;
create trigger z_sinc_financeiro after insert or update on public.vendas
  for each row execute function public.fn_sinc_financeiro_venda();

-- ------------------------------------------ 8. reconciliacao sob demanda
-- roda a corrente de novo em todas as vendas ativas da organizacao.
create or replace function public.fn_reconciliar_org(p_org uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v record; n int := 0;
begin
  for v in select id from public.vendas where org_id = p_org and ativo loop
    update public.vendas set atualizado_em = now() where org_id = p_org and id = v.id;
    n := n + 1;
  end loop;
  return n || ' venda(s) reconciliada(s)';
end $$;

grant execute on function public.fn_estornar(uuid,text,text,boolean) to authenticated;
grant execute on function public.fn_reconciliar_org(uuid) to authenticated;
grant execute on function public.fn_itens_venda_pecas(uuid,jsonb) to authenticated;
