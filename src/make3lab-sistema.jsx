import { useState, useMemo, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   Make3Lab | sistema, v3 (19/09/2026)
   Paleta B, motor de 18/09, login, dados por organização no Supabase
   e marca de cada empresa no orçamento.
   Sem window.M3_CONFIG preenchido, roda em modo demonstração,
   com dados em memória, como o protótipo anterior.
   ============================================================ */

const LOGO_MAKE3 = "M 0.0,565.15625 L 151.25,565.15625 L 151.25,270.46875 L 142.65625,184.375 L 281.7187499999999,499.0625 L 442.4999999999999,499.0625 L 599.8437499999999,156.5625 L 591.2499999999999,270.46875 L 591.2499999999999,565.15625 L 741.5624999999999,565.15625 L 741.5624999999999,0.9375 L 539.0624999999999,0.9375 L 363.4374999999999,373.90625 L 203.4375,0.9375 L 0.0,0.9375 L 0.0,565.15625 M 1130.97656,565.15625 L 1290.0390600000003,565.15625 L 1110.19531,0.9375 L 876.2890600000002,0.9375 L 690.1953100000002,565.15625 L 845.0390600000002,565.15625 L 878.9453100000002,446.09375 L 1098.78906,446.09375 L 1130.97656,565.15625 M 905.0390600000002,349.53125 L 985.8203100000002,89.53125 L 993.6328100000002,89.53125 L 1073.63281,349.53125 L 905.0390600000001,349.53125 M 1808.2847700000002,0.9375 L 1639.5347700000002,0.9375 L 1387.5035200000002,249.53125 L 1387.5035200000002,0.0 L 1239.69102,0.0 L 1239.69102,565.15625 L 1387.5035200000002,565.15625 L 1387.5035200000002,404.375 L 1473.4410200000002,320.9375 L 1541.2535200000002,320.9375 L 1629.0660200000002,565.15625 L 1787.3472700000002,565.15625 L 1682.9722700000002,262.65625 L 1535.1597700000002,262.65625 L 1808.2847700000002,0.9375 M 2102.3892600000004,495.4671499999995 C 2002.74082,495.4671499999995 1946.72519,460.3108999999995 1948.0142600000004,352.1858999999995 L 2054.18613,352.1858999999995 C 2054.18613,381.4827799999995 2056.139260000001,410.1546499999995 2105.0064500000003,410.1546499999995 C 2136.920510000001,410.1546499999995 2162.31113,393.2015199999995 2162.31113,358.70933999999977 C 2162.31113,315.7015199999995 2134.3033200000004,317.6546499999995 2096.52988,317.6546499999995 L 2074.3814500000003,317.6546499999995 L 2074.3814500000003,246.6390199999995 L 2099.77207,246.6390199999995 C 2149.30332,246.6390199999995 2153.20957,221.91245999999921 2149.30332,187.38120999999921 C 2146.6861299999996,165.23277999999948 2131.72519,150.89683999999977 2108.24863,148.94370999999921 C 2064.6158200000004,145.7015199999995 2052.233010000001,188.67027999999948 2056.1392600000004,218.00620999999921 L 1951.2955100000004,218.00620999999921 C 1951.2955100000004,115.0765199999995 1992.3111299999998,63.631209999999214 2103.05332,63.631209999999214 C 2129.92832,63.631209999999214 2156.33457,67.77183999999977 2179.61582,76.83433999999977 L 2179.53769,1.0140199999995048 L 1773.8345700000002,1.4437099999992142 L 1774.4205100000004,565.1155899999992 L 2180.08457,564.7249599999998 L 2180.0064500000003,483.0843399999992 C 2156.3345700000004,491.4046499999995 2129.7720700000004,495.4671499999995 2102.389260000001,495.4671499999995";
const LOGO_LAB = "M 2632.8185200000003,565.15625 L 2632.8185200000003,445.15625 L 2346.7247700000003,446.09375 L 2346.7247700000003,0.9375 L 2195.4747700000003,0.9375 L 2195.4747700000003,565.15625 L 2632.8185200000003,565.15625 M 2971.77664,565.15625 L 3130.83914,565.15625 L 2950.99539,0.9375 L 2717.08914,0.9375 L 2530.99539,565.15625 L 2685.83914,565.15625 L 2719.74539,446.09375 L 2939.58914,446.09375 L 2971.77664,565.15625 M 2745.83914,349.53125 L 2826.62039,89.53125 L 2834.43289,89.53125 L 2914.43289,349.53125 L 2745.83914,349.53125 M 3386.4286,565.15625 C 3493.45985,565.15625 3608.14735,542.5 3608.14735,419.0625 C 3608.14735,315.625 3540.33485,295.625 3446.4286,289.53125 L 3446.4286,285.15625 C 3532.52235,285.15625 3579.39735,243.4375 3580.33485,170.46875 C 3582.9911,40.0 3473.45985,0.9375 3371.7411,0.9375 L 3079.5536,0.9375 L 3079.5536,565.15625 L 3386.4286,565.15625 M 3230.8036,116.5625 L 3364.70985,115.625 C 3402.0536,115.625 3435.95985,127.8125 3435.95985,174.84375 C 3435.95985,245.15625 3408.14735,240.0 3369.08485,240.0 L 3230.8036,240.0 L 3230.8036,116.5625 M 3230.8036,336.5625 L 3383.9286,336.5625 C 3425.64735,336.5625 3457.6786,359.0625 3457.6786,394.6875 C 3457.6786,447.8125 3424.70985,450.46875 3383.9286,450.46875 L 3230.8036,450.46875 L 3230.8036,336.5625";
const LOGO_VB = "0 0 3608.1 565.2";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap');
.m3{
  /* paleta B · Cianotipia & Prússia · tokens da instrução v2.2, sem hex fora da lista */
  --prussia-950:#061620; --prussia-900:#0C2130; --prussia-800:#12303F; --prussia-700:#1B4256;
  --azul-100:#C6E7FB; --azul-300:#5EBAF3; --azul-400:#25A1EF; --azul-500:#1087D1;
  --azul-600:#0C68A1; --azul-700:#094972;
  --aco-600:#41627A; --aco-500:#6B7F8E; --aco-400:#8FA3B0;
  --nevoa-200:#D8E4EC; --nevoa-100:#EBF1F5; --papel:#F7FAFC;
  --ok:#2E9E6B; --atencao:#F2C200; --erro:#E05555;

  /* papéis de interface, tema escuro */
  --marca:var(--azul-400); --marca-hover:var(--azul-300); --marca-tx:#04121A;
  --fundo:var(--prussia-950); --carta:var(--prussia-900); --carta2:var(--prussia-800);
  --tinta:var(--nevoa-100); --fraca:var(--aco-400); --muda:var(--aco-500); --linha:var(--prussia-700);
  --ativo:var(--azul-300);

  /* composição de custo: seis tons dos tokens, separados por luminância; refugo hachurado */
  --c-mat:var(--azul-700); --c-ene:var(--azul-600); --c-maq:var(--azul-500);
  --c-ope:var(--azul-400); --c-ext:var(--azul-300); --c-ref:var(--azul-100);

  --titulo:'Archivo',system-ui,sans-serif;
  --texto:'Archivo',system-ui,sans-serif;
  --num:'Archivo',system-ui,sans-serif;
  --malha:repeating-linear-gradient(90deg,rgba(110,200,255,.10) 0 1px,transparent 1px 22px),
          repeating-linear-gradient(180deg,rgba(110,200,255,.10) 0 1px,transparent 1px 22px);
  --r:4px; --lat:220px;
  background:var(--fundo); color:var(--tinta); font-family:var(--texto);
  font-size:14px; line-height:1.55; min-height:100vh; position:relative;
  font-variation-settings:'wdth' 100;
}
.m3 *{box-sizing:border-box}
.m3::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background-image:var(--malha);
  mask-image:radial-gradient(ellipse 95% 60% at 50% -4%,#000 10%,transparent 75%);
  -webkit-mask-image:radial-gradient(ellipse 95% 60% at 50% -4%,#000 10%,transparent 75%)}
.m3 h2,.m3 h3{font-family:var(--titulo);margin:0;letter-spacing:-.005em}
.m3 button,.m3 input,.m3 select,.m3 textarea{font:inherit;color:inherit}
.m3 :focus-visible{outline:2px solid var(--marca);outline-offset:2px}

/* ===== menu lateral ===== */
.m3 .app{display:flex;min-height:100vh;position:relative;z-index:1}
.m3 .lado{width:var(--lat);flex:0 0 var(--lat);border-right:1px solid var(--linha);background:var(--carta);
  position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:18px 12px}
.m3 .lado .marca{padding:4px 8px 20px;color:#fff}
.m3 .lado .marca svg{height:17px;width:auto;display:block}
.m3 .item{display:flex;align-items:center;gap:11px;width:100%;border:0;background:none;
  padding:9px 10px;border-radius:var(--r);cursor:pointer;color:var(--fraca);
  font-size:14px;font-weight:500;text-align:left;transition:background .15s,color .15s}
.m3 .item:hover{background:var(--carta2);color:var(--tinta)}
.m3 .item.on{background:rgba(37,161,239,.12);color:var(--ativo)}
.m3 .item svg{flex:0 0 18px;width:18px;height:18px}
.m3 .grupo{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muda);padding:18px 10px 6px}
.m3 .pe{border-top:1px solid var(--linha);padding:12px 10px 0;margin-top:10px;font-size:12px;color:var(--fraca)}
.m3 .pe .org{color:var(--tinta);font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m3 .pe .sync{display:flex;align-items:center;gap:6px;margin-top:4px;font-family:var(--num);font-size:11.5px}
.m3 .pe .sync i{width:7px;height:7px;border-radius:50%;background:var(--ok);flex:0 0 7px}
.m3 .pe .sync.salvando i{background:var(--atencao)}
.m3 .pe .sync.erro i{background:var(--erro)}
.m3 .pe .sync.demo i{background:var(--aco-500)}
.m3 .pe .sair{margin-top:10px;display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:0;
  color:var(--fraca);cursor:pointer;font-size:12.5px}
.m3 .pe .sair:hover{color:var(--tinta)}
.m3 .conteudo{flex:1;min-width:0;padding:26px 30px 64px;max-width:1440px}
.m3 .barra-top{display:none}
@media (max-width:860px){
  .m3 .app{flex-direction:column}
  .m3 .lado{display:none}
  .m3 .lado.aberto{display:flex;position:fixed;z-index:60;left:0;top:0;bottom:0;width:240px}
  .m3 .veu{position:fixed;inset:0;background:rgba(6,22,32,.72);z-index:55}
  .m3 .barra-top{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--carta);
    border-bottom:1px solid var(--linha);position:sticky;top:0;z-index:40;color:#fff}
  .m3 .barra-top svg{height:16px}
  .m3 .conteudo{padding:16px}
}

/* ===== blocos ===== */
.m3 .titulo{display:flex;align-items:baseline;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.m3 .titulo h2{font-size:30px;line-height:1.1;font-weight:700;font-variation-settings:'wdth' 92}
.m3 .esp{flex:1}
.m3 .cartao{background:var(--carta);border:1px solid var(--linha);border-radius:var(--r);padding:18px;margin-bottom:14px;position:relative}
.m3 .cabeca{display:flex;align-items:baseline;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.m3 .cabeca h2{font-size:18px;font-weight:600}
.m3 .cabeca h3{font-size:16px;font-weight:600}
.m3 .sub{color:var(--fraca);font-size:13px}
.m3 .dica{display:block;color:var(--muda);font-size:12px;margin-top:5px;line-height:1.5}

.m3 .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}
.m3 .duas{display:grid;grid-template-columns:1fr 372px;gap:16px;align-items:start}
@media (max-width:1100px){ .m3 .duas{grid-template-columns:1fr} }
.m3 .painel{position:sticky;top:16px}
@media (max-width:1100px){ .m3 .painel{position:static} }

.m3 label{display:block;font-size:14px;font-weight:500;color:var(--tinta);margin-bottom:5px}
.m3 input,.m3 select,.m3 textarea{width:100%;padding:9px 10px;background:var(--prussia-950);
  border:1px solid var(--linha);border-radius:var(--r);color:var(--tinta);font-size:14px;transition:border-color .15s,box-shadow .15s}
.m3 input::placeholder,.m3 textarea::placeholder{color:var(--muda)}
.m3 input:focus,.m3 select:focus,.m3 textarea:focus{outline:none;border-color:var(--marca);box-shadow:0 0 0 3px rgba(37,161,239,.18)}
.m3 input:disabled{color:var(--muda);cursor:not-allowed}
@media (max-width:1023px){ .m3 input,.m3 select,.m3 textarea{font-size:16px} }
.m3 input[type=number]{font-family:var(--num);font-variant-numeric:tabular-nums}
.m3 input[type=color]{padding:2px;height:38px;cursor:pointer}
.m3 textarea{min-height:72px;resize:vertical}
.m3 .campo{position:relative}
.m3 .campo .pref,.m3 .campo .sufx{position:absolute;top:50%;transform:translateY(-50%);
  font-family:var(--num);font-size:12.5px;color:var(--muda);pointer-events:none}
.m3 .campo .pref{left:10px}
.m3 .campo .sufx{right:10px}
.m3 .campo input{padding-left:34px}
.m3 .campo.pc input{padding-left:10px;padding-right:26px;text-align:right}

.m3 .bt{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--linha);background:var(--carta2);
  color:var(--tinta);padding:9px 15px;border-radius:var(--r);font-weight:600;font-size:13.5px;cursor:pointer;
  transition:border-color .15s,background .15s}
.m3 .bt:hover{border-color:var(--aco-600)}
.m3 .bt:active{transform:translateY(1px)}
.m3 .bt:disabled{opacity:.5;cursor:not-allowed}
.m3 .bt.forte{background:var(--marca);border-color:var(--marca);color:var(--marca-tx)}
.m3 .bt.forte:hover{background:var(--marca-hover);border-color:var(--marca-hover)}
.m3 .bt.mini{padding:6px 10px;font-size:12.5px}
.m3 .bt svg{width:15px;height:15px}
.m3 .linha-bt{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}

.m3 .ico{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;
  border:1px solid var(--linha);background:var(--carta2);border-radius:var(--r);color:var(--fraca);cursor:pointer}
.m3 .ico:hover{color:var(--tinta);border-color:var(--aco-600)}
.m3 .ico.perigo:hover{color:var(--erro);border-color:var(--erro)}
.m3 .ico svg{width:15px;height:15px}
.m3 .acoes{display:flex;gap:6px;justify-content:flex-end}

.m3 .rolo{overflow-x:auto}
.m3 table{width:100%;min-width:520px;border-collapse:collapse;font-size:14px}
.m3 .painel table{min-width:0}
.m3 th{text-align:left;font-size:12px;font-weight:600;color:var(--fraca);padding:7px 8px;border-bottom:1px solid var(--linha);white-space:nowrap}
.m3 td{padding:9px 8px;border-bottom:1px solid var(--linha);vertical-align:middle}
.m3 td.num,.m3 th.num{text-align:right;font-family:var(--num);font-variant-numeric:tabular-nums;font-size:13.5px}
.m3 th.num{font-family:var(--texto);font-size:12px}
.m3 tr.clicavel{cursor:pointer}
.m3 tr.clicavel:hover{background:var(--carta2)}

.m3 .fila{display:grid;grid-template-columns:44px 1.25fr .7fr .7fr .6fr 32px;gap:8px;align-items:end;margin-bottom:9px}
.m3 .fila label{display:none}
.m3 .filahead{display:grid;grid-template-columns:44px 1.25fr .7fr .7fr .6fr 32px;gap:8px;margin-bottom:5px;font-size:12px}
@media (max-width:700px){
  .m3 .filahead{display:none}
  .m3 .fila{grid-template-columns:1fr 1fr;border:1px solid var(--linha);border-radius:var(--r);padding:11px;margin-bottom:11px}
  .m3 .fila label{display:block}
}
.m3 .fila-insumo{display:grid;grid-template-columns:26px 1fr 120px 32px;gap:8px;align-items:center;margin-bottom:8px}

.m3 .segm{display:flex;border:1px solid var(--linha);border-radius:var(--r);overflow:hidden}
.m3 .segm button{flex:1;border:0;background:var(--prussia-950);padding:9px 8px;font-size:13px;
  font-weight:600;cursor:pointer;color:var(--fraca);white-space:nowrap}
.m3 .segm button.on{background:var(--marca);color:var(--marca-tx)}

.m3 .barra{display:flex;height:22px;border:1px solid var(--linha);border-radius:3px;overflow:hidden;margin-top:12px;background:var(--prussia-950)}
.m3 .barra span{display:block;height:100%;box-shadow:inset -1px 0 0 var(--prussia-950);transition:width .3s}
.m3 .lg{display:flex;flex-direction:column;gap:2px;margin-top:10px;font-size:13px}
.m3 .lg .l{display:flex;align-items:center;gap:8px;padding:3px 0}
.m3 .lg .l.off{opacity:.4}
.m3 .lg i{width:9px;height:9px;flex:0 0 auto;border-radius:1px;box-shadow:inset 0 0 0 1px rgba(235,241,245,.25)}
.m3 .lg b{margin-left:auto;font-family:var(--num);font-weight:500}
.m3 .lg .tot{border-top:1px solid var(--linha);padding-top:8px;margin-top:6px;font-weight:600}
.m3 .chk{width:15px;height:15px;flex:0 0 15px;border:1px solid var(--aco-600);border-radius:3px;
  background:var(--prussia-950);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}
.m3 .chk.on{background:var(--marca);border-color:var(--marca)}
.m3 .chk svg{width:10px;height:10px;color:var(--marca-tx)}
.m3 .swatch{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:3px;box-shadow:inset 0 0 0 1px rgba(235,241,245,.28)}

.m3 .rot{font-size:12.5px;font-weight:500;color:var(--fraca)}
.m3 .grandao{font-family:var(--num);font-weight:500;font-size:clamp(30px,5vw,38px);line-height:1;color:var(--marca);
  margin-top:8px;white-space:nowrap;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.m3 .metricas{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.m3 .metricas div{border:1px solid var(--linha);border-radius:var(--r);padding:9px 10px;background:var(--prussia-950)}
.m3 .metricas b{display:block;font-family:var(--num);font-size:15px;font-weight:500;margin-top:2px}

.m3 .bignum{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:18px}
.m3 .bignum .c{border:1px solid var(--linha);border-radius:var(--r);padding:14px 16px;background:var(--carta);min-width:0}
.m3 .bignum .v{font-family:var(--num);font-weight:500;font-size:24px;margin-top:6px;line-height:1.1;
  white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}
/* dinheiro: entra em azul, saldo e saída em neutro, atraso e negativo em erro */
.m3 .bignum .v.entra{color:var(--marca)}
.m3 .bignum .v.sai,.m3 .bignum .v.neutro{color:var(--tinta)}
.m3 .bignum .v.alerta{color:var(--erro)}

.m3 .aviso{padding:10px 12px;border-left:2px solid var(--aco-500);background:var(--carta2);
  border-radius:0 var(--r) var(--r) 0;font-size:13.5px;margin-bottom:12px}
.m3 .aviso.ruim{border-left-color:var(--erro)}
.m3 .aviso.bom{border-left-color:var(--ok)}
.m3 .aviso.atencao{border-left-color:var(--atencao)}
.m3 .vazio{padding:30px 16px;text-align:center;color:var(--fraca);font-size:14px}
.m3 .pilula{display:inline-block;padding:2px 9px;border:1px solid var(--linha);border-radius:20px;
  font-size:12px;font-weight:600;color:var(--fraca);white-space:nowrap}
.m3 .pilula.aprovado,.m3 .pilula.pago,.m3 .pilula.entregue{border-color:var(--ok);color:var(--ok)}
.m3 .pilula.enviado,.m3 .pilula.producao{border-color:var(--aco-400);color:var(--tinta)}
.m3 .pilula.aberto,.m3 .pilula.aberta{border-color:var(--atencao);color:var(--atencao)}
.m3 .pilula.recusado,.m3 .pilula.cancelada,.m3 .pilula.vencido,.m3 .pilula.expirado{border-color:var(--erro);color:var(--erro)}
.m3 .num-azul{color:var(--marca)}

/* autocomplete */
.m3 .auto{position:relative}
.m3 .auto .lista{position:absolute;z-index:30;left:0;right:0;top:100%;margin-top:4px;
  background:var(--carta);border:1px solid var(--aco-600);border-radius:var(--r);overflow:hidden}
.m3 .auto .lista button{display:block;width:100%;text-align:left;border:0;background:none;
  padding:9px 12px;cursor:pointer;color:var(--tinta);font-size:14px}
.m3 .auto .lista button:hover{background:var(--carta2)}
.m3 .auto .lista .novo{color:var(--ativo);font-weight:600;border-top:1px solid var(--linha)}

/* logo da empresa nas configurações */
.m3 .logo-emp{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:14px}
.m3 .previa-pdf{margin-top:12px;padding:14px 16px;background:#fff;border-radius:var(--r);color:var(--prussia-900);
  display:flex;align-items:center;gap:14px}
.m3 .previa-pdf img{max-height:44px;max-width:180px;display:block}

/* entrada */
.m3 .entrada{min-height:100vh;display:grid;place-items:center;padding:24px;position:relative;z-index:1}
.m3 .entrada .caixa{width:100%;max-width:400px}
.m3 .entrada .logo{color:#fff;margin-bottom:28px}
.m3 .entrada .logo svg{width:220px;height:auto;display:block}
.m3 .entrada h1{font-family:var(--titulo);font-size:22px;font-weight:700;margin:0 0 4px;font-variation-settings:'wdth' 92}
.m3 .entrada .cartao{padding:22px}
.m3 .entrada form > div{margin-bottom:14px}
.m3 .entrada .troca{margin-top:14px;font-size:13.5px;color:var(--fraca)}
.m3 .link{background:none;border:0;padding:0;color:var(--ativo);cursor:pointer;font-weight:600;font-size:inherit}
.m3 .link:hover{text-decoration:underline}
.m3 .aceite{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:var(--fraca)}
.m3 .aceite .chk{margin-top:3px}
.m3 .carregando{min-height:100vh;display:grid;place-items:center;color:var(--fraca);font-family:var(--num);font-size:13px}

/* ===== v3.1: números na fonte de texto, algarismo tabular ===== */
.m3{font-variant-numeric:tabular-nums}

/* composição de custo: seis tons separados por luminância, todos tokens */
.m3 .hachura{background:repeating-linear-gradient(135deg,var(--aco-400) 0 3px,var(--prussia-950) 3px 6px)!important}
.m3 .barra{height:26px;gap:2px;padding:2px;border-radius:var(--r)}
.m3 .barra span{border-radius:2px;box-shadow:none}
.m3 .lg i{width:11px;height:11px;border-radius:2px}

/* menu com submenu */
.m3 .item .seta-sub{margin-left:auto;width:14px;height:14px;transition:transform .15s;opacity:.7}
.m3 .item.aberto .seta-sub{transform:rotate(90deg)}
.m3 .item.pai-on{color:var(--tinta)}
.m3 .filhos{display:flex;flex-direction:column;margin:2px 0 6px 19px;padding-left:10px;border-left:1px solid var(--linha)}
.m3 .filho{border:0;background:none;text-align:left;padding:7px 10px;border-radius:var(--r);color:var(--fraca);
  font-size:13.5px;cursor:pointer;position:relative}
.m3 .filho:hover{color:var(--tinta);background:var(--carta2)}
.m3 .filho.on{color:var(--ativo);background:rgba(37,161,239,.10)}
.m3 .filho.on::before{content:"";position:absolute;left:-11px;top:8px;bottom:8px;width:2px;background:var(--marca);border-radius:2px}
.m3 .lado{overflow-y:auto}
.m3 .pe .conta-bt{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;padding:8px;margin:-8px;border-radius:var(--r);
  color:inherit;cursor:pointer;text-align:left}
.m3 .pe .conta-bt:hover,.m3 .pe .conta-bt.on{background:var(--carta2)}
.m3 .avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--prussia-700);color:var(--azul-100);
  display:grid;place-items:center;font-weight:700;font-size:13px}
.m3 .pe .quem{min-width:0;flex:1}

/* título com contexto */
.m3 .titulo .eyebrow{display:block;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--azul-300);margin-bottom:4px}

/* números do financeiro */
.m3 .numeros{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--linha);border-radius:var(--r);
  background:var(--carta);margin-bottom:14px}
.m3 .numeros.tres{grid-template-columns:repeat(3,minmax(0,1fr))}
.m3 .numeros .n{display:flex;flex-direction:column;gap:4px;padding:16px 18px;border:0;border-left:1px solid var(--linha);background:none;
  text-align:left;color:inherit;font:inherit;min-width:0}
.m3 .numeros .n:first-child{border-left:0}
.m3 button.n{cursor:pointer}
.m3 button.n:hover{background:var(--carta2)}
.m3 .numeros b{font-size:24px;font-weight:600;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em}
.m3 .numeros b.entra{color:var(--marca)}
.m3 .numeros b.alerta,.m3 .linha-res b.alerta{color:var(--erro)}
@media (max-width:900px){ .m3 .numeros,.m3 .numeros.tres{grid-template-columns:1fr 1fr}
  .m3 .numeros .n:nth-child(odd){border-left:0} .m3 .numeros .n:nth-child(n+3){border-top:1px solid var(--linha)} }
.m3 .duas.iguais{grid-template-columns:1.4fr 1fr}
@media (max-width:1100px){ .m3 .duas.iguais{grid-template-columns:1fr} }
.m3 .grafico{width:100%;height:auto;display:block}
.m3 .grafico .guia{stroke:var(--linha);stroke-dasharray:3 4}
.m3 .grafico .eixo,.m3 .grafico .zero{stroke:var(--aco-600)}
.m3 .grafico .zero{stroke-dasharray:4 4}
.m3 .grafico .b-entra,.m3 .leg .b-entra{fill:var(--azul-400);background:var(--azul-400)}
.m3 .grafico .b-sai,.m3 .leg .b-sai{fill:var(--aco-400);background:var(--aco-400)}
.m3 .grafico .rot-eixo{fill:var(--fraca);font-size:12px;font-family:var(--texto)}
.m3 .grafico .linha-saldo{fill:none;stroke:var(--azul-400);stroke-width:2;vector-effect:non-scaling-stroke}
.m3 .grafico .pt{fill:var(--azul-400)}
.m3 .grafico .pt-neg{fill:var(--erro)}
.m3 .leg{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--fraca)}
.m3 .leg i{width:10px;height:10px;border-radius:2px;display:inline-block}
.m3 .linha-res{display:flex;justify-content:space-between;border-top:1px solid var(--linha);margin-top:10px;padding-top:12px;color:var(--fraca)}
.m3 .linha-res b{color:var(--tinta);font-size:16px}
.m3 .lista-venc{list-style:none;margin:0;padding:0}
.m3 .lista-venc li{display:grid;grid-template-columns:52px 1fr auto;gap:10px;padding:9px 0;border-bottom:1px solid var(--linha);align-items:baseline}
.m3 .lista-venc .d{color:var(--fraca);font-size:13px}
.m3 .lista-venc .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m3 .alerta-txt{color:var(--erro)}
.m3 .cartao.destaque{border-color:var(--aco-600)}
.m3 .separa{height:1px;background:var(--linha);margin:18px 0}

/* autocomplete */
.m3 .auto .lista button{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.m3 .auto .lista button.foco{background:var(--carta2)}
.m3 .auto .lista .det{color:var(--fraca);font-size:12.5px;white-space:nowrap}
.m3 .auto .lista .novo{display:flex;justify-content:flex-start;gap:8px;align-items:center}
.m3 .add-item{min-width:min(420px,100%)}
.m3 .fila-insumo{grid-template-columns:22px minmax(0,1fr) 92px 118px 84px 30px}
.m3 .fila-insumo .total-ins{text-align:right;font-weight:600}
.m3 .fila-insumo .qtd input{padding-right:30px}
.m3 .cab-insumo{display:grid;grid-template-columns:22px minmax(0,1fr) 92px 118px 84px 30px;gap:8px;font-size:12px;color:var(--fraca);margin-bottom:5px}
.m3 .cab-insumo span:nth-child(n+3){text-align:right}
@media (max-width:700px){
  .m3 .cab-insumo{display:none}
  .m3 .fila-insumo{grid-template-columns:22px 1fr 1fr 30px;border:1px solid var(--linha);border-radius:var(--r);padding:10px}
  .m3 .fila-insumo .auto{grid-column:2/-1}
  .m3 .fila-insumo .total-ins{grid-column:2/4;text-align:left}
}

/* insumos em configurações */
.m3 .link-planilha{display:flex;gap:8px;margin-top:12px;max-width:640px}
.m3 .busca{width:180px;padding:6px 10px}
.m3 .tab-edit td{padding:5px 6px}
.m3 .tab-edit input{padding:7px 8px}

/* modal */
.m3 .modal-fundo{position:fixed;inset:0;z-index:80;background:rgba(6,22,32,.78);display:grid;place-items:center;padding:16px}
.m3 .modal{width:100%;max-width:520px;background:var(--carta);border:1px solid var(--aco-600);border-radius:var(--r);padding:20px}

/* minha conta */
.m3 .linha-org{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.m3 .linha-org b{font-size:18px}
.m3 .convite{border-top:1px solid var(--linha);margin-top:14px;padding-top:16px}

/* entrada, duas colunas */
.m3 .entrada{min-height:100vh;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,1fr);place-items:stretch;padding:0}
.m3 .planta{position:relative;background:var(--prussia-900);border-right:1px solid var(--linha);padding:40px clamp(28px,5vw,64px);
  display:flex;flex-direction:column;overflow:hidden}
.m3 .planta::before{content:"";position:absolute;inset:0;background-image:var(--malha);opacity:.9;pointer-events:none}
.m3 .planta > *{position:relative}
.m3 .marca-grande{color:#fff}
.m3 .marca-grande svg{height:clamp(30px,3.2vw,40px)!important}
.m3 .planta-meio{margin:auto 0;max-width:520px;padding:40px 0}
.m3 .frase{font-family:var(--titulo);font-size:clamp(28px,3.2vw,42px);line-height:1.05;font-weight:800;
  font-variation-settings:'wdth' 84;text-transform:uppercase;letter-spacing:-.01em;margin:0 0 28px;color:var(--nevoa-100)}
.m3 .camadas{display:flex;gap:3px;height:34px;padding:3px;border:1px solid var(--aco-600);border-radius:var(--r);background:var(--prussia-950)}
.m3 .camadas span{border-radius:2px}
.m3 .camadas-leg{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--fraca)}
.m3 .camadas-leg li{display:flex;align-items:center;gap:6px}
.m3 .camadas-leg i{width:10px;height:10px;border-radius:2px;display:inline-block}
.m3 .planta-nota{margin-top:22px;max-width:460px;line-height:1.6}
.m3 .planta-rodape{font-size:12px;color:var(--muda);letter-spacing:.08em;text-transform:uppercase}
.m3 .acesso{display:grid;place-items:center;padding:40px 24px}
.m3 .acesso .caixa{width:100%;max-width:380px}
.m3 .acesso h1{font-family:var(--titulo);font-size:30px;font-weight:700;margin:0;font-variation-settings:'wdth' 92}
.m3 .acesso form > div{margin-bottom:16px}
.m3 .rot-linha{display:flex;justify-content:space-between;align-items:baseline}
.m3 .bt.grande{width:100%;justify-content:center;padding:12px 15px;font-size:15px;margin-top:4px}
.m3 .troca{margin-top:20px;font-size:14px;color:var(--fraca);text-align:center}
@media (max-width:860px){
  .m3 .entrada{grid-template-columns:1fr}
  .m3 .planta{border-right:0;border-bottom:1px solid var(--linha);padding:24px}
  .m3 .planta-meio{padding:20px 0 4px}
  .m3 .planta-nota,.m3 .planta-rodape,.m3 .camadas-leg{display:none}
  .m3 .frase{font-size:24px;margin-bottom:16px}
}

/* ===== v3.2 ===== */
/* select com a cara do sistema, sem o controle nativo do macOS */
.m3 select{-webkit-appearance:none;appearance:none;padding-right:32px;cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238FA3B0' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 11px center;background-size:12px}
.m3 select option{background:var(--prussia-900);color:var(--tinta)}
/* sem as setinhas do campo numérico */
.m3 input[type=number]{-moz-appearance:textfield;appearance:textfield}
.m3 input[type=number]::-webkit-inner-spin-button,.m3 input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.m3 input[type=date]{color-scheme:dark}
/* título de formulário com caminho de volta */
.m3 .voltar{display:inline-flex;align-items:center;gap:6px;border:0;background:none;padding:4px 0;margin-bottom:6px;
  color:var(--ativo);font-weight:600;font-size:13.5px;cursor:pointer}
.m3 .voltar:hover{text-decoration:underline}
.m3 .linha-bt .esp{flex:1}
.m3 .linha-add{margin-bottom:12px;max-width:560px}
.m3 .modal.largo{max-width:640px}
.m3 .modal .segm{width:100%}
.m3 .previa-preco{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.m3 .previa-preco div{border:1px solid var(--linha);border-radius:var(--r);padding:10px 12px;background:var(--prussia-950)}
.m3 .previa-preco b{display:block;font-size:20px;font-weight:600;margin-top:2px}
.m3 .previa-preco b.entra{color:var(--marca)}
/* relatórios */
.m3 .filtro-periodo{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px}
.m3 .segm.rolavel{overflow-x:auto;max-width:100%}
.m3 .filtro-periodo .datas{display:flex;align-items:center;gap:8px}
.m3 .filtro-periodo .datas input{width:auto}
.m3 .barras{display:flex;flex-direction:column;gap:8px}
.m3 .barras .bl{display:grid;grid-template-columns:minmax(90px,200px) 1fr auto;gap:12px;align-items:center;font-size:13.5px}
.m3 .barras .r{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fraca)}
.m3 .barras .trilho{height:12px;background:var(--prussia-950);border-radius:2px;overflow:hidden}
.m3 .barras .trilho span{display:block;height:100%;background:var(--azul-400);border-radius:2px;min-width:2px}
.m3 .barras .trilho span.neutra{background:var(--aco-400)}
.m3 .barras b{font-weight:600;min-width:84px;text-align:right}
.m3 tfoot td{font-weight:700;border-top:1px solid var(--aco-600);border-bottom:0}
/* ===== v3.3 ===== */
.m3 .fila{grid-template-columns:44px minmax(0,1.6fr) .7fr .6fr .6fr 32px}
.m3 .filahead{grid-template-columns:44px minmax(0,1.6fr) .7fr .6fr .6fr 32px}
.m3 .fila .auto label{display:none}
@media (max-width:700px){ .m3 .fila .auto label{display:block} .m3 .fila .auto{grid-column:1/-1} }
.m3 .resumo-prod{margin-top:14px;padding:10px 12px;border:1px solid var(--linha);border-radius:var(--r);background:var(--prussia-950);font-size:13.5px}
.m3 .resumo-prod b{color:var(--tinta)}
.m3 .filtros{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:14px}
.m3 .filtros > div{min-width:170px}
.m3 .filtros .grow{flex:1;min-width:200px}
.m3 .swatch.grande{width:16px;height:16px;border-radius:50%;margin:0;display:block}
.m3 .estoque{display:inline-flex;align-items:center;gap:8px}
.m3 .ico.mini{width:24px;height:24px;font-size:15px;line-height:1}
.m3 .cor-campo{display:grid;grid-template-columns:44px 1fr;gap:6px}
.m3 .atalhos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
@media (max-width:1000px){ .m3 .atalhos{grid-template-columns:1fr 1fr} }
.m3 .atalho{display:flex;gap:12px;align-items:center;text-align:left;padding:14px 16px;border:1px solid var(--linha);border-radius:var(--r);
  background:var(--carta);color:var(--tinta);cursor:pointer;font:inherit}
.m3 .atalho:hover{border-color:var(--aco-600);background:var(--carta2)}
.m3 .atalho svg{flex:0 0 22px;width:22px;height:22px;color:var(--ativo)}
.m3 .atalho b{display:block;font-size:14.5px}
.m3 .atalho small{display:block;color:var(--fraca);font-size:12.5px;margin-top:2px}
.m3 .atalho.forte{background:var(--marca);border-color:var(--marca);color:var(--marca-tx)}
.m3 .atalho.forte svg,.m3 .atalho.forte small{color:var(--marca-tx)}
.m3 .atalho.forte:hover{background:var(--marca-hover)}
.m3 .duas.metade{grid-template-columns:1fr 1fr}
@media (max-width:1000px){ .m3 .duas.metade{grid-template-columns:1fr} }
.m3 .lista-venc li.clicavel{cursor:pointer}
.m3 .lista-venc li.clicavel:hover{background:var(--carta2)}
.m3 .passos .progresso{height:6px;background:var(--prussia-950);border-radius:3px;overflow:hidden;margin-bottom:12px}
.m3 .passos .progresso span{display:block;height:100%;background:var(--azul-400)}
.m3 .passos ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:4px 16px}
.m3 .passos li button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;padding:7px 0;color:var(--tinta);cursor:pointer;text-align:left;font:inherit}
.m3 .passos li button:hover{color:var(--ativo)}
.m3 .passos li i{width:18px;height:18px;flex:0 0 18px;border:1px solid var(--aco-600);border-radius:50%;display:grid;place-items:center}
.m3 .passos li.ok button{color:var(--fraca);text-decoration:line-through}
.m3 .passos li.ok i{background:var(--ok);border-color:var(--ok);color:var(--prussia-950)}
.m3 .chips{display:flex;flex-wrap:wrap;gap:8px}
.m3 .chip{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid var(--linha);border-radius:20px;font-size:13px}
.m3 .chip b{color:var(--erro)}
/* ===== v3.4 ===== */
/* malha de planta técnica: grade fina, linha mestra e marcas de registro nos cruzamentos */
.m3{--malha:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' fill='none' stroke='%235EBAF3'%3E%3Cpath d='M0 0V96M12 0V96M36 0V96M48 0V96M60 0V96M84 0V96M0 0H96M0 12H96M0 36H96M0 48H96M0 60H96M0 84H96' stroke-opacity='.05' stroke-width='.5'/%3E%3Cpath d='M24 0V96M72 0V96M0 24H96M0 72H96' stroke-opacity='.10' stroke-width='.6'/%3E%3Cpath d='M18 24h12M24 18v12M18 72h12M24 66v12M66 24h12M72 18v12M66 72h12M72 66v12' stroke-opacity='.42' stroke-width='.8'/%3E%3Ccircle cx='24' cy='24' r='1.2' fill='%235EBAF3' fill-opacity='.5' stroke='none'/%3E%3C/svg%3E")}
.m3::before{background-image:var(--malha);background-size:96px 96px;background-position:-24px -24px;
  mask-image:radial-gradient(ellipse 120% 85% at 75% -5%,#000 0%,rgba(0,0,0,.6) 40%,transparent 78%);
  -webkit-mask-image:radial-gradient(ellipse 120% 85% at 75% -5%,#000 0%,rgba(0,0,0,.6) 40%,transparent 78%)}
.m3 .planta::before{background-size:96px 96px;opacity:1;
  mask-image:linear-gradient(160deg,#000 0%,rgba(0,0,0,.75) 55%,rgba(0,0,0,.35) 100%);
  -webkit-mask-image:linear-gradient(160deg,#000 0%,rgba(0,0,0,.75) 55%,rgba(0,0,0,.35) 100%)}

/* coluna do conteúdo com a barra de cima */
.m3 .coluna{flex:1;min-width:0;display:flex;flex-direction:column}
.m3 .barra-top{display:none!important}
.m3 .topo{position:sticky;top:0;z-index:45;display:flex;align-items:center;gap:10px;padding:10px 30px;min-height:58px;
  background:rgba(6,22,32,.92);border-bottom:1px solid var(--linha);backdrop-filter:blur(8px)}
.m3 .topo .so-mobile{display:none}
.m3 .busca-global{width:min(420px,40vw)}
.m3 .busca-global input{padding-left:34px;background:var(--carta) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238FA3B0' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E") no-repeat 11px center}
.m3 .atalhos-topo{display:flex;align-items:center;gap:6px;position:relative}
.m3 .atalhos-topo .bt svg{color:var(--ativo)}
.m3 .sino{position:relative}
.m3 .sino .cont{position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:var(--aco-600);
  color:var(--tinta);font-size:10.5px;font-weight:700;display:grid;place-items:center}
.m3 .sino.tem .cont{background:var(--erro);color:#fff}
.m3 .pop{position:absolute;top:52px;right:24px;z-index:70;background:var(--carta);border:1px solid var(--aco-600);border-radius:var(--r);padding:14px;
  width:min(380px,92vw);max-height:70vh;overflow-y:auto}
.m3 .pop-atalhos{right:0;top:40px;width:260px;display:flex;flex-direction:column;gap:2px}
.m3 .pop-atalhos .opcao{display:flex;align-items:center;gap:9px;padding:7px 2px;font-size:14px;font-weight:400;margin:0;cursor:pointer}
.m3 .pop-atalhos .opcao svg{color:var(--fraca)}
@media (max-width:860px){
  .m3 .topo{padding:8px 12px;gap:8px}
  .m3 .topo .so-mobile{display:inline-flex}
  .m3 .marca-topo{color:#fff}
  .m3 .busca-global{display:none}
  .m3 .atalhos-topo .bt span{display:none}
  .m3 .atalhos-topo .bt{padding:7px 9px}
}

/* alertas */
.m3 .alertas{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.m3 .alertas button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--linha);border-left-width:3px;
  background:var(--prussia-950);color:var(--tinta);padding:9px 10px;border-radius:var(--r);cursor:pointer;font:inherit;font-size:13.5px}
.m3 .alertas button:hover{background:var(--carta2)}
.m3 .alertas button > span:nth-child(2){flex:1}
.m3 .alertas button > svg{color:var(--fraca)}
.m3 .alertas .marca-al{display:grid;place-items:center;color:var(--fraca)}
.m3 .alertas .erro button{border-left-color:var(--erro)}
.m3 .alertas .erro .marca-al{color:var(--erro)}
.m3 .alertas .atencao button{border-left-color:var(--atencao)}
.m3 .alertas .atencao .marca-al{color:var(--atencao)}
.m3 .alertas .info button{border-left-color:var(--aco-500)}

/* ícone no título */
.m3 .ico-titulo{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:var(--r);background:var(--carta);
  border:1px solid var(--linha);color:var(--ativo);align-self:center;flex:0 0 38px}
.m3 .titulo{align-items:center}

/* configurações em seções */
.m3 .secoes{display:flex;flex-direction:column;gap:10px}
.m3 .secao{border:1px solid var(--linha);border-radius:var(--r);background:var(--carta)}
.m3 .secao.aberta{border-color:var(--aco-600)}
.m3 .secao-cab{display:flex;align-items:center;gap:14px;width:100%;border:0;background:none;color:var(--tinta);padding:14px 18px;cursor:pointer;text-align:left;font:inherit}
.m3 .secao-cab:hover{background:var(--carta2)}
.m3 .secao-ico{display:grid;place-items:center;width:34px;height:34px;border-radius:var(--r);background:var(--prussia-950);color:var(--ativo);flex:0 0 34px}
.m3 .secao-txt{flex:1;min-width:0;display:flex;flex-direction:column}
.m3 .secao-txt b{font-size:15.5px;font-weight:600}
.m3 .secao-txt .sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m3 .secao .seta-sub{width:16px;height:16px;transition:transform .15s;color:var(--fraca)}
.m3 .secao.aberta .seta-sub{transform:rotate(90deg)}
.m3 .secao-corpo{padding:4px 18px 18px;border-top:1px solid var(--linha)}
.m3 .secao-corpo .cartao{border:0;padding:0;margin:14px 0 0;background:none}
.m3 .secao-corpo .cartao .cabeca:empty,.m3 .secao-corpo .cartao .cabeca h2:empty{display:none}
.m3 .secao-corpo > .grade{margin-top:16px}
.m3 .duas-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center}
@media (max-width:900px){ .m3 .duas-col{grid-template-columns:1fr} }

/* imagens */
.m3 .foto-campo{display:flex;gap:16px;align-items:center;margin-bottom:6px}
.m3 .miniatura{display:grid;place-items:center;border-radius:var(--r);object-fit:cover;background:var(--prussia-950);border:1px solid var(--linha);flex:0 0 auto}
.m3 .miniatura.vazia{color:var(--aco-500)}
.m3 .avatar-img{object-fit:contain;background:#fff;border-radius:6px;flex:0 0 auto;border:1px solid var(--linha)}
.m3 .avatar-mono{display:inline-grid;place-items:center;color:#fff;font-weight:700;border-radius:6px;flex:0 0 auto}
.m3 .avatar-img.red,.m3 .avatar-mono.red{border-radius:50%}
.m3 .com-avatar{display:flex;align-items:center;gap:10px}
.m3 .logo-marca{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}

/* paleta de cor */
.m3 .escolhe-cor{position:relative}
.m3 .swatch-bt{width:44px;height:38px;border-radius:var(--r);border:1px solid var(--aco-600);cursor:pointer;box-shadow:inset 0 0 0 3px var(--prussia-950)}
.m3 .paleta{position:absolute;z-index:40;top:44px;left:0;width:260px;background:var(--carta);border:1px solid var(--aco-600);border-radius:var(--r);padding:12px;display:flex;flex-direction:column;gap:6px}
.m3 .paleta .sw{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-bottom:6px}
.m3 .paleta .sw button{aspect-ratio:1;border-radius:50%;border:1px solid rgba(235,241,245,.25);cursor:pointer;padding:0}
.m3 .paleta .sw button:hover,.m3 .paleta .sw button.on{outline:2px solid var(--marca);outline-offset:2px}
.m3 .paleta .outra{display:flex!important;align-items:center;gap:8px;font-size:13px;font-weight:400;color:var(--fraca);margin:0;cursor:pointer}
.m3 .paleta .outra input{width:28px;height:28px;padding:0;border:0;background:none}
.m3 .fila .escolhe-cor label{display:none}
@media (max-width:700px){ .m3 .fila .escolhe-cor label{display:block} }

/* estoque */
.m3 .estoque-g{display:flex;align-items:center;gap:10px}
.m3 .barra-est{flex:1;min-width:50px;height:6px;border-radius:3px;background:var(--prussia-950);overflow:hidden}
.m3 .barra-est span{display:block;height:100%;background:var(--azul-400)}
.m3 .barra-est span.curto{background:var(--erro)}
.m3 .estoque-g b{min-width:62px;text-align:right;font-weight:600}
.m3 .lista-simples{margin:6px 0 0;padding:0;list-style:none}
.m3 .lista-simples li{display:flex;align-items:center;gap:6px;padding:2px 0}

/* importação */
.m3 .passo{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}
.m3 .passo .n{flex:0 0 26px;height:26px;border-radius:50%;background:var(--prussia-950);border:1px solid var(--aco-600);display:grid;place-items:center;font-weight:700;font-size:13px;color:var(--ativo)}
.m3 .modal{max-height:92vh;overflow-y:auto}
/* ===== v3.5 ===== */
/* fundo: mesa de impressão em perspectiva, a grade some no horizonte */
.m3::before{display:none!important}
.m3 .planta::before{display:none!important}
.m3 .mesa3d{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;perspective:520px;perspective-origin:50% 35%;
  mask-image:linear-gradient(to top,#000 0%,rgba(0,0,0,.7) 30%,transparent 62%);-webkit-mask-image:linear-gradient(to top,#000 0%,rgba(0,0,0,.7) 30%,transparent 62%)}
.m3 .mesa3d .plano{position:absolute;left:-60%;width:220%;bottom:-2%;height:110%;transform-origin:50% 100%;transform:rotateX(72deg);
  background-image:linear-gradient(rgba(94,186,243,.34) 2px,transparent 2px),linear-gradient(90deg,rgba(94,186,243,.34) 2px,transparent 2px),
    linear-gradient(rgba(94,186,243,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(94,186,243,.12) 1px,transparent 1px);
  background-size:200px 200px,200px 200px,40px 40px,40px 40px;background-position:center bottom}
.m3 .planta .mesa3d{position:absolute;perspective:420px;perspective-origin:50% 30%}
.m3 .planta .mesa3d .plano{background-size:160px 160px,160px 160px,32px 32px,32px 32px}
@media (prefers-reduced-motion: reduce){ .m3 .mesa3d{display:block} }

/* barra de cima com a cor do menu, separada da página */
.m3 .topo{background:var(--carta)!important;backdrop-filter:none!important;border-bottom:1px solid var(--linha)}
.m3 .busca-global input{background-color:var(--prussia-950)!important}

/* formulário de documento: três colunas, campo largo onde precisa */
.m3 .grade .span2{grid-column:span 2}
.m3 .grade .span-todo,.m3 .span-todo{grid-column:1/-1}
.m3 .grade.doc{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media (max-width:900px){ .m3 .grade.doc{grid-template-columns:1fr 1fr} }
@media (max-width:600px){ .m3 .grade.doc{grid-template-columns:1fr} .m3 .grade .span2{grid-column:auto} }
.m3 .chips-campo{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:5px;border:1px solid var(--linha);border-radius:var(--r);background:var(--prussia-950)}
.m3 .chips-campo .grow{flex:1;min-width:160px}
.m3 .chips-campo input{border:0;background:transparent;padding:5px 6px}
.m3 .chips-campo input:focus{box-shadow:none}
.m3 .chip-sel{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 10px;background:var(--carta2);border:1px solid var(--aco-600);border-radius:20px;font-size:13px}
.m3 .chip-sel button{border:0;background:none;color:var(--fraca);cursor:pointer;display:grid;place-items:center;padding:2px}
.m3 .chip-sel button:hover{color:var(--erro)}

/* impressão no simulador */
.m3 .hm{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.m3 .resumo-prod{display:flex;flex-wrap:wrap;gap:6px 18px}
.m3 .resumo-prod span{white-space:nowrap}

/* filamentos */
.m3 .carr{font-size:16px}
.m3 .swatch.enorme{width:22px;height:22px;border-radius:50%;display:inline-block;align-self:center}
.m3 .grupo-cor .cabeca{align-items:center}
.m3 .contador{display:grid;grid-template-columns:34px 1fr 34px;gap:6px}
.m3 .contador .ico{width:auto;height:auto;font-size:17px}
.m3 .contador input{text-align:center}
.m3 .marca-campo{display:flex;align-items:flex-end;gap:10px}
.m3 .marca-campo > div:first-child{flex:1}
.m3 .opcao-linha{display:flex!important;align-items:center;gap:9px;font-weight:500;margin:0;cursor:pointer;flex-wrap:wrap}
a.ico{text-decoration:none}
.m3 a.bt{text-decoration:none}
/* ===== v3.6 · mais vida: cores de apoio para dado, etapa e categoria ===== */
.m3{--ambar:#F2A516;--ciano:#22B8CF;--violeta:#8B7CF6;--coral:#F26B5B;--rosa:#EC5B9B}
.m3 .mesa3d{display:none!important}
/* números com faixa e fundo de cor */
.m3 .numeros{border:0;background:none;gap:10px}
.m3 .numeros .n{--acc:var(--azul-400);border:1px solid var(--linha)!important;border-radius:var(--r);position:relative;overflow:hidden;
  background:linear-gradient(180deg,color-mix(in srgb,var(--acc) 13%,var(--carta)) 0%,var(--carta) 70%)}
.m3 .numeros .n::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--acc)}
.m3 .numeros .n:nth-child(2){--acc:var(--ok)}.m3 .numeros .n:nth-child(3){--acc:var(--ambar)}.m3 .numeros .n:nth-child(4){--acc:var(--violeta)}
.m3 .numeros .n.cor-azul{--acc:var(--azul-400)}.m3 .numeros .n.cor-verde{--acc:var(--ok)}.m3 .numeros .n.cor-ambar{--acc:var(--ambar)}
.m3 .numeros .n.cor-violeta{--acc:var(--violeta)}.m3 .numeros .n.cor-coral{--acc:var(--coral)}.m3 .numeros .n.cor-ciano{--acc:var(--ciano)}
.m3 .numeros .n .rot{color:color-mix(in srgb,var(--acc) 55%,var(--tinta))}
.m3 .numeros b.entra{color:var(--azul-300)}
/* ícone do título e do menu com cor */
.m3 .ico-titulo{background:color-mix(in srgb,var(--azul-400) 16%,var(--carta));border-color:color-mix(in srgb,var(--azul-400) 40%,var(--linha))}
.m3 .item.on{background:linear-gradient(90deg,rgba(37,161,239,.22),rgba(37,161,239,.06));box-shadow:inset 3px 0 0 var(--azul-400)}
.m3 .bt.forte{background:linear-gradient(180deg,var(--azul-400),var(--azul-500));border-color:var(--azul-500)}
.m3 .bt.forte:hover{background:linear-gradient(180deg,var(--azul-300),var(--azul-400))}
.m3 .bt.destaque{background:linear-gradient(135deg,var(--azul-400),var(--violeta));border:0;color:#fff;padding:11px 18px;font-size:14px}
.m3 .bt.destaque .sub{color:rgba(255,255,255,.8);font-weight:400}
.m3 .acima-card{display:flex;justify-content:flex-end;margin:0 0 10px}
.m3 .cartao{border-color:color-mix(in srgb,var(--azul-400) 12%,var(--linha))}
.m3 .pilula.aprovado,.m3 .pilula.pago,.m3 .pilula.entregue{background:color-mix(in srgb,var(--ok) 16%,transparent)}
.m3 .pilula.aberto,.m3 .pilula.aberta{background:color-mix(in srgb,var(--atencao) 14%,transparent)}
.m3 .pilula.recusado,.m3 .pilula.cancelada,.m3 .pilula.vencido,.m3 .pilula.expirado{background:color-mix(in srgb,var(--erro) 14%,transparent)}
.m3 .pilula.enviado,.m3 .pilula.producao{background:color-mix(in srgb,var(--violeta) 16%,transparent);border-color:var(--violeta);color:#C9BFFF}
.m3 .selo{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--coral);background:color-mix(in srgb,var(--coral) 15%,transparent);
  padding:3px 8px;border-radius:20px}

/* alinhamento: rótulo numa linha só, campo sempre na mesma altura */
.m3 .grade{align-items:start}
.m3 .grade > div > label,.m3 .grade > .auto > label,.m3 .grade .auto > label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m3 .campo.pc input{padding-right:46px}
.m3 .campo .sufx{right:12px}
.m3 .grade.dois{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
@media (max-width:700px){ .m3 .grade.dois{grid-template-columns:1fr} }
.m3 .dim{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.m3 .dim .campo.pc input{padding-right:34px}

/* kanban */
.m3 .kanban{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(240px,1fr);gap:12px;overflow-x:auto;padding-bottom:8px;margin-bottom:12px}
.m3 .kcol{--cor-col:var(--aco-400);background:var(--carta);border:1px solid var(--linha);border-radius:var(--r);border-top:3px solid var(--cor-col);display:flex;flex-direction:column;min-height:260px}
.m3 .kcol.sobre{border-color:var(--cor-col);background:color-mix(in srgb,var(--cor-col) 8%,var(--carta))}
.m3 .kcab{display:flex;align-items:center;gap:8px;padding:12px 12px 4px}
.m3 .kcab b{font-size:14.5px}
.m3 .kcont{margin-left:auto;font-size:12px;font-weight:700;padding:2px 8px;border-radius:12px;background:color-mix(in srgb,var(--cor-col) 20%,transparent);color:var(--cor-col)}
.m3 .kcont.estourou{background:var(--erro);color:#fff}
.m3 .cadeado{color:var(--muda)}
.m3 .kres{padding:0 12px 8px;font-size:12px;color:var(--fraca)}
.m3 .kcards{display:flex;flex-direction:column;gap:8px;padding:0 10px 10px;flex:1}
.m3 .kcard{background:var(--prussia-950);border:1px solid var(--linha);border-left:3px solid var(--cor-col);border-radius:var(--r);cursor:grab}
.m3 .kcard:active{cursor:grabbing}
.m3 .kcorpo{display:flex;flex-direction:column;gap:3px;width:100%;text-align:left;background:none;border:0;color:inherit;font:inherit;padding:10px 10px 4px;cursor:pointer}
.m3 .kl1{display:flex;gap:8px;align-items:baseline}.m3 .kl1 b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m3 .knum{font-size:12px;color:var(--muda)}.m3 .kqtd{font-size:12.5px;font-weight:700;color:var(--cor-col)}
.m3 .kvalor{font-size:16px;font-weight:700;color:var(--azul-300)}
.m3 .kl2{font-size:12px;color:var(--fraca)}
.m3 .kmov{display:flex;justify-content:flex-end;gap:4px;padding:0 8px 8px}
.m3 .kvazio{border:1px dashed var(--linha);border-radius:var(--r);padding:24px 8px;text-align:center;color:var(--muda);font-size:12.5px}
.m3 .link.perda{font-size:12px;color:var(--coral);align-self:flex-start;margin-top:2px}
.m3 .col-edit{display:flex;flex-direction:column;gap:8px}
.m3 .col-linha{display:grid;grid-template-columns:32px 1fr auto 110px 34px;gap:8px;align-items:center;border:1px solid var(--linha);border-radius:var(--r);padding:8px}
.m3 .col-linha .ordem{display:flex;flex-direction:column;gap:2px}
.m3 .cores-col{display:flex;gap:4px}.m3 .cores-col button{width:18px;height:18px;border-radius:50%;border:0;cursor:pointer}
.m3 .cores-col button.on{outline:2px solid #fff;outline-offset:1px}
.m3 .wip input{text-align:right}

/* calendário */
.m3 .cal .cabeca h2{min-width:170px;text-align:center}
.m3 .filtro-chips,.m3 .chips-canais{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.m3 .chip-f{--cor-col:var(--azul-400);display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:20px;border:1px solid var(--linha);background:var(--prussia-950);
  color:var(--fraca);font:inherit;font-size:12.5px;cursor:pointer}
.m3 .chip-f i{width:8px;height:8px;border-radius:50%;background:var(--cor-col)}
.m3 .chip-f.on{color:var(--tinta);border-color:var(--cor-col);background:color-mix(in srgb,var(--cor-col) 15%,var(--prussia-950))}
.m3 .chip-f .sub{font-size:11.5px}
.m3 .mes{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.m3 .dsem{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muda);text-align:center;padding-bottom:4px}
.m3 .dia{aspect-ratio:1.15;border:1px solid var(--linha);border-radius:6px;background:var(--prussia-950);color:var(--tinta);cursor:pointer;display:flex;flex-direction:column;
  align-items:flex-start;justify-content:space-between;padding:6px;font:inherit;min-width:0}
.m3 .dia:hover{border-color:var(--aco-600)}
.m3 .dia.hoje{border-color:var(--azul-400)}.m3 .dia.hoje .n{color:var(--azul-300);font-weight:700}
.m3 .dia.sel{background:color-mix(in srgb,var(--azul-400) 16%,var(--prussia-950));border-color:var(--azul-400)}
.m3 .dia .pontos{display:flex;gap:3px;flex-wrap:wrap;align-items:center}.m3 .dia .pontos i{width:7px;height:7px;border-radius:50%}
.m3 .dia .pontos small{font-size:10px;color:var(--fraca)}
.m3 .lista-evt{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.m3 .lista-evt li{display:flex;gap:6px;align-items:center}
.m3 .lista-evt button{flex:1;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid var(--linha);border-left:3px solid var(--cor-col);background:var(--prussia-950);
  color:var(--tinta);border-radius:var(--r);padding:8px 10px;font:inherit;font-size:13px;cursor:pointer}
.m3 .lista-evt button i{width:8px;height:8px;border-radius:50%;background:var(--cor-col);flex:0 0 8px}
.m3 .lista-evt button b{margin-left:auto}

/* tour */
.m3 .tour{border-color:color-mix(in srgb,var(--coral) 45%,var(--linha));background:linear-gradient(180deg,color-mix(in srgb,var(--coral) 7%,var(--carta)),var(--carta) 60%)}
.m3 .tour .progresso{height:6px;background:var(--prussia-950);border-radius:3px;overflow:hidden;margin-bottom:12px}
.m3 .tour .progresso span{display:block;height:100%;background:linear-gradient(90deg,var(--coral),var(--azul-400))}
.m3 .passos-tour{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.m3 .passos-tour li{display:flex;align-items:center;gap:14px;border:1px solid var(--linha);border-radius:var(--r);padding:12px 14px;background:var(--prussia-950)}
.m3 .passos-tour li.atual{border-color:color-mix(in srgb,var(--coral) 60%,var(--linha));background:color-mix(in srgb,var(--coral) 6%,var(--prussia-950))}
.m3 .passos-tour li.ok{opacity:.6}
.m3 .passos-tour .num{width:28px;height:28px;flex:0 0 28px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--carta2);color:var(--fraca)}
.m3 .passos-tour li.atual .num{background:var(--coral);color:#fff}.m3 .passos-tour li.ok .num{background:var(--ok);color:#fff}
.m3 .passos-tour .txt{flex:1;display:flex;flex-direction:column;min-width:0}
.m3 .conheca{display:flex;flex-wrap:wrap;gap:14px;align-items:center;border-top:1px solid var(--linha);margin-top:14px;padding-top:12px}
.m3 .conheca .link{display:inline-flex;align-items:center;gap:5px;font-weight:500}

/* impressão: placas */
.m3 .placas-lista{margin-top:14px;border:1px solid var(--linha);border-radius:var(--r);padding:12px;background:var(--prussia-950)}
.m3 .pl-cab{font-size:12.5px;color:var(--fraca);margin-bottom:8px}
.m3 .pl-linha{display:grid;grid-template-columns:70px 1fr 1fr 30px;gap:8px;align-items:center;margin-bottom:6px}
.m3 .pl-tot{display:flex;gap:8px;align-items:baseline;justify-content:flex-end;padding-top:6px;border-top:1px solid var(--linha)}
.m3 .pl-tot b{color:var(--azul-300)}

/* empresa e orçamento */
.m3 .empresa{display:flex;flex-direction:column;gap:18px;margin-top:16px}
.m3 .bloco-form h3{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--azul-300);margin-bottom:10px}
.m3 .cor-destaque{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.m3 .cor-destaque button{width:30px;height:30px;border-radius:50%;border:2px solid var(--prussia-950);cursor:pointer;box-shadow:0 0 0 1px var(--aco-600)}
.m3 .cor-destaque button.on{box-shadow:0 0 0 2px #fff}
.m3 .outra-cor{position:relative;width:30px;height:30px;border-radius:50%;border:1px dashed var(--aco-500);display:grid!important;place-items:center;cursor:pointer;margin:0}
.m3 .outra-cor input{position:absolute;inset:0;opacity:0;cursor:pointer}
.m3 .previa-orc{margin-top:14px;background:#fff;border-radius:8px;overflow:hidden;color:#0C2130;max-width:420px;border-top:6px solid var(--acc)}
.m3 .po-topo{display:flex;align-items:center;padding:12px 14px}.m3 .po-topo img{max-height:28px}
.m3 .po-tag{font-size:10px;letter-spacing:.14em;font-weight:800;color:var(--acc)}
.m3 .po-linhas{padding:0 14px;display:flex;flex-direction:column;gap:6px}.m3 .po-linhas span{height:8px;border-radius:4px;background:#EBF1F5}
.m3 .po-total{display:flex;justify-content:space-between;align-items:center;margin:12px 14px 14px;padding:10px 12px;background:var(--acc);border-radius:6px;color:#fff}
.m3 .teto{margin-top:14px}

/* faixas de taxa */
.m3 .faixa-canal{border:1px solid var(--linha);border-radius:var(--r);padding:10px 12px;margin-bottom:8px}
.m3 .faixa-linhas{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.m3 .faixa-linha{display:grid;grid-template-columns:130px 1fr 110px 1fr 30px;gap:8px;align-items:center}

/* anúncios */
.m3 .abas{display:flex;gap:4px;border-bottom:1px solid var(--linha);margin:18px 0 14px;overflow-x:auto}
.m3 .abas button{border:0;background:none;color:var(--fraca);font:inherit;font-weight:600;padding:10px 14px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.m3 .abas button.on{color:var(--tinta);border-bottom-color:var(--azul-400)}
.m3 label .cont{float:right;font-weight:400;color:var(--muda);font-size:12px}

/* filamento: cores da marca */
.m3 .paleta-marca{margin-top:14px}
.m3 .sw-marca{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;margin-top:8px;max-height:220px;overflow-y:auto;padding-right:4px}
.m3 .sw-marca button{display:flex;flex-direction:column;align-items:stretch;gap:4px;border:1px solid var(--linha);background:var(--prussia-950);border-radius:6px;padding:4px;cursor:pointer;color:var(--fraca);font:inherit;font-size:11px}
.m3 .sw-marca button i{height:34px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(235,241,245,.15)}
.m3 .sw-marca button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m3 .sw-marca button.on{border-color:var(--azul-400);color:var(--tinta)}

/* consignação e kits */
.m3 .grade-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.m3 .ponto .cabeca{align-items:center}
.m3 .linha-rem{display:grid;grid-template-columns:1fr 80px 110px 30px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--linha)}
.m3 .metas{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.m3 .meta{border:1px solid var(--linha);border-radius:var(--r);padding:14px;background:var(--prussia-950)}
.m3 .meta-cab{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.m3 .meta-in{width:150px}
.m3 .meta-num span:first-child{font-size:20px;font-weight:700}
.m3 .progresso{height:8px;background:var(--prussia-950);border-radius:4px;overflow:hidden;margin:8px 0}
.m3 .meta .progresso{background:var(--carta2)}
.m3 .progresso span{display:block;height:100%;background:var(--azul-400)}.m3 .progresso span.ok{background:var(--ok)}.m3 .progresso span.curto{background:var(--ambar)}
.m3 .tit-txt{display:flex;flex-direction:column;gap:2px;min-width:0}
.m3 .tit-txt .sub{display:block;font-size:13.5px}
.m3 .tit-txt .sub::first-letter{text-transform:uppercase}
.m3 .modelo-imp{display:flex;gap:16px;align-items:center}
.m3 .modelo-imp img{width:88px;height:88px;object-fit:cover;border-radius:var(--r);border:1px solid var(--linha);background:#fff}
.m3 .mi-txt{display:flex;flex-direction:column;gap:2px;min-width:0}.m3 .mi-txt b{font-size:16px}
.m3 .sugestao{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;font-size:13.5px;color:var(--fraca);margin:0 0 12px;padding:8px 10px;border:1px dashed var(--aco-600);border-radius:var(--r)}
.m3 .chip-sel .sub{margin-left:4px;font-size:11.5px}
.m3 .tag-auto{margin-left:8px;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ciano);background:color-mix(in srgb,var(--ciano) 14%,transparent);padding:1px 6px;border-radius:10px}
.m3 .link.restaura{margin-left:8px;font-size:11.5px;font-weight:500}
.m3 .aviso-cor{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:-2px 0 10px 52px;padding:7px 10px;border-left:2px solid var(--ambar);background:color-mix(in srgb,var(--ambar) 8%,var(--prussia-950));font-size:12.5px;border-radius:0 var(--r) var(--r) 0}
.m3 .aviso-cor .link{font-size:12.5px}
.m3 .tokens{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
@media (max-width:700px){ .m3 .aviso-cor{margin-left:0} }
.m3 .rot-auto{display:flex;align-items:baseline;gap:8px;min-width:0;margin-bottom:5px}
.m3 .rot-auto label{margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.m3 .rot-auto .tag-auto,.m3 .rot-auto .restaura,.m3 .rot-auto .cont{flex:0 0 auto;margin-left:0}
.m3 .rot-auto .cont{margin-left:auto;float:none}
.m3 .alt-ab{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;margin-top:8px;padding:8px 10px;border:1px dashed var(--aco-600);border-radius:var(--r);font-size:13px}
.m3 .alt-ab .rot{flex-basis:100%}
.m3 .mono,.m3 .mono-in{font-variant-numeric:tabular-nums;letter-spacing:.01em}
.m3 table.conf td{vertical-align:top}.m3 tr.linha-erro td{background:color-mix(in srgb,var(--erro) 7%,transparent)}
.m3 .faixa-tag{display:block;font-size:11px;color:var(--muda);white-space:nowrap}
.m3 tr.canal-on td{background:color-mix(in srgb,var(--azul-400) 14%,transparent)}.m3 tr.canal-on td:first-child{box-shadow:inset 3px 0 0 var(--azul-400)}
.m3 .preco-manual{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.m3 .ref-sugerido{font-size:12.5px;color:var(--fraca);padding:8px 10px;border:1px dashed var(--aco-600);border-radius:var(--r);display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
.m3 .ref-sugerido b{color:var(--tinta)}
@media (prefers-reduced-motion: reduce){.m3 *{animation:none!important;transition:none!important}}
`;

/* ===== ícones ===== */
const P = {
  calc:'M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM9 6h6M9 11h2M13 11h2M9 15h2M13 15h2M9 19h6',
  cubo:'M12 2l9 5v10l-9 5-9-5V7l9-5zM3 7l9 5 9-5M12 12v10',
  users:'M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8M22 20v-2a4 4 0 00-3-3.87M16 2.13a4 4 0 010 7.75',
  doc:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5',
  tag:'M20 12l-8 8-9-9V3h8zM7.5 7.5h.01',
  grana:'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  eng:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  mais:'M12 5v14M5 12h14',
  x:'M18 6L6 18M6 6l12 12',
  lixo:'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6',
  seta:'M9 18l6-6-6-6',
  volta:'M19 12H5M12 19l-7-7 7-7',
  check:'M20 6L9 17l-5-5',
  baixa:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  copia:'M9 9h10a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V11a2 2 0 012-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
  menu:'M3 12h18M3 6h18M3 18h18',
  play:'M5 3l14 9-14 9V3z',
  limpa:'M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M14 3H10',
  grafico:'M3 3v18h18M7 15l4-4 3 3 5-6',
  casa:'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  bobina:'M3 12a9 9 0 1018 0 9 9 0 10-18 0M9 12a3 3 0 106 0 3 3 0 10-6 0',
  caixa:'M3 7h18v4H3zM5 11v9h14v-9M10 15h4',
  funil:'M3 4h18l-7 8v6l-4 2v-8z',
  fila:'M4 6h16M4 12h16M4 18h10',
  caminhao:'M1 7h13v10H1zM14 10h4l3 3v4h-7M5.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3M17.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3',
  calendario:'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4',
  loja:'M3 9l1.5-5h15L21 9M3 9h18v11H3zM9 20v-6h6v6',
  kit:'M20 7l-8-4-8 4 8 4 8-4zM4 7v10l8 4 8-4V7M12 11v10',
  lapis:'M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z',
  externo:'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  sino:'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  sair:'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  imagem:'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21',
};
function Ico({ n, s = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[n].split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
    </svg>
  );
}
/* marca-mãe de uma cor. bicolor só acima de 160px (tela de entrada) */
function Marca({ altura = 18, bicolor = false }) {
  return (
    <svg viewBox={LOGO_VB} style={{ height: altura, width: 'auto', display: 'block' }} role="img" aria-label="Make3Lab">
      <path fill={bicolor ? 'var(--azul-400)' : 'currentColor'} d={LOGO_MAKE3} />
      <path fill="currentColor" d={LOGO_LAB} />
    </svg>
  );
}

/* ===== helpers ===== */
const uid = () => Math.random().toString(36).slice(2, 9);
const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nf = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nn = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
const r2 = (n) => Math.round(n * 100) / 100;
const hhmm = (h) => {
  const t = Math.max(0, h), H = Math.floor(t), M = Math.round((t - H) * 60);
  return H >= 48 ? `${Math.floor(H / 24)}d ${H % 24}h` : `${H}h${String(M).padStart(2, '0')}`;
};
const hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const proxNumero = (lista) => lista.reduce((m, x) => Math.max(m, Number(x.numero) || 0), 0) + 1;
const dbr = (iso) => iso ? iso.split('-').reverse().join('/') : '';

/* dinheiro sempre com R$ na frente, percentual sempre com % atrás.
   O estado continua guardando fração onde o cálculo espera fração:
   a conversão acontece só na tela. */
function CampoMoeda({ id, rot, valor, onChange, step = '0.01', dica }) {
  return (
    <div>
      {rot && <label htmlFor={id}>{rot}</label>}
      <div className="campo">
        <span className="pref">R$</span>
        <input id={id} type="number" step={step} min="0" value={valor}
          style={{ textAlign: 'right' }} onChange={(e) => onChange(e.target.value)} />
      </div>
      {dica && <span className="dica">{dica}</span>}
    </div>
  );
}
function CampoPct({ id, rot, fracao, onChange, step = '0.1', dica, base = 100 }) {
  const mostrado = Math.round((Number(fracao) || 0) * base * 100) / 100;
  return (
    <div>
      {rot && <label htmlFor={id}>{rot}</label>}
      <div className="campo pc">
        <input id={id} type="number" step={step} min="0" value={mostrado}
          onChange={(e) => onChange((Number(e.target.value) || 0) / base)} />
        <span className="sufx">%</span>
      </div>
      {dica && <span className="dica">{dica}</span>}
    </div>
  );
}

function Check({ on, onClick, rot }) {
  return (
    <button type="button" className={`chk ${on ? 'on' : ''}`} onClick={onClick}
      aria-pressed={on} aria-label={rot} title={rot}>
      {on && <Ico n="check" s={10} />}
    </button>
  );
}


function _dur(txt){
  // aceita "1h 23m 45s", "2d 3h 4m", "01:23:45"
  var d = 0;
  var rel = /(\d+)\s*d/i.exec(txt), reh = /(\d+)\s*h/i.exec(txt);
  var rem = /(\d+)\s*m(?!s)/i.exec(txt), res = /(\d+)\s*s/i.exec(txt);
  if(rel) d += +rel[1] * 1440;
  if(reh) d += +reh[1] * 60;
  if(rem) d += +rem[1];
  if(res) d += +res[1] / 60;
  if(!d){
    var hms = /(\d+):(\d+):(\d+)/.exec(txt);
    if(hms) d = +hms[1]*60 + +hms[2] + (+hms[3])/60;
  }
  return d; // minutos
}

function _lista(s){
  return String(s).split(/[;,]/).map(function(x){ return x.trim(); }).filter(Boolean);
}

function analisarGcode(txt){
  var out = { fils:[], minutos:0, camadas:0, avisos:[] };

  var tipos = /^;\s*filament_type\s*=\s*(.+)$/im.exec(txt);
  var cores = /^;\s*filament_colour\s*=\s*(.+)$/im.exec(txt);
  var usados = /^;\s*(?:total\s+)?filament used \[g\]\s*=\s*(.+)$/im.exec(txt);
  var pesoTotal = /^;\s*total filament weight \[g\]\s*:\s*([\d.]+)/im.exec(txt);

  var lt = tipos ? _lista(tipos[1]) : [];
  var lc = cores ? _lista(cores[1]) : [];
  var lg = usados ? _lista(usados[1]).map(Number) : [];

  if(lg.length){
    for(var i = 0; i < lg.length; i++){
      if(!(lg[i] > 0)) continue;            // extrusor carregado mas não usado
      out.fils.push({ tipo: lt[i] || lt[0] || '', cor: lc[i] || lc[0] || '', gramas: lg[i] });
    }
  } else if(pesoTotal){
    out.fils.push({ tipo: lt[0] || '', cor: lc[0] || '', gramas: +pesoTotal[1] });
    out.avisos.push('O arquivo trouxe só o peso total, sem quebra por cor.');
  }

  var t = /^;\s*model printing time:\s*([^\n;]+)/im.exec(txt)
       || /^;\s*estimated printing time[^=\n]*=\s*([^\n]+)/im.exec(txt)
       || /^;TIME:\s*(\d+)\s*$/im.exec(txt);
  if(t) out.minutos = /^;TIME:/i.test(t[0]) ? Math.round(+t[1] / 60) : _dur(t[1]);

  var cam = /^;\s*total layer number:\s*(\d+)/im.exec(txt)
         || /^;LAYER_COUNT:\s*(\d+)/im.exec(txt);
  if(cam) out.camadas = +cam[1];

  if(!out.fils.length) out.avisos.push('Não achei consumo de filamento neste arquivo.');
  if(!out.minutos)     out.avisos.push('Não achei tempo de impressão neste arquivo.');
  return out;
}

/* Leitor de zip por fatias: o .3mf pode ter 100 MB ou mais, e carregar
   tudo na memória trava o celular. Só o índice e a entrada desejada são lidos. */
async function _abrirZip(file){
  var tam = file.size, cauda = Math.min(tam, 1 << 20);
  var base = tam - cauda;
  var buf = await file.slice(base).arrayBuffer();
  var dv = new DataView(buf), eocd = -1;
  for(var i = buf.byteLength - 22; i >= 0; i--){
    if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  }
  if(eocd < 0) throw new Error('Não parece um zip válido (.3mf corrompido?).');

  var qtd = dv.getUint16(eocd + 10, true);
  var cdTam = dv.getUint32(eocd + 12, true);
  var cdOff = dv.getUint32(eocd + 16, true);

  if(qtd === 0xFFFF || cdOff === 0xFFFFFFFF || cdTam === 0xFFFFFFFF){
    for(var j = eocd - 20; j >= 0; j--){
      if(dv.getUint32(j, true) === 0x07064b50){
        var loc = Number(dv.getBigUint64(j + 8, true));
        var b64 = await file.slice(loc, loc + 56).arrayBuffer();
        var d64 = new DataView(b64);
        if(d64.getUint32(0, true) === 0x06064b50){
          qtd   = Number(d64.getBigUint64(32, true));
          cdTam = Number(d64.getBigUint64(40, true));
          cdOff = Number(d64.getBigUint64(48, true));
        }
        break;
      }
    }
  }

  var cdBuf, cdBase;
  if(cdOff >= base){ cdBuf = buf; cdBase = base; }
  else { cdBuf = await file.slice(cdOff, cdOff + cdTam + 64).arrayBuffer(); cdBase = cdOff; }
  var cd = new DataView(cdBuf), td = new TextDecoder();

  var pos = cdOff - cdBase, itens = [];
  for(var k = 0; k < qtd; k++){
    if(pos + 46 > cdBuf.byteLength || cd.getUint32(pos, true) !== 0x02014b50) break;
    var metodo  = cd.getUint16(pos + 10, true);
    var compTam = cd.getUint32(pos + 20, true);
    var nomeTam = cd.getUint16(pos + 28, true);
    var extTam  = cd.getUint16(pos + 30, true);
    var comTam  = cd.getUint16(pos + 32, true);
    var local   = cd.getUint32(pos + 42, true);
    var nome    = td.decode(new Uint8Array(cdBuf, pos + 46, nomeTam));
    if(compTam === 0xFFFFFFFF || local === 0xFFFFFFFF){
      var e = pos + 46 + nomeTam, lim = e + extTam;
      while(e + 4 <= lim){
        var id = cd.getUint16(e, true), t = cd.getUint16(e + 2, true), q = e + 4;
        if(id === 0x0001){
          if(cd.getUint32(pos + 24, true) === 0xFFFFFFFF) q += 8;
          if(compTam === 0xFFFFFFFF){ compTam = Number(cd.getBigUint64(q, true)); q += 8; }
          if(local === 0xFFFFFFFF){ local = Number(cd.getBigUint64(q, true)); }
          break;
        }
        e = q + t;
      }
    }
    pos += 46 + nomeTam + extTam + comTam;
    itens.push({ nome:nome, metodo:metodo, compTam:compTam, local:local });
  }

  async function extrair(it){
    var cab = new DataView(await file.slice(it.local, it.local + 30).arrayBuffer());
    var ini = it.local + 30 + cab.getUint16(26, true) + cab.getUint16(28, true);
    var bruto = await file.slice(ini, ini + it.compTam).arrayBuffer();
    if(it.metodo === 0) return new TextDecoder().decode(bruto);
    if(it.metodo !== 8) throw new Error('Compressão não suportada no .3mf (método ' + it.metodo + ').');
    if(typeof DecompressionStream === 'undefined')
      throw new Error('Este navegador não descompacta .3mf. Exporte o G-code puro.');
    var st = new Blob([bruto]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(st).text();
  }

  // lê só até achar o termo ou bater o limite: os .model de peça pintada
  // passam de 10 MB descomprimidos e não cabem na memória do celular
  async function contem(it, termos, limite){
    var cab = new DataView(await file.slice(it.local, it.local + 30).arrayBuffer());
    var ini = it.local + 30 + cab.getUint16(26, true) + cab.getUint16(28, true);
    var bruto = await file.slice(ini, ini + it.compTam).arrayBuffer();
    var blob = new Blob([bruto]);
    var fluxo = it.metodo === 8
      ? (typeof DecompressionStream === 'undefined' ? null : blob.stream().pipeThrough(new DecompressionStream('deflate-raw')))
      : blob.stream();
    if(!fluxo) return false;
    var rd = fluxo.getReader(), dec = new TextDecoder(), lidos = 0, resto = '';
    try{
      while(lidos < limite){
        var r = await rd.read();
        if(r.done) break;
        lidos += r.value.length;
        var pedaco = resto + dec.decode(r.value, { stream: true });
        for(var i = 0; i < termos.length; i++){
          if(pedaco.indexOf(termos[i]) >= 0){ try{ await rd.cancel(); }catch(e){} return true; }
        }
        resto = pedaco.slice(-64);
      }
    }finally{ try{ await rd.cancel(); }catch(e){} }
    return false;
  }

  return {
    nomes: itens.map(function(x){ return x.nome; }),
    async bytes(re){
      var it = itens.find(function(x){ return re.test(x.nome); }); if(!it) return null;
      var cab = new DataView(await file.slice(it.local, it.local + 30).arrayBuffer());
      var ini = it.local + 30 + cab.getUint16(26, true) + cab.getUint16(28, true);
      var bruto = await file.slice(ini, ini + it.compTam).arrayBuffer();
      if(it.metodo === 0) return bruto;
      if(it.metodo !== 8 || typeof DecompressionStream === 'undefined') return null;
      return await new Response(new Blob([bruto]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    },
    async inicio(re, limite){
      var it = itens.find(function(x){ return re.test(x.nome); }); if(!it) return null;
      var cab = new DataView(await file.slice(it.local, it.local + 30).arrayBuffer());
      var ini = it.local + 30 + cab.getUint16(26, true) + cab.getUint16(28, true);
      var blob = new Blob([await file.slice(ini, ini + it.compTam).arrayBuffer()]);
      var fluxo = it.metodo === 8 ? (typeof DecompressionStream === 'undefined' ? null : blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))) : blob.stream();
      if(!fluxo) return null;
      var rd = fluxo.getReader(), dec = new TextDecoder(), txt = '';
      try{ while(txt.length < limite){ var r = await rd.read(); if(r.done) break; txt += dec.decode(r.value, { stream: true }); } }
      finally{ try{ await rd.cancel(); }catch(e){} }
      return txt;
    },
    async texto(re){
      var it = itens.find(function(x){ return re.test(x.nome); });
      return it ? await extrair(it) : null;
    },
    async temPintura(){
      var modelos = itens.filter(function(x){ return /\.model$/i.test(x.nome); })
                         .sort(function(a, b){ return b.compTam - a.compTam; }).slice(0, 3);
      for(var i = 0; i < modelos.length; i++){
        if(await contem(modelos[i], ['paint_color=', 'mmu_segmentation='], 24 * 1024 * 1024)) return true;
      }
      return false;
    }
  };
}

/* O Bambu Studio grava o resultado do fatiamento no próprio projeto.
   É por isso que um .3mf do MakerWorld pode trazer peso, cor e tempo:
   ficam em Metadata/slice_info.config, sem nenhum G-code por perto. */
function analisarSliceInfo(xml, idx){
  var out = { fils:[], minutos:0, camadas:0, avisos:[], placas:0, impressora:'', bico:'' };
  var placas = xml.split('<plate>').slice(1);
  out.placas = placas.length;
  out.placa = Math.min(idx || 0, placas.length - 1);
  if(!placas.length){ out.avisos.push('Nenhuma placa fatiada neste projeto.'); return out; }
  var p = placas[out.placa];

  var pred = /key="prediction"\s+value="([\d.]+)"/.exec(p);
  if(pred) out.minutos = +pred[1] / 60;

  var mod = /key="printer_model_id"\s+value="([^"]+)"/.exec(p);
  if(mod) out.impressora = mod[1];
  var bic = /key="nozzle_diameters"\s+value="([^"]+)"/.exec(p);
  if(bic) out.bico = bic[1];

  var re = /<filament[^>]*>/g, m;
  while((m = re.exec(p))){
    var tag = m[0];
    var tipo = /type="([^"]*)"/.exec(tag), cor = /color="([^"]*)"/.exec(tag), g = /used_g="([\d.]+)"/.exec(tag);
    if(g && +g[1] > 0) out.fils.push({ tipo: tipo ? tipo[1] : '', cor: cor ? cor[1] : '', gramas: +g[1] });
  }
  if(!out.fils.length){
    var w = /key="weight"\s+value="([\d.]+)"/.exec(p);
    if(w) out.fils.push({ tipo:'', cor:'', gramas:+w[1] });
  }
  if(!out.fils.length) out.avisos.push('O projeto não traz consumo de filamento.');
  if(!out.minutos)     out.avisos.push('O projeto não traz tempo de impressão.');
  return out;
}

function _perfilDoProjeto(txt){
  var p = { impressora:'', perfil:'', bico:'', camada:'', compat:[] };
  try{
    var d = JSON.parse(txt);
    p.impressora = d.printer_model || '';
    p.perfil = d.printer_settings_id || '';
    p.bico = Array.isArray(d.nozzle_diameter) ? d.nozzle_diameter[0] : (d.nozzle_diameter || '');
    p.camada = d.layer_height || '';
    p.compat = d.print_compatible_printers || [];
  }catch(e){}
  return p;
}

/* Projeto montado mas não fatiado: não tem peso nem tempo, mas tem as cores
   e os tipos de filamento configurados, e quais slots os objetos usam.
   Dá para montar as linhas e deixar só as gramas em branco. */
function analisarProjeto(cfgTxt, modelTxt, plateTxt, trocasTxt, placaIdx, pintado){
  var out = { fils:[], minutos:0, camadas:0, avisos:[], perfil:{}, dim:'' };
  var d = {};
  try{ d = JSON.parse(cfgTxt); }catch(e){ return out; }

  out.perfil = {
    impressora: d.printer_model || '',
    perfil: d.printer_settings_id || '',
    bico: Array.isArray(d.nozzle_diameter) ? d.nozzle_diameter[0] : (d.nozzle_diameter || ''),
    camada: d.layer_height || ''
  };

  var cores = d.filament_colour || [], tipos = d.filament_type || [];

  // quais slots do AMS os objetos realmente usam
  var usados = [];
  if(modelTxt){
    var re = /key="extruder"\s+value="(\d+)"/g, m;
    while((m = re.exec(modelTxt))) if(usados.indexOf(+m[1]) < 0) usados.push(+m[1]);
  }
  // trocas de cor por camada (MultiAsSingle) usam slots que nenhum objeto declara
  if(trocasTxt){
    var bloco = trocasTxt.split('<plate>').filter(function(b){
      return b.indexOf('id="' + ((placaIdx || 0) + 1) + '"') >= 0;
    })[0] || '';
    var rt = /extruder="(\d+)"/g, mt;
    while((mt = rt.exec(bloco))) if(usados.indexOf(+mt[1]) < 0) usados.push(+mt[1]);
  }
  // peça pintada por região usa cores que nenhum objeto declara: traz todas
  if(pintado) usados = cores.map(function(_, i){ return i + 1; });
  if(!usados.length) usados = cores.map(function(_, i){ return i + 1; });
  usados.sort(function(a, b){ return a - b; });

  out.fils = usados.map(function(slot){
    return { tipo: tipos[slot - 1] || tipos[0] || 'PLA',
             cor: cores[slot - 1] || '', gramas: 0, slot: slot };
  });

  out.pintado = !!pintado;
  if(pintado)
    out.extras = 'Peça pintada por região: trouxe as ' + usados.length + ' cores do projeto. ' +
      'Quanto cada cor consome só sai do fatiamento.';
  else if(cores.length > usados.length)
    out.extras = 'O projeto tem ' + cores.length + ' cores no AMS e os objetos usam ' + usados.length +
      '. Se faltar alguma, adicione na mão.';

  if(plateTxt){
    try{
      var pj = JSON.parse(plateTxt), bb = pj.bbox_all;
      if(bb) out.dim = Math.round(bb[2] - bb[0]) + ' x ' + Math.round(bb[3] - bb[1]) + ' mm, ' +
                       (pj.bbox_objects || []).length + ' objeto(s)';
    }catch(e){}
  }
  return out;
}

/* foto e nome do modelo: capa do MakerWorld, miniatura da placa ou a miniatura embutida no G-code */
async function metaModelo(file, idx){
  var out = { titulo: '', designer: '', licenca: '', imagem: null };
  var tipo = function(n){ return /\.png$/i.test(n) ? 'image/png' : /\.webp$/i.test(n) ? 'image/webp' : 'image/jpeg'; };
  var foto = async function(buf, t){ try{ return await reduzirImagem(new File([buf], 'modelo', { type: t }), 480, 'image/jpeg'); }catch(e){ return null; } };
  var ent = function(x){ return String(x).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'"); };
  try{
    if(!/\.3mf$/i.test(file.name)){
      var txt = await file.slice(0, Math.min(file.size, 3 * 1024 * 1024)).text();
      var re = /; thumbnail(?:_(PNG|JPG|QOI))? begin (\d+)x(\d+) \d+\r?\n([\s\S]*?); thumbnail(?:_\w+)? end/g, m, melhor = null;
      while((m = re.exec(txt))){ if(m[1] === 'QOI') continue; var area = +m[2] * +m[3];
        if(!melhor || area > melhor.area) melhor = { area: area, t: m[1] === 'JPG' ? 'image/jpeg' : 'image/png', b64: m[4].replace(/^;\s?/gm, '').replace(/\s/g, '') }; }
      if(melhor){ var bin = atob(melhor.b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); out.imagem = await foto(u, melhor.t); }
      out.titulo = file.name.replace(/\.(gcode|gco)$/i, '');
      return out;
    }
    var zip = await _abrirZip(file);
    var cab = (await zip.inicio(/3D\/3dmodel\.model$/i, 96 * 1024)) || '';
    var meta = function(k){ var x = cab.match(new RegExp('<metadata name="' + k + '"[^>]*>([^<]*)</metadata>', 'i')); return x ? ent(x[1]).trim() : ''; };
    out.titulo = meta('Title'); out.designer = meta('Designer'); out.licenca = meta('License');
    if(!out.titulo){ var ms = await zip.texto(/model_settings\.config$/i); var pn = ms && ms.match(/key="plater_name" value="([^"]+)"/); out.titulo = pn ? ent(pn[1]) : ''; }
    if(!out.titulo) out.titulo = file.name.replace(/(\.gcode)?\.3mf$/i, '');
    var nomes = zip.nomes;
    var cand = [].concat(nomes.filter(function(n){ return /Auxiliaries\/Model Pictures\/.+\.(png|jpe?g|webp)$/i.test(n); }),
      nomes.filter(function(n){ return n === 'Metadata/plate_' + ((idx || 0) + 1) + '.png'; }), nomes.filter(function(n){ return n === 'Metadata/plate_1.png'; }),
      nomes.filter(function(n){ return /Metadata\/(thumbnail|top_\d+)\.png$/i.test(n); }), nomes.filter(function(n){ return /Thumbnails\/.+\.png$/i.test(n); }));
    for(var k = 0; k < cand.length; k++){
      var esc = cand[k].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var buf = await zip.bytes(new RegExp('^' + esc + '$')); if(buf){ out.imagem = await foto(buf, tipo(cand[k])); if(out.imagem) break; }
    }
  }catch(e){ /* sem foto ou nome: o import segue normal */ }
  return out;
}
const limparNome = (t) => { let x = String(t || '').replace(/\.(gcode|gco|3mf|stl)$/ig, '').replace(/[_]+/g, ' ').replace(/\s*[-–]\s*(plate|placa)\s*\d+/ig, '')
  .replace(/\(\d+\)|\bv\d+(\.\d+)*\b/ig, '').replace(/\s{2,}/g, ' ').trim(); return x ? (x[0].toUpperCase() + x.slice(1)).slice(0, 80) : ''; };
const licencaSemVenda = (l) => /\bNC\b|non-?commercial|nao comercial|não comercial|personal use/i.test(String(l || ''));

async function lerFatiado(file, placa){
  var r = await lerFatiadoBase(file, placa);
  r.modelo = await metaModelo(file, placa || 0);
  if(r.estimado && r.estimado.dim) r.modelo.dim = r.estimado.dim;
  return r;
}

async function lerFatiadoBase(file, placa){
  if(!/\.3mf$/i.test(file.name)){
    var LIM = 700 * 1024, partes = [];
    partes.push(await file.slice(0, Math.min(file.size, LIM)).text());
    if(file.size > LIM * 2) partes.push(await file.slice(file.size - LIM).text());
    var rg = analisarGcode(partes.join('\n'));
    rg.origem = 'gcode';
    return rg;
  }

  var zip = await _abrirZip(file);
  var idx = placa || 0;

  // 1. arquivo fatiado: o G-code está dentro
  var g = await zip.texto(/\.gcode$/i);
  if(g){ var r0 = analisarGcode(g); r0.origem = 'gcode'; return r0; }

  var cfg = await zip.texto(/project_settings\.config$/i);
  var perfil = cfg ? _perfilDoProjeto(cfg) : {};

  // 2. projeto salvo depois de fatiar: peso, cor e tempo ficam no slice_info
  var s = await zip.texto(/slice_info\.config$/i);
  if(s){
    var r = analisarSliceInfo(s, idx);
    if(r.fils.length || r.minutos){ r.origem = 'projeto'; r.perfil = perfil; return r; }
  }

  // 3. projeto montado sem fatiar: aproveita cores, tipos e perfil
  var placasJson = zip.nomes.filter(function(n){ return /Metadata\/plate_\d+\.json$/i.test(n); });
  if(cfg){
    var ms = await zip.texto(/model_settings\.config$/i);
    var pt = placasJson.length
      ? await zip.texto(new RegExp('Metadata/plate_' + (idx + 1) + '\\.json$', 'i'))
      : null;
    var tc = await zip.texto(/custom_gcode_per_layer\.xml$/i);
    var pintado = await zip.temPintura();
    var rp = analisarProjeto(cfg, ms, pt, tc, idx, pintado);
    if(rp.fils.length){
      rp.origem = 'parcial';
      rp.placas = placasJson.length || 1;
      rp.placa = Math.min(idx, Math.max(0, rp.placas - 1));
      try{
        var est = await estimarPlaca(zip, rp.placa, cfg, ms);
        if(est){ rp.fils.forEach(function(f){ f.gramas = est.gramas[f.slot] || 0; });
          var usadas = rp.fils.filter(function(f){ return f.gramas > 0; }); if(usadas.length) rp.fils = usadas; rp.estimado = est; rp.extras = ''; }
      }catch(e){ /* sem estimativa: segue com cores e sem gramas */ }
      return rp;
    }
  }

  if(zip.nomes.some(function(n){ return /3dmodel\.model$/i.test(n); }))
    throw new Error('Este .3mf tem a geometria mas nenhuma configuração de impressão. ' +
      'Abra no Bambu Studio ou Orca, fatie e exporte o arquivo da placa.');
  throw new Error('Não achei dados de impressão. Dentro do arquivo: ' + zip.nomes.slice(0, 6).join(', ') + '.');
}

function acharMaterial(tipo, materiais){
  var t = String(tipo || '').toUpperCase().replace(/[^A-Z+]/g, '');
  if(!t) return null;
  var exato = materiais.find(function(m){ return m.nome.toUpperCase().replace(/[^A-Z+]/g,'') === t; });
  if(exato) return exato;
  return materiais.find(function(m){
    var n = m.nome.toUpperCase().replace(/[^A-Z+]/g,'');
    return n.indexOf(t) === 0 || t.indexOf(n) === 0;
  }) || null;
}


/* ===== dados de demonstração ===== */
const D_MATERIAIS = [
  { id: 'm1', nome: 'PLA', preco_kg: 96, perda_pct: 0.05 },
  { id: 'm2', nome: 'PLA+', preco_kg: 110, perda_pct: 0.05 },
  { id: 'm3', nome: 'PLA Silk', preco_kg: 120, perda_pct: 0.06 },
  { id: 'm4', nome: 'PETG', preco_kg: 129, perda_pct: 0.07 },
  { id: 'm5', nome: 'ABS', preco_kg: 110, perda_pct: 0.12 },
  { id: 'm6', nome: 'ASA', preco_kg: 160, perda_pct: 0.12 },
  { id: 'm7', nome: 'TPU flex', preco_kg: 189, perda_pct: 0.10 },
  { id: 'm8', nome: 'Nylon/PA', preco_kg: 230, perda_pct: 0.14 },
  { id: 'm9', nome: 'PLA-CF', preco_kg: 260, perda_pct: 0.08 },
  { id: 'm10', nome: 'PVA solúvel', preco_kg: 400, perda_pct: 0.05 },
];
const D_IMPRESSORAS = [
  { id: 'i1', nome: 'Impressora 1', potencia_w: 150, valor_compra: 2500, vida_util_h: 5000, manutencao_hora: 0.15 },
];
const D_CANAIS = [
  { id: 'c1', nome: 'Balcão / WhatsApp', taxa_pct: 0, taxa_fixa: 0 },
  { id: 'c2', nome: 'Mercado Livre Clássico', taxa_pct: 0.14, taxa_fixa: 6.75 },
  { id: 'c3', nome: 'Mercado Livre Premium', taxa_pct: 0.19, taxa_fixa: 6.75 },
  { id: 'c4', nome: 'Shopee', taxa_pct: 0.20, taxa_fixa: 4, faixas: [{ ate: 79.99, taxa_pct: 0.20, taxa_fixa: 4 }, { ate: 99.99, taxa_pct: 0.14, taxa_fixa: 16 },
    { ate: 199.99, taxa_pct: 0.14, taxa_fixa: 20 }, { ate: 999999, taxa_pct: 0.14, taxa_fixa: 26 }] },
  { id: 'c5', nome: 'Amazon (plano Individual)', taxa_pct: 0.12, taxa_fixa: 2 },
  { id: 'c6', nome: 'TikTok Shop', taxa_pct: 0.10, taxa_fixa: 4, faixas: [{ ate: 49.99, taxa_pct: 0.10, taxa_fixa: 4 }, { ate: 999999, taxa_pct: 0.06, taxa_fixa: 6 }] },
  { id: 'c7', nome: 'Instagram (venda direta)', taxa_pct: 0, taxa_fixa: 0 },
];
const D_PARAMS = { setup_padrao: 8, pos_padrao: 6, gramas_hora: 9, tarifa_kwh: 0.881, valor_hora_operador: 25, margem_padrao: 1.8, taxa_refugo: 0.08, imposto_pct: 0, alerta_filamento_g: 250, marcas_logo: {} };
const D_FORMAS = [
  { id: 'f1', nome: 'PIX', taxa_pct: 0, taxa_fixa: 0, ativa: true },
  { id: 'f2', nome: 'Dinheiro', taxa_pct: 0, taxa_fixa: 0, ativa: true },
  { id: 'f3', nome: 'Débito', taxa_pct: 0.0199, taxa_fixa: 0, ativa: true },
  { id: 'f4', nome: 'Crédito à vista', taxa_pct: 0.0399, taxa_fixa: 0, ativa: true },
  { id: 'f5', nome: 'Crédito parcelado', taxa_pct: 0.0599, taxa_fixa: 0, ativa: true },
  { id: 'f6', nome: 'Boleto', taxa_pct: 0, taxa_fixa: 3.49, ativa: true },
];
const D_EMPRESA = {
  nome: 'Loja de demonstração', cnpj: '', whatsapp: '(21) 90000-0000',
  email: '', instagram: '', cidade: 'Rio de Janeiro, RJ', pix: '', logo_path: null, usarLogo: true,
};
const D_INSUMOS = [
  { id: 's1', nome: 'Chaveiro (argola)', categoria: 'Ferragem', unidade: 'un', qtd_pacote: 100, preco_pacote: 39.5, estoque: 60, estoque_min: 20 },
  { id: 's2', nome: 'Ímã', categoria: 'Ferragem', unidade: 'un', qtd_pacote: 50, preco_pacote: 36.7, estoque: 8, estoque_min: 10 },
  { id: 's3', nome: 'Saco a vácuo', categoria: 'Embalagem', unidade: 'un', qtd_pacote: 10, preco_pacote: 39.99, estoque: 4, estoque_min: 5 },
  { id: 's4', nome: 'Sílica', categoria: 'Embalagem', unidade: 'un', qtd_pacote: 100, preco_pacote: 19, estoque: 70, estoque_min: 20 },
  { id: 's5', nome: 'Canetinha marcador', categoria: 'Acabamento', unidade: 'un', qtd_pacote: 12, preco_pacote: 23.9, estoque: 10, estoque_min: 3 },
];
// cor, marca e preço da planilha do Pedro; tipo PLA e estoque são suposição de demonstração
const D_FILAMENTOS = [
  { id: 'fl1', tipo_id: 'm1', cor: 'Ivory White', cor_hex: '#EDE6D6', marca: 'Bambu Lab', peso_g: 1000, preco: 120, estoque_g: 180 },
  { id: 'fl2', tipo_id: 'm1', cor: 'Verde Oliva', cor_hex: '#6B7A3A', marca: 'eSun', peso_g: 1000, preco: 111.92, estoque_g: 1600 },
  { id: 'fl3', tipo_id: 'm1', cor: 'Vermelho Bombeiro', cor_hex: '#C62828', marca: 'eSun', peso_g: 1000, preco: 99.9, estoque_g: 2400 },
  { id: 'fl4', tipo_id: 'm1', cor: 'Cinza Dark', cor_hex: '#4A4F55', marca: 'Bambu Lab', peso_g: 1000, preco: 148.5, estoque_g: 900 },
  { id: 'fl5', tipo_id: 'm1', cor: 'Laranja Mandarin', cor_hex: '#F28C28', marca: 'Bambu Lab', peso_g: 1000, preco: 146.66, estoque_g: 120 },
  { id: 'fl6', tipo_id: 'm1', cor: 'Preto fosco', cor_hex: '#1E1E1E', marca: 'Voolt3D', peso_g: 1000, preco: 119, estoque_g: 3200 },
  { id: 'fl7', tipo_id: 'm1', cor: 'Branco Velvet', cor_hex: '#F2F2F2', marca: 'Voolt3D', peso_g: 1000, preco: 119.9, estoque_g: 1500 },
];
const D_CLIENTES = [
  { id: 'cl1', nome: 'Cliente exemplo A', whatsapp: '(21) 90000-0000', email: '', doc: '', obs: '' },
  { id: 'cl2', nome: 'Cliente exemplo B', whatsapp: '', email: 'exemplo@dominio.com', doc: '', obs: '' },
];
const fil = (m, g, p, cor) => ({ key: uid(), material_id: m, preco_kg: p, gramas: g, perda: 5, cor, auto: false });
const D_PECAS = [
  { id: 'p1', nome: 'Plaquinha de identificação pet', sku: 'PET-01', categoria: 'pet', descricao: '',
    impressora_id: 'i1', horasPeca: 0.35, lote: 10, min_setup: 3, min_pos: 2, margem_pct: null,
    fils: [fil('m1', 5, 96, '#0C2130')], insumos: [{ key: uid(), insumo_id: 's1', nome: 'Chaveiro (argola)', qtd: 1, custo_unit: 0.395, valor: 0.395, on: true }] },
  { id: 'p2', nome: 'Porta-aliança', sku: 'CAS-04', categoria: 'casamento', descricao: '',
    impressora_id: 'i1', horasPeca: 3.2, lote: 1, min_setup: 5, min_pos: 10, margem_pct: null,
    fils: [fil('m1', 34, 96, '#EBF1F5'), fil('m1', 4, 96, '#25A1EF')],
    insumos: [{ key: uid(), insumo_id: 's3', nome: 'Saco a vácuo', qtd: 1, custo_unit: 3.999, valor: 3.999, on: true }] },
  { id: 'p3', nome: 'Chaveiro com logo do cliente', sku: 'BRI-07', categoria: 'brinde B2B', descricao: '',
    impressora_id: 'i1', horasPeca: 0.6, lote: 25, min_setup: 8, min_pos: 3, margem_pct: null,
    fils: [fil('m1', 9, 96, '#0C2130')], insumos: [] },
];

/* ===== cálculo ===== */
const PARCELAS = [
  ['material', 'Filamento', '--c-mat'], ['energia', 'Energia', '--c-ene'], ['maquina', 'Máquina', '--c-maq'],
  ['operador', 'Mão de obra', '--c-ope'], ['extras', 'Insumos', '--c-ext'], ['refugo', 'Refugo', '--c-ref'],
];

const perdaDe = (f) => (f.origem === 'fatiador' ? 0 : nn(f.perda) / 100);

/* snapshot gravado em cada item de orçamento e venda: mudar preço de filamento
   hoje não reescreve o documento de ontem */
const snapshotItem = (c, params) => ({
  custo: c.custo_total, preco: c.preco, material: c.material, energia: c.energia, maquina: c.maquina,
  setup: c.setup, pos: c.pos, extras: c.extras, refugo: c.refugo, base_refugo: c.base_refugo,
  taxa_canal: c.taxa_canal, taxa_fixa_canal: c.taxa_fixa_canal,
  params: { hora: params.valor_hora_operador, refugo: params.taxa_refugo, tarifa_kwh: params.tarifa_kwh,
    imposto: params.imposto_pct, margem_padrao: params.margem_padrao },
  em: new Date().toISOString(),
});

/* resultado de documento: uma definição só de líquido e lucro, usada no
   orçamento, na tela da venda e no que a venda grava */
function resultadoDoc(doc, ctx) {
  const itens = doc.itens || [];
  const bruto = itens.reduce((s, i) => s + nn(i.qtd) * nn(i.preco_unit), 0);
  const desc = bruto * nn(doc.desconto_pct);
  const total = bruto - desc;
  const custo = itens.reduce((s, i) => s + nn(i.qtd) * nn(i.custo_unit), 0);
  const qtd = itens.reduce((s, i) => s + nn(i.qtd), 0);
  const can = ctx.canais.find((c) => c.id === doc.canal_id);
  const fp = doc.forma_id ? ctx.formas.find((f) => f.id === doc.forma_id) : null;
  const fatorDesc = bruto ? total / bruto : 1;
  const taxaCanal = doc.comissao_pct != null ? total * nn(doc.comissao_pct)
    : can ? itens.reduce((a, i) => { const pu = nn(i.preco_unit) * fatorDesc; const t = taxaDoCanal(can, pu); return a + nn(i.qtd) * (pu * t.pct + t.fixa); }, 0) : 0;
  const imposto = total * nn(ctx.params.imposto_pct);
  const taxaForma = fp ? total * nn(fp.taxa_pct) + nn(fp.taxa_fixa) : 0;
  const liquido = total - taxaCanal - imposto - taxaForma;
  return { bruto, desc, total, custo, taxaCanal, imposto, taxaForma, forma: fp, liquido, lucro: liquido - custo };
}

function precificar(s, ctx, canalId) {
  const { params, impressoras, canais } = ctx;
  const lote = s.modo === 'lote' ? Math.max(1, Math.floor(nn(s.lote)) || 1) : 1;
  const imp = impressoras.find((i) => i.id === s.impressora_id);
  const can = canais.find((c) => c.id === (canalId === undefined ? s.canal_id : canalId));
  const off = s.desligados || {};
  // Placas: cada placa é uma preparação de mesa. Tempo e gramas podem vir de 1 peça,
  // de 1 placa (repete pelo número de placas) ou da produção inteira; tudo vira valor por peça.
  const placas = baseDe(s) === 'producao' ? Math.max(1, Math.floor(nn(s.placas)) || 1) : 1;
  const baseInf = baseDe(s);
  const fT = baseInf === 'peca' ? 1 : baseInf === 'placa' ? placas / lote : 1 / lote;
  const fG = baseInf === 'peca' ? 1 : baseInf === 'placa' ? placas / lote : baseInf === 'producao' ? 1 / lote : 1;

  // Regra de 18/09: filamento vindo do fatiador ignora a perda, porque o
  // arquivo já conta purga, skirt e suporte. Linha digitada aplica perda.
  let mat = 0, gram = 0;
  for (const f of s.fils) {
    const g = nn(f.gramas) * (1 + perdaDe(f)) * fG;
    mat += (g / 1000) * nn(f.preco_kg);
    gram += g;
  }

  // 10 peças na mesma placa quase nunca levam 10x o tempo de uma:
  // peça pequena sozinha fica esperando a camada esfriar, e isso some no lote.
  // Por isso o tempo informado pode ser de uma peça ou da placa inteira.
  const tInformado = nn(s.horasPeca) + nn(s.minutosPeca) / 60;
  const hu = tInformado * fT;
  const ene = imp ? (imp.potencia_w / 1000) * hu * params.tarifa_kwh : 0;
  const maq = imp ? ((imp.vida_util_h > 0 ? imp.valor_compra / imp.vida_util_h : 0) + imp.manutencao_hora) * hu : 0;
  const hora = nn(params.valor_hora_operador);
  const setupMin = s.setup === '' || s.setup == null ? nn(params.setup_padrao ?? 8) : nn(s.setup);
  const posMin = s.pos === '' || s.pos == null ? nn(params.pos_padrao ?? 6) : nn(s.pos);
  const opeSetup = (setupMin * placas / lote) / 60 * hora;
  const opePos = (posMin + (s.pintura ? nn(s.pintura_min) : 0)) / 60 * hora;
  const ope = opeSetup + opePos;
  const ext = (s.insumos || []).filter((i) => i.on).reduce((a, i) => a + nn(i.valor), 0);

  const bruto = { material: mat, energia: ene, maquina: maq, operador: ope, extras: ext };
  const usado = {};
  let dir = 0;
  for (const [k] of PARCELAS) {
    if (k === 'refugo') continue;
    usado[k] = off[k] ? 0 : bruto[k];
    dir += usado[k];
  }
  // Refugo incide sobre material, energia, máquina e setup. Pós-processamento
  // e insumos ficam fora: peça que falha não é lixada nem embalada.
  const setupUsado = off.operador ? 0 : opeSetup;
  const baseRefugo = usado.material + usado.energia + usado.maquina + setupUsado;
  const ref = off.refugo ? 0 : baseRefugo * nn(params.taxa_refugo);
  const custo = dir + ref;

  const margem = s.margem === '' || s.margem == null ? params.margem_padrao : nn(s.margem);
  const base = custo * (1 + margem);
  const pc = precoNoCanal(base, can, params.imposto_pct);
  const taxa = pc.pct; const erro = pc.erro || null; const preco = pc.preco;
  // preço manual por canal: o sugerido continua calculado para servir de referência
  const man = nn((s.precos_manuais || {})[can ? can.id : '']);
  const precoFinal = man > 0 ? man : preco;
  const lucroFinal = man > 0 ? man * (1 - taxa - nn(params.imposto_pct)) - pc.fixa - custo : base - custo;

  return {
    ...usado, bruto, refugo: r2(ref), custo_total: r2(custo),
    margem_valor: r2(base - custo), preco: r2(precoFinal), lucro: r2(lucroFinal), preco_sugerido: r2(preco), lucro_sugerido: r2(base - custo), manual: man > 0,
    gramas_unit: r2(gram), horas_unit: hu, lote, base_preco: base, erro,
    setup: r2(off.operador ? 0 : opeSetup), pos: r2(off.operador ? 0 : opePos), setup_min: setupMin, pos_min: posMin, placas, base_info: baseInf, fator_g: fG,
    base_refugo: r2(baseRefugo), taxa_canal: taxa, taxa_fixa_canal: pc.fixa,
    material: r2(usado.material), energia: r2(usado.energia), maquina: r2(usado.maquina),
    operador: r2(usado.operador), extras: r2(usado.extras),
  };
}

/* ===== orçamento em PDF =====
   Sem biblioteca: monta uma folha A4 em iframe isolado e usa a impressão
   do navegador. No diálogo, escolher "Salvar como PDF". */
function imprimirFolha(html) {
  const ifr = document.createElement('iframe');
  ifr.setAttribute('aria-hidden', 'true');
  ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
  document.body.appendChild(ifr);
  ifr.srcdoc = html;
  ifr.onload = () => {
    try { ifr.contentWindow.focus(); ifr.contentWindow.print(); }
    catch (e) {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    }
    setTimeout(() => ifr.remove(), 60000);
  };
}


/* ===== linha de filamento ===== */
/* ===== painel de custo ===== */
function PainelCusto({ s, c, ctx, onToggle, onCanal, onPrecoManual }) {
  if (c.erro) return <div className="cartao"><div className="aviso ruim" style={{ margin: 0 }}>{c.erro}</div></div>;
  const custo = c.custo_total || 1;
  const fils = s.fils.filter((f) => nn(f.gramas) > 0);
  const off = s.desligados || {};
  const custoFil = (f) => (nn(f.gramas) * (1 + perdaDe(f)) * (c.fator_g ?? 1) / 1000) * nn(f.preco_kg);
  const segs = PARCELAS.filter(([k]) => c[k] > 0);
  const precoCanal = (ch) => {
    if (ch.id === s.canal_id) return c.preco;
    const man = nn((s.precos_manuais || {})[ch.id]); if (man > 0) return man;
    const r = precoNoCanal(c.base_preco, ch, ctx.params.imposto_pct); return r.erro ? null : r.preco;
  };
  const perdaMedia = c.gramas_unit > 0
    ? (c.gramas_unit / Math.max(0.001, s.fils.reduce((a, f) => a + nn(f.gramas), 0) * (c.fator_g ?? 1)) - 1) * 100 : 0;

  return (
    <>
      <div className="cartao">
        <div className="cabeca"><h2>Custo por peça</h2>
          <span className="sub">desmarque o que não quiser contar</span></div>
        <div className="barra" role="img" aria-label="Composição do custo">
          {segs.map(([k, , v]) => (k === 'material'
            ? <span key="mat" style={{ width: `${(c.material / custo * 100).toFixed(2)}%`, background: 'var(--c-mat)' }} />
            : <span key={k} style={{ width: `${(c[k] / custo * 100).toFixed(2)}%`, background: `var(${v})` }} />))}
        </div>
        <div className="lg">
          {PARCELAS.map(([k, rot, v]) => (
            <div key={k}>
              <div className={`l ${off[k] ? 'off' : ''}`}>
                <Check on={!off[k]} onClick={() => onToggle(k)} rot={`Incluir ${rot}`} />
                <i style={{ background: `var(${v})` }} />{rot}
                <b>{off[k] ? brl(0) : brl(c.bruto ? (k === 'refugo' ? c.refugo : c.bruto[k]) : c[k])}</b>
              </div>
              {k === 'material' && !off.material && fils.length > 1 && fils.map((f) => (
                <div key={f.key} className="l sub" style={{ paddingLeft: 22, fontSize: 12 }}>
                  <i style={{ background: f.cor, borderRadius: '50%' }} />
                  {ctx.materiais.find((m) => m.id === f.material_id)?.nome || 'avulso'}
                  <b>{brl(custoFil(f))}</b>
                </div>
              ))}
              {k === 'operador' && !off.operador && c.setup > 0 && (
                <div className="l sub" style={{ paddingLeft: 22, fontSize: 12 }}>
                  <i style={{ background: 'transparent' }} />preparar a mesa: {c.setup_min} min{c.lote > 1 ? `, dividido por ${c.lote} peças` : ''}<b>{brl(c.setup)}</b></div>
              )}
              {k === 'operador' && !off.operador && c.pos > 0 && (
                <div className="l sub" style={{ paddingLeft: 22, fontSize: 12 }}>
                  <i style={{ background: 'transparent' }} />acabamento: {c.pos_min} min{s.pintura ? ` + ${nn(s.pintura_min)} de pintura` : ''} por peça<b>{brl(c.pos)}</b></div>
              )}
              {k === 'refugo' && !off.refugo && (
                <div className="l sub" style={{ paddingLeft: 22, fontSize: 12 }}>
                  <i style={{ background: 'transparent' }} />{pctTxt(nn(ctx.params.taxa_refugo))} de filamento, energia, máquina e preparo, que se perdem quando a peça falha<b /></div>
              )}
              {k === 'extras' && !off.extras && (s.insumos || []).filter((i) => i.on).map((i) => (
                <div key={i.key} className="l sub" style={{ paddingLeft: 22, fontSize: 12 }}>
                  <i style={{ background: 'var(--c-ext)' }} />{i.nome || 'insumo'}<b>{brl(i.valor)}</b>
                </div>
              ))}
            </div>
          ))}
          <div className="l tot"><span>Custo total da peça</span><b>{brl(c.custo_total)}</b></div>
        </div>

        <div className="rot" style={{ marginTop: 16 }}>Preço no {ctx.canais.find((x) => x.id === s.canal_id)?.nome || 'canal'}</div>
        <div className="grandao">{brl(c.preco)}</div>
        <div className={`sub ${c.lucro < 0 ? 'alerta-txt' : ''}`}>lucro de {brl(c.lucro)} por peça{c.manual ? `, margem de ${pctTxt(c.preco ? c.lucro / c.preco : 0)}` : ''}</div>
        {onPrecoManual && <div className="preco-manual">
          <label className="opcao-linha"><Check on={!!c.manual} rot="Usar preço manual" onClick={() => onPrecoManual(s.canal_id, c.manual ? '' : r2(c.preco_sugerido))} /> Usar preço manual</label>
          {c.manual && <div className="campo"><span className="pref">R$</span><input type="number" step="0.01" min="0" aria-label="Preço manual" value={(s.precos_manuais || {})[s.canal_id] ?? ''}
            onChange={(e) => onPrecoManual(s.canal_id, e.target.value)} /></div>}
          {c.manual && <div className="ref-sugerido">Sugerido pelo sistema: <b>{brl(c.preco_sugerido)}</b>, lucro de {brl(c.lucro_sugerido)}
            <button className="link" onClick={() => onPrecoManual(s.canal_id, '')}>voltar ao sugerido</button></div>}
        </div>}

        <div className="metricas">
          <div><span className="rot">Filamento por peça</span><b>{nf(c.gramas_unit)} g</b>
            <span className="dica">{c.gramas_unit <= 0 ? 'preencha as gramas do laminador'
              : s.fils.every((f) => f.origem === 'fatiador') ? 'número do fatiador, sem perda somada'
              : `já inclui ${nf(perdaMedia)}% de perda (purga, skirt e suporte)`}</span></div>
          <div><span className="rot">Impressão por peça</span><b>{hhmm(c.horas_unit)}</b>
            <span className="dica">{c.lote > 1 || c.placas > 1
              ? `${hhmm(c.horas_unit * c.lote)} de máquina em ${c.placas} placa(s), para ${c.lote} peça(s)`
              : 'peça única, uma placa'}</span></div>
        </div>
      </div>

      {s.modo === 'lote' && (
        <div className="cartao">
          <div className="cabeca"><h3>Produção do lote</h3><span className="sub">{c.lote} peças</span></div>
          <div className="lg">
            <div className="l"><span>Custo de produção</span><b>{brl(c.custo_total * c.lote)}</b></div>
            <div className="l"><span>Receita se vender tudo</span><b>{brl(c.preco * c.lote)}</b></div>
            <div className="l tot"><span>Lucro do lote</span><b>{brl(c.lucro * c.lote)}</b></div>
          </div>
          <div className="metricas">
            <div><span className="rot">Filamento total</span><b>{nf(c.gramas_unit * c.lote)} g</b>
              <span className="dica">{nf(c.gramas_unit * c.lote / 1000)} bobina de 1 kg</span></div>
            <div><span className="rot">Máquina ocupada</span><b>{hhmm(c.horas_unit * c.lote)}</b>
              <span className="dica">{nf(c.horas_unit * c.lote / 24)} dia rodando direto</span></div>
          </div>
          <div className="aviso" style={{ marginTop: 14, marginBottom: 0 }}>
            Você precisa de {brl(c.custo_total * c.lote)} em caixa antes de faturar qualquer coisa deste lote.
          </div>
        </div>
      )}

      <div className="cartao">
        <div className="cabeca"><h3>Preço por canal</h3><span className="sub">clique para ver a conta no canal</span></div>
        <table>
          <thead><tr><th>Canal</th><th className="num">Taxa</th><th className="num">Preço</th></tr></thead>
          <tbody>{ctx.canais.map((ch) => {
            const p = precoCanal(ch);
            return <tr key={ch.id} className={`clicavel ${ch.id === s.canal_id ? 'canal-on' : ''}`} onClick={() => onCanal && onCanal(ch.id)} title="Ver a conta neste canal"><td>{ch.nome}</td><td className="num sub" style={{ whiteSpace: 'nowrap' }}>{(() => { const r = precoNoCanal(c.base_preco, ch, ctx.params.imposto_pct);
              const txt = `${(r.pct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%${r.fixa > 0 ? ` + ${brl(r.fixa)}` : ''}`;
              if (!r.faixa) return txt;
              const fx = (ch.faixas || []).slice().sort((x, y) => nn(x.ate) - nn(y.ate)); const k = fx.indexOf(r.faixa); const de = k > 0 ? nn(fx[k - 1].ate) + 0.01 : 0;
              const ate = nn(r.faixa.ate) >= 999999 ? 'acima' : `até ${brl(r.faixa.ate)}`;
              return <span title={`Neste canal a taxa muda com o preço. Este preço cai na faixa ${k === 0 ? '' : `de ${brl(de)} `}${ate}.`}>{txt}<span className="faixa-tag">{k === 0 ? ate : nn(r.faixa.ate) >= 999999 ? `acima de ${brl(de)}` : `${brl(de)} a ${brl(r.faixa.ate)}`}</span></span>; })()}</td>
              <td className="num">{p == null ? 'inviável' : brl(p)}</td></tr>;
          })}</tbody>
        </table>
      </div>

      {baseDe(s) === 'peca' && c.lote >= 4 && c.horas_unit > 0 && (
        <div className="cartao"><div className="aviso" style={{ margin: 0 }}>
          <b>Confira este tempo.</b> Estou multiplicando {hhmm(c.horas_unit)} por {c.lote},
          o que dá {hhmm(c.horas_unit * c.lote)} de máquina. Na prática a placa fatiada costuma
          sair bem menor que isso. Fatie a placa no Bambu Studio e marque "1 placa".
        </div></div>
      )}
      {(c.horas_unit <= 0 || c.gramas_unit <= 0) && (
        <div className="cartao"><div className="aviso ruim" style={{ margin: 0 }}>
          <b>A conta está incompleta.</b>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {c.gramas_unit <= 0 && <li>Gramas em branco: o filamento não entra no custo.</li>}
            {c.horas_unit <= 0 && <li>Tempo em branco: energia e custo de máquina ficam zerados.</li>}
          </ul>
        </div></div>
      )}
    </>
  );
}


/* ===== bloco técnico compartilhado pelo simulador e pela ficha do produto ===== */
function FormTecnico({ s, setS, ctx, onImportar, arquivo, onTrocarPlaca }) {
  const set = (k, v) => setS({ ...s, [k]: v });
  return (
    <>
      {s.modelo && (s.modelo.titulo || s.modelo.imagem) && (
        <div className="cartao modelo-imp">
          {s.modelo.imagem ? <img src={s.modelo.imagem} alt="" /> : <Miniatura tam={72} />}
          <div className="mi-txt"><span className="rot">Modelo importado</span><b>{s.modelo.titulo}</b>
            <span className="sub">{[s.modelo.designer && `por ${s.modelo.designer}`, s.modelo.licenca && `licença ${s.modelo.licenca}`].filter(Boolean).join(' · ') || 'sem autor e licença no arquivo'}</span>
            {licencaSemVenda(s.modelo.licenca) && <span className="pilula recusado" style={{ alignSelf: 'flex-start', marginTop: 4 }}>licença não permite venda</span>}
            {s.modelo.dim && <span className="sub">Tamanho no arquivo: {s.modelo.dim.c} x {s.modelo.dim.l} x {s.modelo.dim.a} cm</span>}</div>
        </div>)}
      <div className="cartao">
        <div className="cabeca"><h2>Filamento</h2><span className="sub">uma linha por cor</span>
          <div className="esp" />
          <button className="bt mini" onClick={() => set('fils', [...s.fils, linhaVazia(ctx, '#8FA3B0')])}>
            <Ico n="mais" s={14} /> Cor
          </button>
        </div>
        <div className="filahead sub" aria-hidden="true">
          <span>Cor</span><span>Filamento</span><span>R$/kg</span><span>Gramas</span><span>Perda %</span><span />
        </div>
        {s.fils.map((f) => (
          <FilaFilamento key={f.key} f={f} ctx={ctx}
            onChange={(x) => set('fils', s.fils.map((y) => (y.key === f.key ? x : y)))}
            onRemove={() => s.fils.length > 1 && set('fils', s.fils.filter((y) => y.key !== f.key))} />
        ))}
        <div className="dica">
          Gramas que o fatiador mostrou, do mesmo jeito que você marcou em Impressão: da peça, da placa ou das placas somadas. Escolha o filamento cadastrado para o custo sair do preço real da bobina. Perda cobre purga, skirt e suporte:
          3 a 5% numa cor só, 10 a 20% na cor secundária de peça multicolor. Linha importada do
          fatiador não soma perda, porque o arquivo já contabiliza o desperdício. Se você mudar as
          gramas na mão, a linha passa a ser manual e a perda volta a valer.
        </div>
        {s.origem && !s.origem.gcode && (
          <div className="aviso ruim" style={{ marginTop: 12, marginBottom: 0 }}>
            <b>{s.origem.parcial ? 'Projeto não fatiado.' : 'Número fatiado em outra máquina.'}</b><br />
            {s.origem.perfil || s.origem.impressora || 'perfil não informado'}
            {s.origem.bico ? ` · bico ${s.origem.bico} mm` : ''}{s.origem.camada ? ` · camada ${s.origem.camada} mm` : ''}<br />
            {s.origem.dim ? <>Placa: {s.origem.dim}<br /></> : null}
            {s.origem.parcial
              ? (s.origem.estimado ? 'Peso e tempo foram estimados pela geometria do modelo, com as paredes e o preenchimento do projeto. Margem de uns 30%: fatie para ter o número exato.' : 'Peso e tempo não existem neste arquivo. Trouxe as cores e os tipos. Fatie com o seu perfil para ter o número real.')
              : 'Tempo e consumo vieram deste perfil, não do seu. Para fechar preço, refatie na sua impressora.'}
            {s.origem.placas > 1 && (
              <div style={{ marginTop: 10 }}>
                <label htmlFor="pl">Placa do projeto ({s.origem.placas} no arquivo)</label>
                <select id="pl" value={s.origem.placa} style={{ maxWidth: 240 }}
                  onChange={(e) => onTrocarPlaca(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}>
                  {Array.from({ length: s.origem.placas }, (_, i) => <option key={i} value={i}>Placa {i + 1}</option>)}
                  <option value="todas">Todas as placas, somadas</option>
                </select>
              </div>
            )}
          </div>
        )}
        {s.origem && s.origem.gcode && (
          <div className="aviso bom" style={{ marginTop: 12, marginBottom: 0 }}>
            <b>Fatiado por você.</b> Importado de {s.origem.arquivo}.
          </div>
        )}
      </div>

      <div className="cartao">
        <div className="cabeca"><h2>Impressão</h2></div>
        {(() => { const c = precificar(s, ctx); const ts = s.placasTempos && s.placasTempos.length > 1 ? s.placasTempos : null;
          const aplica = (xs) => { const tot = xs.reduce((a, x) => a + nn(x.h) * 60 + nn(x.m), 0);
            setS({ ...s, base: 'producao', placasTempos: xs.length > 1 ? xs : null, placas: Math.max(1, xs.length), horasPeca: tot ? Math.floor(tot / 60) : '', minutosPeca: tot ? Math.round(tot % 60) : '' }); };
          const maisPlaca = () => aplica(ts ? [...ts, { h: '', m: '' }] : [{ h: s.horasPeca, m: s.minutosPeca }, { h: '', m: '' }]);
          return (<>
          <div className="grade">
            <Escolha id="s-imp" rotulo="Impressora" valor={s.impressora_id} itens={ctx.impressoras} onEscolher={(x) => set('impressora_id', x.id)}
              onCriar={(t, d) => ctx.pedirCadastro('impressora', t, d)} textoCriar={(t) => `Cadastrar impressora "${t}"`} />
            {!ts && <div><label htmlFor="s-h">Tempo de impressão</label>
              <div className="hm"><div className="campo pc"><input id="s-h" type="number" min="0" step="1" placeholder="0" value={s.horasPeca} onChange={(e) => setS({ ...s, base: 'producao', horasPeca: e.target.value })} /><span className="sufx">h</span></div>
                <div className="campo pc"><input id="s-m" aria-label="Minutos" type="number" min="0" max="59" step="1" placeholder="0" value={s.minutosPeca} onChange={(e) => setS({ ...s, base: 'producao', minutosPeca: e.target.value })} /><span className="sufx">min</span></div></div></div>}
            <div><label htmlFor="s-lote">Peças que saem</label>
              <input id="s-lote" type="number" min="1" step="1" placeholder="1" value={s.modo === 'lote' ? s.lote : ''} style={{ textAlign: 'right' }}
                onChange={(e) => setS({ ...s, base: 'producao', lote: e.target.value, modo: nn(e.target.value) > 1 ? 'lote' : 'peca' })} />
              <span className="dica">Tempo e gramas são o total da mesa, como o fatiador mostra.</span></div>
          </div>
          {ts && <div className="placas-lista">
            <div className="pl-cab"><span>Tempo por placa, como no fatiador</span><span /></div>
            {ts.map((x, k) => (
              <div className="pl-linha" key={k}><span className="sub">Placa {k + 1}</span>
                <div className="campo pc"><input type="number" min="0" placeholder="0" value={x.h} aria-label={`Horas da placa ${k + 1}`} onChange={(e) => aplica(ts.map((y, j) => (j === k ? { ...y, h: e.target.value } : y)))} /><span className="sufx">h</span></div>
                <div className="campo pc"><input type="number" min="0" max="59" placeholder="0" value={x.m} aria-label={`Minutos da placa ${k + 1}`} onChange={(e) => aplica(ts.map((y, j) => (j === k ? { ...y, m: e.target.value } : y)))} /><span className="sufx">min</span></div>
                <button className="ico perigo" aria-label={`Tirar placa ${k + 1}`} onClick={() => aplica(ts.filter((_, j) => j !== k))}><Ico n="x" /></button></div>))}
            <div className="pl-tot"><span className="sub">Total</span><b>{hhmm(nn(s.horasPeca) + nn(s.minutosPeca) / 60)}</b><span className="sub">em {ts.length} placas</span></div>
          </div>}
          <div className="linha-bt" style={{ marginTop: 10 }}><button className="bt mini" onClick={maisPlaca}><Ico n="mais" s={13} /> {ts ? 'Mais uma placa' : 'O projeto tem mais de uma placa'}</button></div>
          <div className="resumo-prod"><span>Por peça: <b>{hhmm(c.horas_unit)}</b> de máquina</span><span><b>{nf(c.gramas_unit)} g</b> de filamento com perda</span>
            {c.lote > 1 && <span><b>{c.lote} peças</b> em {c.placas} placa(s)</span>}</div>
          </>); })()}
      </div>

      <div className="cartao">
        <div className="cabeca"><h2>Insumos</h2><span className="sub">o que vai junto com a peça</span>
          <div className="esp" />
          <button className="bt mini" onClick={() => set('insumos', [...(s.insumos || []),
            { key: uid(), nome: '', qtd: 1, custo_unit: 0, valor: 0, on: true, insumo_id: null }])}><Ico n="mais" s={14} /> Insumo</button>
        </div>
        {(s.insumos || []).length === 0 ? (
          <div className="sub">Nenhum. Ímã, argola, caixinha, saco, etiqueta. Digite o nome e o sistema busca nos insumos cadastrados.</div>
        ) : (
          <div className="cab-insumo" aria-hidden="true"><span /><span>Insumo</span><span>Qtd por peça</span><span>Custo por un.</span><span>Total</span><span /></div>
        )}
        {(s.insumos || []).map((i) => (
          <LinhaInsumo key={i.key} i={i} ctx={ctx}
            onMuda={(x) => set('insumos', s.insumos.map((y) => (y.key === i.key ? x : y)))}
            onTira={() => set('insumos', s.insumos.filter((y) => y.key !== i.key))}
            onPedeNovo={ctx.pedirInsumo} />
        ))}
        <div className="dica">Custo por peça. Insumo novo digitado aqui já entra no cadastro. Desmarque para simular sem aquele item.</div>
      </div>

      <div className="cartao">
        <div className="cabeca"><h2>Mão de obra e preço</h2></div>
        <div className="grade">
          <div><RotuloAuto id="s-set" rot="Preparar a mesa" auto={ctx.params.setup_padrao ?? 8} ov={s.setup !== '' && s.setup != null} onRestaura={() => set('setup', '')} />
            <div className="campo pc"><input id="s-set" type="number" min="0" step="1" placeholder={String(ctx.params.setup_padrao ?? 8)} value={s.setup ?? ''} onChange={(e) => set('setup', e.target.value)} /><span className="sufx">min</span></div>
            <span className="dica">Tirar, limpar, trocar filamento. Por placa. Vazio usa o padrão.</span></div>
          <div><RotuloAuto id="s-pos" rot="Acabamento" auto={ctx.params.pos_padrao ?? 6} ov={s.pos !== '' && s.pos != null} onRestaura={() => set('pos', '')} />
            <div className="campo pc"><input id="s-pos" type="number" min="0" step="1" placeholder={String(ctx.params.pos_padrao ?? 6)} value={s.pos ?? ''} onChange={(e) => set('pos', e.target.value)} /><span className="sufx">min</span></div>
            <span className="dica">Tirar suporte, lixar, montar, embalar. Por peça.</span></div>
          <div><RotuloAuto id="s-mg" rot="Margem sobre o custo" auto={Math.round(ctx.params.margem_padrao * 100)} ov={s.margem !== '' && s.margem != null} onRestaura={() => set('margem', '')} />
            <div className="campo pc">
              <input id="s-mg" type="number" min="0" step="5"
                value={s.margem === '' || s.margem == null ? '' : Math.round(nn(s.margem) * 100)}
                placeholder={String(Math.round(ctx.params.margem_padrao * 100))}
                onChange={(e) => set('margem', e.target.value === '' ? '' : (Number(e.target.value) || 0) / 100)} />
              <span className="sufx">%</span>
            </div>
            <span className="dica">Vazio usa o padrão de Configurações.</span></div>
        </div>
        <div className="separa" />
        <label className="opcao-linha"><Check on={!!s.pintura} rot="Tem pintura ou canetinha" onClick={() => setS({ ...s, pintura: !s.pintura })} />
          Tem pintura ou canetinha <span className="sub">o tempo entra na mão de obra</span></label>
        {s.pintura && <div className="grade" style={{ marginTop: 12 }}>
          <EscolhaMulti id="s-pint" rotulo="Como pinta" valores={s.pintura_tipos || (s.pintura_tipo ? [s.pintura_tipo] : [])} onMudar={(xs) => set('pintura_tipos', xs)}
            placeholder="canetinha, tinta acrílica, spray, verniz" onCriar={(t, d) => d({ id: t, nome: t })} textoCriar={(t) => `Usar "${t}"`}
            itens={[...new Set(['Canetinha', 'Tinta acrílica', 'Spray', 'Verniz', 'Primer', 'Pincel seco', 'Aerógrafo', ...(s.pintura_tipos || [])])].map((x) => ({ id: x, nome: x }))} />
          <div><label htmlFor="s-pin">Tempo de pintura</label><div className="campo pc"><input id="s-pin" type="number" min="0" placeholder="0" value={s.pintura_min || ''} onChange={(e) => set('pintura_min', e.target.value)} /><span className="sufx">min</span></div>
            <span className="dica">Por peça.</span></div>
          <div className="span-todo dica" style={{ marginTop: 0 }}>O material (tinta, canetinha, pincel) entra em Insumos, com a fração que cada peça gasta.</div>
        </div>}
      </div>
    </>
  );
}

const linhaVazia = (ctx, cor) => {
  const m = (ctx.materiais || [])[0];
  return { key: uid(), material_id: m ? m.id : '', preco_kg: m ? m.preco_kg : 0,
    gramas: '', perda: m ? m.perda_pct * 100 : 5, cor, auto: true, origem: 'manual' };
};
const simVazio = (ctx) => ({
  fils: [linhaVazia(ctx, '#EBF1F5')],
  modo: 'peca', lote: '', horasPeca: '', minutosPeca: '', tempoBase: 'peca', placas: 1, base: 'producao', placasTempos: null,
  impressora_id: (ctx.impressoras || [])[0]?.id || '',
  setup: '', pos: '', insumos: [], margem: '', canal_id: (ctx.canais || [])[0]?.id || '', desligados: {},
});
const dePeca = (p) => normaliza({
  fils: p.fils.map((f) => ({ ...f, key: uid() })),
  insumos: (p.insumos || []).map((i) => ({ ...i, key: uid() })),
  modo: p.lote > 1 ? 'lote' : 'peca', lote: p.lote || 10,
  horasPeca: Math.floor(p.horasPeca), minutosPeca: Math.round((p.horasPeca % 1) * 60), tempoBase: 'peca', placas: p.placas || 1, base: p.base || 'peca', placasTempos: p.placasTempos || null, modelo: p.modelo || null, precos_manuais: p.precos_manuais || {}, pintura: !!p.pintura, pintura_tipo: p.pintura_tipo || '', pintura_tipos: p.pintura_tipos || (p.pintura_tipo ? [p.pintura_tipo] : []), pintura_min: p.pintura_min || '',
  impressora_id: p.impressora_id, setup: p.min_setup, pos: p.min_pos,
  margem: p.margem_pct ?? '', canal_id: '', desligados: {},
});

/* ===================== SIMULADOR ===================== */
function BotaoImportar({ onImportar }) {
  if (!onImportar) return null;
  return (
    <label className="bt destaque">
      <Ico n="baixa" s={16} /> Importar do fatiador <span className="sub">.3mf ou .gcode</span>
      <input type="file" accept=".gcode,.gco,.3mf,application/octet-stream,*/*" style={{ display: 'none' }}
        onChange={(e) => onImportar(e.target.files[0], e.target)} />
    </label>
  );
}

function TelaSimulador({ ctx, sim, setSim, onImportar, onTrocarPlaca, onLimpar, onCadastrar }) {
  const c = useMemo(() => precificar(sim, ctx), [sim, ctx]);
  const toggle = (k) => setSim({ ...sim, desligados: { ...sim.desligados, [k]: !sim.desligados?.[k] } });
  return (
    <>
      <div className="titulo">
        <IcoTitulo /><div className="tit-txt"><h2>Simulador</h2><span className="sub">resposta rápida de custo. Nada é salvo até você mandar.</span></div>
        <div className="esp" /><BotaoImportar onImportar={onImportar} />
      </div>
      <div className="duas">
        <div>
          <FormTecnico s={sim} setS={setSim} ctx={ctx} onImportar={onImportar}
            onTrocarPlaca={onTrocarPlaca} />
          <div className="linha-bt">
            <button className="bt forte" onClick={onCadastrar}><Ico n="cubo" s={15} /> Cadastrar como produto</button>
            <button className="bt" onClick={onLimpar}><Ico n="limpa" s={15} /> Limpar tudo</button>
          </div>
        </div>
        <div className="painel"><PainelCusto s={sim} c={c} ctx={ctx} onToggle={toggle} onCanal={(id) => setSim({ ...sim, canal_id: id })} onPrecoManual={(cid, v) => setSim({ ...sim, precos_manuais: { ...(sim.precos_manuais || {}), [cid]: v } })} /></div>
      </div>
    </>
  );
}

/* ===================== CATÁLOGO ===================== */
function TelaCatalogo({ ctx, onAbrir, onNovo, onExcluir }) {
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Produtos</h2><span className="sub">{ctx.pecas.length} produto(s)</span></div><div className="esp" />
        {ctx.pecas.length > 0 && <button className="bt" onClick={() => ctx.exportar(ctx.pecas.map((p) => p.id))}><Ico n="baixa" s={15} /> Exportar para marketplace</button>}
        <button className="bt forte" onClick={onNovo}><Ico n="mais" s={15} /> Novo produto</button></div>
      <div className="cartao">
        {ctx.pecas.length ? (
          <div className="rolo"><table>
            <thead><tr><th style={{ width: 56 }} /><th>Produto</th><th>SKU</th><th>Cores</th><th className="num">g</th>
              <th className="num">Tempo</th><th className="num">Preço</th><th /></tr></thead>
            <tbody>{ctx.pecas.map((p) => {
              const c = precificar(dePeca(p), ctx, ctx.canais[0]?.id);
              return (
                <tr key={p.id} className="clicavel" onClick={() => onAbrir(p)}>
                  <td><Miniatura src={p.foto} /></td><td>{p.nome}<div className="sub">{p.categoria}</div></td>
                  <td className="sub">{p.sku}</td>
                  <td>{p.fils.map((f) => <i key={f.key} className="swatch" style={{ background: f.cor }} />)}</td>
                  <td className="num">{nf(p.fils.reduce((a, f) => a + nn(f.gramas), 0))}</td>
                  <td className="num">{hhmm(p.horasPeca)}</td>
                  <td className="num">{brl(c.preco)}</td>
                  <td onClick={(e) => e.stopPropagation()}><div className="acoes">
                    <button className="ico" title="Editar" aria-label={`Editar ${p.nome}`} onClick={() => onAbrir(p)}><Ico n="lapis" /></button>
                    <button className="ico perigo" title="Excluir" aria-label={`Excluir ${p.nome}`} onClick={() => onExcluir(p)}><Ico n="lixo" /></button>
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <div className="vazio">Nenhum produto. Simule um custo e clique em Cadastrar como produto.</div>}
      </div>
    </>
  );
}

/* ===================== FICHA DO PRODUTO ===================== */
function TelaProduto({ ctx, prod, setProd, onSalvar, onExcluir, onVoltar, onImportar, onTrocarPlaca }) {
  const c = useMemo(() => precificar(prod.tec, ctx), [prod.tec, ctx]);
  const set = (k, v) => setProd({ ...prod, [k]: v });
  const au = autoProduto(prod, ctx);
  const toggle = (k) => setProd({ ...prod, tec: { ...prod.tec, desligados: { ...prod.tec.desligados, [k]: !prod.tec.desligados?.[k] } } });
  return (
    <>
      <div className="titulo">
        <button className="ico" onClick={onVoltar} title="Voltar ao catálogo" aria-label="Voltar"><Ico n="volta" /></button>
        <div className="tit-txt"><h2>{prod.id ? 'Produto' : 'Novo produto'}</h2>{prod.nome && <span className="sub">{prod.nome}</span>}</div>
        <div className="esp" /><BotaoImportar onImportar={onImportar} />
      </div>
      <div className="duas">
        <div>
          <div className="cartao">
            <div className="cabeca"><h2>Identificação</h2></div>
            <FotoCampo valor={prod.foto} rotulo="Foto do produto" onMuda={(v) => set('foto', v)} />
            {prod.tec.modelo?.titulo && (
              <div className="sugestao">Nome no arquivo: <b>{prod.tec.modelo.titulo}</b>
                {nomeSugerido(prod.tec.modelo.titulo) !== prod.nome && <button className="link" onClick={() => set('nome', nomeSugerido(prod.tec.modelo.titulo))}>Usar "{nomeSugerido(prod.tec.modelo.titulo)}"</button>}</div>)}
            <div style={{ marginBottom: 14 }}><label htmlFor="pr-link">Link do modelo 3D</label>
              <input id="pr-link" type="url" value={prod.link_modelo || ''} placeholder="MakerWorld, Printables, Thingiverse" onChange={(e) => set('link_modelo', e.target.value)} />
              <span className="dica">Guarde o link e a licença. Tem modelo que não pode ser vendido.</span></div>
            <div className="grade">
              <div style={{ gridColumn: '1/-1' }}><label htmlFor="pr-nome">Nome do produto</label>
                <input id="pr-nome" value={prod.nome} onChange={(e) => set('nome', e.target.value)}
                  placeholder="obrigatório para salvar" /></div>
              <CampoAuto id="pr-sku" rot="SKU" valor={prod.sku} auto={au.sku} onMuda={(v) => set('sku', v)} dica={explicarSku(prod.sku || au.sku, ctx)} />
              <CampoAuto id="pr-cat" rot="Categoria" valor={prod.categoria} auto={au.categoria} onMuda={(v) => set('categoria', v)} />
              <div className="span-todo"><CampoAuto id="pr-desc" rot="Descrição para o cliente" valor={prod.descricao} auto={au.descricao} onMuda={(v) => set('descricao', v)} /></div>
            </div>
          </div>
          <FormTecnico s={prod.tec} setS={(t) => set('tec', t)} ctx={ctx}
            onImportar={onImportar} onTrocarPlaca={onTrocarPlaca} />
          <VariacoesProduto prod={prod} setProd={setProd} ctx={ctx} />
          <AnunciosProduto prod={prod} setProd={setProd} ctx={ctx} />
          <div className="linha-bt">
            <button className="bt forte" onClick={onSalvar}><Ico n="check" s={15} /> {prod.id ? 'Salvar alterações' : 'Cadastrar produto'}</button>
            {prod.id && <button className="bt" onClick={() => ctx.exportar([prod.id])}><Ico n="baixa" s={15} /> Exportar para marketplace</button>}
            {prod.id && <button className="bt" onClick={onExcluir}><Ico n="lixo" s={15} /> Excluir</button>}
            <button className="bt" onClick={onVoltar}>Voltar</button>
          </div>
        </div>
        <div className="painel"><PainelCusto s={prod.tec} c={c} ctx={ctx} onToggle={toggle} onCanal={(id) => set('tec', { ...prod.tec, canal_id: id })} onPrecoManual={(cid, v) => set('tec', { ...prod.tec, precos_manuais: { ...(prod.tec.precos_manuais || {}), [cid]: v } })} /></div>
      </div>
    </>
  );
}

/* ===================== CLIENTES ===================== */
/* ===== autocomplete de cliente, com cadastro na hora ===== */
function BuscaCliente({ ctx, valor, onEscolher }) {
  const sel = ctx.clientes.find((c) => c.id === valor);
  const [txt, setTxt] = useState(sel ? sel.nome : '');
  useEffect(() => { if (sel && sel.nome !== txt) setTxt(sel.nome); }, [valor]);
  return (
    <Autocompleta id="o-cli" rotulo="Cliente" texto={txt} placeholder="digite o nome"
      itens={ctx.clientes.map((c) => ({ ...c, detalhe: c.whatsapp || c.email || '' }))}
      setTexto={(v) => { setTxt(v); if (!v) onEscolher(''); }}
      onEscolher={(c) => { setTxt(c.nome); onEscolher(c.id); }}
      onCriar={(t) => ctx.pedirCliente(t, (c) => { setTxt(c.nome); onEscolher(c.id); })}
      textoCriar={(t) => `Cadastrar "${t}" como cliente`} />
  );
}

function SelecaoFormas({ ctx, escolhidas, onMudar }) {
  const set = new Set(escolhidas || []);
  return (
    <div style={{ gridColumn: '1/-1' }}>
      <label>Formas de pagamento oferecidas</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 2 }}>
        {ctx.formas.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
            <Check on={set.has(f.id)} rot={`Oferecer ${f.nome}`}
              onClick={() => {
                const n = new Set(set);
                n.has(f.id) ? n.delete(f.id) : n.add(f.id);
                onMudar([...n]);
              }} />
            {f.nome}
            {(f.taxa_pct > 0 || f.taxa_fixa > 0) && (
              <span className="sub" style={{ fontFamily: 'var(--num)', fontSize: 11.5 }}>
                {f.taxa_pct > 0 ? `${nf(f.taxa_pct * 100)}%` : ''}
                {f.taxa_pct > 0 && f.taxa_fixa > 0 ? ' + ' : ''}
                {f.taxa_fixa > 0 ? brl(f.taxa_fixa) : ''}
              </span>
            )}
          </div>
        ))}
      </div>
      <span className="dica">
        O que estiver marcado aparece no orçamento. A porcentagem ao lado é o que a maquininha
        ou o gateway cobra de você, não do cliente: ela não vai para o PDF.
      </span>
    </div>
  );
}

/* ===================== ORÇAMENTOS ===================== */
function TelaOrcamentos({ ctx, orcamentos, setOrcamentos, setClientes, onFecharVenda, intencao, usarIntencao }) {
  const [edit, setEdit] = useState(null);
  const [texto, setTexto] = useState('');
  const [perda, setPerda] = useState(null);
  const novo = () => { setTexto(''); setEdit({ id: null, cliente_id: '', canal_id: ctx.canais[0]?.id || '',
    status: 'rascunho', validade_dias: 7, desconto_pct: 0, observacoes: '', itens: [],
    prazo: '', formas: ctx.formas.filter((f) => f.ativa).map((f) => f.id) }); };
  const cancelar = () => { if (edit.itens.length && !edit.id && !confirm('Sair sem salvar este orçamento?')) return; setEdit(null); setTexto(''); };
  useEffect(() => { if (!intencao) return; if (intencao.novo) novo();
    if (intencao.abrir) { const o = orcamentos.find((x) => x.id === intencao.abrir); if (o) setEdit({ ...o }); }
    usarIntencao && usarIntencao(); }, []);

  const totais = (o) => resultadoDoc(o, ctx);
  const preco = (p, canal) => precificar(dePeca(p), ctx, canal);
  const addItem = (p) => {
    if (!p) return;
    const c = preco(p, edit.canal_id);
    setEdit({ ...edit, itens: [...edit.itens, { key: uid(), peca_id: p.id, descricao: p.nome, qtd: 1,
      preco_unit: c.preco, custo_unit: c.custo_total, snap: snapshotItem(c, ctx.params) }] });
  };
  const trocaCanal = (cid) => setEdit({ ...edit, canal_id: cid, itens: edit.itens.map((i) => {
    const p = ctx.pecas.find((x) => x.id === i.peca_id); if (!p) return i;
    const c = preco(p, cid); return { ...i, preco_unit: c.preco, custo_unit: c.custo_total, snap: snapshotItem(c, ctx.params) };
  }) });

  const salvar = () => {
    if ((edit.status === 'recusado' || edit.status === 'expirado') && !edit.motivo_perda) { setPerda(edit); return; }
    const t = totais(edit);
    const reg = { ...edit, total: t.total, custo_total: t.custo, lucro: t.lucro };
    setOrcamentos(edit.id ? orcamentos.map((o) => (o.id === edit.id ? reg : o))
      : [{ ...reg, id: uid(), numero: proxNumero(orcamentos), criado_em: hoje() }, ...orcamentos]);
    setEdit(null); setTexto('');
  };
  const pdf = () => {
    const t = totais(edit);
    imprimirFolha(folhaOrcamento({
      numero: edit.numero, cliente: ctx.clientes.find((c) => c.id === edit.cliente_id) || null,
      itens: edit.itens, bruto: t.bruto, desconto: t.desc, total: t.total,
      validade: edit.validade_dias, obs: edit.observacoes, empresa: ctx.empresa, logoUrl: ctx.logoUrl,
      prazo: edit.prazo, entrega: edit.entrega_em, formas: ctx.formas.filter((f) => (edit.formas || []).includes(f.id)),
    }));
  };
  const zap = () => {
    const t = totais(edit);
    const cli = ctx.clientes.find((c) => c.id === edit.cliente_id);
    setTexto([`*${ctx.empresa.nome}* | Orçamento${edit.numero ? ' nº ' + edit.numero : ''}`,
      cli ? `Cliente: ${cli.nome}` : null, `Data: ${new Date().toLocaleDateString('pt-BR')}`, '',
      ...edit.itens.map((i) => `${i.qtd}x ${i.descricao} .... ${brl(i.qtd * i.preco_unit)}`), '',
      nn(edit.desconto_pct) ? `Subtotal: ${brl(t.bruto)}\nDesconto: ${(edit.desconto_pct * 100).toFixed(0)}%` : null,
      `*Total: ${brl(t.total)}*`,
      edit.prazo ? `Prazo de produção: ${edit.prazo}` : null,
      (edit.formas || []).length ? `Pagamento: ${ctx.formas.filter((f) => edit.formas.includes(f.id)).map((f) => f.nome).join(', ')}` : null,
      `Validade: ${edit.validade_dias} dias`,
      edit.observacoes ? `\n${edit.observacoes}` : null].filter((x) => x !== null).join('\n'));
  };
  const t = edit ? totais(edit) : null;

  const modalPerda = perda && <MotivoPerda orc={perda} onCancelar={() => setPerda(null)} onSalvar={(o) => {
    if (edit && edit === perda) { setEdit(o); setPerda(null); return; }
    setOrcamentos(orcamentos.map((x) => (x.id === o.id ? o : x))); setPerda(null); }} />;
  if (!edit) return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Orçamentos</h2><span className="sub">{orcamentos.length} no total</span></div><div className="esp" />
        <button className="bt forte" onClick={novo}><Ico n="mais" s={15} /> Novo orçamento</button></div>
      {modalPerda}
      <div className="cartao">
        {orcamentos.length ? (
          <div className="rolo"><table>
            <thead><tr><th className="num">Nº</th><th>Cliente</th><th>Status</th><th className="num">Total</th>
              <th className="num">Lucro</th><th /></tr></thead>
            <tbody>{orcamentos.map((o) => (
              <tr key={o.id} className="clicavel" onClick={() => { setEdit({ ...o }); setTexto(''); }}>
                <td className="num">{o.numero}</td>
                <td>{ctx.clientes.find((c) => c.id === o.cliente_id)?.nome || 'sem cliente'}</td>
                <td><span className={`pilula ${situacaoOrc(o) === 'vencido' ? 'vencido' : o.status}`}>{situacaoOrc(o) === 'vencido' ? 'vencido' : o.status}</span>
                  {o.motivo_perda && <div className="sub">{o.motivo_perda}</div>}</td>
                <td className="num">{brl(o.total)}</td><td className="num">{brl(o.lucro)}</td>
                <td onClick={(e) => e.stopPropagation()}><div className="acoes">
                  <button className="ico" title="Fechar venda" aria-label="Fechar venda" onClick={() => onFecharVenda(o)}><Ico n="tag" /></button>
                  {situacaoOrc(o) !== 'ganho' && situacaoOrc(o) !== 'perdido' && (
                    <button className="ico" title="Registrar como perdido" aria-label="Registrar como perdido" onClick={() => setPerda(o)}><Ico n="x" /></button>)}
                  <button className="ico" title="Editar" aria-label="Editar" onClick={() => { setEdit({ ...o }); setTexto(''); }}><Ico n="lapis" /></button>
                  <button className="ico perigo" title="Excluir" aria-label="Excluir"
                    onClick={() => { if (confirm(`Excluir o orçamento nº ${o.numero}?`)) setOrcamentos(orcamentos.filter((x) => x.id !== o.id)); }}><Ico n="lixo" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="vazio">Nenhum orçamento ainda. Clique em Novo orçamento, escolha o cliente e busque os produtos pelo nome.</div>}
      </div>
    </>
  );

  return (
    <>
      <TituloForm volta={cancelar} rotuloVolta="Orçamentos" titulo={edit.numero ? 'Orçamento nº ' + edit.numero : 'Novo orçamento'}
        sub={edit.id ? ctx.clientes.find((c) => c.id === edit.cliente_id)?.nome : null} />
      {modalPerda}
        <div className="cartao">
          <div className="grade doc">
            <div className="span2"><BuscaCliente ctx={ctx} valor={edit.cliente_id}
              onEscolher={(id) => setEdit({ ...edit, cliente_id: id })} /></div>
            <Escolha id="o-can" rotulo="Canal de venda" valor={edit.canal_id} itens={ctx.canais} onEscolher={(x) => trocaCanal(x.id)}
              onCriar={(t, d) => ctx.pedirCadastro('canal', t, d)} textoCriar={(t) => `Cadastrar canal "${t}"`} />
            <div><label htmlFor="o-st">Status</label>
              <select id="o-st" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                {['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado'].map((s) => <option key={s}>{s}</option>)}</select></div>
            {(edit.status === 'recusado' || edit.status === 'expirado') && (
              <div><label htmlFor="o-mot">Motivo da perda</label>
                <select id="o-mot" value={edit.motivo_perda || ''} onChange={(e) => setEdit({ ...edit, motivo_perda: e.target.value })}>
                  <option value="">escolha</option>{MOTIVOS_PERDA.map((m) => <option key={m}>{m}</option>)}</select></div>)}
            <div><label htmlFor="o-val">Validade (dias)</label>
              <input id="o-val" type="number" min="1" value={edit.validade_dias}
                onChange={(e) => setEdit({ ...edit, validade_dias: e.target.value })} /></div>
            <CampoPct id="o-de" rot="Desconto" fracao={edit.desconto_pct} step="1"
              onChange={(fr) => setEdit({ ...edit, desconto_pct: Math.min(0.9, fr) })} />
            <div><label htmlFor="o-ent">Entrega combinada</label><input id="o-ent" type="date" value={edit.entrega_em || ''} onChange={(e) => setEdit({ ...edit, entrega_em: e.target.value })} /></div>
            <div><label htmlFor="o-prazo">Prazo de produção</label>
              <input id="o-prazo" value={edit.prazo || ''} placeholder="5 dias úteis após aprovação"
                onChange={(e) => setEdit({ ...edit, prazo: e.target.value })} /></div>
            <FormasMulti ctx={ctx} escolhidas={edit.formas} onMudar={(ids) => setEdit({ ...edit, formas: ids })} />
          </div>

          <div className="cabeca" style={{ marginTop: 20 }}><h3>Itens</h3></div>
          <div className="linha-add">
            <AdicionaItem ctx={ctx} canalId={edit.canal_id} onAdd={(x) => (x.peca ? addItem(x.peca) : x.linha ? setEdit({ ...edit, itens: [...edit.itens, x.linha] }) : null)} /></div>

          {edit.itens.length ? (
            <div className="rolo"><table>
              <thead><tr><th>Item</th><th className="num">Qtd</th><th className="num">Unitário</th><th className="num">Total</th><th /></tr></thead>
              <tbody>{edit.itens.map((i) => (
                <tr key={i.key}>
                  <td>{i.descricao}<div className="sub">custo {brl(i.custo_unit)}</div></td>
                  <td className="num"><input type="number" min="1" value={i.qtd} style={{ width: 70, textAlign: 'right' }}
                    onChange={(e) => setEdit({ ...edit, itens: edit.itens.map((x) => (x.key === i.key ? { ...x, qtd: Math.max(1, Number(e.target.value) || 1) } : x)) })} /></td>
                  <td className="num"><div className="campo" style={{ width: 116 }}><span className="pref">R$</span>
                    <input type="number" step="0.01" min="0" value={i.preco_unit} style={{ textAlign: 'right' }} aria-label="Valor unitário"
                      onChange={(e) => setEdit({ ...edit, itens: edit.itens.map((x) => (x.key === i.key ? { ...x, preco_unit: Number(e.target.value) || 0 } : x)) })} /></div></td>
                  <td className="num">{brl(i.qtd * i.preco_unit)}</td>
                  <td><div className="acoes"><button className="ico perigo" title="Tirar" aria-label="Tirar item"
                    onClick={() => setEdit({ ...edit, itens: edit.itens.filter((x) => x.key !== i.key) })}><Ico n="x" /></button></div></td>
                </tr>))}</tbody>
            </table></div>
          ) : <div className="vazio">Digite no campo acima o nome de um produto. Se ainda não existir, cadastre ali mesmo. Embalagem, argola e afins já vêm da ficha do produto.</div>}
          <AvisoEstoque doc={edit} ctx={ctx} baixaAtual={edit.baixa} baixaInsAtual={edit.baixa_ins} />
          <div style={{ marginTop: 16 }}><label htmlFor="o-ob">Observações</label>
            <textarea id="o-ob" value={edit.observacoes} placeholder="aparece no PDF e no texto do WhatsApp" onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} /></div>

          <div className="rot" style={{ marginTop: 16 }}>Total do orçamento</div>
          <div className="grandao">{brl(t.total)}</div>
          <div className="sub">bruto {brl(t.bruto)} · desconto {brl(t.desc)}<br />
            líquido após taxa do canal e imposto {brl(t.liquido)} · custo {brl(t.custo)} · lucro {brl(t.lucro)}</div>

          <div className="linha-bt">
            <button className="bt forte" onClick={salvar}><Ico n="check" s={15} /> Salvar</button>
            <button className="bt" onClick={pdf}><Ico n="doc" s={15} /> Exportar PDF</button>
            <button className="bt" onClick={zap}><Ico n="copia" s={15} /> Texto p/ WhatsApp</button>
            {edit.id && <button className="bt" onClick={() => onFecharVenda(edit)}><Ico n="tag" s={15} /> Fechar venda</button>}
            <div className="esp" />
            <button className="bt" onClick={cancelar}>Cancelar</button>
          </div>
          {texto && (<div style={{ marginTop: 14 }}>
            <label htmlFor="ow">Texto pronto</label>
            <textarea id="ow" readOnly value={texto} onFocus={(e) => e.target.select()} style={{ minHeight: 200, fontSize: 14 }} />
            <div className="linha-bt"><button className="bt mini" onClick={() => navigator.clipboard && navigator.clipboard.writeText(texto)}><Ico n="copia" s={13} /> Copiar</button></div>
          </div>)}
        </div>
    </>
  );
}

/* ===================== VENDAS ===================== */
function TelaVendas({ ctx, vendas, setVendas, setLancamentos, lancamentos, intencao, usarIntencao }) {
  const [edit, setEdit] = useState(null);
  const nova = (base) => setEdit(base || { id: null, cliente_id: '', canal_id: ctx.canais[0]?.id || '', status: 'aberta',
    data: hoje(), itens: [], obs: '', origem_orc: null, parcelas: 1, primeiro_venc: hoje(),
    prazo: '', formas: ctx.formas.filter((f) => f.ativa).map((f) => f.id), forma_id: '' });
  useEffect(() => { if (!intencao) return; if (intencao.novo) nova();
    if (intencao.abrir) { const v = vendas.find((x) => x.id === intencao.abrir); if (v) setEdit({ ...v }); }
    usarIntencao && usarIntencao(); }, []);
  const total = (v) => resultadoDoc(v, ctx).total;
  const custo = (v) => resultadoDoc(v, ctx).custo;
  const addItem = (p) => {
    if (!p) return;
    const c = precificar(dePeca(p), ctx, edit.canal_id);
    setEdit({ ...edit, itens: [...edit.itens, { key: uid(), peca_id: p.id, descricao: p.nome, qtd: 1,
      preco_unit: c.preco, custo_unit: c.custo_total, snap: snapshotItem(c, ctx.params) }] });
  };
  const salvar = () => {
    const rs = resultadoDoc(edit, ctx);
    const t = rs.total;
    const ant = edit.id ? vendas.find((v) => v.id === edit.id) : null;
    const cons = edit.status === 'cancelada' ? { movs: [], movsIns: [] } : consumoDoc(edit, ctx);
    ctx.moverEstoque(ant?.baixa || [], -1); ctx.moverEstoque(cons.movs, 1);
    ctx.moverInsumos(ant?.baixa_ins || [], -1); ctx.moverInsumos(cons.movsIns, 1);
    const reg = { ...edit, total: rs.total, custo_total: rs.custo, lucro: rs.lucro, baixa: cons.movs, baixa_ins: cons.movsIns };
    let id = edit.id;
    if (id) setVendas(vendas.map((v) => (v.id === id ? reg : v)));
    else {
      id = uid();
      const numero = proxNumero(vendas);
      setVendas([{ ...reg, id, numero }, ...vendas]);
      ctx.criarOrdens({ ...reg, id, numero });
      // gera as parcelas a receber
      const n = Math.max(1, Math.floor(nn(edit.parcelas)) || 1);
      const base = new Date(edit.primeiro_venc + 'T12:00:00');
      const novos = Array.from({ length: n }, (_, k) => {
        const d = new Date(base); d.setMonth(d.getMonth() + k);
        return { id: uid(), tipo: 'receber', descricao: `Venda ${numero}` + (n > 1 ? ` (${k + 1}/${n})` : ''),
          valor: r2(t / n), venc: d.toISOString().slice(0, 10), pago: false, venda_id: id, cliente_id: edit.cliente_id };
      });
      setLancamentos([...lancamentos, ...novos]);
    }
    setEdit(null);
  };
  const t = edit ? total(edit) : 0;

  const cancelar = () => { if (edit.itens.length && !edit.id && !confirm('Sair sem salvar esta venda?')) return; setEdit(null); };
  if (!edit) return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Vendas</h2><span className="sub">{vendas.length} venda(s)</span></div><div className="esp" />
        <button className="bt forte" onClick={() => nova()}><Ico n="mais" s={15} /> Nova venda</button></div>

      <div className="cartao">
        {vendas.length ? (
          <div className="rolo"><table>
            <thead><tr><th className="num">Nº</th><th>Cliente</th><th>Data</th><th>Status</th>
              <th className="num">Total</th><th className="num">Lucro</th><th /></tr></thead>
            <tbody>{vendas.map((v) => (
              <tr key={v.id} className="clicavel" onClick={() => setEdit({ ...v })}>
                <td className="num">{v.numero}</td>
                <td>{ctx.clientes.find((c) => c.id === v.cliente_id)?.nome || 'sem cliente'}
                  {v.origem_orc ? <div className="sub">do orçamento nº {v.origem_orc}</div> : null}</td>
                <td className="sub">{dbr(v.data)}</td>
                <td><span className={`pilula ${v.status}`}>{v.status}</span></td>
                <td className="num">{brl(v.total)}</td><td className="num">{brl(v.lucro)}</td>
                <td onClick={(e) => e.stopPropagation()}><div className="acoes">
                  <button className="ico" title="Editar" aria-label="Editar" onClick={() => setEdit({ ...v })}><Ico n="lapis" /></button>
                  <button className="ico perigo" title="Excluir" aria-label="Excluir" onClick={() => {
                    if (!confirm(`Excluir a venda nº ${v.numero} e os lançamentos dela?`)) return;
                    ctx.moverEstoque(v.baixa || [], -1); ctx.moverInsumos(v.baixa_ins || [], -1); ctx.tirarOrdens(v.id);
                    setVendas(vendas.filter((x) => x.id !== v.id));
                    setLancamentos(lancamentos.filter((l) => l.venda_id !== v.id));
                  }}><Ico n="lixo" /></button>
                </div></td>
              </tr>))}</tbody>
          </table></div>
        ) : <div className="vazio">Nenhuma venda. Feche um orçamento ou lance direto aqui.</div>}
      </div>
    </>
  );

  return (
    <>
      <TituloForm volta={cancelar} rotuloVolta="Vendas" titulo={edit.numero ? 'Venda nº ' + edit.numero : 'Nova venda'}
        sub={edit.origem_orc ? `gerada do orçamento nº ${edit.origem_orc}` : null} />
        <div className="cartao">
          <div className="grade doc">
            <div className="span2"><BuscaCliente ctx={ctx} valor={edit.cliente_id}
              onEscolher={(id) => setEdit({ ...edit, cliente_id: id })} /></div>
            <div><label htmlFor="v-data">Data</label>
              <input id="v-data" type="date" value={edit.data} onChange={(e) => setEdit({ ...edit, data: e.target.value })} /></div>
            <div><label htmlFor="v-st">Status</label>
              <select id="v-st" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                {['aberta', 'producao', 'entregue', 'cancelada'].map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label htmlFor="v-ent">Entrega combinada</label><input id="v-ent" type="date" value={edit.entrega_em || ''} onChange={(e) => setEdit({ ...edit, entrega_em: e.target.value })} /></div>
            <div><label htmlFor="v-prazo">Prazo de produção</label>
              <input id="v-prazo" value={edit.prazo || ''} placeholder="5 dias úteis"
                onChange={(e) => setEdit({ ...edit, prazo: e.target.value })} /></div>
            <Escolha id="v-forma" rotulo="Forma escolhida pelo cliente" valor={edit.forma_id || ''}
              itens={[{ id: '', nome: 'A definir' }, ...ctx.formas.filter((f) => (edit.formas || []).includes(f.id))]}
              onEscolher={(x) => setEdit({ ...edit, forma_id: x.id, formas: x.id && !(edit.formas || []).includes(x.id) ? [...(edit.formas || []), x.id] : edit.formas })}
              onCriar={(t, d) => ctx.pedirCadastro('forma', t, d)} textoCriar={(t) => `Cadastrar forma "${t}"`} />
            {!edit.id && (<>
              <div><label htmlFor="v-par">Parcelas</label>
                <input id="v-par" type="number" min="1" max="12" value={edit.parcelas}
                  onChange={(e) => setEdit({ ...edit, parcelas: e.target.value })} /></div>
              <div><label htmlFor="v-venc">1º vencimento</label>
                <input id="v-venc" type="date" value={edit.primeiro_venc}
                  onChange={(e) => setEdit({ ...edit, primeiro_venc: e.target.value })} /></div>
            </>)}
            <FormasMulti ctx={ctx} escolhidas={edit.formas} onMudar={(ids) => setEdit({ ...edit, formas: ids })} />
          </div>

          <div className="cabeca" style={{ marginTop: 20 }}><h3>Itens</h3></div>
          <div className="linha-add">
            <AdicionaItem ctx={ctx} canalId={edit.canal_id} onAdd={(x) => (x.peca ? addItem(x.peca) : x.linha ? setEdit({ ...edit, itens: [...edit.itens, x.linha] }) : null)} /></div>

          {edit.itens.length ? (
            <div className="rolo"><table>
              <thead><tr><th>Item</th><th className="num">Qtd</th><th className="num">Unitário</th><th className="num">Total</th><th /></tr></thead>
              <tbody>{edit.itens.map((i) => (
                <tr key={i.key}><td>{i.descricao}</td>
                  <td className="num"><input type="number" min="1" value={i.qtd} style={{ width: 70, textAlign: 'right' }}
                    onChange={(e) => setEdit({ ...edit, itens: edit.itens.map((x) => (x.key === i.key ? { ...x, qtd: Math.max(1, Number(e.target.value) || 1) } : x)) })} /></td>
                  <td className="num"><div className="campo" style={{ width: 116 }}><span className="pref">R$</span>
                    <input type="number" step="0.01" value={i.preco_unit} style={{ textAlign: 'right' }} aria-label="Valor unitário"
                      onChange={(e) => setEdit({ ...edit, itens: edit.itens.map((x) => (x.key === i.key ? { ...x, preco_unit: Number(e.target.value) || 0 } : x)) })} /></div></td>
                  <td className="num">{brl(i.qtd * i.preco_unit)}</td>
                  <td><div className="acoes"><button className="ico perigo" title="Tirar" aria-label="Tirar"
                    onClick={() => setEdit({ ...edit, itens: edit.itens.filter((x) => x.key !== i.key) })}><Ico n="x" /></button></div></td>
                </tr>))}</tbody>
            </table></div>
          ) : <div className="vazio">Digite no campo acima o nome de um produto. Se ainda não existir, cadastre ali mesmo. Embalagem, argola e afins já vêm da ficha do produto.</div>}
          <AvisoEstoque doc={edit} ctx={ctx} baixaAtual={edit.baixa} baixaInsAtual={edit.baixa_ins} />

          <div className="rot" style={{ marginTop: 16 }}>Total da venda</div>
          <div className="grandao">{brl(t)}</div>
          {(() => {
            const rs = resultadoDoc(edit, ctx);
            return (
              <div className="sub">custo {brl(rs.custo)}
                {rs.taxaCanal > 0 ? ` · taxa do canal ${brl(rs.taxaCanal)}` : ''}
                {rs.imposto > 0 ? ` · imposto ${brl(rs.imposto)}` : ''}
                {rs.forma ? ` · taxa ${rs.forma.nome} ${brl(rs.taxaForma)}` : ''}
                {' · lucro '}{brl(rs.lucro)}</div>
            );
          })()}
          {!edit.id && <div className="aviso" style={{ marginTop: 12 }}>
            Ao salvar, o sistema cria {Math.max(1, Math.floor(nn(edit.parcelas)) || 1)} lançamento(s) a receber no financeiro.
          </div>}
          <div className="linha-bt">
            <button className="bt forte" onClick={salvar}><Ico n="check" s={15} /> Salvar venda</button>
            <div className="esp" />
            <button className="bt" onClick={cancelar}>Cancelar</button>
          </div>
        </div>
    </>
  );
}

/* ===================== CONFIGURAÇÕES ===================== */
function Tabela({ titulo, lista, setLista, cols, base, dica }) {
  const editar = (id, c, v) => setLista(lista.map((r) => (r.id === id
    ? { ...r, [c[0]]: c[2] ? (c[3] ? (Number(v) || 0) / c[3] : (Number(v) || 0)) : v } : r)));
  const mostra = (r, c) => (c[3] ? Math.round((Number(r[c[0]]) || 0) * c[3] * 100) / 100 : (r[c[0]] ?? ''));
  return (
    <div className="cartao">
      <div className="cabeca"><h2>{titulo}</h2><span className="sub">campos editáveis</span><div className="esp" />
        <button className="bt mini" onClick={() => setLista([...lista, { id: uid(), ...base }])}><Ico n="mais" s={14} /> Adicionar</button></div>
      <div className="rolo"><table>
        <thead><tr>{cols.map((c) => <th key={c[0]} className={c[2] ? 'num' : ''}>{c[1]}</th>)}<th /></tr></thead>
        <tbody>{lista.map((r) => (
          <tr key={r.id}>
            {cols.map((c) => (
              <td key={c[0]} className={c[2] ? 'num' : ''}>
                {c[4] === 'moeda' ? (
                  <div className="campo"><span className="pref">R$</span>
                    <input type="number" step="0.01" value={mostra(r, c)} aria-label={c[1]}
                      style={{ textAlign: 'right' }} onChange={(e) => editar(r.id, c, e.target.value)} /></div>
                ) : c[4] === 'pct' ? (
                  <div className="campo pc">
                    <input type="number" step="0.1" value={mostra(r, c)} aria-label={c[1]}
                      onChange={(e) => editar(r.id, c, e.target.value)} />
                    <span className="sufx">%</span></div>
                ) : (
                  <input type={c[2] ? 'number' : 'text'} step="0.01" value={mostra(r, c)} aria-label={c[1]}
                    style={{ textAlign: c[2] ? 'right' : 'left' }} onChange={(e) => editar(r.id, c, e.target.value)} />
                )}
              </td>))}
            <td><div className="acoes"><button className="ico perigo" title="Excluir" aria-label="Excluir"
              onClick={() => { if (confirm(`Excluir "${r.nome}"? Documentos já salvos mantêm o valor que tinham.`)) setLista(lista.filter((x) => x.id !== r.id)); }}><Ico n="lixo" /></button></div></td>
          </tr>))}</tbody>
      </table></div>
      {dica && <span className="dica">{dica}</span>}
    </div>
  );
}
function CampoEmp({ id, rot, k, emp, setEmp, dica }) {
  return (<div><label htmlFor={id}>{rot}</label>
    <input id={id} value={emp[k]} onChange={(e) => setEmp({ ...emp, [k]: e.target.value })} />
    {dica ? <span className="dica">{dica}</span> : null}</div>);
}
function CampoParam({ id, rot, k, step, params, setParams, tipo = 'num', dica }) {
  const set = (v) => setParams({ ...params, [k]: Number(v) || 0 });
  if (tipo === 'moeda') return <CampoMoeda id={id} rot={rot} valor={params[k]} step={step} onChange={set} dica={dica} />;
  if (tipo === 'pct') return <CampoPct id={id} rot={rot} fracao={params[k]} step={step}
    onChange={(fr) => setParams({ ...params, [k]: fr })} dica={dica} />;
  return (<div><label htmlFor={id}>{rot}</label>
    <input id={id} type="number" step={step} value={params[k]} style={{ textAlign: 'right' }}
      onChange={(e) => set(e.target.value)} />{dica && <span className="dica">{dica}</span>}</div>);
}

/* ===================== AUTOCOMPLETE ===================== */
function Autocompleta({ id, rotulo, itens, texto, setTexto, onEscolher, onCriar, textoCriar, placeholder, semRotulo, onSair }) {
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(0);
  const [digitou, setDigitou] = useState(false);
  const t = (texto || '').trim().toLowerCase();
  const tf = digitou ? semAcento(t) : '';
  const achados = itens.filter((x) => !tf || semAcento(x.nome).includes(tf)).slice(0, 10);
  const exato = itens.some((x) => x.nome.toLowerCase() === t);
  const podeCriar = onCriar && t && digitou && !exato;
  const total = achados.length + (podeCriar ? 1 : 0);
  const escolher = (k) => {
    if (k < achados.length) { onEscolher(achados[k]); setAberto(false); }
    else if (podeCriar) { onCriar(texto.trim()); setAberto(false); }
  };
  return (
    <div className="auto">
      {!semRotulo && rotulo && <label htmlFor={id}>{rotulo}</label>}
      <input id={id} value={texto} placeholder={placeholder} autoComplete="off" aria-label={semRotulo ? rotulo : undefined}
        role="combobox" aria-expanded={aberto} aria-autocomplete="list"
        onChange={(e) => { setTexto(e.target.value); setAberto(true); setFoco(0); setDigitou(true); }}
        onFocus={(e) => { setAberto(true); setDigitou(false); e.target.select(); }}
        onBlur={() => setTimeout(() => { setAberto(false); if (onSair) onSair(); setDigitou(false); }, 160)}
        onKeyDown={(e) => {
          if (!aberto || !total) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setFoco((foco + 1) % total); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setFoco((foco - 1 + total) % total); }
          else if (e.key === 'Enter') { e.preventDefault(); escolher(foco); }
          else if (e.key === 'Escape') { e.stopPropagation(); setAberto(false); }
        }} />
      {aberto && total > 0 && (
        <div className="lista" role="listbox">
          {achados.map((x, k) => (
            <button key={x.tipo ? x.tipo + x.id : x.id} type="button" className={k === foco ? 'foco' : ''}
              onMouseDown={(e) => { e.preventDefault(); escolher(k); }}>
              <span>{x.nome}</span>{x.detalhe && <span className="det">{x.detalhe}</span>}
            </button>))}
          {podeCriar && (
            <button type="button" className={`novo ${foco === achados.length ? 'foco' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); escolher(achados.length); }}>
              <Ico n="mais" s={14} /> {textoCriar ? textoCriar(texto.trim()) : `Cadastrar "${texto.trim()}"`}
            </button>)}
        </div>
      )}
    </div>
  );
}

/* ===================== INSUMOS ===================== */
const custoUnit = (i) => (nn(i.qtd_pacote) > 0 ? nn(i.preco_pacote) / nn(i.qtd_pacote) : 0);
const brl4 = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 });

function LinhaInsumo({ i, ctx, onMuda, onTira, onPedeNovo }) {
  const qtd = i.qtd ?? 1;
  const cu = i.custo_unit ?? nn(i.valor);
  const muda = (x) => { const n = { ...i, ...x }; const q = nn(n.qtd ?? 1), c = nn(n.custo_unit ?? n.valor); onMuda({ ...n, valor: r2(q * c * 10000) / 10000 }); };
  const itens = ctx.insumos.map((x) => ({ ...x, detalhe: `${brl4(custoUnit(x))} / ${x.unidade || 'un'}` }));
  return (
    <div className="fila-insumo">
      <Check on={i.on} rot="Incluir no custo" onClick={() => onMuda({ ...i, on: !i.on })} />
      <Autocompleta id={`ins-${i.key}`} rotulo="Insumo" semRotulo itens={itens} texto={i.nome} placeholder="buscar insumo cadastrado"
        setTexto={(v) => onMuda({ ...i, nome: v, insumo_id: null })}
        onEscolher={(x) => muda({ nome: x.nome, insumo_id: x.id, custo_unit: custoUnit(x), unidade: x.unidade })}
        onCriar={(txt) => onPedeNovo(txt, (x) => muda({ nome: x.nome, insumo_id: x.id, custo_unit: custoUnit(x), unidade: x.unidade }))}
        textoCriar={(t) => `Cadastrar "${t}" nos insumos`} />
      <div className="campo pc qtd"><input type="number" min="0" step="1" value={qtd} aria-label="Quantidade por peça"
        onChange={(e) => muda({ qtd: e.target.value })} /><span className="sufx">{i.unidade || 'un'}</span></div>
      <div className="campo"><span className="pref">R$</span>
        <input type="number" min="0" step="0.01" value={r2(cu * 10000) / 10000} aria-label="Custo por unidade" style={{ textAlign: 'right' }}
          onChange={(e) => muda({ custo_unit: e.target.value })} /></div>
      <b className="total-ins">{brl(nn(qtd) * nn(cu))}</b>
      <button className="ico perigo" aria-label="Remover insumo" title="Remover" onClick={onTira}><Ico n="x" /></button>
    </div>
  );
}

/* leitura de planilha de insumos: CSV, XLSX ou link do Google Sheets.
   Acha o cabeçalho pela palavra (insumo, nome, item) e lê até a primeira linha vazia.
   Aceita a planilha do Pedro com filamentos em cima e insumos embaixo. */
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const COL = {
  nome: ['insumo', 'insumos', 'nome', 'item', 'descricao', 'produto'],
  categoria: ['categoria', 'tipo', 'grupo'],
  unidade: ['unidade', 'un', 'medida'],
  qtd: ['qtd', 'quantidade', 'qtd no pacote', 'qtd pacote', 'unidades', 'qtde'],
  preco: ['preco', 'valor', 'preco do pacote', 'custo', 'preco pago', 'valor pago'],
  fornecedor: ['fornecedor', 'marca', 'loja'],
  link: ['link', 'url', 'site', 'link de compra'],
  estoque: ['estoque', 'em estoque'],
};
const dinheiro = (v) => {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/[R$\s]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return Number(s);
};
function lerCsv(txt) {
  const sep = (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let k = 0; k < txt.length; k++) {
    const ch = txt[k];
    if (aspas) { if (ch === '"' && txt[k + 1] === '"') { campo += '"'; k++; } else if (ch === '"') aspas = false; else campo += ch; }
    else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}
function extrairInsumos(linhas) {
  const vazia = (l) => !l || l.every((c) => !String(c ?? '').trim());
  let h = linhas.findIndex((l) => l && COL.nome.includes(semAcento(l[0])) || (l || []).some((c) => ['insumo', 'insumos'].includes(semAcento(c))));
  if (h < 0) h = linhas.findIndex((l) => (l || []).some((c) => COL.nome.includes(semAcento(c))));
  if (h < 0) return { erro: 'Não achei o cabeçalho. A primeira coluna precisa se chamar Nome, Item ou Insumo.' };
  const cab = linhas[h].map(semAcento);
  const idx = {};
  for (const [k, sin] of Object.entries(COL)) idx[k] = cab.findIndex((c) => sin.includes(c));
  const corpo = [];
  for (let k = h + 1; k < linhas.length && !vazia(linhas[k]); k++) corpo.push(linhas[k]);
  // coluna de preço sem título (acontece no Google Sheets): a que mais tem cara de dinheiro
  if (idx.preco < 0) {
    let melhor = -1, pts = 0;
    for (let c = 0; c < cab.length; c++) {
      if (c === idx.nome || c === idx.qtd) continue;
      const n = corpo.filter((l) => /r\$|\d+,\d{2}/i.test(String(l[c] ?? ''))).length;
      if (n > pts) { pts = n; melhor = c; }
    }
    idx.preco = melhor;
  }
  if (idx.nome < 0) idx.nome = 0;
  const itens = corpo.map((l) => {
    const qtd = idx.qtd >= 0 ? dinheiro(l[idx.qtd]) : 1;
    const preco = idx.preco >= 0 ? dinheiro(l[idx.preco]) : 0;
    return {
      nome: String(l[idx.nome] ?? '').trim(),
      categoria: idx.categoria >= 0 ? String(l[idx.categoria] ?? '').trim() : '',
      unidade: idx.unidade >= 0 ? String(l[idx.unidade] ?? '').trim() || 'un' : 'un',
      qtd_pacote: qtd > 0 ? qtd : 1, qtd_vazia: !(qtd > 0),
      preco_pacote: preco >= 0 ? preco : 0, preco_vazio: !(preco >= 0),
      fornecedor: idx.fornecedor >= 0 ? String(l[idx.fornecedor] ?? '').trim() : '',
      link: idx.link >= 0 ? String(l[idx.link] ?? '').trim() : '',
      estoque: idx.estoque >= 0 && String(l[idx.estoque] ?? '').trim() !== '' ? dinheiro(l[idx.estoque]) : null,
    };
  }).filter((x) => x.nome);
  return itens.length ? { itens } : { erro: 'Achei o cabeçalho, mas nenhuma linha preenchida embaixo dele.' };
}
async function lerPlanilhaArquivo(file) {
  if (/\.(xlsx|xls|ods)$/i.test(file.name)) {
    // leitor de Excel só carrega na hora: CDN oficial da SheetJS, com o jsDelivr de reserva
    for (const src of ['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js']) {
      if (window.XLSX) break;
      await new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
    }
    if (!window.XLSX) throw new Error('não consegui carregar o leitor de Excel. Salve como CSV e tente de novo.');
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    for (const nome of wb.SheetNames) {
      const r = extrairInsumos(window.XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: false, defval: '' }));
      if (r.itens) return r;
    }
    return { erro: 'Nenhuma aba da planilha tem uma coluna Nome, Item ou Insumo.' };
  }
  return extrairInsumos(lerCsv(await file.text()));
}
async function lerPlanilhaGoogle(link) {
  const m = String(link).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return { erro: 'Este link não é de uma planilha do Google.' };
  const gid = (String(link).match(/[#&?]gid=(\d+)/) || [])[1];
  const urls = [`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? '&gid=' + gid : ''}`,
    `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? '&gid=' + gid : ''}`];
  for (const u of urls) {
    try {
      const r = await fetch(u); if (!r.ok) continue;
      const txt = await r.text(); if (/<html/i.test(txt.slice(0, 200))) continue;
      return extrairInsumos(lerCsv(txt));
    } catch (e) { /* tenta o próximo */ }
  }
  return { erro: 'Não consegui abrir a planilha. No Google Sheets, em Compartilhar, deixe "Qualquer pessoa com o link" como leitor e tente de novo.' };
}
function baixarModelo() {
  const linhas = [['Nome', 'Categoria', 'Unidade', 'Qtd no pacote', 'Preço do pacote', 'Fornecedor'],
    ['Argola de chaveiro', 'Ferragem', 'un', '100', '39,50', ''],
    ['Ímã de neodímio 10x2 mm', 'Ferragem', 'un', '50', '36,70', ''],
    ['Saco a vácuo', 'Embalagem', 'un', '10', '39,99', ''],
    ['Sílica gel', 'Embalagem', 'un', '100', '19,00', '']];
  const csv = '\uFEFF' + linhas.map((l) => l.map((c) => /[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'make3lab-modelo-insumos.csv'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ===================== ITENS DE ORÇAMENTO E VENDA ===================== */
/* ===================== FINANCEIRO ===================== */
const mesCurto = (ym) => { const [a, m] = ym.split('-').map(Number); return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); };
const somaMes = (lista, tipo, ym) => lista.filter((l) => l.tipo === tipo && l.pago && ((l.pago_em || l.venc) || '').startsWith(ym)).reduce((a, l) => a + nn(l.valor), 0);

function NovoLancamento({ tipo, inicial, onSalvar, onCancelar }) {
  const [n, setN] = useState(inicial ? { ...inicial, repetir: 1 } : { tipo, descricao: '', valor: '', venc: hoje(), repetir: 1 });
  return (
    <div className="cartao">
      <div className="grade">
        <div style={{ gridColumn: 'span 2' }}><label htmlFor="l-desc">Descrição</label>
          <input id="l-desc" value={n.descricao} autoFocus placeholder={tipo === 'pagar' ? 'filamento, energia, aluguel' : 'venda avulsa, sinal de encomenda'}
            onChange={(e) => setN({ ...n, descricao: e.target.value })} /></div>
        <CampoMoeda id="l-val" rot="Valor" valor={n.valor} onChange={(v) => setN({ ...n, valor: v })} />
        <div><label htmlFor="l-venc">Vencimento</label>
          <input id="l-venc" type="date" value={n.venc} onChange={(e) => setN({ ...n, venc: e.target.value })} /></div>
        {!inicial && <div><label htmlFor="l-rep">Repetir por</label>
          <select id="l-rep" value={n.repetir} onChange={(e) => setN({ ...n, repetir: Number(e.target.value) })}>
            {[1, 2, 3, 6, 12].map((k) => <option key={k} value={k}>{k === 1 ? 'só este mês' : `${k} meses`}</option>)}</select></div>}
      </div>
      <div className="linha-bt">
        <button className="bt forte" disabled={!n.descricao.trim() || !(nn(n.valor) > 0)} onClick={() => {
          if (inicial) { const { repetir, ...resto } = n; onSalvar([{ ...resto, descricao: n.descricao.trim(), valor: r2(nn(n.valor)) }]); return; }
          const base = new Date(n.venc + 'T12:00:00');
          onSalvar(Array.from({ length: n.repetir }, (_, k) => { const d = new Date(base); d.setMonth(d.getMonth() + k);
            return { id: uid(), tipo, descricao: n.descricao.trim() + (n.repetir > 1 ? ` (${k + 1}/${n.repetir})` : ''),
              valor: r2(nn(n.valor)), venc: d.toISOString().slice(0, 10), pago: false }; }));
        }}><Ico n="check" s={15} /> Salvar</button>
        <div className="esp" />
        <button className="bt" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function TabelaLancamentos({ ctx, lista, lancamentos, setLancamentos, vazio, onAbrir }) {
  const hj = hoje();
  const alternar = (l) => setLancamentos(lancamentos.map((x) => (x.id === l.id ? { ...x, pago: !x.pago, pago_em: !x.pago ? hj : null } : x)));
  if (!lista.length) return <div className="vazio">{vazio}</div>;
  return (
    <div className="rolo"><table>
      <thead><tr><th>Vencimento</th><th>Descrição</th><th className="num">Valor</th><th>Situação</th><th /></tr></thead>
      <tbody>{lista.map((l) => {
        const atrasado = !l.pago && l.venc < hj;
        return (
          <tr key={l.id} className={onAbrir ? 'clicavel' : ''} onClick={() => onAbrir && onAbrir(l)}>
            <td className={atrasado ? 'alerta-txt' : ''} style={{ whiteSpace: 'nowrap' }}>{dbr(l.venc)}</td>
            <td>{l.descricao}{l.cliente_id ? <div className="sub">{ctx.clientes.find((c) => c.id === l.cliente_id)?.nome}</div> : null}</td>
            <td className={`num ${l.tipo === 'receber' ? 'num-azul' : ''}`}>{brl(l.valor)}</td>
            <td><span className={`pilula ${l.pago ? 'pago' : atrasado ? 'vencido' : 'aberto'}`}>
              {l.pago ? (l.tipo === 'receber' ? 'recebido' : 'pago') : atrasado ? 'atrasado' : 'em aberto'}</span></td>
            <td onClick={(e) => e.stopPropagation()}><div className="acoes">
              <button className="bt mini" onClick={() => alternar(l)}>{l.pago ? 'Reabrir' : l.tipo === 'receber' ? 'Recebi' : 'Paguei'}</button>
              <button className="ico perigo" title="Excluir" aria-label="Excluir"
                onClick={() => { if (confirm(`Excluir "${l.descricao}"?`)) setLancamentos(lancamentos.filter((x) => x.id !== l.id)); }}><Ico n="lixo" /></button>
            </div></td>
          </tr>);
      })}</tbody>
    </table></div>
  );
}

function GraficoMeses({ dados }) {
  const max = Math.max(1, ...dados.flatMap((d) => [d.entra, d.sai]));
  const W = 640, H = 200, pad = 28, larg = (W - pad) / dados.length;
  return (
    <svg className="grafico" viewBox={`0 0 ${W} ${H + 26}`} role="img" aria-label="Recebido e pago nos últimos seis meses">
      {[0.5, 1].map((f) => <line key={f} x1={pad} x2={W} y1={H - (H - 10) * f} y2={H - (H - 10) * f} className="guia" />)}
      <line x1={pad} x2={W} y1={H} y2={H} className="eixo" />
      {dados.map((d, k) => {
        const x = pad + k * larg + larg * 0.18, b = larg * 0.3;
        const he = (H - 10) * d.entra / max, hs = (H - 10) * d.sai / max;
        return (
          <g key={d.ym}>
            <rect x={x} y={H - he} width={b} height={he} className="b-entra"><title>{`Recebido: ${brl(d.entra)}`}</title></rect>
            <rect x={x + b + 4} y={H - hs} width={b} height={hs} className="b-sai"><title>{`Pago: ${brl(d.sai)}`}</title></rect>
            <text x={x + b + 2} y={H + 18} textAnchor="middle" className="rot-eixo">{mesCurto(d.ym)}</text>
          </g>);
      })}
    </svg>
  );
}

function FinDashboard({ ctx, lancamentos, irPara }) {
  const hj = hoje(), ym = hj.slice(0, 7);
  const aberto = (t) => lancamentos.filter((l) => l.tipo === t && !l.pago);
  const soma = (xs) => xs.reduce((a, l) => a + nn(l.valor), 0);
  const receber = soma(aberto('receber')), pagar = soma(aberto('pagar'));
  const vencidos = lancamentos.filter((l) => !l.pago && l.venc < hj);
  const entraMes = somaMes(lancamentos, 'receber', ym), saiMes = somaMes(lancamentos, 'pagar', ym);
  const meses = Array.from({ length: 6 }, (_, k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + k);
    const y = d.toISOString().slice(0, 7); return { ym: y, entra: somaMes(lancamentos, 'receber', y), sai: somaMes(lancamentos, 'pagar', y) }; });
  const limite = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const proximos = lancamentos.filter((l) => !l.pago && l.venc >= hj && l.venc <= limite).sort((a, b) => a.venc.localeCompare(b.venc));
  return (
    <>
      <div className="numeros">
        <button className="n" onClick={() => irPara('fin-receber')}><span className="rot">A receber</span><b className="entra">{brl(receber)}</b>
          <span className="sub">{aberto('receber').length} em aberto</span></button>
        <button className="n" onClick={() => irPara('fin-pagar')}><span className="rot">A pagar</span><b>{brl(pagar)}</b>
          <span className="sub">{aberto('pagar').length} em aberto</span></button>
        <div className="n"><span className="rot">Saldo previsto</span><b className={receber - pagar < 0 ? 'alerta' : ''}>{brl(receber - pagar)}</b>
          <span className="sub">a receber menos a pagar</span></div>
        <div className="n"><span className="rot">Atrasado</span><b className={vencidos.length ? 'alerta' : ''}>{brl(soma(vencidos))}</b>
          <span className="sub">{vencidos.length ? `${vencidos.length} lançamento(s)` : 'nada atrasado'}</span></div>
      </div>
      <div className="duas iguais">
        <div className="cartao">
          <div className="cabeca"><h2>Últimos seis meses</h2><div className="esp" />
            <span className="leg"><i className="b-entra" />recebido</span><span className="leg"><i className="b-sai" />pago</span></div>
          <GraficoMeses dados={meses} />
          <div className="linha-res"><span>Resultado de {mesCurto(ym)}</span><b className={entraMes - saiMes < 0 ? 'alerta' : ''}>{brl(entraMes - saiMes)}</b></div>
        </div>
        <div className="cartao">
          <div className="cabeca"><h2>Vence nos próximos 7 dias</h2></div>
          {proximos.length ? <ul className="lista-venc">{proximos.map((l) => (
            <li key={l.id}><span className="d">{dbr(l.venc).slice(0, 5)}</span><span className="t">{l.descricao}</span>
              <b className={l.tipo === 'receber' ? 'num-azul' : ''}>{l.tipo === 'pagar' ? '−' : ''}{brl(l.valor)}</b></li>))}</ul>
            : <div className="vazio">Nada vence nesta semana.</div>}
          {vencidos.length > 0 && <div className="aviso ruim" style={{ marginTop: 12, marginBottom: 0 }}>
            {vencidos.length} lançamento(s) atrasado(s), somando {brl(soma(vencidos))}. Confira em A receber e A pagar.</div>}
        </div>
      </div>
    </>
  );
}

function FinLista({ ctx, tipo, lancamentos, setLancamentos, intencao, usarIntencao }) {
  const [filtro, setFiltro] = useState('aberto');
  const [novo, setNovo] = useState(false);
  useEffect(() => { if (intencao && intencao.novo) setNovo({}); usarIntencao && intencao && usarIntencao(); }, []);
  const hj = hoje(), ym = hj.slice(0, 7);
  const deste = lancamentos.filter((l) => l.tipo === tipo);
  const soma = (xs) => xs.reduce((a, l) => a + nn(l.valor), 0);
  const abertos = deste.filter((l) => !l.pago), atras = abertos.filter((l) => l.venc < hj);
  const lista = deste.filter((l) => filtro === 'todos' || (filtro === 'aberto' && !l.pago) || (filtro === 'atrasado' && !l.pago && l.venc < hj) || (filtro === 'pago' && l.pago))
    .slice().sort((a, b) => (filtro === 'pago' ? (b.venc || '').localeCompare(a.venc || '') : (a.venc || '').localeCompare(b.venc || '')));
  const verbo = tipo === 'receber' ? 'Recebido' : 'Pago';
  const rotulo = tipo === 'pagar' ? 'A pagar' : 'A receber';
  if (novo) return (
    <>
      <TituloForm volta={() => setNovo(false)} rotuloVolta={rotulo}
        titulo={novo.id ? 'Editar lançamento' : tipo === 'pagar' ? 'Nova conta a pagar' : 'Novo valor a receber'} />
      <NovoLancamento tipo={tipo} inicial={novo.id ? novo : null} onCancelar={() => setNovo(false)}
        onSalvar={(xs) => { setLancamentos(novo.id ? lancamentos.map((l) => (l.id === novo.id ? { ...l, ...xs[0] } : l)) : [...lancamentos, ...xs]); setNovo(false); }} />
    </>
  );
  return (
    <>
      <div className="numeros tres">
        <div className="n"><span className="rot">Em aberto</span><b className={tipo === 'receber' ? 'entra' : ''}>{brl(soma(abertos))}</b><span className="sub">{abertos.length} lançamento(s)</span></div>
        <div className="n"><span className="rot">Atrasado</span><b className={atras.length ? 'alerta' : ''}>{brl(soma(atras))}</b><span className="sub">{atras.length} lançamento(s)</span></div>
        <div className="n"><span className="rot">{verbo} em {mesCurto(ym)}</span><b>{brl(somaMes(lancamentos, tipo, ym))}</b><span className="sub">já baixado</span></div>
      </div>
      <div className="cartao">
        <div className="cabeca">
          <div className="segm" style={{ width: 'auto' }}>
            {[['aberto', 'Em aberto'], ['atrasado', 'Atrasados'], ['pago', tipo === 'receber' ? 'Recebidos' : 'Pagos'], ['todos', 'Todos']].map(([k, r]) => (
              <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)} style={{ padding: '7px 12px' }}>{r}</button>))}
          </div><div className="esp" />
          {<button className="bt forte mini" onClick={() => setNovo({})}><Ico n="mais" s={14} /> {tipo === 'pagar' ? 'Conta a pagar' : 'Valor a receber'}</button>}
        </div>
        <TabelaLancamentos ctx={ctx} lista={lista} lancamentos={lancamentos} setLancamentos={setLancamentos} onAbrir={(l) => setNovo(l)}
          vazio={deste.length ? 'Nada neste filtro.' : tipo === 'receber'
            ? 'Nenhum valor a receber. Venda salva gera o lançamento sozinha, com as parcelas.'
            : 'Nenhuma conta a pagar. Cadastre filamento, energia e aluguel para a previsão ficar certa.'} />
      </div>
    </>
  );
}

function FinPrevisao({ ctx, lancamentos }) {
  const [dias, setDias] = useState(60);
  const hj = hoje();
  const saldo0 = nn(ctx.params.saldo_caixa);
  const semanas = [];
  const ini = new Date(hj + 'T12:00:00');
  for (let k = 0; k < Math.ceil(dias / 7); k++) {
    const a = new Date(ini.getTime() + k * 7 * 864e5), b = new Date(a.getTime() + 6 * 864e5);
    semanas.push({ de: a.toISOString().slice(0, 10), ate: b.toISOString().slice(0, 10), entra: 0, sai: 0 });
  }
  for (const l of lancamentos) {
    if (l.pago || !l.venc) continue;
    const w = l.venc < hj ? semanas[0] : semanas.find((s) => l.venc >= s.de && l.venc <= s.ate);
    if (!w) continue;
    if (l.tipo === 'receber') w.entra += nn(l.valor); else w.sai += nn(l.valor);
  }
  let acc = saldo0;
  for (const s of semanas) { acc += s.entra - s.sai; s.saldo = acc; }
  const menor = semanas.reduce((m, s) => (s.saldo < m.saldo ? s : m), semanas[0] || { saldo: saldo0 });
  const W = 640, H = 170, vals = [saldo0, ...semanas.map((s) => s.saldo)];
  const mx = Math.max(0, ...vals), mn = Math.min(0, ...vals), esc = (v) => 10 + (H - 20) * (mx - v) / ((mx - mn) || 1);
  const pts = vals.map((v, k) => `${(k / Math.max(1, vals.length - 1)) * W},${esc(v)}`).join(' ');
  const atrasados = lancamentos.filter((l) => !l.pago && l.venc < hj).length;
  return (
    <>
      <div className="cartao">
        <div className="grade" style={{ alignItems: 'end' }}>
          <CampoMoeda id="pv-saldo" rot="Saldo em caixa hoje" valor={ctx.params.saldo_caixa ?? ''}
            onChange={(v) => ctx.setParams({ ...ctx.params, saldo_caixa: v === '' ? '' : Number(v) })}
            dica="Quanto tem na conta e no caixa agora. Fica salvo." />
          <div><label>Olhar para frente</label><div className="segm">
            {[30, 60, 90].map((d) => <button key={d} className={dias === d ? 'on' : ''} onClick={() => setDias(d)}>{d} dias</button>)}</div></div>
        </div>
      </div>
      <div className="numeros tres">
        <div className="n"><span className="rot">Hoje</span><b>{brl(saldo0)}</b><span className="sub">o que você informou</span></div>
        <div className="n"><span className="rot">Em {dias} dias</span><b className={acc < 0 ? 'alerta' : ''}>{brl(acc)}</b><span className="sub">se tudo for pago em dia</span></div>
        <div className="n"><span className="rot">Ponto mais baixo</span><b className={menor.saldo < 0 ? 'alerta' : ''}>{brl(menor.saldo)}</b>
          <span className="sub">semana de {dbr(menor.de).slice(0, 5)}</span></div>
      </div>
      <div className="cartao">
        <div className="cabeca"><h2>Saldo projetado</h2><span className="sub">por semana, a partir do que está em aberto</span></div>
        <svg className="grafico" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Saldo projetado por semana" preserveAspectRatio="none">
          {mn < 0 && <line x1="0" x2={W} y1={esc(0)} y2={esc(0)} className="zero" />}
          <polyline points={pts} className="linha-saldo" />
          {vals.map((v, k) => <circle key={k} cx={(k / Math.max(1, vals.length - 1)) * W} cy={esc(v)} r="3" className={v < 0 ? 'pt-neg' : 'pt'} />)}
        </svg>
        {atrasados > 0 && <div className="aviso atencao" style={{ marginTop: 12 }}>{atrasados} lançamento(s) atrasado(s) entraram na primeira semana.</div>}
        <div className="rolo" style={{ marginTop: 12 }}><table>
          <thead><tr><th>Semana</th><th className="num">Entra</th><th className="num">Sai</th><th className="num">Saldo</th></tr></thead>
          <tbody>{semanas.map((s) => <tr key={s.de}><td>{dbr(s.de).slice(0, 5)} a {dbr(s.ate).slice(0, 5)}</td>
            <td className="num num-azul">{s.entra ? brl(s.entra) : ''}</td><td className="num">{s.sai ? brl(s.sai) : ''}</td>
            <td className={`num ${s.saldo < 0 ? 'alerta-txt' : ''}`}><b>{brl(s.saldo)}</b></td></tr>)}</tbody></table></div>
      </div>
    </>
  );
}

/* ===================== MINHA CONTA ===================== */
function TelaConta({ ctx, usuario, org, orgs, trocarOrg, membros, convites, recarregarEquipe, sair }) {
  const souDono = !sb || org?.papel === 'dono';
  const [dados, setDados] = useState({ nome: usuario?.user_metadata?.nome || '', email: usuario?.email || '' });
  const [senha, setSenha] = useState('');
  const [conv, setConv] = useState({ email: '', papel: 'operador' });
  const [aviso, setAviso] = useState(null);
  const [copiado, setCopiado] = useState('');
  const url = window.location.origin + window.location.pathname;
  const convite = (email) => `Oi! Você foi convidado para usar o Make3Lab de ${ctx.empresa.nome || org?.nome}. Crie sua conta em ${url} usando o e-mail ${email}. Ao entrar, você já cai na nossa loja.`;
  const salvarDados = async () => {
    if (!sb) return setAviso({ t: 'Na demonstração nada é salvo.' });
    const upd = { data: { nome: dados.nome.trim() } };
    if (dados.email.trim() && dados.email.trim() !== usuario.email) upd.email = dados.email.trim();
    const { error } = await sb.auth.updateUser(upd);
    if (error) return setAviso({ ruim: true, t: 'Não salvou: ' + error.message });
    if (org) await sb.from('membros').update({ nome: dados.nome.trim() }).eq('org_id', org.id).eq('user_id', usuario.id);
    setAviso({ t: upd.email ? `Nome salvo. Para trocar o e-mail, confirme pelo link enviado para ${upd.email}.` : 'Dados salvos.' });
    recarregarEquipe();
  };
  const trocarSenha = async () => {
    if (senha.length < 8) return setAviso({ ruim: true, t: 'A senha precisa de pelo menos 8 caracteres.' });
    if (!sb) return setAviso({ t: 'Na demonstração nada é salvo.' });
    const { error } = await sb.auth.updateUser({ password: senha });
    setAviso(error ? { ruim: true, t: 'Não trocou: ' + error.message } : { t: 'Senha trocada.' }); if (!error) setSenha('');
  };
  const convidar = async () => {
    const email = conv.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setAviso({ ruim: true, t: 'Confira o e-mail do convite.' });
    if (membros.some((m) => (m.email || '').toLowerCase() === email)) return setAviso({ ruim: true, t: 'Essa pessoa já faz parte da equipe.' });
    if (sb) {
      const { error } = await sb.from('convites').insert({ org_id: org.id, email, papel: conv.papel, criado_por: usuario.id });
      if (error) return setAviso({ ruim: true, t: /duplicate|unique/i.test(error.message) ? 'Já existe convite aberto para esse e-mail.' : 'Não convidou: ' + error.message });
      recarregarEquipe();
    }
    setAviso({ t: `Convite criado para ${email}. Mande a mensagem abaixo para a pessoa.` });
    setCopiado(email); setConv({ email: '', papel: 'operador' });
  };
  const copiar = async (email) => { try { await navigator.clipboard.writeText(convite(email)); setAviso({ t: 'Mensagem copiada.' }); } catch (e) { setCopiado(email); } };
  return (
    <>
      {aviso && <div className={`aviso ${aviso.ruim ? 'ruim' : 'bom'}`}>{aviso.t}</div>}
      {!sb && <div className="aviso atencao">Demonstração: esta tela mostra como fica, mas não grava nada.</div>}
      <div className="duas iguais">
        <div className="cartao">
          <div className="cabeca"><h2>Seus dados</h2></div>
          <div className="grade">
            <div><label htmlFor="mc-n">Nome</label><input id="mc-n" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} autoComplete="name" /></div>
            <div><label htmlFor="mc-e">E-mail de acesso</label><input id="mc-e" type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} autoComplete="email" />
              <span className="dica">Trocar o e-mail pede confirmação no endereço novo.</span></div>
          </div>
          <div className="linha-bt"><button className="bt forte" onClick={salvarDados}><Ico n="check" s={15} /> Salvar dados</button></div>
          <div className="separa" />
          <div className="grade" style={{ alignItems: 'end' }}>
            <div><label htmlFor="mc-s">Senha nova</label><input id="mc-s" type="password" value={senha} autoComplete="new-password" onChange={(e) => setSenha(e.target.value)} />
              <span className="dica">Pelo menos 8 caracteres.</span></div>
            <div><button className="bt" onClick={trocarSenha} disabled={!senha}>Trocar senha</button></div>
          </div>
        </div>
        <div className="cartao">
          <div className="cabeca"><h2>Empresa</h2></div>
          <div className="linha-org"><span className="sub">Você está em</span><b>{ctx.empresa.nome || org?.nome}</b>
            <span className="pilula">{org?.papel === 'operador' ? 'operador' : 'dono'}</span></div>
          {orgs.length > 1 && (<div style={{ marginTop: 14 }}><label htmlFor="mc-org">Trocar de empresa</label>
            <select id="mc-org" value={org?.id} onChange={(e) => trocarOrg(e.target.value)}>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.nome}{o.papel === 'operador' ? ' (operador)' : ''}</option>)}</select></div>)}
          <p className="sub" style={{ marginTop: 14 }}>Nome, logo, CNPJ e contatos que saem no orçamento ficam em Configurações, Empresa.</p>
          {sb && <div className="linha-bt"><button className="bt" onClick={sair}><Ico n="sair" s={15} /> Sair da conta</button></div>}
        </div>
      </div>

      <div className="cartao">
        <div className="cabeca"><h2>Usuários</h2><span className="sub">quem acessa esta empresa</span></div>
        <div className="rolo"><table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th /></tr></thead>
          <tbody>
            {membros.map((m) => (
              <tr key={m.user_id}><td>{m.nome || ''}{m.user_id === usuario?.id && <span className="sub"> (você)</span>}</td>
                <td className="sub">{m.email}</td>
                <td>{souDono && m.user_id !== usuario?.id
                  ? <select value={m.papel} aria-label="Papel" style={{ width: 'auto' }} onChange={async (e) => {
                      if (!sb) return; const { error } = await sb.from('membros').update({ papel: e.target.value }).eq('org_id', org.id).eq('user_id', m.user_id);
                      if (error) setAviso({ ruim: true, t: error.message }); recarregarEquipe(); }}>
                      <option value="dono">dono</option><option value="operador">operador</option></select>
                  : <span className="pilula">{m.papel}</span>}</td>
                <td><div className="acoes">{souDono && m.user_id !== usuario?.id && (
                  <button className="ico perigo" title="Tirar acesso" aria-label={`Tirar acesso de ${m.email}`} onClick={async () => {
                    if (!confirm(`Tirar o acesso de ${m.email}? Os dados da empresa continuam.`) || !sb) return;
                    const { error } = await sb.from('membros').delete().eq('org_id', org.id).eq('user_id', m.user_id);
                    if (error) setAviso({ ruim: true, t: error.message }); recarregarEquipe(); }}><Ico n="lixo" /></button>)}</div></td></tr>))}
            {convites.map((c) => (
              <tr key={'c' + c.id}><td className="sub">convite enviado</td><td className="sub">{c.email}</td><td><span className="pilula aberto">{c.papel}, pendente</span></td>
                <td><div className="acoes">
                  <button className="bt mini" onClick={() => copiar(c.email)}><Ico n="copia" s={13} /> Copiar convite</button>
                  <button className="ico perigo" title="Cancelar convite" aria-label="Cancelar convite" onClick={async () => {
                    if (!sb) return; await sb.from('convites').delete().eq('id', c.id); recarregarEquipe(); }}><Ico n="x" /></button></div></td></tr>))}
          </tbody></table></div>
        {souDono ? (
          <div className="convite">
            <div className="grade" style={{ alignItems: 'end' }}>
              <div style={{ gridColumn: 'span 2' }}><label htmlFor="cv-e">Convidar por e-mail</label>
                <input id="cv-e" type="email" value={conv.email} placeholder="nome@exemplo.com" onChange={(e) => setConv({ ...conv, email: e.target.value })} /></div>
              <div><label htmlFor="cv-p">Papel</label><select id="cv-p" value={conv.papel} onChange={(e) => setConv({ ...conv, papel: e.target.value })}>
                <option value="operador">operador</option><option value="dono">dono</option></select></div>
              <div><button className="bt forte" onClick={convidar}><Ico n="mais" s={15} /> Convidar</button></div>
            </div>
            <span className="dica">Operador usa o sistema todo. Dono também convida, troca papel e tira acesso. A pessoa cria a conta com este e-mail e entra direto nesta empresa.</span>
            {copiado && <div style={{ marginTop: 12 }}><label htmlFor="cv-msg">Mensagem para enviar</label>
              <textarea id="cv-msg" readOnly value={convite(copiado)} onFocus={(e) => e.target.select()} /></div>}
          </div>
        ) : <p className="sub">Só quem é dono convida e tira acesso.</p>}
      </div>
    </>
  );
}

/* ===================== PADRÃO DE TELA: lista OU formulário =====================
   Formulário aberto esconde a lista. Sempre com caminho de volta e Cancelar. */
function TituloForm({ volta, rotuloVolta, titulo, sub, children }) {
  return (
    <div className="titulo-form">
      <button className="voltar" onClick={volta}><Ico n="volta" s={15} /> {rotuloVolta}</button>
      <div className="titulo" style={{ marginBottom: 16 }}><IcoTitulo /><div className="tit-txt"><h2>{titulo}</h2>{sub && <span className="sub">{sub}</span>}</div>
        <div className="esp" />{children}</div>
    </div>
  );
}
function Modal({ titulo, onFechar, children, largo }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);
  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`modal ${largo ? 'largo' : ''}`}>
        <div className="cabeca"><h2>{titulo}</h2><div className="esp" />
          <button className="ico" aria-label="Fechar" onClick={onFechar}><Ico n="x" /></button></div>
        {children}
      </div>
    </div>
  );
}

/* ===== cadastro rápido de cliente ===== */
function NovoCliente({ nome, onSalvar, onCancelar }) {
  const [f, setF] = useState({ nome: nome || '', whatsapp: '', email: '', doc: '', obs: '' });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal titulo="Novo cliente" onFechar={onCancelar}>
      <div className="grade">
        <div style={{ gridColumn: '1/-1' }}><label htmlFor="nc-n">Nome</label>
          <input id="nc-n" value={f.nome} autoFocus onChange={(e) => set('nome', e.target.value)} /></div>
        <div><label htmlFor="nc-w">WhatsApp</label><input id="nc-w" value={f.whatsapp} inputMode="tel" onChange={(e) => set('whatsapp', e.target.value)} /></div>
        <div><label htmlFor="nc-e">E-mail</label><input id="nc-e" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
      </div>
      <div className="linha-bt">
        <button className="bt forte" disabled={!f.nome.trim()} onClick={() => onSalvar({ id: uid(), ...f, nome: f.nome.trim() })}>
          <Ico n="check" s={15} /> Salvar e usar</button>
        <button className="bt" onClick={onCancelar}>Cancelar</button>
      </div>
    </Modal>
  );
}

/* ===== cadastro rápido de produto (ou insumo) a partir do orçamento e da venda ===== */
function NovoItem({ nome, ctx, canalId, onSalvar, onCancelar }) {
  const [tipo, setTipo] = useState('produto');
  const m0 = ctx.materiais[0];
  const [f, setF] = useState({ nome: nome || '', material_id: m0?.id || '', gramas: '', horas: '', minutos: '',
    impressora_id: ctx.impressoras[0]?.id || '', setup: 8, pos: 6 });
  const set = (k, v) => setF({ ...f, [k]: v });
  const troca = (
    <div className="segm" style={{ marginBottom: 16 }}>
      <button className={tipo === 'produto' ? 'on' : ''} onClick={() => setTipo('produto')}>Produto impresso</button>
      <button className={tipo === 'insumo' ? 'on' : ''} onClick={() => setTipo('insumo')}>Insumo</button>
    </div>);
  if (tipo === 'insumo') return <NovoInsumo nome={f.nome} topo={troca} onCancelar={onCancelar} onSalvar={(x) => onSalvar({ insumo: x })} />;
  const mat = ctx.materiais.find((x) => x.id === f.material_id);
  const peca = { id: uid(), nome: f.nome.trim(), sku: '', categoria: '', descricao: '', impressora_id: f.impressora_id,
    horasPeca: nn(f.horas) + nn(f.minutos) / 60, lote: 1, min_setup: nn(f.setup), min_pos: nn(f.pos), margem_pct: null,
    fils: [{ key: uid(), material_id: f.material_id, preco_kg: mat ? mat.preco_kg : 0, gramas: nn(f.gramas),
      perda: mat ? mat.perda_pct * 100 : 5, cor: '#8FA3B0', auto: true, origem: 'manual' }], insumos: [] };
  const c = precificar(dePeca(peca), ctx, canalId);
  const ok = peca.nome && nn(f.gramas) > 0 && peca.horasPeca > 0;
  return (
    <Modal titulo="Cadastrar no catálogo" onFechar={onCancelar} largo>
      <div className="grade">
        <div style={{ gridColumn: '1/-1' }}><label htmlFor="np-n">Nome do produto</label>
          <input id="np-n" value={f.nome} autoFocus onChange={(e) => set('nome', e.target.value)} /></div>
        <Escolha id="np-m" rotulo="Tipo de filamento" valor={f.material_id} itens={ctx.materiais} onEscolher={(x) => set('material_id', x.id)}
          onCriar={(t, d) => ctx.pedirCadastro('tipo', t, d)} textoCriar={(t) => `Cadastrar tipo "${t}"`} />
        <div><label htmlFor="np-g">Gramas por peça</label>
          <div className="campo pc"><input id="np-g" type="number" min="0" step="0.1" value={f.gramas} onChange={(e) => set('gramas', e.target.value)} /><span className="sufx">g</span></div></div>
        <div><label htmlFor="np-h">Horas</label><input id="np-h" type="number" min="0" step="1" value={f.horas} style={{ textAlign: 'right' }} onChange={(e) => set('horas', e.target.value)} /></div>
        <div><label htmlFor="np-mi">Minutos</label><input id="np-mi" type="number" min="0" max="59" step="1" value={f.minutos} style={{ textAlign: 'right' }} onChange={(e) => set('minutos', e.target.value)} /></div>
        <Escolha id="np-i" rotulo="Impressora" valor={f.impressora_id} itens={ctx.impressoras} onEscolher={(x) => set('impressora_id', x.id)}
          onCriar={(t, d) => ctx.pedirCadastro('impressora', t, d)} textoCriar={(t) => `Cadastrar impressora "${t}"`} />
        <div><label htmlFor="np-p">Acabamento (min)</label><input id="np-p" type="number" min="0" value={f.pos} style={{ textAlign: 'right' }} onChange={(e) => set('pos', e.target.value)} /></div>
      </div>
      <div className="previa-preco">
        <div><span className="rot">Custo</span><b>{brl(c.custo_total)}</b></div>
        <div><span className="rot">Preço no canal do documento</span><b className="entra">{ok ? brl(c.preco) : 'preencha gramas e tempo'}</b></div>
      </div>
      <span className="dica">Cadastro rápido com a margem padrão. Cor, insumos, lote e importação do fatiador ficam na ficha do produto, no Catálogo.</span>
      <div className="linha-bt">
        <button className="bt forte" disabled={!ok} onClick={() => onSalvar({ peca })}><Ico n="check" s={15} /> Cadastrar e usar</button>
        <button className="bt" onClick={onCancelar}>Cancelar</button>
      </div>
    </Modal>
  );
}

const MOTIVOS_PERDA = ['Preço', 'Prazo', 'Sem resposta do cliente', 'Comprou de outro', 'Desistiu do pedido', 'Não conseguimos produzir', 'Outro'];
function MotivoPerda({ orc, onSalvar, onCancelar }) {
  const [f, setF] = useState({ status: orc.status === 'expirado' ? 'expirado' : 'recusado', motivo: orc.motivo_perda || '', detalhe: orc.motivo_detalhe || '' });
  return (
    <Modal titulo={`Orçamento nº ${orc.numero} perdido`} onFechar={onCancelar}>
      <div className="grade">
        <div><label htmlFor="mp-s">O que aconteceu</label>
          <select id="mp-s" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="recusado">Cliente recusou</option><option value="expirado">Venceu sem resposta</option></select></div>
        <div><label htmlFor="mp-m">Motivo principal</label>
          <select id="mp-m" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })}>
            <option value="">escolha</option>{MOTIVOS_PERDA.map((m) => <option key={m}>{m}</option>)}</select></div>
        <div style={{ gridColumn: '1/-1' }}><label htmlFor="mp-d">Detalhe (opcional)</label>
          <input id="mp-d" value={f.detalhe} placeholder="o que o cliente disse" onChange={(e) => setF({ ...f, detalhe: e.target.value })} /></div>
      </div>
      <span className="dica">O motivo alimenta o relatório de orçamentos perdidos.</span>
      <div className="linha-bt">
        <button className="bt forte" disabled={!f.motivo} onClick={() => onSalvar({ ...orc, status: f.status, motivo_perda: f.motivo, motivo_detalhe: f.detalhe, perdido_em: hoje() })}>
          <Ico n="check" s={15} /> Registrar perda</button>
        <button className="bt" onClick={onCancelar}>Cancelar</button>
      </div>
    </Modal>
  );
}

/* ===================== RELATÓRIOS ===================== */
const ymd = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
function periodoDe(preset) {
  const h = new Date(); const y = h.getFullYear(), m = h.getMonth();
  const ini = (a, b) => ymd(new Date(a, b, 1)), fim = (a, b) => ymd(new Date(a, b + 1, 0));
  switch (preset) {
    case 'mes': return { de: ini(y, m), ate: fim(y, m) };
    case 'passado': return { de: ini(y, m - 1), ate: fim(y, m - 1) };
    case '3m': return { de: ini(y, m - 2), ate: fim(y, m) };
    case '6m': return { de: ini(y, m - 5), ate: fim(y, m) };
    case '12m': return { de: ini(y, m - 11), ate: fim(y, m) };
    case 'ano': return { de: `${y}-01-01`, ate: `${y}-12-31` };
    default: return null;
  }
}
const PRESETS = [['mes', 'Este mês'], ['passado', 'Mês passado'], ['3m', '3 meses'], ['6m', '6 meses'], ['12m', '12 meses'], ['ano', 'Este ano'], ['livre', 'Escolher datas']];
function FiltroPeriodo({ periodo, setPeriodo }) {
  return (
    <div className="filtro-periodo">
      <div className="segm rolavel">{PRESETS.map(([k, r]) => (
        <button key={k} className={periodo.preset === k ? 'on' : ''} onClick={() => setPeriodo(k === 'livre' ? { ...periodo, preset: k } : { preset: k, ...periodoDe(k) })}>{r}</button>))}</div>
      {periodo.preset === 'livre' && (
        <div className="datas"><input type="date" aria-label="De" value={periodo.de} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} />
          <span className="sub">até</span>
          <input type="date" aria-label="Até" value={periodo.ate} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} /></div>)}
    </div>
  );
}
const noPeriodo = (d, p) => !!d && d >= p.de && d <= p.ate;
const mesesDoPeriodo = (p) => { const out = []; let [y, m] = p.de.slice(0, 7).split('-').map(Number); const [y2, m2] = p.ate.slice(0, 7).split('-').map(Number);
  while (y < y2 || (y === y2 && m <= m2)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } if (out.length > 36) break; } return out; };
const pctTxt = (x) => (isFinite(x) ? `${(x * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '');
function baixarCsv(nome, cab, linhas) {
  const cel = (v) => { const s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '\uFEFF' + [cab, ...linhas].map((l) => l.map(cel).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nome + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
/* tabela de relatório: cols = [rótulo, chave, tipo('txt'|'brl'|'pct'|'n')] */
function TabRel({ titulo, sub, cols, linhas, arquivo, vazio, total }) {
  const fmt = (v, t) => (t === 'brl' ? brl(v) : t === 'pct' ? pctTxt(v) : t === 'n' ? (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : v);
  return (
    <div className="cartao">
      <div className="cabeca"><div className="tit-txt"><h2>{titulo}</h2>{sub && <span className="sub">{sub}</span>}</div><div className="esp" />
        {linhas.length > 0 && <button className="bt mini" onClick={() => baixarCsv(arquivo, cols.map((c) => c[0]), linhas.map((l) => cols.map((c) => l[c[1]])))}>
          <Ico n="baixa" s={14} /> CSV</button>}</div>
      {linhas.length ? (
        <div className="rolo"><table>
          <thead><tr>{cols.map((c) => <th key={c[1]} className={c[2] !== 'txt' ? 'num' : ''}>{c[0]}</th>)}</tr></thead>
          <tbody>{linhas.map((l, k) => <tr key={k}>{cols.map((c) => <td key={c[1]} className={c[2] !== 'txt' ? 'num' : ''}>{fmt(l[c[1]], c[2])}</td>)}</tr>)}</tbody>
          {total && <tfoot><tr>{cols.map((c) => <td key={c[1]} className={c[2] !== 'txt' ? 'num' : ''}>{total[c[1]] == null ? '' : fmt(total[c[1]], c[2])}</td>)}</tr></tfoot>}
        </table></div>
      ) : <div className="vazio">{vazio || 'Nada neste período.'}</div>}
    </div>
  );
}
function Barras({ itens, formato = brl }) {
  const max = Math.max(1, ...itens.map((i) => i.v));
  return (
    <div className="barras">{itens.map((i) => (
      <div className="bl" key={i.r}><span className="r" title={i.r}>{i.r}</span>
        <span className="trilho"><span style={{ width: `${(i.v / max) * 100}%` }} className={i.classe || ''} /></span>
        <b>{formato(i.v)}</b></div>))}</div>
  );
}
function Numeros({ itens }) {
  return (
    <div className={`numeros ${itens.length === 3 ? 'tres' : ''}`}>
      {itens.map((x) => <div className="n" key={x.r}><span className="rot">{x.r}</span><b className={x.c || ''}>{x.v}</b>{x.s && <span className="sub">{x.s}</span>}</div>)}
    </div>
  );
}
const vendasValidas = (vendas, p) => vendas.filter((v) => v.status !== 'cancelada' && noPeriodo(v.data, p));
const taxasDe = (v) => nn(v.total) - nn(v.lucro) - nn(v.custo_total);

function RelVendas({ ctx, vendas, periodo }) {
  const vs = vendasValidas(vendas, periodo);
  const fat = vs.reduce((a, v) => a + nn(v.total), 0), luc = vs.reduce((a, v) => a + nn(v.lucro), 0);
  const pecas = vs.reduce((a, v) => a + (v.itens || []).reduce((b, i) => b + nn(i.qtd), 0), 0);
  const canc = vendas.filter((v) => v.status === 'cancelada' && noPeriodo(v.data, periodo));
  const porMes = mesesDoPeriodo(periodo).map((ym) => { const xs = vs.filter((v) => v.data.startsWith(ym));
    const f = xs.reduce((a, v) => a + nn(v.total), 0), l = xs.reduce((a, v) => a + nn(v.lucro), 0);
    return { mes: mesCurto(ym) + '/' + ym.slice(2, 4), n: xs.length, fat: f, lucro: l, margem: f ? l / f : NaN, ticket: xs.length ? f / xs.length : 0 }; });
  const canais = {}; for (const v of vs) { const k = ctx.canais.find((c) => c.id === v.canal_id)?.nome || 'Sem canal';
    const x = canais[k] || (canais[k] = { canal: k, n: 0, fat: 0, taxas: 0, lucro: 0 }); x.n++; x.fat += nn(v.total); x.taxas += taxasDe(v); x.lucro += nn(v.lucro); }
  const porCanal = Object.values(canais).sort((a, b) => b.fat - a.fat).map((x) => ({ ...x, margem: x.fat ? x.lucro / x.fat : NaN }));
  return (
    <>
      <Numeros itens={[{ r: 'Faturamento', v: brl(fat), c: 'entra', s: `${vs.length} venda(s)` }, { r: 'Lucro', v: brl(luc), c: luc < 0 ? 'alerta' : '', s: `margem ${pctTxt(fat ? luc / fat : 0)}` },
        { r: 'Ticket médio', v: brl(vs.length ? fat / vs.length : 0), s: `${nf(pecas).replace(',00', '')} peça(s)` }, { r: 'Canceladas', v: brl(canc.reduce((a, v) => a + nn(v.total), 0)), s: `${canc.length} venda(s)` }]} />
      <div className="cartao"><div className="cabeca"><h2>Faturamento por mês</h2></div>
        <Barras itens={porMes.map((m) => ({ r: m.mes, v: m.fat }))} /></div>
      <TabRel titulo="Vendas por mês" arquivo="vendas-por-mes" linhas={porMes}
        cols={[['Mês', 'mes', 'txt'], ['Vendas', 'n', 'n'], ['Faturamento', 'fat', 'brl'], ['Lucro', 'lucro', 'brl'], ['Margem', 'margem', 'pct'], ['Ticket médio', 'ticket', 'brl']]}
        total={{ mes: 'Total', n: vs.length, fat, lucro: luc, margem: fat ? luc / fat : NaN, ticket: vs.length ? fat / vs.length : 0 }} />
      <TabRel titulo="Vendas por canal" sub="taxas = canal, forma de pagamento e imposto" arquivo="vendas-por-canal" linhas={porCanal}
        cols={[['Canal', 'canal', 'txt'], ['Vendas', 'n', 'n'], ['Faturamento', 'fat', 'brl'], ['Taxas', 'taxas', 'brl'], ['Lucro', 'lucro', 'brl'], ['Margem', 'margem', 'pct']]} />
    </>
  );
}

function situacaoOrc(o) {
  if (o.status === 'aprovado') return 'ganho';
  if (o.status === 'recusado' || o.status === 'expirado') return 'perdido';
  const venc = o.criado_em ? ymd(new Date(new Date(o.criado_em + 'T12:00:00').getTime() + nn(o.validade_dias || 7) * 864e5)) : null;
  if (venc && venc < hoje()) return 'vencido';
  return 'aberto';
}
function RelOrcamentos({ ctx, orcamentos, periodo }) {
  const os = orcamentos.filter((o) => noPeriodo(o.criado_em, periodo));
  const g = { ganho: [], perdido: [], vencido: [], aberto: [] }; for (const o of os) g[situacaoOrc(o)].push(o);
  const soma = (xs) => xs.reduce((a, o) => a + nn(o.total), 0);
  const decididos = g.ganho.length + g.perdido.length + g.vencido.length;
  const motivos = {}; for (const o of [...g.perdido, ...g.vencido]) { const k = o.motivo_perda || (situacaoOrc(o) === 'vencido' ? 'Venceu sem registro' : 'Sem motivo registrado');
    const x = motivos[k] || (motivos[k] = { motivo: k, n: 0, valor: 0 }); x.n++; x.valor += nn(o.total); }
  const perdidosN = g.perdido.length + g.vencido.length;
  const porMotivo = Object.values(motivos).sort((a, b) => b.n - a.n).map((x) => ({ ...x, pct: perdidosN ? x.n / perdidosN : 0 }));
  const cli = (o) => ctx.clientes.find((c) => c.id === o.cliente_id)?.nome || 'sem cliente';
  const listaPerdidos = [...g.perdido, ...g.vencido].map((o) => ({ n: o.numero, cliente: cli(o), data: dbr(o.criado_em), valor: nn(o.total),
    motivo: o.motivo_perda || (situacaoOrc(o) === 'vencido' ? 'venceu sem registro' : 'sem motivo'), detalhe: o.motivo_detalhe || '' }));
  const porMes = mesesDoPeriodo(periodo).map((ym) => { const xs = os.filter((o) => o.criado_em.startsWith(ym)); const gan = xs.filter((o) => situacaoOrc(o) === 'ganho');
    return { mes: mesCurto(ym) + '/' + ym.slice(2, 4), n: xs.length, valor: soma(xs), ganhos: gan.length, conv: xs.length ? gan.length / xs.length : NaN }; });
  return (
    <>
      <Numeros itens={[{ r: 'Orçado', v: brl(soma(os)), s: `${os.length} orçamento(s)` }, { r: 'Fechado', v: brl(soma(g.ganho)), c: 'entra', s: `${g.ganho.length} aprovado(s)` },
        { r: 'Conversão', v: pctTxt(decididos ? g.ganho.length / decididos : 0), s: 'sobre os já decididos' }, { r: 'Perdido', v: brl(soma(g.perdido) + soma(g.vencido)), c: perdidosN ? 'alerta' : '', s: `${perdidosN} orçamento(s)` }]} />
      {g.aberto.length > 0 && <div className="aviso">{g.aberto.length} orçamento(s) em aberto, somando {brl(soma(g.aberto))}, ainda dentro da validade.</div>}
      {g.vencido.length > 0 && <div className="aviso atencao">{g.vencido.length} orçamento(s) passaram da validade sem resposta registrada. Abra cada um e registre o motivo para o relatório ficar certo.</div>}
      <div className="cartao"><div className="cabeca"><h2>Por que você perde orçamento</h2><span className="sub">{perdidosN} perdido(s)</span></div>
        {porMotivo.length ? <Barras itens={porMotivo.map((m) => ({ r: m.motivo, v: m.n, classe: 'neutra' }))} formato={(v) => `${v}`} />
          : <div className="vazio">Nenhum orçamento perdido neste período.</div>}</div>
      <TabRel titulo="Motivos de perda" arquivo="orcamentos-motivos-de-perda" linhas={porMotivo}
        cols={[['Motivo', 'motivo', 'txt'], ['Orçamentos', 'n', 'n'], ['Participação', 'pct', 'pct'], ['Valor perdido', 'valor', 'brl']]} />
      <TabRel titulo="Orçamentos perdidos" arquivo="orcamentos-perdidos" linhas={listaPerdidos}
        cols={[['Nº', 'n', 'n'], ['Cliente', 'cliente', 'txt'], ['Emitido', 'data', 'txt'], ['Valor', 'valor', 'brl'], ['Motivo', 'motivo', 'txt'], ['Detalhe', 'detalhe', 'txt']]} />
      <TabRel titulo="Orçamentos por mês" arquivo="orcamentos-por-mes" linhas={porMes}
        cols={[['Mês', 'mes', 'txt'], ['Emitidos', 'n', 'n'], ['Valor orçado', 'valor', 'brl'], ['Aprovados', 'ganhos', 'n'], ['Conversão', 'conv', 'pct']]} />
    </>
  );
}

function RelProdutos({ ctx, vendas, periodo }) {
  const vs = vendasValidas(vendas, periodo);
  const mapa = {};
  for (const v of vs) for (const i of v.itens || []) {
    const k = i.peca_id ? 'p:' + i.peca_id : i.insumo_id ? 'i:' + i.insumo_id : 'd:' + i.descricao;
    const x = mapa[k] || (mapa[k] = { item: i.descricao, tipo: i.peca_id ? 'produto' : i.insumo_id ? 'insumo' : 'avulso', qtd: 0, fat: 0, custo: 0, peca_id: i.peca_id });
    x.qtd += nn(i.qtd); x.fat += nn(i.qtd) * nn(i.preco_unit); x.custo += nn(i.qtd) * nn(i.custo_unit);
  }
  const linhas = Object.values(mapa).map((x) => {
    const p = x.peca_id && ctx.pecas.find((q) => q.id === x.peca_id);
    const horas = p ? nn(p.horasPeca) * x.qtd : 0;
    return { ...x, bruto: x.fat - x.custo, margem: x.fat ? (x.fat - x.custo) / x.fat : NaN, porHora: horas > 0 ? (x.fat - x.custo) / horas : null };
  }).sort((a, b) => b.fat - a.fat);
  const semVenda = ctx.pecas.filter((p) => !mapa['p:' + p.id]).map((p) => ({ nome: p.nome, cat: p.categoria || '', preco: precificar(dePeca(p), ctx, ctx.canais[0]?.id).preco }));
  return (
    <>
      <div className="cartao"><div className="cabeca"><h2>Mais vendidos</h2><span className="sub">por faturamento</span></div>
        {linhas.length ? <Barras itens={linhas.slice(0, 10).map((l) => ({ r: l.item, v: l.fat }))} /> : <div className="vazio">Nenhuma venda neste período.</div>}</div>
      <TabRel titulo="Venda por produto" sub="margem bruta antes das taxas de canal e pagamento" arquivo="venda-por-produto" linhas={linhas}
        cols={[['Item', 'item', 'txt'], ['Tipo', 'tipo', 'txt'], ['Qtd', 'qtd', 'n'], ['Faturamento', 'fat', 'brl'], ['Custo', 'custo', 'brl'], ['Margem bruta', 'bruto', 'brl'], ['Margem', 'margem', 'pct'], ['Por hora de máquina', 'porHora', 'brl']]} />
      <TabRel titulo="Produtos sem venda no período" arquivo="produtos-sem-venda" linhas={semVenda} vazio="Todos os produtos do catálogo venderam."
        cols={[['Produto', 'nome', 'txt'], ['Categoria', 'cat', 'txt'], ['Preço atual', 'preco', 'brl']]} />
    </>
  );
}

function RelClientes({ ctx, vendas, orcamentos, periodo }) {
  const vs = vendasValidas(vendas, periodo);
  const primeira = {}; for (const v of vendas) if (v.status !== 'cancelada' && v.cliente_id && (!primeira[v.cliente_id] || v.data < primeira[v.cliente_id])) primeira[v.cliente_id] = v.data;
  const mapa = {};
  for (const v of vs) { const k = v.cliente_id || '_'; const x = mapa[k] || (mapa[k] = { cliente: ctx.clientes.find((c) => c.id === v.cliente_id)?.nome || 'Sem cliente', n: 0, fat: 0, lucro: 0, ultima: '', novo: '' });
    x.n++; x.fat += nn(v.total); x.lucro += nn(v.lucro); if (v.data > x.ultima) x.ultima = v.data; if (k !== '_' && noPeriodo(primeira[k], periodo)) x.novo = 'sim'; }
  for (const o of orcamentos.filter((o) => noPeriodo(o.criado_em, periodo))) { const k = o.cliente_id || '_'; const x = mapa[k] || (mapa[k] = { cliente: ctx.clientes.find((c) => c.id === o.cliente_id)?.nome || 'Sem cliente', n: 0, fat: 0, lucro: 0, ultima: '', novo: '' });
    x.orc = (x.orc || 0) + 1; if (situacaoOrc(o) === 'ganho') x.ganhos = (x.ganhos || 0) + 1; }
  const linhas = Object.values(mapa).map((x) => ({ ...x, ticket: x.n ? x.fat / x.n : 0, ultimaTxt: dbr(x.ultima), orc: x.orc || 0, conv: x.orc ? (x.ganhos || 0) / x.orc : NaN })).sort((a, b) => b.fat - a.fat);
  const novos = linhas.filter((l) => l.novo).length, fat = linhas.reduce((a, l) => a + l.fat, 0);
  const top3 = linhas.slice(0, 3).reduce((a, l) => a + l.fat, 0);
  return (
    <>
      <Numeros itens={[{ r: 'Clientes que compraram', v: String(linhas.filter((l) => l.n).length) }, { r: 'Clientes novos', v: String(novos), s: 'primeira compra no período' },
        { r: 'Concentração', v: pctTxt(fat ? top3 / fat : 0), s: 'do faturamento nos 3 maiores' }]} />
      <TabRel titulo="Venda por cliente" arquivo="venda-por-cliente" linhas={linhas}
        cols={[['Cliente', 'cliente', 'txt'], ['Compras', 'n', 'n'], ['Faturamento', 'fat', 'brl'], ['Lucro', 'lucro', 'brl'], ['Ticket médio', 'ticket', 'brl'],
          ['Última compra', 'ultimaTxt', 'txt'], ['Orçamentos', 'orc', 'n'], ['Conversão', 'conv', 'pct'], ['Novo', 'novo', 'txt']]} />
    </>
  );
}

function RelFinanceiro({ vendas, lancamentos, periodo }) {
  const vs = vendasValidas(vendas, periodo);
  const receita = vs.reduce((a, v) => a + nn(v.total), 0), custo = vs.reduce((a, v) => a + nn(v.custo_total), 0);
  const taxas = vs.reduce((a, v) => a + taxasDe(v), 0), lucro = vs.reduce((a, v) => a + nn(v.lucro), 0);
  const pagoEm = (l) => l.pago_em || l.venc;
  const despesas = lancamentos.filter((l) => l.tipo === 'pagar' && l.pago && noPeriodo(pagoEm(l), periodo)).reduce((a, l) => a + nn(l.valor), 0);
  const porMes = mesesDoPeriodo(periodo).map((ym) => {
    const ent = lancamentos.filter((l) => l.tipo === 'receber' && l.pago && (pagoEm(l) || '').startsWith(ym)).reduce((a, l) => a + nn(l.valor), 0);
    const sai = lancamentos.filter((l) => l.tipo === 'pagar' && l.pago && (pagoEm(l) || '').startsWith(ym)).reduce((a, l) => a + nn(l.valor), 0);
    return { mes: mesCurto(ym) + '/' + ym.slice(2, 4), ent, sai, res: ent - sai };
  });
  const hj = hoje();
  const aberto = (t) => lancamentos.filter((l) => l.tipo === t && !l.pago);
  const atr = aberto('receber').filter((l) => l.venc < hj), recAberto = aberto('receber').reduce((a, l) => a + nn(l.valor), 0);
  const dre = [
    { conta: 'Receita das vendas', valor: receita }, { conta: '(−) Taxas de canal, pagamento e imposto', valor: -taxas },
    { conta: '(−) Custo de produção', valor: -custo }, { conta: '= Lucro das vendas', valor: lucro },
  ];
  return (
    <>
      <Numeros itens={[{ r: 'Lucro das vendas', v: brl(lucro), c: lucro < 0 ? 'alerta' : 'entra', s: `margem ${pctTxt(receita ? lucro / receita : 0)}` },
        { r: 'Despesas pagas', v: brl(despesas), s: 'lançadas em A pagar' },
        { r: 'A receber atrasado', v: brl(atr.reduce((a, l) => a + nn(l.valor), 0)), c: atr.length ? 'alerta' : '', s: `${pctTxt(recAberto ? atr.reduce((a, l) => a + nn(l.valor), 0) / recAberto : 0)} do que está em aberto` }]} />
      <TabRel titulo="Resultado das vendas" sub="por competência: data da venda" arquivo="resultado-vendas" linhas={dre}
        cols={[['Conta', 'conta', 'txt'], ['Valor', 'valor', 'brl']]} />
      <div className="aviso">Despesas lançadas em A pagar não entram no resultado das vendas, porque parte delas (filamento, energia) já está no custo de produção de cada peça. Olhe as duas coisas lado a lado, não some.</div>
      <TabRel titulo="Caixa por mês" sub="o que foi recebido e pago de fato" arquivo="caixa-por-mes" linhas={porMes}
        cols={[['Mês', 'mes', 'txt'], ['Recebido', 'ent', 'brl'], ['Pago', 'sai', 'brl'], ['Resultado', 'res', 'brl']]}
        total={{ mes: 'Total', ent: porMes.reduce((a, m) => a + m.ent, 0), sai: porMes.reduce((a, m) => a + m.sai, 0), res: porMes.reduce((a, m) => a + m.res, 0) }} />
      <TabRel titulo="Recebimentos atrasados" arquivo="recebimentos-atrasados" vazio="Nenhum recebimento atrasado."
        linhas={atr.sort((a, b) => a.venc.localeCompare(b.venc)).map((l) => ({ venc: dbr(l.venc), desc: l.descricao, dias: Math.round((new Date(hj) - new Date(l.venc)) / 864e5), valor: nn(l.valor) }))}
        cols={[['Vencimento', 'venc', 'txt'], ['Descrição', 'desc', 'txt'], ['Dias de atraso', 'dias', 'n'], ['Valor', 'valor', 'brl']]} />
    </>
  );
}

/* ===================== FILAMENTOS ===================== */
const precoKgFil = (x) => (nn(x.preco) / (nn(x.peso_g) || 1000)) * 1000;
const nomeTipo = (ctx, id) => ctx.materiais.find((m) => m.id === id)?.nome || 'sem tipo';
const rotuloFil = (ctx, x) => [nomeTipo(ctx, x.tipo_id), x.cor, x.marca].filter(Boolean).join(' · ');
const baseDe = (s) => s.base || (s.tempoBase === 'lote' && s.modo === 'lote' ? 'legado' : 'peca');
const pecasDe = (s) => (s.modo === 'lote' ? s.lote : 1);

function FilaFilamento({ f, ctx, onChange, onRemove }) {
  const fil = f.filamento_id ? ctx.filamentos.find((x) => x.id === f.filamento_id) : null;
  const tipo = ctx.materiais.find((m) => m.id === f.material_id);
  const rotuloAtual = fil ? rotuloFil(ctx, fil) : tipo ? tipo.nome : '';
  const [txt, setTxt] = useState(rotuloAtual);
  useEffect(() => { setTxt(rotuloAtual); }, [f.filamento_id, f.material_id]);
  const perdaDoTipo = (tid) => { const m = ctx.materiais.find((x) => x.id === tid); return m ? m.perda_pct * 100 : 5; };
  const usarFil = (x) => onChange({ ...f, filamento_id: x.id, material_id: x.tipo_id, preco_kg: r2(precoKgFil(x)),
    cor: /^#[0-9a-f]{6}$/i.test(x.cor_hex || '') ? x.cor_hex : f.cor, perda: f.origem === 'fatiador' ? f.perda : perdaDoTipo(x.tipo_id), auto: false });
  const itens = [
    ...ctx.filamentos.map((x) => ({ tipo: 'f', id: x.id, nome: rotuloFil(ctx, x), detalhe: `${brl(precoKgFil(x))}/kg` })),
    ...ctx.materiais.map((m) => ({ tipo: 'm', id: m.id, nome: m.nome, detalhe: `tipo genérico · ${brl(m.preco_kg)}/kg` })),
  ];
  const set = (k, v) => {
    if (k === 'preco_kg' || k === 'perda') onChange({ ...f, [k]: v, auto: false });
    else if (k === 'gramas' && f.origem === 'fatiador') onChange({ ...f, gramas: v, origem: 'manual' });
    else onChange({ ...f, [k]: v });
  };
  return (
    <>
    <div className="fila">
      <EscolheCor rot="Cor" cor={f.cor} ctx={ctx} onFilamento={usarFil} onCor={(h) => set('cor', h)} />
      <Autocompleta id={`m${f.key}`} rotulo="Filamento" texto={txt} setTexto={setTxt} placeholder="tipo, cor ou marca" itens={itens}
        onEscolher={(x) => { if (x.tipo === 'f') usarFil(ctx.filamentos.find((y) => y.id === x.id));
          else { const m = ctx.materiais.find((y) => y.id === x.id); onChange({ ...f, filamento_id: null, material_id: m.id, preco_kg: m.preco_kg,
            perda: f.origem === 'fatiador' ? f.perda : m.perda_pct * 100, auto: true }); } }}
        onCriar={(t) => ctx.pedirFilamento(t, usarFil)} textoCriar={(t) => `Cadastrar filamento "${t}"`} />
      <CampoMoeda id={`p${f.key}`} rot="Por kg" valor={f.preco_kg} step="1" onChange={(v) => set('preco_kg', v)} />
      <div><label htmlFor={`g${f.key}`}>Gramas</label>
        <input id={`g${f.key}`} type="number" min="0" step="0.1" value={f.gramas}
          style={{ textAlign: 'right' }} onChange={(e) => set('gramas', e.target.value)} /></div>
      {f.origem === 'fatiador'
        ? <div><label htmlFor={`d${f.key}`}>Perda</label>
            <input id={`d${f.key}`} value="fatiador" disabled title="O fatiador já conta purga, skirt e suporte"
              style={{ textAlign: 'right', fontSize: 12.5 }} /></div>
        : <CampoPct id={`d${f.key}`} rot="Perda" fracao={nn(f.perda) / 100} step="1"
            onChange={(fr) => set('perda', r2(fr * 100))} />}
      <button className="ico perigo" onClick={onRemove} aria-label="Remover filamento" title="Remover"><Ico n="x" /></button>
    </div>
    {!f.filamento_id && f.cor && !f.manter_cor && (
      <div className="aviso-cor"><i className="swatch" style={{ background: f.cor }} />
        <span>{String(f.cor).toUpperCase()}{tipo ? ` (${tipo.nome})` : ''} não está nos seus filamentos.</span>
        <button className="link" onClick={() => document.getElementById(`m${f.key}`)?.focus()}>Trocar por uma cadastrada</button>
        <button className="link" onClick={() => ctx.pedirFilamento('', usarFil, { cor_hex: f.cor, tipo_id: f.material_id })}>Cadastrar esta cor</button>
        <button className="link" onClick={() => onChange({ ...f, manter_cor: true })}>Manter assim</button>
      </div>)}
    </>
  );
}

/* ===================== INÍCIO ===================== */
async function carregarXlsx() {
  for (const src of ['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js']) {
    if (window.XLSX) return;
    await new Promise((ok) => { const e = document.createElement('script'); e.src = src; e.onload = ok; e.onerror = ok; document.head.appendChild(e); });
  }
}
function dataUrlParaFile(d, nome) {
  const [cab, b64] = d.split(','); const tipo = cab.match(/data:([^;]+)/)[1];
  const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new File([u], nome, { type: tipo });
}
/* ===================== v3.4: base comum ===================== */
const TelaIcoCtx = createContext('');
function IcoTitulo() { const n = useContext(TelaIcoCtx); return n ? <span className="ico-titulo" aria-hidden="true"><Ico n={n} s={20} /></span> : null; }

/* campo de escolha: sempre autocomplete, com cadastro por modal quando não existe */
function Escolha({ id, rotulo, itens, valor, onEscolher, onCriar, textoCriar, placeholder, semRotulo, dica }) {
  const sel = itens.find((x) => x.id === valor);
  const [txt, setTxt] = useState(sel ? sel.nome : '');
  useEffect(() => { setTxt(sel ? sel.nome : ''); }, [valor, sel?.nome]);
  return (
    <div>
      <Autocompleta id={id} rotulo={rotulo} semRotulo={semRotulo} itens={itens} texto={txt} setTexto={setTxt}
        placeholder={placeholder || 'digite para buscar'}
        onEscolher={(x) => { setTxt(x.nome); onEscolher(x); }}
        onSair={() => setTxt(sel ? sel.nome : '')}
        onCriar={onCriar ? (t) => onCriar(t, (x) => { setTxt(x.nome); onEscolher(x); }) : null} textoCriar={textoCriar} />
      {dica && <span className="dica">{dica}</span>}
    </div>
  );
}

/* modal genérico de cadastro rápido. campos: [chave, rótulo, tipo ('txt'|'moeda'|'pct'|'num'), dica] */
function ModalCampos({ titulo, campos, inicial, onSalvar, onCancelar }) {
  const [f, setF] = useState(inicial);
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal titulo={titulo} onFechar={onCancelar}>
      <div className="grade">{campos.map(([k, rot, tipo, dica], i) => (
        tipo === 'moeda' ? <CampoMoeda key={k} id={`mc-${k}`} rot={rot} valor={f[k]} onChange={(v) => set(k, v)} dica={dica} />
        : tipo === 'pct' ? <CampoPct key={k} id={`mc-${k}`} rot={rot} fracao={f[k]} onChange={(v) => set(k, v)} dica={dica} />
        : <div key={k} style={tipo === 'txt' && i === 0 ? { gridColumn: '1/-1' } : null}><label htmlFor={`mc-${k}`}>{rot}</label>
            <input id={`mc-${k}`} autoFocus={i === 0} type={tipo === 'num' ? 'number' : 'text'} value={f[k] ?? ''} style={tipo === 'num' ? { textAlign: 'right' } : null}
              onChange={(e) => set(k, tipo === 'num' ? e.target.value : e.target.value)} />{dica && <span className="dica">{dica}</span>}</div>))}</div>
      <div className="linha-bt">
        <button className="bt forte" disabled={!String(f[campos[0][0]] || '').trim()} onClick={() => {
          const out = { ...f }; for (const [k, , t] of campos) if (t !== 'txt') out[k] = nn(out[k]);
          onSalvar({ id: f.id || uid(), ...out, [campos[0][0]]: String(f[campos[0][0]]).trim() }); }}><Ico n="check" s={15} /> Salvar e usar</button>
        <div className="esp" /><button className="bt" onClick={onCancelar}>Cancelar</button>
      </div>
    </Modal>
  );
}
const CADASTROS_RAPIDOS = {
  canal: { lista: 'canais', titulo: 'Novo canal de venda', campos: [['nome', 'Nome', 'txt'], ['taxa_pct', 'Taxa', 'pct', 'comissão do canal'], ['taxa_fixa', 'Taxa fixa por peça', 'moeda']],
    base: { taxa_pct: 0, taxa_fixa: 0 } },
  forma: { lista: 'formas', titulo: 'Nova forma de pagamento', campos: [['nome', 'Nome', 'txt'], ['taxa_pct', 'Taxa', 'pct', 'o que cobram de você'], ['taxa_fixa', 'Taxa fixa', 'moeda']],
    base: { taxa_pct: 0, taxa_fixa: 0, ativa: true } },
  impressora: { lista: 'impressoras', titulo: 'Nova impressora', campos: [['nome', 'Nome', 'txt'], ['potencia_w', 'Potência (W)', 'num'], ['valor_compra', 'Valor pago', 'moeda'],
    ['vida_util_h', 'Vida útil (h)', 'num'], ['manutencao_hora', 'Manutenção por hora', 'moeda']], base: { potencia_w: 150, valor_compra: 0, vida_util_h: 5000, manutencao_hora: 0 } },
  tipo: { lista: 'materiais', titulo: 'Novo tipo de filamento', campos: [['nome', 'Nome do tipo', 'txt'], ['preco_kg', 'Preço de referência por kg', 'moeda'], ['perda_pct', 'Perda', 'pct', 'purga, skirt e suporte']],
    base: { preco_kg: 0, perda_pct: 0.05 } },
};

/* imagem reduzida no navegador: foto de produto, logo de cliente e de marca */
function reduzirImagem(file, max = 320, formato = 'image/jpeg') {
  return new Promise((ok, erro) => {
    if (file.size > 8 * 1048576) return erro(new Error('Imagem acima de 8 MB.'));
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL(formato, 0.82)); };
      img.onerror = () => erro(new Error('Não consegui abrir esta imagem.')); img.src = r.result; };
    r.readAsDataURL(file);
  });
}
function Avatar({ src, nome, tam = 30, redondo = true }) {
  const cor = ['#1087D1', '#41627A', '#0C68A1', '#6B7F8E', '#094972'][(String(nome || '?').charCodeAt(0) || 0) % 5];
  return src ? <img className={`avatar-img ${redondo ? 'red' : ''}`} src={src} alt="" style={{ width: tam, height: tam }} />
    : <span className={`avatar-mono ${redondo ? 'red' : ''}`} style={{ width: tam, height: tam, background: cor, fontSize: tam * 0.4 }}>{iniciais(nome)}</span>;
}
function Miniatura({ src, tam = 44 }) {
  return src ? <img className="miniatura" src={src} alt="" style={{ width: tam, height: tam }} />
    : <span className="miniatura vazia" style={{ width: tam, height: tam }}><Ico n="cubo" s={tam * 0.42} /></span>;
}
function FotoCampo({ valor, onMuda, rotulo, formato = 'image/jpeg', redondo }) {
  const [erro, setErro] = useState('');
  return (
    <div className="foto-campo">
      {redondo ? <Avatar src={valor} nome={rotulo} tam={72} /> : <Miniatura src={valor} tam={88} />}
      <div>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>{rotulo}</div>
        <div className="linha-bt" style={{ marginTop: 0 }}>
          <label className="bt mini" style={{ margin: 0 }}><Ico n="imagem" s={14} /> {valor ? 'Trocar' : 'Enviar imagem'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files[0]; e.target.value = '';
              if (!f) return; try { setErro(''); onMuda(await reduzirImagem(f, 360, formato)); } catch (err) { setErro(err.message); } }} /></label>
          {valor && <button className="bt mini" onClick={() => onMuda(null)}>Tirar</button>}
        </div>
        {erro ? <span className="dica alerta-txt">{erro}</span> : <span className="dica">JPG ou PNG. O sistema reduz o tamanho sozinho.</span>}
      </div>
    </div>
  );
}

/* paleta de cor: primeiro as cores dos filamentos cadastrados, depois uma paleta básica, depois qualquer cor */
const PALETA = [['Branco', '#F4F4F2'], ['Preto', '#1E1E1E'], ['Cinza', '#8A8F96'], ['Vermelho', '#C62828'], ['Laranja', '#F28C28'], ['Amarelo', '#F2C200'],
  ['Verde', '#2E7D32'], ['Azul', '#1565C0'], ['Roxo', '#6A1B9A'], ['Rosa', '#E91E63'], ['Marrom', '#6D4C41'], ['Bege', '#D7C4A3']];
function EscolheCor({ cor, ctx, onFilamento, onCor, rot }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (!aberto) return; const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, [aberto]);
  const fils = ctx.filamentos.filter((x) => x.cor_hex);
  return (
    <div className="escolhe-cor" ref={ref}>
      {rot && <label>{rot}</label>}
      <button type="button" className="swatch-bt" style={{ background: cor }} aria-label="Escolher cor" aria-expanded={aberto} onClick={() => setAberto(!aberto)} />
      {aberto && (
        <div className="paleta" role="dialog" aria-label="Cores">
          {fils.length > 0 && <><span className="rot">Seus filamentos</span>
            <div className="sw">{fils.map((x) => (
              <button key={x.id} type="button" title={rotuloFil(ctx, x)} style={{ background: x.cor_hex }} className={x.cor_hex.toLowerCase() === String(cor).toLowerCase() ? 'on' : ''}
                onClick={() => { onFilamento(x); setAberto(false); }} />))}</div></>}
          <span className="rot">Outras cores</span>
          <div className="sw">{PALETA.map(([n, h]) => <button key={h} type="button" title={n} style={{ background: h }} onClick={() => { onCor(h); setAberto(false); }} />)}</div>
          <label className="outra"><input type="color" value={cor} onChange={(e) => onCor(e.target.value)} /> Escolher outra cor</label>
        </div>)}
    </div>
  );
}

/* ===================== estoque de filamento ===================== */
const estoqueDe = (x) => (x.estoque_g != null && x.estoque_g !== '' ? nn(x.estoque_g) : nn(x.quantidade) * (nn(x.peso_g) || 1000));
const gTxt = (g) => (Math.abs(g) >= 1000 ? `${(g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : `${Math.round(g)} g`);
const limiteFil = (ctx) => nn(ctx.params.alerta_filamento_g ?? 250) || 250;
const acharFilDaLinha = (ctx, f) => (f.filamento_id && ctx.filamentos.find((x) => x.id === f.filamento_id))
  || ctx.filamentos.find((x) => x.tipo_id === f.material_id && String(x.cor_hex || '').toLowerCase() === String(f.cor || '').toLowerCase()) || null;
/* consumo de um documento: gramas por filamento, já com perda, na base por peça do produto */
/* ===================== importação de planilha (genérica) ===================== */
function lerTabelaTexto(txt) {
  const l0 = txt.split('\n')[0];
  if (l0.includes('\t')) return txt.split('\n').filter((l) => l.length).map((l) => l.replace(/\r$/, '').split('\t'));
  return lerCsv(txt);
}
function ImportaPlanilha({ titulo, extrair, colunas, modelo, existe, onGravar, onFechar, extra }) {
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState('');
  const [link, setLink] = useState('');
  const [colado, setColado] = useState('');
  const [lendo, setLendo] = useState(false);
  const [atualizar, setAtualizar] = useState(true);
  const receber = (r) => { setLendo(false); if (r.erro) { setErro(r.erro); setPrevia(null); } else { setErro(''); setPrevia(r.itens); } };
  const deLinhas = (linhas) => receber(extrair(linhas));
  const baixar = () => {
    const csv = '\uFEFF' + modelo.linhas.map((l) => l.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = modelo.nome + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  const lerLink = async () => {
    setLendo(true);
    const m = link.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!m) return receber({ erro: 'Este link não é de uma planilha do Google.' });
    const gid = (link.match(/[#&?]gid=(\d+)/) || [])[1];
    const urls = [`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? '&gid=' + gid : ''}`, `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? '&gid=' + gid : ''}`];
    let bloqueado = false;
    for (const u of urls) {
      try { const r = await fetch(u); if (!r.ok) continue; const t = await r.text(); if (/<html/i.test(t.slice(0, 300))) continue; return deLinhas(lerCsv(t)); }
      catch (e) { bloqueado = true; }
    }
    receber({ erro: bloqueado
      ? 'O navegador não conseguiu falar com o Google a partir desta página. Use o campo "Colar da planilha": selecione as células no Google Sheets, copie e cole aqui.'
      : 'O Google não liberou a planilha. Em Compartilhar, deixe "Qualquer pessoa com o link" como leitor, ou copie as células e use o campo "Colar da planilha".' });
  };
  return (
    <Modal titulo={titulo} onFechar={onFechar} largo>
      {!previa ? (<>
        <div className="passo"><span className="n">1</span><div><b>Baixe a planilha modelo</b> e preencha uma linha por item.
          <div className="linha-bt" style={{ marginTop: 8 }}><button className="bt mini" onClick={baixar}><Ico n="baixa" s={14} /> Baixar modelo</button></div></div></div>
        <div className="passo"><span className="n">2</span><div style={{ flex: 1, minWidth: 0 }}><b>Traga os dados</b> de um destes jeitos:
          <div className="linha-bt" style={{ marginTop: 8 }}>
            <label className="bt mini" style={{ margin: 0 }}><Ico n="doc" s={14} /> Enviar arquivo CSV ou Excel
              <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.ods" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
                setLendo(true); try {
                  if (/\.(xlsx|xls|ods)$/i.test(f.name)) { await carregarXlsx(); const wb = window.XLSX; if (!wb) throw new Error('Leitor de Excel indisponível. Salve como CSV.');
                    const book = wb.read(await f.arrayBuffer(), { type: 'array' }); let achou = null;
                    for (const n of book.SheetNames) { const r = extrair(wb.utils.sheet_to_json(book.Sheets[n], { header: 1, raw: false, defval: '' })); if (r.itens) { achou = r; break; } }
                    receber(achou || { erro: 'Nenhuma aba tem as colunas esperadas.' });
                  } else deLinhas(lerTabelaTexto(await f.text()));
                } catch (err) { receber({ erro: String(err.message || err) }); } }} /></label>
          </div>
          <label htmlFor="imp-colar" style={{ marginTop: 12 }}>Colar da planilha</label>
          <textarea id="imp-colar" value={colado} placeholder="Selecione as células no Excel ou Google Sheets (com o cabeçalho), copie e cole aqui"
            onChange={(e) => setColado(e.target.value)} style={{ minHeight: 90 }} />
          <div className="linha-bt" style={{ marginTop: 8 }}><button className="bt mini" disabled={!colado.trim()} onClick={() => deLinhas(lerTabelaTexto(colado))}>Ler o que colei</button></div>
          <label htmlFor="imp-link" style={{ marginTop: 12 }}>Link do Google Sheets</label>
          <div className="link-planilha" style={{ marginTop: 0 }}>
            <input id="imp-link" value={link} placeholder="https://docs.google.com/spreadsheets/d/…" onChange={(e) => setLink(e.target.value)} />
            <button className="bt" disabled={!link.trim() || lendo} onClick={lerLink}>{lendo ? 'Lendo…' : 'Ler planilha'}</button></div>
        </div></div>
        {erro && <div className="aviso ruim" style={{ marginTop: 12, marginBottom: 0 }}>{erro}</div>}
      </>) : (<>
        <div className="cabeca"><h3>{previa.length} item(ns) encontrados</h3><span className="sub">confira antes de gravar</span></div>
        {extra}
        <div className="rolo" style={{ maxHeight: 340, overflowY: 'auto' }}><table>
          <thead><tr>{colunas.map(([r]) => <th key={r}>{r}</th>)}<th>Situação</th></tr></thead>
          <tbody>{previa.map((it, k) => <tr key={k}>{colunas.map(([r, fn]) => <td key={r}>{fn(it)}</td>)}
            <td className="sub">{existe(it) ? (atualizar ? 'atualiza' : 'ignora') : 'novo'}</td></tr>)}</tbody></table></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12, fontSize: 14 }}>
          <Check on={atualizar} rot="Atualizar os que já existem" onClick={() => setAtualizar(!atualizar)} /> Atualizar os que já existem</div>
        <div className="linha-bt">
          <button className="bt forte" onClick={() => onGravar(previa, atualizar)}><Ico n="check" s={15} /> Gravar {previa.length}</button>
          <button className="bt" onClick={() => setPrevia(null)}>Voltar</button><div className="esp" />
          <button className="bt" onClick={onFechar}>Cancelar</button></div>
      </>)}
    </Modal>
  );
}
const MODELO_INSUMOS = { nome: 'make3lab-modelo-insumos', linhas: [['Nome', 'Categoria', 'Unidade', 'Qtd no pacote', 'Preço do pacote', 'Fornecedor', 'Link de compra', 'Estoque'],
  ['Argola de chaveiro', 'Ferragem', 'un', '100', '39,50', '', '', '60'], ['Ímã de neodímio 10x2 mm', 'Ferragem', 'un', '50', '36,70', '', '', '8'],
  ['Saco a vácuo', 'Embalagem', 'un', '10', '39,99', '', '', '4'], ['Sílica gel', 'Embalagem', 'un', '100', '19,00', '', '', '']] };
const MODELO_FILAMENTOS = { nome: 'make3lab-modelo-filamentos', linhas: [['Tipo', 'Cor', 'Hex da cor', 'Marca', 'Peso da bobina (g)', 'Preço da bobina', 'Estoque (g)'],
  ['PLA', 'Preto fosco', '#1E1E1E', 'Voolt', '1000', '119,00', '1000'], ['PLA', 'Ivory White', '#EDE6D6', 'Bambu', '1000', '120,00', '650'],
  ['PETG', 'Transparente', '', 'eSun', '1000', '129,00', '1000']] };
const CORES_NOMES = [['preto', '#1E1E1E'], ['branco', '#F4F4F2'], ['cinza', '#8A8F96'], ['prata', '#B8BCC2'], ['vermelho', '#C62828'], ['laranja', '#F28C28'],
  ['amarelo', '#F2C200'], ['dourado', '#C9A227'], ['verde', '#2E7D32'], ['azul', '#1565C0'], ['roxo', '#6A1B9A'], ['lilas', '#9C7AC8'], ['rosa', '#E91E63'],
  ['marrom', '#6D4C41'], ['bege', '#D7C4A3'], ['transparente', '#DDE7EE'], ['natural', '#E8E2D0'], ['ivory', '#EDE6D6'], ['black', '#1E1E1E'], ['white', '#F4F4F2']];
const palpiteHex = (nome) => { const n = semAcento(nome); const a = CORES_NOMES.find(([k]) => n.includes(k)); return a ? a[1] : '#8FA3B0'; };
function extrairFilamentos(linhas, ctx) {
  const vazia = (l) => !l || l.every((c) => !String(c ?? '').trim());
  const h = linhas.findIndex((l) => (l || []).some((c) => ['cor', 'cores', 'color'].includes(semAcento(c))));
  if (h < 0) return { erro: 'Não achei a coluna Cor. A planilha precisa ter pelo menos Cor e Preço.' };
  const cab = linhas[h].map(semAcento);
  const col = (sin) => cab.findIndex((c) => sin.includes(c));
  const ix = { tipo: col(['tipo', 'material']), cor: col(['cor', 'cores', 'color']), hex: col(['hex', 'hex da cor', 'cor hex']), marca: col(['marca', 'fabricante']),
    peso: col(['peso', 'peso (g)', 'peso da bobina (g)', 'peso da bobina', 'gramas']), preco: col(['preco', 'valor', 'preco da bobina', 'custo']),
    estoque: col(['estoque', 'estoque (g)', 'restante', 'gramas restantes']), bobinas: col(['qtd', 'quantidade', 'bobinas']) };
  const itens = [];
  for (let k = h + 1; k < linhas.length && !vazia(linhas[k]); k++) {
    const l = linhas[k]; const cor = String(l[ix.cor] ?? '').trim(); if (!cor) continue;
    const tipoTxt = ix.tipo >= 0 ? String(l[ix.tipo] ?? '').trim() : '';
    const m = tipoTxt ? acharMaterial(tipoTxt, ctx.materiais) : null;
    const peso = ix.peso >= 0 ? dinheiro(l[ix.peso]) : NaN;
    const preco = ix.preco >= 0 ? dinheiro(l[ix.preco]) : NaN;
    const est = ix.estoque >= 0 ? dinheiro(l[ix.estoque]) : NaN, bob = ix.bobinas >= 0 ? dinheiro(l[ix.bobinas]) : NaN;
    const hex = ix.hex >= 0 && /^#?[0-9a-f]{6}$/i.test(String(l[ix.hex]).trim()) ? '#' + String(l[ix.hex]).trim().replace('#', '') : palpiteHex(cor);
    const pesoG = peso > 0 ? peso : 1000;
    itens.push({ tipo_txt: tipoTxt, tipo_id: m ? m.id : '', cor, cor_hex: hex, marca: ix.marca >= 0 ? String(l[ix.marca] ?? '').trim() : '',
      peso_g: pesoG, preco: preco >= 0 ? preco : 0, estoque_g: est >= 0 ? est : bob > 0 ? bob * pesoG : pesoG });
  }
  return itens.length ? { itens } : { erro: 'Achei o cabeçalho, mas nenhuma linha preenchida embaixo dele.' };
}

/* ===================== INSUMOS (mesmo padrão das outras listas) ===================== */
/* ===================== FILAMENTOS ===================== */
/* ===================== ALERTAS ===================== */
function alertasDe({ ctx, orcamentos, vendas, lancamentos }) {
  const hj = hoje(), em = (d) => ymd(new Date(Date.now() + d * 864e5)), out = [];
  const lim = limiteFil(ctx);
  for (const x of ctx.filamentos.filter((x) => estoqueDe(x) < lim))
    out.push({ nivel: estoqueDe(x) <= 0 ? 'erro' : 'atencao', ico: 'bobina', txt: `${rotuloFil(ctx, x)} ${estoqueDe(x) <= 0 ? 'acabou' : `com ${gTxt(estoqueDe(x))} (${carreteisTxt(x)})`}`, ir: 'cad-filamentos' });
  for (const x of ctx.insumos.filter((x) => controlaEstoque(x) && nn(x.estoque) <= nn(x.estoque_min)))
    out.push({ nivel: nn(x.estoque) <= 0 ? 'erro' : 'atencao', ico: 'caixa', txt: `${x.nome} ${nn(x.estoque) <= 0 ? 'acabou' : `com ${nf(x.estoque).replace(',00', '')} ${x.unidade || 'un'}`}`, ir: 'cad-insumos' });
  const pagar = lancamentos.filter((l) => l.tipo === 'pagar' && !l.pago);
  const pAtr = pagar.filter((l) => l.venc < hj), pProx = pagar.filter((l) => l.venc >= hj && l.venc <= em(3));
  if (pAtr.length) out.push({ nivel: 'erro', ico: 'grana', txt: `${pAtr.length} conta(s) a pagar atrasada(s), ${brl(pAtr.reduce((a, l) => a + nn(l.valor), 0))}`, ir: 'fin-pagar' });
  for (const l of pProx) out.push({ nivel: 'atencao', ico: 'grana', txt: `${l.descricao} vence ${l.venc === hj ? 'hoje' : dbr(l.venc).slice(0, 5)}: ${brl(l.valor)}`, ir: 'fin-pagar' });
  const rAtr = lancamentos.filter((l) => l.tipo === 'receber' && !l.pago && l.venc < hj);
  if (rAtr.length) out.push({ nivel: 'erro', ico: 'grana', txt: `${rAtr.length} recebimento(s) atrasado(s), ${brl(rAtr.reduce((a, l) => a + nn(l.valor), 0))}`, ir: 'fin-receber' });
  for (const o of orcamentos.filter((o) => situacaoOrc(o) === 'aberto')) {
    const venc = ymd(new Date(new Date(o.criado_em + 'T12:00:00').getTime() + nn(o.validade_dias || 7) * 864e5));
    if (venc <= em(2)) out.push({ nivel: 'atencao', ico: 'doc', txt: `Orçamento nº ${o.numero} vence ${venc === hj ? 'hoje' : 'em ' + dbr(venc).slice(0, 5)}: cobre a resposta`, abrir: ['orcamentos', { abrir: o.id }] });
  }
  const venc = orcamentos.filter((o) => situacaoOrc(o) === 'vencido');
  if (venc.length) out.push({ nivel: 'info', ico: 'doc', txt: `${venc.length} orçamento(s) vencido(s) sem motivo de perda registrado`, ir: 'orcamentos' });
  for (const v of vendas.filter((v) => (v.status === 'aberta' || v.status === 'producao') && v.data && v.data < em(-7)))
    out.push({ nivel: 'info', ico: 'tag', txt: `Venda nº ${v.numero} ${v.status === 'producao' ? 'em produção' : 'aberta'} desde ${dbr(v.data).slice(0, 5)}`, abrir: ['vendas', { abrir: v.id }] });
  for (const p of ctx.pecas) { const c = precificar(dePeca(p), ctx); const h = c.horas_unit;
    if (h > 0 && c.lucro / h < 15) out.push({ nivel: 'info', ico: 'cubo', txt: `${p.nome} dá ${brl(c.lucro / h)} por hora de máquina, abaixo de R$ 15`, ir: 'catalogo' }); }
  const semPreco = ctx.insumos.filter((x) => !nn(x.preco_pacote)).length;
  if (semPreco) out.push({ nivel: 'info', ico: 'caixa', txt: `${semPreco} insumo(s) sem preço: o custo sai errado`, ir: 'cad-insumos' });
  const ordem = { erro: 0, atencao: 1, info: 2 };
  return out.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}
function ListaAlertas({ alertas, ir, abrir, max }) {
  const xs = max ? alertas.slice(0, max) : alertas;
  return <ul className="alertas">{xs.map((a, k) => (
    <li key={k} className={a.nivel}><button onClick={() => (a.abrir ? abrir(...a.abrir) : ir(a.ir))}>
      <span className="marca-al"><Ico n={a.ico} s={15} /></span><span>{a.txt}</span><Ico n="seta" s={14} /></button></li>))}</ul>;
}

/* ===================== BARRA DE CIMA ===================== */
const ATALHOS = [
  ['orc', 'Novo orçamento', 'doc'], ['venda', 'Nova venda', 'tag'], ['sim', 'Simular peça', 'calc'], ['prod', 'Novo produto', 'cubo'],
  ['cli', 'Novo cliente', 'users'], ['fil', 'Novo filamento', 'bobina'], ['ins', 'Novo insumo', 'caixa'], ['pagar', 'Conta a pagar', 'grana'],
  ['receber', 'Valor a receber', 'grana'], ['rel', 'Relatórios', 'grafico'],
];
function BarraTopo({ ctx, alertas, ir, abrir, atalhos, setAtalhos, orcamentos, vendas, onMenu }) {
  const [sino, setSino] = useState(false); const [edita, setEdita] = useState(false); const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => { const f = (e) => { if (ref.current && !ref.current.contains(e.target)) { setSino(false); setEdita(false); } };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
  const executar = (k) => ({ orc: () => abrir('orcamentos', { novo: true }), venda: () => abrir('vendas', { novo: true }), sim: () => ir('simulador'),
    prod: () => abrir('catalogo', { novo: true }), cli: () => ctx.pedirCliente('', () => {}), fil: () => ctx.pedirFilamento('', () => {}), ins: () => ctx.pedirInsumo('', () => {}),
    pagar: () => abrir('fin-pagar', { novo: true }), receber: () => abrir('fin-receber', { novo: true }), rel: () => ir('rel-vendas') })[k]();
  const cli = (id) => ctx.clientes.find((c) => c.id === id)?.nome || 'sem cliente';
  const itens = [
    ...ctx.clientes.map((c) => ({ tipo: 'c', id: c.id, nome: c.nome, detalhe: 'cliente' })),
    ...ctx.pecas.map((p) => ({ tipo: 'p', id: p.id, nome: p.nome, detalhe: 'produto' })),
    ...orcamentos.map((o) => ({ tipo: 'o', id: o.id, nome: `Orçamento nº ${o.numero} · ${cli(o.cliente_id)}`, detalhe: brl(o.total) })),
    ...vendas.map((v) => ({ tipo: 'v', id: v.id, nome: `Venda nº ${v.numero} · ${cli(v.cliente_id)}`, detalhe: brl(v.total) })),
    ...ctx.filamentos.map((x) => ({ tipo: 'f', id: x.id, nome: rotuloFil(ctx, x), detalhe: gTxt(estoqueDe(x)) })),
    ...ctx.insumos.map((x) => ({ tipo: 'i', id: x.id, nome: x.nome, detalhe: 'insumo' })),
  ];
  const vermelhos = alertas.filter((a) => a.nivel !== 'info').length;
  return (
    <header className="topo" ref={ref}>
      <button className="ico so-mobile" onClick={onMenu} aria-label="Abrir menu"><Ico n="menu" /></button>
      <span className="so-mobile marca-topo"><Marca altura={15} /></span>
      <div className="busca-global">
        <Autocompleta id="busca-global" rotulo="Buscar" semRotulo itens={itens} texto={q} setTexto={setQ} placeholder="Buscar cliente, produto, orçamento, filamento…"
          onEscolher={(x) => { setQ(''); ({ c: () => ir('clientes'), p: () => ir('catalogo'), o: () => abrir('orcamentos', { abrir: x.id }), v: () => abrir('vendas', { abrir: x.id }),
            f: () => ir('cad-filamentos'), i: () => ir('cad-insumos') })[x.tipo](); }} />
      </div>
      <div className="esp" />
      <div className="atalhos-topo">
        {atalhos.map((k) => { const a = ATALHOS.find((x) => x[0] === k); return a && (
          <button key={k} className="bt mini" onClick={() => executar(k)} title={a[1]}><Ico n={a[2]} s={14} /><span>{a[1]}</span></button>); })}
        <button className="ico" title="Escolher atalhos" aria-label="Escolher atalhos" aria-expanded={edita} onClick={() => { setEdita(!edita); setSino(false); }}><Ico n="eng" /></button>
        {edita && <div className="pop pop-atalhos"><b>Atalhos da barra</b><span className="sub">até 4</span>
          {ATALHOS.map(([k, r, i]) => { const on = atalhos.includes(k); return (
            <label key={k} className="opcao"><Check on={on} rot={r} onClick={() => setAtalhos(on ? atalhos.filter((x) => x !== k) : atalhos.length < 4 ? [...atalhos, k] : atalhos)} />
              <Ico n={i} s={14} /> {r}</label>); })}</div>}
      </div>
      <button className={`ico sino ${vermelhos ? 'tem' : ''}`} aria-label={`Alertas: ${alertas.length}`} aria-expanded={sino} onClick={() => { setSino(!sino); setEdita(false); }}>
        <Ico n="sino" />{alertas.length > 0 && <span className="cont">{alertas.length}</span>}</button>
      {sino && <div className="pop pop-alertas"><div className="cabeca" style={{ marginBottom: 8 }}><h3>Alertas</h3><span className="sub">{alertas.length}</span></div>
        {alertas.length ? <ListaAlertas alertas={alertas} ir={(x) => { setSino(false); ir(x); }} abrir={(a, b) => { setSino(false); abrir(a, b); }} />
          : <div className="vazio" style={{ padding: 16 }}>Nada pedindo atenção agora.</div>}</div>}
    </header>
  );
}

/* ===================== CONFIGURAÇÕES: uma tela, seções que abrem e fecham ===================== */
function Secao({ id, ico, titulo, resumo, aberta, alternar, children }) {
  return (
    <section className={`secao ${aberta ? 'aberta' : ''}`}>
      <button className="secao-cab" aria-expanded={aberta} aria-controls={`sec-${id}`} onClick={alternar}>
        <span className="secao-ico"><Ico n={ico} s={18} /></span>
        <span className="secao-txt"><b>{titulo}</b><span className="sub">{resumo}</span></span>
        <svg className="seta-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      {aberta && <div className="secao-corpo" id={`sec-${id}`}>{children}</div>}
    </section>
  );
}
function TelaConfig({ ctx, vendas = [] }) {
  const { params, setParams, empresa, setEmpresa } = ctx;
  const [abertas, setAbertas] = useState({ empresa: true });
  const alt = (k) => setAbertas({ ...abertas, [k]: !abertas[k] });
  const c = (id, rot, k, step, tipo, dica) => <CampoParam id={id} rot={rot} k={k} step={step} params={params} setParams={setParams} tipo={tipo} dica={dica} />;
  const e = (id, rot, k, dica) => <CampoEmp id={id} rot={rot} k={k} emp={empresa} setEmp={setEmpresa} dica={dica} />;
  const lista = (xs, f) => (xs.length ? xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` e mais ${xs.length - 3}` : '') : 'nenhum');
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Configurações</h2><span className="sub">o que muda o custo e o que sai no orçamento</span></div><div className="esp" />
        <button className="bt mini" onClick={() => setAbertas(Object.values(abertas).some(Boolean) ? {} : { empresa: 1, regime: 1, custos: 1, sku: 1, impressoras: 1, tipos: 1, canais: 1, formas: 1 })}>
          {Object.values(abertas).some(Boolean) ? 'Fechar todas' : 'Abrir todas'}</button></div>
      <div className="secoes">
        <Secao id="empresa" ico="users" titulo="Empresa" resumo={[empresa.nome, empresa.cnpj, ctx.logoUrl ? 'com logo' : 'sem logo'].filter(Boolean).join(' · ')} aberta={!!abertas.empresa} alternar={() => alt('empresa')}>
          <SecaoEmpresa ctx={ctx} />
        </Secao>
        <Secao id="regime" ico="doc" titulo="Regime tributário" resumo={`${(REGIMES.find((r) => r[0] === (params.regime || {}).tipo) || REGIMES[1])[1]} · imposto ${pctTxt(params.imposto_pct)}`} aberta={!!abertas.regime} alternar={() => alt('regime')}>
          <SecaoRegime ctx={ctx} vendas={vendas} />
        </Secao>
        <Secao id="custos" ico="calc" titulo="Custos e cálculo" resumo={`hora ${brl(params.valor_hora_operador)} · luz ${brl(params.tarifa_kwh)}/kWh · margem ${pctTxt(params.margem_padrao)} · refugo ${pctTxt(params.taxa_refugo)}`}
          aberta={!!abertas.custos} alternar={() => alt('custos')}>
          <div className="grade">
            {c('p-kwh', 'Energia por kWh', 'tarifa_kwh', '0.0001', 'moeda', 'Light no Rio: R$ 0,8810. Confira com imposto na sua conta.')}
            {c('p-hr', 'Sua hora de trabalho', 'valor_hora_operador', '1', 'moeda', 'Preparar mesa, tirar suporte, lixar, embalar.')}
            {c('p-mg', 'Margem padrão', 'margem_padrao', '5', 'pct', 'Vale quando o produto não tem margem própria.')}
            {c('p-rf', 'Refugo', 'taxa_refugo', '1', 'pct', 'Sobre filamento, energia, máquina e preparação.')}
            <div><label htmlFor="p-su">Preparar a mesa (padrão)</label>
              <div className="campo pc"><input id="p-su" type="number" min="0" placeholder="8" value={params.setup_padrao ?? ''} onChange={(ev) => setParams({ ...params, setup_padrao: ev.target.value === '' ? '' : Number(ev.target.value) })} /><span className="sufx">min</span></div>
              <span className="dica">Por placa. Vale em todo produto novo.</span></div>
            <div><label htmlFor="p-po">Acabamento (padrão)</label>
              <div className="campo pc"><input id="p-po" type="number" min="0" placeholder="6" value={params.pos_padrao ?? ''} onChange={(ev) => setParams({ ...params, pos_padrao: ev.target.value === '' ? '' : Number(ev.target.value) })} /><span className="sufx">min</span></div>
              <span className="dica">Por peça. Vale em todo produto novo.</span></div>
            <div><label htmlFor="p-gh">Ritmo da impressora</label>
              <div className="campo pc"><input id="p-gh" type="number" min="1" step="0.5" placeholder="9" value={params.gramas_hora ?? ''}
                onChange={(ev) => setParams({ ...params, gramas_hora: ev.target.value === '' ? '' : Number(ev.target.value) })} /><span className="sufx">g/h</span></div>
              <span className="dica">Só para estimar o tempo de projeto não fatiado.</span></div>
            <div><label htmlFor="p-al">Alerta de filamento</label>
              <div className="campo pc"><input id="p-al" type="number" min="0" step="50" value={params.alerta_filamento_g ?? 250}
                onChange={(ev) => setParams({ ...params, alerta_filamento_g: Number(ev.target.value) || 0 })} /><span className="sufx">g</span></div>
              <span className="dica">Entra nos alertas e no aviso de estoque do orçamento.</span></div>
          </div>
        </Secao>
        <Secao id="sku" ico="tag" titulo="Códigos (SKU)" resumo={`${params.sku?.padrao || '{SIGLA}-{PROD}{SEQ}'} · ex.: ${gerarSku('Chaveiro flor', ctx)}`} aberta={!!abertas.sku} alternar={() => alt('sku')}>
          <div className="grade dois" style={{ marginTop: 16 }}>
            <div><label htmlFor="sk-s">Sigla da marca</label><input id="sk-s" maxLength={5} value={params.sku?.sigla || ''} placeholder={SIGLA(ctx)}
              onChange={(e) => setParams({ ...params, sku: { ...(params.sku || {}), sigla: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') } })} /></div>
            <div><label htmlFor="sk-p">Padrão do SKU</label><input id="sk-p" value={params.sku?.padrao || ''} placeholder="{SIGLA}-{PROD}{SEQ}"
              onChange={(e) => setParams({ ...params, sku: { ...(params.sku || {}), padrao: e.target.value.toUpperCase() } })} /></div>
          </div>
          <div className="tokens">{[['{SIGLA}', 'sigla da marca'], ['{PROD}', '4 letras do produto'], ['{SEQ}', 'número de 2 dígitos']].map(([t, d]) => (
            <button key={t} className="chip-f" onClick={() => setParams({ ...params, sku: { ...(params.sku || {}), padrao: (params.sku?.padrao || '') + t } })}><b>{t}</b> {d}</button>))}</div>
          <label className="opcao-linha" style={{ marginTop: 14 }}><Check on={!!params.marca_no_titulo} rot="Marca no fim do título" onClick={() => setParams({ ...params, marca_no_titulo: !params.marca_no_titulo })} />
            Pôr a marca no fim do título dos anúncios <span className="sub">desligado, entra mais um termo de busca; ligue quando a marca tiver procura</span></label>
          <div className="aviso" style={{ marginTop: 12 }}>Chaveiro flor vira <b>{gerarSku('Chaveiro flor', ctx)}</b>. Variação de cor e quantidade: <b>{gerarSku('Chaveiro flor', ctx)}-RS03</b> (2 letras da cor, 2 dígitos da quantidade).
            Todo produto novo já nasce com o SKU neste padrão, e dá para mudar no cadastro.</div>
        </Secao>
        <Secao id="impressoras" ico="calc" titulo="Impressoras" resumo={lista(ctx.impressoras, (i) => i.nome)} aberta={!!abertas.impressoras} alternar={() => alt('impressoras')}>
          <Tabela titulo="" lista={ctx.impressoras} setLista={ctx.setImpressoras}
            cols={[['nome', 'Nome', 0], ['potencia_w', 'Watts', 1], ['valor_compra', 'Valor pago', 1, null, 'moeda'], ['vida_util_h', 'Vida útil (h)', 1], ['manutencao_hora', 'Manutenção por hora', 1, null, 'moeda']]}
            base={{ nome: 'Nova impressora', potencia_w: 150, valor_compra: 0, vida_util_h: 5000, manutencao_hora: 0 }}
            dica="Custo de máquina = valor pago ÷ vida útil em horas, mais a manutenção por hora." />
        </Secao>
        <Secao id="tipos" ico="bobina" titulo="Tipos de filamento" resumo={lista(ctx.materiais, (m) => m.nome)} aberta={!!abertas.tipos} alternar={() => alt('tipos')}>
          <Tabela titulo="" lista={ctx.materiais} setLista={ctx.setMateriais}
            cols={[['nome', 'Tipo', 0], ['preco_kg', 'Preço de referência por kg', 1, null, 'moeda'], ['perda_pct', 'Perda', 1, 100, 'pct']]}
            base={{ nome: 'Novo tipo', preco_kg: 0, perda_pct: 0.05 }}
            dica="Perda por tipo, para peça digitada à mão. O preço de referência só vale quando a linha não aponta para uma bobina cadastrada em Filamentos." />
        </Secao>
        <Secao id="canais" ico="tag" titulo="Canais de venda" resumo={lista(ctx.canais, (x) => x.nome)} aberta={!!abertas.canais} alternar={() => alt('canais')}>
          <Tabela titulo="" lista={ctx.canais} setLista={ctx.setCanais}
            cols={[['nome', 'Nome', 0], ['taxa_pct', 'Taxa', 1, 100, 'pct'], ['taxa_fixa', 'Taxa fixa por peça', 1, null, 'moeda']]}
            base={{ nome: 'Novo canal', taxa_pct: 0, taxa_fixa: 0 }} dica="O preço sobe por divisão, valor ÷ (1 − taxa), nunca por multiplicação." />
          <FaixasEditor ctx={ctx} />
        </Secao>
        <Secao id="formas" ico="grana" titulo="Formas de pagamento" resumo={lista(ctx.formas, (x) => x.nome)} aberta={!!abertas.formas} alternar={() => alt('formas')}>
          <Tabela titulo="" lista={ctx.formas} setLista={ctx.setFormas}
            cols={[['nome', 'Forma', 0], ['taxa_pct', 'Taxa', 1, 100, 'pct'], ['taxa_fixa', 'Taxa fixa', 1, null, 'moeda']]}
            base={{ nome: 'Nova forma', taxa_pct: 0, taxa_fixa: 0, ativa: true }} dica="O que a maquininha ou o gateway cobra de você." />
        </Secao>
      </div>
    </>
  );
}

/* ===================== INÍCIO ===================== */
function TelaInicio({ ctx, orcamentos, vendas, lancamentos, ir, abrir, alertas }) {
  const [periodo, setPeriodo] = useState(() => ({ preset: 'mes', ...periodoDe('mes') }));
  const vs = vendasValidas(vendas, periodo);
  const fat = vs.reduce((a, v) => a + nn(v.total), 0), luc = vs.reduce((a, v) => a + nn(v.lucro), 0);
  const os = orcamentos.filter((o) => noPeriodo(o.criado_em, periodo));
  const ganhos = os.filter((o) => situacaoOrc(o) === 'ganho').length, decididos = os.filter((o) => situacaoOrc(o) !== 'aberto').length;
  const orcAbertos = orcamentos.filter((o) => situacaoOrc(o) === 'aberto');
  const recebido = lancamentos.filter((l) => l.tipo === 'receber' && l.pago && noPeriodo(l.pago_em || l.venc, periodo)).reduce((a, l) => a + nn(l.valor), 0);
  const emAndamento = vendas.filter((v) => v.status === 'aberta' || v.status === 'producao');
  const venceEm = (o) => { const d = Math.round((new Date(o.criado_em + 'T12:00:00').getTime() + nn(o.validade_dias || 7) * 864e5 - Date.now()) / 864e5); return d <= 0 ? 'vence hoje' : `vence em ${d} dia(s)`; };
  const cli = (id) => ctx.clientes.find((c) => c.id === id)?.nome || 'sem cliente';
  const passos = [
    ['Custos: tarifa de luz e sua hora', ctx.params.valor_hora_operador !== 25 || ctx.params.tarifa_kwh !== 0.881, 'config'],
    ['Sua impressora, com valor pago e vida útil', ctx.impressoras.some((i) => i.nome !== 'Impressora 1'), 'config'],
    ['Filamentos com o que tem em estoque', ctx.filamentos.length > 0, 'cad-filamentos'],
    ['Insumos: embalagem, argola, ímã', ctx.insumos.length > 0, 'cad-insumos'],
    ['Primeiro produto no catálogo', ctx.pecas.length > 0, 'catalogo'],
    ['Primeiro orçamento', orcamentos.length > 0, 'orcamentos'],
  ];
  const feitos = passos.filter((p) => p[1]).length;
  const rotPer = PRESETS.find((p) => p[0] === periodo.preset)?.[1]?.toLowerCase() || 'no período';
  return (
    <>
      <div className="titulo"><IcoTitulo /><div><span className="eyebrow">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h2>{ctx.empresa.nome || 'Início'}</h2></div></div>
      <FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} />
      <div className="numeros">
        <button className="n" onClick={() => ir('rel-vendas')}><span className="rot">Vendido</span><b className="entra">{brl(fat)}</b><span className="sub">{vs.length} venda(s) · {rotPer}</span></button>
        <button className="n" onClick={() => ir('rel-vendas')}><span className="rot">Lucro</span><b className={luc < 0 ? 'alerta' : ''}>{brl(luc)}</b><span className="sub">margem {pctTxt(fat ? luc / fat : 0)}</span></button>
        <button className="n" onClick={() => ir('rel-orcamentos')}><span className="rot">Conversão de orçamento</span><b>{pctTxt(decididos ? ganhos / decididos : 0)}</b><span className="sub">{os.length} emitido(s) no período</span></button>
        <button className="n" onClick={() => ir('rel-financeiro')}><span className="rot">Recebido</span><b>{brl(recebido)}</b><span className="sub">entrou no caixa no período</span></button>
      </div>
      {alertas.length > 0 && <div className="cartao"><div className="cabeca"><h2>Precisa de atenção</h2><span className="sub">{alertas.length}</span></div>
        <ListaAlertas alertas={alertas} ir={ir} abrir={abrir} max={6} />
        {alertas.length > 6 && <span className="dica">Mais {alertas.length - 6} no sino, no alto da tela.</span>}</div>}
      <TourPrimeirosPassos ctx={ctx} orcamentos={orcamentos} vendas={vendas} ir={ir} abrir={abrir} />
      <div className="duas metade">
        <div className="cartao">
          <div className="cabeca"><h2>Orçamentos esperando resposta</h2><div className="esp" /><button className="voltar" onClick={() => ir('orcamentos')}>ver todos</button></div>
          {orcAbertos.length ? <ul className="lista-venc">{orcAbertos.slice(0, 6).map((o) => (
            <li key={o.id} className="clicavel" onClick={() => abrir('orcamentos', { abrir: o.id })}><span className="d">nº {o.numero}</span>
              <span className="t">{cli(o.cliente_id)}<small className="sub"> · {venceEm(o)}</small></span><b>{brl(o.total)}</b></li>))}</ul>
            : <div className="vazio">Nenhum orçamento em aberto.</div>}
        </div>
        <div className="cartao">
          <div className="cabeca"><h2>Vendas em andamento</h2><div className="esp" /><button className="voltar" onClick={() => ir('vendas')}>ver todas</button></div>
          {emAndamento.length ? <ul className="lista-venc">{emAndamento.slice(0, 6).map((v) => (
            <li key={v.id} className="clicavel" onClick={() => abrir('vendas', { abrir: v.id })}><span className="d">nº {v.numero}</span>
              <span className="t">{cli(v.cliente_id)}<small className="sub"> · {v.status === 'producao' ? 'em produção' : 'aberta'}{v.prazo ? ` · ${v.prazo}` : ''}</small></span><b>{brl(v.total)}</b></li>))}</ul>
            : <div className="vazio">Nenhuma venda em andamento.</div>}
        </div>
      </div>
    </>
  );
}

/* ===================== v3.5 ===================== */
/* marcas de filamento: base do sistema, igual para todo mundo. Logo vem da tabela global marcas_filamento. */
const MARCAS_BASE = ['Bambu Lab', 'Voolt3D', '3D Fila', '3DLab', 'GTMax3D', 'Sethi3D', 'eSun', 'Sunlu', 'Polymaker', 'Creality', 'Elegoo', 'Prusament', 'Anycubic', 'Overture'];
function MarcaLogo({ ctx, marca, tam = 26 }) {
  const src = (ctx.marcasLogo || {})[semAcento(marca)];
  return <Avatar src={src} nome={marca || '?'} tam={tam} redondo={false} />;
}
const carreteis = (x) => { const p = nn(x.peso_g) || 1000, e = estoqueDe(x); const cheios = Math.floor(e / p + 1e-6); const resto = Math.round(e - cheios * p);
  return { total: cheios + (resto > 0 ? 1 : 0), cheios, resto, p }; };
const carreteisTxt = (x) => { const c = carreteis(x); if (!c.total) return 'nenhum';
  return [c.cheios ? `${c.cheios} cheio${c.cheios > 1 ? 's' : ''}` : null, c.resto ? `1 aberto com ${gTxt(c.resto)}` : null].filter(Boolean).join(' + '); };

/* consumo de um documento: filamento em gramas (com perda) e insumos em unidades */
function consumoDoc(doc, ctx) {
  const por = {}, porIns = {}, soltos = [];
  const lista = [];
  for (const it of doc.itens || []) { const kit = it.kit_id && (ctx.kits || []).find((k) => k.id === it.kit_id);
    if (kit) { for (const k of kit.itens || []) lista.push({ peca_id: k.peca_id, qtd: nn(k.qtd) * nn(it.qtd) });
      for (const i of kit.insumos || []) if (i.on !== false && i.insumo_id) porIns[i.insumo_id] = (porIns[i.insumo_id] || 0) + nn(i.qtd ?? 1) * nn(it.qtd); }
    else lista.push(it); }
  for (const it of lista) {
    const p = it.peca_id && ctx.pecas.find((x) => x.id === it.peca_id); if (!p) continue;
    const c = precificar(dePeca(p), ctx);
    for (const f of p.fils) {
      const g = nn(f.gramas) * (1 + perdaDe(f)) * (c.fator_g ?? 1) * nn(it.qtd); if (!g) continue;
      const fl = acharFilDaLinha(ctx, f);
      if (fl) por[fl.id] = (por[fl.id] || 0) + g; else soltos.push(p.nome);
    }
    for (const i of p.insumos || []) {
      if (!i.on || !i.insumo_id) continue;
      const q = nn(i.qtd ?? 1) * nn(it.qtd); if (q) porIns[i.insumo_id] = (porIns[i.insumo_id] || 0) + q;
    }
  }
  return { movs: Object.entries(por).map(([filamento_id, gramas]) => ({ filamento_id, gramas: r2(gramas) })),
    movsIns: Object.entries(porIns).map(([insumo_id, qtd]) => ({ insumo_id, qtd })), soltos: [...new Set(soltos)] };
}
function AvisoEstoque({ doc, ctx, baixaAtual, baixaInsAtual }) {
  const { movs, movsIns, soltos } = consumoDoc(doc, ctx);
  const dev = (xs, k, id, campo) => (xs || []).filter((m) => m[k] === id).reduce((a, m) => a + nn(m[campo]), 0);
  const faltas = movs.map((m) => { const fl = ctx.filamentos.find((x) => x.id === m.filamento_id); const tem = estoqueDe(fl) + dev(baixaAtual, 'filamento_id', fl.id, 'gramas');
    return { k: fl.id, cor: fl.cor_hex, nome: rotuloFil(ctx, fl), precisa: gTxt(m.gramas), tem: gTxt(tem), sobra: tem - m.gramas, sobraTxt: gTxt(Math.abs(tem - m.gramas)), curto: tem - m.gramas < limiteFil(ctx) }; });
  const faltasIns = movsIns.map((m) => { const x = ctx.insumos.find((y) => y.id === m.insumo_id); if (!x || x.estoque == null || x.estoque === '') return null;
    const tem = nn(x.estoque) + dev(baixaInsAtual, 'insumo_id', x.id, 'qtd'); const u = x.unidade || 'un';
    return { k: x.id, nome: x.nome, precisa: `${m.qtd} ${u}`, tem: `${nf(tem).replace(',00', '')} ${u}`, sobra: tem - m.qtd, sobraTxt: `${nf(Math.abs(tem - m.qtd)).replace(',00', '')} ${u}`, curto: tem - m.qtd <= nn(x.estoque_min) }; }).filter(Boolean);
  const ruins = [...faltas, ...faltasIns].filter((x) => x.curto);
  if (!ruins.length && !soltos.length) return null;
  const falta = ruins.some((x) => x.sobra < 0);
  return (
    <div className={`aviso ${falta ? 'ruim' : 'atencao'}`} style={{ marginTop: 12 }}>
      {ruins.length > 0 && <><b>{falta ? 'Estoque insuficiente para este pedido' : 'Estoque ficando curto com este pedido'}</b>
        <ul className="lista-simples">{ruins.map((x) => <li key={x.k}>{x.cor && <i className="swatch" style={{ background: x.cor }} />}
          {x.nome}: precisa de {x.precisa}, tem {x.tem}{x.sobra < 0 ? `, faltam ${x.sobraTxt}` : `, sobram ${x.sobraTxt}`}</li>)}</ul></>}
      {soltos.length > 0 && <div className="sub" style={{ marginTop: ruins.length ? 6 : 0 }}>Sem filamento cadastrado na ficha, fora da conta de estoque: {soltos.join(', ')}.</div>}
    </div>
  );
}

/* itens de orçamento e venda: só produto. Embalagem, argola e afins já estão na ficha do produto. */
function AdicionaItem({ ctx, canalId, onAdd }) {
  const [txt, setTxt] = useState('');
  const itens = [...ctx.pecas.map((p) => ({ tipo: 'p', id: p.id, nome: p.nome, detalhe: brl(precificar(dePeca(p), ctx, canalId).preco) })),
    ...(ctx.kits || []).map((k) => ({ tipo: 'k', id: k.id, nome: k.nome, detalhe: `kit · ${brl(custoKit(k, ctx, canalId).preco)}` }))];
  return (
    <div className="add-item">
      <Autocompleta id={`add-${canalId}`} rotulo="Produto" itens={itens} texto={txt} setTexto={setTxt} placeholder="digite o nome do produto"
        onEscolher={(x) => { setTxt(''); if (x.tipo === 'k') { const k = ctx.kits.find((y) => y.id === x.id); const c = custoKit(k, ctx, canalId);
          onAdd({ linha: { key: uid(), kit_id: k.id, descricao: k.nome, qtd: 1, preco_unit: c.preco, custo_unit: c.custo, snap: { custo: c.custo, preco: c.preco, origem: 'kit', em: new Date().toISOString() } } }); }
          else onAdd({ peca: ctx.pecas.find((p) => p.id === x.id) }); }}
        onCriar={(t) => ctx.pedirItem(t, canalId, (r) => { setTxt(''); if (r.peca) onAdd({ peca: r.peca }); })}
        textoCriar={(t) => `Cadastrar produto "${t}"`} />
    </div>
  );
}

/* formas de pagamento oferecidas: campo de escolha com várias, em etiquetas */
function EscolhaMulti({ id, rotulo, itens, valores, onMudar, onCriar, textoCriar, placeholder, dica, rotuloChip }) {
  const [txt, setTxt] = useState('');
  const ids = valores || [];
  const sel = ids.map((v) => itens.find((x) => x.id === v)).filter(Boolean);
  return (
    <div className="span-todo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="chips-campo">
        {sel.map((x) => <span key={x.id} className="chip-sel">{rotuloChip ? rotuloChip(x) : x.nome}
          <button type="button" aria-label={`Tirar ${x.nome}`} onClick={() => onMudar(ids.filter((v) => v !== x.id))}><Ico n="x" s={12} /></button></span>)}
        <div className="grow"><Autocompleta id={id} rotulo={rotulo} semRotulo texto={txt} setTexto={setTxt} placeholder={sel.length ? 'adicionar outro' : (placeholder || 'digite para buscar')}
          itens={itens.filter((x) => !ids.includes(x.id))} onEscolher={(x) => { setTxt(''); onMudar([...ids, x.id]); }}
          onCriar={onCriar ? (t) => onCriar(t, (x) => { setTxt(''); onMudar([...ids, x.id]); }) : null} textoCriar={textoCriar} /></div>
      </div>
      {dica && <span className="dica">{dica}</span>}
    </div>
  );
}
function FormasMulti({ ctx, escolhidas, onMudar }) {
  const taxa = (f) => [nn(f.taxa_pct) ? `${nf(f.taxa_pct * 100)}%` : '', nn(f.taxa_fixa) ? brl(f.taxa_fixa) : ''].filter(Boolean).join(' + ') || 'sem taxa';
  return <EscolhaMulti id="formas" rotulo="Formas de pagamento oferecidas" valores={escolhidas} onMudar={onMudar} placeholder="escolha as formas"
    itens={ctx.formas.map((f) => ({ ...f, detalhe: taxa(f) }))} onCriar={(t, d) => ctx.pedirCadastro('forma', t, d)} textoCriar={(t) => `Cadastrar forma "${t}"`}
    dica="Saem no PDF e no texto do WhatsApp. A taxa de cada forma é custo seu e não aparece para o cliente." />;
}

/* ===================== CLIENTES ===================== */
const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');
function TelaClientes({ ctx, setClientes, orcamentos, vendas, abrir }) {
  const [edit, setEdit] = useState(null);
  const [busca, setBusca] = useState('');
  const [cepMsg, setCepMsg] = useState('');
  const set = (k, v) => setEdit({ ...edit, [k]: v });
  const salvar = () => {
    if (!edit.nome.trim()) return;
    setClientes(edit.id ? ctx.clientes.map((c) => (c.id === edit.id ? edit : c)) : [...ctx.clientes, { ...edit, id: uid() }]);
    setEdit(null);
  };
  const buscarCep = async (cep) => {
    const d = String(cep).replace(/\D/g, ''); if (d.length !== 8) return;
    setCepMsg('buscando…');
    try { const r = await fetch(`https://viacep.com.br/ws/${d}/json/`); const j = await r.json(); if (j.erro) throw new Error();
      setEdit((e) => ({ ...e, rua: j.logradouro || e.rua, bairro: j.bairro || e.bairro, cidade: j.localidade || e.cidade, uf: j.uf || e.uf })); setCepMsg('');
    } catch (e) { setCepMsg('Não achei este CEP. Preencha à mão.'); }
  };
  const historico = (id) => [
    ...vendas.filter((v) => v.cliente_id === id).map((v) => ({ tipo: 'venda', id: v.id, n: v.numero, data: v.data, status: v.status, total: nn(v.total) })),
    ...orcamentos.filter((o) => o.cliente_id === id).map((o) => ({ tipo: 'orcamento', id: o.id, n: o.numero, data: o.criado_em, status: situacaoOrc(o) === 'vencido' ? 'vencido' : o.status, total: nn(o.total) })),
  ].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const resumo = (id) => { const vs = vendas.filter((v) => v.cliente_id === id && v.status !== 'cancelada'); const t = vs.reduce((a, v) => a + nn(v.total), 0);
    return { n: vs.length, total: t, ticket: vs.length ? t / vs.length : 0, ultima: vs.map((v) => v.data).sort().pop() }; };

  if (edit) {
    const h = edit.id ? historico(edit.id) : [], r = edit.id ? resumo(edit.id) : null;
    return (
      <>
        <TituloForm volta={() => setEdit(null)} rotuloVolta="Clientes" titulo={edit.id ? edit.nome || 'Cliente' : 'Novo cliente'} />
        <div className="duas">
          <div>
            <div className="cartao">
              <FotoCampo valor={edit.logo} rotulo="Logo do cliente" formato="image/png" redondo onMuda={(v) => set('logo', v)} />
              <div className="separa" />
              <div className="grade">
                <div className="span2"><label htmlFor="cl-n">Nome</label><input id="cl-n" value={edit.nome} onChange={(e) => set('nome', e.target.value)} /></div>
                <div><label htmlFor="cl-d">CPF ou CNPJ</label><input id="cl-d" value={edit.doc || ''} onChange={(e) => set('doc', e.target.value)} /></div>
                <div><label htmlFor="cl-w">WhatsApp</label><input id="cl-w" value={edit.whatsapp || ''} inputMode="tel" onChange={(e) => set('whatsapp', e.target.value)} /></div>
                <div className="span2"><label htmlFor="cl-e">E-mail</label><input id="cl-e" type="email" value={edit.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
              </div>
            </div>
            <div className="cartao">
              <div className="cabeca"><h2>Endereço</h2><span className="sub">para entrega e nota</span></div>
              <div className="grade">
                <div><label htmlFor="cl-cep">CEP</label><input id="cl-cep" value={edit.cep || ''} inputMode="numeric" placeholder="00000-000"
                  onChange={(e) => set('cep', e.target.value)} onBlur={(e) => buscarCep(e.target.value)} />{cepMsg && <span className="dica">{cepMsg}</span>}</div>
                <div className="span2"><label htmlFor="cl-rua">Rua</label><input id="cl-rua" value={edit.rua || ''} onChange={(e) => set('rua', e.target.value)} /></div>
                <div><label htmlFor="cl-num">Número</label><input id="cl-num" value={edit.numero_end || ''} onChange={(e) => set('numero_end', e.target.value)} /></div>
                <div className="span2"><label htmlFor="cl-comp">Complemento</label><input id="cl-comp" value={edit.complemento || ''} onChange={(e) => set('complemento', e.target.value)} /></div>
                <div><label htmlFor="cl-bai">Bairro</label><input id="cl-bai" value={edit.bairro || ''} onChange={(e) => set('bairro', e.target.value)} /></div>
                <div className="span2"><label htmlFor="cl-cid">Cidade</label><input id="cl-cid" value={edit.cidade || ''} onChange={(e) => set('cidade', e.target.value)} /></div>
                <Escolha id="cl-uf" rotulo="UF" valor={edit.uf || ''} itens={UFS.map((u) => ({ id: u, nome: u }))} onEscolher={(x) => set('uf', x.id)} />
              </div>
            </div>
            <div className="cartao">
              <label htmlFor="cl-o">Observações</label>
              <textarea id="cl-o" value={edit.obs || ''} placeholder="preferências, datas importantes, como gosta de ser atendido" onChange={(e) => set('obs', e.target.value)} />
            </div>
            <div className="linha-bt">
              <button className="bt forte" onClick={salvar}><Ico n="check" s={15} /> Salvar</button>
              <div className="esp" /><button className="bt" onClick={() => setEdit(null)}>Cancelar</button>
            </div>
          </div>
          <div className="painel">
            <div className="cartao">
              <div className="cabeca"><h2>Histórico</h2></div>
              {r ? (<>
                <div className="metricas" style={{ marginTop: 0 }}>
                  <div><span className="rot">Compras</span><b>{r.n}</b></div>
                  <div><span className="rot">Total comprado</span><b>{brl(r.total)}</b></div>
                  <div><span className="rot">Ticket médio</span><b>{brl(r.ticket)}</b></div>
                  <div><span className="rot">Última compra</span><b>{r.ultima ? dbr(r.ultima) : 'nenhuma'}</b></div>
                </div>
                {h.length ? <ul className="lista-venc" style={{ marginTop: 14 }}>{h.slice(0, 12).map((x) => (
                  <li key={x.tipo + x.id} className="clicavel" onClick={() => abrir(x.tipo === 'venda' ? 'vendas' : 'orcamentos', { abrir: x.id })}>
                    <span className="d">{x.data ? dbr(x.data).slice(0, 5) : ''}</span>
                    <span className="t">{x.tipo === 'venda' ? 'Venda' : 'Orçamento'} nº {x.n} <span className={`pilula ${x.status}`}>{x.status}</span></span>
                    <b>{brl(x.total)}</b></li>))}</ul>
                  : <div className="vazio">Nenhum pedido ainda.</div>}
              </>) : <div className="vazio">O histórico aparece depois de salvar o cliente.</div>}
            </div>
          </div>
        </div>
      </>
    );
  }
  const lista = ctx.clientes.filter((c) => !busca || semAcento(`${c.nome} ${c.whatsapp || ''} ${c.cidade || ''}`).includes(semAcento(busca)));
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Clientes</h2><span className="sub">{ctx.clientes.length} cadastrado(s)</span></div><div className="esp" />
        <button className="bt forte" onClick={() => setEdit({ id: null, nome: '', whatsapp: '', email: '', doc: '', obs: '' })}><Ico n="mais" s={15} /> Novo cliente</button></div>
      {ctx.clientes.length > 0 && (() => {
        const rs = ctx.clientes.map((c) => ({ c, ...resumo(c.id) })); const ym = hoje().slice(0, 7); const d90 = ymd(new Date(Date.now() - 90 * 864e5));
        const primeira = (id) => vendas.filter((v) => v.cliente_id === id && v.status !== 'cancelada').map((v) => v.data).sort()[0];
        const ativos = rs.filter((r) => r.ultima && r.ultima >= d90), novos = rs.filter((r) => (primeira(r.c.id) || '').startsWith(ym));
        const somem = rs.filter((r) => r.ultima && r.ultima < d90).sort((a, b) => b.total - a.total).slice(0, 5);
        const top = rs.filter((r) => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 5); const tot = rs.reduce((a, r) => a + r.total, 0);
        return (<>
          <div className="numeros">
            <div className="n cor-azul"><span className="rot">Clientes</span><b>{ctx.clientes.length}</b><span className="sub">{rs.filter((r) => r.n).length} já compraram</span></div>
            <div className="n cor-verde"><span className="rot">Ativos</span><b>{ativos.length}</b><span className="sub">compraram nos últimos 90 dias</span></div>
            <div className="n cor-violeta"><span className="rot">Novos no mês</span><b>{novos.length}</b><span className="sub">primeira compra este mês</span></div>
            <div className="n cor-ambar"><span className="rot">Ticket médio</span><b>{brl(rs.reduce((a, r) => a + r.n, 0) ? tot / rs.reduce((a, r) => a + r.n, 0) : 0)}</b><span className="sub">por compra</span></div>
          </div>
          <div className="duas metade">
            <div className="cartao"><div className="cabeca"><h2>Quem mais compra</h2></div>
              {top.length ? <ul className="lista-venc">{top.map((r) => (<li key={r.c.id} className="clicavel" onClick={() => setEdit({ ...r.c })}>
                <span className="d"><Avatar src={r.c.logo} nome={r.c.nome} tam={26} /></span><span className="t">{r.c.nome}<small className="sub"> · {r.n} compra(s) · {pctTxt(tot ? r.total / tot : 0)} do total</small></span><b>{brl(r.total)}</b></li>))}</ul>
                : <div className="vazio">Ninguém comprou ainda.</div>}</div>
            <div className="cartao"><div className="cabeca"><h2>Para chamar de volta</h2><span className="sub">sem comprar há 90 dias</span></div>
              {somem.length ? <ul className="lista-venc">{somem.map((r) => (<li key={r.c.id} className="clicavel" onClick={() => setEdit({ ...r.c })}>
                <span className="d"><Avatar src={r.c.logo} nome={r.c.nome} tam={26} /></span><span className="t">{r.c.nome}<small className="sub"> · última em {dbr(r.ultima)}</small></span><b>{brl(r.total)}</b></li>))}</ul>
                : <div className="vazio">Ninguém sumido.</div>}</div>
          </div>
        </>); })()}
      {ctx.clientes.length > 5 && <div className="filtros"><div className="grow"><label htmlFor="cl-b">Buscar</label>
        <input id="cl-b" value={busca} placeholder="nome, WhatsApp ou cidade" onChange={(e) => setBusca(e.target.value)} /></div></div>}
      <div className="cartao">
        {lista.length ? <div className="rolo"><table>
          <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Cidade</th><th className="num">Compras</th><th className="num">Total comprado</th><th /></tr></thead>
          <tbody>{lista.map((c) => { const r = resumo(c.id); return (
            <tr key={c.id} className="clicavel" onClick={() => setEdit({ ...c })}>
              <td><div className="com-avatar"><Avatar src={c.logo} nome={c.nome} />{c.nome}</div></td><td className="sub">{c.whatsapp}</td>
              <td className="sub">{[c.cidade, c.uf].filter(Boolean).join(', ')}</td><td className="num">{r.n}</td><td className="num">{brl(r.total)}</td>
              <td onClick={(e) => e.stopPropagation()}><div className="acoes">
                <button className="ico" title="Editar" aria-label={`Editar ${c.nome}`} onClick={() => setEdit({ ...c })}><Ico n="lapis" /></button>
                <button className="ico perigo" title="Excluir" aria-label={`Excluir ${c.nome}`}
                  onClick={() => { if (confirm(`Excluir ${c.nome}? Orçamentos e vendas dele continuam.`)) setClientes(ctx.clientes.filter((x) => x.id !== c.id)); }}><Ico n="lixo" /></button>
              </div></td></tr>); })}</tbody></table></div>
          : <div className="vazio">{ctx.clientes.length ? 'Ninguém com esse nome.' : 'Nenhum cliente ainda. Cadastre aqui ou direto no orçamento, digitando o nome.'}</div>}
      </div>
    </>
  );
}

/* ===================== FILAMENTOS ===================== */
const PESOS = [250, 500, 750, 1000, 2000, 3000];
function NovoFilamento({ inicial, nome, pre, ctx, onSalvar, onCancelar }) {
  const ini = inicial ? (() => { const c = carreteis(inicial); return { ...inicial, cheios: c.cheios, aberto: c.resto }; })()
    : { tipo_id: pre?.tipo_id || ctx.materiais[0]?.id || '', cor: nome || '', cor_hex: pre?.cor_hex || palpiteHex(nome || ''), marca: '', peso_g: 1000, preco: '', cheios: 1, aberto: 0 };
  const [f, setF] = useState(ini);
  const [compra, setCompra] = useState({ on: !inicial, qtd: '', pago: true, venc: hoje() });
  const set = (k, v) => setF({ ...f, [k]: v });
  const marcas = [...new Set([...MARCAS_BASE, ...ctx.filamentos.map((x) => x.marca).filter(Boolean)])].map((m) => ({ id: m, nome: m }));
  const estoque = nn(f.cheios) * (nn(f.peso_g) || 1000) + nn(f.aberto);
  return (
    <Modal titulo={inicial ? 'Editar filamento' : 'Cadastrar filamento'} onFechar={onCancelar} largo>
      <div className="grade">
        <Escolha id="nf-t" rotulo="Tipo" valor={f.tipo_id} itens={ctx.materiais} onEscolher={(x) => set('tipo_id', x.id)}
          onCriar={(t, depois) => ctx.pedirCadastro('tipo', t, depois)} textoCriar={(t) => `Cadastrar tipo "${t}"`} />
        <div className="marca-campo">
          <Autocompleta id="nf-m" rotulo="Marca" itens={marcas} texto={f.marca} setTexto={(v) => set('marca', v)} onEscolher={(x) => set('marca', x.nome)} placeholder="escolha a marca" />
          {f.marca && <MarcaLogo ctx={ctx} marca={f.marca} tam={36} />}</div>
        <div className="span2"><label htmlFor="nf-c">Cor</label>
          <div className="cor-campo"><EscolheCor cor={f.cor_hex} ctx={{ ...ctx, filamentos: [] }} onCor={(h) => set('cor_hex', h)} onFilamento={() => {}} />
            <input id="nf-c" value={f.cor} autoFocus placeholder="Ivory White, Preto fosco" onChange={(e) => setF({ ...f, cor: e.target.value, cor_hex: inicial ? f.cor_hex : palpiteHex(e.target.value) })} /></div></div>
      </div>
      {f.marca && !inicial && <div className="paleta-marca">
        <span className="rot">{CORES_MARCA[f.marca] ? `Cores da ${f.marca}` : 'Cores comuns'} <span className="sub">· o hex é referência, a tela não é o filamento</span></span>
        <div className="sw-marca">{coresDaMarca(f.marca).map(([n, h]) => (
          <button key={n} type="button" title={n} className={f.cor === n ? 'on' : ''} onClick={() => setF({ ...f, cor: n, cor_hex: h })}><i style={{ background: h }} /><span>{n}</span></button>))}</div>
      </div>}
      <div className="separa" />
      <div className="grade">
        <div className="span2"><label>Peso do carretel</label>
          <div className="segm">{PESOS.map((p) => <button key={p} className={nn(f.peso_g) === p ? 'on' : ''} onClick={() => set('peso_g', p)}>{gTxt(p)}</button>)}</div></div>
        <CampoMoeda id="nf-v" rot="Preço do carretel" valor={f.preco} onChange={(v) => set('preco', v)} />
        <div><label htmlFor="nf-ch">Carretéis cheios</label>
          <div className="contador"><button className="ico" aria-label="Menos um" onClick={() => set('cheios', Math.max(0, nn(f.cheios) - 1))}>−</button>
            <input id="nf-ch" type="number" min="0" step="1" value={f.cheios} onChange={(e) => set('cheios', e.target.value)} />
            <button className="ico" aria-label="Mais um" onClick={() => set('cheios', nn(f.cheios) + 1)}>+</button></div></div>
        <div><label htmlFor="nf-ab">Carretel aberto</label>
          <div className="campo pc"><input id="nf-ab" type="number" min="0" step="10" value={f.aberto} onChange={(e) => set('aberto', e.target.value)} /><span className="sufx">g</span></div>
          <span className="dica">Quanto resta no que está em uso. Zero se não houver.</span></div>
      </div>
      <div className="separa" />
      <label className="opcao-linha"><Check on={compra.on} rot="Lançar a compra no financeiro" onClick={() => setCompra({ ...compra, on: !compra.on })} />
        Lançar a compra no financeiro <span className="sub">entra como saída no caixa</span></label>
      {compra.on && <div className="grade" style={{ marginTop: 12 }}>
        <div><label htmlFor="nf-cq">Carretéis comprados</label><input id="nf-cq" type="number" min="1" placeholder={String(inicial ? 1 : nn(f.cheios) || 1)} value={compra.qtd} onChange={(e) => setCompra({ ...compra, qtd: e.target.value })} /></div>
        <div><label>Pagamento</label><div className="segm"><button className={compra.pago ? 'on' : ''} onClick={() => setCompra({ ...compra, pago: true })}>Já paguei</button>
          <button className={!compra.pago ? 'on' : ''} onClick={() => setCompra({ ...compra, pago: false })}>A pagar</button></div></div>
        {!compra.pago && <div><label htmlFor="nf-cv">Vence em</label><input id="nf-cv" type="date" value={compra.venc} onChange={(e) => setCompra({ ...compra, venc: e.target.value })} /></div>}
      </div>}
      <div className="aviso" style={{ marginTop: 14 }}>Preço por kg <b>{brl(precoKgFil(f))}</b> · em estoque <b>{gTxt(estoque)}</b> em <b>{nn(f.cheios) + (nn(f.aberto) > 0 ? 1 : 0)}</b> carretel(éis)</div>
      <div className="linha-bt">
        <button className="bt forte" disabled={!String(f.cor).trim() || !(nn(f.preco) > 0) || !f.tipo_id}
          onClick={() => { const { cheios, aberto, quantidade, ...resto } = f;
            const qc = nn(compra.qtd) || (inicial ? 1 : nn(f.cheios) || 1);
            if (compra.on && nn(f.preco) > 0) ctx.lancar({ tipo: 'pagar', descricao: `Filamento ${nomeTipo(ctx, f.tipo_id)} ${f.cor} ${f.marca}`.trim() + ` (${qc} carretel)`, valor: r2(nn(f.preco) * qc),
              venc: compra.pago ? hoje() : compra.venc, pago: compra.pago, pago_em: compra.pago ? hoje() : null });
            onSalvar({ ...resto, id: f.id || uid(), cor: String(f.cor).trim(), marca: String(f.marca).trim(), peso_g: nn(f.peso_g) || 1000, preco: nn(f.preco), estoque_g: estoque }); }}>
          <Ico n="check" s={15} /> {inicial ? 'Salvar' : 'Salvar e usar'}</button>
        <div className="esp" /><button className="bt" onClick={onCancelar}>Cancelar</button>
      </div>
    </Modal>
  );
}
function TelaFilamentos({ ctx }) {
  const { filamentos, setFilamentos } = ctx;
  const [ft, setFt] = useState(''); const [fc, setFc] = useState(''); const [fm, setFm] = useState(''); const [busca, setBusca] = useState('');
  const [vista, setVista] = useState('lista');
  const [edit, setEdit] = useState(null); const [importa, setImporta] = useState(false); const [tipoPadrao, setTipoPadrao] = useState(ctx.materiais[0]?.id || '');
  const lim = limiteFil(ctx);
  const cores = [...new Set(filamentos.map((x) => x.cor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const marcas = [...new Set(filamentos.map((x) => x.marca).filter(Boolean))].sort();
  const tiposUsados = ctx.materiais.filter((m) => filamentos.some((x) => x.tipo_id === m.id));
  const lista = filamentos.filter((x) => (!ft || x.tipo_id === ft) && (!fc || x.cor === fc) && (!fm || x.marca === fm) && (!busca || semAcento(rotuloFil(ctx, x)).includes(semAcento(busca))));
  const total = lista.reduce((a, x) => a + estoqueDe(x), 0), nCarr = lista.reduce((a, x) => a + carreteis(x).total, 0);
  const valor = lista.reduce((a, x) => a + estoqueDe(x) / 1000 * precoKgFil(x), 0);
  const curtos = lista.filter((x) => estoqueDe(x) < lim);
  const maisUm = (x) => { setFilamentos(filamentos.map((y) => (y.id === x.id ? { ...y, estoque_g: estoqueDe(y) + (nn(y.peso_g) || 1000) } : y)));
    if (nn(x.preco) && confirm(`Lançar a compra de ${brl(x.preco)} como saída paga hoje no financeiro?`)) ctx.lancar({ tipo: 'pagar', descricao: `Filamento ${rotuloFil(ctx, x)}`, valor: nn(x.preco), venc: hoje(), pago: true, pago_em: hoje() }); };
  const existe = (it) => filamentos.some((x) => semAcento(x.cor) === semAcento(it.cor) && semAcento(x.marca) === semAcento(it.marca) && x.tipo_id === (it.tipo_id || tipoPadrao));
  const grupos = [...new Set(lista.map((x) => x.cor))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((cor) => {
    const xs = lista.filter((x) => x.cor === cor); return { cor, hex: xs[0].cor_hex, xs, g: xs.reduce((a, x) => a + estoqueDe(x), 0), n: xs.reduce((a, x) => a + carreteis(x).total, 0) }; });
  const linha = (x) => { const e = estoqueDe(x), c = carreteis(x), pct = Math.min(1, e / (nn(x.peso_g) || 1000) / Math.max(1, c.total));
    return (
      <tr key={x.id} className="clicavel" onClick={() => setEdit(x)}>
        <td style={{ width: 30 }}><i className="swatch grande" style={{ background: x.cor_hex || '#8FA3B0' }} /></td>
        <td>{x.cor}<div className="sub">{nomeTipo(ctx, x.tipo_id)} · {brl(precoKgFil(x))}/kg</div></td>
        <td><div className="com-avatar"><MarcaLogo ctx={ctx} marca={x.marca} />{x.marca}</div></td>
        <td className="num"><b className="carr">{c.total}</b><div className="sub">{carreteisTxt(x)}</div></td>
        <td style={{ minWidth: 150 }}><div className="estoque-g"><div className="barra-est"><span className={e < lim ? 'curto' : ''} style={{ width: `${pct * 100}%` }} /></div>
          <b className={e < lim ? 'alerta-txt' : ''}>{gTxt(e)}</b></div></td>
        <td onClick={(ev) => ev.stopPropagation()}><div className="acoes">
          <button className="bt mini" title="Chegou mais um carretel" onClick={() => maisUm(x)}>+ carretel</button>
          <button className="ico" title="Editar" aria-label={`Editar ${x.cor}`} onClick={() => setEdit(x)}><Ico n="lapis" /></button>
          <button className="ico perigo" title="Excluir" aria-label={`Excluir ${x.cor}`}
            onClick={() => { if (confirm(`Excluir ${rotuloFil(ctx, x)}? Produtos já salvos mantêm o preço que tinham.`)) setFilamentos(filamentos.filter((y) => y.id !== x.id)); }}><Ico n="lixo" /></button></div></td>
      </tr>); };
  const cab = <thead><tr><th /><th>Cor</th><th>Marca</th><th className="num">Carretéis</th><th>Em estoque</th><th /></tr></thead>;
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Filamentos</h2><span className="sub">{filamentos.length} cadastrado(s)</span></div><div className="esp" />
        <button className="bt" onClick={() => setImporta(true)}><Ico n="doc" s={15} /> Importar planilha</button>
        <button className="bt forte" onClick={() => ctx.pedirFilamento('', () => {})}><Ico n="mais" s={15} /> Novo filamento</button></div>
      <div className="filtros">
        <div className="grow"><Escolha id="ff-t" rotulo="Tipo" valor={ft} onEscolher={(x) => setFt(x.id)} itens={[{ id: '', nome: 'Todos os tipos' }, ...tiposUsados]} /></div>
        <div className="grow"><Escolha id="ff-c" rotulo="Cor" valor={fc} onEscolher={(x) => setFc(x.id)} itens={[{ id: '', nome: 'Todas as cores' }, ...cores.map((c) => ({ id: c, nome: c }))]} /></div>
        <div className="grow"><Escolha id="ff-m" rotulo="Marca" valor={fm} onEscolher={(x) => setFm(x.id)} itens={[{ id: '', nome: 'Todas as marcas' }, ...marcas.map((c) => ({ id: c, nome: c }))]} /></div>
        <div className="grow"><label htmlFor="ff-b">Buscar</label><input id="ff-b" value={busca} placeholder="qualquer coisa" onChange={(e) => setBusca(e.target.value)} /></div>
        <div><label>Ver</label><div className="segm"><button className={vista === 'lista' ? 'on' : ''} onClick={() => setVista('lista')}>Lista</button>
          <button className={vista === 'cor' ? 'on' : ''} onClick={() => setVista('cor')}>Por cor</button></div></div>
      </div>
      <div className="numeros">
        <div className="n"><span className="rot">Carretéis</span><b>{nCarr}</b><span className="sub">{lista.length} filamento(s) no filtro</span></div>
        <div className="n"><span className="rot">Filamento em estoque</span><b>{gTxt(total)}</b><span className="sub">somando os carretéis abertos</span></div>
        <div className="n"><span className="rot">Valor parado</span><b>{brl(valor)}</b><span className="sub">gramas × preço por kg</span></div>
        <div className="n"><span className="rot">Abaixo de {gTxt(lim)}</span><b className={curtos.length ? 'alerta' : ''}>{curtos.length}</b><span className="sub">limite em Configurações</span></div>
      </div>
      {vista === 'lista' ? (
        <div className="cartao">{lista.length ? <div className="rolo"><table>{cab}<tbody>{lista.map(linha)}</tbody></table></div>
          : <div className="vazio">{filamentos.length ? 'Nenhum filamento neste filtro.' : 'Nenhum filamento cadastrado. Importe da sua planilha ou cadastre cada filamento com tipo, cor, marca, preço e carretéis.'}</div>}</div>
      ) : grupos.map((g) => (
        <div className="cartao grupo-cor" key={g.cor}>
          <div className="cabeca"><i className="swatch enorme" style={{ background: g.hex || '#8FA3B0' }} /><h2>{g.cor}</h2>
            <span className="sub">{g.n} carretel(éis) · {gTxt(g.g)} · {g.xs.length} marca(s)</span></div>
          <div className="rolo"><table>{cab}<tbody>{g.xs.map(linha)}</tbody></table></div>
        </div>))}
      <span className="dica">O estoque baixa sozinho quando uma venda é salva e volta se a venda for cancelada ou excluída.</span>
      {edit && <NovoFilamento inicial={edit} ctx={ctx} onCancelar={() => setEdit(null)} onSalvar={(x) => { setFilamentos(filamentos.map((y) => (y.id === x.id ? x : y))); setEdit(null); }} />}
      {importa && <ImportaPlanilha titulo="Importar filamentos" modelo={MODELO_FILAMENTOS} onFechar={() => setImporta(false)}
        extrair={(l) => extrairFilamentos(l, ctx)} existe={existe}
        extra={<div style={{ maxWidth: 320, marginBottom: 12 }}><Escolha id="imp-tipo" rotulo="Tipo para as linhas sem tipo" valor={tipoPadrao} itens={ctx.materiais} onEscolher={(x) => setTipoPadrao(x.id)} /></div>}
        colunas={[['', (i) => <i className="swatch grande" style={{ background: i.cor_hex }} />], ['Tipo', (i) => (i.tipo_id ? nomeTipo(ctx, i.tipo_id) : <span className="sub">{i.tipo_txt || nomeTipo(ctx, tipoPadrao)}</span>)],
          ['Cor', (i) => i.cor], ['Marca', (i) => i.marca], ['Carretel', (i) => `${gTxt(i.peso_g)} · ${brl(i.preco)}`], ['Estoque', (i) => gTxt(i.estoque_g)]]}
        onGravar={(itens, atualizar) => { const out = [...filamentos]; let n = 0, a = 0;
          for (const it of itens) { const reg = { tipo_id: it.tipo_id || tipoPadrao, cor: it.cor, cor_hex: it.cor_hex, marca: it.marca, peso_g: it.peso_g, preco: it.preco, estoque_g: it.estoque_g };
            const k = out.findIndex((x) => semAcento(x.cor) === semAcento(reg.cor) && semAcento(x.marca) === semAcento(reg.marca) && x.tipo_id === reg.tipo_id);
            if (k >= 0) { if (atualizar) { out[k] = { ...out[k], ...reg }; a++; } } else { out.push({ id: uid(), ...reg }); n++; } }
          setFilamentos(out); setImporta(false); ctx.avisar(`${n} filamento(s) novo(s)${a ? `, ${a} atualizado(s)` : ''}.`); }} />}
    </>
  );
}

/* ===================== INSUMOS ===================== */
const CATEGORIAS_BASE = ['Embalagem', 'Ferragem', 'Acabamento', 'Adesivo', 'Eletrônica', 'Etiqueta', 'Brinde'];
const UNIDADES = [['un', 'unidade'], ['par', 'par'], ['kit', 'kit'], ['m', 'metro'], ['cm', 'centímetro'], ['g', 'grama'], ['kg', 'quilo'], ['ml', 'mililitro'], ['folha', 'folha'], ['rolo', 'rolo']];
const controlaEstoque = (x) => x.estoque != null && x.estoque !== '';
function NovoInsumo({ nome, inicial, onSalvar, onCancelar, topo, ctx }) {
  const [f, setF] = useState(inicial || { nome: nome || '', categoria: '', unidade: 'un', qtd_pacote: 1, preco_pacote: '', fornecedor: '', link: '', estoque: '', estoque_min: '' });
  const set = (k, v) => setF({ ...f, [k]: v });
  const cats = [...new Set([...CATEGORIAS_BASE, ...((ctx && ctx.insumos) || []).map((x) => x.categoria).filter(Boolean)])].map((c) => ({ id: c, nome: c }));
  const unid = [...new Set([...UNIDADES.map((u) => u[0]), ...((ctx && ctx.insumos) || []).map((x) => x.unidade).filter(Boolean)])]
    .map((u) => ({ id: u, nome: u, detalhe: (UNIDADES.find((x) => x[0] === u) || [])[1] || '' }));
  const controla = controlaEstoque(f);
  return (
    <Modal titulo={inicial ? 'Editar insumo' : 'Cadastrar insumo'} onFechar={onCancelar} largo>
      {topo}
      <div className="grade">
        <div className="span2"><label htmlFor="ni-n">Nome</label><input id="ni-n" value={f.nome} autoFocus onChange={(e) => set('nome', e.target.value)} /></div>
        <Escolha id="ni-c" rotulo="Categoria" valor={f.categoria || ''} itens={cats} onEscolher={(x) => set('categoria', x.id)}
          onCriar={(t, depois) => depois({ id: t, nome: t })} textoCriar={(t) => `Nova categoria "${t}"`} placeholder="embalagem, ferragem" />
        <Escolha id="ni-u" rotulo="Unidade" valor={f.unidade || ''} itens={unid} onEscolher={(x) => set('unidade', x.id)}
          onCriar={(t, depois) => depois({ id: t, nome: t })} textoCriar={(t) => `Nova unidade "${t}"`} />
        <div><label htmlFor="ni-q">Quantidade no pacote</label><div className="campo pc"><input id="ni-q" type="number" min="0.0001" step="1" value={f.qtd_pacote} onChange={(e) => set('qtd_pacote', e.target.value)} /><span className="sufx">{f.unidade || 'un'}</span></div></div>
        <CampoMoeda id="ni-p" rot="Preço do pacote" valor={f.preco_pacote} onChange={(v) => set('preco_pacote', v)} />
        <div><label htmlFor="ni-f">Fornecedor</label><input id="ni-f" value={f.fornecedor || ''} onChange={(e) => set('fornecedor', e.target.value)} /></div>
        <div className="span-todo"><label htmlFor="ni-l">Link da compra</label>
          <div className="link-planilha" style={{ marginTop: 0, maxWidth: 'none' }}><input id="ni-l" type="url" value={f.link || ''} placeholder="https://… para recomprar com um clique" onChange={(e) => set('link', e.target.value)} />
            {f.link && <a className="bt" href={f.link} target="_blank" rel="noopener noreferrer"><Ico n="externo" s={15} /> Abrir</a>}</div></div>
      </div>
      <div className="separa" />
      <label className="opcao-linha"><Check on={controla} rot="Controlar estoque" onClick={() => setF({ ...f, estoque: controla ? '' : 0, estoque_min: controla ? '' : f.estoque_min || 0 })} />
        Controlar estoque deste insumo <span className="sub">baixa sozinho quando uma venda usa o produto</span></label>
      {controla && <div className="grade" style={{ marginTop: 12 }}>
        <div><label htmlFor="ni-e">Tem em estoque</label><div className="campo pc"><input id="ni-e" type="number" min="0" step="1" value={f.estoque} onChange={(e) => set('estoque', e.target.value)} /><span className="sufx">{f.unidade || 'un'}</span></div>
          <div className="linha-bt" style={{ marginTop: 6 }}><button className="bt mini" onClick={() => set('estoque', nn(f.estoque) + (nn(f.qtd_pacote) || 1))}>+ 1 pacote</button></div></div>
        <div><label htmlFor="ni-m">Avisar quando tiver menos de</label><div className="campo pc"><input id="ni-m" type="number" min="0" step="1" value={f.estoque_min} onChange={(e) => set('estoque_min', e.target.value)} /><span className="sufx">{f.unidade || 'un'}</span></div></div>
      </div>}
      <div className="aviso" style={{ marginTop: 14 }}>Custo por {f.unidade || 'unidade'}: <b>{brl4(custoUnit(f))}</b></div>
      <div className="linha-bt">
        <button className="bt forte" disabled={!String(f.nome).trim()} onClick={() => onSalvar({ ...f, id: f.id || uid(), nome: String(f.nome).trim(),
          qtd_pacote: nn(f.qtd_pacote) || 1, preco_pacote: nn(f.preco_pacote), estoque: controla ? nn(f.estoque) : null, estoque_min: controla ? nn(f.estoque_min) : null })}>
          <Ico n="check" s={15} /> {inicial ? 'Salvar' : 'Salvar e usar'}</button>
        <div className="esp" /><button className="bt" onClick={onCancelar}>Cancelar</button>
      </div>
    </Modal>
  );
}
function TelaInsumos({ ctx }) {
  const { insumos, setInsumos } = ctx;
  const [busca, setBusca] = useState(''); const [cat, setCat] = useState('');
  const [edit, setEdit] = useState(null); const [importa, setImporta] = useState(false);
  const cats = [...new Set(insumos.map((x) => x.categoria).filter(Boolean))].sort();
  const lista = insumos.filter((x) => (!cat || x.categoria === cat) && (!busca || semAcento(x.nome + ' ' + (x.fornecedor || '')).includes(semAcento(busca))));
  const baixos = insumos.filter((x) => controlaEstoque(x) && nn(x.estoque) <= nn(x.estoque_min));
  const existe = (it) => insumos.some((x) => semAcento(x.nome) === semAcento(it.nome));
  const pacote = (x) => { setInsumos(insumos.map((y) => (y.id === x.id ? { ...y, estoque: nn(y.estoque) + (nn(y.qtd_pacote) || 1) } : y)));
    if (nn(x.preco_pacote) && confirm(`Lançar a compra de ${brl(x.preco_pacote)} como saída paga hoje no financeiro?`)) ctx.lancar({ tipo: 'pagar', descricao: `Insumo ${x.nome}`, valor: nn(x.preco_pacote), venc: hoje(), pago: true, pago_em: hoje() }); };
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Insumos</h2><span className="sub">{insumos.length} cadastrado(s)</span></div><div className="esp" />
        <button className="bt" onClick={() => setImporta(true)}><Ico n="doc" s={15} /> Importar planilha</button>
        <button className="bt forte" onClick={() => ctx.pedirInsumo('', () => {})}><Ico n="mais" s={15} /> Novo insumo</button></div>
      <div className="filtros">
        <div className="grow"><Escolha id="fi-c" rotulo="Categoria" valor={cat} onEscolher={(x) => setCat(x.id)} itens={[{ id: '', nome: 'Todas as categorias' }, ...cats.map((c) => ({ id: c, nome: c }))]} /></div>
        <div className="grow"><label htmlFor="fi-b">Buscar</label><input id="fi-b" value={busca} placeholder="nome ou fornecedor" onChange={(e) => setBusca(e.target.value)} /></div>
      </div>
      <div className="numeros tres">
        <div className="n"><span className="rot">Insumos</span><b>{lista.length}</b><span className="sub">{insumos.filter(controlaEstoque).length} com estoque controlado</span></div>
        <div className="n"><span className="rot">Valor em estoque</span><b>{brl(insumos.filter(controlaEstoque).reduce((a, x) => a + nn(x.estoque) * custoUnit(x), 0))}</b><span className="sub">quantidade × custo por unidade</span></div>
        <div className="n"><span className="rot">Acabando</span><b className={baixos.length ? 'alerta' : ''}>{baixos.length}</b><span className="sub">no mínimo ou abaixo dele</span></div>
      </div>
      <div className="cartao">
        {lista.length ? <div className="rolo"><table>
          <thead><tr><th>Insumo</th><th>Categoria</th><th className="num">Pacote</th><th className="num">Por unidade</th><th className="num">Estoque</th><th /></tr></thead>
          <tbody>{lista.map((x) => { const baixo = controlaEstoque(x) && nn(x.estoque) <= nn(x.estoque_min); return (
            <tr key={x.id} className="clicavel" onClick={() => setEdit(x)}>
              <td>{x.nome}{x.fornecedor ? <div className="sub">{x.fornecedor}</div> : null}</td><td className="sub">{x.categoria}</td>
              <td className="num sub">{nf(x.qtd_pacote).replace(',00', '')} {x.unidade || 'un'} por {brl(x.preco_pacote)}</td>
              <td className="num">{brl4(custoUnit(x))}</td>
              <td className="num">{controlaEstoque(x) ? <><b className={baixo ? 'alerta-txt' : ''}>{nf(x.estoque).replace(',00', '')} {x.unidade || 'un'}</b>
                <div className="sub">mínimo {nf(x.estoque_min).replace(',00', '')}</div></> : <span className="sub">não controla</span>}</td>
              <td onClick={(e) => e.stopPropagation()}><div className="acoes">
                {controlaEstoque(x) && <button className="bt mini" title="Chegou mais um pacote" onClick={() => pacote(x)}>+ pacote</button>}
                {x.link && <a className="ico" href={x.link} target="_blank" rel="noopener noreferrer" title="Abrir link da compra" aria-label={`Comprar ${x.nome} de novo`}><Ico n="externo" /></a>}
                <button className="ico" title="Editar" aria-label={`Editar ${x.nome}`} onClick={() => setEdit(x)}><Ico n="lapis" /></button>
                <button className="ico perigo" title="Excluir" aria-label={`Excluir ${x.nome}`} onClick={() => { if (confirm(`Excluir "${x.nome}"? Produtos e orçamentos já salvos mantêm o custo que tinham.`)) setInsumos(insumos.filter((y) => y.id !== x.id)); }}><Ico n="lixo" /></button>
              </div></td></tr>); })}</tbody></table></div>
          : <div className="vazio">{insumos.length ? 'Nada neste filtro.' : 'Nenhum insumo ainda. Importe da sua planilha ou cadastre um por um. No simulador, digitar um nome novo já cadastra.'}</div>}
      </div>
      {edit && <NovoInsumo inicial={edit} ctx={ctx} onCancelar={() => setEdit(null)} onSalvar={(x) => { setInsumos(insumos.map((y) => (y.id === x.id ? x : y))); setEdit(null); }} />}
      {importa && <ImportaPlanilha titulo="Importar insumos" modelo={MODELO_INSUMOS} existe={existe} onFechar={() => setImporta(false)}
        extrair={extrairInsumos}
        colunas={[['Nome', (i) => i.nome], ['Categoria', (i) => i.categoria], ['Pacote', (i) => `${i.qtd_vazia ? '1 (vazio)' : nf(i.qtd_pacote).replace(',00', '')} por ${brl(i.preco_pacote)}`],
          ['Por unidade', (i) => brl4(custoUnit(i))], ['Estoque', (i) => (i.estoque == null ? 'não controla' : i.estoque)]]}
        onGravar={(itens, atualizar) => { const out = [...insumos]; let n = 0, a = 0;
          for (const it of itens) { const reg = { nome: it.nome, categoria: it.categoria, unidade: it.unidade, qtd_pacote: it.qtd_pacote, preco_pacote: it.preco_pacote, fornecedor: it.fornecedor, link: it.link, estoque: it.estoque, estoque_min: it.estoque == null ? null : 0 };
            const k = out.findIndex((x) => semAcento(x.nome) === semAcento(it.nome));
            if (k >= 0) { if (atualizar) { out[k] = { ...out[k], ...reg }; a++; } } else { out.push({ id: uid(), ...reg }); n++; } }
          setInsumos(out); setImporta(false); ctx.avisar(`${n} insumo(s) novo(s)${a ? `, ${a} atualizado(s)` : ''}.`); }} />}
    </>
  );
}

/* ===================== v3.6 · canais com faixa de preço ===================== */
/* canal pode ter faixas: [{ ate, taxa_pct, taxa_fixa }] por preço de venda. Sem faixas, vale taxa_pct + taxa_fixa. */
function taxaDoCanal(can, preco) {
  if (!can) return { pct: 0, fixa: 0 };
  const fx = (can.faixas || []).filter((f) => f && f.ate !== '' && f.ate != null).slice().sort((a, b) => nn(a.ate) - nn(b.ate));
  if (!fx.length) return { pct: nn(can.taxa_pct), fixa: nn(can.taxa_fixa) };
  const f = fx.find((x) => preco <= nn(x.ate)) || fx[fx.length - 1];
  return { pct: nn(f.taxa_pct), fixa: nn(f.taxa_fixa) };
}
/* preço no canal por divisão, escolhendo a faixa em que o próprio preço cai */
function precoNoCanal(base, can, imposto) {
  const tenta = (pct, fixa) => { const d = 1 - pct - nn(imposto); return d <= 0.05 ? null : (base + fixa) / d; };
  const fx = (can?.faixas || []).filter((f) => f && f.ate !== '' && f.ate != null).slice().sort((a, b) => nn(a.ate) - nn(b.ate));
  if (!can || !fx.length) { const t = taxaDoCanal(can, 0); const p = tenta(t.pct, t.fixa);
    return p == null ? { preco: 0, pct: t.pct, fixa: t.fixa, erro: 'Taxa do canal mais imposto inviabiliza o preço.' } : { preco: p, pct: t.pct, fixa: t.fixa }; }
  let ant = 0;
  for (const f of fx) { const p = tenta(nn(f.taxa_pct), nn(f.taxa_fixa)); if (p != null && p > ant && p <= nn(f.ate)) return { preco: p, pct: nn(f.taxa_pct), fixa: nn(f.taxa_fixa), faixa: f }; ant = nn(f.ate); }
  const u = fx[fx.length - 1]; const p = tenta(nn(u.taxa_pct), nn(u.taxa_fixa));
  return p == null ? { preco: 0, pct: nn(u.taxa_pct), fixa: nn(u.taxa_fixa), erro: 'Taxa do canal mais imposto inviabiliza o preço.' } : { preco: Math.max(p, ant + 0.01), pct: nn(u.taxa_pct), fixa: nn(u.taxa_fixa), faixa: u };
}
const taxaTxt = (ch) => ((ch.faixas || []).length ? 'por faixa' : `${(nn(ch.taxa_pct) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%${nn(ch.taxa_fixa) > 0 ? ` + ${brl(ch.taxa_fixa)}` : ''}`);

/* normaliza qualquer ficha antiga para o jeito do fatiador: tempo e gramas são o total da impressão, divididos pelas peças */
function normaliza(s) {
  const b = baseDe(s); if (b === 'producao') return s;
  const L = s.modo === 'lote' ? Math.max(1, Math.floor(nn(s.lote)) || 1) : 1;
  const fT = b === 'peca' ? L : 1, fG = b === 'placa' ? 1 : L;
  const tMin = (nn(s.horasPeca) * 60 + nn(s.minutosPeca)) * fT;
  return { ...s, base: 'producao', placas: 1, placasTempos: null, horasPeca: tMin ? Math.floor(tMin / 60) : '', minutosPeca: tMin ? Math.round(tMin % 60) : '',
    fils: s.fils.map((f) => ({ ...f, gramas: f.gramas === '' ? '' : r2(nn(f.gramas) * fG) })) };
}

/* ===================== KANBAN genérico ===================== */
const CORES_COL = { aco: 'var(--aco-400)', azul: 'var(--azul-400)', ciano: 'var(--ciano)', ambar: 'var(--ambar)', violeta: 'var(--violeta)', verde: 'var(--ok)', coral: 'var(--coral)', rosa: 'var(--rosa)' };
function Kanban({ colunas, cards, render, onMover, vazio = 'Nada aqui' }) {
  const [sobre, setSobre] = useState(null);
  return (
    <div className="kanban">
      {colunas.map((col, ci) => { const xs = cards.filter((c) => c.coluna === col.id); const estourou = nn(col.wip) > 0 && xs.length > nn(col.wip);
        return (
          <div key={col.id} className={`kcol ${sobre === col.id ? 'sobre' : ''}`} style={{ '--cor-col': CORES_COL[col.cor] || col.cor || 'var(--aco-400)' }}
            onDragOver={(e) => { e.preventDefault(); setSobre(col.id); }} onDragLeave={() => setSobre(null)}
            onDrop={(e) => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData('text/plain'); const c = cards.find((x) => String(x.id) === id); if (c && c.coluna !== col.id) onMover(c, col.id); }}>
            <div className="kcab"><b>{col.nome}</b>{col.sistema && <span className="cadeado" title="Coluna do sistema">•</span>}
              <span className={`kcont ${estourou ? 'estourou' : ''}`}>{xs.length}{nn(col.wip) > 0 ? `/${col.wip}` : ''}</span></div>
            {col.resumo && <div className="kres">{col.resumo(xs)}</div>}
            <div className="kcards">
              {xs.length ? xs.map((c) => (
                <div key={c.id} className="kcard" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(c.id))}>
                  {render(c)}
                  <div className="kmov">
                    <button className="ico mini" aria-label="Mover para a etapa anterior" disabled={ci === 0} onClick={() => onMover(c, colunas[ci - 1].id)}>←</button>
                    <button className="ico mini" aria-label="Mover para a próxima etapa" disabled={ci === colunas.length - 1} onClick={() => onMover(c, colunas[ci + 1].id)}>→</button>
                  </div>
                </div>)) : <div className="kvazio">{vazio}</div>}
            </div>
          </div>); })}
    </div>
  );
}
function EditarColunas({ colunas, onSalvar, onCancelar }) {
  const [cs, setCs] = useState(colunas.map((c) => ({ ...c })));
  const mover = (i, d) => { const n = [...cs]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); setCs(n); };
  return (
    <Modal titulo="Editar colunas do funil" onFechar={onCancelar} largo>
      <p className="sub" style={{ marginTop: 0 }}>Renomeie, troque a cor, reordene e defina o limite de cards por coluna. Fechado e Perdido não saem: carregam as regras de venda e de perda.</p>
      <div className="col-edit">{cs.map((c, i) => (
        <div key={c.id} className="col-linha">
          <div className="ordem"><button className="ico mini" disabled={i === 0} aria-label="Subir" onClick={() => mover(i, -1)}>↑</button>
            <button className="ico mini" disabled={i === cs.length - 1} aria-label="Descer" onClick={() => mover(i, 1)}>↓</button></div>
          <input value={c.nome} aria-label="Nome da coluna" onChange={(e) => setCs(cs.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))} />
          <div className="cores-col">{Object.keys(CORES_COL).map((k) => <button key={k} type="button" aria-label={`Cor ${k}`} className={c.cor === k ? 'on' : ''} style={{ background: CORES_COL[k] }}
            onClick={() => setCs(cs.map((x, j) => (j === i ? { ...x, cor: k } : x)))} />)}</div>
          <div className="campo pc wip"><input type="number" min="0" placeholder="sem limite" value={c.wip || ''} aria-label="Limite de cards"
            onChange={(e) => setCs(cs.map((x, k) => (k === i ? { ...x, wip: e.target.value } : x)))} /></div>
          {c.sistema ? <span className="sub" title="Coluna do sistema">fixa</span>
            : <button className="ico perigo" aria-label="Tirar coluna" onClick={() => setCs(cs.filter((_, k) => k !== i))}><Ico n="x" /></button>}
        </div>))}</div>
      <div className="linha-bt">
        <button className="bt" onClick={() => setCs([...cs.slice(0, -2), { id: uid(), nome: 'Nova etapa', cor: 'azul' }, ...cs.slice(-2)])}><Ico n="mais" s={15} /> Adicionar coluna</button>
        <div className="esp" /><button className="bt" onClick={onCancelar}>Cancelar</button>
        <button className="bt forte" onClick={() => onSalvar(cs.filter((c) => c.nome.trim()))}><Ico n="check" s={15} /> Salvar colunas</button>
      </div>
    </Modal>
  );
}

/* ===================== FUNIL DE VENDAS ===================== */
const FUNIL_PADRAO = [
  { id: 'contato', nome: 'Contato', cor: 'aco' }, { id: 'enviado', nome: 'Orçamento enviado', cor: 'azul' },
  { id: 'negociacao', nome: 'Negociação', cor: 'ambar' }, { id: 'ganho', nome: 'Fechado', cor: 'verde', sistema: true },
  { id: 'perdido', nome: 'Perdido', cor: 'coral', sistema: true },
];
const etapaOrc = (o) => o.etapa || ({ rascunho: 'contato', enviado: 'enviado', aprovado: 'ganho', recusado: 'perdido', expirado: 'perdido' })[o.status] || 'contato';
function TelaFunil({ ctx, orcamentos, setOrcamentos, onFecharVenda, abrir }) {
  const [editCols, setEditCols] = useState(false); const [perda, setPerda] = useState(null);
  const cols = ctx.params.funil_colunas || FUNIL_PADRAO;
  const ativos = orcamentos.filter((o) => cols.some((c) => c.id === etapaOrc(o)) || true);
  const cards = ativos.map((o) => ({ ...o, coluna: cols.some((c) => c.id === etapaOrc(o)) ? etapaOrc(o) : cols[0].id }));
  const cli = (id) => ctx.clientes.find((c) => c.id === id);
  const soma = (xs) => xs.reduce((a, o) => a + nn(o.total), 0);
  const abertos = cards.filter((c) => c.coluna !== 'ganho' && c.coluna !== 'perdido');
  const ganhos = cards.filter((c) => c.coluna === 'ganho'), perdidos = cards.filter((c) => c.coluna === 'perdido');
  const mover = (o, para) => {
    if (para === 'ganho') { if (confirm(`Fechar o orçamento nº ${o.numero}? Vira venda, entra no a receber e vai para a fila de produção.`)) onFecharVenda(o, { ficar: true }); return; }
    if (para === 'perdido') { setPerda(o); return; }
    setOrcamentos(orcamentos.map((x) => (x.id === o.id ? { ...x, etapa: para, etapa_em: hoje(), status: para === 'contato' ? 'rascunho' : x.status === 'rascunho' ? 'enviado' : x.status } : x)));
  };
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Funil de vendas</h2><span className="sub">arraste os cards entre as etapas</span></div><div className="esp" />
        <button className="bt" onClick={() => setEditCols(true)}><Ico n="eng" s={15} /> Colunas</button>
        <button className="bt forte" onClick={() => abrir('orcamentos', { novo: true })}><Ico n="mais" s={15} /> Nova negociação</button></div>
      <div className="numeros">
        <div className="n cor-azul"><span className="rot">Em negociação</span><b>{brl(soma(abertos))}</b><span className="sub">{abertos.length} card(s)</span></div>
        <div className="n cor-verde"><span className="rot">Fechado</span><b>{brl(soma(ganhos))}</b><span className="sub">{ganhos.length} venda(s)</span></div>
        <div className="n cor-ambar"><span className="rot">Conversão</span><b>{pctTxt(ganhos.length + perdidos.length ? ganhos.length / (ganhos.length + perdidos.length) : 0)}</b><span className="sub">fechados sobre decididos</span></div>
        <div className="n cor-coral"><span className="rot">Perdido</span><b>{brl(soma(perdidos))}</b><span className="sub">{perdidos.length} card(s)</span></div>
      </div>
      <Kanban colunas={cols.map((c) => ({ ...c, resumo: (xs) => brl(soma(xs)) }))} cards={cards} onMover={mover} vazio="Arraste um card para cá"
        render={(o) => { const c = cli(o.cliente_id); return (
          <button className="kcorpo" onClick={() => abrir('orcamentos', { abrir: o.id })}>
            <span className="kl1"><b>{c?.nome || 'Sem cliente'}</b><span className="knum">nº {o.numero}</span></span>
            <span className="kvalor">{brl(o.total)}</span>
            <span className="kl2">{(o.itens || []).slice(0, 2).map((i) => i.descricao).join(', ')}{(o.itens || []).length > 2 ? ` e mais ${(o.itens || []).length - 2}` : ''}</span>
            {o.motivo_perda && <span className="pilula recusado">{o.motivo_perda}</span>}
            {situacaoOrc(o) === 'vencido' && <span className="pilula vencido">vencido</span>}
          </button>); }} />
      <span className="dica">Mover para Fechado cria a venda, o a receber e as ordens na fila de produção. Mover para Perdido pede o motivo.</span>
      {editCols && <EditarColunas colunas={cols} onCancelar={() => setEditCols(false)} onSalvar={(cs) => { ctx.setParams({ ...ctx.params, funil_colunas: cs }); setEditCols(false); }} />}
      {perda && <MotivoPerda orc={perda} onCancelar={() => setPerda(null)} onSalvar={(o) => { setOrcamentos(orcamentos.map((x) => (x.id === o.id ? { ...o, etapa: 'perdido', etapa_em: hoje() } : x))); setPerda(null); }} />}
    </>
  );
}

/* ===================== FILA DE PRODUÇÃO ===================== */
const ETAPAS_PROD = [{ id: 'fila', nome: 'A imprimir', cor: 'aco' }, { id: 'imprimindo', nome: 'Imprimindo', cor: 'azul' },
  { id: 'pos', nome: 'Pós-processo', cor: 'violeta' }, { id: 'pronto', nome: 'Pronto', cor: 'verde' }];
/* uma ordem por produto vendido; kit vira uma ordem por produto do kit */
function ordensDaVenda(v, ctx) {
  const out = [];
  for (const it of v.itens || []) {
    const kit = it.kit_id && ctx.kits.find((k) => k.id === it.kit_id);
    const partes = kit ? kit.itens.map((k) => ({ peca_id: k.peca_id, qtd: nn(k.qtd) * nn(it.qtd), de: kit.nome })) : it.peca_id ? [{ peca_id: it.peca_id, qtd: nn(it.qtd) }] : [];
    for (const p of partes) { const pc = ctx.pecas.find((x) => x.id === p.peca_id); if (!pc) continue;
      out.push({ id: uid(), venda_id: v.id, venda_numero: v.numero, cliente_id: v.cliente_id, peca_id: pc.id, descricao: pc.nome + (p.de ? ` (kit ${p.de})` : ''),
        qtd: p.qtd, etapa: 'fila', prazo: v.entrega_em || '', criado_em: hoje(), falhas: 0 }); }
  }
  return out;
}
function TelaProducao({ ctx, ordens, setOrdens, vendas, abrir }) {
  const hj = hoje();
  const horas = (o) => { const p = ctx.pecas.find((x) => x.id === o.peca_id); return p ? precificar(dePeca(p), ctx).horas_unit * nn(o.qtd) : 0; };
  const abertas = ordens.filter((o) => o.etapa !== 'pronto');
  const atrasadas = abertas.filter((o) => o.prazo && o.prazo < hj);
  const cli = (id) => ctx.clientes.find((c) => c.id === id)?.nome;
  const mover = (o, para) => setOrdens(ordens.map((x) => (x.id === o.id ? { ...x, etapa: para, [`em_${para}`]: hoje() } : x)));
  const falhou = (o) => { if (!confirm(`Registrar uma falha em "${o.descricao}"? A ordem volta para A imprimir e a falha entra na conta do refugo real.`)) return;
    setOrdens(ordens.map((x) => (x.id === o.id ? { ...x, etapa: 'fila', falhas: nn(x.falhas) + 1 } : x))); };
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Fila de produção</h2><span className="sub">venda salva entra aqui sozinha</span></div><div className="esp" />
        <button className="bt forte" onClick={() => abrir('vendas', { novo: true })}><Ico n="mais" s={15} /> Novo pedido</button></div>
      <div className="numeros">
        <div className="n cor-azul"><span className="rot">Ordens abertas</span><b>{abertas.length}</b><span className="sub">{abertas.reduce((a, o) => a + nn(o.qtd), 0)} peça(s)</span></div>
        <div className="n cor-violeta"><span className="rot">Máquina na fila</span><b>{hhmm(abertas.filter((o) => o.etapa === 'fila').reduce((a, o) => a + horas(o), 0))}</b><span className="sub">só o que ainda vai imprimir</span></div>
        <div className="n cor-coral"><span className="rot">Atrasadas</span><b className={atrasadas.length ? 'alerta' : ''}>{atrasadas.length}</b><span className="sub">passaram da data de entrega</span></div>
        <div className="n cor-verde"><span className="rot">Prontas</span><b>{ordens.filter((o) => o.etapa === 'pronto').length}</b><span className="sub">esperando envio</span></div>
      </div>
      <Kanban colunas={ETAPAS_PROD.map((c) => ({ ...c, resumo: (xs) => `${xs.reduce((a, o) => a + nn(o.qtd), 0)} un.` }))} cards={ordens.map((o) => ({ ...o, coluna: o.etapa }))}
        onMover={mover} vazio="Sem ordens aqui"
        render={(o) => (
          <div className="kcorpo">
            <span className="kl1"><b>{o.descricao}</b><span className="kqtd">{o.qtd} un.</span></span>
            <span className="kl2">{o.venda_numero ? `Venda nº ${o.venda_numero}` : 'Avulsa'}{cli(o.cliente_id) ? ` · ${cli(o.cliente_id)}` : ''}</span>
            <span className="kl2">{hhmm(horas(o))} de máquina{o.prazo ? ` · entrega ${dbr(o.prazo).slice(0, 5)}` : ''}{nn(o.falhas) ? ` · ${o.falhas} falha(s)` : ''}</span>
            {o.prazo && o.prazo < hj && o.etapa !== 'pronto' && <span className="pilula vencido">atrasada</span>}
            {o.etapa !== 'pronto' && <button className="link perda" onClick={() => falhou(o)}>registrar falha</button>}
          </div>)} />
      <span className="dica">Ordem pronta libera a venda para Entregas quando todas as ordens dela estiverem prontas.</span>
    </>
  );
}

/* ===================== ENTREGAS ===================== */
const ETAPAS_ENTREGA = [{ id: 'producao', nome: 'Em produção', cor: 'violeta', sistema: true }, { id: 'pronto', nome: 'Pronto para envio', cor: 'ambar' },
  { id: 'enviado', nome: 'A caminho', cor: 'azul' }, { id: 'entregue', nome: 'Entregue', cor: 'verde' }];
const METODOS = ['Retirada', 'Motoboy', 'Correios', 'Transportadora', 'Marketplace'];
function etapaEntrega(v, ordens) {
  const et = v.entrega?.etapa;
  if (et === 'enviado' || et === 'entregue') return et;
  const os = ordens.filter((o) => o.venda_id === v.id);
  if (os.length && os.some((o) => o.etapa !== 'pronto')) return 'producao';
  return 'pronto';
}
function TelaEntregas({ ctx, vendas, setVendas, ordens }) {
  const [edit, setEdit] = useState(null);
  const hj = hoje(), em7 = ymd(new Date(Date.now() + 7 * 864e5));
  const vs = vendas.filter((v) => v.status !== 'cancelada' && !(v.entrega?.etapa === 'entregue' && (v.entrega?.entregue_em || '') < ymd(new Date(Date.now() - 30 * 864e5))));
  const cards = vs.map((v) => ({ ...v, coluna: etapaEntrega(v, ordens) }));
  const cli = (id) => ctx.clientes.find((c) => c.id === id);
  const mover = (v, para) => {
    if (para === 'producao') { alert('Em produção é automático: a venda sai daqui quando todas as ordens dela ficam prontas.'); return; }
    setVendas(vendas.map((x) => (x.id === v.id ? { ...x, status: para === 'entregue' ? 'entregue' : x.status, entrega: { ...(x.entrega || {}), etapa: para, [`${para}_em`]: hoje() } } : x)));
  };
  const semana = cards.filter((c) => c.coluna !== 'entregue' && c.entrega_em && c.entrega_em <= em7);
  const atras = cards.filter((c) => c.coluna !== 'entregue' && c.entrega_em && c.entrega_em < hj);
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Entregas</h2><span className="sub">o que sai da produção e o que está a caminho</span></div></div>
      <div className="numeros">
        <div className="n cor-ambar"><span className="rot">Para entregar em 7 dias</span><b>{semana.length}</b><span className="sub">{brl(semana.reduce((a, v) => a + nn(v.total), 0))}</span></div>
        <div className="n cor-violeta"><span className="rot">Ainda em produção</span><b>{cards.filter((c) => c.coluna === 'producao').length}</b><span className="sub">previsão pela data de entrega</span></div>
        <div className="n cor-azul"><span className="rot">A caminho</span><b>{cards.filter((c) => c.coluna === 'enviado').length}</b><span className="sub">esperando chegar</span></div>
        <div className="n cor-coral"><span className="rot">Atrasadas</span><b className={atras.length ? 'alerta' : ''}>{atras.length}</b><span className="sub">passaram da data combinada</span></div>
      </div>
      <Kanban colunas={ETAPAS_ENTREGA} cards={cards} onMover={mover} vazio="Nada nesta etapa"
        render={(v) => (
          <button className="kcorpo" onClick={() => setEdit(v)}>
            <span className="kl1"><b>{cli(v.cliente_id)?.nome || 'Sem cliente'}</b><span className="knum">nº {v.numero}</span></span>
            <span className="kl2">{v.entrega?.metodo || 'método a definir'}{v.entrega?.rastreio ? ` · ${v.entrega.rastreio}` : ''}</span>
            <span className="kl2">{v.entrega_em ? `combinado para ${dbr(v.entrega_em)}` : 'sem data combinada'}</span>
            {v.entrega_em && v.entrega_em < hj && v.coluna !== 'entregue' && <span className="pilula vencido">atrasada</span>}
          </button>)} />
      {edit && <Modal titulo={`Entrega da venda nº ${edit.numero}`} onFechar={() => setEdit(null)}>
        <div className="grade">
          <div><label htmlFor="en-dt">Data combinada</label><input id="en-dt" type="date" value={edit.entrega_em || ''} onChange={(e) => setEdit({ ...edit, entrega_em: e.target.value })} /></div>
          <Escolha id="en-met" rotulo="Como vai" valor={edit.entrega?.metodo || ''} itens={METODOS.map((m) => ({ id: m, nome: m }))}
            onEscolher={(x) => setEdit({ ...edit, entrega: { ...(edit.entrega || {}), metodo: x.id } })} onCriar={(t, d) => d({ id: t, nome: t })} textoCriar={(t) => `Usar "${t}"`} />
          <div className="span-todo"><label htmlFor="en-ras">Código de rastreio</label><input id="en-ras" value={edit.entrega?.rastreio || ''} placeholder="se houver"
            onChange={(e) => setEdit({ ...edit, entrega: { ...(edit.entrega || {}), rastreio: e.target.value } })} /></div>
          {cli(edit.cliente_id) && <div className="span-todo sub">Endereço: {[cli(edit.cliente_id).rua, cli(edit.cliente_id).numero_end, cli(edit.cliente_id).bairro, cli(edit.cliente_id).cidade].filter(Boolean).join(', ') || 'não cadastrado no cliente'}</div>}
        </div>
        <div className="linha-bt"><button className="bt forte" onClick={() => { setVendas(vendas.map((x) => (x.id === edit.id ? { ...x, entrega_em: edit.entrega_em, entrega: edit.entrega } : x))); setEdit(null); }}>
          <Ico n="check" s={15} /> Salvar</button><div className="esp" /><button className="bt" onClick={() => setEdit(null)}>Cancelar</button></div>
      </Modal>}
    </>
  );
}

/* ===================== KITS ===================== */
function custoKit(kit, ctx, canalId) {
  let custo = 0, base = 0;
  for (const it of kit.itens || []) { const p = ctx.pecas.find((x) => x.id === it.peca_id); if (!p) continue;
    const c = precificar(dePeca(p), ctx, canalId); custo += c.custo_total * nn(it.qtd); base += c.base_preco * nn(it.qtd); }
  const ins = (kit.insumos || []).filter((i) => i.on !== false).reduce((a, i) => a + nn(i.valor), 0);
  custo += ins; base = base * (1 - nn(kit.desconto_pct)) + ins * (1 + nn(ctx.params.margem_padrao));
  const can = ctx.canais.find((c) => c.id === canalId) || ctx.canais[0];
  const r = nn(kit.preco_manual) > 0 ? { preco: nn(kit.preco_manual) } : precoNoCanal(base, can, ctx.params.imposto_pct);
  const avulso = (kit.itens || []).reduce((a, it) => { const p = ctx.pecas.find((x) => x.id === it.peca_id); return a + (p ? precificar(dePeca(p), ctx, can?.id).preco * nn(it.qtd) : 0); }, 0);
  return { custo: r2(custo), preco: r2(r.preco), avulso: r2(avulso), lucro: r2(r.preco - custo - (r.preco * nn(r.pct) + nn(r.fixa)) - r.preco * nn(ctx.params.imposto_pct)) };
}
function TelaKits({ ctx }) {
  const { kits, setKits } = ctx;
  const [edit, setEdit] = useState(null);
  const [txt, setTxt] = useState('');
  if (edit) {
    const c = custoKit(edit, ctx, ctx.canais[0]?.id);
    const addPeca = (p) => setEdit((e) => ({ ...e, itens: [...(e.itens || []), { key: uid(), peca_id: p.id, qtd: 1 }] }));
    return (
      <>
        <TituloForm volta={() => setEdit(null)} rotuloVolta="Kits" titulo={edit.id && kits.some((k) => k.id === edit.id) ? edit.nome || 'Kit' : 'Novo kit'} />
        <div className="duas">
          <div>
            <div className="cartao">
              <FotoCampo valor={edit.foto} rotulo="Foto do kit" onMuda={(v) => setEdit({ ...edit, foto: v })} />
              <div className="separa" />
              <div className="grade">
                <div className="span2"><label htmlFor="k-n">Nome do kit</label><input id="k-n" value={edit.nome} placeholder="Kit maternidade 5 peças" onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
                <div><label htmlFor="k-s">SKU</label><input id="k-s" value={edit.sku || ''} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></div>
              </div>
            </div>
            <div className="cartao">
              <div className="cabeca"><h2>Produtos do kit</h2><span className="sub">do catálogo ou novos</span></div>
              <div className="linha-add">
                <Autocompleta id="k-add" rotulo="Adicionar produto" texto={txt} setTexto={setTxt} placeholder="digite o nome do produto"
                  itens={ctx.pecas.map((p) => ({ id: p.id, nome: p.nome, detalhe: brl(precificar(dePeca(p), ctx).preco) }))}
                  onEscolher={(x) => { setTxt(''); addPeca(ctx.pecas.find((p) => p.id === x.id)); }}
                  onCriar={(t) => ctx.pedirItem(t, ctx.canais[0]?.id, (r) => { setTxt(''); if (r.peca) addPeca(r.peca); })} textoCriar={(t) => `Cadastrar produto "${t}"`} />
              </div>
              {(edit.itens || []).length ? <div className="rolo"><table>
                <thead><tr><th>Produto</th><th className="num">Qtd</th><th className="num">Custo</th><th /></tr></thead>
                <tbody>{edit.itens.map((it) => { const p = ctx.pecas.find((x) => x.id === it.peca_id); return (
                  <tr key={it.key || it.peca_id}><td><div className="com-avatar"><Miniatura src={p?.foto} tam={32} />{p?.nome || 'produto excluído'}</div></td>
                    <td className="num"><input type="number" min="1" value={it.qtd} style={{ width: 70, textAlign: 'right' }}
                      onChange={(e) => setEdit({ ...edit, itens: edit.itens.map((x) => (x === it ? { ...x, qtd: Math.max(1, nn(e.target.value)) } : x)) })} /></td>
                    <td className="num">{p ? brl(precificar(dePeca(p), ctx).custo_total * nn(it.qtd)) : ''}</td>
                    <td><div className="acoes"><button className="ico perigo" aria-label="Tirar do kit" onClick={() => setEdit({ ...edit, itens: edit.itens.filter((x) => x !== it) })}><Ico n="x" /></button></div></td></tr>); })}</tbody></table></div>
                : <div className="vazio">Busque os produtos que entram no kit. Se ainda não existir, cadastre ali mesmo.</div>}
            </div>
            <div className="cartao">
              <div className="cabeca"><h2>Embalagem do kit</h2><span className="sub">o que vai uma vez só no kit</span><div className="esp" />
                <button className="bt mini" onClick={() => setEdit({ ...edit, insumos: [...(edit.insumos || []), { key: uid(), nome: '', qtd: 1, custo_unit: 0, valor: 0, on: true }] })}><Ico n="mais" s={14} /> Insumo</button></div>
              {(edit.insumos || []).map((i) => <LinhaInsumo key={i.key} i={i} ctx={ctx} onPedeNovo={ctx.pedirInsumo}
                onMuda={(x) => setEdit({ ...edit, insumos: edit.insumos.map((y) => (y.key === i.key ? x : y)) })} onTira={() => setEdit({ ...edit, insumos: edit.insumos.filter((y) => y.key !== i.key) })} />)}
              {!(edit.insumos || []).length && <div className="sub">Caixa do kit, papel de seda, cartão.</div>}
            </div>
            <div className="cartao">
              <div className="cabeca"><h2>Preço</h2></div>
              <div className="grade">
                <CampoPct id="k-d" rot="Desconto sobre os avulsos" fracao={edit.desconto_pct || 0} onChange={(v) => setEdit({ ...edit, desconto_pct: Math.min(0.8, v) })} dica="Quanto mais barato sai que comprar separado." />
                <CampoMoeda id="k-p" rot="Ou preço fechado" valor={edit.preco_manual || ''} onChange={(v) => setEdit({ ...edit, preco_manual: v })} dica="Deixe vazio para calcular." />
              </div>
            </div>
            <div className="linha-bt">
              <button className="bt forte" disabled={!String(edit.nome).trim() || !(edit.itens || []).length}
                onClick={() => { const reg = { ...edit, nome: edit.nome.trim() }; setKits(kits.some((k) => k.id === reg.id) ? kits.map((k) => (k.id === reg.id ? reg : k)) : [...kits, reg]); setEdit(null); }}>
                <Ico n="check" s={15} /> Salvar kit</button><div className="esp" /><button className="bt" onClick={() => setEdit(null)}>Cancelar</button></div>
          </div>
          <div className="painel"><div className="cartao">
            <div className="cabeca"><h2>Conta do kit</h2><span className="sub">no {ctx.canais[0]?.nome}</span></div>
            <div className="rot">Preço do kit</div><div className="grandao">{brl(c.preco)}</div>
            <div className="metricas">
              <div><span className="rot">Custo</span><b>{brl(c.custo)}</b></div>
              <div><span className="rot">Lucro</span><b>{brl(c.lucro)}</b></div>
              <div><span className="rot">Separado sairia</span><b>{brl(c.avulso)}</b></div>
              <div><span className="rot">Cliente economiza</span><b>{brl(Math.max(0, c.avulso - c.preco))}</b></div>
            </div>
            <span className="dica">No marketplace o kit paga uma taxa fixa só, porque é um item. É o que faz kit render mais que peça avulsa.</span>
          </div></div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Kits</h2><span className="sub">{kits.length} cadastrado(s)</span></div><div className="esp" />
        <button className="bt forte" onClick={() => setEdit({ id: uid(), nome: '', itens: [], insumos: [], desconto_pct: 0.1 })}><Ico n="mais" s={15} /> Novo kit</button></div>
      <div className="cartao">{kits.length ? <div className="rolo"><table>
        <thead><tr><th style={{ width: 56 }} /><th>Kit</th><th className="num">Produtos</th><th className="num">Custo</th><th className="num">Preço</th><th className="num">Economia</th><th /></tr></thead>
        <tbody>{kits.map((k) => { const c = custoKit(k, ctx, ctx.canais[0]?.id); return (
          <tr key={k.id} className="clicavel" onClick={() => setEdit({ ...k })}><td><Miniatura src={k.foto} /></td><td>{k.nome}<div className="sub">{k.sku}</div></td>
            <td className="num">{(k.itens || []).reduce((a, i) => a + nn(i.qtd), 0)}</td><td className="num">{brl(c.custo)}</td><td className="num">{brl(c.preco)}</td>
            <td className="num">{brl(Math.max(0, c.avulso - c.preco))}</td>
            <td onClick={(e) => e.stopPropagation()}><div className="acoes">
              <button className="ico" title="Editar" aria-label={`Editar ${k.nome}`} onClick={() => setEdit({ ...k })}><Ico n="lapis" /></button>
              <button className="ico perigo" title="Excluir" aria-label={`Excluir ${k.nome}`} onClick={() => { if (confirm(`Excluir o kit "${k.nome}"? Os produtos continuam.`)) setKits(kits.filter((x) => x.id !== k.id)); }}><Ico n="lixo" /></button>
            </div></td></tr>); })}</tbody></table></div>
        : <div className="vazio">Nenhum kit. Junte produtos do catálogo, dê um desconto sobre o avulso e venda como um item só.</div>}</div>
    </>
  );
}

/* ===================== CONSIGNAÇÃO ===================== */
function saldoPonto(ponto, remessas) {
  const s = {};
  for (const r of remessas.filter((r) => r.ponto_id === ponto.id)) {
    for (const it of r.itens || []) s[it.peca_id] = (s[it.peca_id] || 0) + nn(it.qtd);
    for (const a of r.acertos || []) for (const [pid, q] of Object.entries(a.baixas || {})) s[pid] = (s[pid] || 0) - nn(q);
  }
  return s;
}
function TelaConsignacao({ ctx, remessas, setRemessas, criarVendaConsig }) {
  const { pontos, setPontos } = ctx;
  const [ponto, setPonto] = useState(null); const [remessa, setRemessa] = useState(null); const [acerto, setAcerto] = useState(null);
  const [txt, setTxt] = useState('');
  const preco = (pid) => { const p = ctx.pecas.find((x) => x.id === pid); return p ? precificar(dePeca(p), ctx, ctx.canais[0]?.id).preco : 0; };
  const ultimoAcerto = (pt) => remessas.filter((r) => r.ponto_id === pt.id).flatMap((r) => [r.data, ...(r.acertos || []).map((a) => a.data)]).sort().pop();
  const proximo = (pt) => { const u = ultimoAcerto(pt); return u ? ymd(new Date(new Date(u + 'T12:00:00').getTime() + nn(pt.acerto_dias || 30) * 864e5)) : null; };
  const tot = pontos.reduce((a, pt) => { const s = saldoPonto(pt, remessas); const q = Object.values(s).reduce((x, y) => x + y, 0);
    return { q: a.q + q, v: a.v + Object.entries(s).reduce((x, [pid, n]) => x + n * preco(pid), 0) }; }, { q: 0, v: 0 });
  const atrasados = pontos.filter((pt) => proximo(pt) && proximo(pt) < hoje() && Object.values(saldoPonto(pt, remessas)).some((n) => n > 0));
  return (
    <>
      <div className="titulo"><IcoTitulo /><div className="tit-txt"><h2>Consignação</h2><span className="sub">peças deixadas em pontos de venda</span></div><div className="esp" />
        <button className="bt" onClick={() => setPonto({ id: uid(), nome: '', comissao_pct: 0.3, acerto_dias: 30 })}><Ico n="mais" s={15} /> Novo ponto</button>
        <button className="bt forte" disabled={!pontos.length} onClick={() => setRemessa({ id: uid(), ponto_id: pontos[0]?.id, data: hoje(), itens: [], acertos: [] })}><Ico n="caixa" s={15} /> Nova remessa</button></div>
      <div className="numeros">
        <div className="n cor-violeta"><span className="rot">Peças nos pontos</span><b>{tot.q}</b><span className="sub">{pontos.length} ponto(s)</span></div>
        <div className="n cor-azul"><span className="rot">Valor em consignação</span><b>{brl(tot.v)}</b><span className="sub">a preço de venda</span></div>
        <div className="n cor-coral"><span className="rot">Acerto atrasado</span><b className={atrasados.length ? 'alerta' : ''}>{atrasados.length}</b><span className="sub">ponto(s) passaram do prazo</span></div>
        <div className="n cor-verde"><span className="rot">Vendido por consignação</span><b>{brl(remessas.flatMap((r) => r.acertos || []).reduce((a, x) => a + nn(x.total), 0))}</b><span className="sub">desde o início</span></div>
      </div>
      {pontos.length ? <div className="grade-cards">{pontos.map((pt) => { const s = saldoPonto(pt, remessas); const q = Object.values(s).reduce((a, b) => a + b, 0); const px = proximo(pt);
        return (
          <div className="cartao ponto" key={pt.id}>
            <div className="cabeca"><Avatar nome={pt.nome} tam={36} /><div><h2>{pt.nome}</h2><span className="sub">{[pt.responsavel, pt.whatsapp].filter(Boolean).join(' · ')}</span></div><div className="esp" />
              <button className="ico" title="Editar" aria-label={`Editar ${pt.nome}`} onClick={() => setPonto({ ...pt })}><Ico n="lapis" /></button></div>
            <div className="metricas" style={{ marginTop: 0 }}>
              <div><span className="rot">Peças lá</span><b>{q}</b></div><div><span className="rot">Comissão do ponto</span><b>{pctTxt(pt.comissao_pct)}</b></div>
              <div><span className="rot">Próximo acerto</span><b className={px && px < hoje() && q ? 'alerta-txt' : ''}>{px ? dbr(px) : 'sem remessa'}</b></div>
              <div><span className="rot">Valor lá</span><b>{brl(Object.entries(s).reduce((a, [pid, n]) => a + n * preco(pid), 0))}</b></div>
            </div>
            <div className="linha-bt">
              <button className="bt mini" onClick={() => setRemessa({ id: uid(), ponto_id: pt.id, data: hoje(), itens: [], acertos: [] })}>Mandar peças</button>
              <button className="bt mini forte" disabled={!q} onClick={() => setAcerto({ ponto: pt, vendidos: {}, devolvidos: {} })}>Fazer acerto</button></div>
          </div>); })}</div>
        : <div className="cartao"><div className="vazio">Nenhum ponto de venda. Cadastre a loja, papelaria ou pet shop onde você deixa peças para vender e só recebe quando vendem.</div></div>}

      {ponto && <Modal titulo={pontos.some((p) => p.id === ponto.id) ? 'Editar ponto de venda' : 'Novo ponto de venda'} onFechar={() => setPonto(null)}>
        <div className="grade">
          <div className="span-todo"><label htmlFor="pv-n">Nome do ponto</label><input id="pv-n" autoFocus value={ponto.nome} placeholder="Papelaria da Esquina" onChange={(e) => setPonto({ ...ponto, nome: e.target.value })} /></div>
          <div><label htmlFor="pv-r">Responsável</label><input id="pv-r" value={ponto.responsavel || ''} placeholder="Maria" onChange={(e) => setPonto({ ...ponto, responsavel: e.target.value })} /></div>
          <div><label htmlFor="pv-w">WhatsApp</label><input id="pv-w" value={ponto.whatsapp || ''} placeholder="(21) 99999-0000" onChange={(e) => setPonto({ ...ponto, whatsapp: e.target.value })} /></div>
          <div className="span-todo"><label htmlFor="pv-e">Endereço</label><input id="pv-e" value={ponto.endereco || ''} placeholder="Rua, número, bairro" onChange={(e) => setPonto({ ...ponto, endereco: e.target.value })} /></div>
          <CampoPct id="pv-c" rot="Comissão do ponto" fracao={ponto.comissao_pct} onChange={(v) => setPonto({ ...ponto, comissao_pct: v })} dica="O que fica com eles em cada peça vendida." />
          <div><label htmlFor="pv-d">Acertar a cada</label><div className="campo pc"><input id="pv-d" type="number" min="1" value={ponto.acerto_dias} onChange={(e) => setPonto({ ...ponto, acerto_dias: e.target.value })} /><span className="sufx">dias</span></div>
            <span className="dica">Passou disso sem acerto, o ponto aparece como atrasado.</span></div>
          <div className="span-todo"><label htmlFor="pv-o">O combinado</label><textarea id="pv-o" value={ponto.combinado || ''} placeholder="acerto todo dia 10, frete por minha conta, peça danificada é dividida meio a meio" onChange={(e) => setPonto({ ...ponto, combinado: e.target.value })} /></div>
        </div>
        <div className="linha-bt"><button className="bt forte" disabled={!ponto.nome.trim()} onClick={() => { setPontos(pontos.some((p) => p.id === ponto.id) ? pontos.map((p) => (p.id === ponto.id ? ponto : p)) : [...pontos, ponto]); setPonto(null); }}>
          <Ico n="check" s={15} /> Salvar ponto</button><div className="esp" /><button className="bt" onClick={() => setPonto(null)}>Cancelar</button></div>
      </Modal>}

      {remessa && <Modal titulo="Mandar peças para o ponto" onFechar={() => setRemessa(null)} largo>
        <div className="grade">
          <Escolha id="rm-p" rotulo="Ponto de venda" valor={remessa.ponto_id} itens={pontos} onEscolher={(x) => setRemessa({ ...remessa, ponto_id: x.id })} />
          <div><label htmlFor="rm-d">Data</label><input id="rm-d" type="date" value={remessa.data} onChange={(e) => setRemessa({ ...remessa, data: e.target.value })} /></div>
        </div>
        <div className="linha-add" style={{ marginTop: 14 }}>
          <Autocompleta id="rm-add" rotulo="Produto" texto={txt} setTexto={setTxt} placeholder="digite o nome do produto" itens={ctx.pecas}
            onEscolher={(x) => { setTxt(''); setRemessa({ ...remessa, itens: [...remessa.itens, { peca_id: x.id, qtd: 1 }] }); }} /></div>
        {remessa.itens.map((it, k) => { const p = ctx.pecas.find((x) => x.id === it.peca_id); return (
          <div className="linha-rem" key={k}><span>{p?.nome}</span><input type="number" min="1" value={it.qtd} aria-label="Quantidade"
            onChange={(e) => setRemessa({ ...remessa, itens: remessa.itens.map((x, j) => (j === k ? { ...x, qtd: Math.max(1, nn(e.target.value)) } : x)) })} />
            <span className="sub">{brl(preco(it.peca_id))} cada</span>
            <button className="ico perigo" aria-label="Tirar" onClick={() => setRemessa({ ...remessa, itens: remessa.itens.filter((_, j) => j !== k) })}><Ico n="x" /></button></div>); })}
        <label className="opcao-linha" style={{ marginTop: 12 }}><Check on={!!remessa.produzir} rot="Mandar para a fila de produção" onClick={() => setRemessa({ ...remessa, produzir: !remessa.produzir })} />
          Ainda preciso imprimir estas peças <span className="sub">cria as ordens na fila de produção</span></label>
        <div className="linha-bt"><button className="bt forte" disabled={!remessa.itens.length} onClick={() => { setRemessas([...remessas, remessa]); if (remessa.produzir) ctx.criarOrdensAvulsas(remessa.itens, `Consignação ${pontos.find((p) => p.id === remessa.ponto_id)?.nome}`); setRemessa(null); }}>
          <Ico n="check" s={15} /> Registrar remessa</button><div className="esp" /><button className="bt" onClick={() => setRemessa(null)}>Cancelar</button></div>
      </Modal>}

      {acerto && (() => { const s = saldoPonto(acerto.ponto, remessas); const itens = Object.entries(s).filter(([, n]) => n > 0);
        const total = itens.reduce((a, [pid]) => a + nn(acerto.vendidos[pid]) * preco(pid), 0);
        return (
          <Modal titulo={`Acerto com ${acerto.ponto.nome}`} onFechar={() => setAcerto(null)} largo>
            <p className="sub" style={{ marginTop: 0 }}>Conte o que vendeu e o que volta. O vendido vira venda, com a comissão do ponto descontada, e entra no a receber.</p>
            <div className="rolo"><table><thead><tr><th>Produto</th><th className="num">Está lá</th><th className="num">Vendeu</th><th className="num">Volta</th><th className="num">Valor</th></tr></thead>
              <tbody>{itens.map(([pid, n]) => { const p = ctx.pecas.find((x) => x.id === pid); return (
                <tr key={pid}><td>{p?.nome}</td><td className="num">{n}</td>
                  <td className="num"><input type="number" min="0" max={n} value={acerto.vendidos[pid] ?? ''} placeholder="0" style={{ width: 70, textAlign: 'right' }}
                    onChange={(e) => setAcerto({ ...acerto, vendidos: { ...acerto.vendidos, [pid]: Math.min(n, Math.max(0, nn(e.target.value))) } })} /></td>
                  <td className="num"><input type="number" min="0" max={n} value={acerto.devolvidos[pid] ?? ''} placeholder="0" style={{ width: 70, textAlign: 'right' }}
                    onChange={(e) => setAcerto({ ...acerto, devolvidos: { ...acerto.devolvidos, [pid]: Math.min(n - nn(acerto.vendidos[pid]), Math.max(0, nn(e.target.value))) } })} /></td>
                  <td className="num">{brl(nn(acerto.vendidos[pid]) * preco(pid))}</td></tr>); })}</tbody></table></div>
            <div className="aviso" style={{ marginTop: 12 }}>Vendido {brl(total)} · comissão do ponto {brl(total * nn(acerto.ponto.comissao_pct))} · você recebe <b>{brl(total * (1 - nn(acerto.ponto.comissao_pct)))}</b></div>
            <div className="linha-bt"><button className="bt forte" onClick={() => {
              const baixas = {}; for (const [pid] of itens) baixas[pid] = nn(acerto.vendidos[pid]) + nn(acerto.devolvidos[pid]);
              const vend = itens.filter(([pid]) => nn(acerto.vendidos[pid]) > 0).map(([pid]) => { const p = ctx.pecas.find((x) => x.id === pid); const c = precificar(dePeca(p), ctx);
                return { key: uid(), peca_id: pid, descricao: p.nome, qtd: nn(acerto.vendidos[pid]), preco_unit: r2(preco(pid)), custo_unit: c.custo_total, snap: snapshotItem(c, ctx.params) }; });
              const alvo = remessas.filter((r) => r.ponto_id === acerto.ponto.id).pop();
              setRemessas(remessas.map((r) => (r === alvo ? { ...r, acertos: [...(r.acertos || []), { data: hoje(), baixas, total: r2(total) }] } : r)));
              if (vend.length) criarVendaConsig(acerto.ponto, vend);
              setAcerto(null); }}><Ico n="check" s={15} /> Fechar acerto</button><div className="esp" /><button className="bt" onClick={() => setAcerto(null)}>Cancelar</button></div>
          </Modal>); })()}
    </>
  );
}

/* ===================== CALENDÁRIO ===================== */
const TIPOS_EVT = [['venda', 'Vendas', 'azul'], ['entrega', 'Entregas', 'verde'], ['orc', 'Orçamentos vencendo', 'ambar'], ['pagar', 'Contas a pagar', 'coral'], ['receber', 'A receber', 'ciano'], ['consig', 'Acertos', 'violeta']];
function eventosDe({ ctx, orcamentos, vendas, lancamentos, remessas }) {
  const ev = [], cli = (id) => ctx.clientes.find((c) => c.id === id)?.nome || 'sem cliente';
  for (const v of vendas.filter((v) => v.status !== 'cancelada')) {
    if (v.data) ev.push({ tipo: 'venda', data: v.data, txt: `Venda nº ${v.numero} · ${cli(v.cliente_id)}`, valor: v.total, abrir: ['vendas', { abrir: v.id }] });
    if (v.entrega_em) ev.push({ tipo: 'entrega', data: v.entrega_em, txt: `Entrega nº ${v.numero} · ${cli(v.cliente_id)}`, feito: v.entrega?.etapa === 'entregue', abrir: ['entregas'] });
  }
  for (const o of orcamentos.filter((o) => situacaoOrc(o) === 'aberto' && o.criado_em))
    ev.push({ tipo: 'orc', data: ymd(new Date(new Date(o.criado_em + 'T12:00:00').getTime() + nn(o.validade_dias || 7) * 864e5)), txt: `Orçamento nº ${o.numero} vence · ${cli(o.cliente_id)}`, valor: o.total, abrir: ['orcamentos', { abrir: o.id }] });
  for (const l of lancamentos.filter((l) => l.venc)) ev.push({ tipo: l.tipo === 'pagar' ? 'pagar' : 'receber', data: l.venc, txt: l.descricao, valor: l.valor, feito: l.pago, abrir: [l.tipo === 'pagar' ? 'fin-pagar' : 'fin-receber'] });
  for (const pt of ctx.pontos) { const u = (remessas || []).filter((r) => r.ponto_id === pt.id).flatMap((r) => [r.data, ...(r.acertos || []).map((a) => a.data)]).sort().pop();
    if (u) ev.push({ tipo: 'consig', data: ymd(new Date(new Date(u + 'T12:00:00').getTime() + nn(pt.acerto_dias || 30) * 864e5)), txt: `Acerto com ${pt.nome}`, abrir: ['consignacao'] }); }
  return ev;
}
function linkGoogle(e) { const d = e.data.replace(/-/g, ''); const f = ymd(new Date(new Date(e.data + 'T12:00:00').getTime() + 864e5)).replace(/-/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.txt)}&dates=${d}/${f}&details=${encodeURIComponent('Make3Lab' + (e.valor ? ' · ' + brl(e.valor) : ''))}`; }
function baixarIcs(evs, nome) {
  const l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Make3Lab//PT-BR'];
  for (const e of evs) { const d = e.data.replace(/-/g, ''); l.push('BEGIN:VEVENT', `UID:${uid()}@make3lab`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${e.txt.replace(/[,;]/g, ' ')}`, 'END:VEVENT'); }
  l.push('END:VCALENDAR');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([l.join('\r\n')], { type: 'text/calendar' })); a.download = nome + '.ics';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function TelaCalendario({ ctx, orcamentos, vendas, lancamentos, remessas, abrir, ir }) {
  const [mes, setMes] = useState(() => hoje().slice(0, 7)); const [filtros, setFiltros] = useState(TIPOS_EVT.map((t) => t[0])); const [dia, setDia] = useState(null);
  const todos = eventosDe({ ctx, orcamentos, vendas, lancamentos, remessas }).filter((e) => filtros.includes(e.tipo));
  const doMes = todos.filter((e) => e.data.startsWith(mes));
  const [y, m] = mes.split('-').map(Number); const pri = new Date(y, m - 1, 1); const nDias = new Date(y, m, 0).getDate(); const pad = pri.getDay();
  const troca = (d) => { const x = new Date(y, m - 1 + d, 1); setMes(ymd(x).slice(0, 7)); setDia(null); };
  const cor = (t) => CORES_COL[(TIPOS_EVT.find((x) => x[0] === t) || [])[2]];
  const hj = hoje(); const pend = todos.filter((e) => e.data < hj && !e.feito && ['entrega', 'pagar', 'receber', 'consig'].includes(e.tipo));
  const soma = (t) => doMes.filter((e) => e.tipo === t).reduce((a, e) => a + nn(e.valor), 0);
  const doDia = dia ? todos.filter((e) => e.data === dia) : [];
  return (
    <>
      <div className="titulo"><IcoTitulo /><h2>Calendário</h2><div className="esp" />
        <button className="bt" onClick={() => baixarIcs(doMes, `make3lab-${mes}`)}><Ico n="baixa" s={15} /> Exportar mês para agenda</button></div>
      <div className="numeros">
        <div className="n cor-azul"><span className="rot">Vendido no mês</span><b>{brl(soma('venda'))}</b><span className="sub">{doMes.filter((e) => e.tipo === 'venda').length} venda(s)</span></div>
        <div className="n cor-verde"><span className="rot">Entregas no mês</span><b>{doMes.filter((e) => e.tipo === 'entrega').length}</b><span className="sub">{doMes.filter((e) => e.tipo === 'entrega' && e.feito).length} feita(s)</span></div>
        <div className="n cor-ciano"><span className="rot">A receber no mês</span><b>{brl(soma('receber'))}</b><span className="sub">vencimentos</span></div>
        <div className="n cor-coral"><span className="rot">A pagar no mês</span><b>{brl(soma('pagar'))}</b><span className="sub">vencimentos</span></div>
      </div>
      <div className="duas iguais cal">
        <div className="cartao">
          <div className="cabeca"><button className="ico" aria-label="Mês anterior" onClick={() => troca(-1)}>‹</button>
            <h2 style={{ textTransform: 'capitalize' }}>{pri.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <button className="ico" aria-label="Próximo mês" onClick={() => troca(1)}>›</button><div className="esp" />
            <button className="bt mini" onClick={() => { setMes(hj.slice(0, 7)); setDia(hj); }}>Hoje</button></div>
          <div className="filtro-chips">{TIPOS_EVT.map(([k, r]) => { const on = filtros.includes(k); return (
            <button key={k} className={`chip-f ${on ? 'on' : ''}`} style={{ '--cor-col': cor(k) }} onClick={() => setFiltros(on ? filtros.filter((x) => x !== k) : [...filtros, k])}><i />{r}</button>); })}</div>
          <div className="mes">{['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => <span key={d} className="dsem">{d}</span>)}
            {Array.from({ length: pad }, (_, k) => <span key={'p' + k} />)}
            {Array.from({ length: nDias }, (_, k) => { const d = `${mes}-${String(k + 1).padStart(2, '0')}`; const es = doMes.filter((e) => e.data === d);
              return <button key={d} className={`dia ${d === hj ? 'hoje' : ''} ${d === dia ? 'sel' : ''}`} onClick={() => setDia(d)}>
                <span className="n">{k + 1}</span><span className="pontos">{es.slice(0, 4).map((e, j) => <i key={j} style={{ background: cor(e.tipo) }} />)}{es.length > 4 && <small>+{es.length - 4}</small>}</span></button>; })}
          </div>
        </div>
        <div>
          <div className="cartao">
            <div className="cabeca"><h2>{dia ? new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Escolha um dia'}</h2></div>
            {dia ? (doDia.length ? <ul className="lista-evt">{doDia.map((e, k) => (
              <li key={k} style={{ '--cor-col': cor(e.tipo) }}><button onClick={() => abrir(...e.abrir)}><i />{e.txt}{e.valor ? <b>{brl(e.valor)}</b> : null}</button>
                <a className="ico" href={linkGoogle(e)} target="_blank" rel="noopener noreferrer" title="Adicionar ao Google Agenda" aria-label="Adicionar ao Google Agenda"><Ico n="externo" /></a></li>))}</ul>
              : <div className="vazio">Nada neste dia.</div>) : <div className="vazio">Clique num dia para ver o que tem.</div>}
          </div>
          <div className="cartao">
            <div className="cabeca"><h2>Pendências</h2><span className="sub">{pend.length}</span></div>
            {pend.length ? <ul className="lista-evt">{pend.slice(0, 10).map((e, k) => (
              <li key={k} style={{ '--cor-col': cor(e.tipo) }}><button onClick={() => abrir(...e.abrir)}><i />{dbr(e.data).slice(0, 5)} · {e.txt}{e.valor ? <b>{brl(e.valor)}</b> : null}</button></li>))}</ul>
              : <div className="vazio">Nada atrasado.</div>}
          </div>
          <span className="dica">Cada evento tem o botão de levar para o Google Agenda, e o mês inteiro sai em arquivo .ics que o Google, o Outlook e o iPhone importam. Sincronizar sozinho com o Google pede login do Google e fica para a v4.</span>
        </div>
      </div>
    </>
  );
}

/* ===================== RELATÓRIOS: GANHO POR CANAL E METAS ===================== */
function RelCanais({ ctx, vendas, periodo }) {
  const vs = vendasValidas(vendas, periodo);
  const m = {}; for (const v of vs) { const k = v.comissao_pct != null ? 'Consignação' : ctx.canais.find((c) => c.id === v.canal_id)?.nome || 'Sem canal';
    const x = m[k] || (m[k] = { canal: k, n: 0, fat: 0, taxas: 0, custo: 0, lucro: 0 }); x.n++; x.fat += nn(v.total); x.taxas += taxasDe(v); x.custo += nn(v.custo_total); x.lucro += nn(v.lucro); }
  const ls = Object.values(m).map((x) => ({ ...x, margem: x.fat ? x.lucro / x.fat : NaN, porPedido: x.n ? x.lucro / x.n : 0, taxaPct: x.fat ? x.taxas / x.fat : NaN })).sort((a, b) => b.lucro - a.lucro);
  const melhor = ls.filter((l) => l.n >= 1).sort((a, b) => b.margem - a.margem)[0];
  return (
    <>
      <div className="numeros tres">
        <div className="n cor-verde"><span className="rot">Canal que mais dá lucro</span><b>{ls[0]?.canal || 'nenhum'}</b><span className="sub">{ls[0] ? brl(ls[0].lucro) : 'sem vendas'}</span></div>
        <div className="n cor-azul"><span className="rot">Melhor margem</span><b>{melhor?.canal || 'nenhum'}</b><span className="sub">{melhor ? pctTxt(melhor.margem) : ''}</span></div>
        <div className="n cor-coral"><span className="rot">Pago em taxas</span><b>{brl(ls.reduce((a, l) => a + l.taxas, 0))}</b><span className="sub">canal, pagamento e imposto</span></div>
      </div>
      <div className="cartao"><div className="cabeca"><h2>Lucro por canal</h2></div>{ls.length ? <Barras itens={ls.map((l) => ({ r: l.canal, v: l.lucro }))} /> : <div className="vazio">Nenhuma venda no período.</div>}</div>
      <TabRel titulo="Ganho por canal" arquivo="ganho-por-canal" linhas={ls}
        cols={[['Canal', 'canal', 'txt'], ['Vendas', 'n', 'n'], ['Faturamento', 'fat', 'brl'], ['Taxas', 'taxas', 'brl'], ['% em taxa', 'taxaPct', 'pct'], ['Custo', 'custo', 'brl'], ['Lucro', 'lucro', 'brl'], ['Margem', 'margem', 'pct'], ['Lucro por pedido', 'porPedido', 'brl']]} />
    </>
  );
}
function RelMetas({ ctx, vendas }) {
  const metas = ctx.params.metas || {}; const set = (k, v) => ctx.setParams({ ...ctx.params, metas: { ...metas, [k]: v === '' ? '' : Number(v) } });
  const h = new Date(), ym = hoje().slice(0, 7), dias = new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate(), passou = h.getDate();
  const doMes = (y) => vendas.filter((v) => v.status !== 'cancelada' && (v.data || '').startsWith(y));
  const real = (y) => { const vs = doMes(y); return { fat: vs.reduce((a, v) => a + nn(v.total), 0), lucro: vs.reduce((a, v) => a + nn(v.lucro), 0), n: vs.length, pecas: vs.reduce((a, v) => a + (v.itens || []).reduce((b, i) => b + nn(i.qtd), 0), 0) }; };
  const r = real(ym);
  const linhas = [['fat', 'Faturamento', brl], ['lucro', 'Lucro', brl], ['n', 'Vendas', (x) => String(Math.round(x))], ['pecas', 'Peças vendidas', (x) => String(Math.round(x))]];
  const hist = Array.from({ length: 6 }, (_, k) => { const d = new Date(h.getFullYear(), h.getMonth() - 5 + k, 1); const y = ymd(d).slice(0, 7); return { ym: y, ...real(y) }; });
  return (
    <>
      <div className="cartao">
        <div className="cabeca"><h2>Metas do mês</h2><span className="sub">dia {passou} de {dias}</span></div>
        <div className="metas">{linhas.map(([k, rot, f]) => { const meta = nn(metas[k]); const pct = meta ? r[k] / meta : 0; const proj = passou ? r[k] / passou * dias : 0;
          const falta = Math.max(0, meta - r[k]); const porDia = dias - passou > 0 ? falta / (dias - passou) : falta;
          return (
            <div className="meta" key={k}>
              <div className="meta-cab"><b>{rot}</b>
                <div className="campo meta-in">{k === 'fat' || k === 'lucro' ? <span className="pref">R$</span> : null}
                  <input type="number" min="0" placeholder="defina a meta" value={metas[k] ?? ''} aria-label={`Meta de ${rot}`} style={{ paddingLeft: k === 'fat' || k === 'lucro' ? 34 : 10 }} onChange={(e) => set(k, e.target.value)} /></div></div>
              <div className="meta-num"><span>{f(r[k])}</span>{meta ? <span className="sub"> de {f(meta)}</span> : null}</div>
              <div className="progresso"><span className={pct >= 1 ? 'ok' : proj >= meta ? '' : 'curto'} style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
              {meta ? <span className="dica">No ritmo atual fecha o mês em {f(proj)} ({pctTxt(proj / meta)} da meta).{falta > 0 ? ` Faltam ${f(falta)}: ${f(porDia)} por dia.` : ' Meta batida.'}</span>
                : <span className="dica">Sem meta. No ritmo atual o mês fecha em {f(proj)}.</span>}
            </div>); })}</div>
      </div>
      <TabRel titulo="Últimos seis meses contra a meta atual" arquivo="metas-historico" linhas={hist.map((x) => ({ mes: mesCurto(x.ym) + '/' + x.ym.slice(2, 4), fat: x.fat, pf: nn(metas.fat) ? x.fat / nn(metas.fat) : NaN, lucro: x.lucro, pl: nn(metas.lucro) ? x.lucro / nn(metas.lucro) : NaN, n: x.n }))}
        cols={[['Mês', 'mes', 'txt'], ['Faturamento', 'fat', 'brl'], ['da meta', 'pf', 'pct'], ['Lucro', 'lucro', 'brl'], ['da meta', 'pl', 'pct'], ['Vendas', 'n', 'n']]} />
    </>
  );
}

/* ===================== PRIMEIROS PASSOS (tour guiado) ===================== */
function TourPrimeirosPassos({ ctx, orcamentos, vendas, ir, abrir }) {
  if (ctx.params.tour_dispensado) return null;
  const passos = [
    ['calc', 'Ajuste os custos da sua loja', 'Tarifa de luz, sua hora e o regime tributário. É daqui que sai toda conta de preço.', ctx.params.valor_hora_operador !== 25 || ctx.params.tarifa_kwh !== 0.881 || !!ctx.params.regime, 'Abrir configurações', () => ir('config')],
    ['bobina', 'Cadastre seus filamentos', 'Tipo, cor, marca, preço e quantos carretéis tem. Pode importar da sua planilha.', ctx.filamentos.length > 0, 'Cadastrar filamento', () => ctx.pedirFilamento('', () => {})],
    ['calc', 'Precifique uma peça', 'Importe o arquivo do fatiador ou digite gramas e tempo. Ao cadastrar, a peça vira produto no catálogo.', ctx.pecas.length > 0, 'Abrir simulador', () => ir('simulador')],
    ['doc', 'Mande o primeiro orçamento', 'PDF com a sua marca e texto pronto para o WhatsApp.', orcamentos.length > 0, 'Novo orçamento', () => abrir('orcamentos', { novo: true })],
    ['tag', 'Registre a primeira venda', 'A venda entra no a receber, na fila de produção e nos relatórios, sozinha.', vendas.length > 0, 'Registrar venda', () => abrir('vendas', { novo: true })],
  ];
  const feitos = passos.filter((p) => p[3]).length; const atual = passos.findIndex((p) => !p[3]);
  if (feitos === passos.length) return null;
  return (
    <div className="cartao tour">
      <div className="cabeca"><h2>Primeiros passos</h2><span className="selo">tour guiado</span><div className="esp" />
        <button className="link" onClick={() => ctx.setParams({ ...ctx.params, tour_dispensado: true })}>Dispensar</button></div>
      <p className="sub" style={{ margin: '0 0 12px' }}>Cinco passos para a conta do sistema bater com a da sua loja. Pode dispensar a qualquer momento.</p>
      <div className="progresso"><span style={{ width: `${(feitos / passos.length) * 100}%` }} /></div>
      <ol className="passos-tour">{passos.map(([ico, t, d, ok, cta, fn], k) => (
        <li key={t} className={`${ok ? 'ok' : ''} ${k === atual ? 'atual' : ''}`}>
          <span className="num">{ok ? <Ico n="check" s={14} /> : k + 1}</span>
          <div className="txt"><b>{t}</b><span className="sub">{d}</span></div>
          {!ok && <button className={`bt ${k === atual ? 'forte' : ''}`} onClick={fn}>{cta}</button>}
        </li>))}</ol>
      <div className="conheca"><span className="sub">Conheça também:</span>
        {[['funil', 'Funil de vendas', 'funil'], ['producao', 'Fila de produção', 'fila'], ['cad-kits', 'Kits', 'caixa'], ['consignacao', 'Consignação', 'loja'], ['rel-canais', 'Ganho por canal', 'grafico']].map(([d, r, i]) => (
          <button key={d} className="link" onClick={() => ir(d)}><Ico n={i} s={14} /> {r}</button>))}</div>
    </div>
  );
}

/* ===================== cores por marca (hex é referência: tela não é filamento) ===================== */
const CORES_GENERICAS = [['Branco', '#F4F4F2'], ['Preto', '#1E1E1E'], ['Cinza', '#8A8F96'], ['Prata', '#B8BCC2'], ['Vermelho', '#C62828'], ['Laranja', '#F28C28'],
  ['Amarelo', '#F2C200'], ['Dourado', '#C9A227'], ['Verde', '#2E7D32'], ['Verde água', '#3FBFAD'], ['Azul', '#1565C0'], ['Azul bebê', '#9CCBEF'], ['Roxo', '#6A1B9A'],
  ['Lilás', '#B39DDB'], ['Rosa', '#E91E63'], ['Rosa bebê', '#F6C6D6'], ['Marrom', '#6D4C41'], ['Bege', '#D7C4A3'], ['Transparente', '#DDE7EE'], ['Natural', '#E8E2D0']];
/* [CONFIRMAR] Bambu Lab PLA Basic e Matte: nomes e hex de referência, a conferir com o catálogo oficial */
const CORES_MARCA = {
  'Bambu Lab': [['Jade White', '#FFFFFF'], ['Beige', '#F7E6DE'], ['Light Gray', '#D1D3D5'], ['Gray', '#8E9089'], ['Silver', '#A6A9AA'], ['Black', '#000000'],
    ['Red', '#C12E1F'], ['Maroon Red', '#9D2235'], ['Magenta', '#EC008C'], ['Hot Pink', '#F5547C'], ['Pink', '#F55A74'], ['Orange', '#FF6A13'], ['Pumpkin Orange', '#FF9016'],
    ['Sunflower Yellow', '#FEC600'], ['Yellow', '#F4EE2A'], ['Gold', '#E4BD68'], ['Bronze', '#847D48'], ['Brown', '#9D432C'], ['Cocoa Brown', '#6F5034'],
    ['Bambu Green', '#00AE42'], ['Mistletoe Green', '#3F8E43'], ['Turquoise', '#00B1B7'], ['Cyan', '#0086D6'], ['Cobalt Blue', '#0055B8'], ['Blue', '#0A2989'],
    ['Blue Grey', '#5B6579'], ['Purple', '#5E43B7'], ['Indigo Purple', '#482960'],
    ['Ivory White (Matte)', '#FFFFFF'], ['Charcoal (Matte)', '#000000'], ['Ash Gray (Matte)', '#9B9EA0'], ['Latte Brown (Matte)', '#D3B7A7'], ['Desert Tan (Matte)', '#E8DBB7'],
    ['Lilac Purple (Matte)', '#AE96D4'], ['Sakura Pink (Matte)', '#E8AFCF'], ['Mandarin Orange (Matte)', '#F99963'], ['Lemon Yellow (Matte)', '#F7D959'],
    ['Grass Green (Matte)', '#61C680'], ['Ice Blue (Matte)', '#A3D8E1'], ['Marine Blue (Matte)', '#0078BF'], ['Scarlet Red (Matte)', '#DE4343'], ['Dark Green (Matte)', '#68724D']],
};
const coresDaMarca = (m) => CORES_MARCA[m] || CORES_GENERICAS;

/* ===================== FAIXAS DE TAXA POR CANAL ===================== */
function FaixasEditor({ ctx }) {
  const muda = (id, faixas) => ctx.setCanais(ctx.canais.map((c) => (c.id === id ? { ...c, faixas } : c)));
  return (
    <div className="faixas">
      <div className="cabeca" style={{ marginTop: 18 }}><h3>Taxa por faixa de preço</h3><span className="sub">Shopee e TikTok cobram diferente conforme o preço da peça</span></div>
      {ctx.canais.map((c) => { const fx = c.faixas || []; return (
        <div key={c.id} className="faixa-canal">
          <label className="opcao-linha"><Check on={fx.length > 0} rot={`Faixas em ${c.nome}`} onClick={() => muda(c.id, fx.length ? [] : [{ ate: 79.99, taxa_pct: c.taxa_pct, taxa_fixa: c.taxa_fixa }, { ate: 999999, taxa_pct: c.taxa_pct, taxa_fixa: c.taxa_fixa }])} />
            <b>{c.nome}</b><span className="sub">{fx.length ? `${fx.length} faixas` : taxaTxt(c)}</span></label>
          {fx.length > 0 && <div className="faixa-linhas">{fx.map((f, k) => (
            <div key={k} className="faixa-linha">
              <span className="sub">{k === 0 ? 'até' : `de ${brl(nn(fx[k - 1].ate) + 0.01)} até`}</span>
              <div className="campo"><span className="pref">R$</span><input type="number" step="0.01" value={nn(f.ate) >= 999999 ? '' : f.ate} placeholder="sem limite" aria-label="Até"
                onChange={(e) => muda(c.id, fx.map((x, j) => (j === k ? { ...x, ate: e.target.value === '' ? 999999 : Number(e.target.value) } : x)))} /></div>
              <div className="campo pc"><input type="number" step="0.1" value={Math.round(nn(f.taxa_pct) * 10000) / 100} aria-label="Comissão"
                onChange={(e) => muda(c.id, fx.map((x, j) => (j === k ? { ...x, taxa_pct: nn(e.target.value) / 100 } : x)))} /><span className="sufx">%</span></div>
              <div className="campo"><span className="pref">R$</span><input type="number" step="0.01" value={f.taxa_fixa} aria-label="Taxa fixa"
                onChange={(e) => muda(c.id, fx.map((x, j) => (j === k ? { ...x, taxa_fixa: nn(e.target.value) } : x)))} /></div>
              <button className="ico perigo" aria-label="Tirar faixa" onClick={() => muda(c.id, fx.filter((_, j) => j !== k))}><Ico n="x" /></button>
            </div>))}
            <button className="bt mini" onClick={() => muda(c.id, [...fx, { ate: 999999, taxa_pct: c.taxa_pct, taxa_fixa: c.taxa_fixa }])}><Ico n="mais" s={13} /> Faixa</button></div>}
        </div>); })}
      <span className="dica">Taxas de referência de 09/2026, publicadas pelas próprias plataformas ou por quem acompanha o mercado. Confira na central do vendedor antes de fechar preço.</span>
    </div>
  );
}

/* ===================== EMPRESA E REGIME ===================== */
const REGIMES = [
  ['pf', 'Pessoa física, sem CNPJ', 0, 'Sem imposto na venda pelo sistema. Declare a renda no carnê-leão.'],
  ['mei', 'MEI', 0, 'Paga o DAS fixo por mês, sem percentual por peça. Teto anual de faturamento.'],
  ['simples1', 'Simples · Anexo I (comércio)', 0.04, 'Alíquota inicial. Sobe com o faturamento dos últimos 12 meses.'],
  ['simples2', 'Simples · Anexo II (indústria)', 0.045, 'Alíquota inicial. Sobe com o faturamento dos últimos 12 meses.'],
  ['simples3', 'Simples · Anexo III (serviço)', 0.06, 'Alíquota inicial. Serve para peça sob encomenda tratada como serviço.'],
  ['presumido', 'Lucro presumido', null, 'Informe a alíquota que o contador calculou.'], ['real', 'Lucro real', null, 'Informe a alíquota que o contador calculou.'],
];
function SecaoEmpresa({ ctx }) {
  const { empresa, setEmpresa } = ctx; const set = (k, v) => setEmpresa({ ...empresa, [k]: v });
  const [cepMsg, setCepMsg] = useState('');
  const cep = async (v) => { const d = String(v).replace(/\D/g, ''); if (d.length !== 8) return;
    try { const r = await fetch(`https://viacep.com.br/ws/${d}/json/`); const j = await r.json(); if (j.erro) throw 0;
      setEmpresa({ ...empresa, cep: v, rua: j.logradouro, bairro: j.bairro, cidade: [j.localidade, j.uf].filter(Boolean).join(', ') }); setCepMsg(''); } catch (e) { setCepMsg('Não achei o CEP. Preencha à mão.'); } };
  const campo = (k, rot, extra = {}) => <div className={extra.cls || ''}><label htmlFor={`em-${k}`}>{rot}</label><input id={`em-${k}`} value={empresa[k] || ''} placeholder={extra.ph || ''}
    type={extra.type || 'text'} onChange={(e) => set(k, e.target.value)} onBlur={extra.blur} /></div>;
  const cor = empresa.cor_destaque || '#1087D1';
  return (
    <div className="empresa">
      <div className="bloco-form"><h3>Identificação</h3>
        <div className="grade dois">{campo('nome', 'Nome fantasia', { cls: 'span-todo' })}{campo('marca', 'Marca nos anúncios', { ph: empresa.nome || 'a mesma do nome' })}{campo('razao', 'Razão social')}{campo('cnpj', 'CNPJ ou CPF')}</div></div>
      <div className="bloco-form"><h3>Contato</h3>
        <div className="grade dois">{campo('whatsapp', 'WhatsApp', { ph: '(21) 99999-0000' })}{campo('email', 'E-mail', { type: 'email' })}{campo('instagram', 'Instagram', { ph: '@sualoja' })}{campo('site', 'Site', { ph: 'www.' })}</div></div>
      <div className="bloco-form"><h3>Endereço</h3>
        <div className="grade dois"><div><label htmlFor="em-cep">CEP</label><input id="em-cep" value={empresa.cep || ''} onChange={(e) => set('cep', e.target.value)} onBlur={(e) => cep(e.target.value)} />{cepMsg && <span className="dica">{cepMsg}</span>}</div>
          {campo('cidade', 'Cidade e UF')}{campo('rua', 'Rua e número', { cls: 'span-todo' })}{campo('bairro', 'Bairro')}{campo('pix', 'Chave PIX')}</div></div>
      <div className="bloco-form"><h3>Marca no orçamento</h3>
        <div className="grade dois">
          <FotoCampo valor={ctx.logoUrl} rotulo="Logo" formato="image/png" onMuda={(v) => (v ? ctx.enviarLogoData(v) : ctx.removerLogo())} />
          <div><label>Cor de destaque do PDF</label>
            <div className="cor-destaque">{['#1087D1', '#0C2130', '#2E9E6B', '#E05555', '#F2A516', '#8B7CF6', '#EC5B9B', '#1E1E1E'].map((h) => (
              <button key={h} type="button" aria-label={`Usar ${h}`} className={cor.toLowerCase() === h.toLowerCase() ? 'on' : ''} style={{ background: h }} onClick={() => set('cor_destaque', h)} />))}
              <label className="outra-cor" title="Outra cor"><input type="color" value={cor} onChange={(e) => set('cor_destaque', e.target.value)} /><Ico n="mais" s={14} /></label></div>
            <span className="dica">A cor da sua marca vai no topo, no total e nos títulos do orçamento.</span></div>
        </div>
        <div className="previa-orc" style={{ '--acc': cor }}>
          <div className="po-topo">{ctx.logoUrl ? <img src={ctx.logoUrl} alt="" /> : <b>{empresa.nome || 'Sua empresa'}</b>}<div className="esp" /><span className="po-tag">ORÇAMENTO Nº 12</span></div>
          <div className="po-linhas"><span /><span /><span /></div>
          <div className="po-total"><span>Total</span><b>R$ 120,00</b></div>
        </div>
      </div>
    </div>
  );
}
function SecaoRegime({ ctx, vendas }) {
  const r = ctx.params.regime || { tipo: 'mei' }; const reg = REGIMES.find((x) => x[0] === r.tipo) || REGIMES[1];
  const set = (x) => ctx.setParams({ ...ctx.params, regime: { ...r, ...x }, imposto_pct: x.tipo ? (REGIMES.find((y) => y[0] === x.tipo)[2] ?? ctx.params.imposto_pct) : ctx.params.imposto_pct });
  const ano = ymd(new Date(Date.now() - 365 * 864e5));
  const fat12 = vendas.filter((v) => v.status !== 'cancelada' && (v.data || '') >= ano).reduce((a, v) => a + nn(v.total), 0);
  const teto = nn(r.teto || (r.tipo === 'mei' ? 81000 : r.tipo.startsWith('simples') ? 4800000 : 0));
  return (
    <div>
      <div className="grade dois">
        <Escolha id="rg-t" rotulo="Regime" valor={r.tipo} itens={REGIMES.map(([id, nome]) => ({ id, nome }))} onEscolher={(x) => set({ tipo: x.id })} />
        <CampoPct id="rg-a" rot="Imposto por venda" fracao={ctx.params.imposto_pct} onChange={(v) => ctx.setParams({ ...ctx.params, imposto_pct: v })} dica={reg[3]} />
        {r.tipo === 'mei' && <CampoMoeda id="rg-das" rot="DAS mensal" valor={r.das ?? ''} onChange={(v) => set({ das: v })} dica="[CONFIRMAR] valor de 2026 na guia do MEI. Entra no financeiro como conta fixa." />}
        {teto > 0 && <CampoMoeda id="rg-teto" rot="Teto anual" valor={r.teto ?? teto} onChange={(v) => set({ teto: v })} dica={r.tipo === 'mei' ? '[CONFIRMAR] teto do MEI em 2026.' : 'Limite do Simples.'} />}
      </div>
      {teto > 0 && <div className="teto">
        <div className="meta-num"><span>{brl(fat12)}</span><span className="sub"> faturados nos últimos 12 meses, {pctTxt(fat12 / teto)} do teto</span></div>
        <div className="progresso"><span className={fat12 / teto > 0.8 ? 'curto' : ''} style={{ width: `${Math.min(100, (fat12 / teto) * 100)}%` }} /></div>
        {fat12 / teto > 0.8 && <div className="aviso ruim" style={{ marginTop: 10 }}>Passou de 80% do teto. Fale com o contador antes de estourar.</div>}
      </div>}
      <span className="dica">Alíquotas de referência. Confirme o enquadramento e a alíquota com o seu contador.</span>
    </div>
  );
}

/* ===================== PDF DO ORÇAMENTO ===================== */
function corTexto(hex) { const h = String(hex || '#1087D1').replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0C2130' : '#FFFFFF'; }
function folhaOrcamento(d) {
  const { numero, cliente, itens, bruto, desconto, total, validade, obs, empresa, logoUrl, prazo, formas, entrega } = d;
  const acc = empresa.cor_destaque || '#1087D1', tx = corTexto(acc);
  const h0 = new Date(), venc = new Date(h0.getTime() + (Number(validade) || 7) * 864e5), dt = (x) => x.toLocaleDateString('pt-BR');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const contato = [empresa.whatsapp, empresa.email, empresa.instagram, empresa.site].filter(Boolean).map(esc).join(' · ');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento ${numero || ''} · ${esc(empresa.nome)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,400..800&display=swap" rel="stylesheet"><style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font:12.5px/1.5 Archivo,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#0C2130;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.folha{width:210mm;min-height:297mm;padding:0 0 18mm;position:relative;margin:0 auto;background:#fff}
.faixa{height:8mm;background:${acc}}
.topo{display:flex;align-items:center;gap:16px;padding:12mm 16mm 8mm}.topo img{max-height:54px;max-width:220px}.topo .nome{font-size:22px;font-weight:800;letter-spacing:-.01em}
.topo .doc{margin-left:auto;text-align:right}.topo .doc .t{font-size:11px;letter-spacing:.14em;color:${acc};font-weight:700}.topo .doc .n{font-size:26px;font-weight:800;font-variation-settings:'wdth' 85;line-height:1}
.topo .doc .d{font-size:11px;color:#41627A;margin-top:4px}
.cards{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;padding:0 16mm}.card{border:1px solid #D8E4EC;border-radius:8px;padding:12px 14px}
.card .r{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#6B7F8E;font-weight:700}.card .v{font-size:14px;font-weight:700;margin-top:4px}.card .s{font-size:11px;color:#41627A}
.card.total{background:${acc};border-color:${acc};color:${tx}}.card.total .r{color:${tx};opacity:.8}.card.total .v{font-size:24px;font-variation-settings:'wdth' 85}
h2{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${acc};margin:22px 16mm 8px;font-weight:800}
table{width:calc(100% - 32mm);margin:0 16mm;border-collapse:collapse}th{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#6B7F8E;text-align:left;padding:8px 10px;border-bottom:2px solid #0C2130}
td{padding:11px 10px;border-bottom:1px solid #EBF1F5;vertical-align:top}tr:nth-child(even) td{background:#F7FAFC}td.n,th.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.tot{margin:12px 16mm 0 auto;width:74mm}.tot div{display:flex;justify-content:space-between;padding:4px 10px}.tot .fim{margin-top:6px;padding:10px;background:#F7FAFC;border-left:4px solid ${acc};font-size:17px;font-weight:800}
.cond{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16mm}.cond .card{font-size:12px}.obs{white-space:pre-wrap}
ul{margin:0;padding-left:16px}li{margin:2px 0}
.rodape{position:absolute;left:16mm;right:16mm;bottom:8mm;display:flex;justify-content:space-between;font-size:10px;color:#6B7F8E;border-top:1px solid #D8E4EC;padding-top:8px}
@media screen{body{background:#EBF1F5}.folha{margin:20px auto;box-shadow:0 0 0 1px #D8E4EC}}
</style></head><body><div class="folha">
<div class="faixa"></div>
<div class="topo">${logoUrl && empresa.usarLogo !== false ? `<img src="${logoUrl}" alt="${esc(empresa.nome)}">` : `<div class="nome">${esc(empresa.nome)}</div>`}
  <div class="doc"><div class="t">ORÇAMENTO</div><div class="n">${numero ? 'Nº ' + numero : 'Proposta'}</div><div class="d">Emitido em ${dt(h0)} · válido até ${dt(venc)}</div></div></div>
<div class="cards">
  <div class="card"><div class="r">Cliente</div><div class="v">${cliente ? esc(cliente.nome) : 'A definir'}</div><div class="s">${cliente ? [cliente.whatsapp, cliente.email].filter(Boolean).map(esc).join(' · ') : ''}</div></div>
  <div class="card"><div class="r">Prazo de produção</div><div class="v">${esc(prazo || 'a combinar')}</div><div class="s">${entrega ? 'entrega em ' + dt(new Date(entrega + 'T12:00:00')) : 'a partir da aprovação'}</div></div>
  <div class="card total"><div class="r">Valor total</div><div class="v">${brl(total)}</div></div>
</div>
<h2>O que está incluído</h2>
<table><thead><tr><th>Descrição</th><th class="n">Qtd</th><th class="n">Unitário</th><th class="n">Subtotal</th></tr></thead>
<tbody>${itens.map((i) => `<tr><td><b>${esc(i.descricao)}</b></td><td class="n">${i.qtd}</td><td class="n">${brl(i.preco_unit)}</td><td class="n">${brl(i.qtd * i.preco_unit)}</td></tr>`).join('')}</tbody></table>
<div class="tot"><div><span>Subtotal</span><span>${brl(bruto)}</span></div>${desconto > 0 ? `<div><span>Desconto</span><span>− ${brl(desconto)}</span></div>` : ''}<div class="fim"><span>Total</span><span>${brl(total)}</span></div></div>
<h2>Condições</h2>
<div class="cond">
  <div class="card"><div class="r">Pagamento</div><div class="v" style="font-size:13px">${(formas && formas.length) ? formas.map((f) => esc(f.nome)).join(', ') : 'a combinar'}</div>
    ${empresa.pix && formas && formas.some((f) => /pix/i.test(f.nome)) ? `<div class="s">Chave PIX: ${esc(empresa.pix)}</div>` : ''}</div>
  <div class="card"><div class="r">Validade</div><div class="v" style="font-size:13px">${Number(validade) || 7} dias, até ${dt(venc)}</div><div class="s">A produção começa depois da aprovação.</div></div>
</div>
${obs ? `<h2>Observações</h2><div class="cond" style="grid-template-columns:1fr"><div class="card obs">${esc(obs)}</div></div>` : ''}
<div class="rodape"><span>${esc(empresa.nome)}${empresa.cnpj ? ' · ' + esc(empresa.cnpj) : ''}</span><span>${contato}</span></div>
</div></body></html>`;
}

/* ===================== ANÚNCIOS: dados de cadastro por marketplace ===================== */
const MKTS = {
  shopee: { nome: 'Shopee', titulo: 120, desc: 5000, emoji: true, marca: 'Sem marca' },
  ml: { nome: 'Mercado Livre', titulo: 60, desc: 50000, emoji: false, marca: '' },
  amazon: { nome: 'Amazon', titulo: 200, desc: 2000, emoji: false, marca: '', bullets: true },
  tiktok: { nome: 'TikTok Shop', titulo: 255, desc: 10000, emoji: true, marca: '' },
  direto: { nome: 'Instagram, WhatsApp e site', titulo: 0, desc: 2200, emoji: true, marca: '' },
};
const tipoMkt = (nome) => (/shopee/i.test(nome) ? 'shopee' : /mercado ?livre/i.test(nome) ? 'ml' : /amazon/i.test(nome) ? 'amazon' : /tiktok/i.test(nome) ? 'tiktok' : 'direto');
const NCMS = [['39264000', '3926.40.00 · objeto de ornamentação, estatueta, enfeite'], ['39269090', '3926.90.90 · chaveiro e outras obras de plástico'], ['95051000', '9505.10.00 · artigo de Natal'], ['95059000', '9505.90.00 · artigo de festa']];
function descricaoGerada(prod, ctx, mk, c) {
  const a = prod.anuncio || {}; const m = prod.medidas || {}; const e = MKTS[mk].emoji;
  const cores = [...new Set((prod.tec?.fils || []).map((f) => { const fl = acharFilDaLinha(ctx, f); return fl ? fl.cor : null; }).filter(Boolean))];
  const mats = [...new Set((prod.tec?.fils || []).map((f) => ctx.materiais.find((x) => x.id === f.material_id)?.nome).filter(Boolean))];
  const L = [];
  L.push((e ? '✨ ' : '') + (a.abertura || `${prod.nome}, feito em impressão 3D.`));
  if (a.variacoes) L.push(a.variacoes);
  L.push('', (e ? '📦 ' : '') + 'O QUE VEM NO PEDIDO', a.vem || `1 ${prod.nome}`);
  L.push('', (e ? '📏 ' : '') + 'FICHA TÉCNICA', `Material: ${mats.join(', ') || 'PLA'}`);
  if (m.c || m.l || m.a) L.push(`Medidas: ${[m.c, m.l, m.a].filter(Boolean).join(' x ')} cm`);
  L.push(`Peso: ${Math.ceil(nn(m.peso_peca) || c.gramas_unit)} g`);
  if (cores.length) L.push(`Cores: ${cores.join(', ')}`);
  L.push('Acabamento: as linhas finas na superfície fazem parte do processo de impressão 3D.', `Postagem em até ${a.prazo_dias || 3} dias úteis.`);
  L.push('', (e ? '🧼 ' : '') + 'CUIDADOS', 'Limpe com pano seco. O PLA deforma no sol e dentro do carro.' + (a.pequena ? ' Não é brinquedo. Não indicado para menores de 3 anos.' : ''));
  if (a.faq) L.push('', (e ? '💬 ' : '') + 'PERGUNTAS FREQUENTES', a.faq);
  if (e && a.hashtags) L.push('', a.hashtags);
  return L.join('\n');
}
/* ===================== v3.7 · estimativa de projeto não fatiado ===================== */
/* Sem fatiar não há peso nem tempo no arquivo. Estima pela malha: volume, área, paredes e preenchimento do projeto.
   Pintura por região divide só a casca, pela área pintada de cada cor. Tempo sai do ritmo da impressora (g/h). */
async function estimarPlaca(zip, idx, cfgTxt, msTxt) {
  let d = {}; try { d = JSON.parse(cfgTxt); } catch (e) { /* segue com padrão */ }
  const infill = (parseFloat(d.sparse_infill_density) || 15) / 100, paredes = parseInt(d.wall_loops, 10) || 2, linha = 0.042;
  const blocos = String(msTxt || '').split('<plate>').slice(1); const bloco = blocos[idx] || blocos[0] || '';
  let ids = [...bloco.matchAll(/key="object_id" value="(\d+)"/g)].map((m) => m[1]);
  const extr = {}; for (const m of String(msTxt || '').matchAll(/<object id="(\d+)">([\s\S]*?)<\/object>/g)) { const e = m[2].match(/key="extruder" value="(\d+)"/); extr[m[1]] = e ? +e[1] : 1; }
  const principal = await zip.texto(/^3D\/3dmodel\.model$/i); if (!principal) return null;
  if (!ids.length) ids = [...principal.matchAll(/<item objectid="(\d+)"/g)].map((m) => m[1]);
  const arquivos = { '3D/3dmodel.model': principal };
  const achaObjeto = async (id, caminho) => {
    const cam = (caminho || '3D/3dmodel.model').replace(/^\//, '');
    if (!arquivos[cam]) { const esc = cam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); arquivos[cam] = (await zip.texto(new RegExp('^' + esc + '$'))) || ''; }
    const m = arquivos[cam].match(new RegExp('<object id="' + id + '"[^>]*>([\\s\\S]*?)</object>')); return m ? m[1] : '';
  };
  const por = {}; let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  const malha = (corpo, base) => {
    const vs = []; for (const m of corpo.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)) { const v = [+m[1], +m[2], +m[3]]; vs.push(v); for (let k = 0; k < 3; k++) { if (v[k] < min[k]) min[k] = v[k]; if (v[k] > max[k]) max[k] = v[k]; } }
    let V = 0, A = 0; const areaCor = {};
    for (const m of corpo.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"([^>]*)>/g)) {
      const p = vs[+m[1]], q = vs[+m[2]], r = vs[+m[3]]; if (!p || !q || !r) continue;
      V += (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
      const a = Math.sqrt((uy * vz - uz * vy) ** 2 + (uz * vx - ux * vz) ** 2 + (ux * vy - uy * vx) ** 2) / 2; A += a;
      const pc = (m[4].match(/paint_color="([0-9A-Fa-f]+)"/) || [])[1];
      if (pc) { const st = pc.length === 1 ? parseInt(pc, 16) >> 2 : pc.length === 2 && /c$/i.test(pc) ? 3 + parseInt(pc[0], 16) : 0; if (st > 0) areaCor[st] = (areaCor[st] || 0) + a; }
    }
    const vol = Math.abs(V) / 1000, area = A / 100, casca = Math.min(vol, area * paredes * linha), miolo = Math.max(0, vol - casca) * infill;
    const pint = Object.values(areaCor).reduce((x, y) => x + y, 0);
    por[base] = (por[base] || 0) + miolo + casca * (A ? 1 - pint / A : 1);
    for (const [st, a] of Object.entries(areaCor)) por[st] = (por[st] || 0) + casca * a / A;
  };
  for (const id of ids) {
    const corpo = await achaObjeto(id); const base = extr[id] || 1;
    if (corpo.includes('<mesh')) malha(corpo, base);
    for (const c of corpo.matchAll(/<component[^>]*objectid="(\d+)"[^>]*?(?:p:path="([^"]+)")?[^>]*\/>/g)) {
      const caminho = (c[0].match(/p:path="([^"]+)"/) || [])[1]; const sub = await achaObjeto(c[1], caminho); if (sub.includes('<mesh')) malha(sub, base);
    }
  }
  const dens = (slot) => { const t = String((d.filament_type || [])[slot - 1] || 'PLA').toUpperCase(); return /PETG/.test(t) ? 1.27 : /ABS/.test(t) ? 1.04 : /ASA/.test(t) ? 1.07 : /TPU/.test(t) ? 1.21 : /PA|NYLON/.test(t) ? 1.14 : 1.24; };
  const gramas = {}; for (const [s, cm3] of Object.entries(por)) gramas[s] = Math.round(cm3 * dens(+s) * 10) / 10;
  const total = Object.values(gramas).reduce((a, b) => a + b, 0);
  return total > 0 ? { gramas, total, dim: min[0] < 1e8 ? { c: r2((max[0] - min[0]) / 10), l: r2((max[1] - min[1]) / 10), a: r2((max[2] - min[2]) / 10) } : null, infill, paredes } : null;
}

/* ===================== v3.7 · o sistema preenche, a pessoa só ajusta ===================== */
const TIPOS_PRODUTO = [
  ['Chaveiro', /chaveir|keychain|key ?ring|portachiavi|llavero/i, '39269090', 'Hobbies e Coleções › Souvenirs › Chaveiros'],
  ['Cesto organizador', /cest|basket|\bbin\b|scivol|papelera|cubo/i, '39264000', ''], ['Vaso', /vas[oe]|\bpot\b|planter|maceta/i, '39264000', ''],
  ['Luminária', /lumin|lamp|light/i, '94054900', ''], ['Topo de bolo', /topo|cake topper/i, '95059000', ''],
  ['Enfeite de Natal', /natal|christmas|xmas/i, '95051000', ''], ['Suporte', /suporte|stand|holder|support/i, '39269090', ''],
  ['Organizador', /organiz/i, '39264000', ''], ['Placa decorativa', /placa|sign|plaque/i, '39264000', ''],
  ['Ímã de geladeira', /ima de gel|fridge magnet|magnet/i, '39269090', ''], ['Boneco colecionável', /figure|boneco|action|miniatur/i, '39264000', ''],
];
const MARCAS_TERCEIROS = /kirby|pok[eé]mon|pikachu|mario|luigi|nintendo|zelda|disney|marvel|stitch|mickey|minnie|hello kitty|harry potter|star wars|minecraft|sonic|naruto|one piece|barbie|batman|superman|spider|homem.aranha|dragon ball|goku|pixar|toy story|frozen|peppa|patrulha canina|paw patrol|lego|sanrio|snoopy|bluey|roblox|fortnite/i;
const tipoDoNome = (t) => (TIPOS_PRODUTO.find((x) => x[1].test(t || '')) || ['Peça decorativa', null, '39264000', '']);
const SIGLA = (ctx) => (ctx.params.sku?.sigla || (ctx.empresa.nome || 'M3L').normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase();
function gerarSku(nome, ctx, ignorarId) {
  const padrao = ctx.params.sku?.padrao || '{SIGLA}-{PROD}{SEQ}';
  const prod = semAcento(nome || 'peca').replace(/[^a-z ]/g, '').split(' ').filter((w) => w.length > 2 && !['com', 'para', 'the', 'and', 'del', 'per'].includes(w))
    .map((w) => w.toUpperCase()).join('').slice(0, 4).padEnd(4, 'X');
  const base = padrao.replace('{SIGLA}', SIGLA(ctx)).replace('{PROD}', prod);
  let seq = 1; const usados = new Set(ctx.pecas.filter((p) => p.id !== ignorarId).map((p) => p.sku));
  while (usados.has(base.replace('{SEQ}', String(seq).padStart(2, '0')))) seq++;
  return base.replace('{SEQ}', String(seq).padStart(2, '0'));
}
function explicarSku(sku, ctx) {
  const padrao = ctx.params.sku?.padrao || '{SIGLA}-{PROD}{SEQ}';
  const sig = SIGLA(ctx); const m = String(sku || '').match(new RegExp('^' + sig + '-([A-Z]{4})(\\d{2})$'));
  if (!m) return `Padrão ${padrao}.`;
  return `Padrão ${padrao}: ${sig} é a sigla da loja, ${m[1]} são as 4 primeiras letras do nome e ${m[2]} é a sequência, para não repetir. Variação de cor e quantidade entra no fim, como ${sku}-RS03.`;
}
const USOS_POR_TIPO = { 'Chaveiro': ['Enfeite Bolsa Mochila', 'Chave'], 'Vaso': ['Decoração Casa', 'Sala Escritório'], 'Cesto organizador': ['Organizador Mesa', 'Escritório'],
  'Luminária': ['Decoração Quarto', 'Abajur'], 'Suporte': ['Mesa Escritório', 'Organização'], 'Organizador': ['Mesa Escritório', 'Gaveta'], 'Placa decorativa': ['Decoração Parede', 'Porta'],
  'Ímã de geladeira': ['Decoração Cozinha', 'Geladeira'], 'Boneco colecionável': ['Decoração Estante', 'Coleção'], 'Topo de bolo': ['Festa', 'Bolo'] };
const PROIBIDAS_TITULO = /\b(lembrancinhas?|natal|pascoa|páscoa|dia das maes|dia das mães|dia dos pais|namorados|black friday|promo[cç][aã]o|frete|gr[aá]tis|oferta)\b/gi;
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'ou', 'com', 'para', 'em']);
function montarTitulo(partes, limite) {
  const vistos = new Set(); let t = '';
  for (const p of partes.filter(Boolean)) {
    const palavras = String(p).replace(PROIBIDAS_TITULO, ' ').replace(/[—–@#!*]/g, ' ').split(/\s+/).filter(Boolean)
      .filter((w) => { const k = semAcento(w); if (CONECTIVOS.has(k) || /^\d+$/.test(k)) return true; if (vistos.has(k)) return false; vistos.add(k); return true; })
      .map((w) => (CONECTIVOS.has(semAcento(w)) ? w.toLowerCase() : w.length > 1 && w === w.toUpperCase() && !/\d/.test(w) ? w[0] + w.slice(1).toLowerCase() : w[0].toUpperCase() + w.slice(1)));
    if (!palavras.length) continue;
    const n = t ? `${t} ${palavras.join(' ')}` : palavras.join(' ');
    if (n.length <= limite) t = n;
  }
  return t;
}
/* padrão das regras de cadastro Mimori (17 e 19/09): o que é + diferencial + quantidade/kit + para quem ou ocasião + uso + cor mais buscada + marca */
function titulosPadrao(nome, limite, ctx, prod) {
  const a = prod.anuncio || {}; const tipo = tipoDoNome(`${nome} ${prod.tec?.modelo?.titulo || ''}`)[0];
  const cores = (a.cores_titulo && a.cores_titulo.length ? a.cores_titulo : [...new Set((prod.tec?.fils || []).map((f) => { const fl = acharFilDaLinha(ctx, f); return fl ? fl.cor : null; }).filter(Boolean))]).slice(0, 2).join(' ');
  const qtds = (a.quantidades || []).map(Number).filter((x) => x > 0).sort((x, y) => x - y);
  const kit = qtds.length > 1 ? `Kit ${qtds.slice(0, -1).join(' ')} ou ${qtds[qtds.length - 1]} Unidades` : qtds[0] > 1 ? `Kit ${qtds[0]} Unidades` : '';
  const dif = ['Impressão 3D', a.personalizavel ? 'Personalizado com Nome' : ''].filter(Boolean).join(' ');
  const quem = (a.para_quem || []).join(' '); const uso = (a.usos && a.usos.length ? a.usos : USOS_POR_TIPO[tipo] || []).join(' ');
  const marca = ctx.params.marca_no_titulo ? (ctx.empresa.marca || ctx.empresa.nome || '') : '';
  const extra = ctx.params.marca_no_titulo ? '' : (USOS_POR_TIPO[tipo] || [])[1] || 'Decoração';
  return { a: montarTitulo([nome, dif, kit, quem, uso, cores, marca || extra], limite), b: montarTitulo([nome, dif, quem, uso, kit, cores, marca || extra], limite) };
}
function tituloMkt(nome, limite, ctx, prod) { return titulosPadrao(nome, limite, ctx, prod).a; }
function autoProduto(prod, ctx) {
  const c = precificar(prod.tec, ctx); const nome = prod.nome || nomeSugerido(prod.tec?.modelo?.titulo) || 'Peça';
  const [tipo, , ncm, catShopee] = tipoDoNome(`${nome} ${prod.tec?.modelo?.titulo || ''}`);
  const dim = prod.tec?.modelo?.dim || {};
  const pc = (x) => (x ? Math.ceil(nn(x) + 2) : '');
  return { nome, tipo, ncm, catShopee, sku: gerarSku(nome, ctx, prod.id), marca: ctx.empresa.marca || ctx.empresa.nome || '',
    categoria: tipo, descricao: `${nome} em impressão 3D${prod.tec?.fils?.length > 1 ? ', em mais de uma cor' : ''}. Produzido sob encomenda.`,
    c: dim.c || '', l: dim.l || '', a: dim.a || '', pc: pc(dim.c), pl: pc(dim.l), pa: pc(dim.a), peso_emb: 30, vem: `1 ${nome}`, prazo_dias: 3,
    ip: MARCAS_TERCEIROS.test(`${nome} ${prod.tec?.modelo?.titulo || ''}`), gramas: c.gramas_unit, custo: c };
}
function RotuloAuto({ id, rot, auto, ov, onRestaura, extra }) {
  return (
    <div className="rot-auto">
      <label htmlFor={id}>{rot}</label>
      {extra}
      {!ov && auto !== '' && auto != null && <span className="tag-auto">automático</span>}
      {ov && auto !== '' && auto != null && onRestaura && <button type="button" className="link restaura" onClick={onRestaura}>voltar ao automático</button>}
    </div>
  );
}
function CampoAuto({ id, rot, valor, auto, onMuda, tipo = 'text', sufixo, area, dica, placeholder, extra }) {
  const ov = valor !== undefined && valor !== null && valor !== '';
  const v = ov ? valor : auto ?? '';
  const el = area ? <textarea id={id} value={v} onChange={(e) => onMuda(e.target.value)} style={{ minHeight: 200 }} placeholder={placeholder} />
    : <input id={id} type={tipo} value={v} placeholder={placeholder} onChange={(e) => onMuda(e.target.value)} />;
  return (
    <div className={`campo-auto ${area ? 'span-todo' : ''}`}>
      <RotuloAuto id={id} rot={rot} auto={auto} ov={ov} onRestaura={() => onMuda('')} extra={extra} />
      {sufixo ? <div className="campo pc">{el}<span className="sufx">{sufixo}</span></div> : el}
      {dica && <span className="dica">{dica}</span>}
    </div>
  );
}
function AnunciosProduto({ prod, setProd, ctx }) {
  const a = prod.anuncio || {}; const m = prod.medidas || {}; const au = autoProduto(prod, ctx); const c = au.custo;
  const canaisSel = a.canais || [];
  const tipos = [...new Set(ctx.canais.filter((x) => canaisSel.includes(x.id)).map((x) => tipoMkt(x.nome)))];
  const [aba, setAba] = useState(tipos[0] || 'shopee');
  const setA = (k, v) => setProd({ ...prod, anuncio: { ...a, [k]: v } });
  const setM = (k, v) => setProd({ ...prod, medidas: { ...m, [k]: v } });
  const setMk = (mk, k, v) => setProd({ ...prod, anuncio: { ...a, [mk]: { ...(a[mk] || {}), [k]: v } } });
  const val = (o, k, auto) => (o[k] !== undefined && o[k] !== null && o[k] !== '' ? o[k] : auto);
  const med = (k) => nn(val(m, k, au[k]));
  const pesoReal = nn(val(m, 'peso_peca', Math.round(c.gramas_unit))) + nn(val(m, 'peso_emb', au.peso_emb));
  const cubico = med('pc') * med('pl') * med('pa') / 6000 * 1000;
  const declarado = Math.ceil(Math.max(pesoReal, cubico) / 50) * 50;
  const mk = tipos.includes(aba) ? aba : tipos[0]; const cfg = mk && MKTS[mk]; const d = (mk && a[mk]) || {};
  const canalDoMk = mk && ctx.canais.find((x) => canaisSel.includes(x.id) && tipoMkt(x.nome) === mk);
  const autoMk = mk ? { titulo: tituloMkt(au.nome, cfg.titulo || 200, ctx, prod), categoria: mk === 'shopee' ? au.catShopee : '', marca: au.marca, sku: prod.sku || au.sku,
    desc: descricaoGerada({ ...prod, nome: au.nome, anuncio: { ...a, vem: val(a, 'vem', au.vem), prazo_dias: val(a, 'prazo_dias', au.prazo_dias) }, medidas: { c: med('c'), l: med('l'), a: med('a'), peso_peca: val(m, 'peso_peca', '') } }, ctx, mk, c) } : {};
  const V = (k) => val(d, k, autoMk[k]);
  const pend = [];
  if (mk) { if (!prod.foto) pend.push('Sem foto do produto');
    if (cfg.titulo && String(V('titulo')).length > cfg.titulo) pend.push(`Título passou de ${cfg.titulo} caracteres`);
    if (mk !== 'direto' && !V('categoria')) pend.push('Categoria: escolha na central do vendedor e cole aqui');
    if (mk !== 'direto' && !(med('pc') && med('pl') && med('pa'))) pend.push('Tamanho do pacote vazio');
    if (mk === 'amazon' && (d.bullets || []).filter((b) => b && b.trim()).length < 3) pend.push('Menos de 3 tópicos de destaque'); }
  const preco = canalDoMk ? precoNoCanal(c.base_preco, canalDoMk, ctx.params.imposto_pct).preco : c.preco;
  const copiar = () => {
    const L = mk === 'shopee' ? [
      `CADASTRO SHOPEE · ${au.nome}`, '', '1. INFORMAÇÃO BÁSICA', 'Imagem 1:1: foto do produto (baixe no cadastro do sistema)', `Nome do produto: ${V('titulo')}`, `Categoria: ${V('categoria') || '[escolher no Seller Centre]'}`,
      '', '2. ESPECIFICAÇÃO', `Marca: ${V('marca')}`, 'País de origem: Brasil', `Material: ${[...new Set((prod.tec?.fils || []).map((f) => nomeTipo(ctx, f.material_id)))].join(', ')}`,
      '', '3. DESCRIÇÃO', V('desc'), '', '4. INFORMAÇÕES DE VENDAS', `Preço: ${brl(preco)}`, 'Estoque: 100', `SKU: ${V('sku')}`,
      '', '5. INFORMAÇÕES FISCAIS', `NCM: ${val(a, 'ncm', au.ncm)}`, 'Origem: 0 · Nacional', 'Unidade de medida: UN (UNIDADE)',
      '', '6. ENVIO', `Peso: ${(declarado / 1000).toLocaleString('pt-BR')} kg`, `Tamanho do pacote: ${med('pc')} x ${med('pl')} x ${med('pa')} cm`, 'Sob encomenda: Não',
      '', '7. OUTROS', 'Condição: Novo', `SKU principal: ${V('sku')}`]
      : [`CADASTRO ${cfg.nome.toUpperCase()} · ${au.nome}`, '', `Título: ${V('titulo')}`, `Categoria: ${V('categoria') || '[escolher na central]'}`, `Marca: ${V('marca')}`,
        mk === 'ml' ? `Tipo de anúncio: ${d.tipo_anuncio || 'Clássico'}` : null, `SKU: ${V('sku')}`, `Preço: ${brl(preco)}`,
        mk === 'amazon' ? `Tópicos:\n${(d.bullets || []).filter(Boolean).map((b) => '- ' + b).join('\n')}` : null, '', 'Descrição:', V('desc'), '',
        mk !== 'direto' ? `NCM: ${val(a, 'ncm', au.ncm)} · Origem 0 Nacional · Unidade UN` : null,
        mk !== 'direto' ? `Pacote: ${med('pc')} x ${med('pl')} x ${med('pa')} cm · ${declarado} g` : null, 'Condição: Novo'];
    navigator.clipboard && navigator.clipboard.writeText(L.filter((x) => x !== null).join('\n')); ctx.avisar(`Texto do cadastro da ${cfg.nome} copiado, na ordem do formulário. Cole campo a campo na central do vendedor.`);
  };
  return (
    <div className="cartao">
      <div className="cabeca"><h2>Onde vender</h2><span className="sub">o sistema preenche tudo; mude só o que quiser</span></div>
      <EscolhaMulti id="an-canais" rotulo="Canais" valores={canaisSel} onMudar={(ids) => setA('canais', ids)} placeholder="digite o canal: Shopee, Mercado Livre, Instagram"
        itens={ctx.canais.map((ch) => ({ ...ch, detalhe: `${brl(precoNoCanal(c.base_preco, ch, ctx.params.imposto_pct).preco)} · ${taxaTxt(ch)}` }))}
        rotuloChip={(ch) => <>{ch.nome}<span className="sub">{brl(precoNoCanal(c.base_preco, ch, ctx.params.imposto_pct).preco)}</span></>}
        onCriar={(t, dd) => ctx.pedirCadastro('canal', t, dd)} textoCriar={(t) => `Cadastrar canal "${t}"`} />
      {!tipos.length ? <div className="vazio">Escolha onde este produto vai ser vendido. Os campos de cada canal já vêm preenchidos.</div> : (<>
        <div className="separa" />
        <div className="cabeca"><h3>Ficha comum</h3><span className="sub">vale para todos os canais</span></div>
        <div className="grade">
          <CampoAuto id="an-ab" rot="Sobre a peça" area valor={a.abertura} auto={`${au.nome} feito em impressão 3D, em ${[...new Set((prod.tec?.fils || []).map((f) => nomeTipo(ctx, f.material_id)))].join(' e ') || 'PLA'}${(() => { const cs = [...new Set((prod.tec?.fils || []).map((f) => acharFilDaLinha(ctx, f)?.cor).filter(Boolean))]; return cs.length ? ` ${cs.join(', ').toLowerCase()}` : ''; })()}. Peça produzida sob encomenda.`} onMuda={(v) => setA('abertura', v)} />
          <CampoAuto id="an-vem" rot="O que vem no pedido" valor={a.vem} auto={au.vem} onMuda={(v) => setA('vem', v)} />
          <CampoAuto id="an-pz" rot="Postagem (dias úteis)" tipo="number" valor={a.prazo_dias} auto={au.prazo_dias} onMuda={(v) => setA('prazo_dias', v)} sufixo="dias" />
          <Escolha id="an-ncm" rotulo="NCM" valor={val(a, 'ncm', au.ncm)} itens={NCMS.map(([id, nome]) => ({ id, nome }))} onEscolher={(x) => setA('ncm', x.id)} onCriar={(t, dd) => dd({ id: t.replace(/\D/g, ''), nome: t })} textoCriar={(t) => `Usar NCM ${t}`} dica={`Sugerido para ${au.tipo.toLowerCase()}. [CONFIRMAR] com o contador.`} />
          <label className="opcao-linha"><Check on={!!a.pequena} rot="Peça pequena" onClick={() => setA('pequena', !a.pequena)} /> Peça pequena: avisar que não é para menores de 3 anos</label>
          <label className="opcao-linha"><Check on={!!a.personalizavel} rot="Personalizável" onClick={() => setA('personalizavel', !a.personalizavel)} /> Personalizável com nome</label>
          <EscolhaMulti id="an-qtd" rotulo="Vende em quantidades" valores={(a.quantidades || []).map(String)} onMudar={(xs) => setA('quantidades', xs)} placeholder="1, 3, 5, 10"
            itens={[...new Set(['1', '2', '3', '5', '10', '20', ...(a.quantidades || []).map(String)])].map((x) => ({ id: x, nome: x === '1' ? '1 unidade' : `${x} unidades` }))}
            onCriar={(t, dd) => { const n = String(parseInt(t, 10) || ''); if (n) dd({ id: n, nome: `${n} unidades` }); }} textoCriar={(t) => `Usar ${parseInt(t, 10) || t}`} />
          <EscolhaMulti id="an-quem" rotulo="Para quem ou ocasião" valores={a.para_quem || []} onMudar={(xs) => setA('para_quem', xs)} placeholder="Presente Amiga, Pet, Casa Nova"
            itens={[...new Set(['Presente', 'Presente Amiga', 'Presente Mãe', 'Presente Namorada', 'Presente Criativo', 'Pet', 'Casa Nova', 'Escritório', 'Gamer', ...(a.para_quem || [])])].map((x) => ({ id: x, nome: x }))}
            onCriar={(t, dd) => dd({ id: t, nome: t })} textoCriar={(t) => `Usar "${t}"`} dica="Sem lembrancinha e sem data comemorativa: atraem quem quer muitas peças baratas." />
          <EscolhaMulti id="an-uso" rotulo="Uso" valores={a.usos || []} onMudar={(xs) => setA('usos', xs)} placeholder={(USOS_POR_TIPO[au.tipo] || ['Decoração']).join(', ')}
            itens={[...new Set([...(USOS_POR_TIPO[au.tipo] || []), 'Decoração', 'Enfeite', 'Organização', ...(a.usos || [])])].map((x) => ({ id: x, nome: x }))}
            onCriar={(t, dd) => dd({ id: t, nome: t })} textoCriar={(t) => `Usar "${t}"`} dica={!(a.usos || []).length ? `Vazio usa o de ${au.tipo.toLowerCase()}: ${(USOS_POR_TIPO[au.tipo] || ['Decoração']).join(', ')}.` : null} />
          <EscolhaMulti id="an-cor" rotulo="Cores no título" valores={a.cores_titulo || []} onMudar={(xs) => setA('cores_titulo', xs)} placeholder="a mais buscada primeiro"
            itens={[...new Set([...ctx.filamentos.map((x) => x.cor), ...(a.cores_titulo || [])])].map((x) => ({ id: x, nome: x }))}
            onCriar={(t, dd) => dd({ id: t, nome: t })} textoCriar={(t) => `Usar "${t}"`} dica="Vazio usa as cores dos filamentos da peça. Até duas entram no título." />
        </div>
        <div className="grade" style={{ marginTop: 14 }}>
          <div><RotuloAuto rot="Peça (C x L x A)" auto={au.c} ov={!!m.c} onRestaura={() => setProd({ ...prod, medidas: { ...m, c: '', l: '', a: '' } })} /><div className="dim">{['c', 'l', 'a'].map((k) => <div className="campo pc" key={k}><input type="number" min="0" step="0.1" placeholder="0" value={val(m, k, au[k])} aria-label={`Peça ${k}`} onChange={(e) => setM(k, e.target.value)} /><span className="sufx">cm</span></div>)}</div></div>
          <div><RotuloAuto rot="Pacote (C x L x A)" auto={au.pc} ov={!!m.pc} onRestaura={() => setProd({ ...prod, medidas: { ...m, pc: '', pl: '', pa: '' } })} /><div className="dim">{['pc', 'pl', 'pa'].map((k) => <div className="campo pc" key={k}><input type="number" min="0" step="0.1" placeholder="0" value={val(m, k, au[k])} aria-label={`Pacote ${k}`} onChange={(e) => setM(k, e.target.value)} /><span className="sufx">cm</span></div>)}</div></div>
          <CampoAuto id="an-pe" rot="Embalagem pesa" tipo="number" valor={m.peso_emb} auto={au.peso_emb} onMuda={(v) => setM('peso_emb', v)} sufixo="g"
            dica={`Peça ${Math.round(c.gramas_unit)} g + embalagem = ${Math.round(pesoReal)} g. Cúbico ${Math.round(cubico)} g. Declarar ${declarado} g.`} />
        </div>
        <div className="abas">{tipos.map((t) => <button key={t} className={t === mk ? 'on' : ''} onClick={() => setAba(t)}>{MKTS[t].nome}</button>)}</div>
        <div className="grade">
          {cfg.titulo > 0 && <div className="span-todo"><CampoAuto id="mk-t" rot="Título" extra={<span className={`cont ${String(V('titulo')).length > cfg.titulo ? 'alerta-txt' : ''}`}>{String(V('titulo')).length}/{cfg.titulo}</span>}
            valor={d.titulo} auto={autoMk.titulo} onMuda={(v) => setMk(mk, 'titulo', v)}
            dica={mk === 'shopee' ? 'Ordem: o que é, diferencial, quantidade, para quem, uso, cor. Os primeiros 40 caracteres aparecem antes do corte.' : 'O começo do título é o que aparece na busca.'} />
            {(() => { const tb = titulosPadrao(au.nome, cfg.titulo, ctx, prod).b; return tb && tb !== V('titulo') && (
              <div className="alt-ab"><span className="rot">Alternativa B para testar depois de 30 dias</span><span>{tb} <span className="sub">({tb.length})</span></span>
                <button className="link" onClick={() => setMk(mk, 'titulo', tb)}>Usar a B</button></div>); })()}</div>}
          {mk !== 'direto' && <div className="span2"><CampoAuto id="mk-c" rot="Categoria" valor={d.categoria} auto={autoMk.categoria} onMuda={(v) => setMk(mk, 'categoria', v)}
            placeholder="caminho completo, como aparece na central" dica={autoMk.categoria ? 'Categoria usada pela Mimori nesse tipo de peça.' : 'Esta o sistema ainda não sabe: escolha na central e cole aqui uma vez.'} /></div>}
          {mk !== 'direto' && <CampoAuto id="mk-m" rot="Marca" valor={d.marca} auto={autoMk.marca} onMuda={(v) => setMk(mk, 'marca', v)} />}
          {mk !== 'direto' && <CampoAuto id="mk-s" rot="SKU" valor={d.sku} auto={autoMk.sku} onMuda={(v) => setMk(mk, 'sku', v)} dica={explicarSku(V('sku'), ctx)} />}
          {mk === 'ml' && <div><label>Tipo de anúncio</label><div className="segm">{['Clássico', 'Premium'].map((x) => <button key={x} className={(d.tipo_anuncio || 'Clássico') === x ? 'on' : ''} onClick={() => setMk(mk, 'tipo_anuncio', x)}>{x}</button>)}</div></div>}
          {(mk === 'ml' || mk === 'amazon') && <div><label htmlFor="mk-e">Código de barras (EAN)</label><input id="mk-e" value={d.ean || ''} placeholder="vazio para produto próprio sem EAN" onChange={(e) => setMk(mk, 'ean', e.target.value)} /></div>}
          {mk === 'amazon' && <div className="span-todo"><label>Tópicos de destaque</label>{[0, 1, 2, 3, 4].map((k) => <input key={k} style={{ marginBottom: 6 }} value={(d.bullets || [])[k] || ''} placeholder={`Tópico ${k + 1}`}
            onChange={(e) => { const b = [...(d.bullets || ['', '', '', '', ''])]; b[k] = e.target.value; setMk(mk, 'bullets', b); }} />)}</div>}
          <CampoAuto id="mk-d" area rot="Descrição" extra={<span className={`cont ${String(V('desc')).length > cfg.desc ? 'alerta-txt' : ''}`}>{String(V('desc')).length}/{cfg.desc}</span>}
            valor={d.desc} auto={autoMk.desc} onMuda={(v) => setMk(mk, 'desc', v)} />
        </div>
        {pend.length > 0 ? <div className="aviso atencao" style={{ marginTop: 12 }}><b>Antes de publicar na {cfg.nome}</b><ul className="lista-simples">{pend.map((p) => <li key={p}>{p}</li>)}</ul></div>
          : <div className="aviso bom" style={{ marginTop: 12 }}>Cadastro da {cfg.nome} completo.</div>}
        <div className="linha-bt"><button className="bt" onClick={copiar} title="Copia o texto com todos os campos, na ordem do formulário da central do vendedor"><Ico n="copia" s={15} /> Copiar texto do cadastro · {cfg.nome}</button>
          <span className="dica" style={{ margin: 0, alignSelf: 'center' }}>Copia todos os campos, na ordem do formulário, para colar na central do vendedor.</span></div>
      </>)}
    </div>
  );
}

/* ===================== v3.8 · nome de catálogo a partir do arquivo ===================== */
/* O título do arquivo vem cru e às vezes em outra língua. O nome sugerido usa o tipo da peça, os termos
   que o dicionário reconhece e os nomes próprios. O nome original fica visível como referência. */
const RUIDO_ARQUIVO = /\b(no ?ams|ams|multi ?colou?r|multicolore|print ?in ?place|pip|no ?supports?|supportless|senza supporti|sin soportes|remix|remake|bambu( lab)?|a1( mini)?|p1s|p1p|x1c|x1e|h2d|mk4|ender ?\d?|v\d+(\.\d+)*|plate ?\d+|placa ?\d+|stl|3mf|final[e]?|montato|assembled|test|prova)\b/gi;
const FRASES_PT = [[/rifiuti (di )?filamento|filament waste|waste filament|purge (bin|bucket)|poop (bin|chute)|scarti di stampa|restos de filamento/i, 'para Restos de Filamento'],
  [/porta ?chiavi|keychain|key ?ring|llavero/i, ''], [/cable (holder|organi[sz]er)/i, 'para Cabos'], [/headphone|cuffie|auricular/i, 'para Fone'],
  [/phone|telefono|celular|smartphone/i, 'para Celular'], [/pen|penna|lapicero/i, 'para Canetas'], [/plant|pianta|planta/i, 'para Plantas']];
const DIC_PT = { cat: 'Gato', gatto: 'Gato', gato: 'Gato', dog: 'Cachorro', cane: 'Cachorro', perro: 'Cachorro', dragon: 'Dragão', drago: 'Dragão', flower: 'Flor', fiore: 'Flor', flor: 'Flor',
  heart: 'Coração', cuore: 'Coração', corazon: 'Coração', star: 'Estrela', stella: 'Estrela', estrella: 'Estrela', moon: 'Lua', luna: 'Lua', bear: 'Urso', orso: 'Urso', oso: 'Urso',
  bunny: 'Coelho', rabbit: 'Coelho', coniglio: 'Coelho', conejo: 'Coelho', owl: 'Coruja', gufo: 'Coruja', fox: 'Raposa', volpe: 'Raposa', unicorn: 'Unicórnio', unicorno: 'Unicórnio',
  frog: 'Sapo', rana: 'Sapo', turtle: 'Tartaruga', tartaruga: 'Tartaruga', octopus: 'Polvo', polpo: 'Polvo', skull: 'Caveira', teschio: 'Caveira', angel: 'Anjo', angelo: 'Anjo',
  articulated: 'Articulado', articolato: 'Articulado', flexi: 'Articulado', mini: 'Mini', cute: 'Fofo', kawaii: 'Fofo', geometric: 'Geométrico', geometrico: 'Geométrico', low: '', poly: '', lowpoly: 'Low Poly' };
function nomeSugerido(titulo) {
  const bruto = String(titulo || ''); if (!bruto.trim()) return '';
  const limpo = bruto.replace(/\.(gcode|gco|3mf|stl)$/ig, '').replace(/[_/\\|+]/g, ' ').replace(/[()[\]{}]/g, ' ').replace(RUIDO_ARQUIVO, ' ').replace(/\s{2,}/g, ' ').trim();
  const tipo = (TIPOS_PRODUTO.find((x) => x[1].test(bruto)) || [null])[0];
  const frase = (FRASES_PT.find(([re]) => re.test(bruto)) || [null, ''])[1];
  const palavras = limpo.split(' ').filter(Boolean);
  const traduzidas = palavras.map((w) => DIC_PT[semAcento(w)]).filter((x) => x);
  const proprios = palavras.filter((w, i) => i > 0 && /^[A-ZÀ-Ú][a-zà-ú]+$/.test(w) && !DIC_PT[semAcento(w)] && !TIPOS_PRODUTO.some((x) => x[1].test(w)) && w.length > 2);
  if (!tipo && !traduzidas.length) return limparNome(limpo);
  const partes = [tipo || 'Peça decorativa', frase, ...traduzidas, ...proprios].filter(Boolean);
  const vistos = new Set(); const out = partes.join(' ').split(' ').filter((w) => { const k = semAcento(w); if (CONECTIVOS.has(k)) return true; if (vistos.has(k)) return false; vistos.add(k); return true; }).join(' ');
  return out.slice(0, 70);
}

/* ===================== VARIAÇÕES ===================== */
/* Padrão Mimori: variação 1 é cor (com foto), variação 2 é quantidade. SKU da combinação = SKU pai + 2 letras da cor + 2 dígitos da quantidade. */
const CODIGOS_COR = { 'rosa bebe': 'RS', 'azul bebe': 'AZ', vermelho: 'VM', verde: 'VD', amarelo: 'AM', ametista: 'AT', laranja: 'LR', preto: 'PT', branco: 'BR', cinza: 'CZ', lilas: 'LL', roxo: 'RX', marrom: 'MR', bege: 'BG', dourado: 'DR', prata: 'PR', rosa: 'RO', azul: 'AU' };
function codigoCor(nome, usados) {
  const k = semAcento(nome); let c = CODIGOS_COR[k] || Object.entries(CODIGOS_COR).find(([n]) => k.startsWith(n))?.[1];
  if (!c) { const l = k.replace(/[^a-z]/g, '').toUpperCase(); c = (l[0] || 'X') + (l.slice(1).replace(/[AEIOU]/g, '')[0] || l[1] || 'X'); }
  let n = c, i = 0; while (usados.has(n) && i < 30) { n = c[0] + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i++]; } usados.add(n); return n;
}
function linhasVariacao(prod, ctx, canal) {
  const v = prod.variacoes; if (!v || !v.ativo) return [];
  const cores = v.cores || [], qtds = (v.qtds || []).map(Number).filter((x) => x > 0);
  const au = autoProduto(prod, ctx); const pai = prod.sku || au.sku; const c = au.custo;
  const precoUn = canal ? precoNoCanal(c.base_preco, canal, ctx.params.imposto_pct).preco : c.preco;
  const usados = new Set(); const cod = {}; for (const x of cores) cod[x] = codigoCor(x, usados);
  const combos = cores.length && qtds.length ? cores.flatMap((x) => qtds.map((q) => [x, q])) : cores.length ? cores.map((x) => [x, null]) : qtds.map((q) => [null, q]);
  return combos.map(([cor, q]) => {
    const key = `${cor || ''}|${q || ''}`; const ov = (v.linhas || {})[key] || {};
    const skuAuto = `${pai}-${cor ? cod[cor] : ''}${q ? String(q).padStart(2, '0') : ''}`;
    const precoAuto = r2(q && q > 1 && canal ? precoNoCanal(c.base_preco * q, canal, ctx.params.imposto_pct).preco : q && q > 1 ? precoUn * q : precoUn);
    return { key, cor, qtd: q, sku: ov.sku || skuAuto, skuAuto, preco: ov.preco !== undefined && ov.preco !== '' ? nn(ov.preco) : precoAuto, precoAuto, estoque: ov.estoque !== undefined && ov.estoque !== '' ? nn(ov.estoque) : 100, ov };
  });
}
function VariacoesProduto({ prod, setProd, ctx }) {
  const v = prod.variacoes || { ativo: false, nome1: 'Cor', nome2: 'Unidades por pacote', cores: [], qtds: [] };
  const set = (k, x) => setProd({ ...prod, variacoes: { ...v, [k]: x } });
  const setLinha = (key, k, x) => setProd({ ...prod, variacoes: { ...v, linhas: { ...(v.linhas || {}), [key]: { ...((v.linhas || {})[key] || {}), [k]: x } } } });
  const linhas = linhasVariacao({ ...prod, variacoes: v }, ctx, ctx.canais[0]);
  const coresProd = [...new Set((prod.tec?.fils || []).map((f) => acharFilDaLinha(ctx, f)?.cor).filter(Boolean))];
  return (
    <div className="cartao">
      <div className="cabeca"><h2>Variações</h2><span className="sub">cor e quantidade, com SKU e preço prontos</span></div>
      <label className="opcao-linha"><Check on={!!v.ativo} rot="Tem variação" onClick={() => setProd({ ...prod, variacoes: { ...v, ativo: !v.ativo, cores: v.cores?.length || v.ativo ? v.cores : coresProd } })} />
        Este produto tem variação <span className="sub">de cor, de quantidade ou das duas</span></label>
      {v.ativo && (<>
        <div className="grade" style={{ marginTop: 14 }}>
          <div><label htmlFor="va-n1">Nome da variação 1</label><input id="va-n1" value={v.nome1} onChange={(e) => set('nome1', e.target.value)} /></div>
          <div><label htmlFor="va-n2">Nome da variação 2</label><input id="va-n2" value={v.nome2} onChange={(e) => set('nome2', e.target.value)} /></div>
          <EscolhaMulti id="va-cores" rotulo={v.nome1 || 'Cor'} valores={v.cores || []} onMudar={(xs) => set('cores', xs)} placeholder="cores que você vende"
            itens={[...new Set([...coresProd, ...ctx.filamentos.map((x) => x.cor), ...(v.cores || [])])].map((x) => ({ id: x, nome: x }))}
            onCriar={(t, d) => d({ id: t, nome: t })} textoCriar={(t) => `Usar "${t}"`} dica="Na Shopee, a variação 1 é a que tem foto por opção." />
          <EscolhaMulti id="va-qtd" rotulo={v.nome2 || 'Unidades por pacote'} valores={(v.qtds || []).map(String)} onMudar={(xs) => set('qtds', xs)} placeholder="1, 3, 5, 10"
            itens={[...new Set(['1', '3', '5', '10', ...(v.qtds || []).map(String)])].map((x) => ({ id: x, nome: x === '1' ? '1 unidade' : `${x} unidades` }))}
            onCriar={(t, d) => { const n = String(parseInt(t, 10) || ''); if (n) d({ id: n, nome: `${n} unidades` }); }} textoCriar={(t) => `Usar ${parseInt(t, 10) || t}`} />
        </div>
        {linhas.length > 0 && <div className="rolo" style={{ marginTop: 12 }}><table>
          <thead><tr><th>{v.nome1}</th><th>{v.nome2}</th><th>SKU</th><th className="num">Preço ({ctx.canais[0]?.nome})</th><th className="num">Estoque</th><th /></tr></thead>
          <tbody>{linhas.map((l) => (
            <tr key={l.key}><td>{l.cor || ''}</td><td>{l.qtd ? `${l.qtd} un.` : ''}</td>
              <td><input value={l.sku} aria-label="SKU da variação" onChange={(e) => setLinha(l.key, 'sku', e.target.value)} className="mono-in" /></td>
              <td className="num"><div className="campo"><span className="pref">R$</span><input type="number" step="0.01" value={l.preco} aria-label="Preço da variação" onChange={(e) => setLinha(l.key, 'preco', e.target.value)} /></div></td>
              <td className="num"><input type="number" min="0" value={l.estoque} aria-label="Estoque da variação" style={{ width: 80, textAlign: 'right' }} onChange={(e) => setLinha(l.key, 'estoque', e.target.value)} /></td>
              <td>{(l.ov.sku || l.ov.preco !== undefined) && <button className="link" onClick={() => setProd({ ...prod, variacoes: { ...v, linhas: { ...(v.linhas || {}), [l.key]: {} } } })}>voltar ao automático</button>}</td></tr>))}</tbody></table></div>}
        <span className="dica">SKU no padrão da loja: SKU pai + 2 letras da cor + 2 dígitos da quantidade. Cor sai no preço do produto; kit sai com o preço de N peças no canal. Estoque virtual 100 por combinação, como na Mimori. Tudo dá para mudar na linha.</span>
      </>)}
    </div>
  );
}

/* ===================== EXPORTAR PARA MARKETPLACE (arquivo, sem integração) ===================== */
/* [CONFIRMAR] O mapeamento de colunas depende dos modelos de planilha da Shopee e do Mercado Livre,
   que não chegaram. Até lá, a tela confere os dados e registra o preço, mas não preenche coluna nenhuma. */
const MAPA_COLUNAS = { shopee: null, ml: null };
function conferirAnuncio(prod, ctx, canal, mk) {
  const au = autoProduto(prod, ctx); const cfg = MKTS[mk]; const d = (prod.anuncio || {})[mk] || {}; const m = prod.medidas || {};
  const titulo = d.titulo || tituloMkt(au.nome, cfg.titulo || 200, ctx, prod);
  const pr = precoNoCanal(au.custo.base_preco, canal, ctx.params.imposto_pct);
  const v = (o, k, a) => (o[k] !== undefined && o[k] !== null && o[k] !== '' ? o[k] : a);
  const pac = [v(m, 'pc', au.pc), v(m, 'pl', au.pl), v(m, 'pa', au.pa)].map(nn);
  const base = { produto: prod.nome, titulo, sku: v(d, 'sku', prod.sku || au.sku), preco: pr.preco, categoria: v(d, 'categoria', mk === 'shopee' ? au.catShopee : ''),
    ncm: v(prod.anuncio || {}, 'ncm', au.ncm), pacote: pac, foto: !!prod.foto, erro: pr.erro };
  const linhas = linhasVariacao(prod, ctx, canal);
  const regs = linhas.length ? linhas.map((l) => ({ ...base, variacao: [l.cor, l.qtd ? `${l.qtd} un.` : ''].filter(Boolean).join(' · '), sku: l.sku, preco: l.preco, estoque: l.estoque }))
    : [{ ...base, variacao: '', estoque: 100 }];
  return regs.map((r) => {
    const bloq = [], avis = [];
    if (!r.titulo) bloq.push('Título vazio: preencha em Onde vender.');
    if (cfg.titulo && r.titulo.length > cfg.titulo) bloq.push(`Título com ${r.titulo.length} caracteres: corte para ${cfg.titulo} em Onde vender.`);
    if (r.erro || !(r.preco > 0)) bloq.push('Preço não sai do motor: confira custo e taxas do canal.');
    if (!r.sku) bloq.push('Sem SKU: gere pelo padrão em Configurações, Códigos.');
    if (!r.categoria) avis.push('Categoria vazia: escolha no marketplace ao subir o arquivo.');
    if (!r.ncm) avis.push('NCM vazio: confirme com o contador e preencha em Onde vender.');
    if (!(r.pacote[0] && r.pacote[1] && r.pacote[2])) avis.push('Tamanho do pacote vazio: preencha em Onde vender.');
    if (!r.foto) avis.push('Sem foto: suba as fotos direto no marketplace.');
    return { ...r, bloq, avis };
  });
}
function ExportarMarketplace({ ctx, ids, onFechar, onExportado }) {
  const canaisMk = ctx.canais.filter((c) => ['shopee', 'ml'].includes(tipoMkt(c.nome)));
  const [canalId, setCanalId] = useState(canaisMk[0]?.id || '');
  const [sel, setSel] = useState(ids || []);
  const [modelo, setModelo] = useState(null);
  const canal = ctx.canais.find((c) => c.id === canalId); const mk = canal ? tipoMkt(canal.nome) : null;
  const prods = sel.map((id) => ctx.pecas.find((p) => p.id === id)).filter(Boolean).map((p) => ({ ...p, tec: dePeca(p) }));
  const linhas = canal ? prods.flatMap((p) => conferirAnuncio(p, ctx, canal, mk).map((r) => ({ ...r, pid: p.id }))) : [];
  const bloqueios = linhas.reduce((a, l) => a + l.bloq.length, 0), avisos = linhas.reduce((a, l) => a + l.avis.length, 0);
  const mapa = mk ? MAPA_COLUNAS[mk] : null;
  const lerModelo = async (f) => {
    try { await carregarXlsx(); const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const abas = wb.SheetNames.map((n) => ({ nome: n, cab: (window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' })[0] || []).filter(Boolean).slice(0, 60) }));
      setModelo({ arquivo: f.name, abas });
    } catch (e) { setModelo({ arquivo: f.name, erro: String(e.message || e) }); }
  };
  return (
    <Modal titulo="Exportar para marketplace" onFechar={onFechar} largo>
      <p className="sub" style={{ marginTop: 0 }}>Gera o arquivo de cadastro em massa a partir do modelo que você baixou na sua conta. Você sobe o arquivo no marketplace. Nada é publicado daqui.</p>
      <div className="grade">
        <Escolha id="ex-canal" rotulo="Marketplace e tipo de anúncio" valor={canalId} itens={canaisMk.map((c) => ({ id: c.id, nome: c.nome, detalhe: taxaTxt(c) }))} onEscolher={(x) => setCanalId(x.id)} />
        <EscolhaMulti id="ex-prod" rotulo="Produtos" valores={sel} onMudar={setSel} itens={ctx.pecas.map((p) => ({ id: p.id, nome: p.nome, detalhe: p.sku }))} placeholder="produtos para exportar" />
      </div>
      <div className="separa" />
      <div className="cabeca"><h3>Conferência</h3><span className="sub">{linhas.length} linha(s) · <span className={bloqueios ? 'alerta-txt' : ''}>{bloqueios} erro(s) que bloqueiam</span> · {avisos} aviso(s)</span></div>
      {linhas.length ? <div className="rolo" style={{ maxHeight: 320, overflowY: 'auto' }}><table className="conf">
        <thead><tr><th>Produto</th><th>Variação</th><th>SKU</th><th className="num">Preço</th><th className="num">Título</th><th>O que falta</th></tr></thead>
        <tbody>{linhas.map((l, k) => (
          <tr key={k} className={l.bloq.length ? 'linha-erro' : ''}><td>{l.produto}</td><td className="sub">{l.variacao}</td><td className="mono">{l.sku}</td>
            <td className="num mono">{brl(l.preco)}</td><td className="num mono">{l.titulo.length}</td>
            <td>{[...l.bloq.map((x) => <div key={x} className="alerta-txt">{x}</div>), ...l.avis.map((x) => <div key={x} className="sub">{x}</div>)]}{!l.bloq.length && !l.avis.length && <span className="sub">ok</span>}</td></tr>))}</tbody></table></div>
        : <div className="vazio">Escolha os produtos.</div>}
      <div className="separa" />
      <div className="cabeca"><h3>Modelo de planilha</h3><span className="sub">baixado na central do vendedor</span></div>
      <label className="bt" style={{ margin: 0 }}><Ico n="doc" s={15} /> Enviar o modelo (.xlsx)
        <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) lerModelo(f); }} /></label>
      {modelo && (modelo.erro ? <div className="aviso ruim" style={{ marginTop: 10 }}>Não consegui ler {modelo.arquivo}: {modelo.erro}</div>
        : <div className="aviso atencao" style={{ marginTop: 10 }}><b>{modelo.arquivo}</b>: {modelo.abas.length} aba(s). {mapa ? '' : 'O sistema ainda não conhece as colunas deste modelo, então não preenche nenhuma. [CONFIRMAR] mapeamento a partir dos modelos reais.'}
          <ul className="lista-simples">{modelo.abas.slice(0, 4).map((a) => <li key={a.nome}><b>{a.nome}</b>: {a.cab.slice(0, 12).join(' · ') || 'sem cabeçalho na linha 1'}</li>)}</ul></div>)}
      <div className="linha-bt">
        <button className="bt forte" disabled={!!bloqueios || !linhas.length || !modelo || modelo.erro || !mapa} title={!mapa ? 'Falta o mapeamento de colunas do modelo' : ''}
          onClick={() => onExportado({ canal, mk, linhas })}><Ico n="baixa" s={15} /> Gerar arquivo</button>
        <button className="bt" disabled={!!bloqueios || !linhas.length} onClick={() => onExportado({ canal, mk, linhas, soRegistro: true })}>Registrar preços conferidos</button>
        <div className="esp" /><button className="bt" onClick={onFechar}>Cancelar</button></div>
      <span className="dica">Preço sai do motor com a taxa do canal escolhido. Nunca é digitado aqui. Cada exportação guarda o preço e os parâmetros usados, com data.</span>
    </Modal>
  );
}

/* ===================== PERSISTÊNCIA =====================
   Supabase com RLS por organização. Cada lista da tela vira uma tabela.
   Colunas que o banco valida (dinheiro, taxa, status) saem do objeto;
   o resto vai em dados jsonb. Nada se apaga: o que sai da lista vira ativo = false. */
const M3 = (typeof window !== 'undefined' && window.M3_CONFIG) || {};
const sb = M3.supabaseUrl && M3.supabaseKey
  ? createClient(M3.supabaseUrl, M3.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } })
  : null;
const TERMOS_VERSAO = 'beta-2026-09';

const NUM = new Set(['preco_kg', 'perda_pct', 'potencia_w', 'valor_compra', 'vida_util_h', 'manutencao_hora',
  'taxa_pct', 'taxa_fixa', 'total', 'custo_total', 'lucro', 'valor', 'numero', 'ultimo_preco', 'ultimo_estoque', 'qtd_pacote', 'preco_pacote', 'peso_g', 'preco', 'quantidade', 'estoque_g', 'estoque', 'estoque_min']);
const NAO_NEG = new Set(['preco_kg', 'potencia_w', 'valor_compra', 'vida_util_h', 'manutencao_hora', 'taxa_fixa',
  'total', 'custo_total', 'valor', 'preco_pacote', 'peso_g', 'preco', 'quantidade', 'estoque_g', 'estoque', 'estoque_min']);
const DATA = new Set(['data', 'venc']);
const COLECOES = {
  materiais:   { t: 'materiais', cols: ['nome', 'preco_kg', 'perda_pct'] },
  impressoras: { t: 'impressoras', cols: ['nome', 'potencia_w', 'valor_compra', 'vida_util_h', 'manutencao_hora'] },
  canais:      { t: 'canais', cols: ['nome', 'taxa_pct', 'taxa_fixa'] },
  formas:      { t: 'formas_pagamento', cols: ['nome', 'taxa_pct', 'taxa_fixa'] },
  clientes:    { t: 'clientes', cols: ['nome'] },
  pecas:       { t: 'produtos', cols: ['nome', 'sku', 'categoria'] },
  orcamentos:  { t: 'orcamentos', cols: ['numero', 'status', 'cliente_id', 'total', 'custo_total', 'lucro'], desc: 'numero' },
  vendas:      { t: 'vendas', cols: ['numero', 'status', 'cliente_id', 'data', 'total', 'custo_total', 'lucro'], desc: 'numero' },
  lancamentos: { t: 'lancamentos', cols: ['tipo', 'descricao', 'valor', 'venc', 'pago', 'cliente_id'] },
  insumos:     { t: 'insumos', cols: ['nome', 'categoria', 'unidade', 'qtd_pacote', 'preco_pacote', 'estoque', 'estoque_min'] },
  filamentos:  { t: 'filamentos', cols: ['tipo_id', 'cor', 'marca', 'peso_g', 'preco', 'estoque_g'] },
  ordens:      { t: 'ordens_producao', cols: ['etapa', 'venda_id'] },
  vinculos:    { t: 'produto_canal', cols: ['produto_id', 'canal_id', 'sku_externo', 'status', 'ultimo_preco', 'ultimo_estoque', 'exportado_em'] },
  kits:        { t: 'kits', cols: ['nome'] },
  pontos:      { t: 'pontos_venda', cols: ['nome'] },
  remessas:    { t: 'consignacoes', cols: ['ponto_id'] },
};

function paraLinha(org, cfg, item) {
  const linha = { org_id: org, id: String(item.id), ativo: true, dados: {} };
  for (const [k, v] of Object.entries(item)) {
    if (k === 'id') continue;
    if (!cfg.cols.includes(k)) { linha.dados[k] = v; continue; }
    let x = v;
    if (NUM.has(k)) {
      x = x === '' || x == null ? ((k === 'numero' || k === 'estoque' || k === 'estoque_min') ? null : 0) : Number(x) || 0;
      if (x != null && NAO_NEG.has(k)) x = Math.max(0, x);
      if (k === 'taxa_pct') x = Math.min(0.95, Math.max(0, x));
      if (k === 'perda_pct') x = Math.min(1, Math.max(0, x));
      if (k === 'qtd_pacote') x = Math.max(0.0001, x);
      if (x != null && k !== 'numero') x = Math.round(x * 10000) / 10000;
    } else if (DATA.has(k) || k === 'cliente_id') x = x || null;
    linha[k] = x;
  }
  return linha;
}
function deLinha(cfg, l) {
  const item = { ...(l.dados || {}), id: l.id };
  delete item.custo_unit;
  for (const k of cfg.cols) {
    let v = l[k];
    if (NUM.has(k)) v = v == null ? ((k === 'numero' || k === 'estoque' || k === 'estoque_min') ? null : 0) : Number(v);
    else if (DATA.has(k) || k === 'cliente_id') v = v || '';
    item[k] = v;
  }
  return item;
}
const assinatura = (x) => JSON.stringify(x);

async function carregarOrg(org) {
  const saida = {};
  const pedidos = Object.entries(COLECOES).map(async ([chave, cfg]) => {
    let q = sb.from(cfg.t).select('*').eq('org_id', org).eq('ativo', true);
    // custo_unit é coluna calculada no banco: não volta para o objeto da tela
    q = cfg.desc ? q.order(cfg.desc, { ascending: false }) : q.order('criado_em', { ascending: true });
    const { data, error } = await q;
    if (error) throw new Error(`${cfg.t}: ${error.message}`);
    saida[chave] = data.map((l) => deLinha(cfg, l));
  });
  const conf = sb.from('org_config').select('empresa, params').eq('org_id', org).maybeSingle()
    .then(({ data, error }) => { if (error) throw new Error('config: ' + error.message); saida.config = data; });
  await Promise.all([...pedidos, conf]);
  return saida;
}

async function baixarLogo(path) {
  if (!path) return null;
  const { data, error } = await sb.storage.from('logos').download(path);
  if (error || !data) return null;
  return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(data); });
}
const lerComoDataUrl = (file) => new Promise((ok, erro) => {
  const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => erro(new Error('leitura')); r.readAsDataURL(file);
});

/* ===================== ENTRADA ===================== */
const CAMADAS = [['Filamento', 'var(--c-mat)', 34], ['Energia', 'var(--c-ene)', 6], ['Máquina', 'var(--c-maq)', 17],
  ['Mão de obra', 'var(--c-ope)', 27], ['Insumos', 'var(--c-ext)', 9], ['Refugo', 'var(--c-ref)', 7]];

function TelaEntrada({ recuperando, onSenhaNova, demo, onDemo }) {
  const [modo, setModo] = useState(recuperando ? 'nova' : 'entrar');
  const [f, setF] = useState({ nome: '', empresa: '', email: '', senha: '', aceite: false });
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const set = (k, v) => setF({ ...f, [k]: v });
  const volta = window.location.origin + window.location.pathname;

  const enviar = async (e) => {
    e.preventDefault(); setMsg(null);
    if (demo) { onDemo(); return; }
    if (modo === 'criar' && !f.aceite) { setMsg({ ruim: true, t: 'Marque o aceite das condições da versão de teste para criar a conta.' }); return; }
    if ((modo === 'criar' || modo === 'nova') && f.senha.length < 8) { setMsg({ ruim: true, t: 'Use uma senha com pelo menos 8 caracteres.' }); return; }
    setOcupado(true);
    try {
      if (modo === 'entrar') {
        const { error } = await sb.auth.signInWithPassword({ email: f.email.trim(), password: f.senha });
        if (error) throw error;
      } else if (modo === 'criar') {
        const { data, error } = await sb.auth.signUp({ email: f.email.trim(), password: f.senha,
          options: { emailRedirectTo: volta, data: { nome: f.nome.trim(), empresa: f.empresa.trim(), aceite_versao: TERMOS_VERSAO } } });
        if (error) throw error;
        if (!data.session) setMsg({ t: `Enviamos um link de confirmação para ${f.email.trim()}. Abra o e-mail e clique no link para entrar.` });
      } else if (modo === 'esqueci') {
        const { error } = await sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: volta });
        if (error) throw error;
        setMsg({ t: `Se ${f.email.trim()} tiver conta, chega um link para criar senha nova.` });
      } else if (modo === 'nova') {
        const { error } = await sb.auth.updateUser({ password: f.senha });
        if (error) throw error;
        onSenhaNova();
      }
    } catch (err) {
      const t = String(err.message || err);
      setMsg({ ruim: true, t: /invalid login/i.test(t) ? 'E-mail ou senha não conferem. Confira os dois ou use Esqueci a senha.'
        : /already registered/i.test(t) ? 'Este e-mail já tem conta. Entre com ele ou use Esqueci a senha.'
        : /email not confirmed/i.test(t) ? 'Falta confirmar o e-mail. Procure o link que enviamos, inclusive no spam.'
        : 'Não deu certo: ' + t });
    }
    setOcupado(false);
  };
  const troca = (m) => { setModo(m); setMsg(null); };
  const titulo = { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Recuperar senha', nova: 'Senha nova' }[modo];

  return (
    <div className="entrada">
      <section className="planta">
          <div className="marca-grande"><Marca altura={40} bicolor /></div>
        <div className="planta-meio">
          <p className="frase">O preço da peça começa na conta de cada camada.</p>
          <div className="camadas" role="img" aria-label="Composição do custo de uma peça: filamento, energia, máquina, mão de obra, insumos e refugo">
            {CAMADAS.map(([n, c, w]) => <span key={n} style={{ width: w + '%', background: c }}  />)}
          </div>
          <ol className="camadas-leg">
            {CAMADAS.map(([n, c]) => <li key={n}><i style={{ background: c }}  />{n}</li>)}
          </ol>
          <p className="sub planta-nota">Filamento com perda, energia pela tarifa da sua conta de luz, máquina pela vida útil em horas,
            sua hora, insumos pelo preço do pacote e o refugo sobre o que falha. Depois a taxa do canal, por divisão.</p>
        </div>
        <span className="planta-rodape">Gestão de produção para impressão 3D</span>
      </section>

      <section className="acesso">
        <div className="caixa">
          <h1>{demo ? 'Demonstração' : titulo}</h1>
          <p className="sub" style={{ margin: '4px 0 22px' }}>
            {demo ? 'Este endereço ainda não está ligado ao banco. Você entra com dados de exemplo, que somem ao recarregar.'
              : modo === 'criar' ? 'Grátis durante o teste. Leva um minuto.'
              : modo === 'esqueci' ? 'Mandamos um link para você criar outra senha.'
              : modo === 'nova' ? 'Escolha a senha nova.' : 'Use o e-mail e a senha da sua conta.'}</p>
          {msg && <div className={`aviso ${msg.ruim ? 'ruim' : 'bom'}`}>{msg.t}</div>}
          <form onSubmit={enviar}>
            {!demo && modo === 'criar' && <>
              <div><label htmlFor="en-nome">Seu nome</label>
                <input id="en-nome" value={f.nome} required onChange={(e) => set('nome', e.target.value)} autoComplete="name" /></div>
              <div><label htmlFor="en-emp">Nome da loja ou empresa</label>
                <input id="en-emp" value={f.empresa} required onChange={(e) => set('empresa', e.target.value)} autoComplete="organization" />
                <span className="dica">Se você recebeu convite, use o e-mail convidado. Você entra direto na empresa que convidou.</span></div>
            </>}
            {!demo && modo !== 'nova' && <div><label htmlFor="en-mail">E-mail</label>
              <input id="en-mail" type="email" value={f.email} required onChange={(e) => set('email', e.target.value)} autoComplete="email" /></div>}
            {!demo && modo !== 'esqueci' && <div>
              <div className="rot-linha"><label htmlFor="en-senha">{modo === 'nova' ? 'Senha nova' : 'Senha'}</label>
                {modo === 'entrar' && <button type="button" className="link" onClick={() => troca('esqueci')}>Esqueci a senha</button>}</div>
              <input id="en-senha" type="password" value={f.senha} required minLength={modo === 'entrar' ? 1 : 8}
                onChange={(e) => set('senha', e.target.value)} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
              {(modo === 'criar' || modo === 'nova') && <span className="dica">Pelo menos 8 caracteres.</span>}</div>}
            {!demo && modo === 'criar' && (
              <div className="aceite">
                <Check on={f.aceite} rot="Aceito as condições da versão de teste" onClick={() => set('aceite', !f.aceite)} />
                <span>Estou usando uma versão de teste, gratuita, que pode mudar e ficar fora do ar. Meus dados ficam
                  isolados na minha conta e posso pedir para apagá-los quando quiser.</span>
              </div>)}
            <button className="bt forte grande" type="submit" disabled={ocupado}>
              {ocupado ? 'Aguarde…' : demo ? 'Abrir demonstração' : { entrar: 'Entrar', criar: 'Criar conta', esqueci: 'Enviar link', nova: 'Salvar senha' }[modo]}</button>
          </form>
          {!demo && modo !== 'nova' && (
            <div className="troca">
              {modo === 'entrar'
                ? <>Primeira vez aqui? <button className="link" onClick={() => troca('criar')}>Criar conta</button></>
                : <>Já tem conta? <button className="link" onClick={() => troca('entrar')}>Entrar</button></>}
            </div>)}
        </div>
      </section>
    </div>
  );
}

/* ===================== APP ===================== */
const MENU = [
  { id: 'inicio', rot: 'Início', ico: 'casa' },
  { grupo: 'Cadastros' },
  { id: 'catalogo', rot: 'Produtos', ico: 'cubo' },
  { id: 'cad-kits', rot: 'Kits', ico: 'kit' },
  { id: 'clientes', rot: 'Clientes', ico: 'users' },
  { id: 'cad-filamentos', rot: 'Filamentos', ico: 'bobina' },
  { id: 'cad-insumos', rot: 'Insumos', ico: 'caixa' },
  { grupo: 'Comercial' },
  { id: 'funil', rot: 'Funil de vendas', ico: 'funil' },
  { id: 'simulador', rot: 'Simulador', ico: 'calc' },
  { id: 'orcamentos', rot: 'Orçamentos', ico: 'doc' },
  { id: 'vendas', rot: 'Vendas', ico: 'tag' },
  { id: 'consignacao', rot: 'Consignação', ico: 'loja' },
  { grupo: 'Operação' },
  { id: 'producao', rot: 'Fila de produção', ico: 'fila' },
  { id: 'entregas', rot: 'Entregas', ico: 'caminhao' },
  { id: 'calendario', rot: 'Calendário', ico: 'calendario' },
  { grupo: 'Gestão' },
  { id: 'financeiro', rot: 'Financeiro', ico: 'grana',
    filhos: [['fin-painel', 'Dashboard'], ['fin-receber', 'A receber'], ['fin-pagar', 'A pagar'], ['fin-previsao', 'Previsão']] },
  { id: 'relatorios', rot: 'Relatórios', ico: 'grafico',
    filhos: [['rel-vendas', 'Vendas'], ['rel-canais', 'Ganho por canal'], ['rel-metas', 'Metas'], ['rel-orcamentos', 'Orçamentos'], ['rel-produtos', 'Produtos'], ['rel-clientes', 'Clientes'], ['rel-financeiro', 'Financeiro']] },
  { grupo: 'Sistema' },
  { id: 'config', rot: 'Configurações', ico: 'eng' },
];
const ROTULO = Object.fromEntries(MENU.flatMap((m) => [[m.id, m.rot], ...(m.filhos || []).map(([k, r]) => [k, r])]));
const PAI = Object.fromEntries(MENU.flatMap((m) => (m.filhos || []).map(([k]) => [k, m.rot])));
const iniciais = (t) => String(t || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const DEMO = {
  materiais: D_MATERIAIS, impressoras: D_IMPRESSORAS, canais: D_CANAIS, formas: D_FORMAS,
  pecas: D_PECAS, clientes: D_CLIENTES, orcamentos: [], vendas: [],
  lancamentos: [{ id: 'l0', tipo: 'pagar', descricao: 'Bobina PLA preto 1 kg', valor: 96, venc: hoje(), pago: false }],
  insumos: D_INSUMOS,
  filamentos: D_FILAMENTOS,
  ordens: [], kits: [], pontos: [], remessas: [],
};
const USUARIO_DEMO = { id: 'demo', email: 'voce@exemplo.com', user_metadata: { nome: 'Você' } };

export default function App() {
  // sessão: 'carregando' | null (deslogado) | objeto de sessão | 'demo'
  const [sessao, setSessao] = useState(sb ? 'carregando' : 'fora');
  const [recuperando, setRecuperando] = useState(false);
  const [org, setOrg] = useState(sb ? null : { id: 'demo', nome: 'Loja de demonstração', papel: 'dono' }); // { id, nome, status, papel }
  const [orgs, setOrgs] = useState([]);
  const [orgPref, setOrgPref] = useState(() => { try { return localStorage.getItem('m3_org') || ''; } catch (e) { return ''; } });
  const [membros, setMembros] = useState(sb ? [] : [{ user_id: 'demo', email: USUARIO_DEMO.email, nome: 'Você', papel: 'dono' }]);
  const [convites, setConvites] = useState([]);
  const [modalInsumo, setModalInsumo] = useState(null);
  const [abertos, setAbertos] = useState({});
  const [modal, setModal] = useState(null);
  const [periodo, setPeriodo] = useState(() => ({ preset: '6m', ...periodoDe('6m') }));
  const [pronto, setPronto] = useState(!sb);
  const [erroCarga, setErroCarga] = useState('');
  const [sync, setSync] = useState({ estado: 'ok', erro: '' });

  const [tela, setTela] = useState('inicio');
  const [menuAberto, setMenuAberto] = useState(false);
  const [materiais, setMateriais] = useState(sb ? [] : DEMO.materiais);
  const [impressoras, setImpressoras] = useState(sb ? [] : DEMO.impressoras);
  const [canais, setCanais] = useState(sb ? [] : DEMO.canais);
  const [params, setParams] = useState(D_PARAMS);
  const [empresa, setEmpresa] = useState(sb ? { ...D_EMPRESA, nome: '' } : D_EMPRESA);
  const [formas, setFormas] = useState(sb ? [] : DEMO.formas);
  const [pecas, setPecas] = useState(sb ? [] : DEMO.pecas);
  const [clientes, setClientes] = useState(sb ? [] : DEMO.clientes);
  const [orcamentos, setOrcamentos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [lancamentos, setLancamentos] = useState(sb ? [] : DEMO.lancamentos);
  const [insumos, setInsumos] = useState(sb ? [] : DEMO.insumos);
  const [filamentos, setFilamentos] = useState(sb ? [] : DEMO.filamentos);
  const [vinculos, setVinculos] = useState([]);
  const [ordens, setOrdens] = useState([]); const [kits, setKits] = useState([]); const [pontos, setPontos] = useState([]); const [remessas, setRemessas] = useState([]);
  const [intencao, setIntencao] = useState(null);
  const [marcasLogo, setMarcasLogo] = useState({});
  useEffect(() => {
    if (!sb) return;
    sb.from('marcas_filamento').select('nome, logo_url').eq('ativo', true)
      .then(({ data }) => setMarcasLogo(Object.fromEntries((data || []).filter((m) => m.logo_url).map((m) => [semAcento(m.nome), m.logo_url]))), () => null);
  }, []);
  const [chave, setChave] = useState(0);
  const [logoUrl, setLogoUrl] = useState(null);
  const [msg, setMsg] = useState('');
  const [arquivo, setArquivo] = useState(null);

  const listas = { materiais, impressoras, canais, formas, pecas, clientes, orcamentos, vendas, lancamentos, insumos, filamentos, ordens, kits, pontos, remessas, vinculos };
  const setters = { materiais: setMateriais, impressoras: setImpressoras, canais: setCanais, formas: setFormas,
    pecas: setPecas, clientes: setClientes, orcamentos: setOrcamentos, vendas: setVendas, lancamentos: setLancamentos,
    insumos: setInsumos, filamentos: setFilamentos, ordens: setOrdens, kits: setKits, pontos: setPontos, remessas: setRemessas, vinculos: setVinculos };
  const usuario = sb ? (sessao && typeof sessao === 'object' ? sessao.user : null) : USUARIO_DEMO;

  /* ---------- sessão ---------- */
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSessao(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((ev, s) => {
      if (ev === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSessao(s || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------- carga da organização ---------- */
  const ultimo = useRef({});        // chave -> Map(id -> assinatura da linha)
  const ultimoConfig = useRef('');
  useEffect(() => {
    if (!sb || !sessao || typeof sessao !== 'object' || recuperando) return;
    let vivo = true;
    (async () => {
      setPronto(false); setErroCarga('');
      try {
        await sb.rpc('aceitar_convites').then(() => null, () => null);
        const { data: ms, error: e1 } = await sb.from('membros').select('org_id, papel, organizacoes(id, nome, status)')
          .eq('user_id', sessao.user.id);
        if (e1) throw new Error(e1.message);
        if (!ms || !ms.length) throw new Error('Sua conta ainda não tem empresa. Saia e entre de novo; se continuar, fale com o suporte.');
        const lista = ms.map((x) => ({ id: x.org_id, papel: x.papel, ...(x.organizacoes || {}) }));
        setOrgs(lista);
        const m = { org_id: (lista.find((o) => o.id === orgPref) || lista[0]).id };
        const escolhida = lista.find((o) => o.id === m.org_id);
        const d = await carregarOrg(m.org_id);
        if (!vivo) return;
        for (const [chave, cfg] of Object.entries(COLECOES)) {
          setters[chave](d[chave]);
          ultimo.current[chave] = new Map(d[chave].map((it) => [String(it.id), assinatura(paraLinha(m.org_id, cfg, it))]));
        }
        const emp = { ...D_EMPRESA, ...(d.config?.empresa || {}) };
        const par = { ...D_PARAMS, ...(d.config?.params || {}) };
        setEmpresa(emp); setParams(par);
        ultimoConfig.current = assinatura({ empresa: emp, params: par });
        setOrg(escolhida);
        carregarEquipe(escolhida);
        setLogoUrl(await baixarLogo(emp.logo_path));
        setSim(simVazio({ materiais: d.materiais, impressoras: d.impressoras, canais: d.canais }));
        setPronto(true);
      } catch (err) { if (vivo) setErroCarga(String(err.message || err)); }
    })();
    return () => { vivo = false; };
  }, [sessao && typeof sessao === 'object' ? sessao.user.id : null, recuperando, orgPref]);

  const carregarEquipe = async (o) => {
    if (!sb || !o) return;
    const { data: ms } = await sb.from('membros').select('user_id, email, nome, papel').eq('org_id', o.id).order('criado_em');
    setMembros(ms || []);
    if (o.papel === 'dono') {
      const { data: cs } = await sb.from('convites').select('id, email, papel').eq('org_id', o.id).is('aceito_em', null).order('criado_em');
      setConvites(cs || []);
    } else setConvites([]);
  };
  const trocarOrg = (id) => {
    try { localStorage.setItem('m3_org', id); } catch (e) { /* sem armazenamento, vale só nesta aba */ }
    setTela('inicio'); setOrgPref(id);
  };

  /* ---------- gravação: diff por lista, com espera curta ---------- */
  const timers = useRef({});
  const pendentes = useRef(0);
  const gravar = useCallback((chave, lista) => {
    if (!sb || !org) return;
    clearTimeout(timers.current[chave]);
    setSync({ estado: 'salvando', erro: '' });
    timers.current[chave] = setTimeout(async () => {
      pendentes.current++;
      const cfg = COLECOES[chave];
      const antes = ultimo.current[chave] || new Map();
      const agora = new Map();
      const mudou = [];
      for (const it of lista) {
        const l = paraLinha(org.id, cfg, it); const a = assinatura(l);
        agora.set(String(it.id), a);
        if (antes.get(String(it.id)) !== a) mudou.push(l);
      }
      const saiu = [...antes.keys()].filter((id) => !agora.has(id));
      try {
        if (mudou.length) { const { error } = await sb.from(cfg.t).upsert(mudou); if (error) throw error; }
        if (saiu.length) {
          const { error } = await sb.from(cfg.t).update({ ativo: false }).eq('org_id', org.id).in('id', saiu);
          if (error) throw error;
        }
        ultimo.current[chave] = agora;
        pendentes.current--;
        if (!pendentes.current) setSync({ estado: 'ok', erro: '' });
      } catch (err) {
        pendentes.current--;
        const t = String(err.message || err);
        setSync({ estado: 'erro', erro: /row-level security/i.test(t)
          ? 'O acesso desta conta está suspenso para gravação. Seus dados continuam aqui para consulta.'
          : `Não salvou (${cfg.t}): ${t}. A próxima alteração tenta de novo.` });
      }
    }, 700);
  }, [org]);

  const gravarConfig = useCallback((emp, par) => {
    if (!sb || !org) return;
    const a = assinatura({ empresa: emp, params: par });
    if (a === ultimoConfig.current) return;
    clearTimeout(timers.current.__config);
    setSync({ estado: 'salvando', erro: '' });
    timers.current.__config = setTimeout(async () => {
      const { error } = await sb.from('org_config').upsert({ org_id: org.id, empresa: emp, params: par });
      if (error) setSync({ estado: 'erro', erro: 'Não salvou as configurações: ' + error.message });
      else { ultimoConfig.current = a; if (!pendentes.current) setSync({ estado: 'ok', erro: '' }); }
    }, 700);
  }, [org]);

  for (const chave of Object.keys(COLECOES)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { if (pronto && org) gravar(chave, listas[chave]); }, [listas[chave], pronto, org]);
  }
  useEffect(() => { if (pronto && org) gravarConfig(empresa, params); }, [empresa, params, pronto, org]);

  useEffect(() => {
    const aviso = (e) => { if (sync.estado === 'salvando') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sync.estado]);

  /* ---------- logo da empresa ---------- */
  const enviarLogo = async (file) => {
    if (file.size > 1048576) { setMsg('A logo passa de 1 MB. Exporte menor e envie de novo.'); return; }
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) { setMsg('Use PNG, JPG, SVG ou WebP.'); return; }
    if (!sb) { setLogoUrl(await lerComoDataUrl(file)); setEmpresa({ ...empresa, usarLogo: true }); return; }
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp' }[file.type];
    const caminho = `${org.id}/logo-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('logos').upload(caminho, file, { contentType: file.type });
    if (error) { setMsg('Não consegui enviar a logo: ' + error.message); return; }
    if (empresa.logo_path) sb.storage.from('logos').remove([empresa.logo_path]);
    setEmpresa({ ...empresa, logo_path: caminho, usarLogo: true });
    setLogoUrl(await lerComoDataUrl(file));
    setMsg('Logo salva. Ela já sai no próximo orçamento em PDF.');
  };
  const removerLogo = async () => {
    if (sb && empresa.logo_path) sb.storage.from('logos').remove([empresa.logo_path]);
    setEmpresa({ ...empresa, logo_path: null });
    setLogoUrl(null);
  };

  const moverEstoque = (movs, sinal) => {
    if (!movs || !movs.length) return;
    setFilamentos((prev) => prev.map((x) => { const g = movs.filter((m) => m.filamento_id === x.id).reduce((a, m) => a + nn(m.gramas), 0);
      return g ? { ...x, estoque_g: Math.max(0, r2(estoqueDe(x) - sinal * g)) } : x; }));
  };
  const moverInsumos = (movs, sinal) => {
    if (!movs || !movs.length) return;
    setInsumos((prev) => prev.map((x) => { if (!controlaEstoque(x)) return x; const q = movs.filter((m) => m.insumo_id === x.id).reduce((a, m) => a + nn(m.qtd), 0);
      return q ? { ...x, estoque: Math.max(0, r2(nn(x.estoque) - sinal * q)) } : x; }));
  };
  const ctx = useMemo(() => ({
    materiais, setMateriais, impressoras, setImpressoras, canais, setCanais,
    params, setParams, empresa, setEmpresa, formas, setFormas, pecas, setPecas, clientes, setClientes,
    logoUrl, enviarLogo, removerLogo, insumos, setInsumos, filamentos, setFilamentos,
    pedirFilamento: (nome, depois, pre) => setModal({ tipo: 'filamento', nome, depois, pre }),
    pedirCadastro: (qual, nome, depois) => setModalCad({ qual, nome, depois }),
    moverEstoque: (movs, sinal) => moverEstoque(movs, sinal),
    moverInsumos: (movs, sinal) => moverInsumos(movs, sinal), marcasLogo, kits, setKits, pontos, setPontos,
    criarOrdens: (v) => setOrdens((prev) => [...prev, ...ordensDaVenda(v, { pecas, kits })]),
    criarOrdensAvulsas: (itens, rotulo) => setOrdens((prev) => [...prev, ...itens.map((it) => { const p = pecas.find((x) => x.id === it.peca_id);
      return { id: uid(), peca_id: it.peca_id, descricao: `${p ? p.nome : 'Peça'} · ${rotulo}`, qtd: nn(it.qtd), etapa: 'fila', criado_em: hoje(), falhas: 0 }; })]),
    tirarOrdens: (vid) => setOrdens((prev) => prev.filter((o) => o.venda_id !== vid)),
    lancar: (l) => setLancamentos((prev) => [...prev, { id: uid(), ...l }]),
    exportar: (ids) => setExportar(ids),
    enviarLogoData: (d) => enviarLogo(dataUrlParaFile(d, 'logo.' + (d.includes('image/png') ? 'png' : 'jpg'))),
    pedirInsumo: (nome, depois) => setModalInsumo({ nome, depois }),
    pedirCliente: (nome, depois) => setModal({ tipo: 'cliente', nome, depois }),
    pedirItem: (nome, canalId, depois) => setModal({ tipo: 'item', nome, canalId, depois }),
    avisar: setMsg,
  }), [materiais, impressoras, canais, params, empresa, formas, pecas, clientes, logoUrl, org, insumos, filamentos, marcasLogo, kits, pontos]);

  const [sim, setSim] = useState(() => simVazio({ materiais: DEMO.materiais, impressoras: DEMO.impressoras, canais: DEMO.canais }));
  const [prod, setProd] = useState(null);
  const [modalCad, setModalCad] = useState(null);
  const [exportar, setExportar] = useState(null);
  const [atalhos, setAtalhosSt] = useState(() => { try { return JSON.parse(localStorage.getItem('m3_atalhos')) || ['orc', 'venda', 'sim']; } catch (e) { return ['orc', 'venda', 'sim']; } });
  const setAtalhos = (xs) => { setAtalhosSt(xs); try { localStorage.setItem('m3_atalhos', JSON.stringify(xs)); } catch (e) { /* só nesta aba */ } };
  const alertas = useMemo(() => alertasDe({ ctx, orcamentos, vendas, lancamentos }), [ctx, orcamentos, vendas, lancamentos]);

  const aplicarImport = (setter, atual) => async (file, input, placa) => {
    if (!file) return;
    setMsg('Lendo ' + file.name + '…');
    try {
      const todas = placa === 'todas';
      let d = await lerFatiado(file, todas ? 0 : (placa || 0));
      let tempos = null;
      if (todas && d.placas > 1) {
        const soma = { ...d, fils: d.fils.map((x) => ({ ...x })) };
        tempos = [{ h: Math.floor(d.minutos / 60), m: Math.round(d.minutos % 60) }];
        for (let k = 1; k < d.placas; k++) {
          const e = await lerFatiadoBase(file, k);
          soma.minutos += e.minutos || 0;
          tempos.push({ h: Math.floor((e.minutos || 0) / 60), m: Math.round((e.minutos || 0) % 60) });
          for (const x of e.fils) {
            const y = soma.fils.find((z) => z.tipo === x.tipo && String(z.cor).toLowerCase() === String(x.cor).toLowerCase());
            if (y) y.gramas = (y.gramas || 0) + (x.gramas || 0); else soma.fils.push({ ...x });
          }
        }
        d = soma;
      }
      if (!d.fils.length) throw new Error(d.avisos.join(' '));
      const parcial = d.origem === 'parcial';
      const minutos = d.minutos || (d.estimado ? d.estimado.total / (nn(params.gramas_hora) || 9) * 60 : 0);
      const fils = d.fils.map((f) => {
        const m = acharMaterial(f.tipo, materiais);
        const fl = m && filamentos.find((x) => x.tipo_id === m.id && String(x.cor_hex || '').toLowerCase() === String(f.cor || '').toLowerCase());
        const cor = /^#[0-9a-f]{6}$/i.test(f.cor) ? f.cor : '#8FA3B0';
        // arquivo fatiado: gramas do fatiador, perda não soma. Projeto sem fatiar: linha manual com a perda do material.
        return parcial
          ? { key: uid(), material_id: m ? m.id : '', filamento_id: fl ? fl.id : null, preco_kg: fl ? r2(precoKgFil(fl)) : m ? m.preco_kg : 0, gramas: f.gramas ? r2(f.gramas) : '',
              perda: m ? m.perda_pct * 100 : 5, cor, auto: true, origem: 'manual' }
          : { key: uid(), material_id: m ? m.id : '', filamento_id: fl ? fl.id : null, preco_kg: fl ? r2(precoKgFil(fl)) : m ? m.preco_kg : 0,
              gramas: f.gramas ? r2(f.gramas) : 0, perda: 0, cor, auto: false, origem: 'fatiador' };
      });
      const sem = d.fils.filter((f, i) => !fils[i].material_id).map((f) => f.tipo || '?');
      setter({ ...atual, fils, modelo: d.modelo || null, ...(input ? { lote: '', modo: 'peca' } : {}),
        horasPeca: minutos ? Math.floor(minutos / 60) : '', minutosPeca: minutos ? Math.round(minutos % 60) : '',
        // arquivo fatiado traz o tempo da placa que foi fatiada, não de uma peça
        base: 'producao', placas: todas ? d.placas : 1, placasTempos: todas ? tempos : null,
        origem: d.origem !== 'gcode'
          ? { arquivo: file.name, placa: todas ? 'todas' : d.placa, placas: d.placas, parcial, estimado: !!d.estimado, dim: d.dim,
              impressora: (d.perfil && d.perfil.impressora) || d.impressora || '',
              perfil: (d.perfil && d.perfil.perfil) || '', bico: (d.perfil && d.perfil.bico) || d.bico || '',
              camada: (d.perfil && d.perfil.camada) || '' }
          : { arquivo: file.name, gcode: true } });
      if (d.origem !== 'gcode') setArquivo(file);
      const semCor = fils.filter((f) => !f.filamento_id).length;
      setMsg(parcial
        ? (d.estimado
          ? `Este .3mf não foi fatiado, então não traz peso nem tempo. Estimei pela geometria: ${nf(d.estimado.total)} g e ${hhmm(minutos / 60)} de impressão `
            + `(paredes ${d.estimado.paredes}, preenchimento ${Math.round(d.estimado.infill * 100)}%, ritmo de ${nn(params.gramas_hora) || 9} g/h). Pode errar uns 30%: fatie no Bambu Studio para o número exato.`
          : `Trouxe ${fils.length} cor(es) do projeto. Este .3mf não foi fatiado e não deu para estimar pela geometria: fatie no Bambu Studio ou preencha gramas e tempo na mão.`)
          + (semCor ? ` ${semCor} cor(es) não estão nos seus filamentos: veja o aviso em cada linha.` : '')
          + (d.extras ? ' ' + d.extras : '') + (sem.length ? ` Sem cadastro: ${sem.join(', ')}.` : '')
        : `Importado: ${fils.length} filamento(s), ${Math.floor(d.minutos / 60)}h${String(Math.round(d.minutos % 60)).padStart(2, '0')}`
          + (d.camadas ? `, ${d.camadas} camadas` : '') + '. Gramas do fatiador, sem perda somada.' + (todas ? ` Somei as ${d.placas} placas do projeto.` : ' Tempo e gramas de 1 placa.') + ' Confira quantas peças saem e quantas placas são.'
          + (sem.length ? ` Sem cadastro: ${sem.join(', ')}.` : '')
          + (d.modelo && d.modelo.imagem ? ' Foto e nome do modelo vieram do arquivo.' : ''));
    } catch (err) { setMsg('Não consegui ler: ' + (err.message || err)); }
    if (input) input.value = '';
  };

  const salvarProduto = () => {
    if (!prod.nome.trim()) { setMsg('Dê um nome ao produto antes de salvar.'); return; }
    const t = prod.tec;
    const au = autoProduto(prod, ctx);
    const reg = { id: prod.id || uid(), nome: prod.nome.trim(), sku: prod.sku || gerarSku(prod.nome, ctx, prod.id), categoria: prod.categoria || au.categoria,
      descricao: prod.descricao || au.descricao, foto: prod.foto || null, link_modelo: prod.link_modelo || null,
      modelo: t.modelo ? { titulo: t.modelo.titulo, designer: t.modelo.designer, licenca: t.modelo.licenca } : null, anuncio: prod.anuncio || null, variacoes: prod.variacoes || null, medidas: prod.medidas || null, impressora_id: t.impressora_id,
      horasPeca: nn(t.horasPeca) + nn(t.minutosPeca) / 60, placasTempos: t.placasTempos || null, pintura: !!t.pintura, pintura_tipo: t.pintura_tipo || '', pintura_tipos: t.pintura_tipos || [], precos_manuais: t.precos_manuais || {}, pintura_min: nn(t.pintura_min),
      lote: t.modo === 'lote' ? Math.max(2, Math.floor(nn(t.lote)) || 2) : 1,
      placas: Math.max(1, Math.floor(nn(t.placas)) || 1), base: baseDe(t),
      min_setup: nn(t.setup), min_pos: nn(t.pos), margem_pct: t.margem === '' ? null : nn(t.margem),
      fils: t.fils.map((f) => ({ ...f })), insumos: (t.insumos || []).map((i) => ({ ...i })) };
    setPecas(prod.id ? pecas.map((p) => (p.id === reg.id ? reg : p)) : [...pecas, reg]);
    setMsg(`Produto "${reg.nome}" salvo.`);
    setTela('catalogo'); setProd(null);
  };

  const fecharVenda = (o, opts) => {
    const numero = proxNumero(vendas);
    const venda = { id: uid(), numero, cliente_id: o.cliente_id,
      canal_id: o.canal_id, status: 'aberta', data: hoje(), origem_orc: o.numero || null,
      itens: o.itens.map((i) => ({ ...i, key: uid() })), obs: o.observacoes || '',
      prazo: o.prazo || '', entrega_em: o.entrega_em || '', formas: o.formas || [], forma_id: '', desconto_pct: o.desconto_pct || 0 };
    const rs = resultadoDoc(venda, ctx);
    const cons = consumoDoc(venda, ctx); moverEstoque(cons.movs, 1); moverInsumos(cons.movsIns, 1);
    setVendas([{ ...venda, total: rs.total, custo_total: rs.custo, lucro: rs.lucro, baixa: cons.movs, baixa_ins: cons.movsIns }, ...vendas]);
    setLancamentos([...lancamentos, { id: uid(), tipo: 'receber',
      descricao: `Venda ${numero}, do orçamento nº ${o.numero || '?'}`, valor: r2(rs.total),
      venc: hoje(), pago: false, cliente_id: o.cliente_id }]);
    setOrcamentos(orcamentos.map((x) => (x.id === o.id ? { ...x, status: 'aprovado', etapa: 'ganho', etapa_em: hoje() } : x)));
    setOrdens((prev) => [...prev, ...ordensDaVenda(venda, { pecas, kits })]);
    setMsg('Venda criada a partir do orçamento, lançada no financeiro e com o filamento baixado do estoque.');
    if (!(opts && opts.ficar)) setTela('vendas');
  };
  const criarVendaConsig = (ponto, itens) => {
    const numero = proxNumero(vendas);
    const venda = { id: uid(), numero, cliente_id: '', canal_id: '', comissao_pct: nn(ponto.comissao_pct), status: 'entregue', data: hoje(), origem: 'consignacao', ponto_id: ponto.id,
      itens, obs: `Consignação em ${ponto.nome}`, prazo: '', formas: [], forma_id: '', desconto_pct: 0, entrega: { etapa: 'entregue', entregue_em: hoje() } };
    const rs = resultadoDoc(venda, ctx);
    setVendas((prev) => [{ ...venda, total: rs.total, custo_total: rs.custo, lucro: rs.lucro }, ...prev]);
    setLancamentos((prev) => [...prev, { id: uid(), tipo: 'receber', descricao: `Acerto ${ponto.nome}`, valor: r2(rs.total - rs.taxaCanal), venc: hoje(), pago: false }]);
    setMsg(`Acerto fechado: venda nº ${numero} criada e ${brl(rs.total - rs.taxaCanal)} no a receber.`);
  };

  const sair = async () => {
    if (sync.estado === 'salvando' && !confirm('Ainda estou salvando. Sair mesmo assim?')) return;
    await sb.auth.signOut();
    setOrg(null); setOrgs([]); setMembros([]); setConvites([]); setPronto(false); setLogoUrl(null); setTela('inicio');
  };

  /* ---------- telas fora do sistema ---------- */
  const embrulho = (filho) => (
    <div className="m3"><style dangerouslySetInnerHTML={{ __html: CSS }} />{filho}</div>
  );
  if (sessao === 'carregando') return embrulho(<div className="carregando">carregando…</div>);
  if (sessao === 'fora') return embrulho(<TelaEntrada demo onDemo={() => setSessao('demo')} />);
  if (sb && (!sessao || recuperando)) return embrulho(
    <TelaEntrada recuperando={recuperando} onSenhaNova={() => { setRecuperando(false); window.history.replaceState(null, '', window.location.pathname); }} />);
  if (sb && !pronto) return embrulho(
    <div className="carregando">{erroCarga
      ? <div className="cartao" style={{ maxWidth: 440, fontFamily: 'var(--texto)' }}>
          <div className="aviso ruim">{erroCarga}</div>
          <div className="linha-bt"><button className="bt" onClick={() => window.location.reload()}>Tentar de novo</button>
            <button className="bt" onClick={sair}><Ico n="sair" s={15} /> Sair</button></div></div>
      : 'abrindo sua loja…'}</div>);

  const rotuloSync = sb
    ? (sync.estado === 'salvando' ? 'salvando' : sync.estado === 'erro' ? 'erro ao salvar' : 'tudo salvo')
    : 'demonstração, nada é salvo';

  const abrir = (id, x) => {
    if (id === 'catalogo' && x && x.novo) { setProd({ id: null, nome: '', sku: '', categoria: '', descricao: '', tec: simVazio(ctx) }); ir('produto'); return; }
    setIntencao(x || null); setChave((k) => k + 1); ir(id);
  };
  const ir = (id) => { setTela(id); setMenuAberto(false); setMsg(''); const pai = MENU.find((m) => (m.filhos || []).some(([k]) => k === id)); setAbertos(pai ? { [pai.id]: true } : {}); };
  const lateral = (
    <nav className={"lado" + (menuAberto ? " aberto" : "")} aria-label="Menu">
      <div className="marca"><Marca altura={17} /></div>
      {MENU.map((m) => {
        if (m.grupo) return <div className="grupo" key={m.grupo}>{m.grupo}</div>;
        if (!m.filhos) return (
          <button key={m.id} className={`item ${tela === m.id || (m.id === 'catalogo' && tela === 'produto') ? 'on' : ''}`}
            aria-current={tela === m.id ? 'page' : undefined} onClick={() => ir(m.id)}>
            <Ico n={m.ico} /> {m.rot}
          </button>);
        const dentro = m.filhos.some(([k]) => k === tela);
        const aberto = abertos[m.id] || dentro;
        return (
          <div key={m.id}>
            <button className={`item ${dentro ? 'pai-on' : ''} ${aberto ? 'aberto' : ''}`} aria-expanded={aberto}
              onClick={() => { if (!aberto) { setAbertos({ [m.id]: true }); ir(m.filhos[0][0]); } else if (!dentro) ir(m.filhos[0][0]); else setAbertos({ ...abertos, [m.id]: false }); }}>
              <Ico n={m.ico} /> {m.rot}
              <svg className="seta-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            {aberto && <div className="filhos">{m.filhos.map(([k, r]) => (
              <button key={k} className={`filho ${tela === k ? 'on' : ''}`} aria-current={tela === k ? 'page' : undefined} onClick={() => ir(k)}>{r}</button>))}</div>}
          </div>);
      })}
      <div className="esp" />
      <div className="pe">
        <button className={`conta-bt ${tela === 'conta' ? 'on' : ''}`} onClick={() => ir('conta')} title="Minha conta">
          <span className="avatar" aria-hidden="true">{iniciais(usuario?.user_metadata?.nome || usuario?.email)}</span>
          <span className="quem"><span className="org">{empresa.nome || org?.nome || 'Minha loja'}</span>
            <span className="sub" style={{ display: 'block', fontSize: 12 }}>Minha conta</span></span>
        </button>
        <div className={`sync ${sb ? sync.estado : 'demo'}`} role="status" aria-live="polite"><i />{rotuloSync}</div>
      </div>
    </nav>
  );
  const cabecalho = (PAI[tela] || tela === 'conta') && (
    <div className="titulo"><IcoTitulo /><div><span className="eyebrow">{PAI[tela] || empresa.nome || 'Conta'}</span>
      <h2>{tela === 'conta' ? 'Minha conta' : ROTULO[tela]}</h2></div></div>);

  return (
    <div className="m3">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        {menuAberto && <div className="veu" onClick={() => setMenuAberto(false)} />}
        {lateral}
        <div className="coluna">
        <BarraTopo ctx={ctx} alertas={alertas} ir={ir} abrir={abrir} atalhos={atalhos} setAtalhos={setAtalhos}
          orcamentos={orcamentos} vendas={vendas} onMenu={() => setMenuAberto(true)} />
        <TelaIcoCtx.Provider value={(MENU.find((m) => m.id === tela || (m.filhos || []).some(([k]) => k === tela)) || {}).ico || ({ produto: 'cubo', conta: 'users' })[tela] || ''}>
        <main className="conteudo">
          {!sb && <div className="aviso atencao">Modo demonstração. Os dados ficam só nesta aba e somem ao recarregar.</div>}
          {sync.estado === 'erro' && <div className="aviso ruim">{sync.erro}</div>}
          {msg && <div className="aviso">{msg}</div>}

          {tela === 'simulador' && (
            <TelaSimulador ctx={ctx} sim={sim} setSim={setSim}
              onImportar={aplicarImport(setSim, sim)}
              onTrocarPlaca={(i) => aplicarImport(setSim, sim)(arquivo, null, i)}
              onLimpar={() => { setSim(simVazio(ctx)); setArquivo(null); setMsg('Simulador limpo.'); }}
              onCadastrar={() => {
                setProd({ id: null, nome: nomeSugerido(sim.modelo?.titulo), foto: sim.modelo?.imagem || null, sku: '', categoria: '', descricao: '', tec: { ...sim } });
                setTela('produto'); setMsg('Complete o cadastro do produto.');
              }} />
          )}

          {tela === 'catalogo' && (
            <TelaCatalogo ctx={ctx}
              onAbrir={(p) => { setProd({ id: p.id, nome: p.nome, sku: p.sku, categoria: p.categoria, foto: p.foto, link_modelo: p.link_modelo, anuncio: p.anuncio, variacoes: p.variacoes, medidas: p.medidas,
                descricao: p.descricao || '', tec: { ...dePeca(p), canal_id: canais[0]?.id || '' } }); setTela('produto'); }}
              onNovo={() => { setProd({ id: null, nome: '', sku: '', categoria: '', descricao: '', tec: simVazio(ctx) }); setTela('produto'); }}
              onExcluir={(p) => { if (confirm(`Excluir "${p.nome}" do catálogo? Orçamentos e vendas já feitos não mudam.`)) setPecas(pecas.filter((x) => x.id !== p.id)); }} />
          )}

          {tela === 'produto' && prod && (
            <TelaProduto ctx={ctx} prod={prod} setProd={setProd}
              onSalvar={salvarProduto}
              onExcluir={() => { setPecas(pecas.filter((x) => x.id !== prod.id)); setProd(null); setTela('catalogo'); }}
              onVoltar={() => { setProd(null); setTela('catalogo'); }}
              onImportar={aplicarImport((t) => setProd((pv) => ({ ...pv, nome: (!pv.nome || pv.nome === nomeSugerido(pv.tec.modelo?.titulo)) ? nomeSugerido(t.modelo?.titulo) : pv.nome,
                foto: (t.modelo && t.modelo.imagem) || (pv.foto && pv.foto === pv.tec.modelo?.imagem ? null : pv.foto), tec: { ...pv.tec, ...t } })), prod.tec)}
              onTrocarPlaca={(i) => aplicarImport((t) => setProd((pv) => ({ ...pv, tec: { ...pv.tec, ...t } })), prod.tec)(arquivo, null, i)} />
          )}

          {tela === 'clientes' && <TelaClientes ctx={ctx} setClientes={setClientes} orcamentos={orcamentos} vendas={vendas} abrir={abrir} />}
          {tela === 'orcamentos' && <TelaOrcamentos key={'o' + chave} ctx={ctx} orcamentos={orcamentos} intencao={intencao} usarIntencao={() => setIntencao(null)}
            setOrcamentos={setOrcamentos} setClientes={setClientes} onFecharVenda={fecharVenda} />}
          {tela === 'vendas' && <TelaVendas key={'v' + chave} ctx={ctx} vendas={vendas} setVendas={setVendas} intencao={intencao} usarIntencao={() => setIntencao(null)}
            lancamentos={lancamentos} setLancamentos={setLancamentos} />}
          {cabecalho}
          {tela === 'inicio' && <TelaInicio ctx={ctx} orcamentos={orcamentos} vendas={vendas} lancamentos={lancamentos} ir={ir} abrir={abrir} alertas={alertas} />}
          {tela === 'cad-filamentos' && <TelaFilamentos ctx={ctx} />}
          {tela === 'cad-insumos' && <TelaInsumos ctx={ctx} />}
          {tela === 'fin-painel' && <FinDashboard ctx={ctx} lancamentos={lancamentos} irPara={ir} />}
          {tela === 'fin-receber' && <FinLista key={'r' + chave} intencao={intencao} usarIntencao={() => setIntencao(null)} ctx={ctx} tipo="receber" lancamentos={lancamentos} setLancamentos={setLancamentos} />}
          {tela === 'fin-pagar' && <FinLista key={'p' + chave} intencao={intencao} usarIntencao={() => setIntencao(null)} ctx={ctx} tipo="pagar" lancamentos={lancamentos} setLancamentos={setLancamentos} />}
          {tela === 'fin-previsao' && <FinPrevisao ctx={ctx} lancamentos={lancamentos} />}
          {tela === 'config' && <TelaConfig ctx={ctx} vendas={vendas} />}
          {tela === 'funil' && <TelaFunil ctx={ctx} orcamentos={orcamentos} setOrcamentos={setOrcamentos} onFecharVenda={fecharVenda} abrir={abrir} />}
          {tela === 'producao' && <TelaProducao ctx={ctx} ordens={ordens} setOrdens={setOrdens} vendas={vendas} abrir={abrir} />}
          {tela === 'entregas' && <TelaEntregas ctx={ctx} vendas={vendas} setVendas={setVendas} ordens={ordens} />}
          {tela === 'calendario' && <TelaCalendario ctx={ctx} orcamentos={orcamentos} vendas={vendas} lancamentos={lancamentos} remessas={remessas} abrir={abrir} ir={ir} />}
          {tela === 'consignacao' && <TelaConsignacao ctx={ctx} remessas={remessas} setRemessas={setRemessas} criarVendaConsig={criarVendaConsig} />}
          {tela === 'cad-kits' && <TelaKits ctx={ctx} />}
          {tela === 'rel-canais' && <RelCanais ctx={ctx} vendas={vendas} periodo={periodo} />}
          {tela === 'rel-metas' && <RelMetas ctx={ctx} vendas={vendas} />}
          {tela.startsWith('rel-') && tela !== 'rel-metas' && <FiltroPeriodo periodo={periodo} setPeriodo={setPeriodo} />}
          {tela === 'rel-vendas' && <RelVendas ctx={ctx} vendas={vendas} periodo={periodo} />}
          {tela === 'rel-orcamentos' && <RelOrcamentos ctx={ctx} orcamentos={orcamentos} periodo={periodo} />}
          {tela === 'rel-produtos' && <RelProdutos ctx={ctx} vendas={vendas} periodo={periodo} />}
          {tela === 'rel-clientes' && <RelClientes ctx={ctx} vendas={vendas} orcamentos={orcamentos} periodo={periodo} />}
          {tela === 'rel-financeiro' && <RelFinanceiro vendas={vendas} lancamentos={lancamentos} periodo={periodo} />}
          {tela === 'conta' && <TelaConta ctx={ctx} usuario={usuario} org={org} orgs={orgs} trocarOrg={trocarOrg}
            membros={membros} convites={convites} recarregarEquipe={() => carregarEquipe(org)} sair={sair} />}
        </main>
        </TelaIcoCtx.Provider>
        </div>
      </div>
      {exportar && <ExportarMarketplace ctx={ctx} ids={exportar} onFechar={() => setExportar(null)}
        onExportado={({ canal, linhas }) => {
          const agora = new Date().toISOString();
          const regs = linhas.map((l) => ({ id: uid(), produto_id: l.pid, canal_id: canal.id, sku_externo: l.sku, status: 'exportado', ultimo_preco: r2(l.preco), ultimo_estoque: l.estoque,
            exportado_em: agora, snapshot: { preco: r2(l.preco), taxa_canal: taxaTxt(canal), faixas: canal.faixas || null, imposto: params.imposto_pct, hora: params.valor_hora_operador,
              refugo: params.taxa_refugo, tarifa_kwh: params.tarifa_kwh, margem_padrao: params.margem_padrao, titulo: l.titulo, variacao: l.variacao, em: agora } }));
          setVinculos((prev) => [...prev.filter((v) => !regs.some((r) => r.produto_id === v.produto_id && r.canal_id === v.canal_id && r.sku_externo === v.sku_externo)), ...regs]);
          setExportar(null); setMsg(`${regs.length} linha(s) registradas para ${canal.nome}, com preço e parâmetros de ${new Date().toLocaleString('pt-BR')}.`); }} />}
      {modalCad && (() => { const d = CADASTROS_RAPIDOS[modalCad.qual]; return (
        <ModalCampos titulo={d.titulo} campos={d.campos} inicial={{ ...d.base, nome: modalCad.nome }} onCancelar={() => setModalCad(null)}
          onSalvar={(x) => { setters[d.lista]((prev) => [...prev, x]); modalCad.depois && modalCad.depois(x); setModalCad(null); setMsg(`"${x.nome}" cadastrado.`); }} />); })()}
      {modal?.tipo === 'filamento' && <NovoFilamento nome={modal.nome} pre={modal.pre} ctx={ctx} onCancelar={() => setModal(null)}
        onSalvar={(x) => { setFilamentos([...filamentos, x]); modal.depois && modal.depois(x); setModal(null); setMsg(`Filamento ${rotuloFil(ctx, x)} cadastrado.`); }} />}
      {modal?.tipo === 'cliente' && <NovoCliente nome={modal.nome} onCancelar={() => setModal(null)}
        onSalvar={(c) => { setClientes([...clientes, c]); modal.depois && modal.depois(c); setModal(null); setMsg(`Cliente "${c.nome}" cadastrado.`); }} />}
      {modal?.tipo === 'item' && <NovoItem nome={modal.nome} ctx={ctx} canalId={modal.canalId} onCancelar={() => setModal(null)}
        onSalvar={(r) => {
          if (r.peca) { setPecas([...pecas, r.peca]); setMsg(`Produto "${r.peca.nome}" cadastrado no catálogo.`); }
          else { setInsumos([...insumos, r.insumo]); setMsg(`Insumo "${r.insumo.nome}" cadastrado.`); }
          modal.depois && modal.depois(r); setModal(null); }} />}
      {modalInsumo && <NovoInsumo ctx={ctx} nome={modalInsumo.nome} onCancelar={() => setModalInsumo(null)}
        onSalvar={(x) => { setInsumos([...insumos, x]); modalInsumo.depois && modalInsumo.depois(x); setModalInsumo(null);
          setMsg(`Insumo "${x.nome}" cadastrado.`); }} />}
    </div>
  );
}
