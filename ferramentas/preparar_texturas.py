#!/usr/bin/env python3
"""Prepara texturas geradas pela IA para o 3D: deixa SEM EMENDA (mistura as bordas com o centro), reduz e salva em JPG.
Uso: python3 ferramentas/preparar_texturas.py pasta_entrada pasta_saida [lado=768]"""
import sys, os, glob
import numpy as np
from PIL import Image

def sem_emenda(a):
    h, w, _ = a.shape
    deslocada = np.roll(np.roll(a, h // 2, 0), w // 2, 1)
    y = np.linspace(0, 1, h); x = np.linspace(0, 1, w)
    jan = lambda t: np.clip(np.sin(np.pi * t) * 1.6, 0, 1) ** 1.2          # 0 nas bordas, 1 no meio
    m = (jan(y)[:, None] * jan(x)[None, :])[..., None]
    return a * m + deslocada * (1 - m)

ent, sai = sys.argv[1], sys.argv[2]; lado = int(sys.argv[3]) if len(sys.argv) > 3 else 768
os.makedirs(sai, exist_ok=True)
for f in sorted(glob.glob(os.path.join(ent, "tex_*.png"))):
    im = Image.open(f).convert("RGB").resize((lado, lado), Image.LANCZOS)
    out = Image.fromarray(np.clip(sem_emenda(np.asarray(im).astype(np.float32)), 0, 255).astype("uint8"))
    dst = os.path.join(sai, os.path.basename(f)[:-4] + ".jpg"); out.save(dst, quality=88); print("ok", dst)
