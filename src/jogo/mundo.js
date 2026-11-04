// MUNDO — geração do mapa (reprodutível por semente) e consultas. Código puro (sem canvas): roda também nos testes.
// Terreno e elementos (árvores, arbustos, minérios) ficam em arrays compactos; só as mudanças (diff) vão para o save.
import { C } from "./config.js";
import { hash2, fbm, mulberry32, limitar } from "./rng.js";
import { FEAT, GRUPOS } from "./dados/arte.js";
import { ESPECIES, ANIMAIS } from "./dados/animais.js";

export const T = { MAR: 0, AREIA: 2, GRAMA: 3, FLORESTA: 4, PEDRA: 5, RIO: 6, LAGO: 7 };
export const CG = 8;          // tamanho da célula "grossa" (tiles) usada em buscas
export const CH = 32;         // tamanho do chunk de animais (tiles)
const R = 4;                  // redução dos campos de ruído (suaves) para gerar rápido

const sm = (a, b, x) => { const t = limitar((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function campo(N, f) { const w = Math.ceil(N / R) + 2, a = new Float32Array(w * w); for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) a[j * w + i] = f(i * R, j * R); return { a, w }; }
function ler(c, x, y) { const fx = x / R, fy = y / R, i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * c.w + i, a = c.a, w = c.w; return a[k] * (1 - u) * (1 - v) + a[k + 1] * u * (1 - v) + a[k + w] * (1 - u) * v + a[k + w + 1] * u * v; }

const GRUPOS_DE = {};
for (const [id, d] of Object.entries(FEAT)) GRUPOS_DE[id] = d.grupos.map((g) => GRUPOS.indexOf(g));
const BLOQ = new Uint8Array(32); for (const [id, d] of Object.entries(FEAT)) if (d.bloq) BLOQ[id] = 1;

export function gerarMundo(semente) {
  const N = C.N, rng = mulberry32(semente ^ 0x9e3779b1);
  const cw = campo(N, (x, y) => fbm(x / 300 + 9.3, y / 300 + 4.1, semente + 1, 2));
  const ch = campo(N, (x, y) => fbm(x / 190, y / 190, semente + 2, 4));
  const cm = campo(N, (x, y) => fbm(x / 150, y / 150, semente + 3, 3));
  const cf = campo(N, (x, y) => fbm(x / 95, y / 95, semente + 4, 3));
  const terr = new Uint8Array(N * N), hv = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, nx = (x / N - 0.5) * 2, ny = (y / N - 0.5) * 2;
    const d = Math.hypot(nx, ny), warp = (ler(cw, x, y) - 0.5) * 0.55;
    let h = (1 - sm(0.5, 0.95, d + warp)) * 0.7 + ler(ch, x, y) * 0.4;
    if (x < 24 || y < 24 || x >= N - 24 || y >= N - 24) h = 0;
    hv[i] = h;
    terr[i] = h < 0.36 ? T.MAR : h < 0.42 ? T.AREIA : (h > 0.88 && ler(cm, x, y) > 0.58) ? T.PEDRA : ler(cf, x, y) > 0.54 ? T.FLORESTA : T.GRAMA;
  }
  // Rios: descem da serra até o mar (vau: dá para atravessar devagar). Se empacam, viram lago.
  const fontes = [];
  for (let k = 0; k < 4000 && fontes.length < 16; k++) {
    const x = 200 + Math.floor(rng() * (N - 400)), y = 200 + Math.floor(rng() * (N - 400));
    if (hv[y * N + x] > 0.74 && fontes.every((f) => Math.hypot(f.x - x, f.y - y) > 140)) fontes.push({ x, y });
  }
  const carregar = (cx, cy, r, tipo) => { const ri = Math.ceil(r); for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++) { const x = cx + dx, y = cy + dy; if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || dx * dx + dy * dy > r * r + 0.5) continue; const i = y * N + x; if (terr[i] !== T.MAR && !(terr[i] === T.LAGO && tipo === T.RIO)) terr[i] = tipo; } };
  for (const f of fontes) {
    let x = f.x, y = f.y, dir = rng() * 6.28; const visto = new Set();
    for (let p = 0; p < 4500; p++) {
      carregar(x, y, 1.4, T.RIO);
      let melhor = null, mh = 9;
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4, nx = Math.round(x + Math.cos(ang) * 2), ny = Math.round(y + Math.sin(ang) * 2);
        if (nx < 2 || ny < 2 || nx >= N - 2 || ny >= N - 2 || visto.has(ny * N + nx)) continue;
        const h = hv[ny * N + nx] + rng() * 0.012 + Math.abs(Math.atan2(Math.sin(ang - dir), Math.cos(ang - dir))) * 0.004;
        if (h < mh) { mh = h; melhor = [nx, ny, ang]; }
      }
      if (!melhor) break;
      for (let s = 0; s <= 2; s++) visto.add(Math.round(y + (melhor[1] - y) * s / 2) * N + Math.round(x + (melhor[0] - x) * s / 2));
      const parou = mh >= hv[y * N + x] + 0.01 && p > 30;
      x = melhor[0]; y = melhor[1]; dir = melhor[2];
      if (terr[y * N + x] === T.MAR) break;
      if (parou) { carregar(x, y, 6, T.LAGO); break; }
    }
  }
  // Porto: único ponto de chegada dos navios, na costa sul.
  const px = Math.floor(N / 2 + (rng() - 0.5) * 200); let py = N - 30;
  while (py > 0 && terr[py * N + px] === T.MAR) py--;
  const porto = { tx: px, ty: py, ax: px, ay: py + 1 };
  for (let dy = -10; dy <= 3; dy++) for (let dx = -11; dx <= 11; dx++) if (dx * dx + dy * dy <= 110 && dy <= 1) terr[(py + dy) * N + px + dx] = T.AREIA;

  // Elementos do mapa
  const feat = new Uint8Array(N * N), gc = Math.ceil(N / CG);
  const grupoG = {}; GRUPOS.forEach((g) => { grupoG[g] = new Uint16Array(gc * gc); });
  const agua = new Uint16Array(gc * gc);
  const agu = (t) => t === T.RIO || t === T.LAGO;
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) {
    const i = y * N + x, t = terr[i], cel = Math.floor(y / CG) * gc + Math.floor(x / CG);
    if (agu(t)) { agua[cel]++; continue; }
    if (t === T.MAR) continue;
    const r = hash2(x, y, semente + 11), r2 = hash2(x, y, semente + 23);
    const perto = agu(terr[i - 2]) || agu(terr[i + 2]) || agu(terr[i - 2 * N]) || agu(terr[i + 2 * N]);
    let f = 0;
    // (árvores 1–4 entram depois, numa grade espaçada; aqui só mato, pedras e minérios)
    if (t === T.FLORESTA) {
      if (r < 0.015) f = 6; else if (r < 0.025) f = 5; else if (r < 0.04) f = 7; else if (r < 0.07) f = 14; else if (r < 0.085) f = 8; else if (r < 0.09) f = 13;
      else if (r < 0.099) f = 17; else if (r < 0.117) f = 21; else if (r < 0.150) f = 23;
    } else if (t === T.GRAMA) {
      if (r < 0.008) f = 6; else if (r < 0.014) f = 5; else if (r < 0.018) f = 7; else if (r < 0.023) f = 8; else if (r < 0.026) f = 15; else if (r < 0.028) f = 16;
      else if (r < 0.036) f = 17; else if (r < 0.056) f = 21; else if (r < 0.12) f = r2 < 0.4 ? 12 : r2 < 0.75 ? 13 : 14; else if (r < 0.135) f = 23;
      else if (perto && r < 0.14) f = 20; else if (perto && r < 0.22) f = 9;
    } else if (t === T.AREIA) {
      if (perto && r < 0.2) f = 9; else if (r < 0.004) f = 17; else if (r < 0.02) f = 21; else if (r < 0.023) f = 22;
    } else if (t === T.PEDRA) {
      if (r < 0.10) f = 17; else if (r < 0.12) f = 18; else if (r < 0.135) f = 19; else if (r < 0.2) f = 21; else if (r < 0.203) f = 22;
    }
    // zona do porto livre
    if (f && Math.hypot(x - px, y - py) < 13) f = 0;
    feat[i] = f;
    if (f) for (const g of GRUPOS_DE[f]) grupoG[GRUPOS[g]][cel]++;
  }
  // Árvores: no máximo uma por célula CEL×CEL, em posição sorteada dentro dela → sempre sobra espaço entre os troncos
  const CEL = C.ARVORE_CEL, zona = CEL - 1;
  for (let cy = 0; cy * CEL < N; cy++) for (let cx = 0; cx * CEL < N; cx++) {
    const x = cx * CEL + Math.floor(hash2(cx, cy, semente + 31) * zona), y = cy * CEL + Math.floor(hash2(cx, cy, semente + 32) * zona);
    if (x < 2 || y < 2 || x >= N - 2 || y >= N - 2) continue;
    const i = y * N + x, t = terr[i]; if (t !== T.FLORESTA && t !== T.GRAMA) continue;
    if (Math.hypot(x - px, y - py) < 13) continue;
    const p = hash2(cx, cy, semente + 33); if (p >= (t === T.FLORESTA ? 0.86 : 0.30)) continue;
    const q = hash2(cx, cy, semente + 34), arv = q < 0.46 ? 1 : q < 0.80 ? 2 : q < 0.88 ? 3 : q < 0.94 ? 4 : t === T.FLORESTA ? 24 : 1, cel = Math.floor(y / CG) * gc + Math.floor(x / CG);
    if (feat[i]) for (const g of GRUPOS_DE[feat[i]]) if (grupoG[GRUPOS[g]][cel] > 0) grupoG[GRUPOS[g]][cel]--;
    feat[i] = arv; for (const g of GRUPOS_DE[arv]) grupoG[GRUPOS[g]][cel]++;
  }
  // Animais: quantidade inicial por chunk (viva só perto do jogador; o resto é abstrato)
  const nc = Math.ceil(N / CH), animais = new Uint8Array(nc * nc * ESPECIES.length);
  for (let cy = 0; cy < nc; cy++) for (let cx = 0; cx < nc; cx++) {
    ESPECIES.forEach((e, k) => {
      const A = ANIMAIS[e]; let fr = 0;
      for (let s = 0; s < 9; s++) { const x = Math.min(N - 1, cx * CH + 5 + (s % 3) * 11), y = Math.min(N - 1, cy * CH + 5 + Math.floor(s / 3) * 11); if (A.bioma.includes(terr[y * N + x])) fr++; }
      animais[(cy * nc + cx) * ESPECIES.length + k] = Math.round(A.dens * fr * (0.6 + hash2(cx, cy, semente + 40 + k) * 0.9));
    });
  }
  return { N, semente, terr, feat, feat0: feat.slice(), occ: new Uint16Array(N * N), diff: new Map(), regrow: new Map(), porto, grupoG, agua, gc, nc, animais, animaisMax: animais.slice() };
}

