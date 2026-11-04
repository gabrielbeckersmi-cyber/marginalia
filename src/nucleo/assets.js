// ARTE DO JOGO — carregada pelo nome (chave) do src/assets-manifest.cjs.
// • Se o arquivo existe em public/assets/, o jogo usa a imagem.
// • Se NÃO existe, o jogo desenha uma versão VETORIAL "neon" no lugar (nada quebra; dá para jogar e testar sem arte).
// Para trocar pela arte final: solte o arquivo com o MESMO NOME em public/assets/ e rode npm run build.
import MANIFESTO from "../assets-manifest.cjs";

const imagens = new Map(); // chave → HTMLImageElement | null

function carregarUma(a) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { imagens.set(a.chave, img); resolve(); };
    img.onerror = () => { imagens.set(a.chave, null); resolve(); };
    img.src = "assets/" + a.arquivo;
  });
}

export async function carregarArte() { await Promise.all(MANIFESTO.assets.map(carregarUma)); }

/** Imagem carregada ou null (então quem desenha usa o visual vetorial). */
export const arte = (chave) => imagens.get(chave) || null;

/** Desenha a arte centralizada em (x,y) com tamanho w×h e rotação; devolve false se não há arte. */
export function desenharArte(ctx, chave, x, y, w, h, rot = 0) {
  const img = arte(chave);
  if (!img) return false;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}
