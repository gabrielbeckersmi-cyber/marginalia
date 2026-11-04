// TERRENO CONTÍNUO (estilo Don't Starve) — sem grade de tiles à vista. Cada bioma é uma mancha orgânica de bordas irregulares, com contorno de
// tinta, e o chão é desenhado em "blocos" de 8×8 tiles guardados em cache (um canvas por bloco), então custa pouco por quadro.
// A lógica do jogo continua em tiles (colisão, busca); aqui só muda o desenho.
// Para mudar o visual do chão: edite COR / CAMADAS (cores, contorno) e decorar() (tufos, manchas). Água animada: ondas().
import { C } from "../config.js";
import { T } from "../mundo.js";
import { hash2 } from "../rng.js";
const TS = C.TILE, CHK = 8, PX = CHK * TS, ESC = 1.25, MARGEM = 1, TAU = Math.PI * 2, MAX_CACHE = 48;

const COR = { mar: "#2c5a68", rasoMar: "#35697a", rasoMar2: "#4b8393", areia: "#dcc78d", grama: "#86a352", floresta: "#628443", pedra: "#928b7c", agua: "#4b8aa0", tinta: "#2a1b10" };
const TINTA = { [T.AREIA]: "#a98f55", [T.GRAMA]: "#4c6a2c", [T.FLORESTA]: "#3b5526", [T.PEDRA]: "#5d5648" };
const bit = (...ts) => ts.reduce((m, t) => m | (1 << t), 0);
const TERRA = bit(T.AREIA, T.GRAMA, T.FLORESTA, T.PEDRA, T.RIO, T.LAGO), VERDE = bit(T.GRAMA, T.FLORESTA, T.PEDRA), MATA = bit(T.FLORESTA), ROCHA = bit(T.PEDRA), AGUA_DOCE = bit(T.RIO, T.LAGO);
// da camada de baixo para a de cima. exp = quanto o contorno/halo estende além da mancha (px); sal = variação da forma
const CAMADAS = [
  { mask: TERRA, sal: 100, halos: [[22, COR.rasoMar], [10, COR.rasoMar2]], tinta: 3.4, tintaCor: "#2a1b10d0", cor: COR.areia },
  { mask: VERDE, sal: 200, tinta: 2.2, tintaCor: "#3d5224b0", cor: COR.grama },
  { mask: MATA, sal: 300, tinta: 1.6, tintaCor: "#3b552688", cor: COR.floresta },
  { mask: ROCHA, sal: 400, tinta: 2.4, tintaCor: "#4a4438c0", cor: COR.pedra },
  { mask: AGUA_DOCE, sal: 500, tinta: 3, tintaCor: "#1f3d4ad0", cor: COR.agua },
];

const tipoEm = (M, tx, ty) => (tx < 0 || ty < 0 || tx >= M.N || ty >= M.N ? T.MAR : M.terr[ty * M.N + tx]);
const em = (M, tx, ty, mask) => ((mask >> tipoEm(M, tx, ty)) & 1) === 1;

/** Soma de manchas (círculos irregulares) dos tiles da máscara, como UM caminho: preenche a união de uma vez. */
function manchas(g, M, x0, y0, x1, y1, mask, sal, exp) {
  g.beginPath();
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!em(M, tx, ty, mask)) continue;
    const x = tx * TS, y = ty * TS;
    let miolo = true; for (let oy = -1; oy <= 1 && miolo; oy++) for (let ox = -1; ox <= 1; ox++) if (!em(M, tx + ox, ty + oy, mask)) { miolo = false; break; }
    if (miolo) { g.rect(x - exp, y - exp, TS + 2 * exp, TS + 2 * exp); continue; }
    for (let k = 0; k < 3; k++) {
      const j = k === 0 ? 0.16 : 0.42, cx = x + TS * (0.5 + (hash2(tx, ty, sal + k * 7) - 0.5) * j), cy = y + TS * (0.5 + (hash2(tx, ty, sal + k * 7 + 1) - 0.5) * j);
      const r = TS * (0.6 + hash2(tx, ty, sal + k * 7 + 2) * 0.17) + exp;
      g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, TAU);
    }
  }
  g.fill();
}

function decorar(g, M, x0, y0, x1, y1) {
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = tipoEm(M, tx, ty), x = tx * TS, y = ty * TS, h = hash2(tx, ty, 11);
    if (t === T.MAR) { if (h < 0.18) { g.fillStyle = h < 0.09 ? "#00000012" : "#ffffff0b"; g.beginPath(); g.ellipse(x + TS * 0.5, y + TS * 0.5, TS * (0.9 + h * 3), TS * (0.7 + h * 2), h * 6, 0, TAU); g.fill(); } continue; }
    if ((AGUA_DOCE >> t) & 1) continue;
    const igual = tipoEm(M, tx - 1, ty) === t && tipoEm(M, tx + 1, ty) === t && tipoEm(M, tx, ty - 1) === t && tipoEm(M, tx, ty + 1) === t;
    if (igual && h < 0.22 && (t === T.GRAMA || t === T.FLORESTA)) { g.fillStyle = h < 0.15 ? "#ffffff09" : "#00000007"; g.beginPath(); g.ellipse(x + TS * (0.2 + h * 2), y + TS * 0.5, TS * (0.7 + h * 2), TS * (0.5 + h), h * 5, 0, TAU); g.fill(); }
    const tinta = TINTA[t]; if (!tinta || h < 0.3) continue;
    g.strokeStyle = tinta + "a0"; g.lineWidth = 1.5; g.beginPath();
    const a = hash2(tx, ty, 3) * 34 + 6, b = hash2(tx, ty, 4) * 30 + 10;
    if (t === T.GRAMA || t === T.FLORESTA) { g.moveTo(x + a, y + b); g.lineTo(x + a - 3, y + b - 9); g.moveTo(x + a, y + b); g.lineTo(x + a + 4, y + b - 8); g.moveTo(x + a, y + b); g.lineTo(x + a + 1, y + b - 11); if (h > 0.7) { g.moveTo(x + 40 - a * 0.6, y + 44 - b * 0.4); g.lineTo(x + 38 - a * 0.6, y + 37 - b * 0.4); } }
    else if (t === T.AREIA) { g.moveTo(x + a, y + b); g.lineTo(x + a + 8, y + b + 1); if (h > 0.6) { g.moveTo(x + a - 10, y + b + 9); g.lineTo(x + a - 4, y + b + 10); } }
    else { g.moveTo(x + a, y + b); g.lineTo(x + a + 6, y + b - 4); g.lineTo(x + a + 11, y + b); g.moveTo(x + a + 6, y + b - 4); g.lineTo(x + a + 7, y + b + 5); }
    g.stroke();
  }
}

