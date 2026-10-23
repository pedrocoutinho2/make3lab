// Auditoria de corte no celular: percorre todas as telas e os formulários de "Novo" a 390 e 360 px
// e lista o que passa da borda direita da tela (fora de tabela com rolagem lateral de propósito).
// Uso: node ferramentas/teste-navegador/auditoria-mobile.mjs [pasta dos prints]
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch();
const espera = (p, ms = 300) => p.waitForTimeout(ms);
const TELAS = ['Início', 'Produtos', 'Kits', 'Clientes', 'Filamentos', 'Insumos', 'Funil de vendas', 'Simulador', 'Orçamentos', 'Vendas', 'Consignação',
  'Fila de produção', 'Entregas', 'Calendário', 'Dashboard', 'Entrada', 'Saída', 'Previsão', 'Vendas@rel', 'Ganho por canal', 'Metas', 'Orçamentos@rel',
  'Produtos@rel', 'Clientes@rel', 'Origem dos leads', 'Clientes por origem', 'Financeiro@rel', 'Configurações', 'Ajuda e suporte', 'Minha conta'];
const NOVOS = { Produtos: /Novo produto/, Kits: /Novo kit/, Clientes: /Novo cliente/, Filamentos: /Novo filamento|Adicionar filamento/, Insumos: /Novo insumo/,
  'Orçamentos': /Novo orçamento/, Vendas: /Nova venda/, 'Consignação': /Nova remessa/, Entrada: /Nova entrada|Novo lançamento/, 'Saída': /Nova saída|Novo lançamento/ };
