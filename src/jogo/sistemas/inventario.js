// INVENTÁRIO — objeto { item: quantidade } em qualquer entidade (jogador, NPC, negócio).
export const MAX_PILHA = 99, MAX_TOTAL = 160;
export const qtd = (e, item) => (e.inv && e.inv[item]) || 0;
export const tem = (e, item, n = 1) => qtd(e, item) >= n;
export const total = (e) => { let s = 0; for (const k in e.inv) s += e.inv[k]; return s; };
/** Adiciona até onde couber; devolve quanto realmente entrou. */
export function dar(e, item, n) {
  const cab = Math.max(0, Math.min(n, MAX_PILHA - qtd(e, item), MAX_TOTAL - total(e)));
  if (cab > 0) e.inv[item] = qtd(e, item) + cab;
  return cab;
}
export function tirar(e, item, n) {
  const t = Math.min(n, qtd(e, item));
  if (t > 0) { e.inv[item] -= t; if (e.inv[item] <= 0) delete e.inv[item]; }
  return t;
}
export const temTudo = (e, ins, mult = 1) => Object.entries(ins).every(([k, v]) => qtd(e, k) >= v * mult);
export const gastar = (e, ins, mult = 1) => { for (const [k, v] of Object.entries(ins)) tirar(e, k, v * mult); };
