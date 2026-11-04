// MAPA — minimapa (recorte ao redor do jogador) e mapa grande (ilha inteira). A imagem do terreno é gerada uma vez por semente.
import { C } from "../config.js";
import { T } from "../mundo.js";
import { desenharQuadro } from "./sprites.js";
import { texto, PAL, painel, ui } from "./estilo.js";
const MAPA_TAM = 520;
const PASSO = 8;       // 1 pixel do mapa = 8×8 tiles
const COR = { [T.MAR]: "#6f9aa8", [T.AREIA]: "#e2d29c", [T.GRAMA]: "#9db46c", [T.FLORESTA]: "#6e8f4a", [T.PEDRA]: "#9b9385", [T.RIO]: "#5aa0ba", [T.LAGO]: "#5aa0ba" };
let cache = { semente: null, img: null };

function imagemTerreno(M) {
  if (cache.semente === M.semente && cache.img) return cache.img;
  const n = Math.ceil(M.N / PASSO), c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), id = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let t = M.terr[Math.min(M.N - 1, y * PASSO + 4) * M.N + Math.min(M.N - 1, x * PASSO + 4)];
    // rios/lagos finos: procura água doce no bloco
    if (t !== T.MAR) for (let k = 0; k < 4; k++) { const tt = M.terr[Math.min(M.N - 1, y * PASSO + k * 2) * M.N + Math.min(M.N - 1, x * PASSO + 7 - k * 2)]; if (tt === T.RIO || tt === T.LAGO) { t = tt; break; } }
    const h = COR[t] || "#000", i = (y * n + x) * 4; id.data[i] = parseInt(h.slice(1, 3), 16); id.data[i + 1] = parseInt(h.slice(3, 5), 16); id.data[i + 2] = parseInt(h.slice(5, 7), 16); id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0); cache = { semente: M.semente, img: c }; return c;
}
const paraMapa = (v) => v / PASSO;

/** Minimapa: recorte de `tiles` tiles de lado ao redor do jogador, desenhado em (x,y,tam). */
export function minimapa(ctx, J, x, y, tam, tiles = 700) {
  const img = imagemTerreno(J.M), p = J.jogador, lado = tiles / PASSO, cx = p.x / C.TILE / PASSO, cy = p.y / C.TILE / PASSO, esc = tam / lado;
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, tam, tam, 6); ctx.clip();
  ctx.fillStyle = COR[T.MAR]; ctx.fillRect(x, y, tam, tam); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, cx - lado / 2, cy - lado / 2, lado, lado, x, y, tam, tam); ctx.imageSmoothingEnabled = true;
  const pt = (tx, ty) => [x + (tx / PASSO - (cx - lado / 2)) * esc, y + (ty / PASSO - (cy - lado / 2)) * esc];
  marcadores(ctx, J, pt, { pequeno: true, nomes: false });
  ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.tinta; ctx.beginPath(); ctx.roundRect(x, y, tam, tam, 6); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = PAL.ouro; ctx.beginPath(); ctx.roundRect(x + 3, y + 3, tam - 6, tam - 6, 4); ctx.stroke();
}
function marcadores(ctx, J, pt, { pequeno, nomes }) {
  const r = pequeno ? 3 : 4.5;
  for (const b of J.construcoes) { if (b.prog < 1 && !pequeno) continue; const [mx, my] = pt(b.tx, b.ty); ctx.fillStyle = b.dono === 0 ? "#2f5fd0" : "#5a4128"; ctx.fillRect(mx - 1.5, my - 1.5, pequeno ? 3 : 4, pequeno ? 3 : 4); }
  for (const c of J.cidades) { const [mx, my] = pt(c.tx, c.ty); ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 2; ctx.fillStyle = "#e9d9aa"; ctx.beginPath(); ctx.arc(mx, my, r + 2, 0, 7); ctx.fill(); ctx.stroke(); if (nomes) texto(ctx, c.nome, mx, my - 12, { tam: 15, alinhar: "center", peso: "bold", cor: PAL.tinta, sombra: false }); }
  const pp = J.M.porto; { const [mx, my] = pt(pp.tx * 1, pp.ty * 1); desenharQuadro(ctx, "icones_ui", 10, mx, my, pequeno ? 18 : 26, { centro: true }); if (nomes) texto(ctx, "Porto", mx, my + 24, { tam: 14, alinhar: "center", cor: PAL.tinta }); }
  if (J.marcador) { const [mx, my] = pt(J.marcador.tx + 0.5, J.marcador.ty + 0.5), k = pequeno ? 0.7 : 1; ctx.fillStyle = "#e8b020"; ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - 6 * k, my - 13 * k); ctx.arc(mx, my - 15 * k, 6.5 * k, Math.PI * 0.8, Math.PI * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = PAL.tinta; ctx.beginPath(); ctx.arc(mx, my - 15 * k, 2.2 * k, 0, 7); ctx.fill(); }
  const p = J.jogador, [px, py] = pt(p.x / C.TILE, p.y / C.TILE); ctx.fillStyle = "#d02a1a"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, r + 1, 0, 7); ctx.fill(); ctx.stroke();
}

