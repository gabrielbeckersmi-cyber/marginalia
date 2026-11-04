// BANDIDOS — colonos que chegam depois que a ilha passa de 70 habitantes. Vivem tocaiando nos ermos e assaltam quem tem ouro.
// Perto do jogador a luta é em tempo real (combate.js); entre NPCs o resultado é calculado na hora (barato em memória).
import { C } from "../config.js";
import { limitar } from "../rng.js";
import { pontoLivre } from "../mundo.js";
import { hab, ganhar } from "./habilidades.js";
import * as inv from "./inventario.js";
import { mover, tileDe } from "./movimento.js";
import { cidadeMaisProxima } from "./construcao.js";
const TS = C.TILE;

export function iaBandido(J, e, dt) {
  e.mov = false;
  if (e.sede > 70 || e.fome > 70) { e.sede = Math.min(e.sede, 30); e.fome = Math.min(e.fome, 35); }   // o acampamento fornece
  if (!e.lar) {
    const p = J.M.porto, a = -Math.PI / 2 + (J.rng() - 0.5) * 2.4, d = 60 + J.rng() * 260;
    const c = pontoLivre(J.M, Math.round(p.tx + Math.cos(a) * d), Math.round(p.ty + Math.sin(a) * d), 0, 20, J.rng);
    e.lar = c ? { x: (c.tx + 0.5) * TS, y: (c.ty + 0.5) * TS } : { x: e.x, y: e.y };
  }
  if (e.hp < 30 && e.estado !== "fugir") { e.estado = "fugir"; e.ate = J.t + 60; }
  if (e.estado === "tocaia") {
    if (!e.alvoPos || mover(J, e, e.alvoPos.x, e.alvoPos.y, dt) < TS) {
      if (!e.alvoPos || (e.pausa = (e.pausa ?? 2 + J.rng() * 5) - dt) <= 0) { e.pausa = null; const c = pontoLivre(J.M, tileDe(e.lar.x), tileDe(e.lar.y), 2, 28, J.rng); e.alvoPos = c ? { x: (c.tx + 0.5) * TS, y: (c.ty + 0.5) * TS } : e.lar; }
    }
    e.vigia = (e.vigia || 0) - dt;
    if (e.vigia <= 0 && J.t > (e.cool || 0)) { e.vigia = 3 + J.rng() * 2; procurarVitima(J, e); }
  } else if (e.estado === "atacar") {
    const v = e.vitima === 0 ? J.jogador : J.porId.get(e.vitima);
    if (!v || v.morto || e.t0 < J.t - 120) { e.estado = "tocaia"; return; }
    if (v === J.jogador) { e.perseguindo = true; return; }   // combate.js cuida da perseguição ao jogador (tempo real)
    if (mover(J, e, v.x, v.y, dt, 1.15) < TS * 1.1) resolverAssalto(J, e, v);
  } else if (e.estado === "fugir") {
    mover(J, e, e.lar.x, e.lar.y, dt, 1.2);
    if (J.t > e.ate) { e.estado = "tocaia"; e.hp = Math.min(e.hpMax, e.hp + 25); }
  }
}
function procurarVitima(J, e) {
  const p = J.jogador, dj = Math.hypot(p.x - e.x, p.y - e.y);
  if (dj < 6 * TS && p.ouro > 100 && !p.dormindo !== undefined) { e.estado = "atacar"; e.vitima = 0; e.t0 = J.t; return; }
  let melhor = null, md = 70 * TS; const n = J.npcs.length;
  for (let k = 0; k < Math.min(30, n); k++) {
    const v = J.npcs[Math.floor(J.rng() * n)];
    if (!v || v.bandido || v.ouro < 250) continue;
    const d = Math.hypot(v.x - e.x, v.y - e.y); if (d >= md) continue;
    const cid = cidadeMaisProxima(J, tileDe(v.x), tileDe(v.y), 11); if (cid && J.rng() < 0.7) continue;   // vilas são mais seguras
    md = d; melhor = v;
  }
  if (melhor) { e.estado = "atacar"; e.vitima = melhor.id; e.t0 = J.t; }
}
function resolverAssalto(J, e, v) {
  const forcaB = hab(e, "combate") + 14 + e.hp / 5, forcaV = hab(v, "combate") + (inv.tem(v, "escudo") ? 14 : 0) + (inv.tem(v, "espada_ferro") ? 12 : 4) + v.hp / 5;
  const ganhou = J.rng() < limitar(forcaB / (forcaB + forcaV), 0.2, 0.85);
  const perto = Math.hypot(e.x - J.jogador.x, e.y - J.jogador.y) < 800;
  if (ganhou) {
    const roubo = Math.floor(v.ouro * (0.25 + J.rng() * 0.35)); v.ouro -= roubo; e.ouro += roubo;
    v.hp -= 5 + J.rng() * 25; ganhar(e, "combate", 2);
    if (perto) J.avisos.push({ tipo: "assalto", texto: `${e.nome} roubou ${roubo} moedas de ${v.nome}`, x: e.x, y: e.y });
    if (v.hp <= 0) J.matarNPC(v, "assassinado por bandido");
  } else {
    const roubo = Math.floor(e.ouro * 0.25); e.ouro -= roubo; v.ouro += roubo; e.hp -= 15 + J.rng() * 30; ganhar(v, "combate", 2);
    if (perto) J.avisos.push({ tipo: "assalto", texto: `${v.nome} repeliu o bandido ${e.nome}`, x: e.x, y: e.y });
    if (e.hp <= 0) { J.matarNPC(e, "morto em assalto"); return; }
  }
  e.estado = "fugir"; e.ate = J.t + 40 + J.rng() * 50; e.cool = J.t + 120 + J.rng() * 120;
}
