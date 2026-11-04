// PROCESSO PRINCIPAL DO ELECTRON — cria a janela, liga a Steam, serve o jogo e guarda arquivos.
//
// Segurança (o jogo só carrega conteúdo local, mas mantemos o Electron "trancado" mesmo assim):
//  • contextIsolation + sandbox ligados, nodeIntegration desligado; o jogo só enxerga window.plataforma (preload.cjs);
//  • o jogo é servido por um protocolo próprio (app://jogo/...) com proteção contra "../" — ele também permite
//    fetch()/WebGL/decodeAudioData, que NÃO funcionam em file://;
//  • nenhuma janela nova e nenhuma navegação para fora; DevTools só em MODO_TESTE.
const { app, BrowserWindow, ipcMain, protocol, net, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const CONFIG = require("../CONFIGURE-AQUI.js");
const { criarSteam } = require("./steam.cjs");

const RAIZ = path.join(__dirname, "..");
const WWW = path.join(RAIZ, "www");
const TESTE = !!CONFIG.MODO_TESTE;

// Linux/Steam Deck: o sandbox SUID do Chromium costuma falhar dentro do contêiner da Steam. Como o jogo só
// carrega conteúdo próprio (nunca páginas da web), desligar o sandbox do Chromium é o padrão em jogos Electron.
if (process.platform === "linux") app.commandLine.appendSwitch("no-sandbox");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

// Uma instância só (evita duas cópias brigando pelo save).
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

// A Steam precisa iniciar ANTES da janela existir (o overlay se acopla ao renderizador).
const steam = criarSteam(CONFIG, console);
steam.iniciar();
if (steam.modo === "reiniciando") { app.quit(); }

let janela = null;
let fechando = false;

// ── Arquivos de save (pasta do usuário; sem acesso a nada fora dela) ─────────
const pastaSaves = () => path.join(app.getPath("userData"), "saves");
const NOME_ARQ = /^[A-Za-z0-9_.-]{1,64}$/;
const nomeOk = (n) => typeof n === "string" && NOME_ARQ.test(n) && !n.startsWith(".");

function lerArquivo(nome) {
  if (!nomeOk(nome)) return null;
  try { return fs.readFileSync(path.join(pastaSaves(), nome), "utf8"); } catch { return null; }
}
function gravarArquivo(nome, conteudo) {
  if (!nomeOk(nome) || typeof conteudo !== "string" || conteudo.length > 2_000_000) return false;
  try {
    fs.mkdirSync(pastaSaves(), { recursive: true });
    const alvo = path.join(pastaSaves(), nome);
    const tmp = alvo + ".tmp";
    fs.writeFileSync(tmp, conteudo, "utf8");
    fs.renameSync(tmp, alvo); // gravação atômica: nunca deixa um save pela metade
    return true;
  } catch (e) { console.warn("[arquivo] falha ao gravar", nome, e.message); return false; }
}

// ── Preferência de tela cheia (lida antes de criar a janela) ──────────────────
function lerPrefJanela() {
  try { return JSON.parse(lerArquivo("janela.json") || "{}"); } catch { return {}; }
}
function gravarPrefJanela(p) { gravarArquivo("janela.json", JSON.stringify(p)); }

function noSteamDeck() {
  return process.env.SteamDeck === "1" || process.env.SteamGamepadUI === "1" || (steam.info().noDeck === true);
}

function criarJanela() {
  const pref = lerPrefJanela();
  const telaCheia = noSteamDeck() || (pref.telaCheia ?? CONFIG.janela.telaCheiaPadrao);
  janela = new BrowserWindow({
    width: CONFIG.janela.larguraInicial,
    height: CONFIG.janela.alturaInicial,
    minWidth: 800,
    minHeight: 450,
    show: false,
    backgroundColor: "#000000",
    title: CONFIG.jogo.nome,
    fullscreen: !!telaCheia,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: TESTE,
      backgroundThrottling: false, // o jogo não pode "dormir" quando o overlay da Steam abre
      spellcheck: false,
    },
  });
  janela.once("ready-to-show", () => janela.show());
  janela.loadURL("app://jogo/index.html");

  janela.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  janela.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("app://")) e.preventDefault(); });

  janela.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11" || (input.alt && input.key === "Enter")) { alternarTelaCheia(); e.preventDefault(); }
    if (TESTE && input.key === "F12") janela.webContents.toggleDevTools();
  });

  // Fechar a janela: pede ao jogo para salvar antes (ele responde chamando app:fechar-agora); trava em 2 s.
  janela.on("close", (e) => {
    if (fechando) return;
    e.preventDefault();
    fechando = true;
    try { janela.webContents.send("app:antes-de-fechar"); } catch {}
    setTimeout(() => { try { janela.destroy(); } catch {} }, 2000);
  });
  janela.on("closed", () => { janela = null; });
}

