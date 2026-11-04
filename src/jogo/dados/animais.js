// ANIMAIS — comportamento: "passivo" (foge), "neutro" (só revida) ou "agressivo" (ataca quem chega perto).
// sprite: folha 4 colunas × 2 linhas (linha 0 = andar para a direita; linha 1 = ações). tam = largura desenhada (px).
export const ANIMAIS = {
  coelho: { esq: 28, nome: "Coelho", comp: "passivo", hp: 6, dano: 0, vel: 95, tam: 52, drops: { carne_crua: 1, couro: 1 }, dens: 0.22, bioma: [3, 4] },
  cervo: { esq: 22, nome: "Cervo", comp: "passivo", hp: 24, dano: 0, vel: 105, tam: 96, drops: { carne_crua: 3, couro: 2 }, dens: 0.12, bioma: [3, 4] },
  javali: { esq: 12, nome: "Javali", comp: "neutro", hp: 40, dano: 7, vel: 92, tam: 84, drops: { carne_crua: 4, couro: 1 }, dens: 0.09, bioma: [4, 3] },
  lobo: { esq: 20, nome: "Lobo", comp: "agressivo", hp: 32, dano: 6, vel: 118, tam: 86, drops: { carne_crua: 1, couro: 2 }, dens: 0.07, bioma: [4, 5] },
  urso: { esq: 8, nome: "Urso", comp: "neutro", hp: 95, dano: 16, vel: 85, tam: 120, drops: { carne_crua: 6, couro: 3 }, dens: 0.025, bioma: [4, 5] },
};
export const ESPECIES = Object.keys(ANIMAIS);
