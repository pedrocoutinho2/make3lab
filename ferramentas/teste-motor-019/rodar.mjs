import fs from 'fs'; import { precificar } from '../motor-019.js';
// Roda os casos no espelho JS e grava js.json. Compare com fn_precificar no Supabase
// (mesmos casos, com params/impressora/canal do casos.json) e com o precificar.py da skill.
// Resultado de 05/10/2026: SQL x JS 0 divergencias; skill x SQL 42 comparacoes, unica
// diferenca abaixo de R$ 8 na Shopee (taxa fixa = metade do preco, so a skill modela).
const C = JSON.parse(fs.readFileSync(new URL('./casos.json', import.meta.url)));
const out = C.casos.map(c => { const r = precificar(c.e, C.params, C.impressora, C[c.canal]);
  return { nome: c.nome, custo: r.custo, preco: r.preco, lucro: r.lucro, refugo: r.refugo, mao: r.mao_obra, emb: r.embalagem, manual: r.manual ? r.manual.lucro : null, sem: r.sem_mao_obra.preco, com: r.com_mao_obra.preco }; });
fs.writeFileSync(new URL('./js.json', import.meta.url), JSON.stringify(out, null, 1)); console.table(out);
