// CONTROLE DO JOGADOR — movimento, coleta (segurar o mouse), obras, beber, comer, dormir, combate. Código puro (sem canvas): roda nos testes.
// A tela (cenas.js) só traduz teclado/mouse em `ctl` e chama atualizarJogador(J, ctl, dt).
//   ctl = { dir:{x,y}, mundo:{x,y} (cursor em px do mundo), segura:bool (botão do mouse), }
// J.acao descreve o que o jogador está fazendo (a interface lê para mostrar a barra de progresso).
import { C } from "./config.js";
import { COLETA } from "./dados/coleta.js";
import { FEAT } from "./dados/arte.js";
import { CONSTR } from "./dados/construcoes.js";
import { ITENS } from "./dados/itens.js";
import { T, featEm, aplicarColeta, aguaDoce, terreno } from "./mundo.js";
import { livre, tileDe, desencalhar } from "./sistemas/movimento.js";
import { hab, ganhar, velocidade, atende } from "./sistemas/habilidades.js";
import * as inv from "./sistemas/inventario.js";
import * as nec from "./sistemas/necessidades.js";
import { registrarOferta } from "./sistemas/economia.js";
import { podeConstruir, iniciarObra, trabalharObra, construcaoEm, distAteConstr } from "./sistemas/construcao.js";
import { golpeJogador, alcanceArma } from "./sistemas/combate.js";
import { podeColetar, ferramentaPara, bonusFerr, usarFerramenta, fabricarMao, receitaMao, cozinhar } from "./sistemas/ferramentas.js";
import { temLoot } from "./sistemas/corpos.js";
import { ANIMAIS } from "./dados/animais.js";
import { ehMoradia } from "./sistemas/moradia.js";
const TS = C.TILE;
const ALC = C.ALCANCE;
const ST = C.STAMINA, STAMINA_TRAB = C.STAMINA_TRAB;
/** Fôlego: gasta `custo` por segundo; ao zerar o jogador fica exausto até recuperar um pouco. */
function gastarFolego(p, custo, dt) { p.stam = Math.max(0, p.stam - custo * dt); if (p.stam <= 0) p.exausto = true; }

/** Move o jogador com colisão por tile (desliza nas paredes). */
export function moverJogador(J, dir, dt, correr = false) {
  const p = J.jogador, m = Math.hypot(dir.x, dir.y);
  if (!J.chegando) desencalhar(J.M, p);
  if (!m || p.dormindo || J.chegando || J.jogadorMorreu || J.turno) { p.mov = false; return; }
  const corre = correr && !p.exausto && p.stam > 0;
  let vel = C.VEL_JOGADOR * C.VEL_FATOR * (corre ? C.CORRIDA : 1); if (terreno(J.M, tileDe(p.x), tileDe(p.y)) === T.RIO) vel *= C.VEL_RIO;
  const vx = (dir.x / m) * vel * dt, vy = (dir.y / m) * vel * dt;
  const n = Math.max(1, Math.ceil(Math.hypot(vx, vy) / 20));
  for (let i = 0; i < n; i++) {
    const nx = p.x + vx / n, ny = p.y + vy / n;
    if (livre(J.M, nx, ny)) { p.x = nx; p.y = ny; } else if (livre(J.M, nx, p.y)) p.x = nx; else if (livre(J.M, p.x, ny)) p.y = ny;
  }
  p.mov = true; p.correndo = corre; p.anim = (p.anim || 0) + dt * C.VEL_FATOR * (corre ? 10 : 7);
  p.dir = Math.abs(dir.x) > Math.abs(dir.y) ? (dir.x < 0 ? 1 : 2) : (dir.y < 0 ? 3 : 0);
}

