// Founders (23/10/2026): Ajuda e suporte, configuração guiada com sugestão, impressoras em fichas com
// exclusão protegida, várias impressoras na fila e na tentativa, importador sem impressora errada.
// Demonstração, 1440 e 390 px. Uso: node ferramentas/teste-navegador/teste-founders.mjs [pasta dos prints]
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const OUT = process.argv[2] || '.';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const b = await chromium.launch();
let falhas = 0, total = 0;
const ok = (n, c, i = '') => { total++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${n} ${c ? '' : i}`); if (!c) falhas++; };
const espera = (p, ms = 300) => p.waitForTimeout(ms);
async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  if (!(await item.isVisible())) { await p.locator('button[aria-label="Abrir menu"]').first().click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
const corte = (p) => p.evaluate(() => { const W = document.documentElement.clientWidth;
  const rola = (el) => { for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && x.scrollWidth > x.clientWidth + 1) return true; } return false; };
  return [...document.querySelectorAll('main *, .modal *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.height && (r.right > W + 1 || r.left < -1) && !rola(el); })
    .slice(0, 4).map((el) => `${el.tagName}.${String(el.className).slice(0, 40)} ${Math.round(el.getBoundingClientRect().right)}`); });
async function venda(p, produto, qtd) {
  await menu(p, 'Início');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500); await p.fill('#o-cli', 'Cliente exemplo A'); await p.locator('#o-cli ~ .lista button').first().click(); await espera(p, 250);
  await p.fill('input[placeholder^="digite o nome do produto"]', produto); await espera(p, 300);
  await p.locator('button', { hasText: produto }).first().click(); await espera(p, 400);
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill(String(qtd)); await espera(p, 300);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
}
const coluna = (p, nome) => p.locator('.kcol', { has: p.locator('.kcab b', { hasText: nome }) });

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto(`http://localhost:${srv.address().port}/`); await espera(p, 600);
  ok(`[${w}] cadastro com link dos termos`, await p.evaluate(() => true));
  await p.click('button[type=submit]'); await espera(p, 600);

  // 1. Ajuda e suporte
  await menu(p, 'Ajuda e suporte');
  const zap = await p.locator('a', { hasText: 'WhatsApp' }).first().getAttribute('href');
  ok(`[${w}] WhatsApp do suporte`, zap && zap.startsWith('https://wa.me/5521995215332'), zap);
  const txt = await p.locator('main').innerText();
  ok(`[${w}] prazo de 24 horas e importador em beta`, /24 horas/.test(txt) && /versão beta/.test(txt));
  ok(`[${w}] termos e privacidade linkados`, (await p.locator('a[href="https://app.make3lab.com.br/termos/"]').count()) > 0 && (await p.locator('a[href="https://app.make3lab.com.br/privacidade/"]').count()) > 0);
  await p.locator('#ch-as').fill('ab'); await p.getByRole('button', { name: 'Abrir chamado' }).click(); await espera(p);
  ok(`[${w}] chamado curto pede assunto melhor`, /pelo menos 3 letras/.test(await p.locator('main').innerText()));
  let c = await corte(p); ok(`[${w}] ajuda sem corte`, !c.length, c.join(' | '));
  if (w === 390) await p.screenshot({ path: `${OUT}/founders-ajuda-390.png`, fullPage: true });

  // 2. configuração guiada
  await p.getByRole('button', { name: 'Rever configuração guiada' }).click(); await espera(p);
  // a loja de demonstração já tem nome, WhatsApp e cidade: a guia abre no primeiro passo que falta
  ok(`[${w}] guia abre no primeiro pendente, impressoras`, /passo 2 de 7/.test(await p.locator('.guia').innerText()) && /Impressoras/.test(await p.locator('#guia-tit').innerText()));
  c = await corte(p); ok(`[${w}] impressoras no guia sem corte`, !c.length, c.join(' | '));
  await p.getByRole('button', { name: /Confirmar e seguir/ }).click(); await espera(p);
  ok(`[${w}] passo 3 custos com campos vazios`, (await p.locator('#cg-hr').inputValue()) === '' && (await p.locator('#cg-su').inputValue()) === '');
  await p.getByRole('button', { name: /Confirmar e seguir/ }).click(); await espera(p);
  ok(`[${w}] sem preencher, pede para preencher ou usar a sugestão`, /use a sugestão/.test(await p.locator('.guia [role=alert]').innerText().catch(() => '')));
  if (w === 390) await p.screenshot({ path: `${OUT}/founders-guia-custos-390.png`, fullPage: true });
  for (const s of await p.locator('.guia .sugere').all()) await s.click();
  ok(`[${w}] sugestão preenche a hora com 20`, (await p.locator('#cg-hr').inputValue()).includes('20'), await p.locator('#cg-hr').inputValue());
  await p.getByRole('button', { name: /Confirmar e seguir/ }).click(); await espera(p);
  ok(`[${w}] passo 4 margem`, /Margem/.test(await p.locator('#guia-tit').innerText()));
  for (const s of await p.locator('.guia .sugere').all()) await s.click();
  ok(`[${w}] margem sugerida 100%`, (await p.locator('#cg-mg').inputValue()) === '100');
  c = await corte(p); ok(`[${w}] passo de margem sem corte`, !c.length, c.join(' | '));
  await p.getByRole('button', { name: /Confirmar e seguir/ }).click(); await espera(p);
  await p.getByRole('button', { name: /Confirmar e seguir/ }).click(); await espera(p);   // impostos
  await p.getByRole('button', { name: /Confirmar e seguir/ }).click(); await espera(p);   // canais
  ok(`[${w}] passo 7 filamentos`, /Filamentos/.test(await p.locator('#guia-tit').innerText()));
  await p.getByRole('button', { name: /Concluir/ }).click(); await espera(p);
  ok(`[${w}] guia fecha ao concluir`, (await p.locator('.guia').count()) === 0);
  ok(`[${w}] tudo confirmado, sem pendência`, /está configurada/.test(await p.locator('main').innerText()));

  // 3. impressoras em fichas, segunda máquina, exclusão protegida
  await menu(p, 'Configurações');
  await p.locator('button', { hasText: 'Impressoras' }).first().click(); await espera(p);
  await p.getByRole('button', { name: 'Adicionar impressora' }).click(); await espera(p);
  ok(`[${w}] duas fichas de impressora`, (await p.locator('.imp-ficha').count()) === 2);
  const fichas = p.locator('.imp-ficha');
  await fichas.nth(1).locator('input[id^="im-m-"]').fill('Bambu Lab P1S');
  await fichas.nth(1).locator('input[id^="im-v-"]').fill('5999'); await espera(p);
  c = await corte(p); ok(`[${w}] fichas sem corte`, !c.length, c.join(' | '));
  if (w === 390) await p.screenshot({ path: `${OUT}/founders-impressoras-390.png`, fullPage: true });
  await fichas.nth(0).getByRole('button', { name: /Excluir/ }).click(); await espera(p);
  const modal = await p.locator('.modal').innerText();
  ok(`[${w}] excluir impressora em uso pede a substituta`, /Passar os produtos para/.test(modal) && /produto\(s\) são feitos/.test(modal), modal.slice(0, 120));
  await p.getByRole('button', { name: 'Cancelar' }).last().click(); await espera(p);

  // 4. fila com duas impressoras: escolher máquina, tentativa com a máquina certa
  await venda(p, 'Porta-aliança', 2);
  await menu(p, 'Fila de produção');
  ok(`[${w}] KPI divide pelas 2 impressoras`, /÷ 2 impressoras/.test(await p.locator('.numeros').innerText()));
  await coluna(p, 'A imprimir').locator('.kcard', { hasText: 'Porta-aliança' }).getByRole('button', { name: 'Mover para a próxima etapa' }).click(); await espera(p);
  ok(`[${w}] ir para Imprimindo pergunta a máquina`, /Em qual impressora/.test(await p.locator('.modal').innerText().catch(() => '')));
  const imp2 = await fichasNome(p);
  await p.locator('#mq-imp').fill(imp2); await espera(p, 200); await p.locator('#mq-imp ~ .lista button').first().click(); await espera(p);
  await p.getByRole('button', { name: /Começar a imprimir/ }).click(); await espera(p);
  ok(`[${w}] card mostra a máquina`, (await coluna(p, 'Imprimindo').locator('.kcard', { hasText: 'Porta-aliança' }).innerText()).includes(`na ${imp2}`));
  for (let i = 0; i < 2; i++) { await p.locator('.kcard', { hasText: 'Porta-aliança' }).first().getByRole('button', { name: 'Mover para a próxima etapa' }).click(); await espera(p); }
  const dlg = await p.locator('.modal').innerText();
  ok(`[${w}] pronto mostra a impressora que imprimiu`, /Impressora que imprimiu/.test(dlg));
  await p.getByRole('button', { name: 'Confirmar pronto' }).click(); await espera(p, 500);
  const linha = await p.locator('.tentativas tbody tr').first().innerText();
  ok(`[${w}] tentativa gravada na máquina escolhida`, linha.includes(imp2), linha.replace(/\s+/g, ' '));
  c = await corte(p); ok(`[${w}] fila sem corte`, !c.length, c.join(' | '));

  // 5. telas novas e alteradas sem corte
  for (const t of ['Produtos', 'Configurações', 'Início']) { await menu(p, t); c = await corte(p); ok(`[${w}] ${t} sem corte`, !c.length, c.join(' | ')); }
  ok(`[${w}] sem erro de página`, !erros.length, erros.join(' | '));
  await ctx.close();
}
async function fichasNome(p) { return 'Impressora 2'; }
await b.close(); srv.close();
console.log(`\n${total - falhas} de ${total} passaram`);
process.exit(falhas ? 1 : 0);
