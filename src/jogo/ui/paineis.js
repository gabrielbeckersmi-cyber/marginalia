// PAINÉIS — mochila, habilidades, construção, conversa com colono e negócios/mercado. Cada painel é uma função desenharX(ctx, S, L, A).
// S = estado da cena de jogo (cenas.js): S.J, S.painel, S.npc, S.negocio, S.construindo, S.alternar(id).
import { C } from "../config.js";
import { PAL, texto, painel, botao, barra, icone, ui, fmt, medir, quebrar } from "../visual/estilo.js";
import { desenharPessoa } from "../visual/sprites.js";
import { HAB, NOME_PROF, IDX } from "../dados/habilidades.js";
import { ITENS, DESC, tipoDoItem, USO_FERRAMENTA } from "../dados/itens.js";
import { CONSTR, itensDoNegocio } from "../dados/construcoes.js";
import { nivel, pct, hab, velocidade, ofertaEnsino, ensinar, atende, faltaReq } from "../sistemas/habilidades.js";
import * as inv from "../sistemas/inventario.js";
import * as nec from "../sistemas/necessidades.js";
import * as eco from "../sistemas/economia.js";
import * as neg from "../sistemas/negocios.js";
import { restante, requisitos } from "../sistemas/construcao.js";
import { usarItem } from "../interacao.js";
import { slotDe, equipado, estaEquipado, equipar, desequipar, SLOTS } from "../sistemas/equipamento.js";
import { temLoot, pegarItem, pegarOuro, pegarTudo } from "../sistemas/corpos.js";
import { TURNO, horasTxt, iniciarTurno, motivoNaoPodeTrabalhar, cancelarTurno } from "../sistemas/turno.js";
import { RECEITAS_MAO, RECEITAS_FOGUEIRA, durabilidade } from "../sistemas/ferramentas.js";
import { fabricar, moradiaPropriaPerto } from "../interacao.js";
import { anunciar, retirarAnuncio, despejar, precoJusto, aluguelJusto } from "../sistemas/moradia.js";

const ic = (ctx, item, x, y, t = 40) => icone(ctx, ITENS[item].icone[0], ITENS[item].icone[1], x, y, t);
const aviso = (S, texto) => S.J.avisos.push({ tipo: "item", texto });
function fechar(ctx, S, x, y) { if (botao(ctx, x, y, 34, 34, "✕", { tam: 18 })) S.painel = null; }

/** Lista rolável. rows: array; desenha com fn(row, x, y, w, h, i). */
function lista(ctx, S, rows, x, y, w, h, rh, fn) {
  const total = rows.length * rh, max = Math.max(0, total - h); S.scroll = Math.max(0, Math.min(max, (S.scroll || 0) + (ui.dentro(x, y, w, h) ? ui.roda * 34 : 0)));
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  rows.forEach((r, i) => { const yy = y + i * rh - S.scroll; if (yy + rh < y || yy > y + h) return; fn(r, x, yy, w, rh, i); });
  ctx.restore();
  if (max > 0) { ctx.fillStyle = "#2a1b1055"; ctx.fillRect(x + w - 6, y, 4, h); ctx.fillStyle = PAL.tinta; ctx.fillRect(x + w - 6, y + (S.scroll / max) * (h - 30), 4, 30); }
}

