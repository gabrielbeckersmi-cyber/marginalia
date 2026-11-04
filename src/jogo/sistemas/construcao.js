// CONSTRUÇÃO — onde pode, obra com consumo gradual de materiais (segurar o mouse), cidades (nascem do primeiro poço).
import { C } from "../config.js";
import { CONSTR } from "../dados/construcoes.js";
import { FEAT } from "../dados/arte.js";
import { NOMES_CIDADE } from "../dados/nomes.js";
import { escolher } from "../rng.js";
import { T, setFeat } from "../mundo.js";
import * as inv from "./inventario.js";
import { hab, velocidade, ganhar, atende, faltaReq } from "./habilidades.js";
import { desencalhar } from "./movimento.js";

export function podeConstruir(J, tipo, tx, ty) {
  const d = CONSTR[tipo], M = J.M, g = d.fogueira ? 1 : C.ESPACO_CONSTR, N = M.N;
  if (tx < 30 || ty < 30 || tx + d.w > N - 30 || ty + d.h > N - 30) return { ok: false, motivo: "Fora da ilha" };
  if (Math.hypot(tx - M.porto.tx, ty - M.porto.ty) < 16) return { ok: false, motivo: "Área do porto" };
  for (let y = ty; y < ty + d.h; y++) for (let x = tx; x < tx + d.w; x++) {
    const i = y * N + x, t = M.terr[i];
    if (t === T.MAR || t === T.LAGO || t === T.RIO) return { ok: false, motivo: "Não dá para construir na água" };
    if (FEAT[M.feat[i]] && FEAT[M.feat[i]].bloq) return { ok: false, motivo: "Árvore ou pedra no caminho: derrube/remova antes" };
    if (M.occ[i]) return { ok: false, motivo: "Já existe uma construção aqui" };
  }
  for (let y = ty - g; y < ty + d.h + g; y++) for (let x = tx - g; x < tx + d.w + g; x++) { const o = M.occ[y * N + x]; if (!o) continue; const ob = J.constrPorId.get(o); if (ob && CONSTR[ob.tipo].fogueira && !d.fogueira) continue; return { ok: false, motivo: `Muito perto de outra construção (deixe ${g} tiles)` }; }
  return { ok: true };
}
export const construcaoEm = (J, tx, ty) => { const id = J.M.occ[ty * J.M.N + tx]; return id ? J.constrPorId.get(id) : null; };

export function iniciarObra(J, dono, tipo, tx, ty) {
  const d = CONSTR[tipo], M = J.M, id = J.proxIdC++;
  for (let y = ty; y < ty + d.h; y++) for (let x = tx; x < tx + d.w; x++) { setFeat(M, x, y, 0); M.occ[y * M.N + x] = id; } // comida/mato embaixo some
  const b = { id, tipo, tx, ty, w: d.w, h: d.h, dono: dono.id, cidade: null, prog: 0, cons: {}, estoque: {}, caixa: 0, margem: C.MARGEM_MERCADO, precos: {}, vaga: null, empregados: [], criada: J.t, criador: dono.id, anuncio: null, inquilino: null };
  J.construcoes.push(b); J.constrPorId.set(id, b);
  if (d.moradia && !dono.casa) dono.casa = id;
  // quem estava parado onde a obra nasceu (colonos, jogador) é empurrado para fora, para não ficar preso dentro dela
  for (const e of [J.jogador, ...J.npcs]) if (e && !J.chegando && e.x >= tx * C.TILE - 2 && e.x < (tx + d.w) * C.TILE + 2 && e.y >= ty * C.TILE - 2 && e.y < (ty + d.h) * C.TILE + 2) desencalhar(M, e);
  return b;
}
export const centro = (b) => ({ x: (b.tx + b.w / 2) * C.TILE, y: (b.ty + b.h / 2) * C.TILE });
/** Ponto logo abaixo da construção (porta) onde as pessoas ficam. */
export const porta = (b) => ({ x: (b.tx + b.w / 2) * C.TILE, y: (b.ty + b.h + 0.7) * C.TILE });
export function distAteConstr(b, x, y) {
  const x0 = b.tx * C.TILE, x1 = (b.tx + b.w) * C.TILE, y0 = b.ty * C.TILE, y1 = (b.ty + b.h) * C.TILE;
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
}
export const restante = (b) => { const r = {}; for (const [k, v] of Object.entries(CONSTR[b.tipo].mat)) { const f = v - (b.cons[k] || 0); if (f > 0) r[k] = f; } return r; };
export const requisitos = (J, e, tipo) => faltaReq(e, CONSTR[tipo].req);

/** Trabalha na obra por dt segundos. Consome materiais proporcionalmente ao progresso. */
export function trabalharObra(J, e, b, dt) {
  if (b.prog >= 1) return { estado: "pronto" };
  const d = CONSTR[b.tipo];
  const martelo = inv.tem(e, "martelo") ? 1.25 : 1;
  let alvo = Math.min(1, b.prog + (dt * velocidade(hab(e, "construcao")) * C.CONSTR_RAPIDEZ * martelo) / d.tempo), falta = null;
  for (const [k, q] of Object.entries(d.mat)) {
    const tinha = b.cons[k] || 0, pode = (tinha + inv.qtd(e, k)) / q;
    if (pode < alvo) { alvo = Math.max(b.prog, pode); falta = k; }
  }
  if (alvo <= b.prog + 1e-9) return { estado: "faltam", item: falta };
  for (const [k, q] of Object.entries(d.mat)) {
    const precisa = Math.ceil(alvo * q - 1e-9) - (b.cons[k] || 0);
    if (precisa > 0) { inv.tirar(e, k, precisa); b.cons[k] = (b.cons[k] || 0) + precisa; }
  }
  b.prog = alvo; ganhar(e, "construcao", 0.45 * dt); e.trabalhouHoje = true;
  if (b.prog >= 0.9999) { concluir(J, b, e); return { estado: "pronto" }; }
  return { estado: "ok", item: falta };
}
function concluir(J, b, e) {
  b.prog = 1;
  const d = CONSTR[b.tipo], c = centro(b);
  if (d.agua) {
    let cid = J.cidades.find((x) => Math.hypot(x.tx - b.tx, x.ty - b.ty) < 60);
    if (!cid) { cid = { id: J.cidades.length + 1, nome: nomeCidade(J), tx: b.tx, ty: b.ty, fundador: e.id, dia: J.dia }; J.cidades.push(cid); J.avisos.push({ tipo: "cidade", texto: `${e.id === 0 ? "Você fundou" : e.nome + " fundou"} ${cid.nome}!`, cidade: cid.id }); }
    b.cidade = cid.id; if (!e.cidade) e.cidade = cid.id;
  }
  if (d.negocio) { e.negocios = e.negocios || []; if (!e.negocios.includes(b.id)) e.negocios.push(b.id); b.caixa = 0; }
  J.avisos.push({ tipo: "obra", texto: `${d.nome} concluída`, id: e.id, x: c.x, y: c.y });
}
function nomeCidade(J) { const usados = new Set(J.cidades.map((c) => c.nome)); const livres = NOMES_CIDADE.filter((n) => !usados.has(n)); return livres.length ? escolher(J.rng, livres) : "Vila " + (J.cidades.length + 1); }
export const cidadeMaisProxima = (J, tx, ty, raio = 70) => { let m = null, md = raio; for (const c of J.cidades) { const d = Math.hypot(c.tx - tx, c.ty - ty); if (d < md) { md = d; m = c; } } return m; };