/** O que existe sob o cursor (em px do mundo). Devolve { tipo, ... } ou null. */
export function alvoEm(J, wx, wy) {
  let melhor = null, md = 34;
  for (const n of J.npcs) { const d = Math.hypot(n.x - wx, n.y - 28 - wy); if (d < md) { md = d; melhor = { tipo: "npc", ref: n, x: n.x, y: n.y }; } }
  if (melhor) return melhor;
  md = 40;
  for (const a of J.animais) { const d = Math.hypot(a.x - wx, a.y - 20 - wy); if (d < md) { md = d; melhor = { tipo: "animal", ref: a, x: a.x, y: a.y }; } }
  if (melhor) return melhor;
  md = 40;
  for (const c of J.corpos) { const d = Math.hypot(c.x - wx, c.y - 10 - wy); if (d < md) { md = d; melhor = { tipo: "corpo", ref: c, x: c.x, y: c.y }; } }
  if (melhor) return melhor;
  const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
  const b = construcaoEm(J, tx, ty); if (b) return { tipo: "constr", ref: b, x: (tx + 0.5) * TS, y: (ty + 0.5) * TS };
  // elementos altos (árvores) desenham acima do tile: aceita o tile logo abaixo do cursor também
  for (const oy of [0, 1]) {
    const f = featEm(J.M, tx, ty + oy);
    if (f && COLETA[f]) return { tipo: "feat", f, tx, ty: ty + oy, x: (tx + 0.5) * TS, y: (ty + oy + 0.5) * TS };
  }
  if (aguaDoce(J.M, tx, ty)) return { tipo: "agua", tx, ty, x: (tx + 0.5) * TS, y: (ty + 0.5) * TS };
  return null;
}
const distJ = (J, a) => (a.tipo === "constr" ? distAteConstr(a.ref, J.jogador.x, J.jogador.y) : Math.hypot(a.x - J.jogador.x, a.y - J.jogador.y));
export const alcanca = (J, a) => distJ(J, a) <= ALC + (a.tipo === "feat" || a.tipo === "agua" ? TS * 0.6 : 0);

/** Texto curto do que o clique faria (para o cursor/dica) + por que não dá. */
export function descreverAlvo(J, a) {
  if (!a) return null;
  const p = J.jogador;
  if (a.tipo === "npc") return { txt: a.ref.bandido ? `${a.ref.nome} (bandido!) — clique para atacar` : `${a.ref.nome} — clique: conversar · botão direito: atacar`, ok: true };
  if (a.tipo === "corpo") return { txt: temLoot(a.ref) ? `Corpo de ${a.ref.nome} — clique para saquear` : `Corpo de ${a.ref.nome} (vazio)`, ok: true };
  if (a.tipo === "animal") return { txt: `${ANIMAIS[a.ref.esp].nome} — clique (ou segure) para atacar`, ok: true };
  if (a.tipo === "agua") return { txt: "Água — segure para beber", ok: true };
  if (a.tipo === "constr") { const d = CONSTR[a.ref.tipo], b = a.ref; return { txt: d.nome + (b.prog < 1 ? ` — obra ${Math.round(b.prog * 100)}%` : d.fogueira ? " — clique para cozinhar" : "") + (b.anuncio ? ` — ${b.anuncio.tipo === "venda" ? "à venda" : "para alugar"} por ${b.anuncio.preco}` : b.inquilino != null ? " — alugada" : ""), ok: true }; }
  if (a.tipo === "feat") {
    const c = COLETA[a.f], nome = FEAT[a.f].n;
    const pc = podeColetar(p, a.f);
    if (!pc.ok) return { txt: `${nome} — ${pc.motivo.charAt(0).toLowerCase() + pc.motivo.slice(1)}`, ok: false };
    if (a.f === 10) return { txt: "Toco — segure para remover (+1 madeira; a árvore não volta). Se deixar, ela rebrota em 5 dias", ok: true };
    return { txt: `${nome} — segure para coletar`, ok: true };
  }
  return null;
}

