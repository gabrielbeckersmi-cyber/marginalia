// CORPOS — quem morre (de qualquer causa) deixa o que carregava no chão: o jogador pode saquear (painel "Saque").
// Poucos e temporários: no máx. MAX corpos; com bens duram 3 dias de jogo, vazios somem em 20 s.
import { C } from "../config.js";
import * as inv from "./inventario.js";
const MAX = 80;

export const temLoot = (c) => c.ouro > 0 || Object.keys(c.inv).length > 0;
export function deixarCorpo(J, e, causa) {
  if (!(e.ouro > 0) && !Object.keys(e.inv || {}).length) return null;
  const c = { id: J.proxIdCorpo = (J.proxIdCorpo || 0) + 1, x: e.x, y: e.y, nome: e.nome, sprite: e.sprite, bandido: !!e.bandido, inv: { ...e.inv }, ouro: Math.floor(e.ouro || 0), t: J.t, causa, vazioEm: null };
  J.corpos.push(c); if (J.corpos.length > MAX) J.corpos.shift();
  e.inv = {}; e.ouro = 0;
  return c;
}
/** Chame uma vez por passo (é barato): remove corpos esgotados ou antigos. */
export function atualizarCorpos(J) {
  if (!J.corpos.length || (J.quadro = (J.quadro || 0) + 1) % 30) return;
  J.corpos = J.corpos.filter((c) => (temLoot(c) ? J.t - c.t < 3 * C.DIA_SEG : J.t - c.vazioEm < 20));
}
function conferir(J, c) { if (!temLoot(c) && c.vazioEm == null) c.vazioEm = J.t; }
export function pegarItem(J, p, c, item, n = 99) {
  const q = Math.min(n, inv.qtd(c, item)); if (q <= 0) return 0;
  const got = inv.dar(p, item, q); if (got > 0) { inv.tirar(c, item, got); conferir(J, c); }
  return got;
}
export function pegarOuro(J, p, c) { const v = c.ouro; if (v > 0) { p.ouro += v; c.ouro = 0; conferir(J, c); } return v; }
export function pegarTudo(J, p, c) {
  let itens = 0; const ouro = pegarOuro(J, p, c);
  for (const k of Object.keys(c.inv)) itens += pegarItem(J, p, c, k, 99);
  return { itens, ouro, sobrou: Object.keys(c.inv).length > 0 };
}
