// Testes da lógica do jogo (sem canvas): mundo, habilidades, economia, construção, necessidades, simulação e save.
//   npm run teste
import test from "node:test";
import assert from "node:assert/strict";
import { C } from "../src/jogo/config.js";
import { novoJogo, atualizarJogo, serializar, restaurar } from "../src/jogo/estado.js";
import { gerarMundo, T, caminhavel, featEm, setFeat } from "../src/jogo/mundo.js";
import * as hb from "../src/jogo/sistemas/habilidades.js";
import * as eco from "../src/jogo/sistemas/economia.js";
import * as nec from "../src/jogo/sistemas/necessidades.js";
import * as con from "../src/jogo/sistemas/construcao.js";
import * as neg from "../src/jogo/sistemas/negocios.js";
import * as inv from "../src/jogo/sistemas/inventario.js";
import { criarPessoa, agendarNavio } from "../src/jogo/sistemas/colonos.js";
import { atualizarJogador, alvoEm, colocarObra } from "../src/jogo/interacao.js";
import { CONSTR } from "../src/jogo/dados/construcoes.js";
import { HAB, IDX } from "../src/jogo/dados/habilidades.js";
import { FEAT } from "../src/jogo/dados/arte.js";
import { golpeJogador } from "../src/jogo/sistemas/combate.js";
import * as corpos from "../src/jogo/sistemas/corpos.js";
import * as equip from "../src/jogo/sistemas/equipamento.js";
import * as turno from "../src/jogo/sistemas/turno.js";
import { procurarFeat } from "./util_mundo.mjs";

const SEM = 777;
let J0;
const novo = () => novoJogo(SEM, { sprite: "pessoa_1", nome: "Teste" });
const passos = (J, seg, aoPasso) => { const n = Math.round(seg * 60); for (let i = 0; i < n; i++) { if (aoPasso) aoPasso(J); atualizarJogo(J, 1 / 60); } };
const manter = (J) => { const p = J.jogador; p.fome = 0; p.sede = 0; p.cans = 0; p.hp = 100; };

test("mundo: mesma semente → mesmo mapa; ilha grande (10–15 min para atravessar); porto em terra", () => {
  const a = gerarMundo(SEM), b = gerarMundo(SEM);
  assert.deepEqual(a.terr.slice(0, 5000), b.terr.slice(0, 5000)); assert.deepEqual(a.feat.slice(900000, 905000), b.feat.slice(900000, 905000));
  let terra = 0, minx = 1e9, maxx = 0, rio = 0; for (let y = 0; y < a.N; y++) for (let x = 0; x < a.N; x++) { const t = a.terr[y * a.N + x]; if (t !== T.MAR) { terra++; if (x < minx) minx = x; if (x > maxx) maxx = x; } if (t === T.RIO || t === T.LAGO) rio++; }
  const largura = maxx - minx, minutos = (largura * C.TILE) / C.VEL_JOGADOR / 60;
  assert.ok(minutos >= 10 && minutos <= 16, `atravessar a ilha leva ~${minutos.toFixed(1)} min`);
  assert.ok(terra > 600000 && rio > 3000, "terra e água doce suficientes");
  assert.ok(caminhavel(a, a.porto.tx, a.porto.ty), "o porto fica em terra caminhável");
});

test("começo: jogador chega de navio com 19 colonos, atributos 1, ouro 500–2000", () => {
  J0 = novo(); const p = J0.jogador;
  assert.ok(p.hab.every((v) => v === 1) && p.hab.length === HAB.length, "todos os atributos começam em 1");
  assert.ok(p.ouro >= 500 && p.ouro <= 2000); assert.equal(J0.chegando, true);
  passos(J0, 40, manter);
  assert.equal(J0.chegando, false, "o navio atracou e o jogador desembarcou"); assert.equal(J0.npcs.length, 19);
  assert.ok(caminhavel(J0.M, Math.floor(p.x / C.TILE), Math.floor(p.y / C.TILE)), "jogador em terra firme");
  for (const e of J0.npcs) { assert.ok(e.ouro >= 500 && e.ouro <= 2000, "ouro inicial do colono"); assert.ok(e.hab.every((v) => v >= 1 && v <= 100), "atributos 1–100"); assert.ok(Object.keys(e.inv).length > 0, "kit da profissão"); }
});

