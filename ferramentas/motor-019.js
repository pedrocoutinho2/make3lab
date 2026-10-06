// motor-019.js, Make3Lab, 05/10/2026
// Espelho de public.fn_precificar (sql/019_motor_preco.sql) para calculo ao vivo na tela.
// O banco e a fonte da verdade: documento salvo usa o retorno do RPC fn_precificar.
// Este arquivo tem que bater com o SQL e com o precificar.py da skill nos casos de
// teste-motor-019. Mudou um, muda os tres.

const n = (v, d = 0) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

export const PARAMS_PADRAO = {
  valor_hora_operador: 25, taxa_refugo: 0.08, tarifa_kwh: 0.881, margem_padrao: 1.8,
  imposto_pct: 0, embalagem_padrao: 0, considerar_mao_obra: true, arredondar_90: true, piso_lucro_hora: 15,
};

export function taxaCanal(canal, preco) {
  const fx = ((canal && canal.dados && canal.dados.faixas) || [])
    .map((f) => ({ ate: f.ate === '' || f.ate == null ? 1e12 : n(f.ate), pct: n(f.taxa_pct), fixa: n(f.taxa_fixa) }))
    .sort((a, b) => a.ate - b.ate);
  const f = fx.find((x) => preco <= x.ate) || fx[fx.length - 1];
  if (f) return { pct: f.pct, fixa: f.fixa };
  return { pct: n(canal && canal.taxa_pct), fixa: n(canal && canal.taxa_fixa) };
}

function leitura(preco, custo, horas, imp, pagPct, pagFix, canal, p) {
  const t = taxaCanal(canal, preco);
  const taxa = preco * t.pct + t.fixa;
  const liq = preco - taxa - preco * imp - (preco * pagPct + pagFix);
  const lucro = liq - custo;
  const lh = horas > 0 ? lucro / horas : null;
  return {
    preco: r2(preco), custo: r2(custo), taxa_canal: r2(taxa), taxa_canal_pct: t.pct, taxa_canal_fixa: t.fixa,
    imposto: r2(preco * imp), taxa_pagamento: r2(preco * pagPct + pagFix), liquido: r2(liq), lucro: r2(lucro),
    margem_pct: preco > 0 ? Math.round((lucro / preco) * 1000) / 10 : null,
    lucro_hora: lh == null ? null : r2(lh), abaixo_do_piso: lh != null && lh < n(p.piso_lucro_hora),
  };
}

