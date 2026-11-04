// ESTADO DO JOGO (J) — tudo que é a partida: mundo, jogador, colonos, construções, economia. Código puro (roda também nos testes).
// atualizarJogo(J, dt) é o único "relógio": chame uma vez por passo de 1/60 s.
import { C } from "./config.js";
import { mulberry32 } from "./rng.js";
import { gerarMundo, setFeat, processarRebrotas, caminhavel } from "./mundo.js";
import { criarPessoa, kitJogador, agendarNavio, atualizarNavios } from "./sistemas/colonos.js";
import { novaEconomia, fimDoDia } from "./sistemas/economia.js";
import * as nec from "./sistemas/necessidades.js";
import { atualizarNPCs, matar } from "./sistemas/ia.js";
import { atualizarAnimais, reporAnimais } from "./sistemas/animais.js";
import { atualizarHostis } from "./sistemas/combate.js";
import { fatorDefesa } from "./sistemas/equipamento.js";
import { atualizarCorpos } from "./sistemas/corpos.js";
import { atualizarTurno, cancelarTurno } from "./sistemas/turno.js";

export const VERSAO_PARTIDA = 2;

export function novoJogo(semente, { sprite = "pessoa_1", nome = "Viajante", fem = false } = {}) {
  const M = gerarMundo(semente);
  const J = base(M, semente);
  const p = M.porto;
  J.jogador = criarPessoa(J, { x: (p.ax + 0.5) * C.TILE, y: (p.ay + 4) * C.TILE, jogador: true, sprite, nome, fem });
  J.jogador.bandido = false; kitJogador(J.jogador); J.jogador.cantil = 3;
  J.jogador.fome = 5; J.jogador.sede = 8; J.jogador.cans = 5; J.jogador.ouro = Math.round(C.OURO[0] + J.rng() * (C.OURO[1] - C.OURO[0]));
  J.t = C.HORA_INICIAL * 60; J.dia = 1;
  J.proxNavio = C.NAVIO.intervalo;
  agendarNavio(J, C.NAVIO.iniciais, true);
  J.chegando = true;       // abertura: o jogador está no navio até ele atracar
  return J;
}
function base(M, semente) {
  const J = {
    M, semente, rng: mulberry32(semente ^ Date.now()), t: 0, dia: 1, hora: 7, proxId: 1, proxIdC: 1,
    jogador: null, npcs: [], porId: new Map(), construcoes: [], constrPorId: new Map(), cidades: [], navios: [], animais: [], chunksAtivos: new Set(),
    eco: novaEconomia(), proxNavio: C.NAVIO.intervalo, avisos: [], efeitos: [], corpos: [], turno: null, mortes: 0, stats: { dias: 0 },
  };
  J.porId.set(0, null);
  J.matarNPC = (e, causa) => matar(J, e, causa);
  J.danoJogador = (d, quem) => {
    const p = J.jogador; p.hp -= d * fatorDefesa(p); p.dormindo = false; p.tDano = 0.3;
    if (J.turno) cancelarTurno(J, "Você foi atacado: o turno foi interrompido");
    if (p.hp <= 0 && !J.jogadorMorreu) { J.jogadorMorreu = true; J.avisos.push({ tipo: "morte-jogador", texto: `Você foi derrotado por ${quem}` }); }
  };
  return J;
}
export const horaDoDia = (J) => (J.t % C.DIA_SEG) / 60;

