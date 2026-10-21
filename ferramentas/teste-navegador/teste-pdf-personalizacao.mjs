// PDF e WhatsApp do orçamento e da venda: personalização só com a descrição da cor, sem tipo e marca
// do filamento, e projeto do item (imagem ou .3mf) numa página de anexo depois da folha principal.
// Demonstração, 1440 e 390 px. Uso: node ferramentas/teste-navegador/teste-pdf-personalizacao.mjs [pasta dos prints]
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const PNG = fs.readFileSync(new URL('./fixture-projeto.png', import.meta.url));
const TMF = fs.readFileSync(new URL('./fixture-projeto.3mf', import.meta.url));
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
const escolhe = async (p, sel, txt) => { const i = p.locator(sel).first(); await i.click(); await i.fill(txt); await espera(p);
  await p.locator('.pers .lista button', { hasText: txt }).first().dispatchEvent('mousedown'); await espera(p, 250); };
async function folha(p, alvo) {
  await p.evaluate(() => document.querySelectorAll('iframe[aria-hidden="true"]').forEach((f) => f.remove()));
  await alvo.click(); await espera(p, 800);
  return p.evaluate(() => { const f = [...document.querySelectorAll('iframe[aria-hidden="true"]')].pop(); return f ? f.srcdoc : ''; });
}
async function preenche(p) {
  await p.fill('input[placeholder^="digite o nome do produto"]', 'Mini microfone'); await espera(p);
  await p.locator('.add-item button', { hasText: 'Mini microfone' }).first().dispatchEvent('mousedown'); await espera(p, 500);
  await escolhe(p, '.pers input[id$="-cx"]', 'Vermelho Bombeiro');
  await escolhe(p, '.pers input[id$="-hs"]', 'Preto fosco');
  await escolhe(p, '.pers input[id$="-cl"]', 'Preto fosco');
  await p.locator('.pers input[type=file]').first().setInputFiles({ name: 'logo-cliente.png', mimeType: 'image/png', buffer: PNG }); await espera(p, 600);
  await p.fill('.pers input[id^="po-"]', 'NOTA INTERNA DA PRODUCAO'); await espera(p);
  await p.locator('input[aria-label="Anexar projeto para o cliente aprovar"]').first().setInputFiles({ name: 'render-microfone.png', mimeType: 'image/png', buffer: PNG }); await espera(p, 600);
  await p.locator('input[aria-label="Anexar projeto para o cliente aprovar"]').first().setInputFiles({ name: 'microfone.3mf', mimeType: 'application/octet-stream', buffer: TMF }); await espera(p, 900);
}
function confere(w, nome, f) {
  ok(`[${w}] ${nome}: cor só pela descrição`, f.includes('Cor da caixa: Vermelho Bombeiro') && f.includes('Cor da haste: Preto fosco') && f.includes('Cor da logo: Preto fosco'));
  ok(`[${w}] ${nome}: sem tipo e marca do filamento`, !/eSun|Voolt3D|PLA · /.test(f.split('<div class="folha pg-anexo">')[0]));
  ok(`[${w}] ${nome}: sem nome de arquivo da logo e sem observação da produção`, !f.includes('logo-cliente.png') && !f.includes('NOTA INTERNA'));
  ok(`[${w}] ${nome}: logo em miniatura com o rótulo`, /<div>Logo: <img src="data:image\/png/.test(f));
  const pgs = (f.match(/<div class="t">PROJETO \d<\/div>/g) || []).length;
  ok(`[${w}] ${nome}: duas páginas de projeto (imagem e miniatura do .3mf)`, pgs === 2 && f.includes('Projeto em anexo (2 imagens)'), String(pgs));
  ok(`[${w}] ${nome}: projeto vem logo depois da folha principal`, f.indexOf('PROJETO 1') > f.indexOf('O que está incluído'));
}
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  await menu(p, 'Orçamentos');
  await p.getByRole('button', { name: /Novo orçamento/ }).first().click(); await espera(p, 500);
  await preenche(p);
  ok(`[${w}] dois projetos listados no item`, (await p.locator('.proj-arq').count()) === 2);
  if (w === 390) await p.screenshot({ path: `${OUT}/pdfpers-orcamento-390.png`, fullPage: true });
  const fo = await folha(p, p.getByRole('button', { name: /Exportar PDF/ }));
  confere(w, 'orçamento', fo);
  if (w === 1440) fs.writeFileSync(`${OUT}/pdfpers-orcamento.html`, fo);
  await p.getByRole('button', { name: /Texto p\/ WhatsApp/ }).click(); await espera(p, 300);
  const zap = await p.locator('textarea').evaluateAll((xs) => xs.map((x) => x.value).join('\n'));
  ok(`[${w}] WhatsApp com a cor só pela descrição`, zap.includes('Cor da caixa: Vermelho Bombeiro') && !/eSun|Voolt3D/.test(zap));

  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await preenche(p);
  const fv = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
  confere(w, 'venda', fv);
  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`); process.exit(falhas ? 1 : 0);
