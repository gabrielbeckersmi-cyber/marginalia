// SISTEMA DE HABILIDADES — valor = nível + fração (ex.: 10,3 = nível 10 com 30%). Sobe rápido no começo e devagar depois.
import { C } from "../config.js";
import { IDX } from "../dados/habilidades.js";
export const nivel = (v) => Math.min(100, Math.floor(v));
export const pct = (v) => (v >= 100 ? 1 : v - Math.floor(v));
export const hab = (e, id) => e.hab[IDX[id]];
/** Multiplicador de velocidade das ações (nível 1 ≈ 1,06×; nível 50 ≈ 4×; nível 100 ≈ 7×). */
export const velocidade = (v) => 1 + v * C.VEL_HAB;
export function ganhar(e, id, peso = 1) {
  const i = IDX[id], v = e.hab[i]; if (v >= 100) return 0;
  const dv = (C.XP_K * peso) / Math.pow(v, C.XP_EXP);
  e.hab[i] = Math.min(100, v + dv); return dv;
}
export const atende = (e, req) => Object.entries(req).every(([h, n]) => nivel(hab(e, h)) >= n);
export const faltaReq = (e, req) => Object.entries(req).filter(([h, n]) => nivel(hab(e, h)) < n);

// Aprender com outra pessoa: ganho proporcional à diferença (ex.: 10,3 → mestre 50: +1,15 nível ≈ 11 com 45%).
export function ofertaEnsino(J, aprendiz, mestre, id) {
  const diff = hab(mestre, id) - hab(aprendiz, id);
  if (diff < 2) return null;
  const infl = J.eco ? J.eco.infl : 1;
  return { diff, ganho: diff * C.ENSINO.fator, custo: Math.max(1, Math.round((C.ENSINO.custoBase + diff * C.ENSINO.custoNivel) * infl)) };
}
export function ensinar(J, aprendiz, mestre, id) {
  const o = ofertaEnsino(J, aprendiz, mestre, id);
  if (!o || o.bloqueado) return { ok: false, motivo: o ? o.bloqueado : "Nada a aprender" };
  if (aprendiz.ouro < o.custo) return { ok: false, motivo: "Ouro insuficiente" };
  aprendiz.ouro -= o.custo; mestre.ouro += o.custo;
  aprendiz.hab[IDX[id]] = Math.min(hab(mestre, id), hab(aprendiz, id) + o.ganho);
  return { ok: true, ...o };
}
