// COMBATE do jogador em tempo real: golpe em animais e bandidos; bandidos que perseguem o jogador.
import { C } from "../config.js";
import { ANIMAIS } from "../dados/animais.js";
import { ITENS } from "../dados/itens.js";
import { hab, ganhar } from "./habilidades.js";
import * as inv from "./inventario.js";
import { mover } from "./movimento.js";
import { danoDaMao, equipado } from "./equipamento.js";
import { usarFerramenta } from "./ferramentas.js";
import { limitar } from "../rng.js";
const TS = C.TILE;
/** Dano base: o jogador usa o que está equipado na mão (punhos = 3); NPCs usam a melhor arma que carregam. */
export const armaDe = (e) => (e.equip ? danoDaMao(e) : inv.tem(e, "espada_ferro") ? 13 : inv.tem(e, "arco") ? 8 : 3);

/** Alcance do golpe do jogador (px): arco = longo alcance; o resto, corpo a corpo. */
export const alcanceArma = (e) => { const m = equipado(e, "mao"); return m && ITENS[m].alcance ? C.ALCANCE_ARCO * TS : TS * 1.8; };
/** Chance de acertar (0,12–0,95): habilidade de quem ataca contra a de quem se defende. Com arco, erra mais quanto mais longe o alvo. */
export function chanceAcerto(hAtk, hDef, { alcance = false, dist = 0 } = {}) {
  let p = 0.78 + (hAtk - hDef) / 180;
  if (alcance) p -= 0.3 * Math.min(1, dist / (C.ALCANCE_ARCO * TS));
  return limitar(p, 0.12, 0.95);
}
const habAtaque = (e, arco) => (arco ? (hab(e, "combate") + hab(e, "cacada")) / 2 : hab(e, "combate"));
/** Golpe do jogador. `alvoPedido` = { tipo:"animal"|"npc", ref } escolhido com o mouse; sem ele (controle), acerta o animal/bandido mais perto.
 *  Qualquer NPC pode ser atacado (só com alvoPedido): ele revida ou foge. */
