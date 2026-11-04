// FERRAMENTAS — qual ferramenta serve para quê, desgaste (quebram!), fabricação à mão e cozimento na fogueira. Vale para o jogador e para os colonos.
// Cada item com `ferramenta` + `tier` (1 = pedra, 2 = ferro) pode ser usado; `durab` = quantos usos até quebrar. O desgaste fica em e.dur[item].
import { ITENS } from "../dados/itens.js";
import { COLETA } from "../dados/coleta.js";
import { NOME_HAB } from "../dados/habilidades.js";
import * as inv from "./inventario.js";
import { nivel, hab, velocidade, ganhar } from "./habilidades.js";
import { equipado } from "./equipamento.js";
import { registrarOferta, registrarDemanda } from "./economia.js";

export const NOME_FERR = { lenhador: ["machado de pedra (ou melhor)", "machado de ferro"], mineracao: ["picareta de pedra (ou melhor)", "picareta de ferro"], pesca: ["vara de pesca"] };

/** Melhor ferramenta do tipo (com qualidade ≥ tierMin) que `e` carrega. Dá preferência à que está equipada na mão. */
export function ferramentaPara(e, tipo, tierMin = 1) {
  const eq = equipado(e, "mao");
  if (eq && ITENS[eq].ferramenta === tipo && (ITENS[eq].tier || 0) >= tierMin) return eq;
  let melhor = null, mt = 0;
  for (const k in e.inv) { const d = ITENS[k]; if (d && d.ferramenta === tipo && d.tier && d.tier >= tierMin && d.tier > mt) { mt = d.tier; melhor = k; } }
  return melhor;
}
/** Dá para coletar o elemento `f` do mapa? { ok, motivo, ferr } — checa ferramenta (tipo/qualidade) e nível mínimo da habilidade. */
export function podeColetar(e, f) {
  const c = COLETA[f]; if (!c) return { ok: false, motivo: "Não dá para coletar" };
  let ferr = null;
  if (c.ferr) {
    ferr = ferramentaPara(e, c.ferr, c.tier || 1);
    if (!ferr) { const n = NOME_FERR[c.ferr] || []; return { ok: false, motivo: `Precisa de ${n[(c.tier || 1) - 1] || n[0] || "ferramenta"}` }; }
  }
  if (c.min && nivel(hab(e, c.hab)) < c.min) return { ok: false, motivo: `Precisa de ${NOME_HAB[c.hab]} nível ${c.min}` };
  return { ok: true, ferr };
}
/** Multiplicador de velocidade da ferramenta (ferro = +40%). */
export const bonusFerr = (item) => (item ? 1 + 0.4 * ((ITENS[item].tier || 1) - 1) : 1);
export const durabilidade = (e, item) => (e.dur && e.dur[item] !== undefined ? e.dur[item] : ITENS[item].durab || 0);

/** Gasta `uso` da durabilidade de um item. Se quebrar, some da mochila. Devolve true se quebrou. */
export function usarFerramenta(J, e, item, uso = 1) {
  const d = ITENS[item]; if (!d || !d.durab || !inv.tem(e, item)) return false;
  e.dur = e.dur || {};
  const resta = durabilidade(e, item) - uso;
  if (resta > 0) { e.dur[item] = resta; return false; }
  inv.tirar(e, item, 1); delete e.dur[item];
  if (e === J.jogador) J.avisos.push({ tipo: "item", texto: `Seu ${d.nome.toLowerCase()} quebrou!` });
  else { J.stats.ferramentasQuebradas = (J.stats.ferramentasQuebradas || 0) + 1; registrarDemanda(J, item, 1); }
  return true;
}

// ── fabricação à mão (qualquer um, em qualquer lugar) ──
export const RECEITAS_MAO = [
  { saida: "machado_pedra", qtd: 1, ins: { galho: 2, pedra: 2, fibra: 3 }, hab: "carpintaria" },
  { saida: "picareta_pedra", qtd: 1, ins: { galho: 2, pedra: 3, fibra: 3 }, hab: "carpintaria" },
  { saida: "vara_pesca", qtd: 1, ins: { galho: 2, fibra: 4 }, hab: "pesca" },
];
// ── fogueira: cozinhar (gasta 1 galho de lenha por prato) ──
export const RECEITAS_FOGUEIRA = [
  { saida: "carne_assada", qtd: 1, ins: { carne_crua: 1, galho: 1 }, base: 8, hab: "culinaria" },
  { saida: "peixe_assado", qtd: 1, ins: { peixe_cru: 1, galho: 1 }, base: 7, hab: "culinaria" },
];
export const receitaMao = (saida) => RECEITAS_MAO.find((r) => r.saida === saida);
export function fabricarMao(J, e, r) {
  if (!inv.temTudo(e, r.ins)) return { ok: false, motivo: "Faltam materiais" };
  inv.gastar(e, r.ins);
  const got = inv.dar(e, r.saida, r.qtd); registrarOferta(J, r.saida, got);
  ganhar(e, r.hab, 0.8); e.trabalhouHoje = true;
  return { ok: true, qtd: got };
}
/** Cozinha por dt segundos na fogueira (resultado vai para a mochila de quem cozinha). Devolve { erro } | { p } | { fim, saida, qtd }. */
export function cozinhar(J, e, r, dt) {
  if (!e.cook || e.cook.a !== r.saida) e.cook = { a: r.saida, p: 0, gasto: false };
  const f = e.cook;
  if (!f.gasto) { if (!inv.temTudo(e, r.ins)) { e.cook = null; return { erro: "Faltam ingredientes" }; } inv.gastar(e, r.ins); f.gasto = true; }
  f.p += (dt * velocidade(hab(e, r.hab))) / r.base; e.trabalhouHoje = true;
  if (f.p >= 1) { const got = inv.dar(e, r.saida, r.qtd); registrarOferta(J, r.saida, got); ganhar(e, r.hab, 1.2); e.cook = null; return { fim: true, saida: r.saida, qtd: got }; }
  return { p: f.p };
}
