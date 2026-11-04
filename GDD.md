# Marginália — resumo do design e MAPA DE ONDE MEXER

Colonização medieval em vista de cima. Você e 19 colonos chegam de navio a uma ilha enorme (≈13 min para atravessar a pé), fundam cidades (o primeiro poço funda a cidade), constroem, trabalham, comerciam e evoluem habilidades. A cada 10 min chega outro navio com 10–30 colonos (teto: 700). Com 70+ colonos, alguns recém-chegados são bandidos.

## Regras principais (e o arquivo onde cada uma vive)
| Assunto | Onde mudar |
|---|---|
| Tamanho do mundo, velocidades, intervalo dos navios, ouro inicial, injeção diária, limites de população, bandidos, tempo de fome/sede/cansaço | `src/jogo/config.js` |
| Habilidades (lista, profissões) | `src/jogo/dados/habilidades.js` |
| Itens, preços-base, quanto cada comida sacia | `src/jogo/dados/itens.js` |
| Construções (tamanho, requisitos de nível, materiais, receitas/produções) | `src/jogo/dados/construcoes.js` |
| O que cada árvore/pedra/planta rende e quanto demora | `src/jogo/dados/coleta.js` |
| Animais (passivo / neutro / agressivo, vida, dano, drops) | `src/jogo/dados/animais.js` |
| Qual desenho (folha+índice) é cada elemento do mapa e o tamanho na tela | `src/jogo/dados/arte.js` |
| Geração da ilha (rios, florestas, montanhas, porto, pedras; árvores em grade espaçada: `ARVORE_CEL` no config) | `src/jogo/mundo.js` |
| Toco da árvore cortada (remover = +1 madeira, deixar = rebrota em `ARVORE_REBROTA_DIAS`) | `dados/coleta.js` (feat 10) + `mundo.js` (`aplicarColeta`) |
| Economia: oferta/demanda, inflação, injeção diária, impostos, salários | `src/jogo/sistemas/economia.js` |
| Habilidades: ganho de XP, velocidade, ensino pago (ganho proporcional à diferença) | `src/jogo/sistemas/habilidades.js` (+ `XP_K`, `VEL_HAB`, `ENSINO` no config) |
| Fome/sede/cansaço, cantil, rio | `src/jogo/sistemas/necessidades.js` |
| Regras de construir (distância, obra com consumo gradual, fundar cidade) | `src/jogo/sistemas/construcao.js` |
| Produção, vagas de emprego, contratação | `src/jogo/sistemas/negocios.js` |
| Comportamento dos colonos (o que decidem fazer e como) | `src/jogo/sistemas/ia.js` (`decidir*` = o quê; `EXEC.*` = como) |
| Bandidos | `src/jogo/sistemas/bandidos.js` · Animais: `animais.js` · Combate (mouse; colono atacado revida/foge): `combate.js` |
| Equipar arma/escudo (o que está na mão define o dano) | `src/jogo/sistemas/equipamento.js` |
| Mortos deixam corpo com os bens; saque | `src/jogo/sistemas/corpos.js` (painel: `desenharSaque` em `ui/paineis.js`) |
| Turno de trabalho do jogador: 8 h travado, 6 h garantem pagamento (`TURNO`) | `src/jogo/sistemas/turno.js` (aba "Trabalhar" em `ui/paineis.js`, barra em `ui/hud.js`) |
| Navios e chegada de colonos | `src/jogo/sistemas/colonos.js` |
| Controle do jogador (mover, segurar o mouse, beber, dormir, atacar) | `src/jogo/interacao.js` |
| Relógio e estado da partida, save/load | `src/jogo/estado.js` |
| Teclas e botões do controle | `src/nucleo/entrada.js` |

## Visual (tudo passa pelo mesmo estilo: pergaminho + tinta sépia)
| Assunto | Onde |
|---|---|
| Cores, fonte, painéis, botões, barras (muda o jogo inteiro) | `src/jogo/visual/estilo.js` |
| Terreno contínuo estilo Don't Starve (cores, contorno, manchas, ondas) | `src/jogo/visual/terreno.js` |
| Luz do dia, tremor/piscada de cansaço, ordem de desenho | `src/jogo/visual/mundo_desenho.js` |
| Minimapa e mapa grande | `src/jogo/visual/mapa.js` |
| Barras de status, mensagens, barra de ações | `src/jogo/ui/hud.js` |
| Mochila (detalhes do item + ações), habilidades, construção, conversa/ensino, negócios e mercado, saque | `src/jogo/ui/paineis.js` |
| Título, criação de personagem, pausa, opções, conquistas | `src/jogo/cenas.js` · Partida: `src/jogo/cena_jogo.js` |
| Conquistas e estatísticas da Steam | `CONFIGURE-AQUI.js` + `cena_jogo.js` (função `conquistas`) |

