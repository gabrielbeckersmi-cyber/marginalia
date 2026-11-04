# Pasta `loja/` — tudo da página da Steam

Aqui ficam os arquivos que **não vão dentro do jogo**: você envia no Steamworks (Store Presence). O comando `npm run verificar:loja` confere nomes e tamanhos.

| Arquivo esperado | Tamanho | Observação |
|---|---|---|
| `capsula_cabecalho.png` | 920×430 | logo legível |
| `capsula_pequena.png` | 462×174 | |
| `capsula_principal.png` | 1232×706 | |
| `capsula_vertical.png` | 748×896 | |
| `capturas/*.png` | ≥ 1920×1080 (16:9), **mínimo 5** | só imagens do jogo real; sem logo, textos de venda ou molduras |
| `icone.ico` | ≥ 256×256 | ícone do `.exe` |
| `pagina-da-loja.md` | — | rascunho dos textos (descrições, tags, requisitos) |
| `rich-presence.txt` | — | textos do "o que o jogador está fazendo" (enviar no Steamworks) |
| `conquistas.csv` | — | gerado por `npm run listar-conquistas` |

Arte da biblioteca (capa vertical, banner largo, logo transparente) e os ícones das conquistas (dois por conquista) também são enviados no Steamworks — veja `ASSETS.md` e a documentação "Graphical Assets". **Confira os tamanhos atuais lá antes de produzir a arte final.**

**Capturas de tela:** use `npm run start` (ou o navegador em `npm run dev`) e a tecla de captura do sistema; o Steam também tira capturas com F12 durante o jogo.
