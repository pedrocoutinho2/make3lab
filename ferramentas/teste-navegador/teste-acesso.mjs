// Cadastro fechado (SQL 035): tela de entrada com o banco simulado.
// Sem link: não há "Criar conta". Com ?acesso=CODIGO válido: cria conta com o e-mail travado.
// Cadastro recusado pelo banco vira mensagem de acesso por convite. Uso: node ferramentas/teste-navegador/teste-acesso.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const COD = 'a'.repeat(48);
let n = 0, falhas = 0; const ok = (t, c, x = '') => { n++; if (!c) falhas++; console.log(`${c ? 'PASSOU' : 'FALHOU'} ${t} ${c ? '' : x}`); };
const b = await chromium.launch();
async function abrir(w, busca, signup) {
  const p = await b.newPage({ viewport: { width: w, height: 860 } }); const erros = []; const chamadas = [];
  p.on('pageerror', (e) => erros.push(e.message)); p.erros = erros; p.chamadas = chamadas;
  await p.route('https://fonts.**', (r) => r.fulfill({ body: '' }));
  await p.route('https://lvnavmtyselveozllcuy.supabase.co/**', async (r) => {
    const u = r.request().url(); chamadas.push(u);
    if (u.includes('/rpc/fn_liberacao_info')) return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(r.request().postDataJSON().p_codigo === COD ? { valido: true, email: 'ana@exemplo.com', nome: 'Ana Exemplo', conta_existe: false } : { valido: false, motivo: 'usado' }) });
    if (u.includes('/auth/v1/signup')) return r.fulfill(signup);
    r.fulfill({ status: 200, contentType: 'application/json', body: u.includes('/rest/v1/') ? '[]' : '{}' });
  });
  await p.route('http://app.teste/**', (r) => r.fulfill({ body: html, contentType: 'text/html' }));
  await p.goto('http://app.teste/' + busca); await p.waitForTimeout(900);
  return p;
}
for (const w of [1280, 390]) {
  // 1. sem link
  let p = await abrir(w, '', null);
  let t = await p.locator('.acesso').innerText();
  ok(`[${w}] sem link não mostra Criar conta`, !(await p.getByRole('button', { name: 'Criar conta' }).count()) && /acesso por convite/.test(t), t.slice(0, 120));
  ok(`[${w}] aponta para a lista Founders`, (await p.locator('a[href="https://make3lab.com.br/founders/"]').count()) === 1);
  ok(`[${w}] sem erro`, !p.erros.length, p.erros.join(' | ')); await p.close();
  // 2. link válido
  p = await abrir(w, '?acesso=' + COD, { status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u1', email: 'ana@exemplo.com', aud: 'authenticated', role: 'authenticated', identities: [{}] }) });
  ok(`[${w}] link válido abre o cadastro`, (await p.locator('.acesso h1').innerText()) === 'Seu acesso ao Make3Lab');
  ok(`[${w}] e-mail travado e nome preenchido`, (await p.locator('#en-mail').inputValue()) === 'ana@exemplo.com' && (await p.locator('#en-mail').getAttribute('readonly')) !== null && (await p.locator('#en-nome').inputValue()) === 'Ana Exemplo');
  await p.locator('#en-emp').fill('Ateliê da Ana'); await p.locator('#en-senha').fill('senha-forte-123');
  await p.locator('button[aria-label^="Aceito"]').click(); await p.locator('button[type=submit]').click(); await p.waitForTimeout(600);
  ok(`[${w}] cadastro enviado pede confirmação do e-mail`, /Enviamos um link de confirmação/.test(await p.locator('.acesso').innerText()));
  if (w === 390) await p.screenshot({ path: 'acesso-390.png', fullPage: true });
  ok(`[${w}] sem erro`, !p.erros.length, p.erros.join(' | ')); await p.close();
  // 3. banco recusa
  p = await abrir(w, '?acesso=' + COD, { status: 500, contentType: 'application/json', body: JSON.stringify({ code: 500, error_code: 'unexpected_failure', msg: 'Database error saving new user' }) });
  await p.locator('#en-emp').fill('Loja'); await p.locator('#en-senha').fill('senha-forte-123');
  await p.locator('button[aria-label^="Aceito"]').click(); await p.locator('button[type=submit]').click(); await p.waitForTimeout(600);
  ok(`[${w}] recusa do banco vira acesso por convite`, /não tem acesso liberado/.test(await p.locator('.acesso').innerText()));
  await p.close();
  // 4. link usado
  p = await abrir(w, '?acesso=' + 'b'.repeat(48), null);
  ok(`[${w}] link usado avisa e fica no Entrar`, /já foi usado/.test(await p.locator('.acesso').innerText()) && (await p.locator('.acesso h1').innerText()) === 'Entrar');
  await p.close();
}
await b.close();
console.log(`\n${n - falhas} de ${n} passaram`);
process.exit(falhas ? 1 : 0);
