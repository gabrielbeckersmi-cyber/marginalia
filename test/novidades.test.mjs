// Testes das regras novas: preso na obra, erro de ataque/arco, fôlego, ferramentas que quebram, níveis mínimos, fogueira, moradias (aluguel/venda), sono.
//   npm run teste
import test from "node:test";
import assert from "node:assert/strict";
import { C } from "../src/jogo/config.js";
import { novoJogo, atualizarJogo } from "../src/jogo/estado.js";
import { caminhavel, featEm, setFeat } from "../src/jogo/mundo.js";
import * as con from "../src/jogo/sistemas/construcao.js";
import * as inv from "../src/jogo/sistemas/inventario.js";
import * as hb from "../src/jogo/sistemas/habilidades.js";
import * as eco from "../src/jogo/sistemas/economia.js";
import { criarPessoa } from "../src/jogo/sistemas/colonos.js";
import { atualizarJogador, alvoEm, colocarObra, fabricar, alternarSono, moverJogador } from "../src/jogo/interacao.js";
import { golpeJogador, chanceAcerto, alcanceArma } from "../src/jogo/sistemas/combate.js";
import * as equip from "../src/jogo/sistemas/equipamento.js";
import * as fer from "../src/jogo/sistemas/ferramentas.js";
import * as mor from "../src/jogo/sistemas/moradia.js";
import { mover } from "../src/jogo/sistemas/movimento.js";
import { HAB, IDX } from "../src/jogo/dados/habilidades.js";
import { COLETA } from "../src/jogo/dados/coleta.js";
import { ITENS } from "../src/jogo/dados/itens.js";
import { procurarFeat } from "./util_mundo.mjs";

