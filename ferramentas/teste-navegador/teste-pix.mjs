// PDF da venda com Pix, demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-pix.mjs [pasta dos prints]
// Cobre: chave vazia usa o CNPJ; sinal em aberto cobra o sinal; sinal pago cobra o restante; sem sinal cobra o total;
// forma que não é Pix não leva QR; venda paga não leva QR. O copia e cola tem o CRC certo e,
// com o jsqr instalado (npm i jsqr pngjs, ou QR_DEPS=pasta), o QR impresso é lido e bate com o copia e cola.
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import { createRequire } from 'module';
const OUT = process.argv[2] || '.';
let jsQR = null, PNG = null;
try { const req = createRequire((process.env.QR_DEPS || new URL('.', import.meta.url).pathname) + '/'); jsQR = req('jsqr'); PNG = req('pngjs').PNG; } catch (e) { console.log('jsqr ausente: o QR não é lido, só o copia e cola é conferido'); }
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch();
let falhas = 0, total = 0;
const ok = (n, c, i = '') => { total++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
const espera = (p, ms = 300) => p.waitForTimeout(ms);
const CAMPO = 'input[placeholder^="digite o nome do produto"]';
const reais = (t) => Number(String(t).replace(/[^\d,]/g, '').replace(',', '.'));
// CRC16 CCITT-FALSE escrito de novo aqui, de propósito, para não conferir o código com ele mesmo
const crc = (s) => { let c = 0xFFFF; for (const ch of s) { c ^= ch.charCodeAt(0) << 8; for (let k = 0; k < 8; k++) c = (c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1) & 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, '0'); };
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
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
async function forma(p, nome) { await p.locator('#v-forma').click(); await espera(p); await p.locator('.auto-lista button, [role=listbox] button, [role=option]').filter({ hasText: nome }).first().click(); await espera(p); }
// clica no PDF e devolve o HTML da folha que iria para a impressão
async function folha(p, alvo) {
  await p.evaluate(() => document.querySelectorAll('iframe[aria-hidden="true"]').forEach((f) => f.remove()));
  await alvo.click(); await espera(p, 700);
  return p.evaluate(() => { const f = [...document.querySelectorAll('iframe[aria-hidden="true"]')].pop(); return f ? f.srcdoc : ''; });
}
async function confere(w, nome, h, valor, rotulo, b2, shot) {
  const cc = (h.match(/data-pix="([^"]+)"/) || [])[1] || '';
  const chaveTxt = (h.match(/<div class="chave">([^<]+)<\/div>/) || [])[1] || '';
  ok(`[${w}] ${nome}: chave CNPJ no lugar do copia e cola`, chaveTxt === '11.222.333/0001-81' && h.includes('Chave Pix (CNPJ)') && !/copia e cola/i.test(h), chaveTxt);
  const t = tlv(cc), conta = tlv(t['26'] || '');
  ok(`[${w}] ${nome}: bloco Pix com "${rotulo}"`, h.includes('Pague com Pix') && h.includes(rotulo));
  ok(`[${w}] ${nome}: valor ${valor.toFixed(2)} no BR Code`, t['54'] === valor.toFixed(2), `54=${t['54']}`);
  ok(`[${w}] ${nome}: CRC confere`, cc.length > 30 && crc(cc.slice(0, -4)) === cc.slice(-4), cc.slice(-8));
  ok(`[${w}] ${nome}: chave é o CNPJ só com números`, conta['00'] === 'br.gov.bcb.pix' && conta['01'] === '11222333000181', conta['01']);
  ok(`[${w}] ${nome}: recebedor, cidade e identificador`, t['59'] === 'LOJA TESTE IMPRESSAO 3D' && t['60'] === 'RIO DE JANEIRO' && /^(VENDA\d+|ORC\d+|\*\*\*)$/.test(tlv(t['62'])['05']), `${t['59']} · ${t['60']} · ${tlv(t['62'] || '')['05']}`);
  if (!jsQR) return;
  const pg = await b2.newPage({ viewport: { width: 900, height: 1300 } });
  await pg.setContent(h); await espera(pg, 500);
  const png = PNG.sync.read(await pg.locator('.pix .qr').screenshot());
  const lido = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  ok(`[${w}] ${nome}: QR impresso é lido e bate com o copia e cola`, !!lido && lido.data === cc, lido ? lido.data.slice(-12) : 'não leu');
  if (shot) await pg.screenshot({ path: `${OUT}/${shot}`, fullPage: true });
  await pg.close();
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // empresa: CNPJ e razão social; Chave PIX vazia
  await menu(p, 'Configurações');
  const secEmp = p.locator('button.secao-cab', { hasText: 'Empresa' }).first();
  if ((await secEmp.getAttribute('aria-expanded')) !== 'true') { await secEmp.click(); await espera(p); }
  ok(`[${w}] sem CNPJ e sem chave, o campo avisa que o PDF sai sem QR`, (await p.locator('#em-pix').locator('..').innerText()).includes('sai sem o QR'));
  await p.fill('#em-cnpj', '11.222.333/0001-81'); await p.fill('#em-razao', 'Loja Teste Impressão 3D Ltda'); await espera(p);
  ok(`[${w}] chave vazia usa o CNPJ`, (await p.locator('#em-pix').locator('..').innerText()).includes('11.222.333/0001-81'));

  // 0. orçamento: mesma folha, mesmo bloco do Pix, cobrando o sinal pedido
  await menu(p, 'Orçamentos');
  await p.getByRole('button', { name: 'Novo orçamento', exact: true }).first().click(); await espera(p, 500);
  await adiciona(p, 'Chaveiro');
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('10'); await espera(p);
  const to = reais(await p.locator('.grandao').first().innerText());
  await p.locator('button[aria-label="Pedir sinal"]').click(); await espera(p);
  const chk = p.locator('button[aria-label="Pedir sinal"]');
  await chk.click(); await espera(p); const desl = await chk.getAttribute('aria-pressed');
  await chk.click(); await espera(p);
  ok(`[${w}] caixa marcada desmarca com um clique (clique no ícone não volta a marcar)`, desl === 'false' && (await chk.getAttribute('aria-pressed')) === 'true', desl);
  let fo = await folha(p, p.getByRole('button', { name: /Exportar PDF/ }));
  ok(`[${w}] orçamento continua orçamento (validade, sem situação)`, fo.includes('>ORÇAMENTO<') && fo.includes('válido até') && !fo.includes('Situação'));
  await confere(w, 'orçamento com sinal', fo, Math.round(to * 50) / 100, 'Sinal para confirmar o pedido', b, w === 1440 ? 'pix-orcamento.png' : '');
  await p.locator('button[aria-label="Pedir sinal"]').click(); await espera(p);
  fo = await folha(p, p.getByRole('button', { name: /Exportar PDF/ }));
  await confere(w, 'orçamento sem sinal', fo, to, 'Total do pedido', b, '');
  await p.getByRole('button', { name: 'Cancelar' }).last().click(); await espera(p, 400);

  // 1. sinal de 50% em aberto, forma Pix
  await menu(p, 'Vendas');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500); await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().click(); await p.waitForTimeout(250);
  await adiciona(p, 'Chaveiro');
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('10'); await espera(p);
  await forma(p, 'PIX');
  const tv = reais(await p.locator('.grandao').first().innerText());
  await p.locator('button[aria-label="Pedir sinal"]').click(); await espera(p);
  let f = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
  ok(`[${w}] folha de pedido, não de orçamento`, f.includes('>PEDIDO<') && !f.includes('válido até'));
  ok(`[${w}] situação aguardando pagamento`, f.includes('Aguardando pagamento'));
  await confere(w, 'sinal em aberto', f, Math.round(tv * 50) / 100, 'Sinal para confirmar o pedido', b, w === 1440 ? 'pix-sinal.png' : '');

  // 2. salva, marca sinal pago: cobra o restante
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  await p.locator('tr.clicavel').first().locator('td').nth(1).click(); await espera(p, 500);
  await p.locator('button[aria-label="Sinal pago"]').click(); await espera(p);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  f = await folha(p, p.locator('tr.clicavel').first().getByRole('button', { name: 'PDF da venda' }));
  await confere(w, 'sinal pago', f, Math.round((tv - Math.round(tv * 50) / 100) * 100) / 100, 'Restante do pedido', b, w === 1440 ? 'pix-restante.png' : '');
  ok(`[${w}] sinal pago aparece no total`, /Sinal pago em \d\d\/\d\d\/\d{4}/.test(f));
  ok(`[${w}] sinal pago ainda não é recibo`, !f.includes('Recibo de pagamento') && f.includes('Condições'));

  // comprovante do sinal: anexa na venda, sai no PDF, fica gravado
  await p.locator('tr.clicavel').first().locator('td').nth(1).click(); await espera(p, 500);
  await p.locator('input[aria-label="Anexar comprovante"]').setInputFiles({ name: 'pix-sinal.png', mimeType: 'image/png', buffer: PNG1 }); await espera(p, 600);
  ok(`[${w}] comprovante aparece na venda`, (await p.locator('.comprovantes').innerText()).includes('pix-sinal.png'));
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
  await p.locator('tr.clicavel').first().locator('td').nth(1).click(); await espera(p, 500);
  ok(`[${w}] comprovante continua depois de salvar`, (await p.locator('.comprovantes').innerText()).includes('pix-sinal.png'));
  f = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
  ok(`[${w}] comprovante do sinal vai para página de anexo`, /<div class="folha pg-anexo">[\s\S]*<figure class="comp"><img src="data:image\/png/.test(f) && f.includes('Comprovante do sinal') && f.includes('Em anexo, na página seguinte'));
  { const pg = await b.newPage(); await pg.setContent(f); await espera(pg, 400);
    const paginas = ((await pg.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok(`[${w}] PDF com anexo tem 2 páginas, comprovante inteiro na segunda`, paginas === 2, `${paginas} páginas`); await pg.close(); }
  await p.getByRole('button', { name: 'Cancelar' }).last().click(); await espera(p, 400);

  // 3. sem sinal: cobra o total
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500); await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().click(); await p.waitForTimeout(250);
  await adiciona(p, 'Chaveiro'); await forma(p, 'PIX');
  const t3 = reais(await p.locator('.grandao').first().innerText());
  f = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
  await confere(w, 'sem sinal', f, t3, 'Total do pedido', b, '');

  // observação: venda nova não leva para o PDF; marcando, leva
  await p.fill('#v-ob', 'Retirar na loja depois das 14h'); await espera(p);
  f = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
  ok(`[${w}] observação da venda nova fica fora do PDF`, !f.includes('Retirar na loja') && (await p.locator('button[aria-label="Sair no PDF para o cliente"]').getAttribute('aria-pressed')) === 'false');
  await p.locator('button[aria-label="Sair no PDF para o cliente"]').click(); await espera(p);
  f = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
  ok(`[${w}] observação marcada sai no PDF`, f.includes('<h2>Observações</h2>') && f.includes('Retirar na loja depois das 14h'));

  // 4. forma que não é Pix: sem QR
  const outra = await p.$$eval('#v-forma', () => 1).catch(() => 0);
  await p.locator('#v-forma').click(); await espera(p);
  const opc = p.locator('.auto-lista button, [role=listbox] button, [role=option]').filter({ hasNotText: /pix|definir/i }).first();
  if (await opc.count()) { await opc.click(); await espera(p); f = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
    ok(`[${w}] forma que não é Pix sai sem QR`, !f.includes('Pague com Pix')); } else { await p.keyboard.press('Escape'); ok(`[${w}] forma que não é Pix (demonstração sem outra forma)`, true, 'pulado'); }

  // 5. pagamento já efetuado: sem QR, pagamento recebido
  await forma(p, 'PIX');
  await p.locator('button[aria-label="Pagamento já efetuado"]').click(); await espera(p);
  f = await folha(p, p.getByRole('button', { name: 'PDF da venda' }));
  ok(`[${w}] venda paga sai sem QR e com pagamento recebido`, !f.includes('Pague com Pix') && f.includes('recebido'));
  ok(`[${w}] venda paga: sem condições de pagamento, com recibo`, !f.includes('<h2>Condições</h2>') && f.includes('Recibo de pagamento') && f.includes('Pedido pago') && f.includes('PEDIDO PAGO'));
  ok(`[${w}] recibo com valor por extenso`, /a quantia de <b>R\$.{1,8}[\d.]+,\d\d<\/b> \([a-zçãéêíóôõú ,]+\)/.test(f), (f.match(/a quantia de[^.]+/) || [''])[0]);
  ok(`[${w}] recibo com data e forma`, /Pago em \d\d\/\d\d\/\d{4}, PIX\./.test(f), (f.match(/Pago em[^<]+/) || [''])[0]);

  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  if (w === 390) await p.screenshot({ path: `${OUT}/pix-venda-390.png`, fullPage: true });
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