// ── MOCHILA ──  (esquerda: itens · meio: detalhes e ações do item escolhido · direita: equipamento, carga e necessidades)
export function desenharMochila(ctx, S, L, A) {
  const J = S.J, p = J.jogador, w = 940, h = 540, x = (L - w) / 2, y = (A - h) / 2 - 10;
  painel(ctx, x, y, w, h, { titulo: "Mochila" }); fechar(ctx, S, x + w - 48, y + 12);
  if (S.itemSel && !p.inv[S.itemSel]) S.itemSel = null;
  const itens = Object.keys(p.inv).sort(), cols = 5, cell = 84, ly0 = y + 62, lh = h - 90;
  lista(ctx, S, chunk(itens, cols), x + 24, ly0, cols * cell + 10, lh, cell, (linha, lx, ly) => linha.forEach((k, i) => {
    const cx = lx + i * cell, hover = ui.dentro(cx, ly, cell - 6, cell - 6) && ui.y >= ly0 && ui.y <= ly0 + lh, sel = S.itemSel === k;
    ctx.fillStyle = sel ? "#f0e0b0" : hover ? "#efdcae" : "#d6bd8680"; ctx.strokeStyle = sel ? PAL.ferrugem : PAL.tintaClara; ctx.lineWidth = sel ? 3 : 1.5; ctx.beginPath(); ctx.roundRect(cx, ly, cell - 6, cell - 6, 6); ctx.fill(); ctx.stroke();
    ic(ctx, k, cx + (cell - 6) / 2, ly + 34, 54); texto(ctx, `×${p.inv[k]}`, cx + cell - 12, ly + cell - 14, { tam: 16, alinhar: "right", peso: "bold" });
    if (estaEquipado(p, k)) { ctx.fillStyle = PAL.verde; ctx.beginPath(); ctx.roundRect(cx + 4, ly + 4, 22, 18, 4); ctx.fill(); texto(ctx, "E", cx + 15, ly + 18, { tam: 14, alinhar: "center", cor: "#f6ecd0", peso: "bold" }); }
    if (hover) { ui.dica = ITENS[k].nome; if (ui.clique) { ui.clique = false; S.itemSel = S.itemSel === k ? null : k; S.confirmaDescarte = null; } }
  }));
  if (!itens.length) texto(ctx, "Mochila vazia", x + 24 + 215, y + 200, { tam: 22, alinhar: "center", cor: PAL.tintaClara });
  detalhesItem(ctx, S, x + 480, y + 62, 240, h - 84);
  // coluna da direita
  const rx = x + 742, rw = 176;
  texto(ctx, "Equipado", rx, y + 80, { tam: 18, peso: "bold" });
  Object.entries(SLOTS).forEach(([slot, nome], i) => {
    const sx = rx + i * 92, it = equipado(p, slot), hover = ui.dentro(sx, y + 90, 84, 84), sel = it && S.itemSel === it;
    ctx.fillStyle = hover && it ? "#efdcae" : "#d6bd8680"; ctx.strokeStyle = sel ? PAL.ferrugem : PAL.tintaClara; ctx.lineWidth = sel ? 3 : 1.5; ctx.beginPath(); ctx.roundRect(sx, y + 90, 84, 84, 6); ctx.fill(); ctx.stroke(); ui.bloquear(sx, y + 90, 84, 84);
    if (it) { ic(ctx, it, sx + 42, y + 124, 60); if (hover) ui.dica = `${ITENS[it].nome} (clique para ver)`; if (hover && ui.clique) { ui.clique = false; S.itemSel = it; S.confirmaDescarte = null; } }
    else texto(ctx, "vazio", sx + 42, y + 138, { tam: 15, alinhar: "center", cor: PAL.tintaClara, estilo: "italic" });
    texto(ctx, nome, sx + 42, y + 192, { tam: 15, alinhar: "center", cor: PAL.tintaClara });
  });
  texto(ctx, "Carga", rx, y + 228, { tam: 18, peso: "bold" }); barra(ctx, rx, y + 236, rw, 16, inv.total(p) / 160 * 100, PAL.ouro, { rotulo: `${inv.total(p)}/160` });
  icone(ctx, "icones_ui", 4, rx + 14, y + 282, 34); texto(ctx, `${fmt(p.ouro)} moedas`, rx + 40, y + 289, { tam: 19, peso: "bold" });
  icone(ctx, "itens_2", p.cantil > 0 ? 0 : 1, rx + 14, y + 326, 34); texto(ctx, `Cantil: ${p.cantil}/3 goles`, rx + 40, y + 333, { tam: 17 });
  if (botao(ctx, rx, y + 358, rw, 40, "Comer (F)", { icone: ["icones_ui", 0] })) { if (!usarItem(J, nec.melhorComida(p))) aviso(S, "Sem comida na mochila"); }
  if (botao(ctx, rx, y + 404, rw, 40, "Beber (R)", { icone: ["icones_ui", 1], desab: p.cantil <= 0 })) nec.beberCantil(p);
  if (botao(ctx, rx, y + 450, rw, 40, p.dormindo ? "Acordar" : "Dormir (Z)", { icone: ["icones_ui", 2] })) S.dormir();
  if (botao(ctx, rx, y + 496, rw, 34, "Fabricar (C)", { icone: ["icones_ui", 5], tam: 17 })) S.alternar("criar");
}
/** Painel do meio: o que é o item e o que se pode fazer com ele. */
function detalhesItem(ctx, S, x, y, w, h) {
  const J = S.J, p = J.jogador, k = S.itemSel;
  ctx.fillStyle = "#c9ad6c40"; ctx.strokeStyle = PAL.tintaClara; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke(); ui.bloquear(x, y, w, h);
  if (!k) { quebrar(ctx, "Clique num item da mochila para ver os detalhes e escolher o que fazer: equipar, comer, descartar…", w - 28, 17).forEach((l, i) => texto(ctx, l, x + 14, y + 40 + i * 24, { tam: 17, cor: PAL.tintaClara })); return; }
  const d = ITENS[k];
  ctx.fillStyle = "#d6bd8699"; ctx.beginPath(); ctx.roundRect(x + 12, y + 12, 76, 76, 6); ctx.fill(); ic(ctx, k, x + 50, y + 50, 64);
  quebrar(ctx, d.nome, w - 108, 21).slice(0, 2).forEach((l, i) => texto(ctx, l, x + 98, y + 36 + i * 24, { tam: 21, peso: "bold" }));
  texto(ctx, tipoDoItem(k), x + 98, y + 78, { tam: 15, cor: PAL.tintaClara }); texto(ctx, `Você tem ×${p.inv[k]}`, x + 98, y + 98, { tam: 15, cor: PAL.tintaClara });
  let yy = y + 128; quebrar(ctx, DESC[k] || "", w - 28, 16).forEach((l) => { texto(ctx, l, x + 14, yy, { tam: 16 }); yy += 21; });
  yy += 6; const linhas = [`Vale ~${eco.preco(J, k)} moedas cada`];
  if (d.fome) linhas.push(`Sacia ${d.fome} de fome`);
  if (d.arma) linhas.push(`Dano base: ${d.arma}`);
  if (d.defesa) linhas.push(`Reduz o dano recebido em ${Math.round(d.defesa * 100)}%`);
  if (d.ferramenta && USO_FERRAMENTA[d.ferramenta]) linhas.push(`Serve para ${USO_FERRAMENTA[d.ferramenta]}${d.tier ? ` · qualidade ${d.tier === 1 ? "pedra" : "ferro"}` : ""}`);
  if (d.alcance) linhas.push("Longo alcance (erra mais de longe)");
  if (d.durab) linhas.push(`Durabilidade: ${Math.ceil(durabilidade(p, k))}/${d.durab}${d.durab <= 40 ? " (quebra fácil)" : ""}`);
  if (estaEquipado(p, k)) linhas.push("✔ Equipado");
  linhas.forEach((l) => { texto(ctx, l, x + 14, yy, { tam: 15, cor: l[0] === "✔" ? PAL.ok : PAL.tintaClara, peso: l[0] === "✔" ? "bold" : "normal" }); yy += 20; });
  // ações (de baixo para cima)
  const acoes = [], slot = slotDe(k);
  if (slot) acoes.push(estaEquipado(p, k) ? { r: "Guardar (tirar da mão)", f: () => { desequipar(p, slot); aviso(S, `${d.nome} guardado`); } } : { r: slot === "escudo" ? "Equipar escudo" : "Equipar na mão", f: () => { equipar(p, k); aviso(S, `${d.nome} equipado`); } });
  if (d.fome) acoes.push({ r: "Comer", f: () => usarItem(J, k) });
  acoes.push({ r: "Descartar 1", f: () => { inv.tirar(p, k, 1); aviso(S, `Descartou 1 ${d.nome}`); } });
  acoes.push(S.confirmaDescarte === k ? { r: "Confirmar: descartar todos", f: () => { const n = inv.tirar(p, k, 999); S.confirmaDescarte = null; aviso(S, `Descartou ${n}× ${d.nome}`); }, perigo: true } : { r: "Descartar todos", f: () => { S.confirmaDescarte = k; } });
  acoes.forEach((a, i) => { const by = y + h - 10 - (acoes.length - i) * 44; if (botao(ctx, x + 12, by, w - 24, 38, a.r, { tam: 17 })) a.f(); });
}
const chunk = (a, n) => { const r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; };

