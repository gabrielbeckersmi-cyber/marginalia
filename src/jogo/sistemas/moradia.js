// MORADIAS — alugar e vender casas. O dono (jogador ou colono) anuncia; os colonos decidem sozinhos se compram/alugam, conforme o preço, o bolso e a pressa.
// b.anuncio = { tipo: "aluguel"|"venda", preco } · b.inquilino = id de quem mora de aluguel · b.aluguel = valor por dia combinado.
import { CONSTR } from "../dados/construcoes.js";
import { donoDe, valorConstr } from "./economia.js";
import { tileDe } from "./movimento.js";

export const ehMoradia = (b) => !!CONSTR[b.tipo].moradia && b.prog >= 1;
/** Preço "justo" de venda (a mão de obra pesa) e de aluguel por dia. Os colonos comparam o anúncio com isso. */
export const precoJusto = (J, b) => Math.max(20, Math.round((valorConstr(b.tipo) * 4 * J.eco.infl) / 5) * 5);
export const aluguelJusto = (J, b) => Math.max(4, Math.round(precoJusto(J, b) / 12));
export const anunciar = (b, tipo, preco) => { b.anuncio = { tipo, preco: Math.max(1, Math.round(preco)) }; };
export const retirarAnuncio = (b) => { b.anuncio = null; };

/** Encerra o aluguel: o inquilino perde a moradia. */
export function despejar(J, b) {
  const t = b.inquilino != null ? J.porId.get(b.inquilino) : null;
  if (t && t.casa === b.id) t.casa = null;
  b.inquilino = null; b.aluguel = 0;
}
const aviso = (J, dono, texto) => { if (dono === J.jogador) J.avisos.push({ tipo: "item", texto }); };

export function comprarCasa(J, b, e) {
  const pr = b.anuncio.preco, dono = donoDe(J, b);
  e.ouro -= pr; if (dono) dono.ouro += pr;
  if (dono && dono.casa === b.id) dono.casa = null;
  aviso(J, dono, `${e.nome} comprou sua ${CONSTR[b.tipo].nome.toLowerCase()} por ${pr} moedas`);
  b.dono = e.id; b.anuncio = null; if (!e.casa || (J.constrPorId.get(e.casa) || {}).tipo === "tenda") e.casa = b.id;
  J.stats.casasVendidas = (J.stats.casasVendidas || 0) + 1;
}
export function alugarCasa(J, b, e) {
  const pr = b.anuncio.preco, dono = donoDe(J, b);
  b.inquilino = e.id; b.aluguel = pr; b.anuncio = null; e.casa = b.id;
  aviso(J, dono, `${e.nome} alugou sua ${CONSTR[b.tipo].nome.toLowerCase()} por ${pr} moedas/dia`);
  J.stats.casasAlugadas = (J.stats.casasAlugadas || 0) + 1;
}
/** O colono `e` procura uma casa anunciada por perto e decide se fecha negócio. Devolve true se comprou ou alugou. */
export function procurarMoradia(J, e) {
  const sens = e.sensPreco ?? (e.sensPreco = 0.8 + J.rng() * 0.8), tx = tileDe(e.x), ty = tileDe(e.y), atual = e.casa ? J.constrPorId.get(e.casa) : null;
  if (atual && atual.prog >= 1 && atual.tipo !== "tenda") return false;
  let melhor = null, mr = 1e9;
  for (const b of J.construcoes) {
    if (!b.anuncio || !ehMoradia(b) || b.inquilino != null || b.dono === e.id || Math.hypot(b.tx - tx, b.ty - ty) > 130) continue;
    if (atual && atual.prog >= 1 && b.tipo === "tenda") continue;          // quem já tem tenda só troca por algo melhor
    const venda = b.anuncio.tipo === "venda", justo = venda ? precoJusto(J, b) : aluguelJusto(J, b), r = b.anuncio.preco / justo;
    if (r > sens) continue;                                                // caro demais para o gosto dele
    if (venda ? e.ouro < b.anuncio.preco + 150 : e.ouro < b.anuncio.preco * 6) continue;   // sem dinheiro
    if (r < mr) { mr = r; melhor = b; }
  }
  if (!melhor) return false;
  if (melhor.anuncio.tipo === "venda") comprarCasa(J, melhor, e); else alugarCasa(J, melhor, e);
  return true;
}
/** Colono com casa sobrando põe uma para alugar/vender (preço em torno do justo). */
export function anunciarSobras(J, e) {
  for (const b of J.construcoes) {
    if (b.dono !== e.id || !ehMoradia(b) || b.id === e.casa || b.anuncio || b.inquilino != null) continue;
    const venda = J.rng() < 0.5, f = 0.8 + J.rng() * 0.5;
    anunciar(b, venda ? "venda" : "aluguel", (venda ? precoJusto(J, b) : aluguelJusto(J, b)) * f); return true;
  }
  return false;
}
/** Fim do dia: inquilinos pagam o aluguel (quem não paga é despejado). Devolve o que o jogador recebeu. */
export function cobrarAlugueis(J) {
  let doJogador = 0, imp = 0;
  for (const b of J.construcoes) {
    if (b.inquilino == null) continue;
    const t = J.porId.get(b.inquilino);
    if (!t || t.casa !== b.id) { b.inquilino = null; continue; }
    const dono = donoDe(J, b), v = b.aluguel || 0;
    if (t.ouro >= v) { t.ouro -= v; if (dono) { dono.ouro += v; if (dono === J.jogador) doJogador += v; } else imp += v; }
    else { despejar(J, b); if (dono === J.jogador) J.avisos.push({ tipo: "item", texto: `${t.nome} não pagou o aluguel e saiu` }); }
  }
  if (doJogador > 0) J.avisos.push({ tipo: "item", texto: `Aluguéis recebidos: +${doJogador} moedas` });
  return imp;
}
