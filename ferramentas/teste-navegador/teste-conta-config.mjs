// Conta no menu e no topo, embalagem padrão como insumo e lucro mínimo vindo das Configurações.
// Demonstração, 1440 e 390 px. Uso: node ferramentas/teste-navegador/teste-conta-config.mjs [pasta dos prints]
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
async function alertas(p) {
  await p.locator('button.sino').click(); await espera(p);
  const t = await p.locator('.pop-alertas').innerText(); await p.locator('button.sino').click(); await espera(p); return t;
}
async function param(p, id, digitos) { const c = p.locator('#' + id); await c.click(); await espera(p, 150); await c.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a'); await c.press('Backspace'); if (digitos) await c.pressSequentially(digitos); await espera(p); }

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // conta no topo: depois do sino, com Minha conta e Sair
  const sino = await p.locator('button.sino').boundingBox(), av = await p.locator('button.conta-topo').boundingBox();
  ok(`[${w}] conta no topo, à direita do sino`, av && sino && av.x > sino.x, `${sino?.x} < ${av?.x}`);
  await p.locator('button.conta-topo').click(); await espera(p);
  const pop = await p.locator('.pop-conta').innerText();
  ok(`[${w}] menu da conta com Minha conta e Sair`, /Minha conta/.test(pop) && /Sair/.test(pop), pop.replace(/\s+/g, ' '));
  if (w === 1440) await p.screenshot({ path: `${OUT}/conta-topo.png`, clip: { x: 900, y: 0, width: 540, height: 260 } });
  await p.locator('.pop-conta button', { hasText: 'Minha conta' }).click(); await espera(p);
  ok(`[${w}] Minha conta abre pelo topo`, (await p.locator('main h2').first().innerText()).includes('Minha conta'));

  // rodapé do menu: fixo e com Sair
  if (w < 1024) { await p.locator('button[aria-label="Abrir menu"]').first().click(); await espera(p); }
  const pe = p.locator('nav .pe');
  ok(`[${w}] rodapé do menu com Sair`, await pe.locator('button.sair').isVisible());
  await p.locator('nav .lado-menu').evaluate((el) => { el.scrollTop = el.scrollHeight; }); await espera(p);
  const caixa = await pe.boundingBox(), nav = await p.locator('nav[aria-label="Menu"]').boundingBox();
  ok(`[${w}] rodapé preso no fim do menu, visível`, caixa && Math.abs((caixa.y + caixa.height) - (nav.y + nav.height)) < 24 && caixa.y + caixa.height <= h + 1, `${caixa?.y}+${caixa?.height} / ${nav?.height}`);
  if (w === 1440) await pe.screenshot({ path: `${OUT}/rodape-menu.png` });
  if (w < 1024) await p.locator('.veu').click({ position: { x: 380, y: 400 } }).catch(() => {});
  await espera(p);

  // lucro mínimo: alerta segue o valor das Configurações
  await menu(p, 'Configurações');
  await p.locator('button', { hasText: 'Custos e cálculo' }).first().click(); await espera(p);
  await param(p, 'p-piso', '100000');
  let a = await alertas(p);
  ok(`[${w}] piso de R$ 1.000 gera aviso com o valor novo`, /abaixo do mínimo de R\$\s?1\.000,00/.test(a), (a.match(/abaixo do mínimo de [^\n]+/) || [''])[0]);
  ok(`[${w}] nenhum aviso com o R$ 15 fixo antigo`, !/abaixo de R\$ 15/.test(a));
  await param(p, 'p-piso', '');
  a = await alertas(p);
  ok(`[${w}] piso zerado tira os avisos de lucro por hora`, !/por hora de máquina/.test(a));

  // embalagem padrão como insumo
  await p.locator('#p-emb-ins').click(); await p.locator('#p-emb-ins').fill('Saco'); await espera(p);
  await p.locator('button', { hasText: 'Saco a vácuo' }).first().click(); await espera(p);
  ok(`[${w}] custo da embalagem vem do insumo`, (await p.locator('.campo-fixo').innerText()).includes('4,00'), await p.locator('.campo-fixo').innerText());
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  const emb = p.locator('.secao-ins tr.linha-insumo-doc', { hasText: 'Saco a vácuo' });
  ok(`[${w}] venda nova já traz a embalagem padrão na seção de insumos`, await emb.isVisible());
  ok(`[${w}] embalagem padrão não é cobrada do cliente`, (await emb.innerText()).includes('fora do total'));
  await emb.getByRole('button', { name: 'Tirar item' }).click(); await espera(p);
  ok(`[${w}] tirar a embalagem mostra o botão para voltar o padrão`, await p.getByRole('button', { name: /Embalagem padrão/ }).isVisible());

  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
