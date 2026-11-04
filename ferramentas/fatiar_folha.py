#!/usr/bin/env python3
"""Fatia uma folha gerada pela IA (grade colunas×linhas, fundo transparente) em células UNIFORMES.
Uso: python3 ferramentas/fatiar_folha.py entrada.png saida.png COLUNAS LINHAS TAM_CEL [--modo animacao|objetos] [--prev prev.png]
 • animacao: mesma escala em todos os quadros (o personagem não "pulsa"); pés alinhados embaixo.
 • objetos : cada objeto é ajustado à sua célula (tamanho final é definido no jogo, em src/jogo/dados/arte.js).
Gera saida.png (grade uniforme) e imprime JSON com o tamanho de cada quadro."""
import sys, json
import numpy as np
from PIL import Image

def faixas(proj, n):
    """Divide um perfil 1D em n faixas ocupadas, juntando as que têm menor vão entre si."""
    ocup = proj > 0
    runs, ini = [], None
    for i, v in enumerate(ocup):
        if v and ini is None: ini = i
        if not v and ini is not None: runs.append([ini, i]); ini = None
    if ini is not None: runs.append([ini, len(ocup)])
    # ignora poeira (faixas minúsculas)
    runs = [r for r in runs if proj[r[0]:r[1]].sum() > 30] or runs
    if len(runs) < n: return None
    while len(runs) > n:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        k = int(np.argmin(gaps)); runs[k] = [runs[k][0], runs[k + 1][1]]; del runs[k + 1]
    return runs

def main():
    ent, sai, cols, rows, cel = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    modo = sys.argv[sys.argv.index("--modo") + 1] if "--modo" in sys.argv else "animacao"
    im = Image.open(ent).convert("RGBA"); a = np.array(im)[:, :, 3] > 24
    H, W = a.shape
    fr = faixas(a.sum(axis=1), rows)
    quadros = []
    if fr is None:
        fr = [[int(r * H / rows), int((r + 1) * H / rows)] for r in range(rows)]
    for (y0, y1) in fr:
        fc = faixas(a[y0:y1].sum(axis=0), cols)
        if fc is None: fc = [[int(c * W / cols), int((c + 1) * W / cols)] for c in range(cols)]
        for (x0, x1) in fc:
            sub = a[y0:y1, x0:x1]
            ys, xs = np.where(sub)
            if len(ys) == 0: quadros.append(None); continue
            bx = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)
            quadros.append(im.crop(bx))
    ok = [q for q in quadros if q]
    if modo == "animacao":
        mw, mh = max(q.width for q in ok), max(q.height for q in ok)
        esc = min(cel * 0.94 / mw, cel * 0.94 / mh)
    out = Image.new("RGBA", (cols * cel, rows * cel), (0, 0, 0, 0))
    info = []
    for i, q in enumerate(quadros):
        if q is None: info.append(None); continue
        e = esc if modo == "animacao" else min(cel * 0.94 / q.width, cel * 0.94 / q.height)
        nw, nh = max(1, round(q.width * e)), max(1, round(q.height * e))
        q2 = q.resize((nw, nh), Image.LANCZOS)
        cx, cy = (i % cols) * cel, (i // cols) * cel
        out.paste(q2, (cx + (cel - nw) // 2, cy + cel - nh - 2), q2)
        info.append([nw, nh])
    out.save(sai)
    print(json.dumps({"arquivo": sai, "colunas": cols, "linhas": rows, "celula": cel, "quadros": info}))

main()
