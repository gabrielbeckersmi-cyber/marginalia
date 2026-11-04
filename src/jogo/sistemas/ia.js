// IA DOS COLONOS — cada NPC escolhe uma TAREFA por vez (beber, comer, dormir, construir, colher, negociar...).
// Perto do jogador roda a cada quadro; longe, de tempos em tempos com dt grande (LOD) — por isso 700 colonos cabem na memória/CPU.
// Para mudar comportamento: edite `decidir*` (o que fazer) ou `EXEC.*` (como fazer cada tarefa).
import { C } from "../config.js";
import { CONSTR } from "../dados/construcoes.js";
import { ITENS, COMIDAS } from "../dados/itens.js";
import { COLETA } from "../dados/coleta.js";
import { PROFISSOES, IDX } from "../dados/habilidades.js";
import { ANIMAIS, ESPECIES } from "../dados/animais.js";
import { T, CH, acharGrupo, acharAgua, pertoDeAgua, pontoLivre, aplicarColeta, featEm } from "../mundo.js";
import { limitar } from "../rng.js";
import * as inv from "./inventario.js";
import * as nec from "./necessidades.js";
import { hab, nivel, velocidade, ganhar, atende } from "./habilidades.js";
import * as eco from "./economia.js";
import * as neg from "./negocios.js";
import { podeConstruir, iniciarObra, trabalharObra, porta, cidadeMaisProxima, restante, distAteConstr } from "./construcao.js";
import { mover, tileDe, pontoAdjacente } from "./movimento.js";
import { iaBandido } from "./bandidos.js";
import { retirarAnimalAtivo } from "./animais.js";
import { reagirAoAtaque } from "./combate.js";
import { deixarCorpo } from "./corpos.js";
import { podeColetar, ferramentaPara, bonusFerr, usarFerramenta, fabricarMao, receitaMao, RECEITAS_FOGUEIRA, cozinhar } from "./ferramentas.js";
import { procurarMoradia, anunciarSobras } from "./moradia.js";

const TS = C.TILE;
const NEGOCIO_DA_PROF = { ferreiro: "ferraria", comerciante: "mercado", cozinheiro: "cozinha", agricultor: "fazenda", carpinteiro: "serraria", minerador: "mina" };
// de onde vem cada item: colher no mapa (ferr = ferramenta), caçar, pescar ou comprar
const FEATS_DO_ITEM = {}; for (const [f, c] of Object.entries(COLETA)) for (const k of Object.keys(c.drops)) (FEATS_DO_ITEM[k] = FEATS_DO_ITEM[k] || new Set()).add(+f);
const GRUPO_DO_ITEM = { galho: "galho", madeira: "madeira", pedra: "pedra", minerio_ferro: "ferro", carvao: "carvao", fibra: "fibra", argila: "argila", bagas: "comida", maca: "comida", cogumelo: "comida", trigo: "comida", repolho: "comida" };

export function matar(J, e, causa) {
  if (e.morto) return; e.morto = true; J.causas = J.causas || {}; J.causas[causa] = (J.causas[causa] || 0) + 1; (J.ultMortes = J.ultMortes || []).push({ f: Math.round(e.fome), s: Math.round(e.sede), est: e.estado, tar: e.tarefa && e.tarefa.tipo, esp: Math.round(e.espSede || 0), espC: Math.round(e.espCome || 0), id: Math.round((J.t - e.tCheg) / 60), cant: e.cantil, np: e.nPreso });
  deixarCorpo(J, e, causa);
  J.npcs.splice(J.npcs.indexOf(e), 1); J.porId.delete(e.id); J.mortes = (J.mortes || 0) + 1;
  for (const b of J.construcoes) { if (b.dono === e.id) { b.dono = -1; b.anuncio = null; } if (b.inquilino === e.id) { b.inquilino = null; b.aluguel = 0; } b.empregados = b.empregados.filter((x) => x !== e.id); }
  if (Math.hypot(e.x - J.jogador.x, e.y - J.jogador.y) < 900) J.avisos.push({ tipo: "morte", texto: `${e.nome} morreu (${causa})`, x: e.x, y: e.y });
}