// ── HABILIDADES ──
export function desenharHabilidades(ctx, S, L, A) {
  const p = S.J.jogador, w = 600, h = 620, x = (L - w) / 2, y = (A - h) / 2; painel(ctx, x, y, w, h, { titulo: "Habilidades" }); fechar(ctx, S, x + w - 48, y + 12);
  HAB.forEach((hb, i) => { const v = hab(p, hb.id), ry = y + 66 + i * 40;
    texto(ctx, hb.nome, x + 34, ry + 20, { tam: 19 }); barra(ctx, x + 230, ry + 4, 200, 18, pct(v) * 100, PAL.verde, { rotulo: `${Math.floor(pct(v) * 100)}%` });
    texto(ctx, `Nv ${nivel(v)}`, x + 450, ry + 20, { tam: 19, peso: "bold" }); texto(ctx, `×${velocidade(v).toFixed(1)}`, x + w - 34, ry + 20, { tam: 16, alinhar: "right", cor: PAL.tintaClara }); });
  texto(ctx, "Pratique para evoluir (rápido no começo, devagar depois) ou pague colonos mais hábeis para ensinar.", x + w / 2, y + h - 28, { tam: 14, alinhar: "center", cor: PAL.tintaClara });
}

// ── CONSTRUIR ──
export function desenharConstruir(ctx, S, L, A) {
  const J = S.J, p = J.jogador, w = 820, h = 580, x = (L - w) / 2, y = (A - h) / 2 - 10; painel(ctx, x, y, w, h, { titulo: "Construir" }); fechar(ctx, S, x + w - 48, y + 12);
  const tipos = Object.keys(CONSTR); S.selConstr = S.selConstr || tipos[0];
  tipos.forEach((k, i) => { if (botao(ctx, x + 24, y + 62 + i * 46, 230, 40, CONSTR[k].nome, { ativo: S.selConstr === k, tam: 19, icone: ["icones_ui", CONSTR[k].moradia ? 11 : CONSTR[k].agua ? 1 : 5] })) S.selConstr = k; });
  const k = S.selConstr, d = CONSTR[k], dx = x + 280;
  texto(ctx, d.nome, dx, y + 90, { tam: 26, peso: "bold" }); texto(ctx, `${d.w}×${d.h} tiles · tempo base ${d.tempo}s (mais rápido com a habilidade de Construção)`, dx, y + 114, { tam: 15, cor: PAL.tintaClara });
  const desc = { moradia: "Moradia: descanso e abrigo.", agua: "Fonte de água. Seu primeiro poço funda uma cidade; outros colonos se juntam a ela.", mercado: "Compra e vende de todos, limitado ao caixa que você colocar. Você define a margem.", negocio: "Negócio: vende só o que produz e contrata trabalhadores." };
  const dt = d.fogueira ? "Fogueira: dá para cozinhar carne e peixe (gasta 1 galho por prato). Pode ficar bem pertinho de outras construções." : d.mercado ? desc.mercado : d.negocio ? desc.negocio : d.agua ? desc.agua : desc.moradia + " Depois de pronta, você pode alugá-la ou vendê-la."; quebrar(ctx, dt, w - 310, 17).forEach((l, i) => texto(ctx, l, dx, y + 144 + i * 22, { tam: 17 }));
  texto(ctx, "Requisitos", dx, y + 208, { tam: 19, peso: "bold" });
  const falta = faltaReq(p, d.req).map(([h]) => h);
  Object.entries(d.req).forEach(([hb, n], i) => { const ok = nivel(hab(p, hb)) >= n; texto(ctx, `${ok ? "✔" : "✘"} ${HAB[IDX[hb]].nome} nível ${n}  (você: ${nivel(hab(p, hb))})`, dx + 10, y + 236 + i * 24, { tam: 17, cor: ok ? PAL.ok : PAL.erro }); });
  const my = y + 240 + Object.keys(d.req).length * 24 + 16; texto(ctx, "Materiais (total)", dx, my, { tam: 19, peso: "bold" });
  Object.entries(d.mat).forEach(([m, q], i) => { const tem = inv.qtd(p, m), ok = tem >= q; ic(ctx, m, dx + 24, my + 34 + i * 38, 34); texto(ctx, `${ITENS[m].nome}`, dx + 52, my + 40 + i * 38, { tam: 17 }); texto(ctx, `${q}`, dx + 250, my + 40 + i * 38, { tam: 17, alinhar: "right", peso: "bold" }); texto(ctx, `(mochila: ${tem})`, dx + 262, my + 40 + i * 38, { tam: 15, cor: ok ? PAL.ok : PAL.tintaClara }); });
  texto(ctx, "Deixe 3 tiles livres ao redor. Árvores e pedras precisam ser removidas antes.", dx, y + h - 74, { tam: 14, cor: PAL.tintaClara });
  const pode = atende(p, d.req);
  if (botao(ctx, dx, y + h - 56, 300, 42, pode ? "Posicionar no mapa" : "Habilidade insuficiente", { desab: !pode, icone: ["icones_ui", 5] })) { S.construindo = k; S.painel = null; }
}

