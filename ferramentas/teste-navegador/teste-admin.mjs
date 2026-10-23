// Painel admin (admin/index.html) com o banco simulado: sessão falsa, admin_eu = true e admin_painel de exemplo.
// Confere as abas, a ficha do Founder, o salvar de call/feedback/chamado (RPC chamada com os campos certos)
// e que nada passa da borda a 390 px. Uso: node ferramentas/teste-navegador/teste-admin.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const html = fs.readFileSync(new URL('../../admin/index.html', import.meta.url), 'utf8');
const umd = fs.readFileSync(new URL('../node_modules/@supabase/supabase-js/dist/umd/supabase.js', import.meta.url), 'utf8');
const agora = new Date(), iso = (h) => new Date(agora.getTime() + h * 3600e3).toISOString();
const ORG = '11111111-1111-1111-1111-111111111111', ORG2 = '22222222-2222-2222-2222-222222222222', LEAD = '33333333-3333-3333-3333-333333333333';
const painel = {
  agora: iso(0),
  leads: [{ id: LEAD, nome: 'Ana Exemplo', email: 'ana@exemplo.com', whatsapp: '(21) 90000-0001', qtd_impressoras: '2', marcas: ['Bambu Lab'], vende_onde: ['Shopee', 'Instagram'],
    precifica_hoje: 'planilha', quer_founder: true, status: 'novo', nota_interna: '', criado_em: iso(-30) },
    { id: '55555555-5555-5555-5555-555555555555', nome: 'Carla Exemplo', email: 'carla@exemplo.com', whatsapp: '(21) 90000-0003', qtd_impressoras: '3', marcas: [], vende_onde: ['Shopee'],
      quer_founder: true, status: 'novo', nota_interna: '', criado_em: iso(-12) },
    { id: '44444444-4444-4444-4444-444444444444', nome: 'Bruno Exemplo', email: 'bruno@exemplo.com', whatsapp: '21900000002', qtd_impressoras: '1', marcas: [], vende_onde: [],
    quer_founder: false, status: 'contatado', nota_interna: 'sem impressora ainda', criado_em: iso(-60) }],
  orgs: [{ id: ORG, nome: 'ana', status: 'ativa', plano: 'founder', criado_em: iso(-20), gratis_ate: '2027-04-23', preco_mensal: 19.9, limite_impressoras: 3, limite_usuarios: 2,
    lead_id: LEAD, notas: '', empresa: { nome: 'Ateliê da Ana', cidade: 'Niterói, RJ', whatsapp: '(21) 90000-0001' }, confirmados: { empresa: true, impressoras: true },
    membros: [{ email: 'ana@exemplo.com', nome: 'Ana', papel: 'dono', ultimo_acesso: iso(-2), criado_em: iso(-20), aceite: '2026-10-23' }],
    contagem: { impressoras: 2, filamentos: 4, produtos: 3, clientes: 2, orcamentos: 1, vendas: 0, producoes: 0 }, ultima_atividade: iso(-2) },
    { id: ORG2, nome: 'bruno', status: 'beta', plano: null, criado_em: iso(-5), empresa: { nome: 'Bruno 3D' }, confirmados: {}, notas: '',
      membros: [{ email: 'bruno@exemplo.com', nome: 'Bruno', papel: 'dono', ultimo_acesso: null, aceite: null }],
      contagem: { impressoras: 1, filamentos: 0, produtos: 0, clientes: 0, orcamentos: 0, vendas: 0, producoes: 0 }, ultima_atividade: null }],
  chamados: [{ id: 7, org_id: ORG, loja: 'ana', email: 'ana@exemplo.com', categoria: 'erro', assunto: 'Preço do chaveiro saiu zerado', descricao: 'Abri o produto e o preço veio R$ 0,00.', tela: 'Produtos', status: 'aberto', criado_em: iso(-30) },
    { id: 8, org_id: ORG, loja: 'ana', email: 'ana@exemplo.com', categoria: 'duvida', assunto: 'Como importo 3MF?', descricao: 'Não achei o botão.', status: 'respondido', resposta: 'No simulador.', criado_em: iso(-50), respondido_em: iso(-48) }],
  calls: [{ id: 1, org_id: ORG, loja: 'ana', tipo: 'entrada', ordem: 0, agendada_para: null, duracao_min: 30, status: 'a_agendar', notas: '' },
    { id: 2, org_id: ORG, loja: 'ana', tipo: 'quinzenal', ordem: 1, agendada_para: iso(48), duracao_min: 20, status: 'agendada', notas: '' }],
  feedbacks: [{ id: 3, org_id: ORG, loja: 'ana', tipo: 'pedido', texto: 'Queria exportar para a Shopee direto.', prioridade: 'alta', status: 'novo', criado_em: iso(-10) }],
  erros: [{ id: 9, org_id: ORG, loja: 'ana', email: 'ana@exemplo.com', mensagem: 'gravar vendas: timeout', contexto: { largura: 390 }, criado_em: iso(-3) }],
};
const sessao = { access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
  user: { id: '7ae45689-6b0e-4794-a2d2-8d5af9c08f91', email: 'admin@exemplo.com', aud: 'authenticated', role: 'authenticated' } };
