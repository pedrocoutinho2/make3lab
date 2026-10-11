// Venda entregue sai da fila de produção, e clicar na ordem abre a venda. Demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-entregue.mjs [pasta dos prints]
// Cobre: venda aberta cria ordem em A imprimir; clicar no card abre a venda; trocar para Entregue
// pede confirmação e tira a ordem da fila (some do Kanban, dos números e do atrasada); registrar falha
// num card não abre a venda.
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch();
let falhas = 0, total = 0;
const ok = (n, c, i = '') => { total++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
const espera = (p, ms = 300) => p.waitForTimeout(ms);
const CAMPO = 'input[placeholder^="digite o nome do produto"]';

async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  const abre = p.locator('button[aria-label="Abrir menu"]').first();
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  if (!(await item.isVisible())) { await p.locator('nav[aria-label="Menu"] button', { hasText: /^\s*Financeiro\s*$/ }).first().click(); await espera(p); }
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  await item.click(); await espera(p, 400);
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = []; const dialogos = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // venda nova, aberta, com prazo vencido para a ordem nascer atrasada
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await p.fill(CAMPO, 'Chaveiro'); await espera(p); await p.locator('.add-item button', { hasText: 'Chaveiro' }).first().click(); await espera(p, 400);
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('7'); await espera(p);
  const dataEnt = p.locator('input[type=date]').filter({ hasNot: p.locator('[disabled]') });
  for (let i = 0; i < await dataEnt.count(); i++) { const id = await dataEnt.nth(i).getAttribute('id'); if (id && /entrega|ent/.test(id)) await dataEnt.nth(i).fill('2026-01-05'); }
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);

  await menu(p, 'Fila de produção');
  const card = p.locator('.kcard', { hasText: '7 un.' }).first();
  ok(`[${w}] ordem da venda aberta está em A imprimir`, await card.isVisible());
  const rotVenda = (await card.locator('.kl2').first().innerText()).split('·')[0].trim();
  const num = rotVenda.replace(/\D/g, '');
  ok(`[${w}] card mostra o número da venda`, !!num, rotVenda);
  if (w === 1440) await p.screenshot({ path: `${OUT}/entregue-1-fila-antes.png`, fullPage: true });

  // clicar no card abre a venda
  await card.locator('.kcorpo').click(); await espera(p, 600);
  ok(`[${w}] clicar na ordem abre a venda`, await p.locator('#v-st').isVisible());

  // troca para Entregue e salva
  await p.selectOption('#v-st', 'entregue'); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  ok(`[${w}] pediu confirmação por ter ordem na fila`, dialogos.some((d) => d.includes(`venda nº ${num}`) && d.includes('tira essas ordens da fila')), dialogos.at(-1) || '');

  await menu(p, 'Fila de produção');
  const restam = await p.locator('.kcard', { hasText: `Venda nº ${num}` }).count();
  ok(`[${w}] venda entregue saiu da fila`, restam === 0, `${restam} card(s)`);
  const atrasadasTxt = await p.locator('.numeros .n', { hasText: 'Atrasadas' }).locator('b').innerText();
  ok(`[${w}] contador de atrasadas não conta a venda entregue`, !(await p.locator('.kcard', { hasText: `Venda nº ${num}` }).locator('.pilula.vencido').count()), `atrasadas ${atrasadasTxt}`);
  if (w === 1440) await p.screenshot({ path: `${OUT}/entregue-2-fila-depois.png`, fullPage: true });

  // registrar falha não navega para a venda
  const comFalha = p.locator('.kcard .link.perda').first();
  if (await comFalha.count()) {
    await comFalha.click(); await espera(p, 400);
    ok(`[${w}] registrar falha abre o diálogo, não a venda`, (await p.locator('#v-st').count()) === 0 && (await p.getByText('Registrar falha').first().isVisible()));
    await p.getByRole('button', { name: 'Cancelar' }).last().click(); await espera(p);
  }
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`);
process.exit(falhas ? 1 : 0);
