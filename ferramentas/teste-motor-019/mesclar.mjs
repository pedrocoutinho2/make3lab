// Confere que o save de dados faz merge com o banco. Uso: node ferramentas/teste-motor-019/mesclar.mjs
// Roda a função mesclarDados do arquivo único contra um Supabase simulado.
import fs from 'fs';
const src = fs.readFileSync(new URL('../../src/make3lab-sistema.jsx', import.meta.url), 'utf8');
const corpo = src.slice(src.indexOf('async function mesclarDados'), src.indexOf('\n}\n', src.indexOf('async function mesclarDados')) + 2);
const banco = [
  { id: 'v1', dados: { itens: [], embalagem: { valor: 2.5, origem: 'padrao' }, personalizacao: { x: 1 } } },
  { id: 'o1', dados: { qtd: 1, aguarda_arte: true, linha: 'k1' } },
];
const sb = { from: () => ({ select: () => ({ eq: () => ({ in: async (_c, ids) => ({ data: banco.filter((r) => ids.includes(r.id)), error: null }) }) }) }) };
const mesclarDados = new Function('sb', `${corpo}; return mesclarDados;`)(sb);
const saida = await mesclarDados('vendas', 'org', [
  { id: 'v1', dados: { itens: [{ key: 'k1' }], obs: 'nova' } },
  { id: 'o1', dados: { qtd: 1, etapa_nota: 'x', aguarda_arte: false } },
  { id: 'novo', dados: { a: 1 } },
]);
const ok = saida[0].dados.embalagem?.valor === 2.5 && saida[0].dados.personalizacao?.x === 1 && saida[0].dados.obs === 'nova' && saida[0].dados.itens.length === 1
  && saida[1].dados.linha === 'k1' && saida[1].dados.aguarda_arte === false && JSON.stringify(saida[2].dados) === '{"a":1}';
console.log(ok ? 'ok: merge preserva embalagem, personalizacao e linha; a tela vence nas chaves que manda' : 'FALHOU ' + JSON.stringify(saida));
process.exit(ok ? 0 : 1);