export function atualizarJogo(J, dt) {
  const p = J.jogador, esc = p.dormindo && !J.chegando ? C.ESCALA_SONO : 1, d = dt * esc;
  J.t += d; J.hora = horaDoDia(J);
  const dia = Math.floor(J.t / C.DIA_SEG) + 1;
  if (dia > J.dia) { J.dia = dia; J.stats.dias++; fimDoJogoDia(J); }
  if (nec.atualizar(p, d) && !J.jogadorMorreu) { J.jogadorMorreu = true; J.avisos.push({ tipo: "morte-jogador", texto: "Você não resistiu à fome ou à sede" }); }
  atualizarNavios(J, d);
  if (J.chegando) {            // abertura: o jogador viaja no convés do navio inicial e desembarca no porto quando ele atraca
    const s = J.navios.find((x) => x.inicial);
    if (s && s.estado === "chegando") { p.x = s.x; p.y = s.y + 50; p.dir = 3; p.mov = false; }
    else { J.chegando = false; desembarcarJogador(J); }
  }
  atualizarNPCs(J, d); atualizarAnimais(J, d); atualizarHostis(J, d); atualizarCorpos(J); atualizarTurno(J, d);
  for (const f of J.efeitos) f.t -= dt; J.efeitos = J.efeitos.filter((f) => f.t > 0);
  if (J.avisos.length > 40) J.avisos.splice(0, J.avisos.length - 40);
}
/** Põe o jogador em terra firme perto do porto. */
function desembarcarJogador(J) {
  const p = J.jogador, M = J.M, pt = M.porto;
  for (let k = 0; k < 80; k++) { const x = pt.tx + Math.floor(J.rng() * 5) - 2, y = pt.ty - 1 - Math.floor(J.rng() * 3); if (caminhavel(M, x, y)) { p.x = (x + 0.5) * C.TILE; p.y = (y + 0.5) * C.TILE; p.dir = 3; return; } }
  p.x = (pt.tx + 0.5) * C.TILE; p.y = (pt.ty - 1.5) * C.TILE;
}
function fimDoJogoDia(J) { fimDoDia(J); processarRebrotas(J.M, J.t); reporAnimais(J); }

/** Volta à vida no porto, mais pobre. */
export function renascer(J) {
  const p = J.jogador, M = J.M;
  J.turno = null; p.hp = 60; p.fome = Math.min(p.fome, 45); p.sede = Math.min(p.sede, 45); p.cans = Math.min(p.cans, 50); p.dormindo = false;
  p.ouro = Math.floor(p.ouro * 0.75);
  p.x = (M.porto.tx + 0.5) * C.TILE; p.y = (M.porto.ty - 2 + 0.5) * C.TILE; J.jogadorMorreu = false;
}

// ── Save ──
const limparNPC = (e) => ({ ...e, tarefa: null, desvio: null, alvoPos: null, mov: false });
export function serializar(J) {
  return {
    v: VERSAO_PARTIDA, semente: J.semente, t: J.t, dia: J.dia, proxId: J.proxId, proxIdC: J.proxIdC, proxNavio: J.proxNavio, mortes: J.mortes, stats: J.stats,
    jogador: { ...J.jogador, tarefa: null }, npcs: J.npcs.map(limparNPC), construcoes: J.construcoes, cidades: J.cidades, navios: J.navios.filter((s) => !s.inicial),
    eco: J.eco, chegando: false, corpos: J.corpos, turno: J.turno,
    diff: [...J.M.diff], regrow: [...J.M.regrow], animais: Array.from(J.M.animais),
  };
}
export function restaurar(S) {
  const M = gerarMundo(S.semente), J = base(M, S.semente);
  Object.assign(J, { t: S.t, dia: S.dia, proxId: S.proxId, proxIdC: S.proxIdC, proxNavio: S.proxNavio, mortes: S.mortes || 0, stats: S.stats || { dias: 0 }, eco: S.eco, cidades: S.cidades || [], navios: S.navios || [], chegando: false, corpos: S.corpos || [], turno: S.turno || null });
  for (const [i, v] of S.diff) { const x = i % M.N; setFeat(M, x, (i - x) / M.N, v); }
  for (const [i, v] of S.regrow) M.regrow.set(i, v);
  M.animais.set(S.animais);
  J.jogador = S.jogador; J.jogador.tarefa = null; J.jogador.equip = J.jogador.equip || { mao: null, escudo: null };
  J.npcs = S.npcs; for (const e of J.npcs) { J.porId.set(e.id, e); e.ultimo = J.t; }
  J.construcoes = S.construcoes;
  for (const b of J.construcoes) { J.constrPorId.set(b.id, b); for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) M.occ[y * M.N + x] = b.id; }
  J.hora = horaDoDia(J);
  return J;
}