async function menu(p, nome) {
  const [rot, grupo] = nome.split('@');
  const nav = p.locator('nav[aria-label="Menu"]');
  const abre = p.locator('button[aria-label="Abrir menu"]').first();
  if (rot === 'Minha conta') { if (await abre.isVisible()) { await abre.click(); await espera(p); } await p.locator('.conta-bt').first().click(); await espera(p, 400); return true; }
  if (await abre.isVisible() && !(await nav.isVisible().catch(() => false))) { await abre.click(); await espera(p); }
  const fin = ['Dashboard', 'Entrada', 'Saída', 'Previsão'].includes(rot);
  const rel = grupo === 'rel' || ['Ganho por canal', 'Metas', 'Origem dos leads', 'Clientes por origem'].includes(rot);
  if (fin || rel) { const pai = nav.locator('button', { hasText: new RegExp(`^\\s*${fin ? 'Financeiro' : 'Relatórios'}\\s*$`) }).first();
    const fl = nav.locator('button.filho', { hasText: new RegExp(`^\\s*${rot}\\s*$`) }).first();
    if (!(await fl.isVisible())) { await pai.click(); await espera(p); }
    if (!(await fl.isVisible()) && await abre.isVisible()) { await abre.click(); await espera(p); if (!(await fl.isVisible())) { await pai.click(); await espera(p); } }
    await fl.click(); await espera(p, 400); return true; }
  const item = nav.locator('button.item', { hasText: new RegExp(`^\\s*${rot}\\s*$`) }).first();
  if (!(await item.isVisible())) return false;
  await item.click(); await espera(p, 400); return true;
}
async function cortes(p) {
  return p.evaluate(() => {
    const W = document.documentElement.clientWidth; const out = [];
    const rolaLado = (el) => { for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && x.scrollWidth > x.clientWidth + 1) return x; } return null; };
    for (const el of document.querySelectorAll('main *, header *, .modal *, [role=dialog] *')) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'contents') continue;
      if (r.right > W + 1 || r.left < -1) {
        const rl = rolaLado(el);
        const nome = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + (el.id ? '#' + el.id : '');
        out.push({ nome, dir: Math.round(r.right - W), txt: (el.innerText || el.value || el.placeholder || '').slice(0, 40).replace(/\s+/g, ' '), rola: rl ? (rl.className || rl.tagName) : '' });
      }
    }
    // só os de fora: tira filho cujo pai também está na lista
    return { docLargo: document.documentElement.scrollWidth - W, out };
  });
}
const relatorio = [];
for (const [w, h] of [[390, 844], [360, 780]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 700);
  await p.click('button[type=submit]'); await espera(p, 700);
  for (const t of TELAS) {
    const foi = await menu(p, t).catch((e) => { relatorio.push(`[${w}] ${t}: não abri (${e.message.split('\n')[0]})`); return false; });
    if (!foi) { relatorio.push(`[${w}] ${t}: não achei no menu`); continue; }
    const passos = [['lista', null]]; if (NOVOS[t.split('@')[0]] && !t.includes('@')) passos.push(['novo', NOVOS[t]]);
    for (const [k, rx] of passos) {
      if (rx) { const bt = p.getByRole('button', { name: rx }).first(); if (!(await bt.isVisible().catch(() => false)) || await bt.isDisabled()) { relatorio.push(`[${w}] ${t} ${k}: sem botão`); continue; } await bt.evaluate((x) => x.click()); await espera(p, 600); }
      const c = await cortes(p);
      const nomeArq = `${w}-${t.replace(/[^\wÀ-ú]+/g, '_')}-${k}.png`;
      if (process.env.TODOS || c.docLargo > 0 || c.out.length) await p.screenshot({ path: `${OUT}/${nomeArq}`, fullPage: true });
      const fora = c.out.filter((x) => !x.rola); const rolando = c.out.filter((x) => x.rola);
      relatorio.push(`[${w}] ${t} ${k}: página ${c.docLargo > 0 ? 'LARGA +' + c.docLargo : 'ok'}, ${fora.length} cortados, ${rolando.length} em rolagem lateral`
        + (fora.length ? '\n    ' + fora.slice(0, 12).map((x) => `${x.nome} +${x.dir} "${x.txt}"`).join('\n    ') : '')
        + (rolando.length ? '\n    rolagem: ' + [...new Set(rolando.map((x) => String(x.rola)))].join(', ') : ''));
      if (rx) { const v = p.getByRole('button', { name: /^Cancelar$/ }).first(); if (await v.isVisible().catch(() => false)) { await v.evaluate((x) => x.click()); await espera(p, 400); } }
    }
  }
  // formulários cheios: venda e orçamento com produto personalizado e insumo, produto aberto, cliente aberto
  const relata = async (nome) => { const c = await cortes(p); const fora = c.out.filter((x) => !x.rola); const rol = c.out.filter((x) => x.rola);
    await p.screenshot({ path: `${OUT}/${w}-${nome}.png`, fullPage: true });
    relatorio.push(`[${w}] ${nome}: página ${c.docLargo > 0 ? 'LARGA +' + c.docLargo : 'ok'}, ${fora.length} cortados, ${rol.length} em rolagem lateral`
      + (fora.length ? '\n    ' + fora.slice(0, 12).map((x) => `${x.nome} +${x.dir} "${x.txt}"`).join('\n    ') : '')
      + (rol.length ? '\n    rolagem: ' + [...new Set(rol.map((x) => String(x.rola)))].join(', ') : '')); };
  const addProd = async (nome) => { await p.fill('input[placeholder^="digite o nome do produto"]', nome); await espera(p); await p.locator('.add-item button', { hasText: nome }).first().dispatchEvent('mousedown'); await espera(p, 400); };
  const addIns = async () => { const i = p.locator('input[placeholder^="digite o nome do insumo"]').first(); if (!(await i.count())) return; await i.fill('Saco'); await espera(p); const o = p.locator('.lista button', { hasText: 'Saco' }).first(); if (await o.count()) { await o.dispatchEvent('mousedown'); await espera(p, 400); } };
  for (const [tela, bt] of [['Vendas', /Nova venda/], ['Orçamentos', /Novo orçamento/]]) {
    try { await menu(p, tela); await p.getByRole('button', { name: bt }).first().evaluate((x) => x.click()); await espera(p, 600);
      await addProd('Mini microfone'); await addProd('Plaquinha'); await addIns(); await relata(`${tela}-cheio`);
      const v = p.getByRole('button', { name: /^Cancelar$/ }).first(); await v.evaluate((x) => x.click()); await espera(p, 400);
    } catch (e) { relatorio.push(`[${w}] ${tela}-cheio: erro ${e.message.split('\n')[0]}`); }
  }
  try { await menu(p, 'Produtos'); await p.locator('tr.clicavel').first().evaluate((x) => x.click()); await espera(p, 700); await relata('Produto-aberto');
    await menu(p, 'Clientes'); await p.locator('tr.clicavel').first().evaluate((x) => x.click()); await espera(p, 700); await relata('Cliente-aberto');
  } catch (e) { relatorio.push(`[${w}] produto/cliente: erro ${e.message.split('\n')[0]}`); }
  if (erros.length) relatorio.push(`[${w}] erros de página: ${erros.join(' | ')}`);
  await ctx.close();
}
await b.close(); srv.close();
console.log(relatorio.join('\n'));