// ── CONVERSA COM COLONO ──
export function desenharNPC(ctx, S, L, A) {
  const J = S.J, p = J.jogador, n = S.npc; if (!n || n.morto) { S.painel = null; return; }
  const w = 700, h = 580, x = (L - w) / 2, y = (A - h) / 2 - 10; painel(ctx, x, y, w, h, { titulo: n.nome }); fechar(ctx, S, x + w - 48, y + 12);
  ctx.save(); ctx.beginPath(); ctx.roundRect(x + 28, y + 62, 86, 100, 6); ctx.fillStyle = "#c9ad6c80"; ctx.fill(); ctx.clip(); desenharPessoa(ctx, { ...n, dir: 0, mov: false }, x + 71, y + 150); ctx.restore();
  texto(ctx, NOME_PROF[n.prof] || "Colono", x + 134, y + 86, { tam: 21, peso: "bold" });
  const cid = n.cidade ? J.cidades.find((c) => c.id === n.cidade) : null; texto(ctx, cid ? `Mora em ${cid.nome}` : "Sem cidade ainda", x + 134, y + 112, { tam: 17, cor: PAL.tintaClara });
  const mel = HAB.map((hb, i) => [hb, n.hab[i]]).sort((a, b) => b[1] - a[1]).slice(0, 3); texto(ctx, "Melhores: " + mel.map(([hb, v]) => `${hb.nome} ${nivel(v)}`).join(" · "), x + 134, y + 138, { tam: 16 });
  if (n.negocios && n.negocios.length) { const b = J.constrPorId.get(n.negocios[0]); if (b && b.prog >= 1 && botao(ctx, x + 440, y + 76, 230, 38, `Ver ${CONSTR[b.tipo].nome}`, { icone: ["icones_ui", 13] })) { S.negocio = b; S.painel = "negocio"; S.scroll = 0; S.aba = null; } }
  texto(ctx, "Aprender com este colono", x + 28, y + 200, { tam: 20, peso: "bold" });
  const ofertas = HAB.map((hb) => ({ hb, o: ofertaEnsino(J, p, n, hb.id) })).filter((r) => r.o);
  if (!ofertas.length) texto(ctx, "Ele não tem nada a ensinar que você já não saiba.", x + 34, y + 240, { tam: 17, cor: PAL.tintaClara });
  lista(ctx, S, ofertas, x + 28, y + 212, w - 56, 270, 52, ({ hb, o }, lx, ly, lw) => {
    const v = hab(p, hb.id), m = hab(n, hb.id);
    texto(ctx, hb.nome, lx + 8, ly + 22, { tam: 19, peso: "bold" });
    const depois = Math.min(m, v + o.ganho);
    texto(ctx, `Você ${nivel(v)} (${Math.floor(pct(v) * 100)}%) → ${nivel(depois)} (${Math.floor(pct(depois) * 100)}%)   ·   mestre: ${nivel(m)}`, lx + 8, ly + 43, { tam: 15 });
    if (botao(ctx, lx + lw - 190, ly + 6, 180, 38, `Pagar ${o.custo}`, { desab: p.ouro < o.custo, icone: ["icones_ui", 4], dica: p.ouro < o.custo ? "Ouro insuficiente" : "Aprender (sem limite de aulas por dia)" })) { const r = ensinar(J, p, n, hb.id); aviso(S, r.ok ? `Você aprendeu com ${n.nome}: ${hb.nome} ${nivel(hab(p, hb.id))}` : r.motivo); }
  });
  texto(ctx, `Seu ouro: ${fmt(p.ouro)}`, x + 30, y + h - 24, { tam: 17 });
}

