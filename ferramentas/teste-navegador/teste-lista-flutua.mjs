// Lista de opções do autocompletar por cima do resto da tela (23/10/2026), demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-lista-flutua.mjs [pasta dos prints]
// Cobre: a lista de filamento da personalização (dentro da tabela de itens, que rola de lado) aparece
// inteira, por cima dos botões de baixo, e dá para clicar na última opção; perto do fim da tela abre para cima.
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch();
let falhas = 0, total = 0;
const ok = (n, c, i = '') => { total++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
const espera = (p, ms = 300) => p.waitForTimeout(ms);
async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  const abre = p.locator('button[aria-label="Abrir menu"]').first();
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
// todas as opções visíveis: o ponto no meio de cada botão cai no próprio botão (nada cortado nem por cima)
const inteira = (p) => p.evaluate(() => {
  const l = document.querySelector('.auto .lista'); if (!l) return { ok: false, motivo: 'sem lista' };
  const bs = [...l.querySelectorAll('button')].slice(0, 4); const r = l.getBoundingClientRect();
  const bate = bs.every((bt) => { const q = bt.getBoundingClientRect(); const el = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return el && bt.contains(el); });
  return { st: l.getAttribute('style'), h: l.scrollHeight, ok: bate && r.top >= 0 && r.bottom <= innerHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), n: bs.length, pos: getComputedStyle(l).position };
});
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);
  await menu(p, 'Orçamentos');
  await p.getByRole('button', { name: /Novo orçamento/ }).first().click(); await espera(p, 500);
  await p.fill('input[placeholder^="digite o nome do produto"]', 'Mini microfone'); await espera(p);
  await p.locator('.add-item button', { hasText: 'Mini microfone' }).first().dispatchEvent('mousedown'); await espera(p, 500);
  const campo = p.locator('.pers input[id$="-cl"]').first();
  await campo.scrollIntoViewIfNeeded(); await campo.click(); await espera(p, 300);
  let r = await inteira(p);
  ok(`[${w}] lista da personalização inteira e por cima`, r.ok && r.pos === 'fixed', JSON.stringify(r));
  if (w === 1440) await p.screenshot({ path: `${OUT}/lista-flutua.png` });
  const ult = p.locator('.auto .lista button').nth(Math.max(0, r.n - 1));
  const nome = (await ult.innerText()).split('\n')[0];
  await ult.click(); await espera(p, 300);
  ok(`[${w}] clicar na opção de baixo escolhe`, (await campo.inputValue()).length > 0 && (await campo.inputValue()).includes(nome.split(' · ')[1] || nome), `${await campo.inputValue()} / ${nome}`);
  // campo no pé da tela: abre para cima
  await p.evaluate(() => { const el = document.querySelector('.pers input[id$="-cl"]'); const y = el.getBoundingClientRect().top + scrollY - innerHeight + 70; scrollTo(0, y); });
  await espera(p, 200); await campo.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace'); await espera(p, 300);
  r = await inteira(p);
  const ci = await campo.boundingBox();
  ok(`[${w}] perto do fim da tela abre para cima`, r.ok && r.bottom <= ci.y + 1, JSON.stringify(r));
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