function alternarTelaCheia(valor) {
  if (!janela) return false;
  const novo = typeof valor === "boolean" ? valor : !janela.isFullScreen();
  janela.setFullScreen(novo);
  gravarPrefJanela({ telaCheia: novo });
  return novo;
}

// ── IPC (cada canal valida o que recebe) ─────────────────────────────────────
function registrarIpc() {
  ipcMain.handle("arquivo:ler", (_e, nome) => lerArquivo(nome));
  ipcMain.handle("arquivo:gravar", (_e, nome, conteudo) => gravarArquivo(nome, conteudo));
  ipcMain.on("arquivo:gravar-sync", (e, nome, conteudo) => { e.returnValue = gravarArquivo(nome, conteudo); });

  ipcMain.handle("janela:tela-cheia", (_e, v) => alternarTelaCheia(v === undefined ? undefined : !!v));
  ipcMain.handle("janela:e-tela-cheia", () => !!(janela && janela.isFullScreen()));
  ipcMain.handle("janela:sair", () => { if (janela) janela.close(); else app.quit(); });
  ipcMain.on("app:fechar-agora", () => { fechando = true; if (janela) janela.destroy(); });

  ipcMain.handle("steam:iniciar", () => steam.info());
  ipcMain.handle("steam:conquista", (_e, id) => steam.ativarConquista(id));
  ipcMain.handle("steam:conquista-ativa", (_e, id) => steam.conquistaAtiva(id));
  ipcMain.handle("steam:conquista-limpar", (_e, id) => (TESTE ? steam.limparConquista(id) : false)); // só em teste
  ipcMain.handle("steam:stat", (_e, nome, valor) => steam.definirStat(nome, Number(valor)));
  ipcMain.handle("steam:stat-ler", (_e, nome) => steam.lerStat(nome));
  ipcMain.handle("steam:presenca", (_e, chave, valor) => steam.presenca(chave, valor));
  ipcMain.handle("steam:dlc", (_e, id) => steam.dlcInstalado(id));
  ipcMain.handle("steam:nuvem-ler", (_e, nome) => steam.nuvemLer(nome));
  ipcMain.handle("steam:nuvem-gravar", (_e, nome, conteudo) => steam.nuvemGravar(nome, conteudo));
}

app.whenReady().then(() => {
  // protocolo app://jogo/<arquivo> → pasta www/ (bloqueia qualquer caminho que saia dela)
  protocol.handle("app", (req) => {
    const url = new URL(req.url);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const alvo = path.normalize(path.join(WWW, rel));
    if (alvo !== WWW && !alvo.startsWith(WWW + path.sep)) return new Response("negado", { status: 403 });
    return net.fetch(pathToFileURL(alvo).toString()).catch(() => new Response("não encontrado", { status: 404 }));
  });

  if (CONFIG.steam.exigirSteam && !TESTE && steam.modo !== "steam") {
    dialog.showErrorBox(CONFIG.jogo.nome, "Este jogo precisa da Steam aberta. Abra a Steam e inicie o jogo por lá.");
    app.quit();
    return;
  }

  Menu.setApplicationMenu(null);
  registrarIpc();
  criarJanela();
});

app.on("second-instance", () => { if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); } });
app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => steam.encerrar());
