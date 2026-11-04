// ESTILO ÚNICO DO JOGO — pergaminho, tinta e sépia. TODO botão, painel e barra passa por aqui, então nada parece "de outro jogo".
// Para mudar o visual do jogo inteiro: ajuste PAL e as funções abaixo.
// Interface em "modo imediato": o botão é desenhado e devolve true se foi clicado neste quadro (ui.clique é preenchido em atualizar()).
import * as entrada from "../../nucleo/entrada.js";
import { desenharQuadro } from "./sprites.js";

export const PAL = {
  tinta: "#2a1b10", tintaClara: "#5a4128", pergaminho: "#e6d2a2", pergaminho2: "#d6bd86", sombra: "#00000055",
  ferrugem: "#9a3b22", ouro: "#c8962a", verde: "#4f7a2f", azul: "#3f6e91", fome: "#b9772c", sede: "#3b83b5", cansaco: "#6b5aa0", vida: "#a8302a",
  ok: "#4f7a2f", erro: "#9a3b22",
};
export const FONTE = "Georgia, 'Palatino Linotype', 'Book Antiqua', serif";

/** Estado do ponteiro para a interface (preenchido por ui.sincronizar() em atualizar). */
export const ui = {
  x: 0, y: 0, confirmar: false, nav: 0, clique: false, baixo: false, direito: false, cliqueDireito: false, roda: 0, sobre: false, sobrePrev: false, foco: null,
  inativo: false,   // true enquanto uma cena que está EMBAIXO de outra (ex.: jogo sob a pausa) desenha: ela não pode reagir ao mouse nem limpar o clique
  sincronizar() {
    const p = entrada.ponteiroAtual();
    this.x = p.x; this.y = p.y; this.baixo = p.baixo; this.direito = p.direito;
    if (p.clicou) this.clique = true;
    if (p.cliqueDireito) this.cliqueDireito = true;
    if (p.roda) this.roda += p.roda;
    if (entrada.apertou("confirmar")) this.confirmar = true;
    if (entrada.apertou("cima")) this.nav -= 1; if (entrada.apertou("baixo")) this.nav += 1;
  },
  /** Chame no FIM de desenhar(): consome clique/roda e troca o "mouse está sobre a interface". */
  fimQuadro() { if (this.inativo) { this.inativo = false; return; } this.clique = false; this.cliqueDireito = false; this.roda = 0; this.confirmar = false; this.nav = 0; this.sobrePrev = this.sobre; this.sobre = false; },
  dentro(x, y, w, h) { return !this.inativo && this.x >= x && this.x <= x + w && this.y >= y && this.y <= y + h; },
  /** Marca que o mouse está sobre um painel (o mundo ignora cliques ali). */
  bloquear(x, y, w, h) { if (this.dentro(x, y, w, h)) this.sobre = true; },
};

export function texto(ctx, s, x, y, { tam = 20, cor = PAL.tinta, alinhar = "left", peso = "normal", sombra = false, estilo = "" } = {}) {
  ctx.font = `${estilo} ${peso} ${tam}px ${FONTE}`.trim(); ctx.textAlign = alinhar; ctx.textBaseline = "alphabetic";
  if (sombra) { ctx.fillStyle = "#0008"; ctx.fillText(s, x + 1.5, y + 1.5); }
  ctx.fillStyle = cor; ctx.fillText(s, x, y);
}
export function medir(ctx, s, tam = 20, peso = "normal") { ctx.font = `${peso} ${tam}px ${FONTE}`; return ctx.measureText(s).width; }
export function quebrar(ctx, s, larg, tam = 18) {
  ctx.font = `${tam}px ${FONTE}`; const linhas = []; let atual = "";
  for (const palavra of String(s).split(" ")) { const t = atual ? atual + " " + palavra : palavra; if (ctx.measureText(t).width > larg && atual) { linhas.push(atual); atual = palavra; } else atual = t; }
  if (atual) linhas.push(atual); return linhas;
}

// textura de papel (gerada uma vez)
let papel = null;
function texturaPapel() {
  if (papel) return papel;
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = PAL.pergaminho; g.fillRect(0, 0, 128, 128);
  let sem = 7; const r = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "#00000010" : "#ffffff12"; g.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 6; i++) { g.fillStyle = "#7a4a1a0c"; g.beginPath(); g.arc(r() * 128, r() * 128, 8 + r() * 18, 0, 7); g.fill(); }
  papel = c; return c;
}
export const padraoPapel = (ctx) => ctx.createPattern(texturaPapel(), "repeat");

/** Painel de pergaminho com borda dupla de tinta. */
export function painel(ctx, x, y, w, h, { titulo = null, fundo = null, bloquear = true } = {}) {
  if (bloquear) ui.bloquear(x, y, w, h);
  ctx.save();
  ctx.shadowColor = "#0007"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fillStyle = fundo || padraoPapel(ctx); ctx.fill(); ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = PAL.tinta; ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = PAL.tintaClara; ctx.beginPath(); ctx.roundRect(x + 5, y + 5, w - 10, h - 10, 4); ctx.stroke();
  for (const [cx, cy] of [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]]) { ctx.fillStyle = PAL.ferrugem; ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, 7); ctx.fill(); }
  if (titulo) { texto(ctx, titulo, x + w / 2, y + 36, { tam: 26, alinhar: "center", peso: "bold" }); ctx.strokeStyle = PAL.tintaClara; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 24, y + 46); ctx.lineTo(x + w - 24, y + 46); ctx.stroke(); }
}

