// Sinal no orçamento e na venda, demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-sinal.mjs [pasta dos prints]
// Cobre: sinal de 50% no orçamento sai no WhatsApp; venda com sinal vira dois lançamentos
// (sinal e restante) no Financeiro; marcar sinal pago quita só o sinal; restante a definir;
// sinal pago e salvo fica travado; pagamento efetuado quita o restante.
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
const reais = (t) => Number(String(t).replace(/[^\d,]/g, '').replace(',', '.'));

async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  const abre = p.locator('button[aria-label="Abrir menu"]').first();
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  if (!(await item.isVisible())) { await p.locator('nav[aria-label="Menu"] button', { hasText: /^\s*Financeiro\s*$/ }).first().click(); await espera(p); }
  // no celular, abrir o grupo navega e fecha o menu: abre de novo
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
async function adiciona(p, nome) { await p.fill(CAMPO, nome); await espera(p); await p.locator('.add-item button', { hasText: nome }).first().click(); await espera(p, 400); }
async function lancsDaVenda(p) {
  await menu(p, 'Entrada');
  return p.$$eval('table tbody tr', (trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ')).filter((t) => /Venda \d+, (sinal|saldo)/.test(t)));
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // orçamento: sinal 50% no WhatsApp
  await menu(p, 'Orçamentos');
  await p.getByRole('button', { name: 'Novo orçamento', exact: true }).first().click(); await espera(p, 500);
  await adiciona(p, 'Chaveiro');
  const q = p.locator('.m3 input[aria-label="Quantidade"]').first(); await q.fill('10'); await espera(p);
  await p.locator('button[aria-label="Pedir sinal"]').click(); await espera(p);
  const tot = reais(await p.locator('.grandao').first().innerText());
  await p.getByRole('button', { name: /Texto p\/ WhatsApp/ }).click(); await espera(p);
  const zap = await p.locator('#ow').inputValue();
  ok(`[${w}] WhatsApp do orçamento traz o sinal de 50%`, zap.includes('Sinal para confirmar o pedido') && zap.includes((tot / 2).toFixed(2).replace('.', ',')), zap.split('\n').find((l) => l.includes('Sinal')) || '');

  // venda nova com sinal de 50%, restante a definir
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await adiciona(p, 'Chaveiro');
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('10'); await espera(p);
  const tv = reais(await p.locator('.grandao').first().innerText());
  await p.locator('button[aria-label="Pedir sinal"]').click(); await espera(p);
  await p.locator('.sinal-venc button', { hasText: 'A definir' }).click(); await espera(p);
  ok(`[${w}] venda mostra sinal e restante`, (await p.locator('.pagto.sinal').innerText()).includes('com data a definir'));
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  let ls = await lancsDaVenda(p);
  const meio = (tv / 2).toFixed(2).replace('.', ',');
  ok(`[${w}] Financeiro com sinal e restante abertos`, ls.length === 2 && ls.every((t) => t.includes(meio)), JSON.stringify(ls));
  ok(`[${w}] restante com data a definir`, ls.some((t) => /saldo/.test(t) && /a definir/.test(t)), JSON.stringify(ls));

  // marcar sinal pago
  await menu(p, 'Vendas');
  await p.locator('tr.clicavel').first().click(); await espera(p, 500);
  await p.locator('button[aria-label="Sinal pago"]').click(); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  ok(`[${w}] lista mostra Sinal pago`, /sinal pago/i.test(await p.locator('tr.clicavel').first().innerText()));
  ls = await lancsDaVenda(p);
  ok(`[${w}] baixa parcial: sinal recebido, restante aberto`, ls.length === 2, JSON.stringify(ls));

  // sinal pago fica travado; pagamento efetuado quita o restante
  await menu(p, 'Vendas');
  await p.locator('tr.clicavel').first().click(); await espera(p, 500);
  ok(`[${w}] sinal pago vira texto fixo`, await p.locator('.pagto.sinal.pago-fixo').isVisible());
  await p.locator('button[aria-label="Pagamento já efetuado"]').click(); await espera(p);
  const fp = p.locator('#v-forma'); await fp.click(); await espera(p); await p.locator('.auto-lista button, [role=listbox] button, [role=option]').filter({ hasText: 'PIX' }).first().click().catch(() => {}); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  ok(`[${w}] venda paga`, /paga/i.test(await p.locator('tr.clicavel').first().innerText()), (await p.locator('tr.clicavel').first().innerText()).replace(/\s+/g, ' ').slice(0, 120));

  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  if (w === 1440) await p.screenshot({ path: `${OUT}/sinal-entrada.png`, fullPage: true });
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
