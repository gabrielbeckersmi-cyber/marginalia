// ECONOMIA — oferta e demanda por item, inflação global, "Benefício da Coroa" diário (injeção de ouro) e sumidouros.
// Os números abaixo são o termostato: mais ouro por pessoa que o esperado ⇒ preços sobem ⇒ a injeção diária encolhe.
import { C } from "../config.js";
import { ITENS } from "../dados/itens.js";
import { CONSTR } from "../dados/construcoes.js";
import { inteiro, limitar } from "../rng.js";
import * as inv from "./inventario.js";
import { cobrarAlugueis } from "./moradia.js";

const OURO_REF_POR_PESSOA = 1300;
export const novaEconomia = () => ({ infl: 1, fator: {}, oferta: {}, demanda: {}, injetadoHoje: 0, impostoHoje: 0, ultimoInj: 0, ultimoImp: 0, hist: [] });

export const fatorItem = (J, item) => J.eco.fator[item] || 1;
/** Preço de referência de um item hoje (base × demanda/oferta × inflação). */
export const preco = (J, item) => Math.max(1, Math.round(ITENS[item].preco * J.eco.infl * fatorItem(J, item)));
export const registrarOferta = (J, item, n = 1) => { J.eco.oferta[item] = (J.eco.oferta[item] || 0) + n; };
export const registrarDemanda = (J, item, n = 1) => { J.eco.demanda[item] = (J.eco.demanda[item] || 0) + n; };

// ── Negócios ──
/** Quanto um mercado paga ao comprar de você (preço de referência). */
export const precoCompraMercado = (J, item) => preco(J, item);
/** Quanto um mercado cobra ao vender (referência + margem escolhida pelo dono). */
export const precoVendaMercado = (J, b, item) => Math.max(1, Math.round(preco(J, item) * (1 + (b.margem ?? C.MARGEM_MERCADO))));
/** Preço de venda de um negócio comum (o dono pode fixar; padrão referência +10%). */
export const precoNegocio = (J, b, item) => (b.precos && b.precos[item]) || Math.max(1, Math.round(preco(J, item) * 1.1));
export const precoVenda = (J, b, item) => (CONSTR[b.tipo].mercado ? precoVendaMercado(J, b, item) : precoNegocio(J, b, item));

/** Comprador compra `n` de um negócio (que só vende o que tem em estoque). */
export function comprar(J, comprador, b, item, n = 1) {
  const d = CONSTR[b.tipo]; if (b.prog < 1) return { ok: false, motivo: "Em obras" };
  const disp = inv.qtd({ inv: b.estoque }, item); n = Math.min(n, disp);
  if (n <= 0) return { ok: false, motivo: "Sem estoque" };
  const unit = precoVenda(J, b, item); let q = n;
  while (q > 0 && unit * q > comprador.ouro) q--;
  if (q <= 0) return { ok: false, motivo: "Ouro insuficiente" };
  const custo = unit * q, dono = donoDe(J, b);
  const cab = inv.dar(comprador, item, q); if (cab <= 0) return { ok: false, motivo: "Mochila cheia" };
  const pago = unit * cab;
  inv.tirar({ inv: b.estoque }, item, cab); comprador.ouro -= pago;
  if (d.mercado) b.caixa += pago; else if (dono) dono.ouro += pago; else b.caixa += pago;
  registrarDemanda(J, item, cab);
  return { ok: true, qtd: cab, pago };
}
/** Vendedor vende ao mercado (limitado pelo ouro em caixa do mercado). */
export function venderAoMercado(J, vendedor, b, item, n = 1) {
  if (!CONSTR[b.tipo].mercado || b.prog < 1) return { ok: false, motivo: "Não compra" };
  n = Math.min(n, inv.qtd(vendedor, item)); if (n <= 0) return { ok: false, motivo: "Você não tem" };
  const unit = precoCompraMercado(J, item); let q = n;
  while (q > 0 && unit * q > b.caixa) q--;
  if (q <= 0) return { ok: false, motivo: "Mercado sem caixa" };
  inv.tirar(vendedor, item, q); b.estoque[item] = (b.estoque[item] || 0) + q;
  const pago = unit * q; b.caixa -= pago; vendedor.ouro += pago;
  registrarOferta(J, item, q);
  return { ok: true, qtd: q, recebido: pago };
}
export const donoDe = (J, b) => (b.dono === 0 ? J.jogador : J.porId.get(b.dono) || null);