test("habilidades: sobe rápido no começo e devagar depois; velocidade cresce; ensino proporcional à diferença", () => {
  const e = { hab: HAB.map(() => 1) };
  let n1 = 0; while (hb.nivel(hb.hab(e, "coleta")) < 2) { hb.ganhar(e, "coleta"); n1++; }
  let n2 = 0; while (hb.nivel(hb.hab(e, "coleta")) < 20) { hb.ganhar(e, "coleta"); n2++; }
  let n3 = 0; while (hb.nivel(hb.hab(e, "coleta")) < 21) { hb.ganhar(e, "coleta"); n3++; }
  assert.ok(n3 > n1 * 5, `1→2 em ${n1} ações, 20→21 em ${n3}`);
  assert.ok(hb.velocidade(50) > hb.velocidade(1) * 3 && hb.velocidade(100) <= 8);
  // exemplo do pedido: nível 10 com 30% aprendendo com mestre nível 50 → nível 11 com ~89% (ganho +1,59)
  const J = { dia: 1, eco: { infl: 1 } }, ap = { id: 0, ouro: 9999, hab: HAB.map(() => 1), aulas: {} }, mestre = { id: 5, ouro: 0, hab: HAB.map(() => 1) };
  ap.hab[IDX.ferraria] = 10.3; mestre.hab[IDX.ferraria] = 50;
  const r = hb.ensinar(J, ap, mestre, "ferraria"); assert.ok(r.ok);
  const v = hb.hab(ap, "ferraria"); assert.equal(hb.nivel(v), 11); assert.ok(Math.abs(hb.pct(v) - 0.89) < 0.03, `pct=${hb.pct(v).toFixed(2)}`);
  const r2 = hb.ensinar(J, ap, mestre, "ferraria"); assert.ok(r2.ok, "sem limite de aulas por dia: dá para treinar de novo na hora"); assert.ok(hb.hab(ap, "ferraria") > v);
  const pequeno = hb.ofertaEnsino(J, { id: 0, hab: HAB.map(() => 30), aulas: {} }, { id: 5, hab: HAB.map(() => 40) }, "coleta");
  assert.ok(pequeno.ganho < r.ganho, "diferença menor → ganho menor");
});

test("necessidades: 32 h sem água e 72 h sem comida; rio 100%, cantil 30%", () => {
  const e = { fome: 0, sede: 0, cans: 0, hp: 100, hpMax: 100, inv: { pao: 1, bagas: 1 }, cantil: 3 };
  let t = 0; while (e.sede < 100 && t < 1e6) { e.cans = 0; nec.atualizar(e, 1); t++; } assert.ok(Math.abs(t / 60 - 32) < 0.5, `sede encheu em ${(t / 60).toFixed(1)} h de jogo`);
  const f = { fome: 0, sede: 0, cans: 0, hp: 100, hpMax: 100, inv: {} }; t = 0; while (f.fome < 100) { f.sede = 0; f.cans = 0; nec.atualizar(f, 1); t++; } assert.ok(Math.abs(t / 60 - 72) < 1, `fome encheu em ${(t / 60).toFixed(1)} h de jogo`);
  e.sede = 100; e.hp = 100; nec.beberRio(e); assert.equal(e.sede, 0); assert.equal(e.cantil, 3);
  e.sede = 80; nec.beberCantil(e); assert.equal(e.sede, 50); assert.equal(e.cantil, 2);
  const g = { fome: 100, sede: 0, cans: 0, hp: 100, hpMax: 100, inv: {} }; nec.atualizar(g, 10); assert.ok(g.hp < 100, "fome em 100 tira vida");
  const bagas = { fome: 50, inv: { bagas: 1, pao: 1 } }; nec.comer(bagas, "bagas"); assert.ok(bagas.fome >= 44, "comida silvestre sacia pouco");
});

