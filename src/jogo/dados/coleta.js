// COLETA — o que cada elemento do mapa rende. hab = habilidade treinada, ferr = TIPO de ferramenta necessária ("lenhador"/"mineracao"; tier = qualidade mínima: 1 pedra, 2 ferro),
// min = nível mínimo da habilidade para conseguir (árvores e minérios mais duros), base = segundos no nível 1,
// vira = o que sobra no lugar (0 = nada), dias = quanto tempo até voltar ao normal.
export const COLETA = {
  1: { hab: "lenhador", ferr: "lenhador", tier: 1, min: 3, base: 7, drops: { madeira: [3, 5], galho: [1, 2] }, vira: 10, dias: 5 },
  2: { hab: "lenhador", ferr: "lenhador", tier: 1, min: 8, base: 8, drops: { madeira: [4, 6], galho: [1, 2] }, vira: 10, dias: 5 },
  3: { hab: "lenhador", ferr: "lenhador", tier: 1, min: 1, base: 5, drops: { madeira: [2, 3], galho: [1, 3] }, vira: 10, dias: 5 },
  24: { hab: "lenhador", ferr: "lenhador", tier: 2, min: 25, base: 16, drops: { madeira: [8, 12], galho: [2, 4] }, vira: 10, dias: 8 },   // carvalho ancestral: só com machado de ferro e nível alto
  10: { hab: "lenhador", ferr: "lenhador", tier: 1, min: 1, base: 3, drops: { madeira: [1, 1] }, vira: 0, dias: 0, semRebrota: true },
  23: { hab: "coleta", base: 2, drops: { galho: [2, 4] }, vira: 0, dias: 2 },   // toco: remover rende +1 madeira e a árvore NÃO volta; deixar = ela rebrota em 5 dias
  4: { hab: "coleta", base: 4, drops: { maca: [2, 4] }, vira: 1, dias: 2 },
  5: { hab: "coleta", base: 3, drops: { bagas: [2, 4] }, vira: 6, dias: 2 },
  7: { hab: "coleta", base: 3, drops: { cogumelo: [1, 3] }, vira: 0, dias: 3 },
  8: { hab: "coleta", base: 2.5, drops: { fibra: [1, 2] }, vira: 0, dias: 2 },
  9: { hab: "coleta", base: 2.5, drops: { fibra: [1, 3] }, vira: 0, dias: 2 },
  12: { hab: "coleta", base: 2, drops: { fibra: [1, 2] }, vira: 0, dias: 2 },
  15: { hab: "coleta", base: 3, drops: { trigo: [1, 2] }, vira: 0, dias: 3 },
  16: { hab: "coleta", base: 3, drops: { repolho: [1, 2] }, vira: 0, dias: 3 },
  17: { hab: "mineracao", ferr: "mineracao", tier: 1, min: 1, base: 8, drops: { pedra: [2, 4] }, vira: 0, dias: 5 },
  18: { hab: "mineracao", ferr: "mineracao", tier: 1, min: 12, base: 12, drops: { minerio_ferro: [1, 3] }, vira: 0, dias: 6 },
  19: { hab: "mineracao", ferr: "mineracao", tier: 1, min: 6, base: 10, drops: { carvao: [1, 3] }, vira: 0, dias: 6 },
  21: { hab: "coleta", base: 3, drops: { pedra: [1, 2] }, vira: 0, dias: 4 },
  20: { hab: "coleta", base: 5, drops: { argila: [2, 4] }, vira: 0, dias: 3 },
};
