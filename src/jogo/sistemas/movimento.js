// MOVIMENTO de NPCs/animais: passos curtos com colisão por tile (funciona igual com dt pequeno ou grande — NPCs distantes usam dt grande).
import { C } from "../config.js";
import { T, caminhavel } from "../mundo.js";
const TS = C.TILE;
export const livre = (M, px, py) => caminhavel(M, Math.floor(px / TS), Math.floor(py / TS));
export const tileDe = (v) => Math.floor(v / TS);
/** Se `e` está dentro de algo sólido (obra nova, parede), leva-o ao tile livre mais próximo. Devolve true se mexeu. */
export function desencalhar(M, e) {
  if (livre(M, e.x, e.y)) return false;
  const tx = tileDe(e.x), ty = tileDe(e.y);
  for (let r = 1; r <= 10; r++) {
    let melhor = null, md = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !caminhavel(M, tx + dx, ty + dy)) continue;
      const d = dx * dx + dy * dy; if (d < md) { md = d; melhor = [dx, dy]; }
    }
    if (melhor) { e.x = (tx + melhor[0] + 0.5) * TS; e.y = (ty + melhor[1] + 0.5) * TS; e.rota = null; e.nPreso = 0; e.preso = 0; return true; }
  }
  return false;
}
/** Anda em direção a (ax,ay). Devolve a distância que ainda falta. e.nPreso conta quantas vezes ficou travado. */
export function mover(J, e, ax, ay, dt, mult = 1, velBase = C.VEL_NPC) {
  if (!livre(J.M, e.x, e.y)) desencalhar(J.M, e);   // preso dentro de uma construção/árvore: sai dali
  const fx = ax, fy = ay;                       // destino final (a rota pode desviar por waypoints)
  if (e.rota && e.rota.length) {
    if (Math.hypot(fx - e.rotaAlvo.x, fy - e.rotaAlvo.y) > TS * 2) e.rota = null;
    else { const w = e.rota[0]; if (Math.hypot(w.x - e.x, w.y - e.y) < TS * 0.5) e.rota.shift(); if (e.rota.length) { ax = e.rota[0].x; ay = e.rota[0].y; } else e.rota = null; }
  }
  const dx = ax - e.x, dy = ay - e.y, d = Math.hypot(dx, dy);
  if (d < 5) { e.mov = false; return Math.hypot(fx - e.x, fy - e.y); }
  let vel = velBase * mult;
  if (J.M.terr[tileDe(e.y) * J.M.N + tileDe(e.x)] === T.RIO) vel *= C.VEL_RIO;
  const resta = Math.min(d, vel * dt), n = Math.max(1, Math.ceil(resta / 26)), ps = resta / n;
  let ang = Math.atan2(dy, dx); if (e.desvio && e.desvio.ate > J.t) ang += e.desvio.a;
  const ca = Math.cos(ang), sa = Math.sin(ang); let movido = 0; const x0 = e.x, y0 = e.y;
  for (let i = 0; i < n; i++) {
    const nx = e.x + ca * ps, ny = e.y + sa * ps;
    if (livre(J.M, nx, ny)) { e.x = nx; e.y = ny; movido += ps; }
    else if (livre(J.M, nx, e.y)) { e.x = nx; movido += ps * 0.6; }
    else if (livre(J.M, e.x, ny)) { e.y = ny; movido += ps * 0.6; }
    else break;
  }
  movido = Math.hypot(e.x - x0, e.y - y0);   // deslocamento REAL (deslizar numa árvore quase de frente não conta como andar)
  if (movido < resta * 0.35) {
    e.preso = (e.preso || 0) + dt;
    if (e.preso > 0.6) { e.desvio = { a: (J.rng() < 0.5 ? 1 : -1) * (0.9 + J.rng() * 1.3), ate: J.t + 1 + J.rng() * 1.6 }; e.preso = 0; e.nPreso = (e.nPreso || 0) + 1; if (e.nPreso >= 2 && !e.rota) rotear(J, e, fx, fy); }
  } else { e.preso = 0; }
  if (Math.abs(dx) > Math.abs(dy)) e.dir = dx < 0 ? 1 : 2; else e.dir = dy < 0 ? 3 : 0;
  e.mov = true; e.anim = (e.anim || 0) + dt * 7;
  return e.rota ? Math.hypot(fx - e.x, fy - e.y) : Math.max(0, d - movido);
}
/** Ponto (px) de uma casa caminhável vizinha do tile (para ficar ao lado de árvores, água, etc.). */
export function pontoAdjacente(M, tx, ty, deX, deY) {
  let melhor = null, md = 1e18;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue; if (!caminhavel(M, tx + ox, ty + oy)) continue;
    const px = (tx + ox + 0.5) * TS, py = (ty + oy + 0.5) * TS, d = (px - deX) ** 2 + (py - deY) ** 2;
    if (d < md) { md = d; melhor = { x: px, y: py }; }
  }
  return melhor;
}

/** Calcula uma rota (A*) quando o NPC ficou preso em bolsões de árvores. Limitado por quadro para não travar o jogo. */
function rotear(J, e, fx, fy) {
  if (J.t < (e.semRota || 0) || (J.orcRota || 0) <= 0) return;
  J.orcRota--;
  const r = acharCaminho(J.M, tileDe(e.x), tileDe(e.y), tileDe(fx), tileDe(fy));
  if (r && r.length) { e.rota = r.map(([x, y]) => ({ x: (x + 0.5) * TS, y: (y + 0.5) * TS })); e.rotaAlvo = { x: fx, y: fy }; e.nPreso = 0; }
  else e.semRota = J.t + 12;
}
export function acharCaminho(M, sx, sy, tx, ty, cap = 14000) {
  const N = M.N;
  if (!caminhavel(M, tx, ty)) { let ok = false; for (let r = 1; r <= 3 && !ok; r++) for (let oy = -r; oy <= r && !ok; oy++) for (let ox = -r; ox <= r && !ok; ox++) if (caminhavel(M, tx + ox, ty + oy)) { tx += ox; ty += oy; ok = true; } if (!ok) return null; }
  const heur = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  const g = new Map(), vem = new Map(), heap = [[heur(sx, sy), sx, sy]]; g.set(sy * N + sx, 0);
  const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  let nos = 0;
  while (heap.length && nos++ < cap) {
    const [, x, y] = pop();
    if (x === tx && y === ty) {
      const rota = []; let k = y * N + x;
      while (k !== sy * N + sx) { rota.push([k % N, Math.floor(k / N)]); k = vem.get(k); }
      rota.reverse(); return rota.filter((_, i) => i % 3 === 2 || i === rota.length - 1);
    }
    const gc = g.get(y * N + x);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue; const nx = x + ox, ny = y + oy;
      if (!caminhavel(M, nx, ny)) continue;
      if (ox && oy && (!caminhavel(M, x + ox, y) || !caminhavel(M, x, y + oy))) continue;
      const ng = gc + (ox && oy ? 1.41 : 1), kk = ny * N + nx;
      if (g.has(kk) && g.get(kk) <= ng) continue;
      g.set(kk, ng); vem.set(kk, y * N + x); push([ng + heur(nx, ny), nx, ny]);
    }
  }
  return null;
}