// ── NEGÓCIO / MERCADO ──
export function desenharNegocio(ctx, S, L, A) {
  const J = S.J, p = J.jogador, b = S.negocio; if (!b || !J.constrPorId.has(b.id)) { S.painel = null; return; }
  const d = CONSTR[b.tipo], dono = eco.donoDe(J, b), meu = b.dono === 0, trab = p.emprego === b.id, w = 800, h = 600, x = (L - w) / 2, y = (A - h) / 2 - 10;
  painel(ctx, x, y, w, h, { titulo: d.nome }); fechar(ctx, S, x + w - 48, y + 12);
  texto(ctx, `Dono: ${meu ? "você" : dono ? dono.nome : "—"}${d.mercado ? `   ·   Caixa: ${fmt(b.caixa)} moedas   ·   Margem: +${Math.round((b.margem ?? C.MARGEM_MERCADO) * 100)}%` : ""}`, x + 30, y + 72, { tam: 16, cor: PAL.tintaClara });
  if (!d.negocio) { texto(ctx, "Este lugar não é um negócio.", x + w / 2, y + 200, { tam: 20, alinhar: "center" }); return; }
  const abas = ["Comprar"]; if (d.mercado) abas.push("Vender"); if (meu || trab) { abas.push("Trabalhar"); if (!d.mercado) abas.push("Produzir"); } if (meu) abas.push("Gerir"); abas.push("Vaga");
  if (!S.aba || !abas.includes(S.aba)) S.aba = abas[0];
  abas.forEach((a, i) => { if (botao(ctx, x + 28 + i * 128, y + 84, 120, 36, a, { ativo: S.aba === a, tam: 18 })) { S.aba = a; S.scroll = 0; } });
  const cy = y + 134, ch = h - 190, cw = w - 56, cx = x + 28;
  if (S.aba === "Comprar") {
    const rows = Object.keys(b.estoque); if (!rows.length) texto(ctx, "Nada à venda no momento.", cx + cw / 2, cy + 60, { tam: 20, alinhar: "center", cor: PAL.tintaClara });
    lista(ctx, S, rows, cx, cy, cw, ch, 50, (k, lx, ly, lw) => { const pr = eco.precoVenda(J, b, k);
      ic(ctx, k, lx + 26, ly + 24, 40); texto(ctx, ITENS[k].nome, lx + 56, ly + 22, { tam: 19 }); texto(ctx, `estoque ${b.estoque[k]} · ${pr} moedas cada`, lx + 56, ly + 42, { tam: 14, cor: PAL.tintaClara });
      [1, 5, 20].forEach((q, i) => { if (botao(ctx, lx + lw - 252 + i * 84, ly + 7, 78, 36, `×${q}`, { tam: 18, desab: p.ouro < pr })) { const r = eco.comprar(J, p, b, k, q); aviso(S, r.ok ? `Comprou ${r.qtd}× ${ITENS[k].nome} (-${r.pago})` : r.motivo); } }); });
  } else if (S.aba === "Vender") {
    const rows = Object.keys(p.inv).filter((k) => !ITENS[k].ferramenta || (p.inv[k] > 1)); if (!rows.length) texto(ctx, "Você não tem nada para vender.", cx + cw / 2, cy + 60, { tam: 20, alinhar: "center", cor: PAL.tintaClara });
    lista(ctx, S, rows, cx, cy, cw, ch, 50, (k, lx, ly, lw) => { const pr = eco.precoCompraMercado(J, k);
      ic(ctx, k, lx + 26, ly + 24, 40); texto(ctx, `${ITENS[k].nome} (${p.inv[k]})`, lx + 56, ly + 22, { tam: 19 }); texto(ctx, `o mercado paga ${pr} cada · caixa ${fmt(b.caixa)}`, lx + 56, ly + 42, { tam: 14, cor: PAL.tintaClara });
      [1, 5, 99].forEach((q, i) => { if (botao(ctx, lx + lw - 252 + i * 84, ly + 7, 78, 36, q === 99 ? "todos" : `×${q}`, { tam: 18 })) { const r = eco.venderAoMercado(J, p, b, k, q); aviso(S, r.ok ? `Vendeu ${r.qtd}× ${ITENS[k].nome} (+${r.recebido})` : r.motivo); } }); });
  } else if (S.aba === "Trabalhar") {
    abaTrabalhar(ctx, S, b, meu, cx, cy, cw);
  } else if (S.aba === "Produzir") {
    const acoes = neg.acoesDe(b.tipo);
    lista(ctx, S, acoes, cx, cy, cw, ch, 64, (a, lx, ly, lw) => { const m = neg.checar(p, b, a), f = p.fab && p.fab.b === b.id && p.fab.a === a.saida ? p.fab.p : 0, ins = Object.entries(a.ins);
      ic(ctx, a.saida, lx + 26, ly + 30, 42); texto(ctx, `${ITENS[a.saida].nome} ×${a.qtd}`, lx + 58, ly + 24, { tam: 19, peso: "bold" });
      texto(ctx, (ins.length ? "Usa: " + ins.map(([k, v]) => `${v} ${ITENS[k].nome}`).join(", ") : "Sem insumos") + `  ·  ${HAB[IDX[a.hab]].nome} ${a.nivel || 1}+  ·  ~${Math.round(a.base / velocidade(hab(p, a.hab)))}s`, lx + 58, ly + 46, { tam: 14, cor: m ? PAL.erro : PAL.tintaClara });
      const bx = lx + lw - 200, by = ly + 10; botao(ctx, bx, by, 190, 40, m ? m : f > 0 ? `${Math.floor(f * 100)}%…` : "Produzir (segurar)", { desab: !!m, tam: 15 });
      if (!m && ui.baixo && ui.dentro(bx, by, 190, 40)) S.producao = { b, a }; });
  } else if (S.aba === "Gerir") {
    gerirNegocio(ctx, S, b, cx, cy, cw, ch);
  } else if (S.aba === "Vaga") {
    const dnn = dono; texto(ctx, b.vaga ? `Vaga aberta: salário de ${b.vaga.salario} moedas por dia` : "Nenhuma vaga aberta.", cx, cy + 24, { tam: 20, peso: "bold" });
    texto(ctx, `Empregados: ${b.empregados.length}`, cx, cy + 54, { tam: 17 });
    if (meu) { const s = b.vaga ? b.vaga.salario : 60; if (botao(ctx, cx, cy + 80, 50, 38, "−10", { desab: s <= 10 })) neg.anunciarVaga(b, Math.max(10, s - 10)); texto(ctx, `${s}/dia`, cx + 100, cy + 106, { tam: 20, alinhar: "center" }); if (botao(ctx, cx + 150, cy + 80, 50, 38, "+10")) neg.anunciarVaga(b, s + 10);
      if (botao(ctx, cx + 230, cy + 80, 220, 38, b.vaga ? "Atualizar anúncio" : "Anunciar vaga", { icone: ["icones_ui", 15] })) { neg.anunciarVaga(b, s); aviso(S, "Anúncio de vaga publicado"); }
      if (b.vaga && botao(ctx, cx + 460, cy + 80, 200, 38, "Retirar anúncio")) b.vaga = null;
      texto(ctx, "O salário sai do seu ouro todo dia. Colonos desempregados da região se candidatam sozinhos.", cx, cy + 150, { tam: 15, cor: PAL.tintaClara }); }
    else if (trab) { texto(ctx, "Você trabalha aqui. Veja a aba Trabalhar para fazer seu turno e receber.", cx, cy + 90, { tam: 17 }); if (botao(ctx, cx, cy + 110, 220, 38, "Pedir demissão")) { b.empregados = b.empregados.filter((i) => i !== 0); p.emprego = null; p.salario = null; } }
    else if (b.vaga) { if (botao(ctx, cx, cy + 90, 300, 42, `Candidatar-se (${b.vaga.salario}/dia)`, { desab: !!p.emprego, icone: ["icones_ui", 15] })) { aviso(S, neg.contratar(J, b, p) ? "Você foi contratado!" : "Não foi possível"); } if (p.emprego) texto(ctx, "Você já tem um emprego.", cx, cy + 150, { tam: 15, cor: PAL.tintaClara }); }
  }
  texto(ctx, `Seu ouro: ${fmt(p.ouro)}`, x + 30, y + h - 24, { tam: 17 });
}
function gerirNegocio(ctx, S, b, cx, cy, cw, ch) {
  const J = S.J, p = J.jogador, d = CONSTR[b.tipo];
  if (d.mercado) {
    texto(ctx, `Caixa: ${fmt(b.caixa)}`, cx, cy + 20, { tam: 19, peso: "bold" });
    if (botao(ctx, cx + 170, cy, 150, 34, "Depositar 100", { desab: p.ouro < 100 })) { p.ouro -= 100; b.caixa += 100; } if (botao(ctx, cx + 328, cy, 150, 34, "Retirar 100", { desab: b.caixa < 100 })) { b.caixa -= 100; p.ouro += 100; }
    texto(ctx, `Margem sobre o preço: +${Math.round((b.margem ?? C.MARGEM_MERCADO) * 100)}%`, cx, cy + 66, { tam: 19, peso: "bold" });
    if (botao(ctx, cx + 300, cy + 44, 44, 34, "−5")) b.margem = Math.max(0, (b.margem ?? C.MARGEM_MERCADO) - 0.05); if (botao(ctx, cx + 350, cy + 44, 44, 34, "+5")) b.margem = Math.min(1, (b.margem ?? C.MARGEM_MERCADO) + 0.05);
    texto(ctx, "O mercado compra de quem vende pelo preço de mercado e revende com a sua margem. Sem caixa, ele não compra.", cx, cy + 100, { tam: 14, cor: PAL.tintaClara });
  }
  const rows = Object.keys(b.estoque); texto(ctx, "Estoque", cx, cy + 134, { tam: 19, peso: "bold" });
  if (!rows.length) texto(ctx, "Vazio.", cx + 100, cy + 134, { tam: 16, cor: PAL.tintaClara });
  lista(ctx, S, rows, cx, cy + 142, cw, ch - 142, 44, (k, lx, ly, lw) => { ic(ctx, k, lx + 20, ly + 22, 34); texto(ctx, `${ITENS[k].nome} (${b.estoque[k]})`, lx + 46, ly + 28, { tam: 17 });
    if (!d.mercado) { const pr = eco.precoNegocio(J, b, k); texto(ctx, `${pr}`, lx + lw - 420, ly + 28, { tam: 17, alinhar: "right" }); if (botao(ctx, lx + lw - 410, ly + 4, 34, 34, "−")) { b.precos[k] = Math.max(1, pr - 1); } if (botao(ctx, lx + lw - 372, ly + 4, 34, 34, "+")) { b.precos[k] = pr + 1; } }
    if (botao(ctx, lx + lw - 320, ly + 4, 100, 34, "Retirar", { tam: 16 })) neg.retirar(p, b, k, 99); if (botao(ctx, lx + lw - 214, ly + 4, 110, 34, "Guardar +", { tam: 16, desab: !inv.tem(p, k) })) neg.depositar(p, b, k, 99); });
}

