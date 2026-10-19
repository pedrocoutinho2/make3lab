// Calendário: a grade mostra nº do pedido e cliente, a lista mostra os produtos. Modo demonstração.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined }); let falhas = 0;
for (const [w, h] of [[1440, 1000], [390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500 })).newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForTimeout(600);
  await p.click('button[type=submit]'); await p.waitForTimeout(800);
  const menu = async (nome) => { const i = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
    if (!(await i.isVisible())) { await p.locator('button[aria-label="Abrir menu"]').first().click(); await p.waitForTimeout(300); }
    await i.click(); await p.waitForTimeout(400); };
  for (const [prod, q] of [['Chaveiro com logo do cliente', 25], ['Porta-aliança', 3], ['Plaquinha de identificação pet', 10]]) {
    await menu('Início'); await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await p.waitForTimeout(500); await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().click(); await p.waitForTimeout(250);
    await p.fill('input[placeholder^="digite o nome do produto"]', prod); await p.waitForTimeout(300);
    await p.locator('button', { hasText: prod }).first().click(); await p.waitForTimeout(400);
    await p.locator('.m3 input[aria-label="Quantidade"]').first().fill(String(q)); await p.waitForTimeout(300);
    await p.getByRole('button', { name: /Salvar venda/ }).click(); await p.waitForTimeout(700); }
  const it = p.locator('nav[aria-label="Menu"] button', { hasText: /^\s*Calendário\s*$/ }).first();
  if (!(await it.isVisible())) { await p.locator('button[aria-label="Abrir menu"]').first().click(); await p.waitForTimeout(300); }
  await it.click(); await p.waitForTimeout(500);
  const etq = await p.locator('.dia .etq').count();
  const comNum = await p.locator('.dia .etq b').count();
  console.log(w, 'etiquetas', etq, 'com nº', comNum, 'erros', erros.length);
  if (!comNum || erros.length) falhas++;
  await p.locator('.dia', { has: p.locator('.etq b') }).first().click(); await p.waitForTimeout(300);
  console.log(w, 'linhas do dia:', (await p.locator('.lista-evt li').allInnerTexts()).join(' | '));
  await p.screenshot({ path: `${OUT}/calendario-${w}.png`, fullPage: true });
}
await b.close(); srv.close(); console.log(falhas ? 'FALHOU' : 'PASSOU'); process.exit(falhas ? 1 : 0);
