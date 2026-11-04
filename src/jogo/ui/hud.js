// HUD — barras de vida/fome/sede/cansaço, ouro, hora, minimapa, barra de ações, mensagens e dica do que está sob o mouse.
import { PAL, texto, painel, botao, barra, icone, ui, fmt, dica } from "../visual/estilo.js";
import { minimapa } from "../visual/mapa.js";
import { desenharQuadro } from "../visual/sprites.js";
import { descreverAlvo } from "../interacao.js";
import { nivel } from "../sistemas/habilidades.js";
import { CONSTR } from "../dados/construcoes.js";
import { ITENS } from "../dados/itens.js";
import { cidadeMaisProxima } from "../sistemas/construcao.js";
import { C } from "../config.js";
import { TURNO, horasTxt, cancelarTurno } from "../sistemas/turno.js";
import { equipado, SLOTS } from "../sistemas/equipamento.js";

const horaTxt = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;

/** Converte J.avisos em mensagens que somem sozinhas. */
export function coletarMensagens(S, dt) {
  const J = S.J;
  while (J.avisos.length) {
    const a = J.avisos.shift(); if (a.tipo === "morte-jogador") { S.morreu = a.texto; continue; }
    S.msgs.push({ texto: a.texto, t: 5, tipo: a.tipo });
  }
  for (const m of S.msgs) m.t -= dt; S.msgs = S.msgs.filter((m) => m.t > 0).slice(-6);
}