// ── laço principal dos NPCs (com LOD) ──
export function atualizarNPCs(J, dt) {
  const p = J.jogador, perto2 = C.LOD_PERTO * C.LOD_PERTO; J.orcRota = 4;
  const lista = J.npcs.slice();
  for (const e of lista) {
    if (e.morto) continue;
    const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d2 < perto2) { atualizar(J, e, dt); e.ultimo = J.t; }
    else if (J.t - e.ultimo >= C.LOD_INTERVALO + (e.id % 7) * 0.1) { const d = Math.min(J.t - e.ultimo, 8); e.ultimo = J.t; atualizar(J, e, d); e.mov = false; }
  }
}
export function atualizar(J, e, dt) {
  if (nec.atualizar(e, dt)) return matar(J, e, "fome ou sede");
  if (e.pausaAte > J.t) { e.mov = false; return; }
  if (e.dormindo) { e.mov = false; return; }
  if (e.bandido) return iaBandido(J, e, dt);
  if (e.revide && reagirAoAtaque(J, e, dt)) return;
  e.mov = false;
  if (!e.tarefa) e.tarefa = decidir(J, e);
  if (!e.tarefa) return;
  let t = e.tarefa;
  // necessidades urgentes interrompem tarefas longas (explorar, colher, construir...)
  const urg = e.sede > 55 && J.t > (e.espSede || 0) ? "beber" : e.fome > 68 && J.t > (e.espCome || 0) ? "comer" : e.cans > 90 && e.sede < 60 && e.fome < 75 ? "dormir" : null;
  if (urg && t.tipo !== urg && t.tipo !== "beber" && t.tipo !== "comer" && t.tipo !== "dormir" && !(t.depois && t.depois.tipo === urg)) {
    if (t.b && t.b.prog < 1) e.obraPend = t.b.id;
    t = e.tarefa = { tipo: urg };
  }
  if ((e.nPreso || 0) > 7) {
    if (e.sede > 60 && e.cantil > 0) nec.beberCantil(e); e.nPreso = 0; e.tarefa = null; e.espera = J.t + 4; if (t.b && t.b.prog < 1) e.obraPend = t.b.id; return; }
  const fim = EXEC[t.tipo](J, e, t, dt);
  if (fim && e.tarefa === t) { e.tarefa = t.depois || null; e.nPreso = 0; }
}

// ── decisão ──
function decidir(J, e) {
  const tx = tileDe(e.x), ty = tileDe(e.y);
  if (e.sede > 42 && J.t > (e.espSede || 0)) return { tipo: "beber" };
  if (e.fome > 55 && J.t > (e.espCome || 0)) return { tipo: "comer" };
  if (e.cans > 78 && e.sede < 60 && e.fome < 75) return { tipo: "dormir" };
  if (e.estado === "chegar" || e.estado === "explorar") {
    if (e.estado === "explorar") {
      e.tExp = (e.tExp || 0) + 1;
      const cid = cidadeMaisProxima(J, tx, ty, 70);
      if ((J.t - e.tCheg > e.paciencia && pertoDeAgua(J.M, tx, ty, 22)) || (cid && J.t - e.tCheg > 90)) { assentar(J, e); return { tipo: "ocioso", d: 1 }; }
      if (J.t - e.tCheg > e.paciencia) return { tipo: "explorar", paraAgua: true };
    }
    return { tipo: "explorar" };
  }
  return decidirViver(J, e);
}
function assentar(J, e) {
  const tx = tileDe(e.x), ty = tileDe(e.y), cid = cidadeMaisProxima(J, tx, ty, 90);
  if (cid && J.rng() < 0.85) { e.cidade = cid.id; const pop = J.npcs.filter((n) => n.cidade === cid.id).length; e.centro = { tx: cid.tx, ty: cid.ty, r: [7, 16 + Math.sqrt(pop) * 4] }; }
  else if (!cid && e.fundador) { const ag = acharAgua(J.M, tx, ty, 6); e.fundaPoco = true; e.centro = ag ? { tx: ag.tx, ty: ag.ty, r: [4, 9] } : { tx, ty, r: [3, 10] }; }
  else e.centro = { tx, ty, r: [3, 13] };
  e.estado = "viver";
}
function acharSitio(J, tipo, c) {
  const d = CONSTR[tipo];
  for (let k = 0; k < 45; k++) {
    const p = pontoLivre(J.M, c.tx, c.ty, c.r[0], c.r[1] + k * 0.4, J.rng); if (!p) continue;
    const tx = p.tx - Math.floor(d.w / 2), ty = p.ty - Math.floor(d.h / 2);
    if (podeConstruir(J, tipo, tx, ty).ok) return { tx, ty };
  }
  return null;
}
const tarefaConstruir = (J, e, tipoC) => { const sitio = acharSitio(J, tipoC, e.centro || { tx: tileDe(e.x), ty: tileDe(e.y), r: [3, 12] }); return sitio ? { tipo: "construir", tipoC, sitio, b: null } : null; };
const construcaoDe = (J, id) => (id ? J.constrPorId.get(id) : null);

