// Campo de dinheiro (InMoeda) no cadastro de venda, demonstração, 1440 e 390 px.
// Uso: node ferramentas/teste-navegador/teste-dinheiro.mjs
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url),'utf8').replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, 'window.M3_CONFIG = {};');
const srv = http.createServer((q, r) => { r.writeHead(200, {'content-type':'text/html; charset=utf-8'}); r.end(html); }).listen(0);
const b = await chromium.launch();
let falhas = 0; const ok = (n, c, i='') => { console.log(`${c?'PASSOU':'FALHOU'} ${n} ${i}`); if (!c) falhas++; };
for (const [w,h] of [[1440,900],[390,844]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, isMobile:w<500, hasTouch:w<500 });
  const p = await ctx.newPage(); const erros=[]; p.on('pageerror',e=>erros.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForTimeout(600);
  await p.click('button[type=submit]'); await p.waitForTimeout(600);
  await p.getByRole('button',{name:'Nova venda',exact:true}).first().click(); await p.waitForTimeout(500);
  await p.fill('input[placeholder^="digite o nome do produto"]','Chaveiro'); await p.waitForTimeout(300);
  await p.locator('button',{hasText:'Chaveiro'}).first().click(); await p.waitForTimeout(400);
  const v = p.locator('.m3 input[aria-label="Valor unitário"]').first();
  const ini = await v.inputValue(); ok(`[${w}] valor inicial formatado`, /^\d{1,3}(\.\d{3})*,\d{2}$/.test(ini), ini);
  await v.click(); for (let k=0;k<16;k++) await v.press('Backspace');
  ok(`[${w}] apagar tudo vira 0,00`, (await v.inputValue())==='0,00', JSON.stringify(await v.inputValue()));
  await v.pressSequentially('4990'); const t = await v.inputValue(); ok(`[${w}] 4990 vira 49,90`, t==='49,90', t);
  await v.press('Backspace'); ok(`[${w}] backspace vira 4,99`, (await v.inputValue())==='4,99', await v.inputValue());
  await v.pressSequentially('0'); await v.pressSequentially('a.,'); ok(`[${w}] letra e ponto ignorados`, (await v.inputValue())==='49,90', await v.inputValue());
  await p.locator('.m3 input[aria-label="Quantidade"]').first().fill('3'); await p.waitForTimeout(200);
  const linha = await v.locator('xpath=ancestor::tr[1]').innerText(); ok(`[${w}] total da linha 149,70`, linha.includes('149,70'), linha.replace(/\s+/g,' ').slice(0,160));
  await v.click(); for (let k=0;k<16;k++) await v.press('Backspace'); await v.pressSequentially('123456789');
  ok(`[${w}] milhar com ponto`, (await v.inputValue())==='1.234.567,89', await v.inputValue());
  const fs2 = await v.evaluate(e=>getComputedStyle(e).fontSize+'|'+getComputedStyle(e).textAlign+'|'+getComputedStyle(e).fontFamily);
  ok(`[${w}] fonte/alinhamento`, fs2.includes('right') && (w<1024 ? fs2.startsWith('16px') : true), fs2);
  await v.click(); for (let k=0;k<16;k++) await v.press('Backspace'); await v.pressSequentially('4990');
  
  ok(`[${w}] sem erro de página`, erros.length===0, erros.join(' | '));
  await ctx.close();
}
await b.close(); srv.close(); process.exit(falhas?1:0);
