// Origem do lead no cliente, no orçamento e na venda, e o relatório por origem. Demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-origem.mjs [pasta dos prints]
// Cobre: Configurações lista as origens; cadastro rápido de cliente tem origem; orçamento herda a origem do
// cliente; venda aceita origem nova criada no próprio campo e ela vai para Configurações; cliente sem origem
// ganha a do primeiro pedido; fechar orçamento leva a origem para a venda; Relatórios > Origem dos leads soma certo.
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

async function menu(p, nome, pai) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  const abre = p.locator('button[aria-label="Abrir menu"]').first();
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  if (!(await item.isVisible()) && pai) { await p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${pai}\\s*$`) }).first().click(); await espera(p);
    if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); } }
  if (!(await item.isVisible())) { await p.locator('nav[aria-label="Menu"] button', { hasText: /^\s*Financeiro\s*$/ }).first().click(); await espera(p); }
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
const escolhe = async (p, sel, txt) => { await p.fill(sel, txt); await espera(p, 200); await p.locator(`${sel} ~ .lista button`).first().click(); await espera(p, 250); };
const produto = async (p) => { await p.fill(CAMPO, 'Chaveiro'); await espera(p); await p.locator('.add-item button', { hasText: 'Chaveiro' }).first().click(); await espera(p, 400); };

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // Configurações mostra a lista
  await menu(p, 'Configurações');
  ok(`[${w}] seção Origens de lead`, await p.getByText('Origens de lead').first().isVisible());

  // 1. orçamento: cliente novo pelo modal, com origem Instagram
  await menu(p, 'Orçamentos');
  await p.getByRole('button', { name: /Novo orçamento/ }).first().click(); await espera(p, 500);
  await p.fill('#o-cli', 'Lead Teste Insta'); await espera(p, 200);
  await p.locator('#o-cli ~ .lista button.novo').click(); await espera(p, 400);
  ok(`[${w}] cadastro rápido de cliente tem origem`, await p.locator('#nc-orig').isVisible());
  await escolhe(p, '#nc-orig', 'Instagram');
  await p.getByRole('button', { name: /Salvar e usar/ }).click(); await espera(p, 400);
  ok(`[${w}] orçamento herdou a origem do cliente`, (await p.locator('#o-orig').inputValue()) === 'Instagram');
  await produto(p);
  if (w === 1440) await p.screenshot({ path: `${OUT}/origem-1-orcamento.png`, fullPage: false });
  await p.getByRole('button', { name: 'Salvar', exact: true }).first().click(); await espera(p, 700);

  // fecha o orçamento: venda leva a origem
  await p.locator('tr.clicavel').first().getByRole('button', { name: 'Fechar venda' }).click(); await espera(p, 500);
  await p.getByRole('button', { name: /Fechar venda/ }).last().click(); await espera(p, 800);
  await menu(p, 'Vendas');
  await p.locator('tr.clicavel').filter({ hasText: 'Lead Teste Insta' }).first().locator('td').nth(1).click(); await espera(p, 500);
  ok(`[${w}] venda do orçamento veio com a origem`, (await p.locator('#v-orig').inputValue()) === 'Instagram');
  await p.getByRole('button', { name: 'Cancelar' }).last().click(); await espera(p, 400);

  // 2. venda direta, cliente sem origem, origem nova criada no campo
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await escolhe(p, '#o-cli', 'Cliente exemplo A');
  ok(`[${w}] cliente sem origem deixa o campo vazio`, ['', 'Não informada'].includes(await p.locator('#v-orig').inputValue()));
  await p.fill('#v-orig', 'TikTok'); await espera(p, 200);
  await p.locator('#v-orig ~ .lista button.novo').click(); await espera(p, 300);
  ok(`[${w}] origem nova entra no campo`, (await p.locator('#v-orig').inputValue()) === 'TikTok');
  await produto(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);

  // cliente ganhou a origem do primeiro pedido
  await menu(p, 'Clientes');
  await p.locator('tr.clicavel, .clicavel').filter({ hasText: 'Cliente exemplo A' }).first().click(); await espera(p, 500);
  ok(`[${w}] cliente sem origem ganhou a do pedido`, (await p.locator('#cl-orig').inputValue()) === 'TikTok');
  await p.getByRole('button', { name: 'Cancelar' }).last().click(); await espera(p, 300);

  // origem criada aparece em Configurações
  await menu(p, 'Configurações');
  await p.getByText('Origens de lead').first().click(); await espera(p, 300);
  const nomes = await p.locator('input[aria-label="Origem"]').evaluateAll((xs) => xs.map((x) => x.value));
  ok(`[${w}] TikTok entrou na lista de Configurações`, nomes.includes('TikTok'), nomes.join(', '));

  // 3. relatório
  await menu(p, 'Origem dos leads', 'Relatórios'); await espera(p, 400);
  const tab = p.locator('.cartao', { hasText: 'Origem dos pedidos' });
  const txt = await tab.innerText();
  ok(`[${w}] relatório tem Instagram e TikTok`, txt.includes('Instagram') && txt.includes('TikTok'));
  const linInsta = await tab.locator('tbody tr', { hasText: 'Instagram' }).innerText();
  ok(`[${w}] Instagram com 1 orçamento e 1 venda`, /Instagram\s+1\s/.test(linInsta) && linInsta.split(/\t|\n/).filter(Boolean)[4]?.trim() === '1', linInsta.replace(/\s+/g, ' '));
  if (w === 1440) await p.screenshot({ path: `${OUT}/origem-2-relatorio.png`, fullPage: true });

  // 4. clientes por origem
  await menu(p, 'Clientes por origem', 'Relatórios'); await espera(p, 400);
  const tc = p.locator('.cartao', { hasText: 'Clientes por origem' }).last();
  const tt = await tc.innerText();
  ok(`[${w}] lista os clientes com a origem`, tt.includes('Lead Teste Insta') && tt.includes('Cliente exemplo A') && tt.includes('Cliente exemplo B'));
  ok(`[${w}] Cliente exemplo B aparece sem origem`, /Não informada[\s\S]*Cliente exemplo B/.test(tt));
  await p.locator('.filtro-status .chip-f', { hasText: 'Instagram' }).click(); await espera(p, 300);
  const tf = await p.locator('.cartao', { hasText: 'Clientes de Instagram' }).innerText();
  ok(`[${w}] filtro por origem mostra só os dela`, tf.includes('Lead Teste Insta') && !tf.includes('Cliente exemplo A'));
  if (w === 1440) await p.screenshot({ path: `${OUT}/origem-3-clientes.png`, fullPage: true });
  await menu(p, 'Configurações');
  await p.getByText('Origens de lead').first().click(); await espera(p, 300);
  const ns = await p.locator('input[aria-label="Origem"]').evaluateAll((xs) => xs.map((x) => x.value));
  ok(`[${w}] Parceiros e Amigos/família na lista`, ns.includes('Parceiros') && ns.includes('Amigos/família'), ns.join(', '));
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`);
process.exit(falhas ? 1 : 0);
