# ASSETS — imagens do jogo e da página da Steam

> Arquivo GERADO a partir de `src/assets-manifest.cjs` (não edite aqui; edite o manifesto e rode `npm run build`).

**Como trocar a arte:** salve o arquivo com EXATAMENTE o nome da coluna *Arquivo* em `public/assets/` e rode `npm run build`.
Sem o arquivo, o jogo desenha uma versão vetorial neon no lugar — nada quebra.

## Dentro do jogo (`public/assets/`)

| Arquivo | Para quê | Tamanho | Fundo |
|---|---|---|---|
| `pers_pessoa_1.png` | Spritesheet de colono 1: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_2.png` | Spritesheet de colono 2: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_3.png` | Spritesheet de colono 3: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_4.png` | Spritesheet de colono 4: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_5.png` | Spritesheet de colono 5: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_6.png` | Spritesheet de colono 6: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_7.png` | Spritesheet de colono 7: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_8.png` | Spritesheet de colono 8: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_9.png` | Spritesheet de colono 9: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_pessoa_10.png` | Spritesheet de colono 10: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima) | 768×768px | transparente (PNG) |
| `pers_bandido_1.png` | Spritesheet de bandido 1: 4×4 como os colonos | 768×768px | transparente (PNG) |
| `pers_bandido_2.png` | Spritesheet de bandido 2: 4×4 como os colonos | 768×768px | transparente (PNG) |
| `animal_cervo.png` | Spritesheet de cervo: 4×2 (linha 0 = andar para a direita) | 1024×512px | transparente (PNG) |
| `animal_coelho.png` | Spritesheet de coelho: 4×2 (linha 0 = andar para a direita) | 1024×512px | transparente (PNG) |
| `animal_javali.png` | Spritesheet de javali: 4×2 (linha 0 = andar para a direita) | 1024×512px | transparente (PNG) |
| `animal_lobo.png` | Spritesheet de lobo: 4×2 (linha 0 = andar para a direita) | 1024×512px | transparente (PNG) |
| `animal_urso.png` | Spritesheet de urso: 4×2 (linha 0 = andar para a direita) | 1024×512px | transparente (PNG) |
| `plantas.png` | Plantas e árvores (4×4, ordem em dados/arte.js) | 768×768px | transparente (PNG) |
| `recursos.png` | Pedras, minérios e objetos de cenário (4×4) | 768×768px | transparente (PNG) |
| `itens_1.png` | Ícones de materiais e comida (4×4) | 512×512px | transparente (PNG) |
| `itens_2.png` | Ícones de ferramentas e itens (4×4) | 512×512px | transparente (PNG) |
| `itens_3.png` | Ícones de ferramentas de pedra, galho e comida assada (4×4) | 512×512px | transparente (PNG) |
| `extras.png` | Galhos, carvalho ancestral e outros objetos de cenário (4×4) | 768×768px | transparente (PNG) |
| `icones_ui.png` | Ícones da interface (4×4) | 512×512px | transparente (PNG) |
| `constr_1.png` | Construções 1 (2×2) | 1024×1024px | transparente (PNG) |
| `constr_2.png` | Construções 2 (2×2) | 1024×1024px | transparente (PNG) |
| `constr_3.png` | Construções 3 (2×2) | 1024×1024px | transparente (PNG) |
| `navio.png` | Navio de colonos | 512×512px | transparente (PNG) |
| `capa.png` | Capa/fundo da tela inicial (16:9, com faixa livre no topo para o título) | 1600×900px | opaco |

## Página da loja Steam (você envia no Steamworks; ficam em `loja/`)

| Item | Tamanho | Formato | Observação |
|---|---|---|---|
| Cápsula de cabeçalho (Header Capsule) | 920×430 | PNG/JPG | Aparece na página da loja e em listas. Inclua o logo legível. |
| Cápsula pequena (Small Capsule) | 462×174 | PNG/JPG | Busca e listas pequenas. |
| Cápsula principal (Main Capsule) | 1232×706 | PNG/JPG | Destaque na página inicial da loja. |
| Cápsula vertical (Vertical Capsule) | 748×896 | PNG/JPG | Usada em algumas áreas/promoções. |
| Capturas de tela (mínimo 5) | ≥ 1920×1080 (16:9) | PNG/JPG | Só imagens do jogo de verdade (sem logo, texto de venda ou molduras). |
| Trailer (recomendado) | 1080p | MP4/MOV | Mostre o jogo nos primeiros segundos. |
| Ícone do jogo no cliente Steam | ver Steamworks (Graphical Assets) | JPG/PNG | Também há o ícone .ico do .exe (loja/icone.ico, ≥256×256). |
| Arte da biblioteca (Library Capsule/Hero/Logo) | ver Steamworks (Graphical Assets) | PNG | Capa vertical, banner largo e logo com fundo transparente; é o que o jogador vê na biblioteca e no Steam Deck. |
| Ícones das conquistas | 256×256 (bloqueado e desbloqueado) | JPG/PNG | Dois por conquista. Rode `npm run listar-conquistas` para a lista completa. |

Nomes esperados pelo `npm run verificar:loja`: `loja/capsula_cabecalho.png`, `loja/capsula_pequena.png`, `loja/capsula_principal.png`, `loja/capsula_vertical.png`, `loja/capturas/*.png` (mínimo 5), `loja/icone.ico`.
