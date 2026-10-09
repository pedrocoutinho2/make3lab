// Teste de navegador do sistema, em modo demonstração (sem banco), em 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste.mjs [pasta dos prints]
// Precisa do Playwright: cd ferramentas && npm i --no-save playwright (os navegadores: npx playwright install chromium).
// Serve o index.html do repositório com o window.M3_CONFIG vazio, que liga a demonstração.
// O que depende do banco (tentativa inválida recusada, RLS, estorno no SQL) está em ferramentas/teste-024/casos.sql.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';

const OUT = process.argv[2] || '.';
const RAIZ = new URL('../../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', RAIZ), 'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(0);
const URL_ = `http://localhost:${srv.address().port}/`;

const res = [];
const ok = (nome, passou, info) => { res.push({ nome, passou }); console.log(`${passou ? 'PASSOU' : 'FALHOU'} ${nome}${info ? '  ' + info : ''}`); };
const espera = (p, ms = 250) => p.waitForTimeout(ms);

async function abrir(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  const p = await ctx.newPage(); p.erros = [];
  p.on('pageerror', (e) => p.erros.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p.erros.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  await p.goto(URL_); await espera(p, 600);
  await p.click('button[type=submit]'); await espera(p, 600);
  return p;
}
async function menu(p, nome) {
  const item = p.locator('nav[aria-label="Menu"] button', { hasText: new RegExp(`^\\s*${nome}\\s*$`) }).first();
  if (!(await item.isVisible())) { await p.locator('button[aria-label="Abrir menu"]').first().click(); await espera(p); }
  await item.click(); await espera(p, 400);
}
async function venda(p, produto, qtd) {
  await menu(p, 'Início');
  await p.getByRole('button', { name: 'Nova venda', exact: true }).first().click(); await espera(p, 500);
  await p.fill('input[placeholder^="digite o nome do produto"]', produto); await espera(p, 300);
  await p.locator('button', { hasText: produto }).first().click(); await espera(p, 400);
  const q = p.locator('.m3 input[aria-label="Quantidade"]').first();
  await q.fill(String(qtd)); await espera(p, 300);
  await p.getByRole('button', { name: /Salvar venda/ }).click(); await espera(p, 700);
}
const card = (p, texto) => p.locator('.kcard', { hasText: texto });
const coluna = (p, nome) => p.locator('.kcol', { has: p.locator('.kcab b', { hasText: nome }) });
async function avancar(p, texto, vezes = 1) {
  for (let i = 0; i < vezes; i++) { await card(p, texto).first().getByRole('button', { name: 'Mover para a próxima etapa' }).click(); await espera(p); }
}
// 1440: a página inteira. 390: uma tela por coluna, com a coluna rolada para a vista
async function foto(p, nome, w, cols) {
  if (w >= 1024) return p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true });
  for (const c of cols) {
    await coluna(p, c).evaluate((el) => { el.parentElement.scrollLeft = el.offsetLeft - 16; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); });
    await espera(p, 200);
    await p.screenshot({ path: `${OUT}/${nome}-${c.normalize('NFD').replace(/[^\w ]/g, '').replace(/ /g, '-').toLowerCase()}.png` });
  }
}
const qtdCol = (p, col, texto) => coluna(p, col).locator('.kcard', { hasText: texto }).locator('.kqtd').allInnerTexts();
async function linhasTent(p) {
  return p.$$eval('.tentativas tbody tr', (trs) => trs.map((tr) => ({ t: [...tr.querySelectorAll('td')].map((td) => td.innerText.trim()), est: tr.classList.contains('estornada') })));
}