/** Benefício da Coroa de hoje para `p` (50–200 × freio da inflação; ×1,5 por ter trabalhado). 0 se não tem emprego nem negócio. */
export function beneficioCoroa(J, p, trabalhou = true) {
  if (!(p.emprego || (p.negocios && p.negocios.length))) return 0;
  const f = 1 / (1 + Math.max(0, J.eco.infl - 1) * 1.5);
  return Math.round(inteiro(J.rng, C.INJECAO[0], C.INJECAO[1]) * f * (trabalhou ? 1.5 : 1));
}
// ── Fim do dia ──
export function fimDoDia(J) {
  const E = J.eco, pessoas = [J.jogador, ...J.npcs];
  // 1) preços: razão demanda/oferta do dia (suavizada)
  for (const item of Object.keys(ITENS)) {
    const o = E.oferta[item] || 0, d = E.demanda[item] || 0;
    const alvo = limitar(Math.pow((d + 2) / (o + 2), 0.5), 0.5, 2.5);
    E.fator[item] = limitar((E.fator[item] || 1) * 0.7 + alvo * 0.3, 0.5, 2.5);
    E.oferta[item] = o * 0.4; E.demanda[item] = d * 0.4;
  }
  // 2) injeção: Benefício da Coroa — encolhe quando há inflação
  let inj = 0, imp = 0;
  for (const p of pessoas) {
    if (p === J.jogador) continue;      // o jogador recebe ao cumprir o turno de trabalho (turno.js)
    const v = beneficioCoroa(J, p, !!p.trabalhouHoje);
    p.ouro += v; inj += v;
  }
  imp += cobrarAlugueis(J);   // aluguéis de moradias (dinheiro só muda de mãos)
  // 3) sumidouros: imposto sobre fortuna e manutenção das construções
  for (const p of pessoas) { if (p.ouro > 3000) { const t = Math.floor((p.ouro - 3000) * 0.01); p.ouro -= t; imp += t; } p.trabalhouHoje = false; }
  for (const b of J.construcoes) {
    if (b.prog < 1) continue; const dono = donoDe(J, b); if (!dono) continue;
    const m = Math.min(dono.ouro, Math.round(valorConstr(b.tipo) * 0.004)); dono.ouro -= m; imp += m;
    // salário dos empregados (do ouro do dono)
    if (b.vaga) for (const id of b.empregados.slice()) { if (id === 0) continue;   // o jogador é pago pelo turno (turno.js)
      const emp = J.porId.get(id); if (!emp) { b.empregados = b.empregados.filter((x) => x !== id); continue; } const s = Math.min(dono.ouro, b.vaga.salario); dono.ouro -= s; emp.ouro += s; if (s < b.vaga.salario) { emp.emprego = null; b.empregados = b.empregados.filter((x) => x !== id); } }
  }
  // 4) inflação: dinheiro total ÷ riqueza de referência
  let M = 0, G = 0;
  for (const p of pessoas) { M += p.ouro; G += OURO_REF_POR_PESSOA; for (const k in p.inv) G += ITENS[k].preco * p.inv[k] * 0.5; }
  for (const b of J.construcoes) { M += b.caixa; for (const k in b.estoque) G += ITENS[k].preco * b.estoque[k] * 0.5; if (b.prog >= 1) G += valorConstr(b.tipo) * 0.15; }
  E.infl = limitar(E.infl * 0.8 + limitar(M / G, 0.75, 3.5) * 0.2, 0.75, 3.5);
  E.ultimoInj = inj; E.ultimoImp = imp;
  E.hist.push({ dia: J.dia, infl: +E.infl.toFixed(3), M: Math.round(M), pop: pessoas.length, inj, imp });
  if (E.hist.length > 120) E.hist.shift();
}
export const valorConstr = (tipo) => Object.entries(CONSTR[tipo].mat).reduce((s, [k, v]) => s + ITENS[k].preco * v, 0);
