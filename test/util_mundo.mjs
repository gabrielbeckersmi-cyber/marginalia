// Utilitários só dos testes.
import { C } from "../src/jogo/config.js";
/** Procura o elemento `f` mais perto do porto (opcionalmente diferente de `exceto`). */
export function procurarFeat(M, f, exceto = null) {
  for (let r = 14; r < 800; r += 2) for (let k = 0; k < 60; k++) {
    const x = M.porto.tx + Math.round(Math.cos(k * 0.1047) * r), y = M.porto.ty - Math.abs(Math.round(Math.sin(k * 0.1047) * r));
    if (x > 2 && y > 2 && x < M.N - 2 && y < M.N - 2 && M.feat[y * M.N + x] === f && !(exceto && exceto.x === x && exceto.y === y)) return { x, y };
  }
  return null;
}
