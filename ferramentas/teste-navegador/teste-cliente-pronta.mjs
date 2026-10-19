// Venda exige cliente e Pronta para entrega pode ser marcada à mão com ordem na fila (SQL 031).
// Demonstração, 1440 e 390 px. Uso: node ferramentas/teste-navegador/teste-cliente-pronta.mjs [pasta dos prints]
// Cobre: salvar venda sem cliente é barrado com aviso; com cliente salva e cria ordem em A imprimir;
// a opção Pronta para entrega não fica travada; marcar pronta pede confirmação, tira a ordem da fila
// e a venda fica pronta; Voltar para produção devolve a ordem para a fila; fechar orçamento sem
// cliente exige escolher o cliente no diálogo.
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
const cliente = async (p, sel = '#o-cli') => { await p.fill(sel, 'Cliente exemplo B'); await p.locator(`${sel} ~ .lista button`).first().click(); await espera(p, 250); };

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = []; const dialogos = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // 1. sem cliente não salva
  await menu(p, 'Vendas');
  const antes = await p.locator('tr.clicavel').count();
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await p.fill(CAMPO, 'Chaveiro'); await espera(p); await p.locator('.add-item button', { hasText: 'Chaveiro' }).first().click(); await espera(p, 400);
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('9'); await espera(p);
  ok(`[${w}] campo cliente avisa que é obrigatório`, await p.getByText('Obrigatório. A venda não salva sem cliente.').isVisible());
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 600);
  ok(`[${w}] sem cliente o formulário continua aberto`, await p.locator('#v-st').isVisible());
  ok(`[${w}] aviso diz o que fazer`, await p.getByText(/Escolha o cliente da venda/).first().isVisible());
  if (w === 1440) await p.screenshot({ path: `${OUT}/cliente-1-barrado.png`, fullPage: true });

  // 2. com cliente salva e cria ordem
  await cliente(p);
  ok(`[${w}] opção Pronta para entrega liberada`, !(await p.locator('#v-st option[value="pronta"]').isDisabled()));
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  ok(`[${w}] com cliente salvou`, (await p.locator('tr.clicavel').count()) === antes + 1);
  await menu(p, 'Fila de produção');
  const card = p.locator('.kcard', { hasText: '9 un.' }).first();
  ok(`[${w}] ordem em A imprimir`, await card.isVisible());
  const num = (await card.locator('.kl2').first().innerText()).split('·')[0].replace(/\D/g, '');

  // 3. pronta à mão pela lista
  await menu(p, 'Vendas');
  const linha = p.locator('tr.clicavel').filter({ hasText: 'Cliente exemplo B' }).first();
  await linha.getByRole('button', { name: 'Pronta para entrega' }).click(); await espera(p, 600);
  ok(`[${w}] pediu confirmação`, dialogos.some((d) => d.includes(`venda nº ${num}`) && d.includes('pronta para entrega tira essas ordens')), dialogos.at(-1) || '');
  ok(`[${w}] venda ficou pronta`, (await linha.locator('.pilula').first().innerText()).includes('Pronta para entrega'));
  if (w === 1440) await p.screenshot({ path: `${OUT}/cliente-2-pronta.png`, fullPage: true });
  await menu(p, 'Fila de produção');
  ok(`[${w}] ordem saiu da fila`, (await p.locator('.kcard', { hasText: `Venda nº ${num}` }).count()) === 0);

  // 4. continua pronta depois de abrir e salvar de novo
  await menu(p, 'Vendas');
  await linha.locator('td').nth(1).click(); await espera(p, 500);
  ok(`[${w}] formulário mostra pronta`, (await p.locator('#v-st').inputValue()) === 'pronta');
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  ok(`[${w}] salvar de novo não volta para produção`, (await linha.locator('.pilula').first().innerText()).includes('Pronta para entrega'));

  // 5. voltar para produção devolve a ordem à fila
  await linha.getByRole('button', { name: 'Voltar para produção' }).click(); await espera(p, 600);
  ok(`[${w}] voltou para produção`, (await linha.locator('.pilula').first().innerText()).includes('Em produção') || (await linha.locator('.pilula').first().innerText()).includes('Aberta'));
  await linha.locator('td').nth(1).click(); await espera(p, 500);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  await menu(p, 'Fila de produção');
  ok(`[${w}] ordem voltou para a fila`, (await p.locator('.kcard', { hasText: `Venda nº ${num}` }).count()) === 1);

  // 6. pronta pelo seletor do formulário
  await menu(p, 'Vendas');
  await linha.locator('td').nth(1).click(); await espera(p, 500);
  const n0 = dialogos.length;
  await p.selectOption('#v-st', 'pronta'); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  ok(`[${w}] seletor também confirma e marca pronta`, dialogos.length > n0 && (await linha.locator('.pilula').first().innerText()).includes('Pronta para entrega'));

  // 7. orçamento sem cliente: fechar pede o cliente
  await menu(p, 'Orçamentos');
  const novoOrc = p.getByRole('button', { name: /Novo orçamento/ }).first();
  if (await novoOrc.count()) {
    await novoOrc.click(); await espera(p, 500);
    await p.fill(CAMPO, 'Chaveiro'); await espera(p); await p.locator('.add-item button', { hasText: 'Chaveiro' }).first().click(); await espera(p, 400);
    await p.getByRole('button', { name: 'Salvar', exact: true }).first().click(); await espera(p, 700);
    const fechar = p.locator('tr.clicavel').first().getByRole('button', { name: 'Fechar venda' });
    if (await fechar.count()) {
      await fechar.click(); await espera(p, 500);
      const bt = p.getByRole('button', { name: /Fechar venda/ }).last();
      ok(`[${w}] diálogo de fechar pede cliente`, await p.getByText('Este orçamento está sem cliente').isVisible());
      ok(`[${w}] botão travado sem cliente`, await bt.isDisabled());
      await cliente(p);
      ok(`[${w}] com cliente o botão libera`, !(await bt.isDisabled()));
      if (w === 1440) await p.screenshot({ path: `${OUT}/cliente-3-orcamento.png`, fullPage: true });
      await bt.click(); await espera(p, 700);
      await menu(p, 'Vendas');
      ok(`[${w}] venda do orçamento nasceu com cliente`, (await p.locator('tr.clicavel').first().innerText()).includes('Cliente exemplo B'));
    } else ok(`[${w}] orçamento salvo tem Fechar venda na lista`, false);
  }
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`);
process.exit(falhas ? 1 : 0);