## Arte (gerada por IA — ver aviso abaixo)
`arte/ESTILO.txt` é o texto de estilo usado em TODAS as imagens (é o que mantém tudo com a mesma cara). `arte/listas/*.json` guarda os pedidos de cada folha; `ferramentas/` gera e fatia as folhas (`fatiar_folha.py`) para `public/assets/`. Para refazer uma folha, gere de novo mantendo a ORDEM descrita no pedido e fatie com o mesmo comando (veja o cabeçalho do script).
Personagens: 4 colunas (passos) × 4 linhas (baixo, esquerda, direita, cima). Animais: 4×2 (linha 0 = andando para a direita). Construções: 2×2. Itens/plantas/ícones: 4×4.

> **Steam exige informar o uso de IA generativa** na página da loja (Steamworks → Store Page → "AI Generated Content"). Toda a arte do jogo foi gerada por IA; descreva isso lá.

## Controles
WASD/setas mover · **Shift** correr (gasta fôlego) · **C** fabricar à mão · **mouse esquerdo**: segurar para coletar/construir/beber, clicar em colono = conversar, em corpo = saquear; em animal/bandido, clicar ou segurar = atacar · **mouse direito** (segurar): atacar qualquer alvo, inclusive colonos · I mochila (clique no item: detalhes/equipar/comer/descartar) · B construir · K habilidades · M mapa · E interagir · F comer · R cantil · Z dormir (só perto de uma moradia que VOCÊ construiu e não está alugada) · X cancelar (obra/turno) · Esc pausa.

## Regras novas (3ª rodada)
- **Fôlego (stamina)**: correr com Shift, cortar, minerar, colher e construir gastam; zerou = exausto até recuperar ~25. Parado recupera mais rápido; dormir, ainda mais. Config em `C.STAMINA` / `C.STAMINA_TRAB`.
- **Combate**: arco = longo alcance (`C.ALCANCE_ARCO` tiles, erra mais de longe); todo ataque (jogador, colonos, bandidos, animais) pode errar — chance = 0,78 + (habilidade de quem ataca − de quem defende)/180, limitada a 12–95 % (`chanceAcerto` em `sistemas/combate.js`).
- **Coleta**: árvores/minérios têm nível mínimo e qualidade mínima de ferramenta (`dados/coleta.js`: `min`, `tier`). Árvore exige no mínimo machado de pedra; carvalho ancestral só com machado de ferro e nível 25; carvão nível 6 e ferro nível 12 com picareta. Galhos no chão e nas árvores.
- **Ferramentas quebram** (jogador e colonos): `durab` em `dados/itens.js` (pedra 18 usos, ferro 70). Colonos fabricam as de pedra (galho + pedra + fibra) ou compram as de ferro em negócios/mercado.
- **Fogueira**: obra barata (pode ficar colada em outras construções); cozinha carne e peixe gastando 1 galho por prato (também usada pelos colonos).
- **Moradias**: o dono anuncia aluguel (por dia) ou venda; colonos aceitam se o preço estiver dentro da sensibilidade deles (`e.sensPreco`) e se tiverem dinheiro. Lógica em `sistemas/moradia.js`.
- **Obras** ~1,8× mais rápidas (`C.CONSTR_RAPIDEZ`); quem estava onde a obra nasce é empurrado para fora, e `mover()` desencalha quem ficar preso.
- Aprender com colonos rende um pouco mais (`C.ENSINO.fator` 0,04).

## Como o jogo roda tantos colonos
- Colonos próximos do jogador simulam a cada quadro; os distantes só a cada ~2 s com passo grande (LOD). Só o necessário vai para o save (mapa regenerado pela semente + diferenças).
- Animais só "existem" ao redor do jogador (blocos de 32 tiles); longe são contadores no mapa.
- Medição (CPU de servidor): 700 colonos → média 0,2 ms e pior caso ≈ 21 ms por passo de 1/60 s; 180 min de jogo simulados em ~16 s.

## Testes
`npm run teste` (lógica: mundo, habilidades, economia, construção, mercado, simulação de 25 min, save) · `xvfb-run -a npm run teste:e2e` (Electron de verdade; capturas em `test/_saida/`).