test("construção: distância mínima de 3 tiles, árvores bloqueiam, comida embaixo some, obra consome materiais gradualmente", () => {
  const J = novo(); passos(J, 40, manter); const M = J.M, p = J.jogador;
  // procura clareira
  let tx = 0, ty = 0; achou: for (let y = M.porto.ty - 140; y < M.porto.ty - 25; y++) for (let x = M.porto.tx - 80; x < M.porto.tx + 80; x++) { let ok = true; for (let dy = 0; dy < 5 && ok; dy++) for (let dx = 0; dx < 13; dx++) if (!caminhavel(M, x + dx, y + dy) || M.feat[(y + dy) * M.N + x + dx]) { ok = false; break; } if (ok) { tx = x; ty = y; break achou; } }
  assert.ok(tx > 0, "achou clareira");
  const poco = CONSTR.poco; assert.equal(con.podeConstruir(J, "poco", tx, ty).ok, true);
  setFeat(M, tx + 1, ty + 1, 16); assert.ok(FEAT[16] && !FEAT[16].bloq); // repolho: comida, não bloqueia
  const b = con.iniciarObra(J, p, "poco", tx, ty); assert.equal(featEm(M, tx + 1, ty + 1), 0, "construir sobre comida remove a comida");
  assert.equal(con.podeConstruir(J, "poco", tx + poco.w + 2, ty).ok, false, "2 tiles de folga é pouco");
  assert.equal(con.podeConstruir(J, "poco", tx + poco.w + C.ESPACO_CONSTR, ty).ok, true, "3 tiles de folga basta (cabem 4 colonos)");
  setFeat(M, tx + 10, ty, 1); assert.equal(con.podeConstruir(J, "poco", tx + 10, ty).ok, false, "árvore impede construir");
  assert.equal(con.podeConstruir(J, "poco", tx + 1, ty + 1).ok, false, "sobreposição");
  p.inv = { pedra: 8, madeira: 4 }; let prev = 0;
  for (let i = 0; i < 2000 && b.prog < 1; i++) { con.trabalharObra(J, p, b, 1 / 20); if (b.prog > 0.4 && prev === 0) { prev = 1; const gasto = (b.cons.pedra || 0), esperado = Math.ceil(b.prog * 8); assert.ok(gasto <= esperado && gasto >= esperado - 1, `consumo proporcional (${gasto}/${esperado})`); } }
  assert.equal(b.prog, 1); assert.equal(J.cidades.length, 1, "o primeiro poço funda uma cidade"); assert.equal(inv.qtd(p, "pedra"), 0);
  const r = con.requisitos(J, p, "ferraria"); assert.ok(r.length >= 1, "ferraria exige nível de construção e de ferraria");
});

test("economia: injeção diária 50–200 só para quem tem emprego/negócio; inflação encolhe a injeção; preços seguem oferta/demanda", () => {
  const J = novo(); passos(J, 40, manter);
  const emp = criarPessoa(J, { x: 0, y: 0 }), sem = criarPessoa(J, { x: 0, y: 0 }); emp.ouro = sem.ouro = 1000; emp.emprego = 1; J.npcs.push(emp, sem); J.porId.set(emp.id, emp); J.porId.set(sem.id, sem);
  for (const e of J.npcs) if (e !== emp && e !== sem) { e.emprego = null; e.negocios = []; } J.jogador.emprego = null; J.jogador.negocios = [];
  J.eco.infl = 1; const antes = emp.ouro; eco.fimDoDia(J);
  const ganho = emp.ouro - antes; assert.ok(ganho >= 40 && ganho <= 300, `empregado recebeu ${ganho}`); assert.ok(sem.ouro <= 1000, "desempregado não recebe");
  // inflação alta → injeção menor
  let somaN = 0, somaI = 0; for (let i = 0; i < 40; i++) { emp.ouro = 1000; J.eco.infl = 1; eco.fimDoDia(J); somaN += emp.ouro - 1000; emp.ouro = 1000; J.eco.infl = 3; eco.fimDoDia(J); somaI += emp.ouro - 1000; }
  assert.ok(somaI < somaN * 0.7, `injeção com inflação 3× (${somaI}) bem menor que normal (${somaN})`);
  // demanda alta sem oferta → preço sobe; oferta alta sem demanda → preço cai
  const J2 = novo(); const p0 = eco.preco(J2, "pao");
  for (let d = 0; d < 6; d++) { eco.registrarDemanda(J2, "pao", 60); eco.fimDoDia(J2); } const alto = eco.preco(J2, "pao");
  for (let d = 0; d < 10; d++) { eco.registrarOferta(J2, "pao", 200); eco.fimDoDia(J2); } const baixo = eco.preco(J2, "pao");
  assert.ok(alto > p0 && baixo < alto, `pão: ${p0} → ${alto} → ${baixo}`);
});

