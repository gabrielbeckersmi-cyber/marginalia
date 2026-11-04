// DESENHO DO MUNDO — (terreno contínuo: visual/terreno.js) elementos/construções/pessoas/animais ordenados por profundidade (y), luz do dia, efeitos.
// Para mudar a aparência do terreno: visual/terreno.js. Para trocar a arte de um elemento: src/jogo/dados/arte.js (FEAT).
import { C } from "../config.js";
import { T } from "../mundo.js";
import { hash2 } from "../rng.js";
import { FEAT } from "../dados/arte.js";
import { CONSTR } from "../dados/construcoes.js";
import { ANIMAIS } from "../dados/animais.js";
import { desenharQuadro, desenharPessoa, sombra } from "./sprites.js";
import { texto, PAL, padraoPapel } from "./estilo.js";
import { desenharTerreno } from "./terreno.js";
import { arte } from "../../nucleo/assets.js";
const TS = C.TILE;


export function criarCamera() { return { x: 0, y: 0 }; }
export function seguir(cam, alvo, M, L, A, dt) {
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const k = dt === undefined ? 1 : 1 - Math.pow(0.0005, dt);
  cam.x += (lim(alvo.x, L / 2, M.N * TS - L / 2) - cam.x) * k; cam.y += (lim(alvo.y - 20, A / 2, M.N * TS - A / 2) - cam.y) * k;
}

// ── luz do dia ──
export function luzDoDia(h) {
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)), noite = [58, 72, 128], aurora = [232, 170, 130], dia = [255, 255, 255], ocaso = [246, 176, 120];
  if (h < 4.5) return noite; if (h < 6) return mix(noite, aurora, (h - 4.5) / 1.5); if (h < 8) return mix(aurora, dia, (h - 6) / 2);
  if (h < 17.5) return dia; if (h < 19.5) return mix(dia, ocaso, (h - 17.5) / 2); if (h < 21) return mix(ocaso, noite, (h - 19.5) / 1.5); return noite;
}

