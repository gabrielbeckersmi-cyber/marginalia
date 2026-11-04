// PONTO DE ENTRADA — liga tudo: save, Steam, idioma, entrada, motor e cenas.
import CONFIG from "../CONFIGURE-AQUI.js";
import { P } from "./nucleo/plataforma.js";
import * as salvamento from "./nucleo/salvamento.js";
import * as entrada from "./nucleo/entrada.js";
import * as audio from "./nucleo/audio.js";
import { criarMotor } from "./nucleo/motor.js";
import { carregarArte } from "./nucleo/assets.js";
import { iniciarIdioma } from "./nucleo/i18n.js";
import * as steam from "./servicos/steam.js";
import { criarCenas, mostrarToast } from "./jogo/cenas.js";
import * as mundoApi from "./jogo/mundo.js";
import * as interacaoApi from "./jogo/interacao.js";

const VERSAO_SAVE = 2;

const novoEstado = () => ({
  versao: VERSAO_SAVE, ts: 0,
  partida: null,                        // jogo salvo (estado.js → serializar)
  melhorDias: 0,
  conquistas: {},                       // { ID: { ts, enviada } }
  opcoes: { mudo: false, telaCheia: null, idioma: null },
});

/** Converte saves antigos para o formato atual. Ao mudar o formato: aumente VERSAO_SAVE e trate aqui. */
function migrar(s) {
  s.conquistas = s.conquistas || {}; s.partida = s.partida || null; s.melhorDias = s.melhorDias || 0;
  s.opcoes = { mudo: false, telaCheia: null, idioma: null, ...(s.opcoes || {}) };
  s.versao = VERSAO_SAVE;
  return s;
}

/** Une dois saves: nada que o jogador conquistou pode se perder (recordes e totais só sobem; conquistas se somam). */
function mesclar(a, b) {
  for (const [id, c] of Object.entries(b.conquistas || {})) if (!a.conquistas[id]) a.conquistas[id] = c;
  a.melhorDias = Math.max(a.melhorDias || 0, b.melhorDias || 0);
  if (!a.partida && b.partida) a.partida = b.partida;
  return a;
}

async function iniciar() {
  const canvas = document.getElementById("tela");
  const motor = criarMotor(canvas, CONFIG);
  entrada.iniciarEntrada(canvas, motor.paraLogico);

  const estado = await salvamento.carregar(novoEstado, migrar, mesclar);
  const info = await steam.iniciar(estado);
  iniciarIdioma(estado.opcoes.idioma, info.idioma);
  audio.definirMudo(estado.opcoes.mudo);
  await carregarArte();
  steam.aoConquistar(mostrarToast);

  // Salvamento agrupado: várias mudanças seguidas viram uma gravação só (imediato=true força agora).
  let timer = null;
  const G = {
    estado, motor,
    guardar(imediato = false) {
      clearTimeout(timer);
      if (imediato) return salvamento.salvar(G.estado);
      timer = setTimeout(() => salvamento.salvar(G.estado), 800);
    },
  };
  // Ao fechar a janela o Electron espera esta função terminar.
  P.aoFechar(async () => { clearTimeout(timer); await salvamento.salvar(G.estado); });

  // Aplica a preferência de tela cheia salva (o Steam Deck já abre em tela cheia sozinho).
  if (typeof estado.opcoes.telaCheia === "boolean" && !info.noDeck) P.janela.telaCheia(estado.opcoes.telaCheia).catch(() => {});

  const cenas = criarCenas(G);
  motor.trocar(cenas.titulo());
  motor.iniciar();

  // Ganchos de teste: só existem em MODO_TESTE.
  if (CONFIG.MODO_TESTE) {
    window.__teste = { G, motor, cenas, steam, entrada, info, mundo: mundoApi, interacao: interacaoApi };
    window.addEventListener("keydown", (e) => { if (e.code === "F3") motor.alternarFps(); });
  }
}

iniciar().catch((e) => {
  console.error("[jogo] falha ao iniciar:", e);
  document.body.insertAdjacentHTML("beforeend", `<pre style="color:#f88;position:fixed;top:8px;left:8px">${String(e && e.stack || e)}</pre>`);
});