test("mercado: compra/venda limitadas ao caixa e ao estoque; margem do dono; negócio comum só vende", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador, M = J.M;
  const dono = criarPessoa(J, { x: 0, y: 0 }); J.npcs.push(dono); J.porId.set(dono.id, dono);
  const merc = { id: 900, tipo: "mercado", tx: 0, ty: 0, w: 5, h: 4, dono: dono.id, prog: 1, cons: {}, estoque: {}, caixa: 40, margem: 0.2, precos: {}, empregados: [] }; J.construcoes.push(merc); J.constrPorId.set(900, merc);
  p.inv = { madeira: 30 }; p.ouro = 100; J.eco.infl = 1;
  const ref = eco.preco(J, "madeira"), r = eco.venderAoMercado(J, p, merc, "madeira", 30);
  assert.ok(r.ok && r.qtd === Math.floor(40 / ref), "o mercado só compra até onde o caixa permite"); assert.ok(merc.caixa < ref);
  assert.equal(eco.venderAoMercado(J, p, merc, "madeira", 30).ok, false, "sem caixa não compra");
  assert.equal(eco.precoVenda(J, merc, "madeira"), Math.round(ref * 1.2), "revende com a margem do dono");
  merc.caixa = 500; const c = eco.comprar(J, p, merc, "madeira", 99); assert.ok(c.ok && c.qtd === r.qtd, "só vende o que tem em estoque");
  const ferr = { id: 901, tipo: "serraria", tx: 0, ty: 0, w: 5, h: 4, dono: dono.id, prog: 1, cons: {}, estoque: { tabua: 3 }, caixa: 0, precos: {}, empregados: [] }; J.construcoes.push(ferr); J.constrPorId.set(901, ferr);
  p.inv = { tabua: 2 }; assert.equal(eco.venderAoMercado(J, p, ferr, "tabua", 2).ok, false, "negócio comum nunca compra");
  const antes = dono.ouro; p.ouro = 500; eco.comprar(J, p, ferr, "tabua", 1); assert.ok(dono.ouro > antes, "a venda do negócio vai para o dono");
});

test("negócios: produção exige nível e insumos, gera estoque, contratação", () => {
  const J = novo(); const p = J.jogador; p.inv = {}; const b = { id: 902, tipo: "serraria", tx: 0, ty: 0, w: 5, h: 4, dono: 0, prog: 1, cons: {}, estoque: {}, caixa: 0, precos: {}, empregados: [], vaga: null }; J.construcoes.push(b); J.constrPorId.set(902, b);
  const tabua = neg.acoesDe("serraria").find((a) => a.saida === "tabua"), arco = neg.acoesDe("serraria").find((a) => a.saida === "arco");
  assert.match(neg.checar(p, b, tabua), /Faltam insumos/); p.inv.madeira = 4; assert.equal(neg.checar(p, b, tabua), null);
  assert.match(neg.checar(p, b, arco), /nível/);
  let r; for (let i = 0; i < 4000; i++) { r = neg.avancar(J, p, b, tabua, 0.05); if (r.fim) break; } assert.ok(r.fim); assert.equal(b.estoque.tabua, 1);
  neg.anunciarVaga(b, 50); const npc = criarPessoa(J, { x: 0, y: 0 }); assert.ok(neg.contratar(J, b, npc)); assert.equal(npc.emprego, 902);
});

