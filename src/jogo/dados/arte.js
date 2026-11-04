// ARTE — onde está cada folha de sprites e qual tamanho desenhar. Para trocar uma arte: gere de novo (ferramentas/) e mantenha a ordem.
// folha: { arq, cols, rows, cel } — cel = lado (px) de cada célula já fatiada. Os arquivos ficam em public/assets/.
export const FOLHAS = {};
for (let i = 1; i <= 10; i++) FOLHAS["pessoa_" + i] = { arq: `pers_pessoa_${i}.png`, cols: 4, rows: 8, cel: 192 };
for (let i = 1; i <= 2; i++) FOLHAS["bandido_" + i] = { arq: `pers_bandido_${i}.png`, cols: 4, rows: 8, cel: 192 };
for (const e of ["cervo", "coelho", "javali", "lobo", "urso"]) FOLHAS["animal_" + e] = { arq: `animal_${e}.png`, cols: 4, rows: 2, cel: 256 };
Object.assign(FOLHAS, {
  plantas: { arq: "plantas.png", cols: 4, rows: 4, cel: 192 },
  recursos: { arq: "recursos.png", cols: 4, rows: 4, cel: 192 },
  itens_1: { arq: "itens_1.png", cols: 4, rows: 4, cel: 128 },
  itens_2: { arq: "itens_2.png", cols: 4, rows: 4, cel: 128 },
  itens_3: { arq: "itens_3.png", cols: 4, rows: 4, cel: 128 },
  extras: { arq: "extras.png", cols: 4, rows: 4, cel: 192 },
  icones_ui: { arq: "icones_ui.png", cols: 4, rows: 4, cel: 128 },
  constr_1: { arq: "constr_1.png", cols: 2, rows: 2, cel: 512 },
  constr_2: { arq: "constr_2.png", cols: 2, rows: 2, cel: 512 },
  constr_3: { arq: "constr_3.png", cols: 2, rows: 2, cel: 512 },
  navio: { arq: "navio.png", cols: 1, rows: 1, cel: 512 },
});
export const IMAGENS_AVULSAS = { capa: "capa.png" };
export const NUM_PESSOAS = 10, NUM_BANDIDOS = 2;
// quais aparências são femininas/masculinas (para o nome combinar com o desenho)
export const SPRITES_FEM = [2, 4, 6, 7, 8, 10], SPRITES_MASC = [1, 3, 5, 9];
export const ehFeminino = (sprite) => SPRITES_FEM.includes(+String(sprite).split("_")[1]);

// ELEMENTOS DO MAPA (feature do tile): f = [folha, índice], tam = largura desenhada (px), bloq = impede passagem, grupos = o que são para buscas.
export const FEAT = {
  1: { n: "Carvalho", f: ["plantas", 0], tam: 128, bloq: true, grupos: ["madeira"] },
  2: { n: "Pinheiro", f: ["plantas", 1], tam: 122, bloq: true, grupos: ["madeira"] },
  3: { n: "Árvore seca", f: ["plantas", 2], tam: 110, bloq: true, grupos: ["madeira"] },
  4: { n: "Macieira", f: ["plantas", 3], tam: 128, bloq: true, grupos: ["comida"] },
  5: { n: "Amoreira", f: ["plantas", 4], tam: 64, grupos: ["comida"] },
  6: { n: "Arbusto", f: ["plantas", 5], tam: 62, grupos: ["fibra"] },
  7: { n: "Cogumelos", f: ["plantas", 6], tam: 46, grupos: ["comida"] },
  8: { n: "Ervas", f: ["plantas", 7], tam: 58, grupos: ["fibra"] },
  9: { n: "Juncos", f: ["plantas", 8], tam: 66, grupos: ["fibra"] },
  10: { n: "Toco", f: ["plantas", 9], tam: 56, grupos: [] },
  11: { n: "Tronco caído", f: ["plantas", 10], tam: 74, grupos: [] },
  12: { n: "Capim", f: ["plantas", 11], tam: 54, grupos: ["fibra"] },
  13: { n: "Flores", f: ["plantas", 12], tam: 46, grupos: ["fibra"] },
  14: { n: "Samambaia", f: ["plantas", 13], tam: 56, grupos: ["fibra"] },
  15: { n: "Trigo selvagem", f: ["plantas", 14], tam: 58, grupos: ["comida"] },
  16: { n: "Repolho", f: ["plantas", 15], tam: 54, grupos: ["comida"] },
  17: { n: "Pedregulho", f: ["recursos", 0], tam: 88, bloq: true, grupos: ["pedra"] },
  18: { n: "Veio de ferro", f: ["recursos", 1], tam: 82, bloq: true, grupos: ["ferro"] },
  19: { n: "Veio de carvão", f: ["recursos", 2], tam: 82, bloq: true, grupos: ["carvao"] },
  20: { n: "Argila", f: ["recursos", 3], tam: 60, grupos: ["argila"] },
  21: { n: "Seixos", f: ["recursos", 4], tam: 40, grupos: ["pedra"] },
  22: { n: "Ossos", f: ["recursos", 5], tam: 44, grupos: [] },
  23: { n: "Galhos", f: ["extras", 0], tam: 58, grupos: ["galho"] },
  24: { n: "Carvalho ancestral", f: ["extras", 1], tam: 168, bloq: true, grupos: ["madeira"] },
};
export const GRUPOS = ["madeira", "comida", "pedra", "ferro", "carvao", "argila", "fibra", "galho"];
export const EH_COMIDA_SILVESTRE = new Set([4, 5, 7, 15, 16]);
