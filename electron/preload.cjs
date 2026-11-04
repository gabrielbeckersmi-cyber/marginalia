// PRELOAD — a ÚNICA ponte entre o jogo (renderer) e o Electron/Steam. Expõe window.plataforma.
// Nada de require/process/fs chega ao jogo; só estas funções, que o main.cjs valida do outro lado.
const { contextBridge, ipcRenderer } = require("electron");

const chamar = (canal, ...args) => ipcRenderer.invoke(canal, ...args);

contextBridge.exposeInMainWorld("plataforma", {
  emElectron: true,
  sistema: process.platform,

  arquivo: {
    ler: (nome) => chamar("arquivo:ler", nome),
    gravar: (nome, conteudo) => chamar("arquivo:gravar", nome, conteudo),
    gravarSync: (nome, conteudo) => ipcRenderer.sendSync("arquivo:gravar-sync", nome, conteudo),
  },

  janela: {
    telaCheia: (valor) => chamar("janela:tela-cheia", valor),
    eTelaCheia: () => chamar("janela:e-tela-cheia"),
    sair: () => chamar("janela:sair"),
  },

  // O jogo registra uma função que salva tudo; o Electron espera ela terminar antes de fechar a janela.
  aoFechar: (salvarTudo) => {
    ipcRenderer.on("app:antes-de-fechar", async () => {
      try { await salvarTudo(); } catch (e) { console.warn("[fechar]", e); }
      ipcRenderer.send("app:fechar-agora");
    });
  },

  steam: {
    iniciar: () => chamar("steam:iniciar"),
    conquista: (id) => chamar("steam:conquista", id),
    conquistaAtiva: (id) => chamar("steam:conquista-ativa", id),
    conquistaLimpar: (id) => chamar("steam:conquista-limpar", id),
    stat: (nome, valor) => chamar("steam:stat", nome, valor),
    statLer: (nome) => chamar("steam:stat-ler", nome),
    presenca: (chave, valor) => chamar("steam:presenca", chave, valor),
    dlc: (id) => chamar("steam:dlc", id),
    nuvemLer: (nome) => chamar("steam:nuvem-ler", nome),
    nuvemGravar: (nome, conteudo) => chamar("steam:nuvem-gravar", nome, conteudo),
  },
});
