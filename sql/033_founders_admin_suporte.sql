-- 033_founders_admin_suporte.sql
-- Make3Lab, 23/10/2026, projeto Supabase lvnavmtyselveozllcuy
-- Programa Founders aberto em 22/10/2026. Este arquivo cobre:
--   1. Plano na organização: plano founder (status continua 'ativa'), período grátis de 6 meses, preço travado e limites
--      (3 impressoras e 2 usuários depois do grátis; no grátis, sem limite). Limite checado no banco.
--   2. Aceite dos termos versionado, com RPC para aceitar a versão nova no primeiro login.
--   3. Valores padrão do motor na base da Mimori (hora R$ 20, refugo 5%, margem 100%, piso R$ 5/h).
--      Loja nova nasce sem parâmetros de custo: o app mostra a sugestão e pede confirmação.
--   4. Suporte: chamado aberto pelo app, prazo de resposta de 24 h.
--   5. Painel admin: calls do Founder, feedback por call, notas, log de erro do app e RPCs admin_*.
-- Tudo da plataforma fica no schema plataforma, sem acesso direto: só pelas funções abaixo.
-- Idempotente. Aplicado em 23/10/2026 pelo SQL Editor (MCP), em quatro blocos.

-- ============================================================ 1. plano na organização
-- Founder não é status novo: status 'ativa' (já liberado pelo assinatura_ativa) e plano = 'founder'.
alter table public.organizacoes add column if not exists plano text;
alter table public.organizacoes add column if not exists gratis_ate date;
alter table public.organizacoes add column if not exists preco_mensal numeric(10,2) check (preco_mensal is null or preco_mensal >= 0);
alter table public.organizacoes add column if not exists limite_impressoras int check (limite_impressoras is null or limite_impressoras > 0);
alter table public.organizacoes add column if not exists limite_usuarios int check (limite_usuarios is null or limite_usuarios > 0);

-- limite vale só depois do período grátis
create or replace function public.fn_limites(p_org uuid)
returns table (impressoras int, usuarios int, vale boolean)
language sql stable security definer set search_path = public as $$
  select o.limite_impressoras, o.limite_usuarios,
         (o.gratis_ate is null or current_date > o.gratis_ate)
    from public.organizacoes o where o.id = p_org
$$;
revoke all on function public.fn_limites(uuid) from public, anon;
grant execute on function public.fn_limites(uuid) to authenticated;

create or replace function public.fn_limite_impressoras() returns trigger
language plpgsql security definer set search_path = public as $$
declare l record; v_n int;
begin
  if not new.ativo then return new; end if;
  if tg_op = 'UPDATE' and old.ativo then return new; end if;   -- edição de impressora ativa não conta de novo
  -- o app grava por upsert: o INSERT de uma impressora que já existe ativa também é edição
  if tg_op = 'INSERT' and exists (select 1 from public.impressoras i where i.org_id = new.org_id and i.id = new.id and i.ativo) then
    return new;
  end if;
  select * into l from public.fn_limites(new.org_id);
  if l.impressoras is null or not l.vale then return new; end if;
  select count(*) into v_n from public.impressoras where org_id = new.org_id and ativo and id <> new.id;
  if v_n >= l.impressoras then
    raise exception 'Seu plano cobre até % impressoras. Desative uma ou fale com o suporte para ampliar.', l.impressoras
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace trigger limite_impressoras before insert or update of ativo on public.impressoras
  for each row execute function public.fn_limite_impressoras();

create or replace function public.fn_limite_usuarios() returns trigger
language plpgsql security definer set search_path = public as $$
declare l record; v_n int;
begin
  if tg_table_name = 'membros' and exists (select 1 from public.membros m where m.org_id = new.org_id and m.user_id = new.user_id) then
    return new;
  end if;
  select * into l from public.fn_limites(new.org_id);
  if l.usuarios is null or not l.vale then return new; end if;
  select (select count(*) from public.membros m where m.org_id = new.org_id)
       + case when tg_table_name = 'convites'
              then (select count(*) from public.convites c where c.org_id = new.org_id and c.aceito_em is null
                      and public.fn_convite_valido(c))
              else 0 end
    into v_n;
  if v_n >= l.usuarios then
    raise exception 'Seu plano cobre até % usuários. Tire o acesso de alguém ou fale com o suporte para ampliar.', l.usuarios
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace trigger limite_usuarios before insert on public.membros
  for each row execute function public.fn_limite_usuarios();
