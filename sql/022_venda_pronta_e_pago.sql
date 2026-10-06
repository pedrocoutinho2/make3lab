-- 022_venda_pronta_e_pago.sql
-- Make3Lab, 05/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- 1. Etapa nova da venda entre producao e entregue: 'pronta'. A venda vai
--    sozinha para 'pronta' quando todas as ordens de producao chegam em
--    'pronto', e volta para 'producao' se uma ordem volta (falha) ou se
--    entra item novo. Venda sem ordem (so estoque ou avulso) muda na mao.
-- 2. Venda criada com pagamento ja efetuado: dados.pagamento =
--    {efetuado: true, em: 'AAAA-MM-DD', forma_id}. O lancamento a receber
--    automatico nasce pago. Marcar depois, com o lancamento ainda aberto e
--    unico, tambem quita. Lancamento pago nao se desfaz por aqui: se estorna.
-- Depende do 015 a 019. Idempotente.
-- STATUS: testado em Postgres 16 em 05/10/2026. NAO aplicado. Aplicar junto
-- com o merge do front que conhece o status 'pronta'; o app antigo nao sabe
-- exibir esse status.

-- ------------------------------------------------------------ 1. status
alter table public.vendas drop constraint if exists vendas_status_check;
alter table public.vendas add constraint vendas_status_check
  check (status in ('aberta','producao','pronta','entregue','cancelada'));

-- ------------------------------------------ 2. ordem -> status da venda
create or replace function public.fn_sinc_venda_ordem() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_hoje text := to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD');
        v_tem_aberta boolean; v_ativas int;
begin
  -- profundidade 2 liberada: a ordem criada pela propria venda (item novo)
  -- precisa tirar a venda de 'pronta'. O update em vendas daqui volta com
  -- profundidade 3, e os triggers de vendas param ali.
  if pg_trigger_depth() > 2 or new.venda_id is null then return null; end if;

  if new.etapa in ('imprimindo','pos','pronto') then
    update public.vendas set status = 'producao'
     where org_id = new.org_id and id = new.venda_id and ativo and status = 'aberta';
  end if;

  select count(*), coalesce(bool_or(o.etapa <> 'pronto'), false)
    into v_ativas, v_tem_aberta
    from public.ordens_producao o
   where o.org_id = new.org_id and o.venda_id = new.venda_id and o.ativo;
  if v_ativas = 0 then return null; end if;

  if not v_tem_aberta then
    update public.vendas
       set status = case when status in ('aberta','producao') then 'pronta' else status end,
           dados = case when coalesce(dados->>'producao_pronta_em','') = ''
                        then dados || jsonb_build_object('producao_pronta_em', v_hoje) else dados end
     where org_id = new.org_id and id = new.venda_id and ativo;
  else
    -- ordem voltou (falha) ou entrou ordem nova: sai de 'pronta'
    update public.vendas
       set status = 'producao', dados = dados - 'producao_pronta_em'
     where org_id = new.org_id and id = new.venda_id and ativo and status = 'pronta';
  end if;
  return null;
end $$;

-- ------------------------------------------ 3. financeiro da venda
create or replace function public.fn_sinc_financeiro_venda() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_soma numeric; v_pagos int; v_abertos int; v_lanc text; l record;
        v_pago boolean := coalesce((new.dados->'pagamento'->>'efetuado')::boolean, false);
        v_pago_em text := coalesce(nullif(new.dados->'pagamento'->>'em',''),
                                   to_char((now() at time zone 'America/Sao_Paulo')::date,'YYYY-MM-DD'));
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

  -- pagamento marcado com um unico lancamento aberto: quita
  if v_pago and v_pagos = 0 and v_abertos = 1 then
    update public.lancamentos
       set pago = true, valor = new.total,
           dados = dados || jsonb_build_object('pago_em', v_pago_em, 'forma_id',
                     coalesce(new.dados->'pagamento'->>'forma_id', new.dados->>'forma_id', ''))
     where org_id = new.org_id and ativo and tipo = 'receber' and not pago
       and dados->>'venda_id' = new.id;
    return null;
  end if;

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
            coalesce(new.data, current_date), v_pago, new.cliente_id,
            jsonb_build_object('venda_id', new.id, 'origem', 'auto')
            || case when v_pago then jsonb_build_object('pago_em', v_pago_em, 'forma_id',
                     coalesce(new.dados->'pagamento'->>'forma_id', new.dados->>'forma_id', ''))
                    else '{}'::jsonb end);
  else
    update public.vendas
       set dados = dados || jsonb_build_object('divergencia_financeiro',
             'a receber soma ' || to_char(v_soma,'FM999999990.00') || ' e o total da venda e ' || to_char(new.total,'FM999999990.00'))
     where org_id = new.org_id and id = new.id;
  end if;
  return null;
end $$;