// ── SAQUE (corpo de colono/bandido) ──
export function desenharSaque(ctx, S, L, A) {
  const J = S.J, p = J.jogador, c = S.corpo; if (!c || !J.corpos.includes(c)) { S.painel = null; return; }
  const w = 640, h = 520, x = (L - w) / 2, y = (A - h) / 2 - 10;
  painel(ctx, x, y, w, h, { titulo: `Corpo de ${c.nome}` }); fechar(ctx, S, x + w - 48, y + 12);
  texto(ctx, c.bandido ? "Um bandido caído." : `Morreu: ${c.causa}.`, x + 30, y + 78, { tam: 16, cor: PAL.tintaClara });
  if (Math.hypot(c.x - p.x, c.y - p.y) > 200) { S.painel = null; aviso(S, "Você se afastou do corpo"); return; }
  icone(ctx, "icones_ui", 4, x + 46, y + 120, 36); texto(ctx, `${fmt(c.ouro)} moedas`, x + 76, y + 128, { tam: 20, peso: "bold" });
  if (botao(ctx, x + w - 210, y + 98, 180, 40, "Pegar moedas", { desab: c.ouro <= 0, tam: 17 })) { const v = pegarOuro(J, p, c); aviso(S, `+${v} moedas`); }
  const itens = Object.keys(c.inv).sort();
  if (!itens.length) texto(ctx, "Sem itens.", x + w / 2, y + 250, { tam: 20, alinhar: "center", cor: PAL.tintaClara });
  lista(ctx, S, itens, x + 28, y + 158, w - 56, 280, 52, (k, lx, ly, lw) => {
    ic(ctx, k, lx + 26, ly + 26, 40); texto(ctx, `${ITENS[k].nome}  ×${c.inv[k]}`, lx + 58, ly + 32, { tam: 19 });
    if (botao(ctx, lx + lw - 130, ly + 6, 120, 38, "Pegar", { tam: 17 })) { const n = pegarItem(J, p, c, k, 99); aviso(S, n ? `+${n} ${ITENS[k].nome}` : "Mochila cheia"); }
  });
  if (botao(ctx, x + w / 2 - 110, y + h - 60, 220, 42, "Pegar tudo", { desab: !temLoot(c), icone: ["icones_ui", 15] })) { const r = pegarTudo(J, p, c); aviso(S, r.sobrou ? "Mochila cheia: sobrou algo" : `Pegou tudo (+${r.ouro} moedas)`); }
}

