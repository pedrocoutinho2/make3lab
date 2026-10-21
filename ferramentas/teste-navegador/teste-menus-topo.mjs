// Barra de cima: só um menu aberto por vez (atalhos, alertas, conta). Abrir um fecha o outro; clique fora e Esc fecham.
// Demonstração, 1440 e 390 px. Uso: node ferramentas/teste-navegador/teste-menus-topo.mjs [pasta dos prints]
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch();
let falhas = 0, total = 0;
const ok = (n, c, i = '') => { total++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
const espera = (p, ms = 250) => p.waitForTimeout(ms);
const POPS = { atalhos: '.pop-atalhos', sino: '.pop-alertas', conta: '.pop-conta' };
const BTS = { atalhos: 'button[aria-label="Escolher atalhos"]', sino: 'button.sino', conta: 'button.conta-topo' };
async function abertos(p) { const r = []; for (const [k, s] of Object.entries(POPS)) if (await p.locator(s).count()) r.push(k); return r; }

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);
  const visiveis = []; for (const [k, s] of Object.entries(BTS)) if (await p.locator(s).first().isVisible()) visiveis.push(k);

  // todas as ordens de abertura: depois de cada clique só o último fica aberto
  for (const a of visiveis) for (const c of visiveis) { if (a === c) continue;
    await p.locator(BTS[a]).first().click(); await espera(p);
    await p.locator(BTS[c]).first().click(); await espera(p);
    const x = await abertos(p);
    ok(`[${w}] ${a} depois ${c}: só ${c} aberto`, x.length === 1 && x[0] === c, x.join(','));
    await p.locator(BTS[c]).first().click(); await espera(p);
    ok(`[${w}] ${c} fecha no segundo clique`, (await abertos(p)).length === 0);
  }
  // clique fora e Esc
  for (const k of visiveis) {
    await p.locator(BTS[k]).first().click(); await espera(p);
    await p.locator('main').evaluate((m) => m.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))); await espera(p);
    ok(`[${w}] ${k} fecha com clique fora`, (await abertos(p)).length === 0);
    await p.locator(BTS[k]).first().click(); await espera(p);
    await p.keyboard.press('Escape'); await espera(p);
    ok(`[${w}] ${k} fecha com Esc`, (await abertos(p)).length === 0);
  }
  // busca fecha o menu aberto
  if (await p.locator('#busca-global').isVisible()) {
    await p.locator(BTS.conta).click(); await espera(p);
    await p.locator('#busca-global').click(); await espera(p);
    ok(`[${w}] focar a busca fecha o menu`, (await abertos(p)).length === 0);
  }
  if (w === 1440) { await p.locator(BTS.atalhos).click(); await espera(p); await p.locator(BTS.conta).click(); await espera(p);
    await p.screenshot({ path: `${OUT}/menus-topo.png`, clip: { x: 800, y: 0, width: 640, height: 320 } }); }
  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`); process.exit(falhas ? 1 : 0);