// ── mapa grande: zoom (roda), arrastar, duplo clique marca / clique no marcador remove ──
const ZMAX = 12;
/** Estado da visão do mapa grande: z = zoom, (cx,cy) = centro em pixels da imagem do terreno. */
export function visaoMapa(J, m) {
  const n = imagemTerreno(J.M).width;
  if (!m) m = { z: 1, cx: n / 2, cy: n / 2, arr: null, ultimo: null };
  return m;
}
function geometria(J, m, L) {
  const n = imagemTerreno(J.M).width, lado = n / m.z, x = (L - MAPA_TAM) / 2, y = 92, esc = MAPA_TAM / lado;
  m.cx = Math.max(lado / 2, Math.min(n - lado / 2, m.cx)); m.cy = Math.max(lado / 2, Math.min(n - lado / 2, m.cy));
  const ox = m.cx - lado / 2, oy = m.cy - lado / 2;
  return { n, lado, x, y, esc, ox, oy, pt: (tx, ty) => [x + (tx / PASSO - ox) * esc, y + (ty / PASSO - oy) * esc], tile: (px, py) => [((px - x) / esc + ox) * PASSO, ((py - y) / esc + oy) * PASSO] };
}
/** Entrada do mapa grande. Chame em atualizar() enquanto o painel estiver aberto. */
export function atualizarMapa(J, m, L, tempo) {
  let g = geometria(J, m, L);
  const dentro = ui.x >= g.x && ui.x <= g.x + MAPA_TAM && ui.y >= g.y && ui.y <= g.y + MAPA_TAM;
  if (dentro && ui.roda) {   // zoom em direção ao cursor
    const [tx, ty] = g.tile(ui.x, ui.y), antes = m.z;
    m.z = Math.max(1, Math.min(ZMAX, m.z * (ui.roda < 0 ? 1.25 : 0.8))); if (m.z < 1.02) m.z = 1;
    if (m.z !== antes) { const g2 = geometria(J, m, L), [ax, ay] = g2.tile(ui.x, ui.y); m.cx += (tx - ax) / PASSO; m.cy += (ty - ay) / PASSO; }
  }
  ui.roda = 0;
  g = geometria(J, m, L);
  if (ui.clique && dentro) m.arr = { x0: ui.x, y0: ui.y, lx: ui.x, ly: ui.y, moveu: false };
  if (m.arr && ui.baixo) {
    const a = m.arr; if (Math.hypot(ui.x - a.x0, ui.y - a.y0) > 5) a.moveu = true;
    if (a.moveu) { m.cx -= (ui.x - a.lx) / g.esc; m.cy -= (ui.y - a.ly) / g.esc; }
    a.lx = ui.x; a.ly = ui.y;
  } else if (m.arr) {   // soltou: sem arrastar = clique
    const a = m.arr; m.arr = null;
    if (!a.moveu) {
      const [mx, my] = J.marcador ? g.pt(J.marcador.tx + 0.5, J.marcador.ty + 0.5) : [-999, -999];
      if (J.marcador && Math.hypot(a.x0 - mx, a.y0 - (my - 12)) < 16) { J.marcador = null; m.ultimo = null; return; }   // clique no marcador: some
      const u = m.ultimo;
      if (u && tempo - u.t < 0.45 && Math.hypot(u.x - a.x0, u.y - a.y0) < 10) {   // duplo clique: marca
        const [tx, ty] = g.tile(a.x0, a.y0), N = J.M.N; J.marcador = { tx: Math.max(0, Math.min(N - 1, Math.floor(tx))), ty: Math.max(0, Math.min(N - 1, Math.floor(ty))) }; m.ultimo = null;
      } else m.ultimo = { t: tempo, x: a.x0, y: a.y0 };
    }
  }
  ui.clique = false;
}
/** Mapa grande (painel). */
export function mapaGrande(ctx, J, L, A, m) {
  const tam = MAPA_TAM, g = geometria(J, m, L), { x, y } = g; painel(ctx, x - 20, y - 56, tam + 40, tam + 80, { titulo: "Mapa da Ilha" });
  const img = imagemTerreno(J.M); ctx.save(); ctx.beginPath(); ctx.rect(x, y, tam, tam); ctx.clip(); ctx.fillStyle = COR[T.MAR]; ctx.fillRect(x, y, tam, tam);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(img, g.ox, g.oy, g.lado, g.lado, x, y, tam, tam); ctx.imageSmoothingEnabled = true;
  marcadores(ctx, J, g.pt, { pequeno: false, nomes: true }); ctx.restore();
  ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 3; ctx.strokeRect(x, y, tam, tam);
  texto(ctx, "Roda: zoom  ·  Arrastar: mover  ·  Duplo clique: marcar  ·  Clique no marcador: remover", L / 2, y + tam + 14, { tam: 13, alinhar: "center", cor: PAL.tintaClara });
}
