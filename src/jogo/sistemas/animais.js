// ANIMAIS — só existem "de verdade" perto do jogador (chunks ativos); longe são só contadores no mapa (M.animais), o que poupa memória.
// Comportamentos: passivo (foge), neutro (só revida), agressivo (ataca quem chega perto).
import { C } from "../config.js";
import { ANIMAIS, ESPECIES } from "../dados/animais.js";
import { CH, caminhavel, T } from "../mundo.js";
import { livre, mover } from "./movimento.js";
import { chanceAcerto } from "./combate.js";
import { hab } from "./habilidades.js";
const TS = C.TILE;

export function atualizarAnimais(J, dt) {
  const p = J.jogador, M = J.M, nc = M.nc, ne = ESPECIES.length;
  const cx = Math.floor(p.x / TS / CH), cy = Math.floor(p.y / TS / CH);
  J.tAnim = (J.tAnim || 0) - dt;
  if (J.tAnim <= 0) {          // a cada ~1,5 s sincroniza quais chunks estão ativos
    J.tAnim = 1.5;
    const ativos = new Set();
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= nc || y >= nc) continue;
      const k = y * nc + x; ativos.add(k);
      if (!J.chunksAtivos.has(k)) { J.chunksAtivos.add(k); spawnChunk(J, x, y); }
    }
    for (const k of [...J.chunksAtivos]) if (!ativos.has(k)) { J.chunksAtivos.delete(k); J.animais = J.animais.filter((a) => a.ch !== k); }
  }
  for (const a of J.animais) { if (a.morto) continue; ia(J, a, dt); }
  J.animais = J.animais.filter((a) => !a.morto);
}
function spawnChunk(J, cx, cy) {
  const M = J.M, nc = M.nc, ne = ESPECIES.length;
  for (let k = 0; k < ne; k++) {
    const n = M.animais[(cy * nc + cx) * ne + k];
    for (let i = 0; i < n; i++) for (let tent = 0; tent < 12; tent++) {
      const tx = cx * CH + Math.floor(J.rng() * CH), ty = cy * CH + Math.floor(J.rng() * CH);
      if (!caminhavel(M, tx, ty) || !ANIMAIS[ESPECIES[k]].bioma.includes(M.terr[ty * M.N + tx])) continue;
      const A = ANIMAIS[ESPECIES[k]];
      J.animais.push({ esp: ESPECIES[k], k, ch: cy * nc + cx, cx, cy, x: (tx + 0.5) * TS, y: (ty + 0.5) * TS, hp: A.hp, hpMax: A.hp, dir: 2, anim: J.rng() * 4, estado: "vagar", alvo: null, t: J.rng() * 3, cool: 0, flash: 0, mov: false });
      break;
    }
  }
}
function ia(J, a, dt) {
  const A = ANIMAIS[a.esp], p = J.jogador, dj = Math.hypot(p.x - a.x, p.y - a.y);
  a.flash = Math.max(0, a.flash - dt); a.cool -= dt; a.mov = false;
  if (a.estado === "vagar") {
    if (A.comp === "passivo" && dj < 5 * TS) { a.estado = "fugir"; a.ate = J.t + 3; }
    else if (A.comp === "agressivo" && dj < 7 * TS && !p.escondido) { a.estado = "perseguir"; a.ate = J.t + 12; }
    else {
      a.t -= dt;
      if (a.t <= 0 || !a.alvo) { a.t = 2 + J.rng() * 5; const ang = J.rng() * 6.283, d = TS * (2 + J.rng() * 6); a.alvo = { x: a.x + Math.cos(ang) * d, y: a.y + Math.sin(ang) * d }; if (J.rng() < 0.4) a.alvo = null; }
      if (a.alvo) mover(J, a, a.alvo.x, a.alvo.y, dt, 0.4, A.vel);
    }
  } else if (a.estado === "fugir") {
    mover(J, a, a.x + (a.x - p.x) * 3, a.y + (a.y - p.y) * 3, dt, 1, A.vel);
    if (J.t > a.ate && dj > 7 * TS) a.estado = "vagar";
  } else if (a.estado === "perseguir") {
    if (J.t > a.ate || dj > 14 * TS) { a.estado = "vagar"; return; }
    if (dj > TS * 1.1) mover(J, a, p.x, p.y, dt, 1, A.vel);
    else if (a.cool <= 0) { a.cool = 1.3; if (J.rng() < chanceAcerto(18 + A.dano * 2, hab(p, "combate"))) { J.efeitos.push({ x: p.x, y: p.y - 20, tipo: "dano", t: 0.3 }); J.danoJogador(A.dano * (0.8 + J.rng() * 0.4), a.nome || A.nome); } else J.efeitos.push({ x: p.x, y: p.y - 40, tipo: "num", texto: "Desviou!", t: 0.7 }); }
  }
  if (a.mov && Math.abs(a.x - (a.px || a.x)) > 0.1) a.dir = a.x >= (a.px ?? a.x) ? 2 : 1;
  a.px = a.x;
}
export function retirarAnimalAtivo(J, cx, cy, k) {
  const i = J.animais.findIndex((a) => a.cx === cx && a.cy === cy && a.k === k && !a.morto);
  if (i >= 0) J.animais.splice(i, 1);
}
/** Fim do dia: a natureza repõe devagar os animais caçados. */
export function reporAnimais(J) {
  const M = J.M; for (let i = 0; i < M.animais.length; i++) if (M.animais[i] < M.animaisMax[i] && J.rng() < 0.35) M.animais[i]++;
}