function decidirViver(J, e) {
  if (J.t < (e.espera || 0)) return { tipo: "ocioso", d: 3 };
  const obra = construcaoDe(J, e.obraPend);
  if (obra && obra.prog < 1) return { tipo: "construir", tipoC: obra.tipo, b: obra, sitio: null };
  e.obraPend = null;
  const casa = construcaoDe(J, e.casa);
  if (e.fundaPoco && !e.pocoFeito) {
    const poco = J.construcoes.find((b) => b.dono === e.id && b.tipo === "poco");
    if (poco && poco.prog >= 1) { e.pocoFeito = true; e.cidade = poco.cidade; }
    else { const t = tarefaConstruir(J, e, "poco"); if (t) return t; e.fundaPoco = false; }
  }
  if (!casa || casa.prog < 1) {
    if (!casa) {
      if (J.t > (e.proxCasa || 0)) { e.proxCasa = J.t + 45; if (procurarMoradia(J, e)) return { tipo: "ocioso", d: 2 }; }   // aluga ou compra uma casa anunciada, se o preço agradar
      const t = tarefaConstruir(J, e, "cabana"); if (t) return t; e.espera = J.t + 20;
    }
  } else {
    if (casa.tipo === "tenda" && J.t > (e.proxCasa || 0)) { e.proxCasa = J.t + 120; if (procurarMoradia(J, e)) return { tipo: "ocioso", d: 2 }; }
    if (J.t > (e.proxAnuncio || 0)) { e.proxAnuncio = J.t + 240; anunciarSobras(J, e); }
    if (e.cidade && J.t > (e.proxFogueira || 0)) {
      e.proxFogueira = J.t + 400;
      if (J.rng() < 0.5 && !J.construcoes.some((b) => b.tipo === "fogueira" && Math.hypot(b.tx - casa.tx, b.ty - casa.ty) < 35)) { const t = tarefaConstruir(J, e, "fogueira"); if (t) return t; }
    }
  }
  const meu = negocioAtivo(J, e);
  const tipoN = NEGOCIO_DA_PROF[e.prof];
  if (!meu && !e.emprego && tipoN && casa && casa.prog >= 1 && e.ouro > 900 && J.t - e.tCheg > 500 && J.rng() < 0.25 && atende(e, CONSTR[tipoN].req) && !J.construcoes.some((b) => b.dono === e.id && b.tipo === tipoN)) {
    const t = tarefaConstruir(J, e, tipoN); if (t) return t;
  }
  if (!meu && !e.emprego && casa && casa.prog >= 1 && J.rng() < 0.3) procurarEmprego(J, e);
  if (meu && meu.dono === e.id && !meu.vaga && !CONSTR[meu.tipo].mercado && e.ouro > 1500 && J.npcs.length > 25) neg.anunciarVaga(meu, 40 + Math.round(J.rng() * 50));
  return trabalhar(J, e, meu);
}
function negocioAtivo(J, e) {
  for (const id of e.negocios || []) { const b = J.constrPorId.get(id); if (b && b.prog >= 1) return b; }
  return construcaoDe(J, e.emprego) && construcaoDe(J, e.emprego).prog >= 1 ? construcaoDe(J, e.emprego) : null;
}
function procurarEmprego(J, e) {
  const tx = tileDe(e.x), ty = tileDe(e.y);
  for (const b of J.construcoes) {
    if (!b.vaga || b.prog < 1 || b.dono === e.id || Math.hypot(b.tx - tx, b.ty - ty) > 90) continue;
    const dono = eco.donoDe(J, b); if (!dono || dono.ouro < b.vaga.salario * 3) continue;
    if (b.empregados.length >= 2) continue;
    if (nivel(hab(e, CONSTR[b.tipo].hab)) < 2 && J.rng() < 0.7) continue;
    if (neg.contratar(J, b, e)) return true;
  }
  return false;
}
function excedente(e) {
  const guardar = { galho: 4, bagas: 4, maca: 4, pao: 4, carne_assada: 4, ensopado: 4, cogumelo: 3, repolho: 3 };
  const reserva = e.casa ? {} : { madeira: 14, fibra: 10 };
  if (e.fundaPoco && !e.pocoFeito) { reserva.pedra = 12; reserva.madeira = (reserva.madeira || 0) + 4; }
  const lista = []; let v = 0;
  for (const k in e.inv) { const d = ITENS[k]; if (d.ferramenta || d.arma) continue; const sobra = e.inv[k] - (guardar[k] || 0) - (reserva[k] || 0) - (k === "madeira" || k === "pedra" || k === "fibra" ? 6 : 0); if (sobra > 0) { lista.push([k, sobra]); v += d.preco * sobra; } }
  return { lista, v };
}
function mercadoPara(J, e, raio = 220) {
  const tx = tileDe(e.x), ty = tileDe(e.y); let m = null, md = raio;
  for (const b of J.construcoes) { if (!CONSTR[b.tipo].mercado || b.prog < 1 || b.caixa < 40) continue; const d = Math.hypot(b.tx - tx, b.ty - ty); if (d < md) { md = d; m = b; } }
  return m;
}
function trabalhar(J, e, meu) {
  if (inv.qtd(e, "galho") > 12) inv.tirar(e, "galho", inv.qtd(e, "galho") - 12);   // lenha demais não vale a pena carregar
  const ex = excedente(e);
  if (ex.v > 90 && J.t > (e.proxVenda || 0)) { e.proxVenda = J.t + 100; if (mercadoPara(J, e)) return { tipo: "vender" }; }
  if ((inv.tem(e, "carne_crua") || inv.tem(e, "peixe_cru")) && inv.tem(e, "galho") && J.t > (e.proxCozinha || 0)) {
    const f = fogueiraPerto(J, e, 70); e.proxCozinha = J.t + (f ? 60 : 150); if (f) return { tipo: "cozinhar", b: f };
  }
  if (meu && J.rng() < 0.85) return { tipo: "negocio", b: meu, ate: 100 };
  const precisa = TIPO_FERR[e.prof]; if (precisa) { const tf = conseguirFerramenta(J, e, precisa); if (tf) return tf; }
  const colher = (grupo, item, vezes = 3) => (item && !GRUPO_DO_ITEM[item] ? { tipo: "ocioso", d: 2 } : { tipo: "colher", grupo: GRUPO_DO_ITEM[item] || grupo, item, vezes });
  const tem = (k) => inv.tem(e, k), r = J.rng;
  switch (e.prof) {
    case "lenhador": case "carpinteiro": return colher("madeira", "madeira", 4);
    case "minerador": case "ferreiro": { const lv = nivel(hab(e, "mineracao")), op = ["pedra"]; if (lv >= 6) op.push("carvao"); if (lv >= 12) op.push("minerio_ferro"); return colher("pedra", op[Math.floor(r() * op.length)]); }
    case "cacador": if (tem("arco") || tem("espada_ferro")) return { tipo: "cacar" }; return e.ouro >= 80 && estoquePerto(J, e, "arco") ? { tipo: "comprar", item: "arco", qtd: 1 } : colher("comida", "bagas");
    case "pescador": { if (tem("vara_pesca")) return { tipo: "pescar" }; const tv = conseguirVara(J, e); return tv || colher("comida", "bagas"); }
    case "agricultor": return colher("comida", r() < 0.5 ? "trigo" : "repolho");
    case "cozinheiro": return colher("comida", ["cogumelo", "bagas", "maca"][Math.floor(r() * 3)]);
    case "construtor": return colher("madeira", "madeira", 3);
    default: return colher("fibra", ["fibra", "bagas", "argila", "maca"][Math.floor(r() * 4)]);
  }
}
// ── ferramentas: cada colono mantém as suas (compra de ferro se puder, senão fabrica a de pedra com galho + pedra + fibra) ──
const TIPO_FERR = { lenhador: "lenhador", carpinteiro: "lenhador", construtor: "lenhador", minerador: "mineracao", ferreiro: "mineracao" };
const FERR_PEDRA = { lenhador: "machado_pedra", mineracao: "picareta_pedra" }, FERR_FERRO = { lenhador: "machado", mineracao: "picareta" };
function estoquePerto(J, e, item, raio = 200) { const tx = tileDe(e.x), ty = tileDe(e.y); return J.construcoes.some((b) => b.prog >= 1 && b.estoque[item] > 0 && Math.hypot(b.tx - tx, b.ty - ty) < raio && eco.precoVenda(J, b, item) <= e.ouro); }
function faltaMateriais(e, r) { for (const [k, q] of Object.entries(r.ins)) if (inv.qtd(e, k) < q) return { tipo: "colher", grupo: GRUPO_DO_ITEM[k], item: k, vezes: Math.max(1, Math.ceil((q - inv.qtd(e, k)) / 2)) }; return null; }
function conseguirFerramenta(J, e, tipo) {
  if (ferramentaPara(e, tipo, 1)) return null;
  const ferro = FERR_FERRO[tipo];
  if (e.ouro >= ITENS[ferro].preco * 1.4 && estoquePerto(J, e, ferro)) return { tipo: "comprar", item: ferro, qtd: 1 };
  const r = receitaMao(FERR_PEDRA[tipo]);
  if (inv.temTudo(e, r.ins)) { fabricarMao(J, e, r); return null; }
  return faltaMateriais(e, r);
}
function conseguirVara(J, e) {
  if (e.ouro >= 45 && estoquePerto(J, e, "vara_pesca")) return { tipo: "comprar", item: "vara_pesca", qtd: 1 };
  const r = receitaMao("vara_pesca"); if (inv.temTudo(e, r.ins)) { fabricarMao(J, e, r); return null; }
  return faltaMateriais(e, r);
}
const fogueiraPerto = (J, e, raio) => { const tx = tileDe(e.x), ty = tileDe(e.y); let m = null, md = raio; for (const b of J.construcoes) if (CONSTR[b.tipo].fogueira && b.prog >= 1) { const d = Math.hypot(b.tx - tx, b.ty - ty); if (d < md) { md = d; m = b; } } return m; };
/** Tarefa para conseguir `qtd` de um item (colher/caçar/comprar). null se impossível. */
function adquirir(J, e, item, qtd) {
  if (GRUPO_DO_ITEM[item]) {
    const f = [...(FEATS_DO_ITEM[item] || [])], precisaFerr = f.every((x) => !podeColetar(e, x).ok);
    if (!precisaFerr) return { tipo: "colher", grupo: GRUPO_DO_ITEM[item], item, vezes: Math.max(1, Math.ceil(qtd / 2.5)) };
  }
  if (item === "carne_crua" || item === "couro") return inv.tem(e, "arco") || inv.tem(e, "espada_ferro") ? { tipo: "cacar" } : null;
  return { tipo: "comprar", item, qtd };
}