create or replace trigger limite_usuarios before insert on public.convites
  for each row execute function public.fn_limite_usuarios();

-- ============================================================ 2. termos
create or replace function public.fn_aceitar_termos(p_versao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para aceitar os termos.' using errcode = 'P0001'; end if;
  if coalesce(trim(p_versao), '') = '' then raise exception 'Versão dos termos vazia.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.aceites where user_id = auth.uid() and versao = p_versao) then
    insert into public.aceites (user_id, versao) values (auth.uid(), p_versao);
  end if;
end $$;
revoke all on function public.fn_aceitar_termos(text) from public, anon;
grant execute on function public.fn_aceitar_termos(text) to authenticated;

-- ============================================================ 3. padrões na base da Mimori
create or replace function public.fn_params_preco(p_org uuid, p_override jsonb default '{}'::jsonb)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
      'valor_hora_operador', 20, 'taxa_refugo', 0.05, 'tarifa_kwh', 0.881,
      'margem_padrao', 1.0, 'imposto_pct', 0, 'embalagem_padrao', 0,
      'considerar_mao_obra', true, 'arredondar_90', true, 'piso_lucro_hora', 5)
    || coalesce((select c.params from public.org_config c where c.org_id = p_org), '{}'::jsonb)
    || coalesce(p_override, '{}'::jsonb);
$$;