export const noMapa = (M, tx, ty) => tx >= 0 && ty >= 0 && tx < M.N && ty < M.N;
export const terreno = (M, tx, ty) => (noMapa(M, tx, ty) ? M.terr[ty * M.N + tx] : T.MAR);
export const aguaDoce = (M, tx, ty) => { const t = terreno(M, tx, ty); return t === T.RIO || t === T.LAGO; };
export function caminhavel(M, tx, ty) {
  if (!noMapa(M, tx, ty)) return false;
  const i = ty * M.N + tx, t = M.terr[i];
  return t !== T.MAR && t !== T.LAGO && !BLOQ[M.feat[i]] && (M.occ[i] === 0 || (M.livre !== undefined && M.livre.has(i)));   // livre: interior/porta de construções entráveis (só o protótipo 3D usa)
}
export const featEm = (M, tx, ty) => (noMapa(M, tx, ty) ? M.feat[ty * M.N + tx] : 0);

/** Troca o elemento de um tile mantendo contadores de busca e o diff do save. */
export function setFeat(M, tx, ty, val) {
  const i = ty * M.N + tx, ant = M.feat[i];
  if (ant === val) return;
  const cel = Math.floor(ty / CG) * M.gc + Math.floor(tx / CG);
  if (ant) for (const g of GRUPOS_DE[ant]) { const a = M.grupoG[GRUPOS[g]]; if (a[cel] > 0) a[cel]--; }
  if (val) for (const g of GRUPOS_DE[val]) M.grupoG[GRUPOS[g]][cel]++;
  M.feat[i] = val;
  if (val === M.feat0[i]) M.diff.delete(i); else M.diff.set(i, val);
}
/** Agenda a volta de um elemento (árvore cortada, moita colhida) ao estado original. */
export function agendarRebrota(M, tx, ty, ate) { M.regrow.set(ty * M.N + tx, ate); }
export function cancelarRebrota(M, tx, ty) { M.regrow.delete(ty * M.N + tx); }
/** Aplica o resultado de uma coleta no tile: troca pelo que sobra (c.vira) e agenda a volta (a menos que c.semRebrota). */
export function aplicarColeta(M, tx, ty, c, agora) {
  setFeat(M, tx, ty, c.vira);
  if (c.semRebrota) cancelarRebrota(M, tx, ty); else agendarRebrota(M, tx, ty, agora + c.dias * C.DIA_SEG);
}
export function processarRebrotas(M, agora) {
  for (const [i, ate] of M.regrow) {
    if (ate > agora) continue;
    M.regrow.delete(i);
    const tx = i % M.N, ty = (i - tx) / M.N, orig = M.feat0[i];
    if (M.occ[i] === 0) setFeat(M, tx, ty, orig);
  }
}

