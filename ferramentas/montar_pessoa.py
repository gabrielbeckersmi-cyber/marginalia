#!/usr/bin/env python3
"""Monta a folha final de um personagem (4 colunas × 8 linhas) a partir da folha gerada (4 colunas × 6 linhas).
Entrada (linhas): 1 andar-baixo · 2 andar-esquerda · 3 andar-cima · 4 correr-baixo · 5 correr-esquerda · 6 correr-cima.
Saída (linhas):   andar: baixo, esquerda, direita(espelho), cima  ·  correr: baixo, esquerda, direita(espelho), cima.
No jogo: indice do quadro = (correndo ? 16 : 0) + direcao*4 + passo   (direcao: 0 baixo, 1 esquerda, 2 direita, 3 cima).
Uso: python3 ferramentas/montar_pessoa.py entrada.png saida.png [TAM_CEL=192] [--andar=d|e] [--correr=d|e]   (para onde olham as linhas laterais andar/correr da folha gerada; padrão d = direita)"""
import sys
import numpy as np
from PIL import Image

def limpar_fundo(im):
    """Remove o magenta do fundo, a linha de chão arroxeada e a franja rosada em volta."""
    a = np.array(im.convert("RGBA")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    fundo = (r > 95) & (b > 95) & (g < np.minimum(r, b) * 0.72) & (np.abs(r - b) < 110)
    a[..., 3][fundo] = 0
    return Image.fromarray(a.astype("uint8"), "RGBA")

def faixas(proj, n):
    ocup = proj > 0; runs, ini = [], None
    for i, v in enumerate(ocup):
        if v and ini is None: ini = i
        if not v and ini is not None: runs.append([ini, i]); ini = None
    if ini is not None: runs.append([ini, len(ocup)])
    runs = [r for r in runs if proj[r[0]:r[1]].sum() > 60] or runs
    if len(runs) < n: return None
    while len(runs) > n:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        k = int(np.argmin(gaps)); runs[k] = [runs[k][0], runs[k + 1][1]]; del runs[k + 1]
    return runs

def main():
    ent, sai = sys.argv[1], sys.argv[2]; cel = int(sys.argv[3]) if len(sys.argv) > 3 else 192
    im = limpar_fundo(Image.open(ent)); al = np.array(im)[..., 3] > 24; H, W = al.shape
    fr = faixas(al.sum(axis=1), 6) or [[int(r * H / 6), int((r + 1) * H / 6)] for r in range(6)]
    quadros = []                                   # lista de 24: (imagem, ancora_x)
    for (y0, y1) in fr:
        fc = faixas(al[y0:y1].sum(axis=0), 4) or [[int(c * W / 4), int((c + 1) * W / 4)] for c in range(4)]
        for (x0, x1) in fc:
            sub = al[y0:y1, x0:x1]; ys, xs = np.where(sub)
            bx = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)
            q = im.crop(bx); m = np.array(q)[..., 3] > 24
            topo = m[: max(1, int(m.shape[0] * 0.6))]; cx = np.where(topo)[1].mean() if topo.any() else q.width / 2   # âncora = cabeça/tronco
            quadros.append((q, cx))
    esc = min(cel * 0.94 / max(q.height for q, _ in quadros), cel * 0.94 / max(q.width for q, _ in quadros))
    # lado para onde a folha gerada olha nas linhas laterais: --andar=e|d  --correr=e|d (d = direita, padrão)
    arg = lambda k: next((a.split("=")[1] for a in sys.argv if a.startswith("--" + k + "=")), "d") == "d"
    da, dc = arg("andar"), arg("correr")
    ordem = [(0, False), (1, da), (1, not da), (2, False), (3, False), (4, dc), (4, not dc), (5, False)]
    out = Image.new("RGBA", (4 * cel, 8 * cel), (0, 0, 0, 0))
    for lo, (li, esp) in enumerate(ordem):
        for c in range(4):
            q, cx = quadros[li * 4 + c]
            nw, nh = max(1, round(q.width * esc)), max(1, round(q.height * esc)); q2 = q.resize((nw, nh), Image.LANCZOS); ax = cx * esc
            if esp: q2 = q2.transpose(Image.FLIP_LEFT_RIGHT); ax = nw - ax
            x = round(c * cel + cel / 2 - ax); x = max(c * cel, min(c * cel + cel - nw, x))
            out.paste(q2, (x, lo * cel + cel - nh - 2), q2)
    out.save(sai); print("ok", sai, f"escala {esc:.3f}")
main()
