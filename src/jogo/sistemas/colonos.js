// COLONOS — criação de pessoas (atributos 1–100), chegada dos navios no único porto, bandidos.
import { C } from "../config.js";
import { HAB, IDX, PROFISSOES } from "../dados/habilidades.js";
import { NOMES_M, NOMES_F, SOBRENOMES } from "../dados/nomes.js";
import { NUM_BANDIDOS, SPRITES_FEM, SPRITES_MASC, ehFeminino } from "../dados/arte.js";
import { entre, inteiro, escolher } from "../rng.js";
import { caminhavel } from "../mundo.js";

const KIT = {
  lenhador: { machado_pedra: 1 }, minerador: { picareta_pedra: 1 }, cacador: { arco: 1 }, pescador: { vara_pesca: 1 },
  construtor: { martelo: 1, machado_pedra: 1, madeira: 20, pedra: 10 }, ferreiro: { martelo: 1, picareta_pedra: 1, pedra: 8 },
  carpinteiro: { machado_pedra: 1, madeira: 10 }, cozinheiro: { bagas: 3 }, comerciante: { }, agricultor: { trigo: 4 }, coletor: { },
};
export function sorteioProfissao(hab) {
  let melhor = "coletor", m = -1;
  for (const [p, h] of Object.entries(PROFISSOES)) { const v = hab[IDX[h]] + Math.random() * 6; if (v > m) { m = v; melhor = p; } }
  return melhor;
}
export function criarPessoa(J, { x, y, bandido = false, jogador = false, sprite, nome, fem } = {}) {
  const r = J.rng, id = jogador ? 0 : J.proxId++;
  const f = sprite ? ehFeminino(sprite) : (fem ?? r() < 0.5);
  const e = {
    id, nome: nome || `${escolher(r, f ? NOMES_F : NOMES_M)} ${escolher(r, SOBRENOMES)}`, fem: f,
    sprite: sprite || (bandido ? "bandido_" + inteiro(r, 1, NUM_BANDIDOS) : "pessoa_" + escolher(r, f ? SPRITES_FEM : SPRITES_MASC)),
    x, y, dir: 0, anim: 0, mov: false,
    hab: HAB.map(() => 1), ouro: inteiro(r, C.OURO[0], C.OURO[1]), inv: {}, cantil: 3,
    fome: entre(r, 0, 10), sede: entre(r, 0, 14), cans: entre(r, 0, 25), hp: 100, hpMax: 100, stam: 100, dormindo: false,
    prof: "sem", bandido, casa: null, cidade: null, negocios: [], emprego: null, trabalhouHoje: false,
    estado: "chegar", alvo: null, t: 0, tCheg: J.t, paciencia: entre(r, 120, 420), fundador: r() < 0.3, ultimo: J.t,
  };
  if (jogador) { e.hab = HAB.map(() => 1); }
  else {
    for (let i = 0; i < HAB.length; i++) e.hab[i] = Math.round(1 + Math.pow(r(), 2.2) * 24);
    const ids = HAB.map((_, i) => i).sort(() => r() - 0.5);
    e.hab[ids[0]] = inteiro(r, 40, 95); e.hab[ids[1]] = inteiro(r, 20, 60); e.hab[ids[2]] = inteiro(r, 15, 45);
    e.hab[IDX.construcao] = Math.max(e.hab[IDX.construcao], inteiro(r, 3, 18));
    if (bandido) { e.hab[IDX.combate] = inteiro(r, 40, 90); e.prof = "bandido"; e.ouro = inteiro(r, 100, 500); e.inv.espada_ferro = 1; e.estado = "tocaia"; }
    else e.prof = sorteioProfissao(e.hab);
    for (const [k, v] of Object.entries(KIT[e.prof] || {})) e.inv[k] = v;
    if (!bandido) { e.inv.madeira = (e.inv.madeira || 0) + 14; e.inv.fibra = 10; e.inv.galho = 4; }
    e.inv.bagas = (e.inv.bagas || 0) + inteiro(r, 2, 5);
  }
  return e;
}
export function kitJogador(e) { Object.assign(e.inv, { martelo: 1, vara_pesca: 1, arco: 1, madeira: 14, fibra: 10, couro: 2, bagas: 4, galho: 4 }); e.equip = { mao: "arco", escudo: null }; }

// ── Navios ──
export const posNavioAtracado = (J) => ({ x: (J.M.porto.ax + 0.5) * C.TILE, y: (J.M.porto.ay + 4) * C.TILE });
export function agendarNavio(J, n, inicial = false) {
  const a = posNavioAtracado(J);
  J.navios.push({ x: a.x, y: a.y + (inicial ? 1900 : 3200), estado: "chegando", n, t: 0, desembarcados: 0, inicial });
}
export function atualizarNavios(J, dt) {
  J.proxNavio -= dt;
  if (J.proxNavio <= 0) {
    J.proxNavio += C.NAVIO.intervalo;
    const vagas = C.MAX_COLONOS - J.npcs.length - J.navios.reduce((s, x) => s + (x.n - x.desembarcados), 0);
    if (vagas > 0) agendarNavio(J, Math.min(vagas, inteiro(J.rng, C.NAVIO.min, C.NAVIO.max)));
  }
  const dest = posNavioAtracado(J);
  for (const s of J.navios) {
    s.t += dt;
    if (s.estado === "chegando") { s.y = Math.max(dest.y, s.y - 260 * dt); if (s.y <= dest.y) { s.estado = "atracado"; s.t = 0; J.avisos.push({ tipo: "navio", texto: s.inicial ? "O navio atracou no porto" : `Um navio chegou com ${s.n} colonos`, x: s.x, y: s.y }); } }
    else if (s.estado === "atracado") {
      if (s.inicial && s.t < 3) continue;
      while (s.desembarcados < s.n && s.t > 0.35 * (s.desembarcados + 1)) desembarcar(J, s);
      if (s.desembarcados >= s.n && s.t > 0.35 * s.n + 4) s.estado = "partindo";
    } else { s.y += 220 * dt; if (s.y > dest.y + 2600) s.morto = true; }
  }
  J.navios = J.navios.filter((s) => !s.morto);
}
function desembarcar(J, s) {
  const p = J.M.porto, r = J.rng; s.desembarcados++;
  if (J.npcs.length >= C.MAX_COLONOS) return;
  let tx = p.tx, ty = p.ty - 1;
  for (let k = 0; k < 30; k++) { const x = p.tx + inteiro(r, -4, 4), y = p.ty - inteiro(r, 1, 5); if (caminhavel(J.M, x, y)) { tx = x; ty = y; break; } }
  const bandido = J.npcs.length >= C.BANDIDOS_APARTIR && r() < C.CHANCE_BANDIDO;
  const e = criarPessoa(J, { x: (tx + 0.5) * C.TILE, y: (ty + 0.5) * C.TILE, bandido });
  J.npcs.push(e); J.porId.set(e.id, e);
}