test("jogador: segurar o mouse em árvore coleta (com ferramenta, mais rápido com a habilidade); obra com mouse segurado", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador, M = J.M, TS = C.TILE;
  let a = null; for (let r = 0; r < 700 && !a; r++) for (let k = 0; k < 40 && !a; k++) { const x = M.porto.tx + Math.round(Math.cos(k) * r), y = M.porto.ty - 10 - Math.abs(Math.round(Math.sin(k) * r)); if (x > 0 && y > 0 && M.feat[y * M.N + x] === 1) a = { x, y }; }
  assert.ok(a, "achou carvalho"); for (const [ox, oy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (caminhavel(M, a.x + ox, a.y + oy)) { p.x = (a.x + ox + 0.5) * TS; p.y = (a.y + oy + 0.5) * TS; break; }
  const tempo = (nivelHab) => { p.hab[IDX.lenhador] = nivelHab; p.inv = { machado: 1 }; M.feat[a.y * M.N + a.x] = 1; let s = 0; const alvo = alvoEm(J, (a.x + 0.5) * TS, (a.y + 0.5) * TS); assert.equal(alvo.tipo, "feat"); while (!p.inv.madeira && s < 200) { atualizarJogador(J, { dir: { x: 0, y: 0 }, mundo: { x: 0, y: 0 }, segura: true, alvo }, 1 / 30); s += 1 / 30; } return s; };
  const lento = tempo(1), rapido = tempo(60); assert.ok(lento > 3 && rapido < lento * 0.45, `nível 1: ${lento.toFixed(1)}s · nível 60: ${rapido.toFixed(1)}s`);
  assert.equal(featEm(M, a.x, a.y), 10, "a árvore vira toco"); assert.ok(p.inv.madeira >= 3);
  p.inv = {}; M.feat[a.y * M.N + a.x] = 1; const sem = alvoEm(J, (a.x + 0.5) * TS, (a.y + 0.5) * TS); for (let i = 0; i < 90; i++) atualizarJogador(J, { dir: { x: 0, y: 0 }, mundo: { x: 0, y: 0 }, segura: true, alvo: sem }, 1 / 30); assert.ok(!p.inv.madeira, "sem machado não coleta árvore");
});

test("simulação de 25 min: colonos exploram, fundam cidades, chegam navios (10–30) a cada 10 min, pouca mortandade", { timeout: 120000 }, () => {
  const J = novo(); const t0 = Date.now(); let pior = 0; const hist = [];
  for (let i = 0; i < 25 * 60 * 60; i++) { if (i % 60 === 0) manter(J); const a = performance.now(); atualizarJogo(J, 1 / 60); pior = Math.max(pior, performance.now() - a); if (i % 3600 === 0) hist.push(J.npcs.length); }
  const chegou = J.npcs.length + J.mortes - 19;
  assert.ok(chegou >= 20 && chegou <= 60, `2 navios trouxeram ${chegou} colonos (esperado 20–60)`);
  assert.ok(J.mortes <= 7, `mortes: ${J.mortes}`); assert.ok(J.cidades.length >= 1, "ao menos uma cidade fundada"); assert.ok(J.construcoes.length >= 10);
  assert.ok(Number.isFinite(J.eco.infl) && J.eco.infl > 0.7 && J.eco.infl < 3.6, `inflação ${J.eco.infl.toFixed(2)}`);
  for (const e of J.npcs) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.ouro), "sem NaN");
  assert.ok(pior < 120, `pior passo ${pior.toFixed(0)} ms`); console.log(`    25 min simulados em ${Date.now() - t0} ms; colonos ${hist.join(" → ")}; inflação ${J.eco.infl.toFixed(2)}`);
});

test("bandidos só aparecem com 70+ colonos; população limitada a 700", () => {
  const J = novo(); passos(J, 40, manter); const antes = C.CHANCE_BANDIDO; C.CHANCE_BANDIDO = 1;
  try {
    for (let i = 0; i < 20; i++) { const e = criarPessoa(J, { x: 0, y: 0 }); J.npcs.push(e); J.porId.set(e.id, e); }
    J.navios = []; agendarNavio(J, 20); J.navios[0].y = 0; passos(J, 30, manter);
    const n1 = J.npcs.filter((e) => e.bandido).length; assert.equal(n1, 0, "abaixo de 70 não há bandidos");
    for (let i = 0; i < 60; i++) { const e = criarPessoa(J, { x: 0, y: 0 }); J.npcs.push(e); J.porId.set(e.id, e); }
    J.navios = []; agendarNavio(J, 15); J.navios[0].y = 0; passos(J, 30, manter);
    assert.ok(J.npcs.filter((e) => e.bandido).length >= 10, "com 70+ chegam bandidos");
  } finally { C.CHANCE_BANDIDO = antes; }
  assert.equal(C.MAX_COLONOS, 700);
});

test("save: serializar → JSON → restaurar mantém colonos, construções, mudanças do mapa e economia", () => {
  const J = novo(); passos(J, 6 * 60, manter);
  const S = JSON.parse(JSON.stringify(serializar(J))); const R = restaurar(S);
  assert.equal(R.npcs.length, J.npcs.length); assert.equal(R.construcoes.length, J.construcoes.length); assert.equal(R.cidades.length, J.cidades.length);
  assert.equal(R.jogador.ouro, J.jogador.ouro); assert.equal(R.M.diff.size, J.M.diff.size); assert.equal(R.eco.infl, J.eco.infl);
  for (const b of R.construcoes) assert.equal(R.M.occ[b.ty * R.M.N + b.tx], b.id, "ocupação do mapa restaurada");
  passos(R, 30, manter); assert.ok(R.t > J.t - 1, "a partida restaurada continua rodando");
  assert.ok(JSON.stringify(S).length < 1_000_000, `save pequeno (${(JSON.stringify(S).length / 1024).toFixed(0)} KB)`);
});