/** Desenha tudo. opts: { alvo, fantasma:{tipo,tx,ty,ok}, tempo, mostrarNomes } */
export function desenharMundo(ctx, J, cam, L, A, opts = {}) {
  const M = J.M, p = J.jogador, tempo = opts.tempo || 0;
  // cansaço ≥ 80: a tela treme
  let sx = 0, sy = 0; const can = p.cans >= 80 ? (p.cans - 80) / 20 : 0;
  if (can > 0 || p.cans >= 80) { const a = 0.6 + can * 2.6; sx = Math.sin(tempo * 41) * a; sy = Math.cos(tempo * 33) * a; }
  ctx.save(); ctx.translate(Math.round(L / 2 - cam.x + sx), Math.round(A / 2 - cam.y + sy));
  const x0 = Math.max(0, Math.floor((cam.x - L / 2) / TS) - 1), x1 = Math.min(M.N - 1, Math.ceil((cam.x + L / 2) / TS) + 1);
  const y0 = Math.max(0, Math.floor((cam.y - A / 2) / TS) - 1), y1 = Math.min(M.N - 1, Math.ceil((cam.y + A / 2) / TS) + 4);
  // vazio fora do mapa = mar
  desenharTerreno(ctx, M, cam.x - L / 2 - 8, cam.y - A / 2 - 8, cam.x + L / 2 + 8, cam.y + A / 2 + 8, tempo, !!opts.forcar);

  // ── objetos ordenados por y ──
  const fila = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0 - 2; tx <= x1 + 2; tx++) {
    if (tx < 0 || tx >= M.N) continue;
    const f = M.feat[ty * M.N + tx]; if (!f) continue;
    const d = FEAT[f]; if (!d) continue;
    const bx = (tx + 0.5) * TS + (hash2(tx, ty, 5) - 0.5) * 8, by = (ty + 1) * TS - 4;
    fila.push({ y: by, f: () => { if (d.bloq) sombra(ctx, bx, by, d.tam * 0.28); desenharQuadro(ctx, d.f[0], d.f[1], bx, by + 6, d.tam); } });
  }
  for (const b of J.construcoes) {
    if (b.tx + b.w < x0 - 6 || b.tx > x1 + 6 || b.ty + b.h < y0 - 6 || b.ty > y1 + 2) continue;
    const d = CONSTR[b.tipo], bx = (b.tx + b.w / 2) * TS, by = (b.ty + b.h) * TS - 2;
    fila.push({ y: by, f: () => desenharConstrucao(ctx, b, d, bx, by, J, tempo) });
  }
  for (const a of J.animais) fila.push({ y: a.y, f: () => desenharAnimal(ctx, a, tempo) });
  for (const c of J.corpos) {
    if (Math.abs(c.x - cam.x) > L / 2 + 80 || Math.abs(c.y - cam.y) > A / 2 + 80) continue;
    fila.push({ y: c.y, f: () => { ctx.save(); ctx.globalAlpha = c.vazioEm == null ? 1 : Math.max(0, 1 - (J.t - c.vazioEm) / 20); desenharPessoa(ctx, { sprite: c.sprite, dir: 0 }, c.x, c.y, { dormindo: true }); ctx.restore(); if (c.vazioEm == null) desenharQuadro(ctx, "icones_ui", 4, c.x, c.y - 36 + Math.sin(tempo * 3) * 3, 30, { centro: true }); } });
  }
  for (const e of J.npcs) {
    if (Math.abs(e.x - cam.x) > L / 2 + 80 || Math.abs(e.y - cam.y) > A / 2 + 120) continue;
    fila.push({ y: e.y, f: () => { if (e.flash > 0) ctx.globalAlpha = 0.6; desenharPessoa(ctx, e, e.x, e.y, { dormindo: e.dormindo }); ctx.globalAlpha = 1; if (e.hp < e.hpMax - 1) barraVida(ctx, e.x, e.y - 74, e.hp / e.hpMax); } });
  }
  for (const s of J.navios) fila.push({ y: s.y + 40, f: () => desenharNavio(ctx, s, tempo) });
  fila.push({ y: p.y + (J.chegando ? 400 : 0), f: () => desenharPessoa(ctx, p, p.x, p.y + (J.chegando ? Math.sin(tempo * 1.2) * 3 : 0), { dormindo: p.dormindo }) });
  fila.sort((a, b) => a.y - b.y);
  for (const o of fila) o.f();

  // nomes de NPCs próximos do jogador ou do cursor
  if (opts.mostrarNomes !== false) for (const e of J.npcs) {
    const perto = Math.hypot(e.x - p.x, e.y - p.y) < 170 || (opts.alvo && opts.alvo.ref === e); if (!perto) continue;
    texto(ctx, e.nome, e.x, e.y - 78, { tam: 14, alinhar: "center", cor: "#f6ecd0", sombra: true });
  }
  // fantasma de construção
  if (opts.fantasma) { const g = opts.fantasma, d = CONSTR[g.tipo]; ctx.save(); ctx.globalAlpha = 0.55; desenharQuadro(ctx, d.sprite[0], d.sprite[1], (g.tx + d.w / 2) * TS, (g.ty + d.h) * TS - 2, d.tam); ctx.restore();
    ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.strokeStyle = g.ok ? "#6fd04a" : "#e0503a"; ctx.fillStyle = g.ok ? "#6fd04a30" : "#e0503a30"; ctx.fillRect(g.tx * TS, g.ty * TS, d.w * TS, d.h * TS); ctx.strokeRect(g.tx * TS, g.ty * TS, d.w * TS, d.h * TS); ctx.setLineDash([]); }
  // contorno do alvo
  if (opts.alvo && !opts.fantasma) { const a = opts.alvo; ctx.strokeStyle = opts.alvoOk === false ? "#e0503a" : "#f6e08a"; ctx.lineWidth = 2.5; ctx.beginPath();
    if (a.tipo === "constr") ctx.roundRect(a.ref.tx * TS - 3, a.ref.ty * TS - 3, a.ref.w * TS + 6, a.ref.h * TS + 6, 6); else ctx.ellipse(a.x, a.y + (a.tipo === "npc" || a.tipo === "animal" ? 0 : 0), 28, 12, 0, 0, 7); ctx.stroke(); }
  desenharEfeitos(ctx, J);
  ctx.restore();

  // luz do dia (multiplica) + brilho de janelas à noite
  const cor = luzDoDia(J.hora);
  if (cor[0] < 250) { ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgb(${cor[0]},${cor[1]},${cor[2]})`; ctx.fillRect(0, 0, L, A); ctx.restore(); }
  if (cor[2] < 200) brilhos(ctx, J, cam, L, A, 1 - (cor[0] - 58) / 197);
  // papel + vinheta
  ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = padraoPapel(ctx); ctx.fillRect(0, 0, L, A); ctx.restore();
  const g = ctx.createRadialGradient(L / 2, A / 2, A * 0.45, L / 2, A / 2, A * 0.95); g.addColorStop(0, "#00000000"); g.addColorStop(1, "#1a0d0560"); ctx.fillStyle = g; ctx.fillRect(0, 0, L, A);
  // cansaço: piscar lento e escuro
  if (p.cans >= 80) { const ciclo = (tempo * 0.22) % 1, k = ciclo < 0.3 ? Math.pow(Math.sin((ciclo / 0.3) * Math.PI), 2) : 0, inten = 0.35 + 0.65 * can; ctx.fillStyle = `rgba(6,3,2,${(k * 0.8 * inten).toFixed(3)})`; ctx.fillRect(0, 0, L, A); }
  if (p.dormindo) { ctx.fillStyle = "#050310aa"; ctx.fillRect(0, 0, L, A); }
  if (p.tDano > 0) { ctx.fillStyle = `rgba(150,20,10,${Math.min(0.35, p.tDano)})`; ctx.fillRect(0, 0, L, A); }
}

function desenharConstrucao(ctx, b, d, bx, by, J, tempo) {
  sombra(ctx, bx, by - 6, d.w * TS * 0.42, d.h * TS * 0.2);
  if (b.prog < 1) {
    ctx.save(); ctx.strokeStyle = "#5a4128"; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.strokeRect(b.tx * TS + 2, b.ty * TS + 2, b.w * TS - 4, b.h * TS - 4); ctx.setLineDash([]); ctx.restore();
    ctx.fillStyle = "#5a412822"; ctx.fillRect(b.tx * TS, b.ty * TS, b.w * TS, b.h * TS);
    if (b.prog > 0.02) { desenharQuadro(ctx, d.sprite[0], d.sprite[1], bx, by + 4, d.tam, { corte: Math.max(0.08, b.prog), alfa: 0.55 + 0.45 * b.prog }); }
    // estacas nos cantos
    ctx.fillStyle = "#7a5a30"; for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) ctx.fillRect((b.tx + ox * b.w) * TS - 3 + (ox ? -3 : 3), (b.ty + oy * b.h) * TS - 12 + (oy ? -3 : 3), 6, 14);
    const w = Math.min(130, b.w * TS), x = bx - w / 2, y = (b.ty + b.h) * TS + 6;
    ctx.fillStyle = "#2a1b10dd"; ctx.fillRect(x, y, w, 10); ctx.fillStyle = PAL.ouro; ctx.fillRect(x + 1, y + 1, (w - 2) * b.prog, 8); texto(ctx, `${Math.round(b.prog * 100)}%`, bx, y + 24, { tam: 13, alinhar: "center", cor: "#f6ecd0", sombra: true });
    return;
  }
  desenharQuadro(ctx, d.sprite[0], d.sprite[1], bx, by + 4, d.tam);
  if (d.negocio && b.vaga) texto(ctx, "Contrata-se", bx, by - d.tam * 0.8, { tam: 13, alinhar: "center", cor: "#f6e08a", sombra: true });
}
function desenharAnimal(ctx, a, tempo) {
  const A = ANIMAIS[a.esp], f = a.mov ? Math.floor(a.anim) % 4 : 0, esq = a.dir === 1;
  sombra(ctx, a.x, a.y, A.tam * 0.3);
  if (a.flash > 0) ctx.globalAlpha = 0.6;
  desenharQuadro(ctx, "animal_" + a.esp, f, a.x, a.y + 4, A.tam * 1.15, { espelhar: esq });
  ctx.globalAlpha = 1;
  if (a.hp < (A.hp - 0.5)) barraVida(ctx, a.x, a.y - A.tam * 0.85, a.hp / A.hp);
}
function desenharNavio(ctx, s, tempo) {
  const img = arte("navio"), bal = Math.sin(tempo * 1.2 + s.x) * 3;
  ctx.fillStyle = "#0f2c3a55"; ctx.beginPath(); ctx.ellipse(s.x, s.y + 62, 190, 44, 0, 0, 7); ctx.fill();
  if (img) desenharQuadro(ctx, "navio", 0, s.x, s.y + 140 + bal, 440);
  else { ctx.fillStyle = "#6b4a2a"; ctx.fillRect(s.x - 150, s.y, 300, 70); }
  if (s.estado === "atracado" || s.estado === "chegando") { ctx.strokeStyle = "#eef6f066"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x, s.y + 64, 200 + Math.sin(tempo * 2) * 4, 50, 0, 0, 7); ctx.stroke(); }
}
function barraVida(ctx, x, y, f) { ctx.fillStyle = "#2a1b10cc"; ctx.fillRect(x - 22, y, 44, 6); ctx.fillStyle = f > 0.5 ? "#6fa030" : "#c04a2a"; ctx.fillRect(x - 21, y + 1, 42 * Math.max(0, f), 4); }
function desenharEfeitos(ctx, J) {
  for (const f of J.efeitos) {
    if (f.tipo === "num") { texto(ctx, String(f.texto), f.x, f.y - (0.7 - f.t) * 40, { tam: 20, alinhar: "center", cor: "#ffe08a", peso: "bold", sombra: true }); }
    else if (f.tipo === "flecha") { const k = 1 - f.t / f.dur, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 18, a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0); ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = "#3a2614"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(10, 0); ctx.stroke(); ctx.fillStyle = "#cfc6b0"; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill(); ctx.strokeStyle = "#b2402a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-24, -4); ctx.moveTo(-18, 0); ctx.lineTo(-24, 4); ctx.stroke(); ctx.restore(); }
    else if (f.tipo === "golpe") { ctx.strokeStyle = "#fff8d0cc"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y, 22, -1.2, 1.2 + (0.2 - f.t) * 5); ctx.stroke(); }
    else if (f.tipo === "dano") { ctx.fillStyle = "#c0301a66"; ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, 7); ctx.fill(); }
  }
}
function brilhos(ctx, J, cam, L, A, forca) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.translate(Math.round(L / 2 - cam.x), Math.round(A / 2 - cam.y));
  for (const b of J.construcoes) {
    if (b.prog < 1 || !(CONSTR[b.tipo].moradia || CONSTR[b.tipo].negocio)) continue;
    const x = (b.tx + b.w / 2) * TS, y = (b.ty + b.h) * TS - 20; if (Math.abs(x - cam.x) > L / 2 + 200 || Math.abs(y - cam.y) > A / 2 + 200) continue;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 90); g.addColorStop(0, `rgba(255,190,90,${0.5 * forca})`); g.addColorStop(1, "rgba(255,150,40,0)"); ctx.fillStyle = g; ctx.fillRect(x - 90, y - 90, 180, 180);
  }
  ctx.restore();
}
