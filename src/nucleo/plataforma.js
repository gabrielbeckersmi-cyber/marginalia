// PONTE COM O ELECTRON/STEAM (lado do jogo).
// Dentro do Electron, window.plataforma (criado por electron/preload.cjs) fala com a Steam e com o disco.
// Fora dele (npm run dev, no navegador) usamos substitutos: save no localStorage e Steam "simulada".
const real = typeof window !== "undefined" ? window.plataforma : null;

export const emElectron = !!real;
export const sistema = real ? real.sistema : "navegador";
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const PREFIXO = "jogo_";
const guardar = (k, v) => { try { localStorage.setItem(PREFIXO + k, v); return true; } catch { return false; } };
const ler = (k) => { try { return localStorage.getItem(PREFIXO + k); } catch { return null; } };

const arquivoNavegador = {
  ler: async (n) => ler(n),
  gravar: async (n, c) => guardar(n, c),
  gravarSync: (n, c) => guardar(n, c),
};

const steamVazia = {
  iniciar: async () => ({ modo: "navegador", disponivel: false, nome: "", idioma: null, noDeck: false, appId: 0, erro: null, nuvemAtiva: false }),
  conquista: async () => false,
  conquistaAtiva: async () => false,
  conquistaLimpar: async () => false,
  stat: async () => false,
  statLer: async () => null,
  presenca: async () => false,
  dlc: async () => false,
  nuvemLer: async () => null,
  nuvemGravar: async () => false,
};

const janelaNavegador = {
  telaCheia: async (v) => {
    try {
      const alvo = typeof v === "boolean" ? v : !document.fullscreenElement;
      if (alvo) await document.documentElement.requestFullscreen(); else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
    return !!document.fullscreenElement;
  },
  eTelaCheia: async () => !!document.fullscreenElement,
  sair: async () => {},
};

export const P = {
  arquivo: real ? real.arquivo : arquivoNavegador,
  steam: real ? real.steam : steamVazia,
  janela: real ? real.janela : janelaNavegador,
  aoFechar: real ? real.aoFechar : (fn) => window.addEventListener("beforeunload", () => { try { fn(); } catch {} }),
};