// ───────────── novidades ─────────────
test("mundo: árvores espaçadas (mín. 2 tiles livres entre troncos) e pedras em quantidade", () => {
  const M = novo().M, N = M.N; let arv = 0, pedras = 0, perto = 0, floresta = 0;
  for (let y = 40; y < N - 40; y++) for (let x = 40; x < N - 40; x++) {
    const f = M.feat[y * N + x]; if (f === 17 || f === 21) pedras++;
    if (f >= 1 && f <= 4) { arv++; if (M.terr[y * N + x] === T.FLORESTA) floresta++;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { if (!ox && !oy) continue; const g = M.feat[(y + oy) * N + x + ox]; if (g >= 1 && g <= 4) perto++; } }
  }
  assert.equal(perto, 0, "nenhuma árvore encostada em outra (nem na diagonal)"); assert.ok(arv > 20000 && floresta > 5000, `árvores ${arv}, em floresta ${floresta}`);
  assert.ok(pedras > 12000, `pedras (pedregulho + seixos): ${pedras}`);
});

test("toco: cortar árvore deixa toco; remover rende +1 madeira e a árvore NÃO volta; deixar = volta em 5 dias", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador, M = J.M, TS = C.TILE;
  const a = procurarFeat(M, 1); assert.ok(a, "achou carvalho");
  for (const [ox, oy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (caminhavel(M, a.x + ox, a.y + oy)) { p.x = (a.x + ox + 0.5) * TS; p.y = (a.y + oy + 0.5) * TS; break; }
  const serrar = (tx, ty) => { const alvo = alvoEm(J, (tx + 0.5) * TS, (ty + 0.5) * TS); let s = 0; while (s < 60) { atualizarJogador(J, { dir: { x: 0, y: 0 }, mundo: { x: 0, y: 0 }, segura: true, alvo }, 1 / 30); s += 1 / 30; if (featEm(M, tx, ty) !== alvo.f) break; } return alvo; };
  p.inv = { machado: 1 }; p.hab[IDX.lenhador] = 30;
  serrar(a.x, a.y); assert.equal(featEm(M, a.x, a.y), 10, "toco"); assert.ok(p.inv.madeira >= 3);
  assert.equal(M.regrow.get(a.y * M.N + a.x), J.t + 5 * C.DIA_SEG, "agendou a rebrota para 5 dias");
  const antes = p.inv.madeira; serrar(a.x, a.y);
  assert.equal(featEm(M, a.x, a.y), 0, "toco removido"); assert.equal(p.inv.madeira, antes + 1, "+1 madeira"); assert.ok(!M.regrow.has(a.y * M.N + a.x), "sem rebrota");
  for (let d = 0; d < 7; d++) { J.t += C.DIA_SEG; atualizarJogo(J, 0.01); } assert.equal(featEm(M, a.x, a.y), 0, "árvore removida não volta");
  // deixando o toco: volta depois de 5 dias
  const b = procurarFeat(M, 2) || procurarFeat(M, 1, a); setFeat(M, b.x, b.y, 10); M.regrow.set(b.y * M.N + b.x, J.t + 5 * C.DIA_SEG); const orig = M.feat0[b.y * M.N + b.x];
  for (let d = 0; d < 4; d++) { J.t += C.DIA_SEG; atualizarJogo(J, 0.01); } assert.equal(featEm(M, b.x, b.y), 10, "em 4 dias ainda é toco");
  for (let d = 0; d < 2; d++) { J.t += C.DIA_SEG; atualizarJogo(J, 0.01); } assert.equal(featEm(M, b.x, b.y), orig, "depois de 5 dias a árvore voltou");
});

test("mercado: pode ser construído sem habilidade de comércio", () => {
  const p = { hab: HAB.map(() => 1) }; p.hab[IDX.construcao] = 5; assert.ok(hb.atende(p, CONSTR.mercado.req)); p.hab[IDX.construcao] = 4; assert.equal(hb.atende(p, CONSTR.mercado.req), false);
});

test("equipamento: arma na mão define o dano; escudo equipado reduz dano; sem o item na mochila deixa de valer", () => {
  const J = novo(); const p = J.jogador; p.inv = { espada_ferro: 1, arco: 1, escudo: 1 };
  assert.ok(equip.equipar(p, "arco")); assert.equal(equip.danoDaMao(p), 8); assert.ok(equip.equipar(p, "espada_ferro")); assert.equal(equip.danoDaMao(p), 13);
  equip.desequipar(p, "mao"); assert.equal(equip.danoDaMao(p), 3, "punhos");
  assert.equal(equip.fatorDefesa(p), 1, "escudo na mochila mas não equipado: sem defesa"); equip.equipar(p, "escudo"); assert.equal(equip.fatorDefesa(p), 0.75);
  const hp = p.hp; J.danoJogador(10, "teste"); assert.ok(Math.abs((hp - p.hp) - 7.5) < 1e-9, "10 de dano viram 7,5 com escudo"); inv.tirar(p, "escudo", 1); assert.equal(equip.fatorDefesa(p), 1);
  assert.equal(equip.equipar(p, "pao"), false, "pão não é equipável");
});

test("tela vermelha de dano some sozinha (bug do lobo)", () => {
  const J = novo(); passos(J, 40, manter); J.danoJogador(5, "lobo"); assert.ok(J.jogador.tDano > 0); passos(J, 1, manter); assert.equal(J.jogador.tDano, 0);
});

test("combate: atacar um colono comum com o mouse — ele revida ou foge; ao morrer deixa corpo com o que carregava e dá para saquear", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador;
  const v = criarPessoa(J, { x: p.x + 40, y: p.y }); v.ouro = 777; v.inv = { pao: 3, bagas: 2 }; v.hp = 40; J.npcs.push(v); J.porId.set(v.id, v);
  equip.equipar(p, "arco"); const alvo = { tipo: "npc", ref: v }; J.rng = () => 0.01;   // rng fixo: sempre acerta
  golpeJogador(J, alvo); assert.ok(v.hp < 40, "levou dano"); assert.ok(v.revide, "reage ao ataque (lutar ou fugir)");
  let n = 0; while (!v.morto && n++ < 30) { p.cdGolpe = 0; golpeJogador(J, alvo); v.hp = Math.min(v.hp, 12); manter(J); }
  assert.ok(v.morto, "morreu"); assert.ok(!J.npcs.includes(v));
  const c = J.corpos.find((x) => x.nome === v.nome); assert.ok(c, "deixou corpo"); assert.equal(c.ouro, 777); assert.equal(c.inv.pao, 3);
  assert.equal(alvoEm(J, c.x, c.y - 10).tipo, "corpo", "o mouse enxerga o corpo");
  const ouro0 = p.ouro, pao0 = inv.qtd(p, "pao"); const r = corpos.pegarTudo(J, p, c);
  assert.equal(p.ouro, ouro0 + 777); assert.equal(inv.qtd(p, "pao"), pao0 + 3); assert.equal(r.sobrou, false); assert.equal(corpos.temLoot(c), false);
  passos(J, 22, manter); assert.ok(!J.corpos.includes(c), "corpo vazio some");
});

