// Confere que o save de dados faz merge com o banco. Uso: node ferramentas/teste-motor-019/mesclar.mjs
// Roda a função mesclarDados do arquivo único contra um Supabase simulado.
import fs from 'fs';
const src = fs.readFileSync(new URL('../../src/make3lab-sistema.jsx', import.meta.url), 'utf8');
const corpo = src.slice(src.indexOf('async function mesclarDados'), src.indexOf('\n}\n', src.indexOf('async function mesclarDados')) + 2);
const banco = [
  { id: 'v1', dados: { itens: [], embalagem: { valor: 2.5, origem: 'padrao' }, personalizacao: { x: 1 } } },
  { id: 'o1', dados: { qtd: 1, aguarda_arte: true, linha: 'k1' } },
  { id: 'cl1', dados: { whatsapp: '21', identidade: { logos: ['org/clientes/cl1/logo.svg'], cores: ['f1', 'f2'], observacao: 'Pantone 300' } } },
];
const sb = { from: () => ({ select: () => ({ eq: () => ({ in: async (_c, ids) => ({ data: banco.filter((r) => ids.includes(r.id)), error: null }) }) }) }) };
const mesclarDados = new Function('sb', `${corpo}; return mesclarDados;`)(sb);
const saida = await mesclarDados('vendas', 'org', [
  { id: 'v1', dados: { itens: [{ key: 'k1' }], obs: 'nova' } },
  { id: 'o1', dados: { qtd: 1, etapa_nota: 'x', aguarda_arte: false } },
  { id: 'novo', dados: { a: 1 } },
]);
// cliente regravado pela tela sem tocar na marca (ex.: só mudou o WhatsApp): a identidade fica
const [cli] = await mesclarDados('clientes', 'org', [{ id: 'cl1', dados: { whatsapp: '21 99999' } }]);
// cliente com a marca editada na tela: a versão da tela vence inteira
const [cli2] = await mesclarDados('clientes', 'org', [{ id: 'cl1', dados: { identidade: { logos: [], cores: ['f3'], observacao: '' } } }]);
const ok = saida[0].dados.embalagem?.valor === 2.5 && saida[0].dados.personalizacao?.x === 1 && saida[0].dados.obs === 'nova' && saida[0].dados.itens.length === 1
  && saida[1].dados.linha === 'k1' && saida[1].dados.aguarda_arte === false && JSON.stringify(saida[2].dados) === '{"a":1}'
  && cli.dados.whatsapp === '21 99999' && cli.dados.identidade?.logos[0] === 'org/clientes/cl1/logo.svg' && cli.dados.identidade.cores.join() === 'f1,f2'
  && cli2.dados.identidade.cores.join() === 'f3' && cli2.dados.identidade.logos.length === 0 && cli2.dados.whatsapp === '21';
console.log(ok ? 'ok: merge preserva embalagem, personalizacao, linha e clientes.dados.identidade; a tela vence nas chaves que manda' : 'FALHOU ' + JSON.stringify({ saida, cli, cli2 }));
process.exit(ok ? 0 : 1);
