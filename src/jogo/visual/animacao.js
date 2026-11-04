// ESCOLHA DO QUADRO — decide qual animação e qual quadro mostrar para uma pessoa. Serve ao 2D e ao protótipo 2.5D.
// Devolve { chave, idx }: a folha (chave de FOLHAS) e o índice do quadro. Se a arte da animação não existe, cai no andar/parado.
import { ANIMACOES, TRABALHO_ANIM, chaveAnim, temArte, linhasPorDirecao } from "../dados/animacoes.js";

const agora = () => performance.now() / 1000;

/** Nome da animação desejada pelo estado da pessoa. */
export function animacaoDesejada(e) {
  if (e.golpe > 0) return "atacar";
  if (e.mov) return e.correndo ? "correr" : "andar";
  if (e.trab) return TRABALHO_ANIM[e.trabHab] || "andar";
  return "parado";
}

/** dir: 0 baixo, 1 esquerda, 2 direita, 3 cima (já relativo à câmera, se for o caso). */
export function quadroPessoa(e, dir, tempo = agora()) {
  let nome = animacaoDesejada(e), a = ANIMACOES[nome];
  // animação de toque único em andamento não é cortada
  const at = e._an;
  if (at && at.uma && tempo - at.t0 < at.dur && ANIMACOES[at.nome] && nome !== at.nome && temArte(e.sprite, at.nome)) { nome = at.nome; a = ANIMACOES[nome]; }
  if (a && !a.base && !temArte(e.sprite, nome)) { nome = e.mov ? (e.correndo ? "correr" : "andar") : e.trab ? "andar" : "parado"; a = ANIMACOES[nome]; }
  if (!a || nome === "parado" && !temArte(e.sprite, "parado")) {                       // fallback: quadro 0 da folha base, ou andar enquanto trabalha
    const f = e.trab ? Math.floor(e.anim || 0) % 4 : 0;
    return { chave: e.sprite, idx: dir * 4 + f };
  }
  if (a.base) { const f = e.mov || e.trab ? Math.floor(e.anim || 0) % a.quadros : 0; return { chave: e.sprite, idx: (a.linha0 + dir) * 4 + f }; }
  if (!at || at.nome !== nome) e._an = { nome, t0: tempo, uma: !a.loop, dur: a.quadros / a.fps };
  const t = tempo - e._an.t0, n = Math.floor(t * a.fps), f = a.loop ? n % a.quadros : Math.min(n, a.quadros - 1);
  return { chave: chaveAnim(e.sprite, nome), idx: dir * linhasPorDirecao(a) * a.cols + f };
}