test("colono que morre de fome também deixa o que tinha; bandido derrotado não paga na hora (tem que saquear)", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador;
  const e = criarPessoa(J, { x: p.x + 500, y: p.y }); e.ouro = 321; e.inv = { madeira: 5 }; J.npcs.push(e); J.porId.set(e.id, e); J.matarNPC(e, "fome ou sede");
  const c = J.corpos.find((x) => x.nome === e.nome); assert.ok(c && c.ouro === 321 && c.inv.madeira === 5);
  const b = criarPessoa(J, { x: p.x + 40, y: p.y, bandido: true }); b.ouro = 250; b.hp = 1; J.npcs.push(b); J.porId.set(b.id, b); J.rng = () => 0.01;
  const ouro0 = p.ouro; golpeJogador(J, { tipo: "npc", ref: b }); assert.ok(b.morto); assert.equal(p.ouro, ouro0, "ouro do bandido fica no corpo"); assert.equal(J.corpos.find((x) => x.nome === b.nome).ouro, 250);
});

test("turno de trabalho: 8 h travado; cancelar antes de 6 h não paga; 6 h ou mais paga salário + Coroa (1× por dia)", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador, TS = C.TILE;
  // cria uma fazenda de outro dono (rico) onde o jogador é empregado
  const dono = criarPessoa(J, { x: 0, y: 0 }); dono.ouro = 5000; J.npcs.push(dono); J.porId.set(dono.id, dono);
  const b = con.iniciarObra(J, dono, "fazenda", Math.floor(p.x / TS) + 6, Math.floor(p.y / TS) - 12); b.prog = 1; dono.negocios = [b.id]; b.vaga = { salario: 100 };
  assert.ok(neg.contratar(J, b, p)); assert.equal(p.salario, 100);
  p.x = (b.tx + b.w / 2) * TS; p.y = (b.ty + b.h + 0.5) * TS; manter(J);
  assert.equal(turno.motivoNaoPodeTrabalhar(J, b), null); assert.ok(turno.iniciarTurno(J, b).ok); assert.ok(J.turno);
  // sem controle: andar não funciona
  const x0 = p.x, y0 = p.y; for (let i = 0; i < 60; i++) atualizarJogador(J, { dir: { x: 1, y: 0 }, mundo: { x: 0, y: 0 }, segura: false }, 1 / 60); assert.equal(p.x, x0); assert.equal(p.y, y0);
  // cancela com 3 h → sem pagamento
  let ouro = p.ouro; passos(J, 2 * 60, manter); assert.ok(J.turno && J.turno.t >= 119); turno.cancelarTurno(J, "teste"); assert.equal(J.turno, null); assert.equal(p.ouro, ouro, "menos de 6 h: nada");
  // turno de 6,5 h cancelado → paga salário do dono + Coroa
  assert.ok(turno.iniciarTurno(J, b).ok); ouro = p.ouro; const ouroDono = dono.ouro; passos(J, 6.1 * 60, manter); turno.cancelarTurno(J, "teste");
  assert.ok(p.ouro - ouro >= 100 + C.INJECAO[0] * 0.7, `recebeu ${p.ouro - ouro}`); assert.ok(ouroDono - dono.ouro >= 100 - 1, "o salário saiu do ouro do dono");
  // outro turno no mesmo dia: não paga de novo
  const dia = J.dia; assert.ok(turno.iniciarTurno(J, b).ok); ouro = p.ouro; passos(J, 6.1 * 60, manter); turno.cancelarTurno(J, "teste"); assert.equal(J.dia, dia); assert.equal(p.ouro, ouro, "já recebeu hoje");
  // a rotina do fim do dia não paga o jogador por fora
  ouro = p.ouro; eco.fimDoDia(J); assert.equal(p.ouro, ouro); assert.ok(b.empregados.includes(0), "jogador continua na lista de empregados");
});

