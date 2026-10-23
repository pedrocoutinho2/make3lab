// Entregue pelo formulário e quitar o restante depois do sinal, demonstração, 1440 e 390 px (23/10/2026).
// Uso: node ferramentas/teste-navegador/teste-quitar-entregue.mjs [pasta dos prints]
// Cobre: venda marcada como entregue no formulário sai de "Pronto para envio" em Entregas e fica em Entregue;
// venda com sinal de 50% pago mostra "Receber o restante" no formulário e "Receber restante" na lista;
// receber pela lista quita o restante no Financeiro e a venda fica Paga; pelo formulário também.
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
async function adiciona(p, nome) { await p.fill(CAMPO, nome); await espera(p); await p.locator('.add-item button', { hasText: nome }).first().click(); await espera(p, 400); }
async function forma(p, nome) { await p.locator('#v-forma').click(); await espera(p); await p.locator('.auto-lista button, [role=listbox] button, [role=option]').filter({ hasText: nome }).first().click(); await espera(p); }
async function novaVenda(p) {
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().click(); await espera(p, 250);
  await adiciona(p, 'Chaveiro');
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('10'); await espera(p);
  await forma(p, 'PIX');
  await p.locator('button[aria-label="Pedir sinal"]').click(); await espera(p);
  await p.locator('button[aria-label="Sinal pago"]').click(); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
}
async function receber(p) {
  await menu(p, 'Entrada');
  return p.$$eval('table tbody tr', (trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ')).filter((t) => /Venda \d+, (sinal|saldo)/.test(t)));
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // 1. sinal pago; entregue pelo formulário
  await novaVenda(p);
  await p.locator('tr.clicavel').first().locator('td').nth(1).click(); await espera(p, 500);
  ok(`[${w}] formulário mostra Receber o restante`, await p.getByRole('button', { name: 'Receber o restante' }).isVisible());
  await p.selectOption('#v-st', 'entregue'); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  await menu(p, 'Entregas');
  const colunas = await p.$$eval('.kanban .kcol, [class*="kcol"]', (cs) => cs.map((c) => c.innerText.replace(/\s+/g, ' ')));
  const pronto = colunas.find((c) => /^Pronto para envio/i.test(c)) || '';
  const entregue = colunas.find((c) => /^Entregue/i.test(c)) || '';
  ok(`[${w}] entregue pelo formulário sai de Pronto para envio`, !/nº 1\b/.test(pronto) && /nº 1\b/.test(entregue), `pronto="${pronto.slice(0, 80)}" entregue="${entregue.slice(0, 80)}"`);

  // 2. receber restante pela lista
  await menu(p, 'Vendas');
  const linha = p.locator('tr.clicavel').first();
  ok(`[${w}] lista mostra Receber restante na venda com sinal pago`, await linha.getByRole('button', { name: 'Receber restante' }).isVisible());
  await linha.getByRole('button', { name: 'Receber restante' }).click(); await espera(p, 600);
  ok(`[${w}] venda fica Paga`, /paga/i.test(await p.locator('tr.clicavel').first().innerText()));
  let ls = await receber(p);
  ok(`[${w}] Financeiro: sinal e restante recebidos`, ls.length === 2 && ls.every((t) => /recebido/.test(t)), JSON.stringify(ls));

  // 3. receber pelo formulário
  await novaVenda(p);
  await p.locator('tr.clicavel').first().locator('td').nth(1).click(); await espera(p, 500);
  await p.getByRole('button', { name: 'Receber o restante' }).click(); await espera(p);
  ok(`[${w}] formulário marca Restante recebido`, (await p.locator('.pagto').first().innerText()).includes('Restante recebido'));
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  ok(`[${w}] venda do formulário fica Paga`, /paga/i.test(await p.locator('tr.clicavel').first().innerText()));
  ls = (await receber(p)).filter((t) => /Venda 2/.test(t));
  ok(`[${w}] Financeiro da segunda venda quitado`, ls.length === 2 && ls.every((t) => /recebido/.test(t)), JSON.stringify(ls));
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