function desenharBloco(M, cx, cy) {
  const cv = document.createElement("canvas"), tam = PX + 2 * MARGEM; cv.width = cv.height = Math.round(tam * ESC);
  const g = cv.getContext("2d"); g.scale(ESC, ESC); g.translate(MARGEM - cx * PX, MARGEM - cy * PX);
  const x0 = cx * CHK - 2, y0 = cy * CHK - 2, x1 = cx * CHK + CHK + 1, y1 = cy * CHK + CHK + 1;
  g.fillStyle = COR.mar; g.fillRect(cx * PX - MARGEM, cy * PX - MARGEM, tam, tam);
  CAMADAS.forEach((c, i) => {
    for (const [e, cor] of c.halos || []) { g.fillStyle = cor; manchas(g, M, x0, y0, x1, y1, c.mask, c.sal, e); }
    g.fillStyle = c.tintaCor; manchas(g, M, x0, y0, x1, y1, c.mask, c.sal, c.tinta);
    g.fillStyle = c.cor; manchas(g, M, x0, y0, x1, y1, c.mask, c.sal, 0);
  });
  decorar(g, M, x0 + 1, y0 + 1, x1 - 1, y1 - 1);
  return cv;
}

const cache = new Map(); let sementeCache = null;
export function limparTerreno() { cache.clear(); sementeCache = null; }
const COR_TILE = { [T.MAR]: COR.mar, [T.AREIA]: COR.areia, [T.GRAMA]: COR.grama, [T.FLORESTA]: COR.floresta, [T.PEDRA]: COR.pedra, [T.RIO]: COR.agua, [T.LAGO]: COR.agua };

/** Desenha o chão visível (em coordenadas do mundo; o ctx já está transladado pela câmera). `forcar` = gerar todos os blocos já (1º quadro). */
export function desenharTerreno(ctx, M, vx0, vy0, vx1, vy1, tempo, forcar = false) {
  if (sementeCache !== M.semente) { cache.clear(); sementeCache = M.semente; }
  const cx0 = Math.floor(vx0 / PX), cx1 = Math.floor(vx1 / PX), cy0 = Math.floor(vy0 / PX), cy1 = Math.floor(vy1 / PX); let novos = 0;
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const chave = cy * 100000 + cx; let cv = cache.get(chave);
    if (cv) { cache.delete(chave); cache.set(chave, cv); }
    else if (forcar || novos < 2) { cv = desenharBloco(M, cx, cy); novos++; cache.set(chave, cv); if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value); }
    if (cv) ctx.drawImage(cv, cx * PX - MARGEM, cy * PX - MARGEM, PX + 2 * MARGEM, PX + 2 * MARGEM);
    else for (let ty = cy * CHK; ty < cy * CHK + CHK; ty++) for (let tx = cx * CHK; tx < cx * CHK + CHK; tx++) { ctx.fillStyle = COR_TILE[tipoEm(M, tx, ty)] || COR.mar; ctx.fillRect(tx * TS, ty * TS, TS + 1, TS + 1); }   // provisório até o bloco ficar pronto
  }
  ondas(ctx, M, vx0, vy0, vx1, vy1, tempo);
}
/** Marolas animadas só no miolo da água (longe da margem, onde a mancha é irregular). */
function ondas(ctx, M, vx0, vy0, vx1, vy1, tempo) {
  const x0 = Math.max(1, Math.floor(vx0 / TS)), x1 = Math.min(M.N - 2, Math.ceil(vx1 / TS)), y0 = Math.max(1, Math.floor(vy0 / TS)), y1 = Math.min(M.N - 2, Math.ceil(vy1 / TS));
  for (const [mar, cor] of [[true, "#8fc0c455"], [false, "#b5dde655"]]) {
    ctx.strokeStyle = cor; ctx.lineWidth = 2; ctx.beginPath();
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = M.terr[ty * M.N + tx]; if ((t === T.MAR) !== mar || (!mar && t !== T.RIO && t !== T.LAGO)) continue;
      const h = hash2(tx, ty, 11); if (h < 0.5) continue;
      if (M.terr[ty * M.N + tx - 1] !== t || M.terr[ty * M.N + tx + 1] !== t || M.terr[(ty - 1) * M.N + tx] !== t || M.terr[(ty + 1) * M.N + tx] !== t) continue;
      const o = Math.sin(tempo * 1.4 + tx * 0.7 + ty * 0.45) * 5, x = tx * TS, y = ty * TS + 14 + h * 16;
      ctx.moveTo(x + 8 + o, y); ctx.quadraticCurveTo(x + 20 + o, y - 6, x + 32 + o, y);
    }
    ctx.stroke();
  }
}
