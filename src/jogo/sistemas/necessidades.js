// NECESSIDADES — fome, sede e cansaço de 0 a 100 (fome/sede em 100 = tirando vida). Mesmas regras para o jogador e os NPCs.
// Base: 32 h sem água e 72 h sem comida; 1 hora de jogo = 60 s reais.
import { C } from "../config.js";
import { ITENS } from "../dados/itens.js";
import * as inv from "./inventario.js";
const H = 60;
const TX = { fome: 100 / (C.FOME_HORAS * H), sede: 100 / (C.SEDE_HORAS * H), cans: 100 / (C.CANSACO_HORAS * H), sono: 100 / (C.SONO_HORAS * H) };
export const DOSE_CANTIL = 30;

/** Devolve true se a pessoa morreu agora. */
export function atualizar(e, dt) {
  if (e.dormindo) {
    e.cans = Math.max(0, e.cans - TX.sono * dt);
    e.fome = Math.min(100, e.fome + TX.fome * dt * 0.5); e.sede = Math.min(100, e.sede + TX.sede * dt * 0.5);
    if (e.cans <= 4 || e.sede > 88 || e.fome > 92) e.dormindo = false;
  } else {
    e.fome = Math.min(100, e.fome + TX.fome * dt); e.sede = Math.min(100, e.sede + TX.sede * dt);
    e.cans = Math.min(100, e.cans + TX.cans * dt);
    if (e.cans >= 100 && e.sede < 85 && e.fome < 90) e.dormindo = true;   // desmaia de cansaço
  }
  if (e.fome >= 100 || e.sede >= 100) e.hp -= 1.4 * dt;
  else if (e.fome < 70 && e.sede < 70 && e.hp < e.hpMax) e.hp = Math.min(e.hpMax, e.hp + (e.dormindo ? 1.2 : 0.35) * dt);
  return e.hp <= 0;
}
export function comer(e, item) {
  const d = ITENS[item]; if (!d || !d.fome || !inv.tirar(e, item, 1)) return false;
  e.fome = Math.max(0, e.fome - d.fome); return true;
}
/** Melhor comida do inventário para a fome atual (evita desperdiçar ensopado com pouca fome). */
export function melhorComida(e) {
  let melhor = null, ms = -1e9;
  for (const k in e.inv) {
    const d = ITENS[k]; if (!d || !d.fome) continue;
    const desperdicio = Math.max(0, d.fome - e.fome), s = -desperdicio * 2 + Math.min(d.fome, e.fome);
    if (s > ms) { ms = s; melhor = k; }
  }
  return melhor;
}
export function beberRio(e) { e.sede = 0; e.cantil = 3; }                       // 100% e enche o cantil
export function beberCantil(e) { if (e.cantil <= 0) return false; e.cantil--; e.sede = Math.max(0, e.sede - DOSE_CANTIL); return true; }