-- loja nova: empresa com o nome e parâmetros vazios. O app usa a sugestão até a pessoa confirmar.
create or replace function public.fn_semear_org(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_config (org_id, empresa, params) values (p_org,
    jsonb_build_object('nome', (select nome from public.organizacoes where id = p_org),
      'cnpj','', 'whatsapp','', 'email','', 'instagram','', 'cidade','', 'pix','',
      'logo_path', null, 'usarLogo', true),
    jsonb_build_object('confirmados', '{}'::jsonb))
  on conflict (org_id) do nothing;

  insert into public.materiais (org_id, id, nome, preco_kg, perda_pct) values
    (p_org,'m1','PLA',96,0.05),(p_org,'m2','PLA+',110,0.05),(p_org,'m3','PLA Silk',120,0.06),
    (p_org,'m4','PETG',129,0.07),(p_org,'m5','ABS',110,0.12),(p_org,'m6','ASA',160,0.12),
    (p_org,'m7','TPU flex',189,0.10),(p_org,'m8','Nylon/PA',230,0.14),(p_org,'m9','PLA-CF',260,0.08),
    (p_org,'m10','PVA solúvel',400,0.05)
  on conflict do nothing;

  -- impressora de partida marcada como sugestão: o primeiro acesso pede o modelo e o valor de verdade
  insert into public.impressoras (org_id, id, nome, potencia_w, valor_compra, vida_util_h, manutencao_hora, dados)
  values (p_org,'i1','Impressora 1',150,4500,10000,0.15,'{"sugestao":true}') on conflict do nothing;

  insert into public.canais (org_id, id, nome, taxa_pct, taxa_fixa) values
    (p_org,'c1','Balcão / WhatsApp',0,0),
    (p_org,'c2','Mercado Livre Clássico',0.14,6.75),
    (p_org,'c3','Mercado Livre Premium',0.19,6.75),
    (p_org,'c4','Shopee',0.14,4.00)
  on conflict do nothing;

  insert into public.formas_pagamento (org_id, id, nome, taxa_pct, taxa_fixa, dados) values
    (p_org,'f1','PIX',0,0,'{"ativa":true}'),(p_org,'f2','Dinheiro',0,0,'{"ativa":true}'),
    (p_org,'f3','Débito',0.0199,0,'{"ativa":true}'),(p_org,'f4','Crédito à vista',0.0399,0,'{"ativa":true}'),
    (p_org,'f5','Crédito parcelado',0.0599,0,'{"ativa":true}'),(p_org,'f6','Boleto',0,3.49,'{"ativa":true}')
  on conflict do nothing;
end $$;
revoke execute on function public.fn_semear_org(uuid) from public, anon, authenticated;

-- ============================================================ 4 e 5. plataforma
create schema if not exists plataforma;

create table if not exists plataforma.org_info (
  org_id    uuid primary key references public.organizacoes(id) on delete cascade,
  lead_id   uuid references plataforma.lead_espera(id) on delete set null,
  notas     text not null default '',
  atualizado_em timestamptz not null default now()
);

create table if not exists plataforma.chamados (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organizacoes(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  email       text,
  categoria   text not null default 'duvida' check (categoria in ('duvida','erro','sugestao','conta')),
  assunto     text not null check (length(trim(assunto)) between 3 and 140),
  descricao   text not null check (length(trim(descricao)) between 3 and 5000),
  tela        text,
  status      text not null default 'aberto' check (status in ('aberto','em_andamento','respondido','fechado')),
  resposta    text,
  criado_em   timestamptz not null default now(),
  respondido_em timestamptz
);
create index if not exists chamados_org_idx on plataforma.chamados(org_id, criado_em desc);

create table if not exists plataforma.calls (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organizacoes(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada','quinzenal','mensal','extra')),
  ordem       int not null default 0,
  agendada_para timestamptz,
  duracao_min int not null default 20 check (duracao_min between 5 and 120),
  status      text not null default 'a_agendar' check (status in ('a_agendar','agendada','feita','remarcar','faltou','cancelada')),
  notas       text not null default '',
  criado_em   timestamptz not null default now()
);
create index if not exists calls_org_idx on plataforma.calls(org_id, ordem);

create table if not exists plataforma.feedbacks (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references public.organizacoes(id) on delete cascade,
  call_id     bigint references plataforma.calls(id) on delete set null,
  tipo        text not null default 'pedido' check (tipo in ('dor','pedido','bug','elogio','duvida')),
  texto       text not null check (length(trim(texto)) between 2 and 3000),
  prioridade  text not null default 'media' check (prioridade in ('alta','media','baixa')),
  status      text not null default 'novo' check (status in ('novo','backlog','feito','descartado')),
  criado_em   timestamptz not null default now()
);
create index if not exists feedbacks_org_idx on plataforma.feedbacks(org_id, criado_em desc);

create table if not exists plataforma.erros_app (
  id        bigint generated always as identity primary key,
  org_id    uuid references public.organizacoes(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete set null,
  mensagem  text not null,
  contexto  jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists erros_app_idx on plataforma.erros_app(criado_em desc);

alter table plataforma.org_info  enable row level security;
alter table plataforma.chamados  enable row level security;
alter table plataforma.calls     enable row level security;
alter table plataforma.feedbacks enable row level security;
alter table plataforma.erros_app enable row level security;
revoke all on all tables in schema plataforma from anon, authenticated;

-- ------------------------------------------------ app do cliente: suporte e log
create or replace function public.fn_abrir_chamado(p_org uuid, p_categoria text, p_assunto text, p_descricao text, p_tela text default null)
returns bigint language plpgsql security definer set search_path = public, plataforma as $$
declare v_id bigint; v_n int;
begin
  if p_org not in (select public.fn_minhas_orgs()) then raise exception 'Sem acesso a esta loja.' using errcode = 'P0001'; end if;
  select count(*) into v_n from plataforma.chamados where user_id = auth.uid() and criado_em > now() - interval '1 hour';
  if v_n >= 10 then raise exception 'Muitos chamados em pouco tempo. Espere um pouco ou chame no WhatsApp.' using errcode = 'P0001'; end if;
  insert into plataforma.chamados (org_id, user_id, email, categoria, assunto, descricao, tela)
  values (p_org, auth.uid(), (select email from auth.users where id = auth.uid()),
          coalesce(nullif(p_categoria, ''), 'duvida'), trim(p_assunto), trim(p_descricao), left(p_tela, 120))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.fn_meus_chamados(p_org uuid)
returns table (id bigint, categoria text, assunto text, descricao text, status text, resposta text,
               criado_em timestamptz, respondido_em timestamptz)
language sql stable security definer set search_path = public, plataforma as $$
  select c.id, c.categoria, c.assunto, c.descricao, c.status, c.resposta, c.criado_em, c.respondido_em
    from plataforma.chamados c
   where c.org_id = p_org and p_org in (select public.fn_minhas_orgs())
   order by c.criado_em desc limit 50
$$;

create or replace function public.fn_registrar_erro(p_org uuid, p_mensagem text, p_contexto jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public, plataforma as $$
declare v_n int;
begin
  if auth.uid() is null then return; end if;
  select count(*) into v_n from plataforma.erros_app where user_id = auth.uid() and criado_em > now() - interval '1 hour';
  if v_n >= 30 then return; end if;
  insert into plataforma.erros_app (org_id, user_id, mensagem, contexto)
  values (case when p_org in (select public.fn_minhas_orgs()) then p_org end, auth.uid(),
          left(coalesce(p_mensagem, ''), 1000), coalesce(p_contexto, '{}'::jsonb));
end $$;

revoke all on function public.fn_abrir_chamado(uuid, text, text, text, text) from public, anon;
revoke all on function public.fn_meus_chamados(uuid) from public, anon;
revoke all on function public.fn_registrar_erro(uuid, text, jsonb) from public, anon;
grant execute on function public.fn_abrir_chamado(uuid, text, text, text, text) to authenticated;
grant execute on function public.fn_meus_chamados(uuid) to authenticated;
grant execute on function public.fn_registrar_erro(uuid, text, jsonb) to authenticated;

-- ------------------------------------------------ admin
create or replace function public.admin_eu() returns boolean
language sql stable security definer set search_path = plataforma, public as $$ select plataforma.is_admin() $$;
revoke all on function public.admin_eu() from public, anon;
grant execute on function public.admin_eu() to authenticated;

create or replace function plataforma.exigir_admin() returns void
language plpgsql stable security definer set search_path = plataforma, public as $$
begin
  if not plataforma.is_admin() then raise exception 'Acesso restrito ao administrador.' using errcode = '42501'; end if;
end $$;

-- tudo que o painel mostra numa chamada só
create or replace function public.admin_painel() returns jsonb
language plpgsql stable security definer set search_path = plataforma, public as $$
declare v jsonb;
begin
  perform plataforma.exigir_admin();
  select jsonb_build_object(
    'agora', now(),
    'leads', coalesce((select jsonb_agg(to_jsonb(l) - 'origem_ip_hash' order by l.criado_em desc) from plataforma.lead_espera l), '[]'),
    'orgs', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'nome', o.nome, 'status', o.status, 'plano', o.plano, 'criado_em', o.criado_em,
        'acesso_ate', o.acesso_ate, 'gratis_ate', o.gratis_ate, 'preco_mensal', o.preco_mensal,
        'limite_impressoras', o.limite_impressoras, 'limite_usuarios', o.limite_usuarios,
        'lead_id', i.lead_id, 'notas', coalesce(i.notas, ''),
        'empresa', coalesce(c.empresa, '{}'::jsonb) - 'logo_path',
        'confirmados', coalesce(c.params->'confirmados', '{}'::jsonb),
        'membros', coalesce((select jsonb_agg(jsonb_build_object('email', m.email, 'nome', m.nome, 'papel', m.papel,
              'ultimo_acesso', u.last_sign_in_at, 'criado_em', u.created_at,
              'aceite', (select max(a.versao) from public.aceites a where a.user_id = m.user_id)))
            from public.membros m left join auth.users u on u.id = m.user_id where m.org_id = o.id), '[]'),
        'contagem', jsonb_build_object(
          'impressoras', (select count(*) from public.impressoras x where x.org_id = o.id and x.ativo),
          'filamentos',  (select count(*) from public.filamentos x where x.org_id = o.id and x.ativo),
          'produtos',    (select count(*) from public.produtos x where x.org_id = o.id and x.ativo),
          'clientes',    (select count(*) from public.clientes x where x.org_id = o.id and x.ativo),
          'orcamentos',  (select count(*) from public.orcamentos x where x.org_id = o.id and x.ativo),
          'vendas',      (select count(*) from public.vendas x where x.org_id = o.id and x.ativo),
          'producoes',   (select count(*) from public.producao_tentativas x where x.org_id = o.id)),
        'ultima_atividade', greatest(
          (select max(x.atualizado_em) from public.orcamentos x where x.org_id = o.id),
          (select max(x.atualizado_em) from public.vendas x where x.org_id = o.id),
          (select max(x.atualizado_em) from public.produtos x where x.org_id = o.id),
          (select max(u.last_sign_in_at) from public.membros m join auth.users u on u.id = m.user_id where m.org_id = o.id))
      ) order by o.criado_em desc)
      from public.organizacoes o
      left join plataforma.org_info i on i.org_id = o.id
      left join public.org_config c on c.org_id = o.id), '[]'),
    'chamados', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object('loja', o.nome) order by x.criado_em desc)
        from (select * from plataforma.chamados order by criado_em desc limit 300) x join public.organizacoes o on o.id = x.org_id), '[]'),
    'calls', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object('loja', o.nome) order by x.agendada_para nulls last, x.ordem)
        from plataforma.calls x join public.organizacoes o on o.id = x.org_id), '[]'),
    'feedbacks', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object('loja', o.nome) order by x.criado_em desc)
        from plataforma.feedbacks x join public.organizacoes o on o.id = x.org_id), '[]'),
    'erros', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object('loja', o.nome, 'email', u.email) order by x.criado_em desc)
        from (select * from plataforma.erros_app order by criado_em desc limit 200) x
        left join public.organizacoes o on o.id = x.org_id left join auth.users u on u.id = x.user_id), '[]')
  ) into v;
  return v;