/** Botão. Devolve true se clicado. opts: { ativo, desab, tam, icone:[folha,idx] } */
export function botao(ctx, x, y, w, h, rotulo, { ativo = false, desab = false, tam = 20, icone = null, dica = null } = {}) {
  const hover = !desab && ui.dentro(x, y, w, h), baixo = hover && ui.baixo;
  ui.bloquear(x, y, w, h);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y + (baixo ? 2 : 0), w, h, 6);
  ctx.fillStyle = desab ? "#b8a67c" : ativo ? "#f0e0b0" : hover ? "#efdcae" : PAL.pergaminho2; ctx.fill();
  ctx.lineWidth = ativo ? 3.5 : 2.5; ctx.strokeStyle = desab ? "#6a5a40" : ativo ? PAL.ferrugem : PAL.tinta; ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = "#ffffff55"; ctx.beginPath(); ctx.roundRect(x + 3, y + 3 + (baixo ? 2 : 0), w - 6, h - 6, 4); ctx.stroke();
  ctx.restore();
  let tx = x + w / 2;
  if (icone) { desenharQuadro(ctx, icone[0], icone[1], x + 8 + h * 0.35, y + h * 0.5 + (baixo ? 2 : 0), h * 0.8, { centro: true }); tx += h * 0.35; }
  texto(ctx, rotulo, tx, y + h / 2 + tam * 0.34 + (baixo ? 2 : 0), { tam, alinhar: "center", cor: desab ? "#6a5a40" : PAL.tinta, peso: ativo ? "bold" : "normal" });
  if (hover && dica) ui.dica = dica;
  const clicou = hover && ui.clique; if (clicou) ui.clique = false;
  return clicou;
}

/** Barra de status (fome, sede...). v de 0 a 100. */
export function barra(ctx, x, y, w, h, v, cor, { rotulo = null, icone = null, invertida = false } = {}) {
  if (icone) desenharQuadro(ctx, icone[0], icone[1], x - 2, y + h / 2, h * 2.1, { centro: true });
  const bx = x + (icone ? h * 0.9 : 0), bw = w - (icone ? h * 0.9 : 0);
  ctx.fillStyle = "#2a1b10cc"; ctx.beginPath(); ctx.roundRect(bx, y, bw, h, 4); ctx.fill();
  const f = Math.max(0, Math.min(1, v / 100));
  if (f > 0) { ctx.fillStyle = cor; ctx.beginPath(); ctx.roundRect(bx + 2, y + 2, Math.max(2, (bw - 4) * f), h - 4, 3); ctx.fill(); ctx.fillStyle = "#ffffff30"; ctx.fillRect(bx + 3, y + 3, Math.max(0, (bw - 6) * f), 2); }
  ctx.lineWidth = 2; ctx.strokeStyle = PAL.tinta; ctx.beginPath(); ctx.roundRect(bx, y, bw, h, 4); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = "#e6d2a288"; ctx.beginPath(); ctx.roundRect(bx + 1, y + 1, bw - 2, h - 2, 3); ctx.stroke();
  if (rotulo) texto(ctx, rotulo, bx + bw / 2, y + h - 3, { tam: h - 5, alinhar: "center", cor: "#f6ecd0", sombra: true });
}

/** Ícone + número (ouro etc.). */
export function icone(ctx, chave, idx, x, y, tam) { desenharQuadro(ctx, chave, idx, x, y, tam, { centro: true }); }

/** Etiqueta de dica flutuante ao lado do mouse. */
export function dica(ctx, s, L, A) {
  if (!s) return;
  ctx.font = `16px ${FONTE}`; const w = ctx.measureText(s).width + 20; let x = ui.x + 16, y = ui.y + 20; if (x + w > L - 6) x = L - w - 6; if (y + 30 > A) y = ui.y - 34;
  ctx.fillStyle = "#2a1b10ee"; ctx.beginPath(); ctx.roundRect(x, y, w, 28, 5); ctx.fill(); ctx.strokeStyle = PAL.ouro; ctx.lineWidth = 1.5; ctx.stroke();
  texto(ctx, s, x + 10, y + 20, { tam: 16, cor: "#f6ecd0" });
}
export const fmt = (n) => (Math.round(n)).toLocaleString("pt-BR");

/** Menu vertical de botões (mouse + setas + confirmar). itens: [{ rotulo, acao, desab }]; est = objeto que guarda { foco }. */
export function menuVertical(ctx, est, itens, cx, y, w = 340, h = 52, gap = 14) {
  est.foco = est.foco || 0;
  if (ui.nav) { est.foco = (est.foco + ui.nav + itens.length * 4) % itens.length; ui.nav = 0; }
  itens.forEach((it, i) => {
    const x = cx - w / 2, yy = y + i * (h + gap);
    if (ui.dentro(x, yy, w, h) && (ui.x !== est.mx || ui.y !== est.my)) est.foco = i;
    if (botao(ctx, x, yy, w, h, it.rotulo, { ativo: est.foco === i, desab: it.desab, tam: 22 })) { est.foco = i; if (!it.desab) it.acao(); }
    else if (ui.confirmar && est.foco === i && !it.desab) { ui.confirmar = false; it.acao(); }
  });
  est.mx = ui.x; est.my = ui.y;
}