/** Procura o elemento mais próximo de um grupo ("madeira", "pedra"...) usando as células grossas. */
export function acharGrupo(M, grupo, tx, ty, raioCel = 30, rng = Math.random, filtro = null) {
  const arr = M.grupoG[grupo], gc = M.gc, cx = Math.floor(tx / CG), cy = Math.floor(ty / CG);
  for (let r = 0; r <= raioCel; r++) {
    const cand = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= gc || y >= gc) continue;
      if (arr[y * gc + x] > 0) cand.push([x, y]);
    }
    if (!cand.length) continue;
    const [gx, gy] = cand[Math.floor(rng() * cand.length)];
    let melhor = null, md = 1e9;
    for (let y = gy * CG; y < Math.min(M.N, gy * CG + CG); y++) for (let x = gx * CG; x < Math.min(M.N, gx * CG + CG); x++) {
      const f = M.feat[y * M.N + x]; if (!f || !GRUPOS_DE[f].includes(GRUPOS.indexOf(grupo)) || (filtro && !filtro(f))) continue;
      const d = (x - tx) ** 2 + (y - ty) ** 2; if (d < md) { md = d; melhor = { tx: x, ty: y, feat: f }; }
    }
    if (melhor) return melhor;
  }
  return null;
}
/** Água doce (rio/lago) mais próxima: devolve o tile de água e um ponto caminhável ao lado dela. */
export function acharAgua(M, tx, ty, raioCel = 30) {
  const gc = M.gc, cx = Math.floor(tx / CG), cy = Math.floor(ty / CG);
  for (let r = 0; r <= raioCel; r++) {
    let melhor = null, md = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= gc || y >= gc || !M.agua[y * gc + x]) continue;
      for (let yy = y * CG; yy < y * CG + CG; yy++) for (let xx = x * CG; xx < x * CG + CG; xx++) {
        if (!aguaDoce(M, xx, yy)) continue;
        const d = (xx - tx) ** 2 + (yy - ty) ** 2; if (d >= md) continue;
        for (const [ox, oy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (caminhavel(M, xx + ox, yy + oy)) { md = d; melhor = { tx: xx, ty: yy, px: xx + ox, py: yy + oy }; break; }
      }
    }
    if (melhor) return melhor;
  }
  return null;
}
export const pertoDeAgua = (M, tx, ty, r = 12) => { for (let k = 0; k < 24; k++) { const a = k * 0.26, d = (k % 4 + 1) * r / 4; if (aguaDoce(M, Math.round(tx + Math.cos(a) * d), Math.round(ty + Math.sin(a) * d))) return true; } return false; };

/** Ponto caminhável aleatório perto de (tx,ty). */
export function pontoLivre(M, tx, ty, rmin, rmax, rng = Math.random) {
  for (let k = 0; k < 40; k++) {
    const a = rng() * 6.283, d = rmin + rng() * (rmax - rmin), x = Math.round(tx + Math.cos(a) * d), y = Math.round(ty + Math.sin(a) * d);
    if (caminhavel(M, x, y)) return { tx: x, ty: y };
  }
  return null;
}
export const biomaEm = (M, tx, ty) => terreno(M, tx, ty);
