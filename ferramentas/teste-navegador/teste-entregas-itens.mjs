// Entregas mostra o pedido (produtos da venda) no card e no modal. Demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-entregas-itens.mjs [pasta dos prints]
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch(process.env.M3_CHROME ? { executablePath: process.env.M3_CHROME } : {});
let falhas = 0;
const ok = (n, c, i = '') => { console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
const espera = (p, ms = 300) => p.waitForTimeout(ms);
async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  const abre = p.locator('button[aria-label="Abrir menu"]').first();
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  await item.click(); await espera(p, 500);
}
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await p.fill('input[placeholder^="digite o nome do produto"]', 'Chaveiro'); await espera(p);
  await p.locator('.add-item button', { hasText: 'Chaveiro' }).first().click(); await espera(p, 400);
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('7'); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  await menu(p, 'Entregas');
  const cards = await p.locator('.kcard').count();
  const comItens = await p.locator('.kcard .kitens').count();
  ok(`${w}px cards têm o pedido`, cards > 0 && comItens > 0, `(${comItens}/${cards})`);
  const txt = (await p.locator('.kcard .kitens').first().innerText().catch(() => '')).trim();
  ok(`${w}px item com quantidade e nome`, /7×\s+Chaveiro/.test(txt), JSON.stringify(txt));
  ok(`${w}px card sem insumo listado`, !/embalagem/i.test(await p.locator('.kitens').allInnerTexts().then((a) => a.join(' '))));
  await p.screenshot({ path: `${OUT}/entregas-${w}.png`, fullPage: true });
  await p.locator('.kcard .kcorpo').first().click(); await espera(p, 400);
  ok(`${w}px modal mostra o pedido`, await p.locator('.lista-pedido li').count() > 0);
  await p.screenshot({ path: `${OUT}/entregas-modal-${w}.png` });
  ok(`${w}px sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(falhas ? `${falhas} falha(s)` : 'tudo passou'); process.exit(falhas ? 1 : 0);