// ── executores ──
const ir = (J, e, x, y, dt, raio = TS * 0.7) => mover(J, e, x, y, dt) <= raio;
const EXEC = {
  ocioso(J, e, t, dt) { t.d = (t.d ?? 3) - dt; e.mov = false; return t.d <= 0; },
  explorar(J, e, t, dt) {
    if (!t.alvo) {
      const tx = tileDe(e.x), ty = tileDe(e.y), p = J.M.porto; let c = null;
      if (t.paraAgua) { const ag = acharAgua(J.M, tx, ty, 70); if (ag) c = { tx: ag.px, ty: ag.py }; }
      else if (e.estado === "chegar") { const a = -Math.PI / 2 + (J.rng() - 0.5) * 2.2, d = 40 + J.rng() * 120; c = pontoLivre(J.M, Math.round(p.tx + Math.cos(a) * d), Math.round(p.ty + Math.sin(a) * d), 0, 12, J.rng); }
      else {
        const ag = J.rng() < 0.5 ? acharAgua(J.M, tx, ty, 14) : null;
        const a = J.rng() * 6.283, d = 25 + J.rng() * 90;
        c = ag ? { tx: ag.px, ty: ag.py } : pontoLivre(J.M, Math.round(tx + Math.cos(a) * d), Math.round(ty + Math.sin(a) * d), 0, 8, J.rng);
        const cid = cidadeMaisProxima(J, tx, ty, 160); if (cid && J.rng() < 0.3) c = { tx: cid.tx + Math.round((J.rng() - 0.5) * 20), ty: cid.ty + Math.round((J.rng() - 0.5) * 20) };
      }
      if (!c) { e.espera = J.t + 3; return true; }
      t.alvo = { x: (c.tx + 0.5) * TS, y: (c.ty + 0.5) * TS };
    }
    if (ir(J, e, t.alvo.x, t.alvo.y, dt, TS * 1.2)) { if (e.estado === "chegar") e.estado = "explorar"; t.pausa = (t.pausa ?? 1.5 + J.rng() * 4) - dt; return t.pausa <= 0; }
    return false;
  },
  beber(J, e, t, dt) {
    if (!t.alvo) {
      const tx = tileDe(e.x), ty = tileDe(e.y); let best = null, bd = 1e9;
      for (const b of J.construcoes) if (b.prog >= 1 && CONSTR[b.tipo].agua) { const d = Math.hypot(b.tx - tx, b.ty - ty); if (d < bd && d < 90) { bd = d; best = porta(b); } }
      const ag = acharAgua(J.M, tx, ty, 70);
      if (ag) { const d = Math.hypot(ag.tx - tx, ag.ty - ty); if (d < bd) { bd = d; best = { x: (ag.px + 0.5) * TS, y: (ag.py + 0.5) * TS }; } }
      if (!best || (bd > 45 && e.cantil > 0 && e.sede > 75)) { if (e.cantil > 0) { nec.beberCantil(e); return true; } e.espSede = J.t + 8; return true; }
      t.alvo = best;
    }
    if (ir(J, e, t.alvo.x, t.alvo.y, dt, TS * 1.1)) { t.w = (t.w || 0) + dt; if (t.w > 1.4) { nec.beberRio(e); return true; } } return false;
  },
  comer(J, e, t, dt) {
    if (e.fome < 28) return true;
    const f = nec.melhorComida(e);
    if (f) { t.tt = (t.tt || 0) + dt; e.mov = false; if (t.tt > 1.2) { t.tt = 0; nec.comer(e, f); eco.registrarDemanda(J, f, 1); } return false; }
    // sem comida: compra em negócio que venda, senão forrageia/caça
    let melhor = null, ms = 1e9; const tx = tileDe(e.x), ty = tileDe(e.y);
    for (const b of J.construcoes) {
      if (b.prog < 1) continue;
      for (const k in b.estoque) { if (!ITENS[k].fome || b.estoque[k] <= 0) continue; const d = Math.hypot(b.tx - tx, b.ty - ty), p = eco.precoVenda(J, b, k); if (d > 130 || p > e.ouro) continue; const s = (p / ITENS[k].fome) * (1 + d / 60); if (s < ms) { ms = s; melhor = { b, k }; } }
    }
    let sub = melhor ? { tipo: "comprar", item: melhor.k, qtd: 3, b: melhor.b } : { tipo: "colher", grupo: "comida", item: "bagas", vezes: 3, qualquer: true };
    if (!melhor && (inv.tem(e, "arco") || inv.tem(e, "espada_ferro")) && J.rng() < 0.4) sub = { tipo: "cacar" };
    sub.depois = t; sub.comidaFalha = t; e.tarefa = sub; return false;
  },
  dormir(J, e, t, dt) {
    if (!t.alvo) { const b = construcaoDe(J, e.casa); const tx = tileDe(e.x), ty = tileDe(e.y); t.alvo = b && b.prog >= 1 && Math.hypot(b.tx - tx, b.ty - ty) < 150 ? porta(b) : { x: e.x, y: e.y }; }
    if (ir(J, e, t.alvo.x, t.alvo.y, dt, TS)) { e.dormindo = true; e.mov = false; return true; } return false;
  },
  colher(J, e, t, dt) {
    if (!t.alvo) {
      const filtro = t.item && !t.qualquer ? (f) => FEATS_DO_ITEM[t.item] && FEATS_DO_ITEM[t.item].has(f) && podeColetar(e, f).ok : (f) => COLETA[f] && podeColetar(e, f).ok;
      const a = acharGrupo(J.M, t.grupo, tileDe(e.x), tileDe(e.y), 40, J.rng, filtro);
      if (!a) { if (t.depois && t.depois.tipo === 'construir') t.depois.falhas = (t.depois.falhas || 0) + 1; return fimFalha(J, e, t); }
      const p = pontoAdjacente(J.M, a.tx, a.ty, e.x, e.y) || { x: (a.tx + 0.5) * TS, y: (a.ty + 0.5) * TS };
      t.alvo = { ...a, px: p.x, py: p.y, prog: 0 };
    }
    const a = t.alvo, c = COLETA[featEm(J.M, a.tx, a.ty)];
    if (!c) { t.alvo = null; return false; }   // alguém colheu antes
    if (!ir(J, e, a.px, a.py, dt, TS * 0.8)) return false;
    const pc = podeColetar(e, featEm(J.M, a.tx, a.ty)); if (!pc.ok) { t.alvo = null; return false; }   // a ferramenta quebrou ou falta nível
    e.mov = false; a.prog += (dt * velocidade(hab(e, c.hab)) * bonusFerr(pc.ferr)) / c.base;
    if (a.prog < 1) return false;
    for (const [k, [lo, hi]] of Object.entries(c.drops)) { const n = lo + Math.floor(J.rng() * (hi - lo + 1)); inv.dar(e, k, n); eco.registrarOferta(J, k, n); }
    ganhar(e, c.hab, 1); e.trabalhouHoje = true;
    if (pc.ferr) usarFerramenta(J, e, pc.ferr, 1);
    aplicarColeta(J.M, a.tx, a.ty, c, J.t);
    t.alvo = null; t.vezes = (t.vezes ?? 1) - 1; return t.vezes <= 0;
  },
  pescar(J, e, t, dt) {
    if (!t.alvo) { const ag = acharAgua(J.M, tileDe(e.x), tileDe(e.y), 30); if (!ag) { e.espera = J.t + 30; return true; } t.alvo = { x: (ag.px + 0.5) * TS, y: (ag.py + 0.5) * TS, prog: 0 }; }
    if (!ir(J, e, t.alvo.x, t.alvo.y, dt, TS * 0.6)) return false;
    e.mov = false; t.alvo.prog += (dt * velocidade(hab(e, "pesca"))) / 9;
    if (t.alvo.prog >= 1) { const n = 1 + Math.floor(J.rng() * 2); inv.dar(e, "peixe_cru", n); eco.registrarOferta(J, "peixe_cru", n); ganhar(e, "pesca", 1); usarFerramenta(J, e, "vara_pesca", 1); e.trabalhouHoje = true; t.vezes = (t.vezes ?? 3) - 1; t.alvo.prog = 0; }
    return t.vezes <= 0;
  },
  cacar(J, e, t, dt) {
    if (!t.alvo) {
      const cx = Math.floor(e.x / TS / CH), cy = Math.floor(e.y / TS / CH), nc = J.M.nc; let melhor = null, md = 1e9;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= nc || y >= nc) continue;
        for (let k = 0; k < ESPECIES.length; k++) { if (J.M.animais[(y * nc + x) * ESPECIES.length + k] > 0 && (ESPECIES[k] === "coelho" || ESPECIES[k] === "cervo" || hab(e, "combate") > 12 || inv.tem(e, "espada_ferro"))) { const d = dx * dx + dy * dy + J.rng(); if (d < md) { md = d; melhor = { x, y, k }; } } }
      }
      if (!melhor) { e.espera = J.t + 40; return true; }
      const p = pontoLivre(J.M, melhor.x * CH + 16, melhor.y * CH + 16, 0, 12, J.rng); if (!p) { e.espera = J.t + 20; return true; }
      t.alvo = { ...melhor, px: (p.tx + 0.5) * TS, py: (p.ty + 0.5) * TS, prog: 0 };
    }
    const a = t.alvo; if (!ir(J, e, a.px, a.py, dt, TS * 1.2)) return false;
    e.mov = false; a.prog += dt * velocidade(hab(e, "cacada")) / 10; if (a.prog < 1) return false;
    const esp = ESPECIES[a.k], A = ANIMAIS[esp], idx = (a.y * J.M.nc + a.x) * ESPECIES.length + a.k;
    if (J.M.animais[idx] <= 0) return true;
    const armaItem = inv.tem(e, "espada_ferro") ? "espada_ferro" : "arco"; usarFerramenta(J, e, armaItem, 1);
    const arma = armaItem === "espada_ferro" ? 13 : 8, p = limitar(0.3 + hab(e, "cacada") / 160 + hab(e, "combate") / 250 + arma / 60 - A.dano / 40, 0.15, 0.95);
    if (J.rng() < p) { J.M.animais[idx]--; retirarAnimalAtivo(J, a.x, a.y, a.k); for (const [k, n] of Object.entries(A.drops)) { inv.dar(e, k, n); eco.registrarOferta(J, k, n); } ganhar(e, "cacada", 2); ganhar(e, "combate", 0.5); e.trabalhouHoje = true; }
    else { e.hp -= A.dano * (0.8 + J.rng()); ganhar(e, "combate", 0.8); if (e.hp <= 0) matar(J, e, `atacado por ${A.nome.toLowerCase()}`); }
    return true;
  },
  comprar(J, e, t, dt) {
    if (!t.b) {
      let m = null, ms = 1e9; const tx = tileDe(e.x), ty = tileDe(e.y);
      for (const b of J.construcoes) { if (b.prog < 1 || !(b.estoque[t.item] > 0)) continue; const d = Math.hypot(b.tx - tx, b.ty - ty), p = eco.precoVenda(J, b, t.item); if (d > 200 || p > e.ouro) continue; const s = p * (1 + d / 80); if (s < ms) { ms = s; m = b; } }
      if (!m) { if (t.depois && t.depois.tipo === 'construir') t.depois.falhas = (t.depois.falhas || 0) + 1; return fimFalha(J, e, t); }
      t.b = m;
    }
    const p = porta(t.b); if (!ir(J, e, p.x, p.y, dt, TS * 1.4)) return false;
    eco.comprar(J, e, t.b, t.item, t.qtd || 1); return true;
  },
  vender(J, e, t, dt) {
    if (!t.b) { t.b = mercadoPara(J, e); if (!t.b) return true; }
    const p = porta(t.b); if (!ir(J, e, p.x, p.y, dt, TS * 1.4)) return false;
    for (const [k, n] of excedente(e).lista) { const r = eco.venderAoMercado(J, e, t.b, k, n); if (!r.ok && r.motivo === "Mercado sem caixa") break; }
    ganhar(e, "comercio", 0.5); return true;
  },
  construir(J, e, t, dt) {
    const d = CONSTR[t.tipoC];
    if (!t.b) {
      if (!t.sitio) return true;
      if (!ir(J, e, (t.sitio.tx + d.w / 2) * TS, (t.sitio.ty + d.h + 0.8) * TS, dt, TS * 1.5)) return false;
      if (!podeConstruir(J, t.tipoC, t.sitio.tx, t.sitio.ty).ok) { t.sitio = acharSitio(J, t.tipoC, e.centro || { tx: tileDe(e.x), ty: tileDe(e.y), r: [3, 12] }); if (!t.sitio) { e.espera = J.t + 30; return true; } return false; }
      t.b = iniciarObra(J, e, t.tipoC, t.sitio.tx, t.sitio.ty); e.obraPend = t.b.id;
    }
    const b = t.b;
    if (b.prog >= 1) { e.obraPend = null; return true; }
    const p = porta(b); if (!ir(J, e, p.x, p.y, dt, TS * 2.0)) return false;
    e.mov = false; const r = trabalharObra(J, e, b, dt);
    if (r.estado === "faltam") {
      const falta = restante(b)[r.item] || 1, sub = (t.falhas || 0) >= 2 ? null : adquirir(J, e, r.item, falta);
      if (sub) { sub.depois = t; sub.obraFalha = t; e.tarefa = sub; return false; }
      e.espera = J.t + 60; return true;
    }
    return r.estado === "pronto";
  },
  cozinhar(J, e, t, dt) {
    const b = t.b; if (!b || b.prog < 1) return true;
    const p = porta(b); if (!ir(J, e, p.x, p.y, dt, TS * 1.8)) return false;
    e.mov = false; const r = RECEITAS_FOGUEIRA.find((x) => inv.temTudo(e, x.ins)); if (!r) return true;
    return !!cozinhar(J, e, r, dt).erro;
  },
  negocio(J, e, t, dt) {
    const b = t.b, d = CONSTR[b.tipo];
    if (b.prog < 1 || b.dono === -1 && b.empregados.indexOf(e.id) < 0 && b.dono !== e.id) return true;
    const p = porta(b); if (!ir(J, e, p.x, p.y, dt, TS * 1.6)) return false;
    e.mov = false; t.ate -= dt; e.trabalhouHoje = true;
    if (t.ate <= 0) return true;
    if (d.mercado) { const dono = eco.donoDe(J, b); if (dono && dono === e && b.caixa < 400 && e.ouro > 1100) { e.ouro -= 500; b.caixa += 500; } ganhar(e, "comercio", 0.05 * dt); return false; }
    if (!t.a) {
      let melhor = null, ms = -1;
      for (const a of neg.acoesDe(b.tipo)) { if ((b.estoque[a.saida] || 0) >= 30 || nivel(hab(e, a.hab)) < (a.nivel || 1)) continue; const falta = neg.checar(e, b, a), s = eco.preco(J, a.saida) * a.qtd / a.base * (falta ? 0.01 : 1); if (s > ms) { ms = s; melhor = { a, falta }; } }
      if (!melhor) return true;
      if (melhor.falta) { const k = Object.entries(melhor.a.ins).find(([k, v]) => (b.estoque[k] || 0) + inv.qtd(e, k) < v); const sub = k ? adquirir(J, e, k[0], k[1] * 2) : null; let sub2 = sub; if (!sub2 && melhor.a.hab === "mineracao" && !ferramentaPara(e, "mineracao", 1)) sub2 = conseguirFerramenta(J, e, "mineracao"); if (sub2) { sub2.depois = t; e.tarefa = sub2; return false; } e.espera = J.t + 20; return true; }
      t.a = melhor.a;
    }
    const r = neg.avancar(J, e, b, t.a, dt);
    if (r.erro || r.fim) t.a = null;
    return false;
  },
};
function fimFalha(J, e, t) {
  // não deu para conseguir o item: larga a tarefa-pai (sem laço), com um tempo de espera
  const pai = t.depois;
  if (pai) {
    if (pai.tipo === "comer") { e.espCome = J.t + 12; if (e.estado === "chegar") e.estado = "explorar"; }
    if (pai.tipo === "construir" && pai.b) e.obraPend = pai.b.id;
    e.espera = Math.max(e.espera || 0, J.t + 20); e.tarefa = null; return false;
  }
  e.espera = Math.max(e.espera || 0, J.t + 8);
  return true;
}
export { adquirir };