end $$;

create or replace function public.admin_lead(p_id uuid, p_status text, p_nota text)
returns void language plpgsql security definer set search_path = plataforma, public as $$
begin
  perform plataforma.exigir_admin();
  update plataforma.lead_espera set status = p_status::plataforma.lead_status,
         nota_interna = coalesce(p_nota, nota_interna) where id = p_id;
end $$;

-- ativa o Founder: 6 meses grátis a partir do início, depois R$ 19,90 com 3 impressoras e 2 usuários.
-- Cria a agenda de calls: entrada, 6 quinzenais (meses 1 a 3) e 2 mensais (meses 4 e 5), todas a agendar.
create or replace function public.admin_ativar_founder(p_org uuid, p_inicio date, p_lead uuid default null)
returns void language plpgsql security definer set search_path = plataforma, public as $$
declare i int;
begin
  perform plataforma.exigir_admin();
  update public.organizacoes set status = 'ativa', plano = 'founder', gratis_ate = (p_inicio + interval '6 months')::date,
         preco_mensal = 19.90, limite_impressoras = 3, limite_usuarios = 2, acesso_ate = null
   where id = p_org;
  if not found then raise exception 'Loja não encontrada.'; end if;
  insert into plataforma.org_info (org_id, lead_id) values (p_org, p_lead)
    on conflict (org_id) do update set lead_id = coalesce(excluded.lead_id, plataforma.org_info.lead_id), atualizado_em = now();
  if p_lead is not null then update plataforma.lead_espera set status = 'convertido' where id = p_lead; end if;
  if not exists (select 1 from plataforma.calls where org_id = p_org) then
    insert into plataforma.calls (org_id, tipo, ordem, agendada_para, duracao_min)
    values (p_org, 'entrada', 0, null, 30);
    for i in 1..6 loop
      insert into plataforma.calls (org_id, tipo, ordem, agendada_para, duracao_min)
      values (p_org, 'quinzenal', i, ((p_inicio + i * 14) + time '10:00') at time zone 'America/Sao_Paulo', 20);
    end loop;
    for i in 4..5 loop
      insert into plataforma.calls (org_id, tipo, ordem, agendada_para, duracao_min)
      values (p_org, 'mensal', 6 + i - 3, ((p_inicio + make_interval(months => i)) + time '10:00') at time zone 'America/Sao_Paulo', 20);
    end loop;
  end if;
