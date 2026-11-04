#!/usr/bin/env python3
"""Gera um lote de imagens repetindo só as que faltam, até conseguir (a API às vezes falha).
Uso: SNAPGEN_API_KEY=... python3 ferramentas/gerar_lote.py arte/listas/personagens.json saida/ [tentativas]
O estilo vem de arte/ESTILO.txt (mesmo estilo em todas as artes do jogo)."""
import json, os, subprocess, sys, tempfile
lista, saida = sys.argv[1], sys.argv[2]
tent = int(sys.argv[3]) if len(sys.argv) > 3 else 8
aqui = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("ESTILO", open(os.path.join(aqui, "..", "arte", "ESTILO.txt")).read().strip())
itens = json.load(open(lista))
os.makedirs(saida, exist_ok=True)
for n in range(tent):
    falta = [i for i in itens if not os.path.exists(os.path.join(saida, i["nome"] + ".png"))]
    if not falta: print("lote completo"); break
    print(f"tentativa {n+1}: faltam {[i['nome'] for i in falta]}", flush=True)
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f: json.dump(falta, f)
    subprocess.run([sys.executable, os.path.join(aqui, "gerar_imagens.py"), f.name, saida])
else:
    print("AINDA FALTAM:", [i["nome"] for i in itens if not os.path.exists(os.path.join(saida, i["nome"] + ".png"))])