export function desenharHUD(ctx, S, L, A) {
  const J = S.J, p = J.jogador;
  // ── painel de status (canto superior esquerdo) ──
  painel(ctx, 14, 14, 300, 194);
  texto(ctx, p.nome, 30, 44, { tam: 21, peso: "bold" });
  const cid = cidadeMaisProxima(J, Math.floor(p.x / C.TILE), Math.floor(p.y / C.TILE), 45);

  // Escala do jogo: fome/sede/cansaço de 0 (ótimo) a 100 (crítico); a vida é o contrário (cheia = ótimo).
  const dados = [{ ic: 3, v: p.hp / p.hpMax * 100, cor: PAL.vida, crit: p.hp / p.hpMax < 0.25, txt: `${Math.ceil(p.hp)}` }, { ic: 0, v: p.fome, cor: PAL.fome, crit: p.fome > 85, txt: `${Math.round(p.fome)}` },
    { ic: 1, v: p.sede, cor: PAL.sede, crit: p.sede > 85, txt: `${Math.round(p.sede)}` }, { ic: 2, v: p.cans, cor: PAL.cansaco, crit: p.cans >= 80, txt: `${Math.round(p.cans)}` }];
  const stam = p.stam ?? 100;
  dados.forEach((d, i) => barra(ctx, 44, 58 + i * 25, 250, 17, d.v, d.crit && Math.floor(performance.now() / 300) % 2 ? "#e04a2a" : d.cor, { icone: ["icones_ui", d.ic], rotulo: d.txt }));
  texto(ctx, p.exausto ? "Sem fôlego!" : p.correndo ? "Correndo" : "Fôlego", 48, 175, { tam: 13, cor: p.exausto ? "#e04a2a" : PAL.tintaClara, peso: "bold" });
  barra(ctx, 110, 161, 184, 15, stam, p.exausto ? "#c04a2a" : "#d9a43a", { rotulo: `${Math.round(stam)}` });
  icone(ctx, "icones_ui", 4, 40, 192, 30); texto(ctx, fmt(p.ouro), 60, 198, { tam: 20, peso: "bold" });
  icone(ctx, "itens_2", p.cantil > 0 ? 0 : 1, 150, 190, 30); texto(ctx, `×${p.cantil}`, 168, 198, { tam: 17 });
  texto(ctx, `Dia ${J.dia}  ${horaTxt(J.hora)}`, 296, 198, { tam: 17, alinhar: "right", cor: PAL.tintaClara });

  // ── minimapa ──
  const mt = 176; painel(ctx, L - mt - 34, 14, mt + 20, mt + 20, { fundo: "#d6bd86" }); minimapa(ctx, J, L - mt - 24, 24, mt);
  texto(ctx, `${cid ? cid.nome : "Terras selvagens"}  ·  ${J.npcs.length} colonos`, L - 22, 238, { tam: 15, alinhar: "right", cor: "#f6ecd0", sombra: true });

  // ── barra de ações (rodapé central) ──
  const bt = [["inventario", "Mochila", 15, "I"], ["construir", "Construir", 5, "B"], ["habilidades", "Habilidades", 6, "K"], ["mapa", "Mapa", 11, "M"]]; // ícones: pergaminho/martelo/livro/casa
  const bw = 142, bh = 46, x0 = (L - (bt.length * (bw + 8) - 8)) / 2, y0 = A - bh - 14;
  bt.forEach(([id, nome, ic, tecla], i) => { if (botao(ctx, x0 + i * (bw + 8), y0, bw, bh, `${nome}`, { tam: 17, ativo: S.painel === id, desab: !!J.turno, icone: ["icones_ui", ic], dica: `${nome} (${tecla})` })) S.alternar(id); });
  // equipamento atual (clique abre a mochila)
  Object.keys(SLOTS).forEach((slot, i) => {
    const sx = x0 + bt.length * (bw + 8) + 6 + i * 60, it = equipado(p, slot), hover = ui.dentro(sx, y0 - 6, 52, 52);
    painel(ctx, sx, y0 - 6, 52, 52, { fundo: hover ? "#efdcae" : "#d6bd86" });
    if (it) icone(ctx, ITENS[it].icone[0], ITENS[it].icone[1], sx + 26, y0 + 20, 44); else texto(ctx, slot === "mao" ? "mão" : "escudo", sx + 26, y0 + 24, { tam: 12, alinhar: "center", cor: PAL.tintaClara, estilo: "italic" });
    if (hover) { ui.dica = `${SLOTS[slot]}: ${it ? ITENS[it].nome : "vazio"} (clique para abrir a mochila)`; if (ui.clique && !J.turno) { ui.clique = false; S.painel = "inventario"; } }
  });

  // ── ação em andamento ──
  const ac = J.acao;
  if (ac) {
    const w = 330, x = (L - w) / 2, y = y0 - 56;
    if (ac.tipo === "erro") { painel(ctx, x, y, w, 40, { bloquear: false }); texto(ctx, ac.msg, L / 2, y + 27, { tam: 18, alinhar: "center", cor: PAL.ferrugem, peso: "bold" }); }
    else { painel(ctx, x, y - 6, w, 52, { bloquear: false }); texto(ctx, ac.nome + "…", L / 2, y + 16, { tam: 16, alinhar: "center" }); barra(ctx, x + 18, y + 22, w - 36, 14, ac.prog * 100, PAL.ouro); }
  }
  // ── turno de trabalho ──
  if (J.turno) desenharTurno(ctx, J, L);
  // ── construção: dica do modo ──
  if (S.construindo) { const d = CONSTR[S.construindo]; painel(ctx, L / 2 - 400, 14, 800, 44, { bloquear: false }); texto(ctx, `Posicionando ${d.nome} — clique para marcar a obra, depois SEGURE o mouse sobre ela · Direito/X cancela`, L / 2, 42, { tam: 16, alinhar: "center" }); if (S.motivoFantasma) texto(ctx, S.motivoFantasma, L / 2, 82, { tam: 18, alinhar: "center", cor: "#f0a080", peso: "bold", sombra: true }); }
  // ── obra sob o mouse: materiais ──
  if (S.alvo && S.alvo.tipo === "constr" && S.alvo.ref.prog < 1) painelObra(ctx, S.alvo.ref, p, L);
  // ── dica do alvo ──
  else if (S.alvo && !S.construindo && !J.turno) { const dsc = descreverAlvo(J, S.alvo); if (dsc) { ctx.font = `18px Georgia, serif`; const w = ctx.measureText(dsc.txt).width + 32; painel(ctx, (L - w) / 2, 66, w, 38, { bloquear: false }); texto(ctx, dsc.txt, L / 2, 91, { tam: 18, alinhar: "center", cor: dsc.ok ? PAL.tinta : PAL.ferrugem }); } }
  // ── mensagens ──
  S.msgs.forEach((m, i) => { const y = A - 86 - (S.msgs.length - 1 - i) * 26; texto(ctx, m.texto, 24, y, { tam: 18, cor: "#f6ecd0", sombra: true }); });
  // ── abertura no navio ──
  if (J.chegando) { painel(ctx, L / 2 - 300, A - 170, 600, 70, { bloquear: false }); texto(ctx, "Você chegou à nova ilha. Aguarde o navio atracar no porto…", L / 2, A - 128, { tam: 20, alinhar: "center" }); }
  if (p.dormindo) texto(ctx, "Z z z…  (qualquer tecla de movimento acorda)", L / 2, A / 2, { tam: 28, alinhar: "center", cor: "#cfd8ff", sombra: true });
  if (ui.dica) dica(ctx, ui.dica, L, A); ui.dica = null;
}