end $$;

create or replace function public.admin_org(p_org uuid, p jsonb)
returns void language plpgsql security definer set search_path = plataforma, public as $$
begin
  perform plataforma.exigir_admin();
  update public.organizacoes set
    status = coalesce(nullif(p->>'status', ''), status),
    plano = case when p ? 'plano' then nullif(p->>'plano', '') else plano end,
    gratis_ate = case when p ? 'gratis_ate' then nullif(p->>'gratis_ate', '')::date else gratis_ate end,
    acesso_ate = case when p ? 'acesso_ate' then nullif(p->>'acesso_ate', '')::date else acesso_ate end,
    preco_mensal = case when p ? 'preco_mensal' then nullif(p->>'preco_mensal', '')::numeric else preco_mensal end,
    limite_impressoras = case when p ? 'limite_impressoras' then nullif(p->>'limite_impressoras', '')::int else limite_impressoras end,
    limite_usuarios = case when p ? 'limite_usuarios' then nullif(p->>'limite_usuarios', '')::int else limite_usuarios end
   where id = p_org;
  if p ? 'notas' or p ? 'lead_id' then
    insert into plataforma.org_info (org_id, notas, lead_id)
    values (p_org, coalesce(p->>'notas', ''), nullif(p->>'lead_id', '')::uuid)
    on conflict (org_id) do update set
      notas = case when p ? 'notas' then excluded.notas else plataforma.org_info.notas end,
      lead_id = case when p ? 'lead_id' then excluded.lead_id else plataforma.org_info.lead_id end,
      atualizado_em = now();
  end if;