const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const W = `${w}px`;
  const p = await abrir(b, w, h);

  // três vendas, uma ordem cada
  await venda(p, 'Chaveiro com logo do cliente', 25);
  await venda(p, 'Porta-aliança', 3);
  await venda(p, 'Plaquinha de identificação pet', 10);
  await menu(p, 'Fila de produção');
  ok(`${W} três ordens nascem na fila`, (await coluna(p, 'A imprimir').locator('.kcard').count()) === 3);

  // 1. pronto com todas boas
  await avancar(p, 'Porta-aliança', 3);
  const dlg1 = p.locator('.modal');
  const padrao = await dlg1.locator('#tp-boas').inputValue();
  ok(`${W} Pronto pergunta "Quantas saíram boas?" com o total como padrão`, (await dlg1.locator('label[for=tp-boas]').innerText()) === 'Quantas saíram boas?' && padrao === '3', `padrão ${padrao}`);
  await dlg1.getByRole('button', { name: 'Confirmar pronto' }).click(); await espera(p, 400);
  let t = await linhasTent(p);
  ok(`${W} pronto com todas boas: ordem em Pronto com 3 un., tentativa 3 = 3 + 0, nada volta`,
    (await qtdCol(p, 'Pronto', 'Porta-aliança')).join() === '3 un.' && t.length === 1 && t[0].t.slice(2, 5).join() === '3,3,0'
    && (await coluna(p, 'A imprimir').locator('.kcard', { hasText: 'Porta-aliança' }).count()) === 0, JSON.stringify(t[0]?.t));

  // 2. pronto parcial: 2 de 25 perdidas, volta uma ordem com 2
  await avancar(p, 'Chaveiro com logo do cliente', 2);
  const inicio = await p.evaluate(() => Date.now());
  await avancar(p, 'Chaveiro com logo do cliente', 1);
  const dlg2 = p.locator('.modal');
  await dlg2.locator('#tp-boas').fill('26'); await espera(p, 150);
  const erro = await dlg2.locator('[role=alert]').first().innerText().catch(() => '');
  const travado = await dlg2.getByRole('button', { name: 'Confirmar pronto' }).isDisabled();
  ok(`${W} 26 de 25 é recusado na tela com mensagem que diz o que fazer`, erro === 'Use um número inteiro de 0 a 25.' && travado, erro);
  await dlg2.locator('#tp-boas').fill('23'); await espera(p, 150);
  const conta = await dlg2.locator('.tent-conta').innerText();
  ok(`${W} diálogo mostra 23 boas, 2 perdidas, 2 voltam`, /23\s*boa/.test(conta) && /2\s*perdida/.test(conta) && /2 un\. voltam para a fila/.test(conta), conta.replace(/\s+/g, ' '));
  await p.screenshot({ path: `${OUT}/fila-${w}-pronto-parcial-dialogo.png` });
  await dlg2.getByRole('button', { name: 'Confirmar pronto' }).click(); await espera(p, 400);
  t = await linhasTent(p);
  const reimp = coluna(p, 'A imprimir').locator('.kcard', { hasText: 'Chaveiro com logo do cliente' });
  ok(`${W} pronto parcial: 23 un. em Pronto, ordem de reimpressão com 2 un. na fila, tentativa 25 = 23 + 2`,
    (await qtdCol(p, 'Pronto', 'Chaveiro')).join() === '23 un.' && (await reimp.count()) === 1 && (await reimp.locator('.kqtd').innerText()) === '2 un.'
    && (await reimp.locator('.pilula.reimp').count()) === 1 && t[0].t.slice(2, 5).join() === '25,23,2', JSON.stringify(t[0]?.t));
  await foto(p, `fila-${w}-pronto-parcial`, w, ['A imprimir', 'Pronto']);

  // arrastar de volta (seta para trás) não gera tentativa
  const antes = (await linhasTent(p)).length;
  await avancar(p, 'Plaquinha', 1);
  await coluna(p, 'Imprimindo').locator('.kcard', { hasText: 'Plaquinha' }).getByRole('button', { name: 'Mover para a etapa anterior' }).click(); await espera(p);
  ok(`${W} voltar para A imprimir sem registrar falha não gera tentativa`, (await linhasTent(p)).length === antes && (await coluna(p, 'A imprimir').locator('.kcard', { hasText: 'Plaquinha' }).count()) === 1);

  // 3. falha total: 10 de 10 perdidas, a ordem inteira volta
  await avancar(p, 'Plaquinha', 1);
  ok(`${W} sem botão de falha em A imprimir`, (await coluna(p, 'A imprimir').locator('.link.perda').count()) === 0);
  await card(p, 'Plaquinha').getByRole('button', { name: 'registrar falha' }).click(); await espera(p, 300);
  const dlg3 = p.locator('.modal');
  ok(`${W} falha pergunta quantas se perderam, padrão 10`, (await dlg3.locator('label[for=tp-perdidas]').innerText()) === 'Quantas peças se perderam?' && (await dlg3.locator('#tp-perdidas').inputValue()) === '10');
  await p.screenshot({ path: `${OUT}/fila-${w}-falha-dialogo.png` });
  await dlg3.getByRole('button', { name: 'Registrar falha' }).click(); await espera(p, 400);
  t = await linhasTent(p);
  const plaq = coluna(p, 'A imprimir').locator('.kcard', { hasText: 'Plaquinha' });
  ok(`${W} falha total: ordem volta inteira (10 un.) com 1 falha, tentativa 10 = 0 + 10`,
    (await plaq.count()) === 1 && (await plaq.locator('.kqtd').innerText()) === '10 un.' && /1 falha/.test(await plaq.innerText()) && t[0].t.slice(2, 5).join() === '10,0,10', JSON.stringify(t[0]?.t));

  // falha parcial em Pós-processo: 1 de 2 da reimpressão, volta 1
  await avancar(p, 'Chaveiro com logo do cliente', 2);
  await coluna(p, 'Pós-processo').locator('.kcard', { hasText: 'Chaveiro' }).getByRole('button', { name: 'registrar falha' }).click(); await espera(p, 300);
  await p.locator('#tp-perdidas').fill('1'); await espera(p, 150);
  await p.screenshot({ path: `${OUT}/fila-${w}-falha-parcial-dialogo.png` });
  await p.locator('.modal').getByRole('button', { name: 'Registrar falha' }).click(); await espera(p, 400);
  t = await linhasTent(p);
  ok(`${W} falha parcial: 1 un. segue em Pós-processo, 1 un. volta para a fila, tentativa 2 = 1 + 1`,
    (await qtdCol(p, 'Pós-processo', 'Chaveiro')).join() === '1 un.' && (await qtdCol(p, 'A imprimir', 'Chaveiro')).join() === '1 un.' && t[0].t.slice(2, 5).join() === '2,1,1', JSON.stringify(t[0]?.t));
  await foto(p, `fila-${w}-falha`, w, ['A imprimir', 'Pós-processo']);

  // defeito achado na conferência: as 23 já contadas como boas viram 22 + 1 perdida, com estorno da tentativa de antes
  await coluna(p, 'Pronto').locator('.kcard', { hasText: 'Chaveiro' }).getByRole('button', { name: 'registrar falha' }).click(); await espera(p, 300);
  const aviso = await p.locator('.modal .aviso.atencao').innerText().catch(() => '');
  await p.locator('#tp-perdidas').fill('1'); await espera(p, 150);
  await p.locator('.modal').getByRole('button', { name: 'Registrar falha' }).click(); await espera(p, 400);
  t = await linhasTent(p);
  const velha = t.find((x) => x.t[2] === '25' && x.t[3] === '23');
  ok(`${W} defeito em Pronto numa ordem já contada: estorna 25 = 23 + 2 e registra 25 = 22 + 3, 22 un. ficam, 1 volta`,
    /já estavam registradas como boas/.test(aviso) && t[0].t.slice(2, 5).join() === '25,22,3' && !!velha && velha.est
    && (await qtdCol(p, 'Pronto', 'Chaveiro')).join() === '22 un.' && (await qtdCol(p, 'A imprimir', 'Chaveiro')).sort().join() === '1 un.,1 un.', JSON.stringify(t.slice(0, 2).map((x) => x.t.slice(2, 5).join(' '))));

  // 4. estorno: a tentativa da Porta-aliança sai da conta, nada é apagado
  const n = (await linhasTent(p)).length;
  const alvo = p.locator('.tentativas tbody tr', { hasText: 'Porta-aliança' });
  await alvo.getByRole('button', { name: 'estornar' }).click(); await espera(p, 400);
  t = await linhasTent(p);
  ok(`${W} estorno: a tentativa fica no histórico marcada como estornada, sem ação de estornar de novo`,
    t.length === n && (await alvo.locator('.pilula', { hasText: 'estornada' }).count()) === 1 && (await alvo.getByRole('button', { name: 'estornar' }).count()) === 0 && (await alvo.evaluate((x) => x.classList.contains('estornada'))));
  ok(`${W} estorno não mexe na fila`, (await qtdCol(p, 'Pronto', 'Porta-aliança')).join() === '3 un.');

  // imposto e taxa de pagamento com duas casas
  await menu(p, 'Configurações');
  const sec = p.locator('button', { hasText: 'Regime tributário' }).first();
  await sec.click(); await espera(p, 300);
  await p.fill('#rg-a', '4,25'); await espera(p, 150);
  await p.locator('#rg-a').blur(); await espera(p, 150);
  const resumo = await sec.innerText();
  ok(`${W} imposto 4,25 aceita vírgula e o resumo mostra 4,25%`, (await p.inputValue('#rg-a')) === '4,25' && /imposto 4,25%/.test(resumo), resumo.replace(/\s+/g, ' '));
  await p.focus('#rg-a'); await p.keyboard.press('ArrowUp'); await espera(p, 150);
  const up = await p.inputValue('#rg-a');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await espera(p, 150);
  ok(`${W} setas andam de 0,01 (4,25 sobe para 4,26 e desce para 4,24)`, up === '4,26' && (await p.inputValue('#rg-a')) === '4,24', `${up} / ${await p.inputValue('#rg-a')}`);
  await p.fill('#rg-a', '6.725'); await p.locator('#rg-a').blur(); await espera(p, 150);
  ok(`${W} 6.725 arredonda para 6,73 ao sair do campo`, (await p.inputValue('#rg-a')) === '6,73', await p.inputValue('#rg-a'));
  await p.fill('#rg-a', '4x'); await espera(p, 150);
  const errImp = await p.locator('#rg-a-erro').innerText().catch(() => '');
  ok(`${W} letra recusada com mensagem que diz o que fazer`, errImp === 'Use só números, com vírgula antes dos centavos. Exemplo: 4,25.', errImp);
  await p.fill('#rg-a', '4,25'); await p.locator('#rg-a').blur();
  await p.locator('button', { hasText: 'Formas de pagamento' }).first().click(); await espera(p, 300);
  const taxa = p.locator('input[aria-label="Taxa"]').nth(2);
  await taxa.fill('3,99'); await taxa.blur(); await espera(p, 150);
  ok(`${W} taxa de pagamento aceita 3,99`, (await taxa.inputValue()) === '3,99', await taxa.inputValue());
  if (w < 1024) ok(`${W} campos com 16 px abaixo de 1024 px`, await p.$eval('#rg-a', (e) => getComputedStyle(e).fontSize === '16px'));

  ok(`${W} sem erro no console`, p.erros.length === 0, p.erros.slice(0, 3).join(' | '));
  await p.context().close();
}
await b.close(); srv.close();
const falhas = res.filter((r) => !r.passou).length;
console.log(`\n${res.length - falhas} de ${res.length} passaram`);
process.exit(falhas ? 1 : 0);
