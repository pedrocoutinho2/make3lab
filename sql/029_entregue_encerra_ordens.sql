-- 029_entregue_encerra_ordens.sql · 10/10/2026
-- Bug: venda criada como aberta e depois marcada como entregue continuava com
-- as ordens em "A imprimir" na fila de producao, e marcada como atrasada.
-- Correcao: venda entregue tira da fila as ordens que nao chegaram em Pronto
-- (ativo = false, nada se apaga). Tentativas de impressao nao mudam.
-- Pode rodar de novo sem estragar nada.

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

  -- entregue: o que ainda nao chegou em Pronto sai da fila. A peca foi entregue,
  -- entao ela existe (feita fora da fila ou tirada do estoque). Ordem pronta fica
  -- ativa para o historico. Voltar a venda de entregue recria o que faltar na fila.
  if new.status = 'entregue' then
    update public.ordens_producao
       set ativo = false,
           dados = dados || jsonb_build_object('encerrada_por', 'entrega', 'encerrada_em', v_hoje)
     where org_id = new.org_id and venda_id = new.id and ativo and etapa <> 'pronto';
    return null;
  end if;

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

-- ordens que ja ficaram presas em vendas entregues antes desta correcao
update public.ordens_producao o
   set ativo = false,
       dados = o.dados || jsonb_build_object('encerrada_por', 'entrega',
                 'encerrada_em', to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD'))
  from public.vendas v
 where v.org_id = o.org_id and v.id = o.venda_id and v.status = 'entregue'
   and o.ativo and o.etapa <> 'pronto';