function cenario(e, p, imp, canal, comMo) {
  const pecas = Math.max(n(e.pecas, 1), 1);
  const horas = n(e.horas);
  const hora = n(p.valor_hora_operador);
  const vImp = (e.com_nota === undefined || e.com_nota === null ? true : !!e.com_nota) ? n(p.imposto_pct) : 0;
  const pagPct = n(e.taxa_pagamento_pct), pagFix = n(e.taxa_pagamento_fixa);
  const margem = e.margem === '' || e.margem == null ? n(p.margem_padrao) : n(e.margem);
  const arred = e.arredondar_90 == null ? p.arredondar_90 !== false : !!e.arredondar_90;

  let material = 0;
  for (const f of e.filamentos || []) {
    let g = n(f.gramas);
    if (f.origem !== 'fatiador') g *= 1 + n(f.perda);
    g += n(f.purga_g);
    material += (g / 1000) * n(f.preco_kg);
  }
  let energia = 0, maquina = 0;
  if (imp) {
    energia = (n(imp.potencia_w) / 1000) * horas * n(p.tarifa_kwh);
    maquina = ((n(imp.vida_util_h) > 0 ? n(imp.valor_compra) / n(imp.vida_util_h) : 0) + n(imp.manutencao_hora)) * horas;
  }
  const preparo = comMo ? (n(e.preparo_min) / 60) * hora : 0;
  const acabamento = comMo ? (n(e.acabamento_min_peca) * pecas / 60) * hora : 0;
  const embalar = comMo ? (n(e.embalar_min_pedido) / 60) * hora : 0;
  const mao = preparo + acabamento + embalar;
  const refugo = (material + energia + maquina + preparo) * n(p.taxa_refugo);
  const insumos = n(e.insumos_peca) * pecas;
  const embalagem = e.embalagem === '' || e.embalagem == null ? n(p.embalagem_padrao) : n(e.embalagem);
  const acresc = n(e.acrescimo_unidade) * pecas + n(e.acrescimo_pedido);
  const custo = material + energia + maquina + mao + refugo + insumos + embalagem;
  const alvo = custo * (1 + margem) + acresc;

  let preco, erro = null;
  const liq = (pr) => { const t = taxaCanal(canal, pr); return pr - (pr * t.pct + t.fixa) - pr * vImp - (pr * pagPct + pagFix); };
  if (arred) {
    preco = Math.ceil(Math.max(alvo, 0.9) - 0.9 - 1e-9) + 0.9;
    let i = 0;
    while (liq(preco) < alvo - 1e-9) {
      preco += 1; i += 1;
      if (i > 20000) { erro = 'Taxa do canal mais imposto inviabiliza o preço.'; preco = 0; break; }
    }
  } else {
    const fx = ((canal && canal.dados && canal.dados.faixas) || [])
      .map((f) => ({ ate: f.ate === '' || f.ate == null ? 1e12 : n(f.ate), pct: n(f.taxa_pct), fixa: n(f.taxa_fixa) }))
      .sort((a, b) => a.ate - b.ate);
    let lim = 0, ok = false;
    for (const t of fx) {
      const den = 1 - t.pct - vImp - pagPct;
      if (den > 0.05) { preco = (alvo + t.fixa + pagFix) / den; if (preco > lim && preco <= t.ate) { ok = true; break; } }
      lim = t.ate;
    }
    if (!ok) {
      const t = taxaCanal(canal, 1e12);
      const den = 1 - t.pct - vImp - pagPct;
      if (den <= 0.05) { erro = 'Taxa do canal mais imposto inviabiliza o preço.'; preco = 0; }
      else preco = Math.max((alvo + t.fixa + pagFix) / den, lim + 0.01);
    }
    preco = r2(preco);
  }
  return {
    ...leitura(preco, custo, horas, vImp, pagPct, pagFix, canal, p),
    erro, material: r2(material), energia: r2(energia), maquina: r2(maquina),
    preparo: r2(preparo), acabamento: r2(acabamento), embalar: r2(embalar), mao_obra: r2(mao),
    base_refugo: r2(material + energia + maquina + preparo), refugo: r2(refugo), insumos: r2(insumos),
    embalagem: r2(embalagem), personalizacao: r2(acresc), custo_sem_embalagem: r2(custo - embalagem),
    margem, alvo: r2(alvo),
  };
}

// params: org_config.params; impressora e canal: linhas cadastradas
export function precificar(entrada, params = {}, impressora = null, canal = null) {
  const p = { ...PARAMS_PADRAO, ...params, ...(entrada.params || {}) };
  const mo = entrada.considerar_mao_obra == null ? p.considerar_mao_obra !== false : !!entrada.considerar_mao_obra;
  const sem = cenario(entrada, p, impressora, canal, false);
  const com = cenario(entrada, p, impressora, canal, true);
  let esc = mo ? com : sem;
  if (n(entrada.preco_manual) > 0) {
    const vImp = (entrada.com_nota == null ? true : !!entrada.com_nota) ? n(p.imposto_pct) : 0;
    esc = { ...esc, manual: leitura(n(entrada.preco_manual), esc.custo, n(entrada.horas), vImp,
      n(entrada.taxa_pagamento_pct), n(entrada.taxa_pagamento_fixa), canal, p) };
  }
  const resumo = (c) => ({ custo: c.custo, preco: c.preco, lucro: c.lucro, lucro_hora: c.lucro_hora });
  return { ...esc, considera_mao_obra: mo, sem_mao_obra: resumo(sem), com_mao_obra: resumo(com), motor: '019' };
}
