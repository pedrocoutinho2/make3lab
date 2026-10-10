// Custo discriminado e cadastro rápido, demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-custo-detalhado.mjs
// Cobre: o cadastro rápido usa o preparo padrão das Configurações (não 8 fixo); "Peças por placa"
// divide o preparo; custo da peça sai sem a embalagem do pedido; a conta linha a linha soma o custo
// e o lucro fecha (líquido menos custo); produto salvo abre na ficha com o mesmo custo e a mesma conta;
// ficha salva com preparo em branco continua seguindo o padrão (antes gravava 0).
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch(process.env.M3_CHROME ? { executablePath: process.env.M3_CHROME } : {});
let falhas = 0, total = 0;
const ok = (n, c, i = '') => { total++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
const brl = (t) => { const s = String(t); const v = Number(s.replace(/[^\d,]/g, '').replace(',', '.')); return /−|-/.test(s) ? -v : v; };
const espera = (p, ms = 300) => p.waitForTimeout(ms);
const CAMPO = 'input[placeholder^="digite o nome do produto"]';
const perto = (a, b, tol = 0.03) => Math.abs(a - b) <= tol;

async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  if (!(await item.isVisible())) { await p.locator('button[aria-label="Abrir menu"]').first().click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
async function linhas(p, raiz) {
  return raiz.locator('table.conta tr:not(.gr)').evaluateAll((trs) => trs.map((tr) => {
    const td = tr.querySelectorAll('td'); const ct = td[0].querySelector('.ct'); return { rot: td[0].childNodes[0].textContent.trim(), conta: ct ? ct.innerText.trim() : '', valor: td[1].innerText.trim(), cls: tr.className };
  }));
}
const val = (L, rot) => { const x = L.find((l) => l.rot === rot); return x ? brl(x.valor) : NaN; };
function confereConta(L, onde) {
  const fim = L.findIndex((l) => l.rot === 'Custo da peça');
  const soma = L.slice(0, fim).reduce((a, l) => a + brl(l.valor), 0);
  ok(`${onde}: linhas somam o custo da peça`, perto(soma, val(L, 'Custo da peça')), `${soma.toFixed(2)} x ${val(L, 'Custo da peça')}`);
  ok(`${onde}: custo do pedido = peça + embalagem`, perto(val(L, 'Custo da peça') + val(L, 'Embalagem'), val(L, 'Custo de 1 peça em 1 pedido')));
  ok(`${onde}: lucro = líquido menos custo`, perto(val(L, 'Líquido') + val(L, 'Custo'), val(L, 'Lucro')));
  const prep = L.find((l) => l.rot === 'Preparar a mesa');
  return prep;
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // padrão de preparo das Configurações vira 4 min para provar que o cadastro rápido segue a org
  await menu(p, 'Configurações');
  await p.locator('button.secao-cab', { hasText: 'Custos e cálculo' }).click(); await espera(p);
  await p.locator('#p-su').fill('4'); await espera(p);
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  const nome = `Kit plaquinhas ${w}`;
  await p.fill(CAMPO, nome); await espera(p);
  await p.locator('.add-item button', { hasText: `Cadastrar produto "${nome}"` }).first().click(); await espera(p, 500);
  const modal = p.locator('.modal', { hasText: 'Cadastrar no catálogo' });
  ok(`${w}: modal abriu`, await modal.isVisible());
  const phSetup = await modal.locator('#np-s').getAttribute('placeholder');
  await modal.locator('#np-g').fill('12'); await modal.locator('#np-mi').fill('34'); await modal.locator('#np-p').fill('6');
  await espera(p);
  let L = await linhas(p, modal);
  const prep1 = confereConta(L, `${w} modal, 1 por placa`);
  ok(`${w}: preparo usa o padrão da org (4 min), não 8 fixo`, phSetup === '4' && prep1 && prep1.conta.startsWith('4 min por placa'), prep1 && prep1.conta);
  const prepUm = val(L, 'Preparar a mesa');
  await modal.locator('#np-pp').fill('4'); await espera(p);
  L = await linhas(p, modal);
  const prep4 = confereConta(L, `${w} modal, 4 por placa`);
  ok(`${w}: 4 por placa divide o preparo`, perto(val(L, 'Preparar a mesa'), prepUm / 4, 0.011) && /÷ 4 peças/.test(prep4.conta), `${prepUm} -> ${val(L, 'Preparar a mesa')}`);
  const custoModal = brl(await modal.locator('.previa-preco div').nth(0).locator('b').innerText());
  ok(`${w}: caixa "Custo da peça" sem embalagem`, perto(custoModal, val(L, 'Custo da peça'), 0.005), `${custoModal}`);
  const precoModal = brl(await modal.locator('.previa-preco div').nth(2).locator('b').innerText());
  ok(`${w}: preço da caixa = preço da conta`, perto(precoModal, val(L, 'Preço'), 0.005));
  const filam = L.find((l) => l.rot === 'Filamento');
  ok(`${w}: filamento mostra gramas, perda e R$/kg`, /12 g \+ .*% de perda = .* g × R\$/.test(filam.conta), filam.conta);
  await p.screenshot({ path: `/tmp/claude-0/s/modal-${w}.png`, fullPage: false });
  await modal.getByRole('button', { name: /Cadastrar e usar/ }).click(); await espera(p, 500);

  // ficha do produto: mesma conta
  await menu(p, 'Produtos');
  await p.locator('tr', { hasText: nome }).first().locator('td').nth(1).click(); await espera(p, 700);
  const det = p.locator('details.conta-det').first();
  ok(`${w}: ficha tem a conta linha a linha`, await det.count() > 0);
  await det.locator('summary').click(); await espera(p);
  const LF = await linhas(p, det);
  confereConta(LF, `${w} ficha`);
  ok(`${w}: ficha bate com o cadastro rápido`, perto(val(LF, 'Custo da peça'), custoModal, 0.005) && perto(val(LF, 'Preço'), precoModal, 0.005),
    `${val(LF, 'Custo da peça')}/${val(LF, 'Preço')} x ${custoModal}/${precoModal}`);
  ok(`${w}: ficha mostra 4 peças que saem`, (await p.locator('#s-lote').inputValue()) === '4');
  await p.screenshot({ path: `/tmp/claude-0/s/ficha-${w}.png`, fullPage: true });

  // salvar a ficha com preparo em branco e reabrir: continua no padrão
  await p.getByRole('button', { name: /Salvar alterações/ }).first().click(); await espera(p, 600);
  await menu(p, 'Produtos');
  await p.locator('tr', { hasText: nome }).first().locator('td').nth(1).click(); await espera(p, 700);
  const det2 = p.locator('details.conta-det').first(); await det2.locator('summary').click(); await espera(p);
  const L2 = await linhas(p, det2);
  ok(`${w}: salvar a ficha não zera o preparo em branco`, perto(val(L2, 'Preparar a mesa'), val(LF, 'Preparar a mesa'), 0.005) && val(L2, 'Preparar a mesa') > 0,
    `${val(LF, 'Preparar a mesa')} -> ${val(L2, 'Preparar a mesa')}`);
  const larg = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok(`${w}: sem rolagem horizontal`, !larg);
  ok(`${w}: sem erro de página`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`);
process.exit(falhas ? 1 : 0);
