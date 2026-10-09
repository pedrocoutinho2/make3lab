// Financeiro em Dashboard, Entrada, Saída e Previsão, demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-financeiro.mjs [pasta dos prints]
// Cobre: menu com os quatro itens; Entrada e Saída abrem em Todos com filtros a receber/a pagar,
// recebidos/pagos e atrasados; Saída separa custo fixo e variável (nova saída exige o tipo,
// a lista troca o tipo num clique); topo da Previsão alinhado.
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
  if (!(await item.isVisible())) { await p.locator('nav[aria-label="Menu"] button', { hasText: /^\s*Financeiro\s*$/ }).first().click(); await espera(p); }
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
const linhas = (p) => p.locator('.cartao table tbody tr').count();

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  await menu(p, 'Entrada');
  const nav = await p.locator('nav[aria-label="Menu"]').innerText();
  ok(`[${w}] menu: Dashboard, Entrada, Saída, Previsão`, /Dashboard[\s\S]*Entrada[\s\S]*Saída[\s\S]*Previsão/.test(nav));
  const fEnt = await p.locator('[aria-label="Filtrar lançamentos"]').innerText();
  ok(`[${w}] Entrada: Todos, A receber, Recebidos, Atrasados`, /Todos\s*A receber\s*Recebidos\s*Atrasados/.test(fEnt), fEnt.replace(/\s+/g, ' '));
  ok(`[${w}] Entrada abre em Todos`, (await p.locator('[aria-label="Filtrar lançamentos"] button[aria-pressed=true]').innerText()) === 'Todos');

  // saída: nova saída exige tipo
  await menu(p, 'Saída');
  const fSai = await p.locator('[aria-label="Filtrar lançamentos"]').innerText();
  ok(`[${w}] Saída: Todos, A pagar, Pagos, Atrasados`, /Todos\s*A pagar\s*Pagos\s*Atrasados/.test(fSai), fSai.replace(/\s+/g, ' '));
  ok(`[${w}] Saída tem filtro de fixo e variável`, await p.locator('.cabeca [aria-label="Tipo de custo"]').isVisible());
  ok(`[${w}] cards de custo fixo e variável`, /Custo fixo em[\s\S]*Custo variável em/.test(await p.locator('main, body').first().innerText()));
  const antes = await linhas(p);
  await p.getByRole('button', { name: /Nova saída/ }).click(); await espera(p);
  await p.fill('#l-desc', 'Aluguel'); await p.locator('#l-val').click(); await p.locator('#l-val').pressSequentially('80000'); await espera(p);
  ok(`[${w}] salvar travado sem tipo de custo`, await p.getByRole('button', { name: 'Salvar', exact: true }).isDisabled());
  await p.locator('[aria-label="Tipo de custo"] button', { hasText: 'Fixo' }).click(); await espera(p);
  await p.getByRole('button', { name: 'Salvar', exact: true }).click(); await espera(p, 400);
  ok(`[${w}] saída nova na lista`, (await linhas(p)) === antes + 1, `${antes} -> ${await linhas(p)}`);
  await p.locator('.cabeca [aria-label="Tipo de custo"] button', { hasText: /^Fixos$/ }).click(); await espera(p);
  const fixos = await p.locator('.cartao table tbody').innerText();
  ok(`[${w}] filtro Fixos mostra o aluguel e esconde a bobina`, fixos.includes('Aluguel') && !fixos.includes('Bobina'));
  await p.locator('.cabeca [aria-label="Tipo de custo"] button', { hasText: /^Variáveis$/ }).click(); await espera(p);
  ok(`[${w}] filtro Variáveis mostra a bobina`, (await p.locator('.cartao table tbody').innerText()).includes('Bobina'));
  await p.locator('.cartao table tbody tr', { hasText: 'Bobina' }).locator('.botao-pilula').click(); await espera(p);
  ok(`[${w}] trocar a bobina para fixo tira ela de Variáveis`, !(await p.locator('.cartao').last().innerText()).includes('Bobina'));
  await p.locator('[aria-label="Filtrar lançamentos"] button', { hasText: 'Pagos' }).click(); await espera(p);
  await p.locator('.cabeca [aria-label="Tipo de custo"] button', { hasText: /^Fixos e variáveis$/ }).click(); await espera(p);
  ok(`[${w}] filtro Pagos sem nada pago mostra estado vazio`, (await p.locator('.vazio').count()) > 0);

  // previsão: topo alinhado
  await menu(p, 'Previsão');
  const inp = await p.locator('#pv-saldo').boundingBox();
  const seg = await p.locator('.prev-topo .segm').boundingBox();
  const lab1 = await p.locator('label[for="pv-saldo"]').boundingBox();
  const lab2 = await p.locator('.prev-topo label', { hasText: 'Olhar para frente' }).boundingBox();
  if (w >= 1024) {
    ok(`[${w}] previsão: rótulos na mesma linha`, Math.abs(lab1.y - lab2.y) < 2, `${lab1.y} / ${lab2.y}`);
    ok(`[${w}] previsão: campo e botões alinhados em cima e embaixo`, Math.abs(inp.y - seg.y) < 1 && Math.abs((inp.y + inp.height) - (seg.y + seg.height)) < 1, `${inp.y},${inp.height} / ${seg.y},${seg.height}`);
    await p.locator('.prev-topo').screenshot({ path: `${OUT}/previsao-topo.png` });
  } else ok(`[${w}] previsão: botões com a altura do campo`, Math.abs(inp.height - seg.height) < 1, `${inp.height} / ${seg.height}`);

  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