/** Aba "Trabalhar": começar o turno de 8 h (6 h garantem o pagamento). */
function abaTrabalhar(ctx, S, b, meu, cx, cy, cw) {
  const J = S.J, p = J.jogador, d = CONSTR[b.tipo], sal = p.salario ?? (b.vaga && b.vaga.salario) ?? 0;
  texto(ctx, "Turno de trabalho", cx, cy + 22, { tam: 22, peso: "bold" });
  const L1 = [`Ao começar, você fica neste posto por ${TURNO.duracao / 60} horas de jogo (${TURNO.duracao / 60} min reais), sem poder se mover — ou aperta Cancelar no topo da tela (ou X).`,
    `Trabalhar pelo menos ${TURNO.minimo / 60} horas garante o pagamento (uma vez por dia). Cancelar antes disso não paga nada.`];
  let yy = cy + 52; for (const t of L1) for (const l of quebrar(ctx, t, cw - 10, 17)) { texto(ctx, l, cx, yy, { tam: 17 }); yy += 23; }
  yy += 10; texto(ctx, "Você recebe:", cx, yy, { tam: 19, peso: "bold" }); yy += 28;
  if (!meu) { texto(ctx, `• Salário do dono: ${sal} moedas${b.dono === -1 ? " (dono morto: não há quem pague)" : ""}`, cx + 10, yy, { tam: 17 }); yy += 24; }
  texto(ctx, "• Benefício da Coroa: 50 a 200 moedas (menos com inflação alta), com bônus por ter trabalhado", cx + 10, yy, { tam: 17 }); yy += 24;
  texto(ctx, d.mercado ? "• No balcão do mercado você treina Comércio." : `• Você produz sozinho a melhor receita possível; ${meu ? "tudo vai para o seu estoque" : "tudo vai para o estoque do dono"} e você treina ${HAB[IDX[d.hab]].nome}.`, cx + 10, yy, { tam: 17 }); yy += 24;
  if (!d.mercado) { texto(ctx, "• Se faltar insumo, deixe-os no estoque (aba Gerir) ou na sua mochila antes de começar.", cx + 10, yy, { tam: 16, cor: PAL.tintaClara }); yy += 24; }
  const motivo = motivoNaoPodeTrabalhar(J, b);
  if (J.turno && J.turno.b === b.id) texto(ctx, "Você já está em turno.", cx, cy + 330, { tam: 18, cor: PAL.ok, peso: "bold" });
  else if (botao(ctx, cx, cy + 322, 320, 48, `Começar turno (${TURNO.duracao / 60} h)`, { desab: !!motivo, tam: 22, icone: ["icones_ui", 5] })) { const r = iniciarTurno(J, b); if (r.ok) S.painel = null; else aviso(S, r.motivo); }
  if (motivo && !(J.turno && J.turno.b === b.id)) texto(ctx, motivo, cx + 340, cy + 353, { tam: 17, cor: PAL.erro });
}


// ── FABRICAR À MÃO ──
export function desenharCriar(ctx, S, L, A) {
  const J = S.J, p = J.jogador, w = 700, h = 460, x = (L - w) / 2, y = (A - h) / 2 - 10;
  painel(ctx, x, y, w, h, { titulo: "Fabricar" }); fechar(ctx, S, x + w - 48, y + 12);
  texto(ctx, "Ferramentas rústicas, feitas na hora com o que você junta no mato.", x + 30, y + 76, { tam: 16, cor: PAL.tintaClara }); texto(ctx, "Quebram depressa; as de ferro (feitas na ferraria) duram bem mais.", x + 30, y + 96, { tam: 14, cor: PAL.tintaClara });
  lista(ctx, S, RECEITAS_MAO, x + 28, y + 110, w - 56, h - 140, 92, (r, lx, ly, lw) => {
    const d = ITENS[r.saida], ok = inv.temTudo(p, r.ins);
    ic(ctx, r.saida, lx + 34, ly + 40, 56); texto(ctx, d.nome, lx + 76, ly + 28, { tam: 20, peso: "bold" });
    texto(ctx, d.ferramenta ? `Durabilidade ${d.durab} usos` : "", lx + 76, ly + 50, { tam: 14, cor: PAL.tintaClara });
    Object.entries(r.ins).forEach(([k, q], i) => { const tem = inv.qtd(p, k); ic(ctx, k, lx + 90 + i * 118, ly + 72, 24); texto(ctx, `${tem}/${q}`, lx + 106 + i * 118, ly + 78, { tam: 15, cor: tem >= q ? PAL.ok : PAL.erro, peso: "bold" }); });
    if (botao(ctx, lx + lw - 190, ly + 22, 180, 44, ok ? "Fabricar" : "Faltam materiais", { desab: !ok, tam: 17 })) fabricar(J, r.saida);
  });
}