function parar(J) { J.acao = null; }
/** Segurar o mouse sobre algo: coletar, trabalhar na obra, beber. */
function trabalhar(J, a, dt) {
  const p = J.jogador;
  if (!a || a.tipo === "npc" || a.tipo === "animal" || a.tipo === "corpo") return parar(J);
  if (!alcanca(J, a)) { J.acao = { tipo: "erro", msg: "Chegue mais perto" }; return; }
  if (a.tipo === "feat") {
    const c = COLETA[featEm(J.M, a.tx, a.ty)]; if (!c) return parar(J);
    const pc = podeColetar(p, featEm(J.M, a.tx, a.ty)); if (!pc.ok) { J.acao = { tipo: "erro", msg: pc.motivo }; return; }
    if (p.exausto) { J.acao = { tipo: "erro", msg: "Sem fôlego — descanse um pouco" }; return; }
    const k = a.tx + "," + a.ty; if (!J.acao || J.acao.chave !== k) J.acao = { tipo: "coletar", chave: k, prog: 0, nome: FEAT[a.f].n };
    J.acao.prog += (dt * velocidade(hab(p, c.hab)) * bonusFerr(pc.ferr)) / c.base; p.mov = false; p.trab = true; p.trabHab = c.hab; p.dir = dirPara(p, a); gastarFolego(p, STAMINA_TRAB[c.hab] ?? 1.5, dt);
    if (J.acao.prog >= 1) {
      const ganho = [];
      for (const [item, [lo, hi]] of Object.entries(c.drops)) { const n = lo + Math.floor(J.rng() * (hi - lo + 1)), got = inv.dar(p, item, n); if (got) { registrarOferta(J, item, got); ganho.push(`+${got} ${ITENS[item].nome}`); } else ganho.push("Mochila cheia"); }
      J.avisos.push({ tipo: "item", texto: ganho.join("  ") });
      ganhar(p, c.hab, 1); p.trabalhouHoje = true;
      if (pc.ferr) usarFerramenta(J, p, pc.ferr, 1);
      aplicarColeta(J.M, a.tx, a.ty, c, J.t);
      J.acao = null;
    }
    return;
  }
  if (a.tipo === "agua" || (a.tipo === "constr" && CONSTR[a.ref.tipo].agua && a.ref.prog >= 1)) {
    if (p.sede < 2 && p.cantil >= 3) { J.acao = { tipo: "erro", msg: "Sem sede" }; return; }
    if (!J.acao || J.acao.tipo !== "beber") J.acao = { tipo: "beber", prog: 0, nome: "Bebendo" };
    J.acao.prog += dt / 1.1; p.trab = true; p.trabHab = "beber";
    if (J.acao.prog >= 1) { nec.beberRio(p); J.avisos.push({ tipo: "item", texto: "Sede saciada — cantil cheio" }); J.acao = null; }
    return;
  }
  if (a.tipo === "constr" && a.ref.prog < 1 && a.ref.dono === 0) {
    if (p.exausto) { J.acao = { tipo: "erro", msg: "Sem fôlego — descanse um pouco" }; return; }
    const r = trabalharObra(J, p, a.ref, dt); p.trab = true; p.trabHab = "construcao"; p.mov = false; p.dir = dirPara(p, a); gastarFolego(p, STAMINA_TRAB.construcao, dt);
    J.acao = r.estado === "faltam" ? { tipo: "erro", msg: `Faltam materiais: ${ITENS[r.item].nome}` } : r.estado === "pronto" ? null : { tipo: "obra", prog: a.ref.prog, obra: a.ref, nome: CONSTR[a.ref.tipo].nome };
    return;
  }
  parar(J);
}
const dirPara = (p, a) => { const dx = a.x - p.x, dy = a.y - p.y; return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); };

/** Tenta posicionar uma obra; devolve { ok, motivo, obra }. */
export function colocarObra(J, tipo, tx, ty) {
  const p = J.jogador, d = CONSTR[tipo];
  if (!atende(p, d.req)) return { ok: false, motivo: "Habilidade insuficiente" };
  const r = podeConstruir(J, tipo, tx, ty); if (!r.ok) return r;
  if (Math.hypot((tx + d.w / 2) * TS - p.x, (ty + d.h / 2) * TS - p.y) > 14 * TS) return { ok: false, motivo: "Longe demais" };
  return { ok: true, obra: iniciarObra(J, p, tipo, tx, ty) };
}

