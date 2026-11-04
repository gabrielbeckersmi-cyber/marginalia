// CONFIGURAÇÃO DE BALANCEAMENTO — mexa aqui para ajustar o ritmo do jogo (nada de números soltos pelo código).
export const C = {
  TILE: 48,              // pixels por tile
  N: 1800,               // mundo N×N tiles (ilha ≈ 1350 tiles de diâmetro ÷ 2 tiles/s ≈ 11 min para atravessar)
  DIA_SEG: 1440,         // 1 dia de jogo = 24 min reais (1 hora = 60 s)
  HORA_INICIAL: 7,
  VEL_JOGADOR: 96,       // px/s
  VEL_NPC: 84,
  VEL_RIO: 0.5,          // multiplicador ao atravessar vau de rio
  ALCANCE: 78,           // alcance de interação (px)
  NAVIO: { intervalo: 600, min: 10, max: 30, iniciais: 19 },
  MAX_COLONOS: 700,
  BANDIDOS_APARTIR: 70, CHANCE_BANDIDO: 0.12,
  OURO: [500, 2000],
  INJECAO: [50, 200],    // "Benefício da Coroa" por dia para quem tem emprego/negócio
  FOME_HORAS: 72, SEDE_HORAS: 32, CANSACO_HORAS: 20, SONO_HORAS: 6,
  ESCALA_SONO: 6,        // dormindo o tempo passa 6× mais rápido
  XP_K: 0.5, XP_EXP: 0.9, VEL_HAB: 0.06,
  ENSINO: { fator: 0.04, custoBase: 15, custoNivel: 6 },
  ESPACO_CONSTR: 3,      // tiles livres entre construções (cabem 4 NPCs)
  LOD_PERTO: 1700,       // px: NPCs mais perto simulam em detalhe
  LOD_INTERVALO: 2,      // s entre atualizações de NPCs distantes
  MARGEM_MERCADO: 0.15,
  REBROTA_DIAS: 3,
  ARVORE_CEL: 3,         // árvores ficam numa grade de células 3×3 tiles (no máx. 1 por célula, posição sorteada): vão de 2 a 4 tiles entre troncos
  CORRIDA: 1.7,           // multiplicador de velocidade ao segurar Shift
  STAMINA: { max: 100, corrida: 16, regen: 9, regenAndando: 3, minimoCorrer: 8, retomar: 25 },   // por segundo; custo por segundo de cada tipo de trabalho em STAMINA_TRAB
  STAMINA_TRAB: { lenhador: 5, mineracao: 6, coleta: 1.6, construcao: 2.5, pesca: 1 },
  ALCANCE_ARCO: 9,        // tiles
  CONSTR_RAPIDEZ: 1.8,    // multiplicador da velocidade de obra (jogador e colonos)
  ARVORE_REBROTA_DIAS: 5, // tronco cortado: se o toco ficar, a árvore volta depois disso
};