export function golpeJogador(J, alvoPedido = null) {
  const p = J.jogador; if (p.cdGolpe > 0) return null;
  const armaItem = equipado(p, "mao"), arco = !!(armaItem && ITENS[armaItem].alcance);
  p.cdGolpe = arco ? 0.9 : 0.55; p.golpe = 0.2; p.dormindo = false;
  let alvo = null, md = alcanceArma(p);
  if (alvoPedido && alvoPedido.ref && !alvoPedido.ref.morto) { const r = alvoPedido.ref, d = Math.hypot(r.x - p.x, r.y - p.y); if (d <= md) alvo = { tipo: alvoPedido.tipo, ref: r }; p.dir = Math.abs(r.x - p.x) > Math.abs(r.y - p.y) ? (r.x < p.x ? 1 : 2) : (r.y < p.y ? 3 : 0); }
  else if (!alvoPedido) {
    for (const a of J.animais) { const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < md) { md = d; alvo = { tipo: "animal", ref: a }; } }
    for (const n of J.npcs) if (n.bandido) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < md) { md = d; alvo = { tipo: "npc", ref: n }; } }
  }
  if (arco) { const al = alvo ? alvo.ref : null; J.efeitos.push({ tipo: "flecha", x0: p.x, y0: p.y - 30, x1: al ? al.x : p.x + (p.dir === 2 ? 200 : p.dir === 1 ? -200 : 0), y1: al ? al.y - 24 : p.y - 30 + (p.dir === 0 ? 200 : p.dir === 3 ? -200 : 0), t: 0.28, dur: 0.28 }); }
  else J.efeitos.push({ x: p.x + (p.dir === 2 ? 30 : p.dir === 1 ? -30 : 0), y: p.y - 24 + (p.dir === 0 ? 24 : p.dir === 3 ? -20 : 0), tipo: "golpe", t: 0.2 });
  if (armaItem) usarFerramenta(J, p, armaItem, 1);
  if (!alvo) return null;
  const r = alvo.ref, hDef = alvo.tipo === "animal" ? ANIMAIS[r.esp].esq : hab(r, "combate");
  const dist = Math.hypot(r.x - p.x, r.y - p.y), chance = chanceAcerto(habAtaque(p, arco), hDef, { alcance: arco, dist });
  ganhar(p, "combate", 0.15);
  const errou = J.rng() >= chance;
  if (errou) J.efeitos.push({ x: r.x, y: r.y - 30, tipo: "num", texto: "Errou!", t: 0.7 });
  const dano = errou ? 0 : armaDe(p) * (1 + hab(p, "combate") / 60) * (0.85 + J.rng() * 0.3);
  if (!errou) { r.hp -= dano; r.flash = 0.2; ganhar(p, "combate", 0.25); J.efeitos.push({ x: r.x, y: r.y - 30, tipo: "num", texto: Math.round(dano), t: 0.7 }); }
  if (alvo.tipo === "animal") {
    const A = ANIMAIS[r.esp];
    if (r.estado !== "perseguir" && A.comp !== "passivo") { r.estado = "perseguir"; r.ate = J.t + 12; }
    if (A.comp === "passivo") { r.estado = "fugir"; r.ate = J.t + 4; }
    if (r.hp <= 0) {
      r.morto = true; J.M.animais[(r.cy * J.M.nc + r.cx) * 5 + r.k] = Math.max(0, J.M.animais[(r.cy * J.M.nc + r.cx) * 5 + r.k] - 1);
      for (const [k, n] of Object.entries(A.drops)) { const got = inv.dar(p, k, n); if (got) J.avisos.push({ tipo: "item", texto: `+${got} ${ITENS[k].nome}`, item: k }); }
      ganhar(p, "cacada", 2.5); ganhar(p, "combate", 1); p.trabalhouHoje = true;
    }
  } else if (r.bandido) {
    r.estado = "atacar"; r.vitima = 0; r.t0 = J.t; r.dormindo = false;
    if (r.hp <= 0) { J.avisos.push({ tipo: "item", texto: "Bandido derrotado — saqueie o corpo" }); J.matarNPC(r, "derrotado"); ganhar(p, "combate", 4); J.stats.bandidosDerrotados = (J.stats.bandidosDerrotados || 0) + 1; }
  } else {   // colono comum: revida ou foge
    r.dormindo = false; r.tarefa = null;
    if (r.hp <= 0) { J.stats.colonosMortos = (J.stats.colonosMortos || 0) + 1; J.matarNPC(r, "morto por você"); ganhar(p, "combate", 2); }
    else if (!r.revide) r.revide = { ate: J.t + 45, modo: J.rng() < limitar(0.25 + hab(r, "combate") / 100, 0.2, 0.9) ? "lutar" : "fugir" };
    else r.revide.ate = J.t + 45;
  }
  return alvo;
}
/** Colono atacado pelo jogador: revida (persegue e golpeia) ou foge. Devolve true se assumiu o comando do NPC neste passo. */
export function reagirAoAtaque(J, e, dt) {
  const rv = e.revide, p = J.jogador; if (!rv) return false;
  if (J.t > rv.ate || J.jogadorMorreu) { e.revide = null; return false; }
  e.tarefa = null; e.mov = false; e.flash = Math.max(0, (e.flash || 0) - dt);
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  if (rv.modo === "fugir") { mover(J, e, e.x + (e.x - p.x) * 3, e.y + (e.y - p.y) * 3, dt, 1.25); if (d > 14 * TS) e.revide = null; return true; }
  e.cdAtq = (e.cdAtq || 0) - dt;
  if (d > 16 * TS) { e.revide = null; return false; }
  if (d > TS * 1.1) mover(J, e, p.x, p.y, dt, 1.2);
  else if (e.cdAtq <= 0) {
    e.cdAtq = 1.3;
    if (J.rng() < chanceAcerto(hab(e, "combate"), hab(p, "combate"))) { J.efeitos.push({ x: p.x, y: p.y - 20, tipo: "dano", t: 0.3 }); J.danoJogador(4 + J.rng() * 5 + armaDe(e) / 3 + hab(e, "combate") / 15, e.nome); }
    else J.efeitos.push({ x: p.x, y: p.y - 40, tipo: "num", texto: "Desviou!", t: 0.7 });
  }
  return true;
}
/** Bandidos que decidiram atacar o jogador: perseguem e golpeiam em tempo real. */
export function atualizarHostis(J, dt) {
  const p = J.jogador; p.cdGolpe = Math.max(0, (p.cdGolpe || 0) - dt); p.golpe = Math.max(0, (p.golpe || 0) - dt); p.tDano = Math.max(0, (p.tDano || 0) - dt);
  for (const e of J.npcs) {
    if (!e.bandido || e.estado !== "atacar" || e.vitima !== 0) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y); e.cdAtq = (e.cdAtq || 0) - dt; e.flash = Math.max(0, (e.flash || 0) - dt);
    if (d > 16 * TS || J.t - e.t0 > 60) { e.estado = "tocaia"; e.cool = J.t + 90; continue; }
    if (d > TS * 1.1) mover(J, e, p.x, p.y, dt, 1.2);
    else if (e.cdAtq <= 0) {
      e.cdAtq = 1.2; p.dormindo = false;
      if (J.rng() >= chanceAcerto(hab(e, "combate"), hab(p, "combate"))) { J.efeitos.push({ x: p.x, y: p.y - 40, tipo: "num", texto: "Desviou!", t: 0.7 }); continue; }
      const roubo = Math.min(p.ouro, Math.max(10, Math.floor(p.ouro * 0.06))); p.ouro -= roubo; e.ouro += roubo;
      J.danoJogador(7 + J.rng() * 7 + hab(e, "combate") / 12, "um bandido");
      J.efeitos.push({ x: p.x, y: p.y - 20, tipo: "dano", t: 0.3 });
      if (roubo) J.avisos.push({ tipo: "assalto", texto: `Um bandido roubou ${roubo} moedas de você!`, x: e.x, y: e.y });
    }
  }
}
