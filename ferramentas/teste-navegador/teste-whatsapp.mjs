// WhatsApp no funil e na tela Conversas (SQL 038). Demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-whatsapp.mjs [pasta dos prints]
// Cobre: lead do WhatsApp aparece na primeira coluna do funil, com não lidas e selo de anúncio; clicar abre a
// conversa; a conversa mostra as mensagens e zera as não lidas; marcar lead perdido leva para Perdido com motivo;
// reabrir volta; arrastar o lead para frente abre o orçamento com o cliente preenchido; salvo o orçamento,
// o card do lead dá lugar ao do orçamento; no celular a lista e a conversa alternam sem passar da borda.
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
const coluna = (p, nome) => p.locator('.kcol').filter({ has: p.locator('.kcab b', { hasText: new RegExp(`^${nome}$`) }) });
const passaBorda = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);

  // 1. funil: dois leads na primeira coluna
  await menu(p, 'Funil de vendas');
  const contato = coluna(p, 'Contato');
  ok(`[${w}] leads do WhatsApp na primeira coluna`, (await contato.locator('.klead').count()) === 2);
  ok(`[${w}] lead mostra não lidas`, (await contato.locator('.klead .knaolidas', { hasText: '2' }).count()) === 1);
  ok(`[${w}] lead de anúncio leva o selo`, (await contato.getByText('WhatsApp · anúncio').count()) === 1);
  ok(`[${w}] KPI conta os leads sem orçamento`, await p.getByText('2 lead(s) sem orçamento').isVisible());
  if (w === 1440) await p.screenshot({ path: `${OUT}/wa-1-funil.png` });
  ok(`[${w}] funil não passa da borda`, !(await passaBorda(p)));

  // 2. clicar no lead abre a conversa
  await contato.locator('.klead', { hasText: 'Contato exemplo C' }).click(); await espera(p, 500);
  ok(`[${w}] abriu a conversa certa`, await p.locator('.conv-quem b', { hasText: 'Contato exemplo C' }).isVisible());
  ok(`[${w}] mensagens da conversa`, (await p.locator('.bolha').count()) === 4);
  ok(`[${w}] entrada à esquerda, saída à direita`, (await p.locator('.bolha.in').count()) === 3 && (await p.locator('.bolha.out').count()) === 1);
  ok(`[${w}] link de responder no WhatsApp`, (await p.getByRole('link', { name: /Responder no WhatsApp/ }).getAttribute('href')) === 'https://wa.me/5521900000001');
  if (w === 1440) await p.screenshot({ path: `${OUT}/wa-2-conversa.png` });
  ok(`[${w}] conversa não passa da borda`, !(await passaBorda(p)));
  if (w < 500) {
    ok(`[${w}] no celular a lista some com a conversa aberta`, !(await p.locator('.conv-lista').isVisible()));
    await p.screenshot({ path: `${OUT}/wa-2-conversa-390.png` });
    await p.getByRole('button', { name: 'Voltar para a lista' }).click(); await espera(p, 300);
    ok(`[${w}] voltar mostra a lista`, await p.locator('.conv-lista').isVisible());
    ok(`[${w}] não lidas zeradas na lista`, (await p.locator('.conv-item', { hasText: 'Contato exemplo C' }).locator('.knaolidas').count()) === 0);
    await p.locator('.conv-item', { hasText: 'Contato exemplo C' }).click(); await espera(p, 300);
  } else {
    ok(`[${w}] não lidas zeradas na lista`, (await p.locator('.conv-item.on .knaolidas').count()) === 0);
  }

  // 3. lead perdido pela conversa, com motivo
  await p.getByRole('button', { name: 'Lead perdido' }).click(); await espera(p, 300);
  await p.selectOption('#pl-m', 'Preço'); await p.fill('#pl-d', 'achou caro');
  await p.getByRole('button', { name: 'Marcar como perdido' }).click(); await espera(p, 400);
  ok(`[${w}] conversa mostra lead perdido`, await p.getByText('lead perdido').first().isVisible());
  await menu(p, 'Funil de vendas');
  ok(`[${w}] lead foi para Perdido com o motivo`, (await coluna(p, 'Perdido').locator('.klead', { hasText: 'Preço: achou caro' }).count()) === 1);
  // reabrir pela conversa: volta para a primeira coluna
  await menu(p, 'Conversas'); await p.locator('.conv-item', { hasText: 'Contato exemplo C' }).click(); await espera(p, 300);
  await p.getByRole('button', { name: 'Reabrir lead' }).click(); await espera(p, 300);
  await menu(p, 'Funil de vendas');
  ok(`[${w}] lead reaberto volta para a primeira coluna`, (await coluna(p, 'Contato').locator('.klead', { hasText: 'Contato exemplo C' }).count()) === 1);

  // 4. empurrar o lead do cliente cadastrado abre o orçamento com ele
  await coluna(p, 'Contato').locator('.kcard', { hasText: 'Cliente exemplo A' }).getByRole('button', { name: 'Mover para a próxima etapa' }).click(); await espera(p, 600);
  ok(`[${w}] abriu orçamento com o cliente`, (await p.locator('#o-cli').inputValue()) === 'Cliente exemplo A');
  await p.fill('input[placeholder^="digite o nome do produto"]', 'Chaveiro'); await espera(p);
  await p.locator('.add-item button', { hasText: 'Chaveiro' }).first().click(); await espera(p, 400);
  await p.getByRole('button', { name: 'Salvar', exact: true }).first().click(); await espera(p, 700);
  await menu(p, 'Funil de vendas');
  ok(`[${w}] card do lead deu lugar ao do orçamento`, (await p.locator('.klead', { hasText: 'Cliente exemplo A' }).count()) === 0
    && (await p.locator('.kcard', { hasText: 'Cliente exemplo A' }).count()) === 1);

  ok(`[${w}] sem erro de página`, erros.length === 0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${total - falhas}/${total} passaram`);
process.exit(falhas ? 1 : 0);
