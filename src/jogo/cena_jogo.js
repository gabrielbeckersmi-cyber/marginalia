// CENA DA PARTIDA — junta mundo, controle, HUD e painéis. A lógica do jogo está em estado.js/interacao.js; aqui só entrada → ações e desenho.
import { C } from "./config.js";
import * as entrada from "../nucleo/entrada.js";
import { sons } from "../nucleo/audio.js";
import * as steam from "../servicos/steam.js";
import { atualizarJogo, renascer, serializar } from "./estado.js";
import { atualizarJogador, alvoEm, alcanca, alcanceAtaque, colocarObra, atacar, comerMelhor, beberDoCantil, alternarSono } from "./interacao.js";
import { podeConstruir, construcaoEm } from "./sistemas/construcao.js";
import { avancar } from "./sistemas/negocios.js";
import { hab, nivel } from "./sistemas/habilidades.js";
import { CONSTR } from "./dados/construcoes.js";
import { ITENS } from "./dados/itens.js";
import { criarCamera, seguir, desenharMundo } from "./visual/mundo_desenho.js";
import { ui, painel, texto, menuVertical, PAL } from "./visual/estilo.js";
import { mapaGrande, atualizarMapa, visaoMapa } from "./visual/mapa.js";
import { desenharHUD, coletarMensagens } from "./ui/hud.js";
import { desenharMochila, desenharHabilidades, desenharConstruir, desenharNPC, desenharNegocio, desenharSaque, desenharCriar, desenharCasa, desenharFogueira } from "./ui/paineis.js";
import { cozinhar } from "./sistemas/ferramentas.js";
import { ehMoradia } from "./sistemas/moradia.js";
import { cancelarTurno } from "./sistemas/turno.js";
import { temLoot } from "./sistemas/corpos.js";
const TS = C.TILE;
const PAINEIS = { inventario: desenharMochila, habilidades: desenharHabilidades, construir: desenharConstruir, npc: desenharNPC, negocio: desenharNegocio, saque: desenharSaque, criar: desenharCriar, casa: desenharCasa, fogueira: desenharFogueira };