let n = 0, falhas = 0; const ok = (t, c, x = '') => { n++; if (!c) falhas++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${t} ${c ? '' : x}`); };
const b = await chromium.launch();
for (const w of [1280, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  const erros = []; p.on('pageerror', (e) => erros.push(e.message));
  const rpcs = [];
  await p.route('https://cdn.jsdelivr.net/npm/@supabase/**', (r) => r.fulfill({ body: umd, contentType: 'application/javascript' }));
  await p.route('https://fonts.**', (r) => r.fulfill({ body: '' }));
  await p.route('https://lvnavmtyselveozllcuy.supabase.co/**', async (r) => {
    const u = r.request().url(); const nome = (u.match(/rpc\/(\w+)/) || [])[1];
    if (nome) rpcs.push({ nome, corpo: r.request().postDataJSON() });
    const CODIGO = 'c'.repeat(48);
    const body = nome === 'admin_eu' ? 'true' : nome === 'admin_painel' ? JSON.stringify(painel)
      : nome === 'admin_liberacoes' ? JSON.stringify([{ id: 1, email: 'dani@exemplo.com', nome: 'Dani', codigo: 'd'.repeat(48), criado_em: iso(-5), expira_em: iso(600), usado_em: null, revogado_em: null }])
      : nome === 'admin_liberar' ? JSON.stringify({ id: 2, email: 'carla@exemplo.com', codigo: CODIGO, expira_em: iso(720) }) : nome ? '1' : '{}';
    r.fulfill({ status: 200, body, contentType: 'application/json' });
  });
  await p.route('http://admin.teste/**', (r) => r.fulfill({ body: html, contentType: 'text/html' }));
  await p.addInitScript((s) => localStorage.setItem('m3-admin', JSON.stringify(s)), sessao);
  await p.goto('http://admin.teste/admin/');
  await p.waitForSelector('nav.abas', { timeout: 8000 }).catch(() => null);
  ok(`[${w}] abriu o painel`, await p.locator('nav.abas').isVisible());
  ok(`[${w}] vagas de Founders`, (await p.locator('main').innerText()).includes('1 de 10'));
  ok(`[${w}] chamado atrasado aparece em Precisa de você`, (await p.locator('main').innerText()).includes('passou de 24 h'));
  const corte = async () => p.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('main *, .modal *')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1); }).slice(0, 3).map((el) => el.tagName + '.' + el.className + ':' + Math.round(el.getBoundingClientRect().right)); });
  for (const aba of ['Leads', 'Lojas e Founders', 'Chamados', 'Agenda de calls', 'Feedback', 'Logs', 'Visão geral']) {
    await p.locator('nav.abas button', { hasText: aba }).click(); await p.waitForTimeout(150);
    const c = await corte(); ok(`[${w}] ${aba} sem corte`, !c.length, c.join(' '));
    if (w === 390) await p.screenshot({ path: `admin-${aba.split(' ')[0].toLowerCase()}-390.png`, fullPage: true });
  }
  // ficha do Founder
  await p.locator('nav.abas button', { hasText: 'Lojas' }).click();
  await p.locator('li.item', { hasText: 'Ateliê da Ana' }).click(); await p.waitForTimeout(200);
  ok(`[${w}] ficha abre`, await p.locator('.modal').isVisible());
  const c1 = await corte(); ok(`[${w}] ficha sem corte`, !c1.length, c1.join(' '));
  if (w === 390) await p.screenshot({ path: 'admin-ficha-390.png', fullPage: true });
  await p.locator('details', { hasText: 'Call de entrada' }).locator('summary').click();
  await p.locator('[data-roteiro="1"]').click();
  ok(`[${w}] roteiro entra nas notas`, (await p.locator('#cn-1').inputValue()).includes('CALL DE ENTRADA'));
  await p.locator('#cq-1').fill('2026-10-27T15:00'); await p.locator('#cs-1').selectOption('agendada');
  await p.locator('[data-call-salva="1"]').click(); await p.waitForTimeout(250);
  const rc = rpcs.find((x) => x.nome === 'admin_call');
  ok(`[${w}] salvar call manda data em UTC e status`, rc && rc.corpo.p.agendada_para === '2026-10-27T18:00:00.000Z' && rc.corpo.p.status === 'agendada', JSON.stringify(rc && rc.corpo));
  await p.locator('#fb-x').fill('Quer etiqueta com QR'); await p.locator('#fb-t').selectOption('pedido'); await p.locator('#fb-ok').click(); await p.waitForTimeout(250);
  ok(`[${w}] feedback registrado na loja`, rpcs.some((x) => x.nome === 'admin_feedback' && x.corpo.p.org_id === ORG && x.corpo.p.texto === 'Quer etiqueta com QR'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  // loja não Founder: ativar
  await p.locator('li.item', { hasText: 'Bruno 3D' }).click(); await p.waitForTimeout(150);
  p.once('dialog', (d) => d.accept());
  await p.locator('#af-ok').click(); await p.waitForTimeout(250);
  const af = rpcs.find((x) => x.nome === 'admin_ativar_founder');
  ok(`[${w}] ativar Founder chama a RPC com a loja`, af && af.corpo.p_org === ORG2 && /^\d{4}-\d\d-\d\d$/.test(af.corpo.p_inicio), JSON.stringify(af && af.corpo));
  await p.keyboard.press('Escape');
  // chamado: responder
  await p.locator('nav.abas button', { hasText: 'Chamados' }).click(); await p.waitForTimeout(100);
  await p.locator('#cr-7').fill('Era a impressora sem valor pago. Já ajustei.'); await p.locator('[data-ch-salva="7"]').click(); await p.waitForTimeout(250);
  const ch = rpcs.find((x) => x.nome === 'admin_chamado');
  ok(`[${w}] responder chamado marca respondido`, ch && ch.corpo.p_status === 'respondido' && ch.corpo.p_resposta.startsWith('Era'), JSON.stringify(ch && ch.corpo));
  // cadastro fechado: liberar acesso de um lead sem conta
  await p.locator('nav.abas button', { hasText: 'Leads' }).click(); await p.waitForTimeout(100);
  p.once('dialog', (d) => d.accept());
  await p.locator('[data-liberar="55555555-5555-5555-5555-555555555555"]').click(); await p.waitForTimeout(300);
  const lib = rpcs.find((x) => x.nome === 'admin_liberar');
  ok(`[${w}] liberar acesso do lead`, lib && lib.corpo.p_email === 'carla@exemplo.com' && lib.corpo.p_lead === '55555555-5555-5555-5555-555555555555', JSON.stringify(lib && lib.corpo));
  const url = await p.locator('#lk-url').inputValue().catch(() => '');
  ok(`[${w}] link de acesso com o código`, url === 'https://app.make3lab.com.br/?acesso=' + 'c'.repeat(48), url);
  const msg = await p.locator('#lk-msg').inputValue().catch(() => '');
  ok(`[${w}] mensagem com o link e o primeiro nome`, msg.startsWith('Oi, Carla!') && msg.includes(url) && !msg.includes('—'), msg.slice(0, 60));
  await p.locator('#lk-zap').click({ modifiers: [] }).catch(() => null);
  ok(`[${w}] WhatsApp do lead com a mensagem`, ((await p.locator('#lk-zap').getAttribute('href')) || '').startsWith('https://wa.me/5521900000003?text='));
  const c2 = await corte(); ok(`[${w}] modal do link sem corte`, !c2.length, c2.join(' '));
  if (w === 390) await p.screenshot({ path: 'admin-link-390.png', fullPage: true });
  await p.locator('#lk-fecha').click();
  // liberar manual em Lojas
  await p.locator('nav.abas button', { hasText: 'Lojas' }).click(); await p.waitForTimeout(100);
  ok(`[${w}] liberação aguardando aparece em Lojas`, /aguardando cadastro/i.test(await p.locator('main').innerText()));
  await p.locator('#lb-e').fill('novo@exemplo.com'); await p.locator('#lb-n').fill('Novo'); await p.locator('#f-lib button[type=submit]').click(); await p.waitForTimeout(300);
  ok(`[${w}] liberar manual`, rpcs.some((x) => x.nome === 'admin_liberar' && x.corpo.p_email === 'novo@exemplo.com'));
  await p.locator('#lk-fecha').click().catch(() => null);
  // lead: salvar status
  await p.locator('nav.abas button', { hasText: 'Leads' }).click(); await p.waitForTimeout(100);
  await p.locator(`#ls-${LEAD}`).selectOption('convidado'); await p.locator(`[data-salva-lead="${LEAD}"]`).click(); await p.waitForTimeout(250);
  ok(`[${w}] salvar lead`, rpcs.some((x) => x.nome === 'admin_lead' && x.corpo.p_status === 'convidado'));
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await p.close();
}
await b.close();
console.log(`\n${n - falhas} de ${n} passaram`);
process.exit(falhas ? 1 : 0);