const TS = C.TILE;
const novo = () => { const J = novoJogo(777, { sprite: "pessoa_1", nome: "Teste" }); for (let i = 0; i < 40 * 60; i++) { const p = J.jogador; p.fome = 0; p.sede = 0; p.cans = 0; p.hp = 100; atualizarJogo(J, 1 / 60); } return J; };
const livreAoRedor = (J, x, y, r = 8) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { setFeat(J.M, x + dx, y + dy, 0); } };
const nova = (J, extra = {}) => { const e = criarPessoa(J, { x: J.jogador.x + 900, y: J.jogador.y, ...extra }); J.npcs.push(e); J.porId.set(e.id, e); return e; };
const ctl = (o = {}) => ({ dir: { x: 0, y: 0 }, mundo: { x: 0, y: 0 }, ...o });
const junto = (J, tx, ty) => { J.jogador.x = (tx + 2) * TS; J.jogador.y = (ty + 7) * TS; };
const colocarPerto = (J, a) => { for (const [ox, oy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (caminhavel(J.M, a.x + ox, a.y + oy)) { J.jogador.x = (a.x + ox + 0.5) * TS; J.jogador.y = (a.y + oy + 0.5) * TS; return; } };
const serrar = (J, tx, ty, seg = 80) => { const alvo = alvoEm(J, (tx + 0.5) * TS, (ty + 0.5) * TS); let s = 0; const f0 = featEm(J.M, tx, ty); while (s < seg) { atualizarJogador(J, ctl({ segura: true, alvo }), 1 / 30); s += 1 / 30; if (featEm(J.M, tx, ty) !== f0) break; } return featEm(J.M, tx, ty) !== f0; };

test("obra nova empurra quem estava parado onde ela nasce (ninguém fica preso dentro da construção)", () => {
  const J = novo(), p = J.jogador, tx = Math.floor(p.x / TS) + 8, ty = Math.floor(p.y / TS) - 20; livreAoRedor(J, tx, ty, 8);
  const e = nova(J); e.x = (tx + 1.5) * TS; e.y = (ty + 1.5) * TS;
  const b = con.iniciarObra(J, J.jogador, "cabana", tx, ty);
  assert.ok(caminhavel(J.M, Math.floor(e.x / TS), Math.floor(e.y / TS)), "o colono foi parar em tile livre"); assert.ok(b);
  // rede de segurança: se mesmo assim ficar dentro, mover() tira
  e.x = (tx + 1.5) * TS; e.y = (ty + 1.5) * TS; mover(J, e, e.x + 300, e.y + 300, 0.1);
  assert.ok(caminhavel(J.M, Math.floor(e.x / TS), Math.floor(e.y / TS)), "mover() desencalha");
});

test("combate: chance de errar depende da habilidade de quem ataca e de quem defende; arco tem longo alcance mas erra mais de longe", () => {
  assert.ok(chanceAcerto(50, 1) > chanceAcerto(1, 1) && chanceAcerto(1, 1) > chanceAcerto(1, 50), "mais hábil acerta mais; defensor hábil é mais difícil");
  assert.ok(chanceAcerto(20, 20, { alcance: true, dist: 8 * TS }) < chanceAcerto(20, 20, { alcance: true, dist: 1 * TS }), "mais longe, erra mais");
  assert.ok(chanceAcerto(1, 100) >= 0.12 && chanceAcerto(100, 1) <= 0.95);
  const J = novo(), p = J.jogador;
  equip.desequipar(p, "mao"); assert.ok(alcanceArma(p) < 2.5 * TS, "sem arco: corpo a corpo");
  equip.equipar(p, "arco"); assert.equal(alcanceArma(p), C.ALCANCE_ARCO * TS);
  const v = nova(J); v.x = p.x + 6 * TS; v.y = p.y; v.hp = 1000;
  J.rng = () => 0.01; assert.ok(golpeJogador(J, { tipo: "npc", ref: v }), "arco acerta a 6 tiles"); assert.ok(v.hp < 1000);
  p.cdGolpe = 0; const hp = v.hp; J.rng = () => 0.99; golpeJogador(J, { tipo: "npc", ref: v }); assert.equal(v.hp, hp, "rng alto = errou, sem dano"); assert.ok(J.efeitos.some((f) => f.texto === "Errou!"));
  equip.desequipar(p, "mao"); p.cdGolpe = 0; assert.equal(golpeJogador(J, { tipo: "npc", ref: v }), null, "sem arco não alcança 6 tiles");
  let erros = 0, n = 4000; const J2 = novo(); for (let i = 0; i < n; i++) if (J2.rng() >= chanceAcerto(1, 1)) erros++; assert.ok(erros / n > 0.15 && erros / n < 0.3, `~22% de erros no nível 1 (${(erros / n).toFixed(2)})`);
});

test("fôlego: Shift corre (mais rápido) gastando stamina; zerou = exausto até recuperar; trabalhar também gasta", () => {
  const J = novo(), p = J.jogador; p.stam = 100; p.exausto = false;
  const x0 = p.x; for (let i = 0; i < 60; i++) { atualizarJogador(J, ctl({ dir: { x: 1, y: 0 } }), 1 / 60); } const andou = p.x - x0;
  assert.ok(Math.abs(p.stam - 100) < 5, "andando normal não cansa");
  p.x = x0; const x1 = p.x; for (let i = 0; i < 60; i++) atualizarJogador(J, ctl({ dir: { x: 1, y: 0 }, correr: true }), 1 / 60); const correu = p.x - x1;
  assert.ok(correu > andou * 1.5, `corrida ${correu.toFixed(0)}px vs ${andou.toFixed(0)}px`); assert.ok(p.stam < 90, "gastou fôlego");
  let s = 0; while (!p.exausto && s++ < 2000) atualizarJogador(J, ctl({ dir: { x: 1, y: 0 }, correr: true }), 1 / 60);
  assert.ok(p.exausto && p.stam === 0, "ficou sem fôlego"); const xe = p.x; atualizarJogador(J, ctl({ dir: { x: 1, y: 0 }, correr: true }), 1 / 60); assert.ok(p.x - xe < C.VEL_JOGADOR / 60 * 1.2, "exausto não corre");
  s = 0; while (p.exausto && s++ < 3000) atualizarJogador(J, ctl(), 1 / 60); assert.ok(!p.exausto && p.stam >= C.STAMINA.retomar, "recuperou parado");
  // trabalho gasta fôlego
  const a = procurarFeat(J.M, 1); colocarPerto(J, a); p.inv = { machado_pedra: 1 }; p.hab[IDX.lenhador] = 10; p.stam = 100;
  const alvo = alvoEm(J, (a.x + 0.5) * TS, (a.y + 0.5) * TS); for (let i = 0; i < 60; i++) atualizarJogador(J, ctl({ segura: true, alvo }), 1 / 60); assert.ok(p.stam < 97, `cortar gasta fôlego (${p.stam.toFixed(1)})`);
  p.stam = 0; p.exausto = true; J.acao = null; atualizarJogador(J, ctl({ segura: true, alvo }), 1 / 60); assert.match(J.acao.msg, /fôlego/i, "sem fôlego não corta");
});

test("ferramentas: árvore exige machado de pedra no mínimo, nível mínimo por árvore; ferramenta quebra com o uso", () => {
  const J = novo(), p = J.jogador, M = J.M;
  const a = procurarFeat(M, 1); colocarPerto(J, a); p.stam = 100;
  p.inv = {}; p.hab[IDX.lenhador] = 30; assert.ok(!fer.podeColetar(p, 1).ok, "sem machado não corta"); assert.match(fer.podeColetar(p, 1).motivo, /machado de pedra/);
  p.inv = { machado_pedra: 1 }; p.hab[IDX.lenhador] = 1; assert.match(fer.podeColetar(p, 1).motivo, /nível/, "carvalho pede nível 2+");
  assert.ok(fer.podeColetar(p, 3).ok, "árvore seca: nível 1 basta");
  p.hab[IDX.lenhador] = 10; assert.ok(fer.podeColetar(p, 1).ok && fer.podeColetar(p, 2).ok);
  assert.ok(!fer.podeColetar(p, 24).ok, "ancestral: só com ferro e nível alto"); p.inv = { machado: 1 }; assert.match(fer.podeColetar(p, 24).motivo, /nível 25/); p.hab[IDX.lenhador] = 25; assert.ok(fer.podeColetar(p, 24).ok);
  // pedra não minera ferro sem nível; carvão e ferro pedem nível
  p.inv = { picareta_pedra: 1 }; p.hab[IDX.mineracao] = 1; assert.ok(fer.podeColetar(p, 17).ok); assert.ok(!fer.podeColetar(p, 19).ok && !fer.podeColetar(p, 18).ok); p.hab[IDX.mineracao] = 12; assert.ok(fer.podeColetar(p, 18).ok);
  // desgaste real: corta até quebrar
  p.inv = { machado_pedra: 1 }; p.hab[IDX.lenhador] = 20; let cortes = 0; const avisosAntes = J.avisos.length;
  while (inv.tem(p, "machado_pedra") && cortes < 40) { setFeat(M, a.x, a.y, 1); assert.ok(serrar(J, a.x, a.y)); cortes++; p.stam = 100; p.exausto = false; }
  assert.equal(cortes, ITENS.machado_pedra.durab, "quebrou depois da durabilidade"); assert.ok(J.avisos.slice(avisosAntes).some((x) => /quebrou/.test(x.texto)), "avisou");
  // ferro dura mais e corta mais rápido
  assert.ok(ITENS.machado.durab > ITENS.machado_pedra.durab * 3 && fer.bonusFerr("machado") > fer.bonusFerr("machado_pedra"));
  // colono também gasta
  const e = nova(J); e.inv = { picareta_pedra: 1 }; for (let i = 0; i < ITENS.picareta_pedra.durab; i++) fer.usarFerramenta(J, e, "picareta_pedra"); assert.ok(!inv.tem(e, "picareta_pedra"), "ferramenta do colono quebrou"); assert.equal(J.stats.ferramentasQuebradas, 1);
});

test("galhos: juntar à mão do chão; árvores também dão galho; fabricar machado de pedra com galho + pedra + fibra", () => {
  const J = novo(), p = J.jogador, M = J.M;
  const g = procurarFeat(M, 23); assert.ok(g, "há galhos no mapa"); colocarPerto(J, g); p.inv = {}; p.stam = 100;
  assert.ok(serrar(J, g.x, g.y), "coleta de galhos sem ferramenta"); assert.ok(p.inv.galho >= 2);
  const a = procurarFeat(M, 3) || procurarFeat(M, 1); colocarPerto(J, a); p.inv = { machado_pedra: 1 }; p.hab[IDX.lenhador] = 10; p.stam = 100; assert.ok(serrar(J, a.x, a.y)); assert.ok(p.inv.galho >= 1 && p.inv.madeira >= 2, "árvore dá madeira e galho");
  p.inv = { galho: 2, pedra: 2, fibra: 3 }; const r = fabricar(J, "machado_pedra"); assert.ok(r.ok && p.inv.machado_pedra === 1 && !p.inv.galho, "fabricou e gastou os materiais");
  assert.ok(!fabricar(J, "picareta_pedra").ok, "faltam materiais");
  assert.ok(!Object.keys(J.jogador.inv).includes("machado") && !("machado" in novo().jogador.inv), "o jogador não começa com ferramentas de ferro");
});

test("fogueira: constrói barato, fica perto de outras construções, cozinha carne e peixe gastando galho", () => {
  const J = novo(), p = J.jogador, tx = Math.floor(p.x / TS) + 8, ty = Math.floor(p.y / TS) - 30; livreAoRedor(J, tx, ty, 14); junto(J, tx, ty);
  p.inv = { madeira: 20, pedra: 20, galho: 20, fibra: 10, carne_crua: 2, peixe_cru: 1 }; p.hab[IDX.construcao] = 5; p.stam = 100;
  const cab = colocarObra(J, "cabana", tx, ty); assert.ok(cab.ok); cab.obra.prog = 1;
  const f = colocarObra(J, "fogueira", tx + 5, ty); assert.ok(f.ok, "fogueira pode ficar a 1 tile de distância, não 3: " + f.motivo);
  p.x = (tx + 6) * TS; p.y = (ty + 2.7) * TS; const ob = alvoEm(J, (tx + 6) * TS, (ty + 1) * TS); assert.equal(ob.tipo, "constr");
  let s = 0; while (f.obra.prog < 1 && s++ < 4000) atualizarJogador(J, ctl({ segura: true, alvo: ob }), 1 / 20); assert.ok(f.obra.prog >= 1, "obra rápida"); assert.ok(s / 20 < 30, `fogueira em ${(s / 20).toFixed(0)}s`);
  const rc = fer.RECEITAS_FOGUEIRA.find((r) => r.saida === "carne_assada"); let r; for (let i = 0; i < 2000; i++) { r = fer.cozinhar(J, p, rc, 0.05); if (r.fim) break; }
  assert.ok(r.fim && p.inv.carne_assada === 1 && p.inv.carne_crua === 1 && p.inv.galho === 20 - 4 - 1, "assou e gastou 1 galho");
  const rp = fer.RECEITAS_FOGUEIRA.find((x) => x.saida === "peixe_assado"); for (let i = 0; i < 2000; i++) { r = fer.cozinhar(J, p, rp, 0.05); if (r.fim) break; } assert.equal(p.inv.peixe_assado, 1);
  p.inv = {}; assert.ok(fer.cozinhar(J, p, rc, 1).erro, "sem ingredientes");
});

test("obras andam mais rápido (cabana nível 1 em menos de ~35 s) e o jogador só dorme em moradia que construiu", () => {
  const J = novo(), p = J.jogador, tx = Math.floor(p.x / TS) + 8, ty = Math.floor(p.y / TS) - 30; livreAoRedor(J, tx, ty, 10); junto(J, tx, ty);
  p.inv = { madeira: 20, fibra: 20 }; p.cans = 60; p.dormindo = false; p.stam = 100;
  alternarSono(J); assert.equal(p.dormindo, false, "sem casa própria não dorme");
  assert.match(J.avisos[J.avisos.length - 1].texto, /construída por você/);
  const o = colocarObra(J, "cabana", tx, ty).obra; p.x = (tx + 1.5) * TS; p.y = (ty + 3.7) * TS; const alvo = alvoEm(J, (tx + 1.5) * TS, (ty + 1.5) * TS); let s = 0; while (o.prog < 1 && s++ < 4000) { p.stam = 100; atualizarJogador(J, ctl({ segura: true, alvo }), 1 / 20); } assert.ok(o.prog >= 1 && s / 20 < 35, `cabana em ${(s / 20).toFixed(0)}s`);
  p.x = (tx + 1.5) * TS; p.y = (ty + 4.5) * TS; p.cans = 60; alternarSono(J); assert.equal(p.dormindo, true, "dorme perto da própria casa"); p.dormindo = false;
  p.x += 30 * TS; alternarSono(J); assert.equal(p.dormindo, false, "longe dela, não");
  p.x = (tx + 1.5) * TS; const inq = nova(J); o.inquilino = inq.id; inq.casa = o.id; alternarSono(J); assert.equal(p.dormindo, false, "alugada: não dorme");
});

test("moradias: o jogador anuncia aluguel/venda; colonos decidem pelo preço e pelo bolso; aluguel é cobrado por dia; venda transfere a casa", () => {
  const J = novo(), p = J.jogador, tx = Math.floor(p.x / TS) + 8, ty = Math.floor(p.y / TS) - 30; livreAoRedor(J, tx, ty, 10); junto(J, tx, ty);
  p.inv = { madeira: 20, fibra: 20 }; const b = colocarObra(J, "cabana", tx, ty).obra; b.prog = 1;
  const justoV = mor.precoJusto(J, b), justoA = mor.aluguelJusto(J, b); assert.ok(justoV > 100 && justoA >= 4);
  const caro = nova(J, { x: p.x, y: p.y }); caro.ouro = 2500; caro.casa = null; caro.sensPreco = 1.1; caro.x = (tx + 1) * TS; caro.y = (ty + 6) * TS;
  mor.anunciar(b, "aluguel", justoA * 3); assert.equal(mor.procurarMoradia(J, caro), false, "aluguel 3× o justo: recusa"); assert.equal(b.inquilino, null);
  mor.anunciar(b, "aluguel", justoA); assert.equal(mor.procurarMoradia(J, caro), true, "preço justo: aluga"); assert.equal(b.inquilino, caro.id); assert.equal(caro.casa, b.id); assert.equal(b.anuncio, null);
  const ouro0 = p.ouro, c0 = caro.ouro; eco.fimDoDia(J); assert.equal(p.ouro - ouro0, justoA, "aluguel cai na carteira do dono"); assert.equal(c0 - caro.ouro, justoA);
  caro.ouro = 0; eco.fimDoDia(J); assert.equal(b.inquilino, null, "sem pagar, é despejado"); assert.equal(caro.casa, null);
  // venda
  const comprador = nova(J); comprador.ouro = 3000; comprador.casa = null; comprador.sensPreco = 1.2; comprador.x = (tx + 1) * TS; comprador.y = (ty + 6) * TS;
  mor.anunciar(b, "venda", justoV * 2); assert.equal(mor.procurarMoradia(J, comprador), false, "venda a 2× o justo: recusa");
  mor.anunciar(b, "venda", justoV); const o1 = p.ouro; assert.equal(mor.procurarMoradia(J, comprador), true); assert.equal(b.dono, comprador.id); assert.equal(p.ouro, o1 + justoV); assert.equal(comprador.ouro, 3000 - justoV);
  assert.ok(J.avisos.some((x) => /comprou sua cabana/.test(x.texto)), "avisou o dono");
  const pobre = nova(J); pobre.ouro = 50; pobre.casa = null; pobre.sensPreco = 10; mor.anunciar(b, "aluguel", 100); b.dono = 0; b.inquilino = null; assert.equal(mor.procurarMoradia(J, pobre), false, "sem dinheiro: não aluga");
});

test("colonos sem casa alugam uma casa anunciada em vez de construir; ensino rende um pouco mais; save guarda anúncio e inquilino", async () => {
  const J = novo(), p = J.jogador, tx = Math.floor(p.x / TS) + 8, ty = Math.floor(p.y / TS) - 30; livreAoRedor(J, tx, ty, 10); junto(J, tx, ty);
  p.inv = { madeira: 20, fibra: 20 }; const b = colocarObra(J, "cabana", tx, ty).obra; b.prog = 1; mor.anunciar(b, "aluguel", 1);
  const e = nova(J); e.x = (tx + 1) * TS; e.y = (ty + 6) * TS; e.casa = null; e.cidade = 1; e.estado = "viver"; e.centro = { tx, ty, r: [3, 10] }; e.sensPreco = 1; e.ouro = 2000; e.espera = 0; e.proxCasa = 0;
  for (let i = 0; i < 600 && b.inquilino == null; i++) { e.proxCasa = 0; atualizarJogo(J, 1 / 20); } assert.equal(b.inquilino, e.id, "o colono alugou sozinho");
  assert.equal(C.ENSINO.fator, 0.04);
  const { serializar, restaurar } = await import("../src/jogo/estado.js"); const J2 = restaurar(JSON.parse(JSON.stringify(serializar(J)))); const b2 = J2.constrPorId.get(b.id); assert.equal(b2.inquilino, e.id); assert.equal(b2.criador, 0);
});

test("plantas: arbusto, flores e samambaia rendem fibra sem ferramenta", async () => {
  const { podeColetar } = await import("../src/jogo/sistemas/ferramentas.js");
  const { COLETA } = await import("../src/jogo/dados/coleta.js");
  const e = { inv: {}, hab: [], equip: { mao: null, escudo: null } };
  for (const f of [6, 13, 14]) { assert.ok(COLETA[f].drops.fibra, "feat " + f + " dá fibra"); assert.equal(podeColetar(e, f).ok, true); }
});

test("mapa: marcador de destino é salvo e restaurado", async () => {
  const { serializar, restaurar } = await import("../src/jogo/estado.js");
  const J = novoJogo(7, {}); J.marcador = { tx: 900, ty: 800 };
  assert.deepEqual(restaurar(JSON.parse(JSON.stringify(serializar(J)))).marcador, { tx: 900, ty: 800 });
});

// ── animações ──
import { quadroPessoa } from "../src/jogo/visual/animacao.js";
import { ANIMACOES } from "../src/jogo/dados/animacoes.js";
test("animação: andar/correr usam a folha base e sem arte extra cai no andar", () => {
  const e = { sprite: "pessoa_1", mov: true, correndo: false, anim: 5.2 };
  assert.deepEqual(quadroPessoa(e, 2, 0), { chave: "pessoa_1", idx: 2 * 4 + 1 });
  e.correndo = true; assert.deepEqual(quadroPessoa(e, 1, 0), { chave: "pessoa_1", idx: 5 * 4 + 1 });
  const t = { sprite: "pessoa_1", trab: true, trabHab: "lenhador", anim: 0 };   // 'cortar' sem arte: fallback
  assert.equal(quadroPessoa(t, 0, 0).chave, "pessoa_1");
});
test("animação: folha de 24 quadros calcula direção e quadro (com arte habilitada)", () => {
  ANIMACOES.cortar.sprites.push("pessoa_1");
  try {
    const e = { sprite: "pessoa_1", trab: true, trabHab: "lenhador" };
    quadroPessoa(e, 0, 100);
    assert.deepEqual(quadroPessoa(e, 0, 100.5), { chave: "pessoa_1__cortar", idx: 12 });      // 0,5 s × 24 fps
    assert.deepEqual(quadroPessoa(e, 2, 101.1), { chave: "pessoa_1__cortar", idx: 2 * 4 * 6 + 2 });  // 25º quadro volta ao 1º... (26 % 24 = 2)
    const a = { sprite: "pessoa_1", golpe: 0.1 }; quadroPessoa(a, 0, 0);
  } finally { ANIMACOES.cortar.sprites.length = 0; }
});
