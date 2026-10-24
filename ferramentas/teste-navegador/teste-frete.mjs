// Frete no orçamento e na venda, demonstração, 1440 e 390 px (23/10/2026).
// Uso: node ferramentas/teste-navegador/teste-frete.mjs [pasta dos prints]
// Cobre: frete cobrado soma no total e sai no WhatsApp e no PDF; sinal de 50% incide só sobre os produtos
// e o frete vai no restante; o QR do Pix cobra o sinal sem frete; a venda herda o frete do orçamento; o frete
// pago vira saída variável no Financeiro; o frete fica fora do lucro (cobrado = pago dá o mesmo lucro);
// venda pronta sem frete definido avisa ao marcar, ganha o selo na lista, entra nos alertas e no card de
// Entregas, e o aviso some ao definir o frete ali mesmo.
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
const br = (v) => v.toFixed(2).replace('.', ',');
const tlv = (s) => { const o = {}; let i = 0; while (i < s.length) { const id = s.slice(i, i + 2), n = +s.slice(i + 2, i + 4); o[id] = s.slice(i + 4, i + 4 + n); i += 4 + n; } return o; };

async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  const abre = p.locator('button[aria-label="Abrir menu"]').first();
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  if (!(await item.isVisible())) { await p.locator('nav[aria-label="Menu"] button', { hasText: /^\s*Financeiro\s*$/ }).first().click(); await espera(p); }
  if (!(await item.isVisible()) && (await abre.isVisible())) { await abre.click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
async function adiciona(p, nome) { await p.fill(CAMPO, nome); await espera(p); await p.locator('.add-item button', { hasText: nome }).first().click(); await espera(p, 400); }
async function folha(p, alvo) {
  await p.evaluate(() => document.querySelectorAll('iframe[aria-hidden="true"]').forEach((f) => f.remove()));
  await alvo.click(); await espera(p, 700);
  return p.evaluate(() => { const f = [...document.querySelectorAll('iframe[aria-hidden="true"]')].pop(); return f ? f.srcdoc : ''; });
}
const segm = (p, txt) => p.locator('.pagto.frete .segm button', { hasText: txt }).first().click();

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [], dialogos = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // empresa com CNPJ, para o PDF sair com Pix
  await menu(p, 'Configurações');
  const secEmp = p.locator('button.secao-cab', { hasText: 'Empresa' }).first();
  if ((await secEmp.getAttribute('aria-expanded')) !== 'true') { await secEmp.click(); await espera(p); }
  await p.fill('#em-cnpj', '11.222.333/0001-81'); await p.fill('#em-razao', 'Loja Teste Impressão 3D Ltda'); await espera(p);

  // 1. orçamento: R$ 20 de frete cobrado, sinal de 50%
  await menu(p, 'Orçamentos');
  await p.getByRole('button', { name: 'Novo orçamento', exact: true }).first().click(); await espera(p, 500);
  await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().click(); await espera(p, 250);
  await adiciona(p, 'Chaveiro');
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('10'); await espera(p);
  const prod = reais(await p.locator('.grandao').first().innerText());
  const lucroSem = reais((await p.locator('.grandao + .sub').first().innerText()).split('lucro').pop());
  await segm(p, 'Cobrar do cliente'); await espera(p);
  await p.fill('#o-fr-v', '2000'); await espera(p);
  const tot = reais(await p.locator('.grandao').first().innerText());
  ok(`[${w}] frete cobrado soma no total`, Math.abs(tot - (prod + 20)) < 0.005, `${prod} + 20 = ${tot}`);
  const lucroCom = reais((await p.locator('.grandao + .sub').first().innerText()).split('lucro').pop());
  // cobrado = pago: o frete não mexe no lucro, só a taxa da forma e o imposto sobre ele (sem forma e imposto 0 na demo)
  ok(`[${w}] frete fica fora do lucro`, Math.abs(lucroSem - lucroCom) < 0.005, `${lucroSem} x ${lucroCom}`);
  await p.locator('button[aria-label="Pedir sinal"]').click(); await espera(p);
  const sinalTxt = await p.locator('.pagto.sinal').innerText();
  ok(`[${w}] sinal de 50% só sobre os produtos, frete no restante`, sinalTxt.includes(br(prod / 2)) && sinalTxt.includes(br(tot - prod / 2)), sinalTxt.replace(/\s+/g, ' '));
  await p.getByRole('button', { name: /Texto p\/ WhatsApp/ }).click(); await espera(p);
  const zap = await p.locator('#ow').inputValue();
  ok(`[${w}] WhatsApp traz a linha do frete`, /Frete.*R\$\s?20,00/.test(zap) && new RegExp(`Total: R\\$\\s?${br(tot)}`).test(zap), zap.split('\n').filter((l) => /Frete|Total/.test(l)).join(' | '));
  const fo = await folha(p, p.getByRole('button', { name: /Exportar PDF/ }));
  ok(`[${w}] PDF do orçamento traz o frete antes do total`, /<span>Frete<\/span><span>R\$\s?20,00<\/span><\/div><div class="fim">/.test(fo));
  const cc = (fo.match(/data-pix="([^"]+)"/) || [])[1] || '';
  ok(`[${w}] QR do orçamento cobra o sinal, sem o frete`, tlv(cc)['54'] === (prod / 2).toFixed(2), tlv(cc)['54']);
  await p.getByRole('button', { name: /^Salvar$/ }).click(); await espera(p, 600);

  // 2. fechar venda: herda o frete; frete pago vira saída variável
  await p.locator('tr.clicavel').first().getByRole('button', { name: 'Fechar venda' }).click(); await espera(p, 500);
  await p.getByRole('button', { name: /Fechar venda/ }).last().click(); await espera(p, 800);
  await menu(p, 'Vendas');
  ok(`[${w}] venda do orçamento herda o total com frete`, (await p.locator('tr.clicavel').first().innerText()).includes(br(tot)));
  await p.locator('tr.clicavel').first().locator('td').nth(1).click(); await espera(p, 500);
  ok(`[${w}] venda herda o modo cobrar`, (await p.locator('.pagto.frete .segm button.on').innerText()).includes('Cobrar'));
  await p.fill('#v-fr-c', '1650'); await espera(p);
  ok(`[${w}] resultado do frete aparece`, (await p.locator('.pagto.frete').innerText()).includes('3,50'));
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  await menu(p, 'Saída');
  const saidas = await p.$$eval('table tbody tr', (trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ')));
  ok(`[${w}] frete pago vira saída no Financeiro`, saidas.some((t) => /Frete da venda 1/.test(t) && t.includes('16,50')), JSON.stringify(saidas.filter((t) => /Frete/.test(t))));
  await menu(p, 'Entrada');
  const entradas = await p.$$eval('table tbody tr', (trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ')).filter((t) => /Venda 1|Frete da venda 1/.test(t)));
  // SQL 040: o frete cobrado tem entrada própria, ao lado da saída do frete pago
  ok(`[${w}] frete cobrado vira entrada própria`, entradas.some((t) => /Frete da venda 1/.test(t) && t.includes('20,00')), JSON.stringify(entradas));
  ok(`[${w}] restante da venda sem o frete`, entradas.some((t) => /saldo/.test(t) && t.includes(br(prod / 2))), JSON.stringify(entradas));
  const somaEnt = entradas.reduce((a, t) => a + reais((t.match(/R\$\s?[\d.]+,\d\d/) || ['0'])[0]), 0);
  ok(`[${w}] entradas somam o total do pedido`, Math.abs(somaEnt - tot) < 0.005, `${somaEnt} x ${tot}`);

  // 3. venda nova sem frete: pronta avisa, selo, alerta e card de Entregas
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().click(); await espera(p, 250);
  await adiciona(p, 'Chaveiro');
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  dialogos.length = 0;
  await p.locator('tr.clicavel').first().getByRole('button', { name: 'Pronta para entrega' }).click(); await espera(p, 500);
  ok(`[${w}] marcar pronta sem frete avisa`, dialogos.some((d) => /Frete não definido/.test(d)), dialogos[0] || 'sem aviso');
  ok(`[${w}] lista mostra Frete a definir`, /frete a definir/i.test(await p.locator('tr.clicavel').first().innerText()));
  const sino = p.locator('button[aria-label*="lerta"], button[aria-label*="otifica"]').first();
  if (await sino.isVisible()) { await sino.click(); await espera(p); }
  ok(`[${w}] alerta de pronta sem frete`, (await p.locator('body').innerText()).includes('pronta para entrega sem frete definido'));
  if (await sino.isVisible()) { await p.keyboard.press('Escape'); await espera(p); }
  await menu(p, 'Entregas');
  const card = p.locator('.kcorpo', { hasText: 'frete a definir' }).first();
  ok(`[${w}] card de Entregas mostra frete a definir`, await card.isVisible());
  if (w === 1440) await p.screenshot({ path: `${OUT}/frete-entregas.png`, fullPage: true });
  await card.click(); await espera(p, 400);
  await segm(p, 'Sem frete'); await espera(p);
  await p.locator('[role=dialog]').getByRole('button', { name: /Salvar/ }).click(); await espera(p, 500);
  ok(`[${w}] definido o frete, o aviso some`, !(await p.locator('.kcorpo', { hasText: 'frete a definir' }).count()));
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
