-- 018_personalizacao_producao.sql
-- Make3Lab, 05/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- Personalizacao do item da venda chega ate a ordem de producao.
-- Antes: a demanda era agrupada so por peca_id, entao duas linhas do mesmo
-- produto com personalizacoes diferentes viravam uma ordem e a personalizacao
-- se perdia. Agora a chave e peca_id + linha (key do item no front; indice
-- como reserva). Arte exigida e nao aprovada trava a saida da fila.
-- Compatibilidade: ordem antiga sem 'linha' continua contando para a peca.
-- Idempotente. Depende do 015 a 017.
-- STATUS: testado em Postgres 16 e aplicado no Supabase em 05/10/2026.

-- ------------------------------- 1. itens da venda -> demanda por linha
drop function if exists public.fn_itens_venda_pecas(uuid, jsonb);
create function public.fn_itens_venda_pecas(p_org uuid, p_dados jsonb)
returns table (peca_id text, linha text, qtd numeric, descricao text, personalizacao jsonb)
language sql stable security definer set search_path = public as $$
  with itens as (
    select t.i, coalesce(nullif(t.i->>'key',''), (t.n - 1)::text) as linha
      from jsonb_array_elements(coalesce(p_dados->'itens','[]'::jsonb)) with ordinality as t(i, n)
  ),
  direto as (
    select i->>'peca_id' as peca_id, linha,
           coalesce(nullif(i->>'qtd','')::numeric,0) as qtd,
           coalesce(i->>'descricao','') as descricao,
           nullif(i->'personalizacao','null'::jsonb) as personalizacao
      from itens where coalesce(i->>'peca_id','') <> ''
  ),
  de_kit as (
    select k.it->>'peca_id', i.linha,
           coalesce(nullif(k.it->>'qtd','')::numeric,0) * coalesce(nullif(i.i->>'qtd','')::numeric,0),
           coalesce(nullif(kt.nome,''), kt.id),
           nullif(i.i->'personalizacao','null'::jsonb)
      from itens i
      join public.kits kt on kt.org_id = p_org and kt.id = i.i->>'kit_id' and kt.ativo
      cross join lateral jsonb_array_elements(coalesce(kt.dados->'itens','[]'::jsonb)) as k(it)
     where coalesce(i.i->>'kit_id','') <> ''
  )
  select x.peca_id, x.linha, sum(x.qtd)::numeric, max(x.descricao),
         (array_agg(x.personalizacao) filter (where x.personalizacao is not null))[1]
    from (select * from direto union all select * from de_kit) x
   where coalesce(x.peca_id,'') <> '' and x.qtd > 0
   group by x.peca_id, x.linha;
$$;

-- arte exigida e ainda nao aprovada
create or replace function public.fn_aguarda_arte(p jsonb) returns boolean
language sql immutable as $$
  select coalesce((p->'arte'->>'exigida')::boolean, false)
     and coalesce(p->'arte'->>'status','') <> 'aprovada';
$$;

-- --------------------------------------------- 2. venda -> fila de producao
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
     where org_id = new.org_id and venda_id = new.id and ativo
       and dados->>'peca_id' = r.peca_id
       and (dados->>'linha' = r.linha or coalesce(dados->>'linha','') = '');

    if v_tem < r.qtd then
      insert into public.ordens_producao (org_id, id, etapa, venda_id, dados)
      values (new.org_id,
              'op' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
              'fila', new.id,
              jsonb_build_object(
                'peca_id', r.peca_id,
                'linha', r.linha,
                'qtd', r.qtd - v_tem,
                'descricao', coalesce(nullif(r.descricao,''),'Peca'),
                'venda_numero', new.numero,
                'cliente_id', coalesce(new.cliente_id,''),
                'prazo', coalesce(new.dados->>'entrega_em',''),
                'criado_em', v_hoje,
                'falhas', 0,
                'origem', 'auto',
                'personalizacao', coalesce(r.personalizacao, 'null'::jsonb),
                'aguarda_arte', public.fn_aguarda_arte(r.personalizacao)));
    end if;

    -- personalizacao e status da arte acompanham a venda enquanto a ordem nao saiu
    update public.ordens_producao
       set dados = dados || jsonb_build_object(
             'personalizacao', coalesce(r.personalizacao, 'null'::jsonb),
             'aguarda_arte', public.fn_aguarda_arte(r.personalizacao))
     where org_id = new.org_id and venda_id = new.id and ativo
       and etapa = 'fila' and dados->>'peca_id' = r.peca_id and dados->>'linha' = r.linha
       and (dados->'personalizacao' is distinct from coalesce(r.personalizacao, 'null'::jsonb)
            or coalesce((dados->>'aguarda_arte')::boolean,false) <> public.fn_aguarda_arte(r.personalizacao));
  end loop;

  update public.ordens_producao o set ativo = false
   where o.org_id = new.org_id and o.venda_id = new.id and o.ativo and o.etapa = 'fila'
     and not exists (select 1 from public.fn_itens_venda_pecas(new.org_id, new.dados) p
                      where p.peca_id = o.dados->>'peca_id'
                        and (p.linha = o.dados->>'linha' or coalesce(o.dados->>'linha','') = ''));
  return null;
end $$;

-- ---------------------------------- 3. dedupe do front respeita a linha
create or replace function public.fn_ordem_sem_duplicata() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.venda_id is not null
     and coalesce(new.dados->>'origem','') <> 'auto'
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

-- ------------------------------------------------------- 4. trava de arte
create or replace function public.fn_ordem_trava_arte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ativo and new.etapa <> 'fila'
     and coalesce((new.dados->>'aguarda_arte')::boolean, false)
     and (tg_op = 'INSERT' or old.etapa = 'fila')
  then
    raise exception 'A arte deste item ainda nao foi aprovada. Aprove na venda para liberar a impressao.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists b_trava_arte on public.ordens_producao;
create trigger b_trava_arte before insert or update on public.ordens_producao
  for each row execute function public.fn_ordem_trava_arte();

grant execute on function public.fn_itens_venda_pecas(uuid,jsonb) to authenticated;
grant execute on function public.fn_aguarda_arte(jsonb) to authenticated;
