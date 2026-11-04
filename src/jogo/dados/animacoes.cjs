// ANIMAÇÕES DOS PERSONAGENS — tabela única (usada pelo 2D, pelo protótipo 2.5D e pelo manifesto de arte).
// Para ADICIONAR uma animação nova com arte própria (até 24 quadros ou mais):
//   1. gere a folha (4 direções: baixo, esquerda, direita, cima — cada direção num bloco de linhas, quadros em ordem de leitura);
//   2. salve em public/assets/pers_<sprite>_<nome>.png (ex.: pers_pessoa_1_cortar.png);
//   3. nesta tabela, em `sprites`, liste quem já tem a arte (["*"] = todos). Sem arte, o jogo usa os quadros de andar (nada quebra).
// Layout da folha: `cols` colunas; cada direção ocupa ceil(quadros/cols) linhas. Ex.: 24 quadros, cols 6 → 4 linhas por direção → folha de 6×16.
const ANIMACOES = {
  // base: já existem nas folhas 4×8 (andar: linhas 0-3, correr: 4-7). O quadro acompanha a distância percorrida (e.anim).
  andar:  { base: true, linha0: 0, quadros: 4 },
  correr: { base: true, linha0: 4, quadros: 4 },
  // animações extras (folha própria por personagem). fps = quadros por segundo; loop false = toca uma vez.
  cortar:    { quadros: 24, cols: 6, fps: 24, loop: true,  cel: 160, sprites: [] },   // lenhador (machado)
  minerar:   { quadros: 24, cols: 6, fps: 24, loop: true,  cel: 160, sprites: [] },   // picareta
  colher:    { quadros: 24, cols: 6, fps: 24, loop: true,  cel: 160, sprites: [] },   // plantas, frutas, argila
  construir: { quadros: 24, cols: 6, fps: 24, loop: true,  cel: 160, sprites: [] },   // martelar
  pescar:    { quadros: 24, cols: 6, fps: 24, loop: true,  cel: 160, sprites: [] },
  fabricar:  { quadros: 24, cols: 6, fps: 24, loop: true,  cel: 160, sprites: [] },   // fogueira, bancada, turno de trabalho
  beber:     { quadros: 24, cols: 6, fps: 24, loop: true,  cel: 160, sprites: [] },
  atacar:    { quadros: 24, cols: 6, fps: 48, loop: false, cel: 160, sprites: [] },   // golpe (toca inteira, uma vez)
  parado:    { quadros: 24, cols: 6, fps: 12, loop: true,  cel: 160, sprites: [] },   // respiração/ocioso
};
// Qual animação cada tipo de trabalho usa (e.trabHab é gravado em interacao.js / cena_jogo.js).
const TRABALHO_ANIM = { lenhador: "cortar", mineracao: "minerar", coleta: "colher", construcao: "construir", pesca: "pescar", fabricar: "fabricar", beber: "beber" };
const chaveAnim = (sprite, nome) => `${sprite}__${nome}`;
const arquivoAnim = (sprite, nome) => `pers_${sprite}_${nome}.png`;
const SPRITES_PESSOA = [...Array.from({ length: 10 }, (_, i) => "pessoa_" + (i + 1)), "bandido_1", "bandido_2"];
const temArte = (sprite, nome) => { const a = ANIMACOES[nome]; return !!a && !a.base && (a.sprites.includes("*") || a.sprites.includes(sprite)); };
const linhasPorDirecao = (a) => Math.ceil(a.quadros / a.cols);

module.exports = { ANIMACOES, TRABALHO_ANIM, chaveAnim, arquivoAnim, SPRITES_PESSOA, temArte, linhasPorDirecao };