test("turno: produz sozinho no negócio do jogador; interrompido ao levar dano; Coroa só com turno cumprido", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador, TS = C.TILE;
  const b = con.iniciarObra(J, p, "fazenda", Math.floor(p.x / TS) + 6, Math.floor(p.y / TS) - 12); b.prog = 1; p.negocios = [b.id]; p.hab[IDX.agricultura] = 30;
  p.x = (b.tx + b.w / 2) * TS; p.y = (b.ty + b.h + 0.5) * TS; manter(J);
  const ouro = p.ouro; assert.ok(turno.iniciarTurno(J, b).ok); passos(J, 8 * 60 + 5, manter); assert.equal(J.turno, null, "terminou sozinho em 8 h");
  assert.ok((b.estoque.trigo || 0) + (b.estoque.repolho || 0) > 0, "produziu para o estoque do negócio"); assert.ok(p.ouro - ouro >= C.INJECAO[0] * 0.6, "Coroa paga após o turno");
  p.pagoDia = 0; assert.ok(turno.iniciarTurno(J, b).ok); passos(J, 60, manter); J.danoJogador(5, "lobo"); assert.equal(J.turno, null, "dano interrompe o turno");
  assert.equal(turno.motivoNaoPodeTrabalhar(J, { prog: 1, tipo: "casa", dono: 0 }), "Aqui não há trabalho");
});

test("save: corpos, turno, equipamento e estado de pagamento sobrevivem ao salvar/carregar", () => {
  const J = novo(); passos(J, 40, manter); const p = J.jogador; equip.equipar(p, "arco");
  const e = criarPessoa(J, { x: p.x + 300, y: p.y }); e.ouro = 55; J.npcs.push(e); J.porId.set(e.id, e); J.matarNPC(e, "teste");
  const R = restaurar(JSON.parse(JSON.stringify(serializar(J)))); assert.equal(R.corpos.length, 1); assert.equal(R.corpos[0].ouro, 55); assert.equal(R.jogador.equip.mao, "arco");
});