/** G = contexto (main.js); J = partida (estado.js); aoPausar/aoSair = ganchos das cenas de menu. */
export function criarCenaJogo(G, J, { aoPausar, aoMenu }) {
  const { motor } = G, L = motor.L, A = motor.A;
  const S = { J, G, painel: null, msgs: [], construindo: null, alvo: null, cam: criarCamera(), tempo: 0, scroll: 0, producao: null, morreu: null, motivoFantasma: null, menuMorte: {}, tAuto: 0, tConq: 0 };
  seguir(S.cam, J.jogador, J.M, L, A);
  S.alternar = (id) => { S.painel = S.painel === id ? null : id; S.scroll = 0; S.construindo = null; };
  S.dormir = () => alternarSono(J);

  const mundo = () => ({ x: ui.x + S.cam.x - L / 2, y: ui.y + S.cam.y - A / 2 });
  const abrirCorpo = (c) => { S.corpo = c; S.painel = "saque"; S.scroll = 0; };
  const abrirNPC = (n) => { if (n.bandido) return; S.npc = n; S.painel = "npc"; S.scroll = 0; };
  const abrirConstr = (b) => { S.negocio = b; S.painel = "negocio"; S.scroll = 0; S.aba = null; };
  const abrirCasa = (b) => { S.casa = b; S.painel = "casa"; S.scroll = 0; };
  const abrirFogueira = (b) => { S.fogueira = b; S.painel = "fogueira"; S.scroll = 0; };
  const abrirOutra = (b) => (CONSTR[b.tipo].fogueira ? abrirFogueira(b) : CONSTR[b.tipo].negocio ? abrirConstr(b) : ehMoradia(b) && b.dono === 0 ? abrirCasa(b) : aviso(CONSTR[b.tipo].agua ? "Segure o mouse sobre o poço para beber" : "Não há o que fazer aqui"));
  const aviso = (texto) => J.avisos.push({ tipo: "item", texto });

  function interagirPerto() {
    const p = J.jogador; let melhor = null, md = C.ALCANCE + 20;
    for (const n of J.npcs) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (!n.bandido && d < md) { md = d; melhor = { tipo: "npc", ref: n }; } }
    for (const b of J.construcoes) { const d = Math.hypot((b.tx + b.w / 2) * TS - p.x, (b.ty + b.h / 2) * TS - p.y) - Math.max(b.w, b.h) * TS / 2; if (d < md && b.prog >= 1 && (CONSTR[b.tipo].negocio || CONSTR[b.tipo].fogueira || (ehMoradia(b) && b.dono === 0))) { md = d; melhor = { tipo: "constr", ref: b }; } }
    for (const c of J.corpos) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < md) { md = d; melhor = { tipo: "corpo", ref: c }; } }
    if (!melhor) return aviso("Nada para interagir por perto");
    if (melhor.tipo === "npc") abrirNPC(melhor.ref); else if (melhor.tipo === "corpo") abrirCorpo(melhor.ref); else abrirOutra(melhor.ref);
  }

  function cliqueNoMundo() {
    const p = J.jogador, a = S.alvo;
    if (S.construindo) {
      const d = CONSTR[S.construindo], w = mundo(), tx = Math.round(w.x / TS - d.w / 2), ty = Math.round(w.y / TS - d.h / 2), r = colocarObra(J, S.construindo, tx, ty);
      if (r.ok) { sons.confirmar(); S.construindo = null; S.motivoFantasma = null; aviso("Obra marcada: segure o mouse sobre ela para construir"); } else aviso(r.motivo);
      return;
    }
    if (!a) return;
    // ataque é com o mouse: clique/segure no animal ou bandido; botão direito ataca qualquer um (ver atualizar)
    if (a.tipo === "animal" || (a.tipo === "npc" && a.ref.bandido)) { if (Math.hypot(a.x - p.x, a.y - p.y) > alcanceAtaque(J)) aviso("Longe demais para atacar"); return; }
    if (a.tipo === "npc") { if (alcanca(J, a)) abrirNPC(a.ref); else aviso("Aproxime-se para conversar"); return; }
    if (a.tipo === "corpo") { if (alcanca(J, a)) { if (temLoot(a.ref)) abrirCorpo(a.ref); else aviso("Não há nada com ele"); } else aviso("Chegue mais perto"); return; }
    if (a.tipo === "constr" && a.ref.prog >= 1) { if (!alcanca(J, a)) aviso("Aproxime-se do local"); else abrirOutra(a.ref); }
  }

  function conquistas() {
    const e = G.estado, p = J.jogador;
    if (J.cidades.some((c) => c.fundador === 0)) steam.desbloquear(e, "FUNDADOR");
    if (J.construcoes.some((b) => b.dono === 0 && b.prog >= 1 && CONSTR[b.tipo].moradia)) steam.desbloquear(e, "TETO_PROPRIO");
    const top = Math.max(...p.hab.map(nivel)); if (top >= 10) steam.desbloquear(e, "APRENDIZ"); if (top >= 50) steam.desbloquear(e, "MESTRE");
    if (J.construcoes.some((b) => b.dono === 0 && b.prog >= 1 && CONSTR[b.tipo].mercado)) steam.desbloquear(e, "COMERCIANTE");
    if (J.dia >= 7) steam.desbloquear(e, "SETE_DIAS"); if (J.npcs.length >= 100) steam.desbloquear(e, "CEM_ALMAS");
    if (J.stats.bandidosDerrotados > 0) steam.desbloquear(e, "DEFENSOR");
    e.melhorDias = Math.max(e.melhorDias || 0, J.dia); steam.stat("DIAS_SOBREVIVIDOS", e.melhorDias); steam.stat("POPULACAO", J.npcs.length);
  }

  const cena = {
    entrar() { steam.presenca("steam_display", "#Jogando"); },
    perdeuFoco() { if (motor.topo() === cena && !S.morreu) aoPausar(S); },
    atualizar(dt) {
      S.tempo += dt; ui.sincronizar();
      const p = J.jogador, w = mundo();
      // painéis/atalhos
      if (entrada.apertou("pausar") || entrada.apertou("voltar")) { if (S.painel || S.construindo) { S.painel = null; S.construindo = null; } else { aoPausar(S); return; } }
      const emTurno = !!J.turno;
      if (emTurno) { S.painel = null; S.construindo = null; if (entrada.apertou("cancelar")) cancelarTurno(J, "Turno cancelado"); }
      else {
        if (entrada.apertou("criar")) S.alternar("criar"); if (entrada.apertou("inventario")) S.alternar("inventario"); if (entrada.apertou("construir")) S.alternar("construir"); if (entrada.apertou("habilidades")) S.alternar("habilidades"); if (entrada.apertou("mapa")) S.alternar("mapa");
        if (entrada.apertou("cancelar") || ui.cliqueDireito && S.construindo) S.construindo = null;
      }
      if (S.morreu) { seguir(S.cam, p, J.M, L, A, dt); return; }
      if (entrada.apertou("comer")) comerMelhor(J); if (entrada.apertou("cantil")) beberDoCantil(J); if (entrada.apertou("dormir")) alternarSono(J);
      if (entrada.apertou("atacar")) atacar(J);   // só controle (gamepad): acerta o animal/bandido mais perto
      if (entrada.apertou("interagir") && !p.dormindo && !J.chegando && !emTurno) interagirPerto();
      if (S.painel === "mapa") { S.mapa = visaoMapa(J, S.mapa); atualizarMapa(J, S.mapa, L, S.tempo); }
      // mouse no mundo
      const livreMouse = !ui.sobrePrev && !S.painel;
      S.alvo = livreMouse && !S.construindo && !emTurno ? alvoEm(J, w.x, w.y) : null;
      if (S.construindo && livreMouse) { const d = CONSTR[S.construindo], tx = Math.round(w.x / TS - d.w / 2), ty = Math.round(w.y / TS - d.h / 2), r = podeConstruir(J, S.construindo, tx, ty); S.fantasma = { tipo: S.construindo, tx, ty, ok: r.ok }; S.motivoFantasma = r.ok ? null : r.motivo; } else S.fantasma = null;
      if (ui.clique && livreMouse && !J.chegando && !p.dormindo && !emTurno) { cliqueNoMundo(); ui.clique = false; }
      // combate com o mouse: esquerdo (clique/segurar) em animal ou bandido; direito em animal ou qualquer colono
      const al = S.alvo;
      if (al && (al.tipo === "animal" || al.tipo === "npc") && !J.chegando && !p.dormindo) {
        const hostil = al.tipo === "animal" || al.ref.bandido;
        const noAlcance = Math.hypot(al.x - p.x, al.y - p.y) <= alcanceAtaque(J);
        if (((ui.baixo && hostil) || ui.direito) && noAlcance) atacar(J, al);
        else if (ui.cliqueDireito && !noAlcance) aviso("Longe demais para atacar");
      }
      const dir = emTurno ? { x: 0, y: 0 } : entrada.mover(), segura = ui.baixo && livreMouse && !S.construindo && !emTurno;
      atualizarJogador(J, { dir: S.painel && S.painel !== "mapa" ? { x: 0, y: 0 } : dir, mundo: w, segura, alvo: S.alvo || null, correr: entrada.correr() }, dt);
      // produção segurando o botão no painel de negócio
      if (S.producao && ui.baixo) { const { b, a } = S.producao, r = avancar(J, p, b, a, dt); p.mov = false; p.trab = true; p.trabHab = "fabricar"; if (r.erro) aviso(r.erro); else if (r.fim) aviso(`Produziu ${r.qtd}× ${ITENS[r.saida].nome}`); }
      S.producao = null;
      if (S.cozinha && ui.baixo && S.painel === "fogueira") { const r = cozinhar(J, p, S.cozinha, dt); p.mov = false; p.trab = true; p.trabHab = "fabricar"; if (r.erro) aviso(r.erro); else if (r.fim) aviso(`Cozinhou ${ITENS[r.saida].nome}`); }
      S.cozinha = null;
      atualizarJogo(J, dt);
      coletarMensagens(S, dt); seguir(S.cam, p, J.M, L, A, dt);
      S.tConq -= dt; if (S.tConq <= 0) { S.tConq = 3; conquistas(); }
      S.tAuto += dt; if (S.tAuto > 90 && !J.chegando) { S.tAuto = 0; G.estado.partida = serializar(J); G.guardar(); }
    },
    desenhar(ctx) {
      ui.inativo = motor.topo() !== cena;
      desenharMundo(ctx, J, S.cam, L, A, { tempo: S.tempo, alvo: S.alvo, alvoOk: true, fantasma: S.fantasma, forcar: S.tempo < 0.05 });
      desenharHUD(ctx, S, L, A);
      if (S.painel === "mapa") mapaGrande(ctx, J, L, A, (S.mapa = visaoMapa(J, S.mapa))); else if (PAINEIS[S.painel]) PAINEIS[S.painel](ctx, S, L, A);
      if (S.morreu) {
        ctx.fillStyle = "#140805bb"; ctx.fillRect(0, 0, L, A);
        painel(ctx, L / 2 - 300, A / 2 - 170, 600, 340, { titulo: "Você caiu" });
        texto(ctx, S.morreu, L / 2, A / 2 - 90, { tam: 20, alinhar: "center", cor: PAL.ferrugem });
        texto(ctx, "Você acorda no porto, mais pobre (perde 25% do ouro).", L / 2, A / 2 - 56, { tam: 16, alinhar: "center", cor: PAL.tintaClara });
        menuVertical(ctx, S.menuMorte, [{ rotulo: "Renascer no porto", acao: () => { renascer(J); S.morreu = null; S.cam.x = J.jogador.x; S.cam.y = J.jogador.y; } }, { rotulo: "Menu principal", acao: () => aoMenu(S) }], L / 2, A / 2 - 20, 320, 50, 12);
      }
      ui.fimQuadro();
    },
  };
  S.cena = cena; cena.S = S;
  return cena;
}
