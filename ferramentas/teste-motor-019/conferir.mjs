// Confere o motor 019 do arquivo único. Uso: node ferramentas/teste-motor-019/conferir.mjs
// 1. o trecho colado em src/make3lab-sistema.jsx é igual a ferramentas/motor-019.js (sem os export)
// 2. o trecho colado roda os casos de casos.json e bate centavo a centavo com o retorno de
//    public.fn_precificar gravado em sql-05-10-2026.json (Supabase, 05/10/2026)
import fs from 'fs';
const aqui = (p) => new URL(p, import.meta.url);
const src = fs.readFileSync(aqui('../../src/make3lab-sistema.jsx'), 'utf8');
const colado = src.split('// >>> motor-019.js\n')[1].split('\n// <<< motor-019.js')[0];
const arq = fs.readFileSync(aqui('../motor-019.js'), 'utf8');
const ref = ('const n = (v' + arq.split('const n = (v')[1]).replace(/export (const|function) /g, '$1 ').trimEnd();
let falhas = 0;
if (colado !== ref) { console.log('FALHOU: o motor colado no jsx difere de motor-019.js'); falhas++; }
const M = new Function(`${colado}\nreturn { precificar };`)();
const C = JSON.parse(fs.readFileSync(aqui('./casos.json')));
const S = JSON.parse(fs.readFileSync(aqui('./sql-05-10-2026.json')));
for (const c of C.casos) {
  const r = M.precificar(c.e, C.params, C.impressora, C[c.canal]);
  const js = { custo: r.custo, preco: r.preco, lucro: r.lucro, refugo: r.refugo, mao: r.mao_obra, emb: r.embalagem,
    manual: r.manual ? r.manual.lucro : null, sem: r.sem_mao_obra.preco, com: r.com_mao_obra.preco };
  const sql = S.find((x) => x.nome === c.nome);
  for (const k of Object.keys(js)) {
    if (Math.abs((js[k] ?? 0) - (sql[k] ?? 0)) > 0.005 || (js[k] == null) !== (sql[k] == null)) { console.log(`FALHOU ${c.nome} ${k}: js ${js[k]} sql ${sql[k]}`); falhas++; }
  }
}
console.log(falhas ? `${falhas} falha(s)` : `ok: motor colado igual ao arquivo e ${C.casos.length} casos x 9 campos iguais ao SQL`);
process.exit(falhas ? 1 : 0);
