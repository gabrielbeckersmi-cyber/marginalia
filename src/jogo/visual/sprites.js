// SPRITES — desenha um quadro de uma folha (spritesheet) pelo nome da folha e índice. Sem a imagem, desenha um marcador simples (nada quebra).
import { FOLHAS } from "../dados/arte.js";
import { arte } from "../../nucleo/assets.js";

/** Desenha o quadro `idx` da folha `chave`. (x,y) = centro (opts.centro) ou meio-inferior (padrão, "pés"). tam = lado do quadro em px. */
export function desenharQuadro(ctx, chave, idx, x, y, tam, { centro = false, espelhar = false, alfa = 1, corte = 1 } = {}) {
  const f = FOLHAS[chave], img = arte(chave);
  const dx = x - tam / 2, dy = centro ? y - tam / 2 : y - tam;
  if (!f || !img) { marcador(ctx, x, centro ? y : y - tam / 2, tam * 0.4, chave); return; }
  const cel = img.width / f.cols, sx = (idx % f.cols) * cel, sy = Math.floor(idx / f.cols) * (img.height / f.rows), ch = img.height / f.rows;
  if (alfa !== 1) ctx.globalAlpha = alfa;
  if (espelhar) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, cel, ch, -tam / 2, dy, tam, tam); ctx.restore(); }
  else if (corte < 1) { const h = tam * corte; ctx.drawImage(img, sx, sy + ch * (1 - corte), cel, ch * corte, dx, dy + tam - h, tam, h); }
  else ctx.drawImage(img, sx, sy, cel, ch, dx, dy, tam, tam);
  if (alfa !== 1) ctx.globalAlpha = 1;
}
function marcador(ctx, x, y, r, chave) {
  ctx.fillStyle = /bandido/.test(chave) ? "#8a2f1d" : /animal/.test(chave) ? "#7a5a30" : /constr/.test(chave) ? "#8a6a40" : "#4a6a30";
  ctx.beginPath(); ctx.arc(x, y, Math.max(4, r), 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#2a1b10"; ctx.stroke();
}
const TAM_PESSOA = 84;
/** Pessoa andando: linhas da folha = baixo, esquerda, direita, cima; colunas = passos. */
export function desenharPessoa(ctx, e, x, y, { dormindo = false } = {}) {
  const f = e.mov || e.trab ? Math.floor(e.anim || 0) % 4 : 0, linha = e.dir === undefined ? 0 : e.dir;
  sombra(ctx, x, y, 17);
  if (dormindo) { ctx.save(); ctx.translate(x, y - 6); ctx.rotate(-Math.PI / 2 * 0.95); desenharQuadro(ctx, e.sprite, 0, 0, 30, TAM_PESSOA * 0.9); ctx.restore(); return; }
  const balanco = e.mov ? Math.abs(Math.sin((e.anim || 0) * 0.8)) * 2 : 0;
  desenharQuadro(ctx, e.sprite, linha * 4 + f, x, y - balanco + 3, TAM_PESSOA);
}
export function sombra(ctx, x, y, rx, ry = rx * 0.38) { ctx.fillStyle = "#00000030"; ctx.beginPath(); ctx.ellipse(x, y - 1, rx, ry, 0, 0, 7); ctx.fill(); }