/** Quanto falta para terminar uma obra (total e restante). */
function painelObra(ctx, b, p, L) {
  const d = CONSTR[b.tipo], itens = Object.entries(d.mat), w = 450, h = 74 + itens.length * 26, x = (L - w) / 2, y = 66;
  painel(ctx, x, y, w, h, { bloquear: false });
  texto(ctx, `${d.nome} — ${Math.round(b.prog * 100)}%`, L / 2, y + 30, { tam: 19, alinhar: "center", peso: "bold" });
  itens.forEach(([k, q], i) => { const usado = b.cons[k] || 0, falta = Math.max(0, q - usado), tem = p.inv[k] || 0, ok = tem >= falta;
    icone(ctx, ITENS[k].icone[0], ITENS[k].icone[1], x + 30, y + 58 + i * 26, 28);
    texto(ctx, `${ITENS[k].nome}`, x + 52, y + 64 + i * 26, { tam: 16 });
    texto(ctx, `usado ${usado}/${q}  ·  falta ${falta}  ·  na mochila ${tem}`, x + w - 16, y + 64 + i * 26, { tam: 14, alinhar: "right", cor: falta === 0 || ok ? PAL.ok : PAL.erro }); });
}

/** Barra do turno: horas trabalhadas, marca das 6 h (pagamento garantido) e botão Cancelar. */
function desenharTurno(ctx, J, L) {
  const T = J.turno, b = J.constrPorId.get(T.b); if (!b) return;
  const w = 640, h = 112, x = (L - w) / 2, y = 14, ok = T.t >= TURNO.minimo;
  painel(ctx, x, y, w, h);
  texto(ctx, `Trabalhando — ${CONSTR[b.tipo].nome}`, x + 24, y + 38, { tam: 22, peso: "bold" });
  texto(ctx, `${horasTxt(T.t)} de ${TURNO.duracao / 60}h`, x + w - 24 - 160, y + 38, { tam: 20, alinhar: "right" });
  if (botao(ctx, x + w - 150, y + 14, 130, 36, "Cancelar (X)", { tam: 16 })) cancelarTurno(J, "Turno cancelado");
  const bx = x + 24, bw = w - 48, by = y + 56;
  barra(ctx, bx, by, bw, 18, T.t / TURNO.duracao * 100, ok ? PAL.verde : PAL.ouro);
  const mx = bx + bw * TURNO.minimo / TURNO.duracao; ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, by - 4); ctx.lineTo(mx, by + 22); ctx.stroke();
  texto(ctx, "6h", mx - 6, by + 14, { tam: 13, alinhar: "right", cor: "#f6ecd0", peso: "bold", sombra: true });
  texto(ctx, ok ? "✔ Pagamento garantido" : `Faltam ${horasTxt(TURNO.minimo - T.t)} para garantir o pagamento`, bx, by + 38, { tam: 16, cor: ok ? PAL.ok : PAL.ferrugem, peso: "bold" });
  if (T.msg) texto(ctx, T.msg + (T.produzido ? `  ·  produzido: ${T.produzido}` : ""), x + w - 24, by + 38, { tam: 15, alinhar: "right", cor: PAL.tintaClara });
}
