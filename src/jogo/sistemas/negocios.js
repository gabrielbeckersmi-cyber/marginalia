// NEGÓCIOS — fabricar/produzir (receitas), contratar. Usado pelo jogador (UI) e pelos NPCs (IA).
import { CONSTR } from "../dados/construcoes.js";
import { nivel, hab, velocidade, ganhar } from "./habilidades.js";
import * as inv from "./inventario.js";
import { registrarOferta, preco } from "./economia.js";
import { ferramentaPara, usarFerramenta } from "./ferramentas.js";

export const acoesDe = (tipo) => { const d = CONSTR[tipo]; return [...(d.receitas || []).map((r) => ({ ...r })), ...(d.producoes || []).map((p) => ({ ...p, ins: {}, nivel: 1 }))]; };
const noEstoque = (b, k) => (b.estoque[k] || 0);
export function checar(e, b, a) {
  if (b.prog < 1) return "Em obras";
  if (nivel(hab(e, a.hab)) < (a.nivel || 1)) return `Precisa de ${a.hab} nível ${a.nivel}`;
  if (a.hab === "mineracao" && !ferramentaPara(e, "mineracao", 1)) return "Precisa de picareta (de pedra ou ferro)";
  for (const [k, v] of Object.entries(a.ins)) if (noEstoque(b, k) + inv.qtd(e, k) < v) return "Faltam insumos";
  return null;
}
function gastarInsumos(e, b, ins) {
  for (const [k, v] of Object.entries(ins)) { const doEst = Math.min(v, noEstoque(b, k)); if (doEst) { b.estoque[k] -= doEst; if (!b.estoque[k]) delete b.estoque[k]; } if (v > doEst) inv.tirar(e, k, v - doEst); }
}
/** Avança a produção em dt segundos. Devolve { erro } | { p } | { fim, saida, qtd }. */
export function avancar(J, e, b, a, dt) {
  if (!e.fab || e.fab.b !== b.id || e.fab.a !== a.saida) e.fab = { b: b.id, a: a.saida, p: 0, gasto: false };
  const f = e.fab;
  if (!f.gasto) { const m = checar(e, b, a); if (m) { e.fab = null; return { erro: m }; } gastarInsumos(e, b, a.ins); f.gasto = true; }
  f.p += (dt * velocidade(hab(e, a.hab))) / a.base; e.trabalhouHoje = true;
  if (f.p >= 1) {
    b.estoque[a.saida] = noEstoque(b, a.saida) + a.qtd; registrarOferta(J, a.saida, a.qtd);
    ganhar(e, a.hab, 1.6); e.fab = null; if (a.hab === "mineracao") { const fr = ferramentaPara(e, "mineracao", 1); if (fr) usarFerramenta(J, e, fr, 1); } return { fim: true, saida: a.saida, qtd: a.qtd };
  }
  return { p: f.p };
}
/** Melhor receita para `e` produzir agora em `b` (a de maior valor por segundo entre as possíveis). null se nada dá. `falta` = motivo quando nada dá. */
export function melhorAcao(J, e, b) {
  let melhor = null, ms = -1, falta = null;
  for (const a of acoesDe(b.tipo)) {
    if ((b.estoque[a.saida] || 0) >= 30) continue;
    const m = checar(e, b, a); if (m) { falta = falta || m; continue; }
    const s = preco(J, a.saida) * a.qtd / a.base; if (s > ms) { ms = s; melhor = a; }
  }
  return { a: melhor, falta: melhor ? null : (falta || "Estoque cheio") };
}
export function depositar(e, b, item, n) { const t = inv.tirar(e, item, n); if (t) b.estoque[item] = noEstoque(b, item) + t; return t; }
export function retirar(e, b, item, n) { const t = Math.min(n, noEstoque(b, item)); if (!t) return 0; const cab = inv.dar(e, item, t); b.estoque[item] -= cab; if (!b.estoque[item]) delete b.estoque[item]; return cab; }
export function anunciarVaga(b, salario) { b.vaga = { salario }; }
export function contratar(J, b, npc) {
  if (!b.vaga || npc.emprego) return false;
  b.empregados.push(npc.id); npc.emprego = b.id; npc.salario = b.vaga.salario; return true;
}