// ── MINHA CASA: alugar ou vender ──
export function desenharCasa(ctx, S, L, A) {
  const J = S.J, p = J.jogador, b = S.casa; if (!b || !J.constrPorId.has(b.id) || b.dono !== 0) { S.painel = null; return; }
  const d = CONSTR[b.tipo], w = 700, h = 470, x = (L - w) / 2, y = (A - h) / 2 - 10, venda = precoJusto(J, b), alug = aluguelJusto(J, b), inq = b.inquilino != null ? J.porId.get(b.inquilino) : null;
  painel(ctx, x, y, w, h, { titulo: d.nome }); fechar(ctx, S, x + w - 48, y + 12);
  const perto = moradiaPropriaPerto(J) === b;
  texto(ctx, perto ? "Você pode dormir aqui (Z)." : b.inquilino != null ? "Alugada: você não pode dormir aqui." : "Chegue perto para dormir (Z).", x + 30, y + 78, { tam: 17, cor: PAL.tintaClara });
  const cx = x + 30, cw = w - 60;
  if (inq) {
    texto(ctx, `Moradora: ${inq.nome}`, cx, y + 130, { tam: 22, peso: "bold" }); texto(ctx, `Paga ${b.aluguel} moedas por dia (cobrado à meia-noite do jogo).`, cx, y + 160, { tam: 17 });
    if (botao(ctx, cx, y + 190, 260, 42, "Encerrar aluguel", { tam: 18 })) { despejar(J, b); aviso(S, "Aluguel encerrado"); }
    return;
  }
  const an = b.anuncio, ed = S.precoCasa && S.precoCasa.id === b.id && S.precoCasa.tipo ? S.precoCasa : (S.precoCasa = { id: b.id, tipo: an ? an.tipo : "aluguel", preco: an ? an.preco : alug });
  if (an) texto(ctx, `Anunciada ${an.tipo === "venda" ? "à venda" : "para alugar"} por ${an.preco}${an.tipo === "venda" ? "" : " por dia"}. Os colonos decidem sozinhos se querem.`, cx, y + 118, { tam: 17, cor: PAL.ok, peso: "bold" });
  else texto(ctx, "Não anunciada. Escolha como quer colocá-la no mercado:", cx, y + 118, { tam: 17 });
  ["aluguel", "venda"].forEach((t, i) => { if (botao(ctx, cx + i * 190, y + 140, 180, 40, t === "aluguel" ? "Para alugar" : "Para vender", { ativo: ed.tipo === t, tam: 18 })) { ed.tipo = t; ed.preco = t === "venda" ? venda : alug; } });
  const justo = ed.tipo === "venda" ? venda : alug, passo = Math.max(1, Math.round(justo / 10));
  texto(ctx, ed.tipo === "venda" ? "Preço de venda" : "Aluguel por dia", cx, y + 222, { tam: 18, peso: "bold" });
  if (botao(ctx, cx, y + 232, 56, 42, "−", { tam: 22 })) ed.preco = Math.max(1, ed.preco - passo);
  texto(ctx, `${fmt(ed.preco)}`, cx + 140, y + 262, { tam: 26, alinhar: "center", peso: "bold" });
  if (botao(ctx, cx + 224, y + 232, 56, 42, "+", { tam: 22 })) ed.preco += passo;
  texto(ctx, `Referência: ${fmt(justo)}`, cx + 300, y + 258, { tam: 16, cor: PAL.tintaClara }); texto(ctx, "Quem acha caro demais não fecha negócio.", cx + 300, y + 278, { tam: 14, cor: PAL.tintaClara });
  if (botao(ctx, cx, y + 300, 300, 46, an ? "Atualizar anúncio" : "Anunciar", { tam: 19, icone: ["icones_ui", 4] })) { anunciar(b, ed.tipo, ed.preco); aviso(S, "Anúncio publicado"); }
  if (an && botao(ctx, cx + 316, y + 300, 220, 46, "Retirar anúncio", { tam: 18 })) { retirarAnuncio(b); S.precoCasa = null; }
  texto(ctx, "Vendida, a casa deixa de ser sua (e você perde o lugar de dormir). Alugada, rende todo dia, mas o inquilino mora nela.", cx, y + h - 36, { tam: 14, cor: PAL.tintaClara });
}

// ── FOGUEIRA: cozinhar ──
export function desenharFogueira(ctx, S, L, A) {
  const J = S.J, p = J.jogador, b = S.fogueira; if (!b || !J.constrPorId.has(b.id)) { S.painel = null; return; }
  const w = 700, h = 400, x = (L - w) / 2, y = (A - h) / 2 - 10;
  painel(ctx, x, y, w, h, { titulo: "Fogueira" }); fechar(ctx, S, x + w - 48, y + 12);
  if (Math.hypot((b.tx + 1) * C.TILE - p.x, (b.ty + 1) * C.TILE - p.y) > 220) { S.painel = null; aviso(S, "Você se afastou da fogueira"); return; }
  texto(ctx, "Segure o botão para cozinhar. Cada prato gasta 1 galho de lenha.", x + 30, y + 80, { tam: 16, cor: PAL.tintaClara });
  RECEITAS_FOGUEIRA.forEach((r, i) => {
    const ry = y + 100 + i * 96, ok = inv.temTudo(p, r.ins), f = p.cook && p.cook.a === r.saida ? p.cook.p : 0;
    ic(ctx, r.saida, x + 60, ry + 40, 56); texto(ctx, ITENS[r.saida].nome, x + 104, ry + 30, { tam: 21, peso: "bold" });
    Object.entries(r.ins).forEach(([k, q], j) => { const tem = inv.qtd(p, k); ic(ctx, k, x + 118 + j * 120, ry + 66, 24); texto(ctx, `${ITENS[k].nome} ${tem}/${q}`, x + 134 + j * 120, ry + 72, { tam: 14, cor: tem >= q ? PAL.ok : PAL.erro }); });
    const bx = x + w - 250, by = ry + 20; botao(ctx, bx, by, 220, 46, ok || f > 0 ? (f > 0 ? `${Math.floor(f * 100)}%…` : "Cozinhar (segurar)") : "Faltam ingredientes", { desab: !ok && f <= 0, tam: 17 });
    if ((ok || f > 0) && ui.baixo && ui.dentro(bx, by, 220, 46)) S.cozinha = r;
  });
}
