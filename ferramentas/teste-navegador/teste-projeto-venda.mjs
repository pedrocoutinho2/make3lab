// Imagem do projeto visível na venda e na produção, e resumo da venda aberto da fila.
// Demonstração, 1440 e 390 px. Uso: node ferramentas/teste-navegador/teste-projeto-venda.mjs [pasta dos prints]
// Cobre: projeto anexado no item aparece em miniatura no item, na lista de vendas, no card da fila e no
// resumo; clicar na miniatura abre a imagem grande sem abrir a venda nem o resumo; clicar no card da fila
// abre o resumo da venda sem sair da fila; .3mf guardado no item e baixado do resumo; PDF sem página em
// branco (folha principal + uma página por projeto); logo do cliente num lugar só, virando a foto.
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
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  await menu(p, 'Vendas');
  await p.locator('main').getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().dispatchEvent('mousedown'); await espera(p, 250);
  await p.fill('input[placeholder^="digite o nome do produto"]', 'Chaveiro'); await espera(p);
  await p.locator('.add-item button', { hasText: 'Chaveiro' }).first().dispatchEvent('mousedown'); await espera(p, 500);
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('6'); await espera(p);
  await p.locator('input[aria-label="Anexar projeto para o cliente aprovar"]').first().setInputFiles({ name: 'chaveiro-render.png', mimeType: 'image/png', buffer: PNG }); await espera(p, 700);
  ok(`[${w}] miniatura do projeto no item da venda`, await p.locator('.proj-arq .proj-tb img').first().isVisible());
  await p.locator('.proj-arq .proj-tb').first().click(); await espera(p, 300);
  ok(`[${w}] clique na miniatura abre a imagem grande`, await p.locator('.proj-grande img').isVisible());
  await p.keyboard.press('Escape'); await espera(p, 300);
  ok(`[${w}] formulário continua aberto depois de fechar a imagem`, await p.locator('#v-st').isVisible());
  await p.locator('input[aria-label="Guardar o .3mf deste pedido"]').first().setInputFiles({ name: 'chaveiro-pedido.3mf', mimeType: 'application/octet-stream', buffer: TMF }); await espera(p, 600);
  ok(`[${w}] .3mf guardado no item`, await p.locator('.arq-imp li', { hasText: 'chaveiro-pedido.3mf' }).isVisible());
  // PDF: só a folha principal e a página do projeto, sem página em branco
  await p.evaluate(() => document.querySelectorAll('iframe[aria-hidden="true"]').forEach((f) => f.remove()));
  await p.getByRole('button', { name: 'PDF da venda' }).click(); await espera(p, 800);
  const folha = await p.evaluate(() => { const f = [...document.querySelectorAll('iframe[aria-hidden="true"]')].pop(); return f ? f.srcdoc : ''; });
  ok(`[${w}] PDF não cita o .3mf para o cliente`, !folha.includes('chaveiro-pedido.3mf'));
  if (w === 1440) { const pp = await b.newPage(); await pp.setContent(folha); await espera(pp, 500);
    const pdf = await pp.pdf({ format: 'A4', printBackground: true }); const pags = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok('PDF com 2 páginas (folha + projeto), sem página em branco', pags === 2, `${pags} páginas`); await pp.close(); }
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);

  const linha = p.locator('tr.clicavel', { hasText: 'Cliente exemplo A' }).first();
  ok(`[${w}] miniatura na lista de vendas`, await linha.locator('.proj-tb img').isVisible());
  await linha.locator('.proj-tb').first().click(); await espera(p, 300);
  ok(`[${w}] miniatura da lista abre a imagem e não a venda`, await p.locator('.proj-grande img').isVisible() && (await p.locator('#v-st').count()) === 0);
  await p.keyboard.press('Escape'); await espera(p, 300);
  if (w === 390) await p.screenshot({ path: `${OUT}/projeto-lista-vendas-390.png`, fullPage: true });

  await menu(p, 'Fila de produção');
  const card = p.locator('.kcard', { hasText: '6 un.' }).first();
  ok(`[${w}] miniatura no card da fila`, await card.locator('.proj-tb img').isVisible());
  await card.locator('.proj-tb').first().click(); await espera(p, 300);
  ok(`[${w}] miniatura do card abre a imagem, não o resumo`, await p.locator('.proj-grande img').isVisible() && (await p.locator('.resumo-venda').count()) === 0);
  await p.keyboard.press('Escape'); await espera(p, 300);
  await card.locator('.kcorpo').click(); await espera(p, 500);
  const rv = p.locator('.resumo-venda');
  ok(`[${w}] card abre o resumo da venda na fila`, await rv.isVisible() && (await p.locator('#v-st').count()) === 0);
  ok(`[${w}] resumo com cliente, quantidade e projeto grande`, (await rv.innerText()).includes('Cliente exemplo A') && (await rv.innerText()).includes('6 un.') && await rv.locator('.proj-tb img').isVisible());
  const [down] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), rv.getByRole('button', { name: /Baixar/ }).first().click()]);
  ok(`[${w}] .3mf baixa direto do resumo da fila`, !!down && down.suggestedFilename() === 'chaveiro-pedido.3mf', down ? down.suggestedFilename() : 'sem download');
  await p.keyboard.press('Escape'); await espera(p, 300);

  // cliente: um lugar só para a logo; a primeira imagem vira a foto
  await menu(p, 'Clientes');
  await p.locator('tr.clicavel', { hasText: 'Cliente exemplo B' }).first().click(); await espera(p, 500);
  ok(`[${w}] cadastro do cliente com um único envio de logo`, (await p.locator('input[aria-label="Enviar logo"]').count()) === 1 && (await p.getByText('Enviar imagem').count()) === 0);
  await p.locator('input[aria-label="Enviar logo"]').setInputFiles({ name: 'logo-b.png', mimeType: 'image/png', buffer: PNG }); await espera(p, 700);
  ok(`[${w}] logo guardada e virou a foto`, await p.locator('.logos-cli li', { hasText: 'logo-b.png' }).isVisible() && await p.locator('.logos-cli .pilula', { hasText: 'foto' }).isVisible()
    && (await p.locator('.logos-cli img').count()) >= 2);
  if (w === 1440) await p.screenshot({ path: `${OUT}/projeto-resumo-fila.png` });
  if (w === 390) await p.screenshot({ path: `${OUT}/projeto-resumo-fila-390.png` });
  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`); process.exit(falhas ? 1 : 0);