end $$;

create or replace function public.admin_chamado(p_id bigint, p_status text, p_resposta text)
returns void language plpgsql security definer set search_path = plataforma, public as $$
begin
  perform plataforma.exigir_admin();
  update plataforma.chamados set status = p_status,
         respondido_em = case when nullif(trim(p_resposta), '') is not null and resposta is distinct from trim(p_resposta) then now() else respondido_em end,
         resposta = coalesce(nullif(trim(p_resposta), ''), resposta)
   where id = p_id;
end $$;

create or replace function public.admin_call(p jsonb)
returns bigint language plpgsql security definer set search_path = plataforma, public as $$
declare v_id bigint := nullif(p->>'id', '')::bigint;
begin
  perform plataforma.exigir_admin();
  if v_id is null then
    insert into plataforma.calls (org_id, tipo, ordem, agendada_para, duracao_min, status, notas)
    values ((p->>'org_id')::uuid, coalesce(p->>'tipo', 'extra'), coalesce((p->>'ordem')::int, 99),
            nullif(p->>'agendada_para', '')::timestamptz, coalesce((p->>'duracao_min')::int, 20),
            coalesce(p->>'status', 'a_agendar'), coalesce(p->>'notas', ''))
    returning id into v_id;
  else
    update plataforma.calls set
      agendada_para = case when p ? 'agendada_para' then nullif(p->>'agendada_para', '')::timestamptz else agendada_para end,
      duracao_min = coalesce((p->>'duracao_min')::int, duracao_min),
      status = coalesce(p->>'status', status),
      notas = coalesce(p->>'notas', notas)
     where id = v_id;
  end if;
  return v_id;
end $$;

create or replace function public.admin_feedback(p jsonb)
returns bigint language plpgsql security definer set search_path = plataforma, public as $$
declare v_id bigint := nullif(p->>'id', '')::bigint;
begin
  perform plataforma.exigir_admin();
  if v_id is null then
    insert into plataforma.feedbacks (org_id, call_id, tipo, texto, prioridade, status)
    values ((p->>'org_id')::uuid, nullif(p->>'call_id', '')::bigint, coalesce(p->>'tipo', 'pedido'), p->>'texto',
            coalesce(p->>'prioridade', 'media'), coalesce(p->>'status', 'novo'))
    returning id into v_id;
  else
    update plataforma.feedbacks set
      tipo = coalesce(p->>'tipo', tipo), texto = coalesce(p->>'texto', texto),
      prioridade = coalesce(p->>'prioridade', prioridade), status = coalesce(p->>'status', status),
      call_id = case when p ? 'call_id' then nullif(p->>'call_id', '')::bigint else call_id end
     where id = v_id;
  end if;
  return v_id;
end $$;

do $$ declare f text; begin
  foreach f in array array['admin_painel()','admin_lead(uuid,text,text)','admin_ativar_founder(uuid,date,uuid)',
    'admin_org(uuid,jsonb)','admin_chamado(bigint,text,text)','admin_call(jsonb)','admin_feedback(jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function plataforma.exigir_admin() from public, anon, authenticated;

-- Pedro é o administrador da plataforma
insert into plataforma.admin (user_id, nome)
select id, 'Pedro Coutinho' from auth.users where lower(email) = 'coutinhoa.pedro@gmail.com'
on conflict (user_id) do nothing;