/** Fabrica à mão (qualquer lugar): machado/picareta de pedra, vara de pesca. */
export function fabricar(J, saida) {
  const r = receitaMao(saida); if (!r) return { ok: false, motivo: "Receita desconhecida" };
  const res = fabricarMao(J, J.jogador, r);
  J.avisos.push({ tipo: "item", texto: res.ok ? `Você fabricou: ${ITENS[saida].nome}` : res.motivo });
  return res;
}
export function comerMelhor(J) {
  const p = J.jogador, f = nec.melhorComida(p); if (!f) { J.avisos.push({ tipo: "item", texto: "Sem comida na mochila" }); return false; }
  return nec.comer(p, f);
}
export function usarItem(J, item) {
  const p = J.jogador; if (ITENS[item] && ITENS[item].fome) return nec.comer(p, item);
  return false;
}
export function beberDoCantil(J) { const ok = nec.beberCantil(J.jogador); if (!ok) J.avisos.push({ tipo: "item", texto: "Cantil vazio — encha na água" }); return ok; }
/** Moradia feita pelo jogador, ainda dele e sem inquilino, a até 5 tiles. */
export function moradiaPropriaPerto(J) {
  const p = J.jogador;
  return J.construcoes.find((b) => ehMoradia(b) && b.dono === 0 && (b.criador ?? 0) === 0 && b.inquilino == null && distAteConstr(b, p.x, p.y) <= TS * 5) || null;
}
export function alternarSono(J) {
  const p = J.jogador; if (p.dormindo) { p.dormindo = false; return; }
  if (J.turno) { J.avisos.push({ tipo: "item", texto: "Cancele o turno de trabalho primeiro" }); return; }
  if (!moradiaPropriaPerto(J)) { J.avisos.push({ tipo: "item", texto: "Só dá para dormir numa moradia construída por você (e que não esteja alugada): fique perto dela" }); return; }
  if (p.cans < 25) { J.avisos.push({ tipo: "item", texto: "Sem sono agora" }); return; }
  if (J.npcs.some((n) => n.bandido && n.estado === "atacar" && Math.hypot(n.x - p.x, n.y - p.y) < 900)) { J.avisos.push({ tipo: "item", texto: "Perigo por perto!" }); return; }
  p.dormindo = true;
}
export const alcanceAtaque = (J) => alcanceArma(J.jogador);
export const atacar = (J, alvo = null) => (J.jogador.dormindo || J.chegando || J.turno ? null : golpeJogador(J, alvo));

/** Chamado uma vez por passo (1/60 s) com o que o jogador está pedindo. */
export function atualizarJogador(J, ctl, dt) {
  const p = J.jogador; p.trab = false; p.trabHab = null; p.correndo = false;
  if (p.stam === undefined) p.stam = ST.max;
  if (J.jogadorMorreu) return;
  moverJogador(J, ctl.dir || { x: 0, y: 0 }, dt, !!ctl.correr);
  if (p.correndo) gastarFolego(p, ST.corrida, dt);
  if (ctl.dir && (ctl.dir.x || ctl.dir.y)) { if (J.acao && J.acao.tipo !== "erro") parar(J); if (p.dormindo) p.dormindo = false; }
  if (ctl.segura && !J.chegando && !p.dormindo && !(ctl.dir && (ctl.dir.x || ctl.dir.y)) && ctl.mundo) trabalhar(J, ctl.alvo !== undefined ? ctl.alvo : alvoEm(J, ctl.mundo.x, ctl.mundo.y), dt);
  else if (J.acao) parar(J);
  // recupera o fôlego quando não está correndo nem trabalhando (dormindo ou parado recupera mais)
  if (!p.correndo && !p.trab) p.stam = Math.min(ST.max, p.stam + (p.dormindo || J.turno ? ST.regen * 2 : p.mov ? ST.regenAndando : ST.regen) * dt);
  if (p.exausto && p.stam >= ST.retomar) p.exausto = false;
}
