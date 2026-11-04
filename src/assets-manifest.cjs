// MANIFESTO DE ARTE — tudo que o jogo carrega de public/assets/ (chave = nome da folha em src/jogo/dados/arte.js).
// Lido por src/nucleo/assets.js e por scripts/gerar-assets-md.js (gera o ASSETS.md). Sem o arquivo, o jogo desenha um marcador simples.
const A = [];
const add = (chave, arquivo, descricao, largura, altura, transparente = true) => A.push({ chave, arquivo, descricao, tipo: "imagem", largura, altura, cor: "#8a6a40", transparente });
for (let i = 1; i <= 10; i++) add("pessoa_" + i, `pers_pessoa_${i}.png`, `Spritesheet de colono ${i}: 4 colunas (passos) × 8 linhas: andar (baixo, esquerda, direita, cima) e correr (mesma ordem)`, 768, 1536);
for (let i = 1; i <= 2; i++) add("bandido_" + i, `pers_bandido_${i}.png`, `Spritesheet de bandido ${i}: 4×8 como os colonos (andar + correr)`, 768, 1536);
// animações extras: só as que têm arte listada em src/jogo/dados/animacoes.js (ver instruções lá)
{
  const dados = require("./jogo/dados/animacoes.cjs");
  for (const [nome, a] of Object.entries(dados.ANIMACOES)) if (!a.base) for (const sp of dados.SPRITES_PESSOA) if (dados.temArte(sp, nome)) add(dados.chaveAnim(sp, nome), dados.arquivoAnim(sp, nome), `Animação "${nome}" de ${sp}: ${a.quadros} quadros, ${a.cols} colunas, 4 direções (baixo, esquerda, direita, cima)`, a.cols * a.cel, 4 * dados.linhasPorDirecao(a) * a.cel);
}
for (const e of ["cervo", "coelho", "javali", "lobo", "urso"]) add("animal_" + e, `animal_${e}.png`, `Spritesheet de ${e}: 4×2 (linha 0 = andar para a direita)`, 1024, 512);
add("plantas", "plantas.png", "Plantas e árvores (4×4, ordem em dados/arte.js)", 768, 768);
add("recursos", "recursos.png", "Pedras, minérios e objetos de cenário (4×4)", 768, 768);
add("itens_1", "itens_1.png", "Ícones de materiais e comida (4×4)", 512, 512);
add("itens_2", "itens_2.png", "Ícones de ferramentas e itens (4×4)", 512, 512);
add("itens_3", "itens_3.png", "Ícones de ferramentas de pedra, galho e comida assada (4×4)", 512, 512);
add("extras", "extras.png", "Galhos, carvalho ancestral e outros objetos de cenário (4×4)", 768, 768);
add("icones_ui", "icones_ui.png", "Ícones da interface (4×4)", 512, 512);
for (let i = 1; i <= 3; i++) add("constr_" + i, `constr_${i}.png`, `Construções ${i} (2×2)`, 1024, 1024);
add("navio", "navio.png", "Navio de colonos", 512, 512);
add("capa", "capa.png", "Capa/fundo da tela inicial (16:9, com faixa livre no topo para o título)", 1600, 900, false);
module.exports = {
  assets: A,
  loja: [
    { item: "Cápsula de cabeçalho (Header Capsule)", tamanho: "920×430", formato: "PNG/JPG", obs: "Aparece na página da loja e em listas. Inclua o logo legível." },
    { item: "Cápsula pequena (Small Capsule)", tamanho: "462×174", formato: "PNG/JPG", obs: "Busca e listas pequenas." },
    { item: "Cápsula principal (Main Capsule)", tamanho: "1232×706", formato: "PNG/JPG", obs: "Destaque na página inicial da loja." },
    { item: "Cápsula vertical (Vertical Capsule)", tamanho: "748×896", formato: "PNG/JPG", obs: "Usada em algumas áreas/promoções." },
    { item: "Capturas de tela (mínimo 5)", tamanho: "≥ 1920×1080 (16:9)", formato: "PNG/JPG", obs: "Só imagens do jogo de verdade (sem logo, texto de venda ou molduras)." },
    { item: "Trailer (recomendado)", tamanho: "1080p", formato: "MP4/MOV", obs: "Mostre o jogo nos primeiros segundos." },
    { item: "Ícone do jogo no cliente Steam", tamanho: "ver Steamworks (Graphical Assets)", formato: "JPG/PNG", obs: "Também há o ícone .ico do .exe (loja/icone.ico, ≥256×256)." },
    { item: "Arte da biblioteca (Library Capsule/Hero/Logo)", tamanho: "ver Steamworks (Graphical Assets)", formato: "PNG", obs: "Capa vertical, banner largo e logo com fundo transparente; é o que o jogador vê na biblioteca e no Steam Deck." },
    { item: "Ícones das conquistas", tamanho: "256×256 (bloqueado e desbloqueado)", formato: "JPG/PNG", obs: "Dois por conquista. Rode `npm run listar-conquistas` para a lista completa." },
  ],
};
