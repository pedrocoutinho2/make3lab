-- 031_venda_cliente_e_pronta_manual.sql · 18/10/2026
-- Make3Lab, projeto Supabase lvnavmtyselveozllcuy
--
-- 1. Venda ativa precisa de cliente. Excecao: venda do acerto de consignacao
--    (dados.origem = 'consignacao'), em que o comprador final nao e conhecido e
--    quem responde e o ponto de venda (dados.ponto_id).
-- 2. "Pronta para entrega" passa a poder ser marcada a mao mesmo com ordem de
--    producao em andamento. Antes so as ordens levavam a venda para 'pronta', e
--    a tela travava a opcao: na pratica nenhuma venda com ordem conseguia mudar.
--    Mesma regra do 029 (entregue): a ordem que nao chegou em Pronto sai da fila
--    (ativo = false, encerrada_por = 'pronta', nada se apaga). Enquanto a venda
--    esta pronta, essas ordens contam como feitas e nao sao recriadas. Voltar a
--    venda para producao recria na fila o que faltar. Item novo numa venda
--    pronta continua gerando ordem e devolvendo a venda para producao (022).
-- Depende do 022 e do 029. Pode rodar de novo sem estragar nada.
-- STATUS: testado no banco em transacao desfeita e aplicado em 18/10/2026, junto com o front.

-- ------------------------------------------------------------ 1. cliente
alter table public.vendas drop constraint if exists vendas_cliente_obrigatorio;
alter table public.vendas add constraint vendas_cliente_obrigatorio check (
  not ativo
  or coalesce(cliente_id, '') <> ''
  or coalesce(dados->>'origem', '') = 'consignacao'
);

-- ------------------------------------------------------------ 2. pronta a mao
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

  -- entregue (029): o que ainda nao chegou em Pronto sai da fila
  if new.status = 'entregue' then
    update public.ordens_producao
       set ativo = false,
           dados = dados || jsonb_build_object('encerrada_por', 'entrega', 'encerrada_em', v_hoje)
     where org_id = new.org_id and venda_id = new.id and ativo and etapa <> 'pronto';
    return null;
  end if;

  -- pronta marcada a mao: o que nao chegou em Pronto sai da fila, como na entrega
  if new.status = 'pronta' then
    update public.ordens_producao
       set ativo = false,
           dados = dados || jsonb_build_object('encerrada_por', 'pronta', 'encerrada_em', v_hoje)
     where org_id = new.org_id and venda_id = new.id and ativo and etapa <> 'pronto';
  end if;

  for r in select * from public.fn_itens_venda_pecas(new.org_id, new.dados) loop
    -- com a venda pronta, ordem encerrada por 'pronta' conta como feita
    select coalesce(sum(coalesce(nullif(dados->>'qtd','')::numeric,0)),0) into v_tem
      from public.ordens_producao
     where org_id = new.org_id and venda_id = new.id
       and (ativo or (new.status = 'pronta' and dados->>'encerrada_por' = 'pronta'))
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
