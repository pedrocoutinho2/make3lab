// Insumo como linha do orçamento e da venda, demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-insumo.mjs
// Cobre: busca acha insumo; cobrado entra no total com preço acima do custo; não cobrado sai do total
// e fica no custo; venda salva baixa o estoque do insumo; WhatsApp do orçamento só leva o cobrado;
// insumo cadastrado na hora pelo campo do item entra no pedido, com o preço do pacote digitado certo.
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch();
let falhas = 0, total = 0;
const ok = (n, c, i = '') => { total++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
const brl = (t) => Number(String(t).replace(/[^\d,]/g, '').replace(',', '.'));
const espera = (p, ms = 300) => p.waitForTimeout(ms);
const CAMPO = 'input[placeholder^="digite o nome do produto"]';

async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  if (!(await item.isVisible())) { await p.locator('button[aria-label="Abrir menu"]').first().click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
async function adiciona(p, nome) {
  await p.fill(CAMPO, nome); await espera(p);
  await p.locator('.add-item button', { hasText: nome }).first().click(); await espera(p, 400);
}
const grandao = async (p) => brl(await p.locator('.grandao').first().innerText());

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // estoque antes
  await menu(p, 'Insumos');
  const est = async () => Number((await p.locator('tr', { hasText: 'Saco a vácuo' }).first().locator('td').nth(4).innerText()).match(/\d+/)[0]);
  const antes = await est();

  // venda: produto + insumo cobrado
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await adiciona(p, 'Chaveiro');
  const soProduto = await grandao(p);
  await p.fill(CAMPO, 'Saco'); await espera(p);
  const opc = await p.locator('.add-item button', { hasText: 'Saco a vácuo' }).first().innerText();
  ok(`[${w}] busca do item acha insumo`, /insumo/.test(opc), opc.replace(/\s+/g, ' '));
  await p.locator('.add-item button', { hasText: 'Saco a vácuo' }).first().click(); await espera(p, 400);
  const linha = p.locator('tr.linha-insumo-doc').first();
  ok(`[${w}] linha de insumo no pedido`, await linha.isVisible());
  const unit = brl(await linha.locator('input[aria-label="Valor unitário"]').inputValue());
  ok(`[${w}] cobrado: preço acima do custo de 4,00`, unit > 4, String(unit));
  const comInsumo = await grandao(p);
  ok(`[${w}] cobrado entra no total`, Math.abs(comInsumo - soProduto - unit) < 0.011, `${soProduto} + ${unit} = ${comInsumo}`);

  // desliga cobrar
  await linha.locator('button[aria-label="Cobrar do cliente"]').click(); await espera(p);
  ok(`[${w}] não cobrado sai do total`, Math.abs((await grandao(p)) - soProduto) < 0.011, String(await grandao(p)));
  ok(`[${w}] não cobrado mostra "fora do total"`, (await linha.innerText()).includes('fora do total'));
  const resumo = await p.locator('.grandao + .sub').first().innerText();
  ok(`[${w}] custo do pedido segue com o insumo`, /custo/.test(resumo), resumo.replace(/\s+/g, ' ').slice(0, 120));

  await linha.locator('input[aria-label="Quantidade"]').fill('2'); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  await menu(p, 'Insumos');
  ok(`[${w}] venda baixa 2 do estoque do insumo`, (await est()) === antes - 2, `${antes} -> ${await est()}`);

  // orçamento: WhatsApp só com o cobrado
  await menu(p, 'Orçamentos');
  await p.getByRole('button', { name: 'Novo orçamento', exact: true }).first().click(); await espera(p, 500);
  await adiciona(p, 'Chaveiro');
  await adiciona(p, 'Saco a vácuo');
  const lo = p.locator('tr.linha-insumo-doc').first();
  await lo.locator('button[aria-label="Cobrar do cliente"]').click(); await espera(p);
  await p.getByRole('button', { name: /Texto p\/ WhatsApp/ }).click(); await espera(p);
  ok(`[${w}] WhatsApp sem o insumo não cobrado`, !(await p.locator('#ow').inputValue()).includes('Saco'));
  await lo.locator('button[aria-label="Cobrar do cliente"]').click(); await espera(p);
  await p.getByRole('button', { name: /Texto p\/ WhatsApp/ }).click(); await espera(p);
  ok(`[${w}] WhatsApp com o insumo cobrado`, (await p.locator('#ow').inputValue()).includes('Saco a vácuo'));

  // cadastro na hora pelo campo do item
  await p.fill(CAMPO, 'Fita de cetim'); await espera(p);
  await p.locator('.add-item button', { hasText: 'Cadastrar "Fita de cetim"' }).first().click(); await espera(p, 400);
  await p.locator('.segm button', { hasText: /^Insumo$/ }).first().click(); await espera(p);
  await p.fill('#ni-q', '10'); await p.locator('#ni-p').click(); await p.locator('#ni-p').pressSequentially('1500'); await espera(p);
  await p.locator('.modal button.forte, [role=dialog] button.forte').first().click(); await espera(p, 500);
  ok(`[${w}] insumo cadastrado na hora entra no pedido`, await p.locator('tr.linha-insumo-doc', { hasText: 'Fita de cetim' }).isVisible());
  const fita = await p.locator('tr.linha-insumo-doc', { hasText: 'Fita de cetim' }).innerText();
  ok(`[${w}] pacote de R$ 15,00 com 10 un. dá custo 1,50 (campo de dinheiro vazio, digitado logo após o foco)`, fita.includes('1,50'), fita.replace(/\s+/g, ' ').slice(0, 120));

  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  if (w === 1440) await p.screenshot({ path: process.argv[2] ? `${process.argv[2]}/insumo-orcamento.png` : 'insumo-orcamento.png', fullPage: true });
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
