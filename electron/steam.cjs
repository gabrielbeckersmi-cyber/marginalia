// ADAPTADOR DA STEAM (processo principal do Electron).
//
// • Toda chamada à Steam passa por aqui; o jogo (renderer) só conversa via IPC (ver preload.cjs).
// • Usa a biblioteca "steamworks.js" (traz as DLLs da Steam). Para trocar de biblioteca (ex.: steamworks-ffi-node),
//   reimplemente SÓ este arquivo mantendo as mesmas funções exportadas — o resto do jogo não muda.
// • Se a Steam não estiver rodando (desenvolvimento, ou jogador abriu o .exe direto), o adaptador entra em modo
//   "indisponivel": as funções viram no-ops e o jogo guarda conquistas localmente para enviar depois.
// • STEAM_MODO=mock (variável de ambiente) força o modo sem Steam, útil para testar sem o cliente da Steam.
//
// Nunca exponha a API da Steam inteira ao renderer: só as funções validadas abaixo.

const ID_VALIDO = /^[A-Za-z0-9_]{1,128}$/;

function criarSteam(CONFIG, log = console, carregarBiblioteca = () => require("steamworks.js")) {
  const appId = CONFIG.steam.appIdEfetivo();
  const idsConquistas = new Set(CONFIG.conquistas.map((c) => c.id));
  const idsStats = new Set((CONFIG.stats || []).map((s) => s.id));
  let sw = null;     // módulo steamworks.js
  let cliente = null;
  let modo = "indisponivel"; // "steam" | "mock" | "indisponivel"
  let erro = null;
  let timerStore = null;

  function iniciar() {
    if (process.env.STEAM_MODO === "mock") {
      modo = "mock";
      return info();
    }
    try {
      sw = carregarBiblioteca();
      // Com o seu AppID (publicação): se o jogo foi aberto fora da Steam, pede para a Steam reabri-lo (e sai).
      // Em MODO_TESTE não fazemos isso (o AppID 480 não é o seu jogo).
      if (!CONFIG.MODO_TESTE && appId > 0 && sw.restartAppIfNecessary && sw.restartAppIfNecessary(appId)) {
        log.log("[steam] reiniciando pelo cliente da Steam...");
        modo = "reiniciando";
        return info();
      }
      cliente = sw.init(appId > 0 ? appId : undefined);
      modo = "steam";
      if (sw.electronEnableSteamOverlay) sw.electronEnableSteamOverlay(); // overlay (Shift+Tab) dentro do Electron
      log.log(`[steam] conectado (AppID ${appId || "steam_appid.txt"}) — jogador: ${nomeJogador()}`);
    } catch (e) {
      erro = String((e && e.message) || e);
      cliente = null;
      modo = "indisponivel";
      log.log("[steam] indisponível: " + erro.split("\n")[0]);
    }
    return info();
  }

  function nomeJogador() {
    try { return cliente.localplayer.getName(); } catch { return ""; }
  }

  function idioma() {
    try { return cliente.apps.currentGameLanguage(); } catch { return null; }
  }

  function noDeck() {
    try { return !!cliente.utils.isSteamRunningOnSteamDeck(); } catch { return false; }
  }

  function info() {
    return {
      modo,
      disponivel: modo === "steam",
      nome: modo === "steam" ? nomeJogador() : "",
      idioma: modo === "steam" ? idioma() : null, // ex.: "brazilian", "english"
      noDeck: modo === "steam" ? noDeck() : false,
      appId,
      erro,
      nuvemAtiva: modo === "steam" && CONFIG.steam.nuvem && nuvemHabilitada(),
    };
  }

  function nuvemHabilitada() {
    try { return cliente.cloud.isEnabledForAccount() && cliente.cloud.isEnabledForApp(); } catch { return false; }
  }

  // ── Conquistas e stats ───────────────────────────────────────────────────
  function agendarStore(imediato = false) {
    if (!cliente) return;
    clearTimeout(timerStore);
    const rodar = () => { try { cliente.stats.store(); } catch (e) { log.warn("[steam] store:", e.message); } };
    if (imediato) rodar();
    else timerStore = setTimeout(rodar, 5000); // agrupa várias mudanças numa só chamada (a Steam limita a frequência)
  }

  function ativarConquista(id) {
    if (!cliente || !ID_VALIDO.test(id) || !idsConquistas.has(id)) return false;
    try {
      const ok = cliente.achievement.activate(id);
      agendarStore(true);
      return !!ok;
    } catch (e) { log.warn("[steam] conquista:", e.message); return false; }
  }

  function conquistaAtiva(id) {
    if (!cliente || !idsConquistas.has(id)) return false;
    try { return !!cliente.achievement.isActivated(id); } catch { return false; }
  }

  function limparConquista(id) { // só para testes (o jogo só chama em MODO_TESTE)
    if (!cliente || !idsConquistas.has(id)) return false;
    try { const ok = cliente.achievement.clear(id); agendarStore(true); return !!ok; } catch { return false; }
  }

  function definirStat(nome, valor) {
    if (!cliente || !idsStats.has(nome) || !Number.isFinite(valor)) return false;
    try { const ok = cliente.stats.setInt(nome, Math.max(0, Math.min(2147483647, Math.floor(valor)))); agendarStore(false); return !!ok; }
    catch (e) { log.warn("[steam] stat:", e.message); return false; }
  }

  function lerStat(nome) {
    if (!cliente || !idsStats.has(nome)) return null;
    try { return cliente.stats.getInt(nome); } catch { return null; }
  }

  function presenca(chave, valor) {
    if (!cliente || !CONFIG.steam.richPresence) return false;
    if (typeof chave !== "string" || !/^[a-z_]{1,64}$/.test(chave)) return false;
    try { cliente.localplayer.setRichPresence(chave, valor == null ? null : String(valor).slice(0, 256)); return true; } catch { return false; }
  }

  function dlcInstalado(id) {
    if (!cliente) return false;
    try { return !!cliente.apps.isDlcInstalled(Number(id)); } catch { return false; }
  }

  // ── Steam Cloud (nome do arquivo validado; conteúdo é texto) ──────────────
  const NOME_NUVEM = /^[A-Za-z0-9_.-]{1,64}$/;
  function nuvemLer(nome) {
    if (!cliente || !NOME_NUVEM.test(nome) || !nuvemHabilitada()) return null;
    try { return cliente.cloud.fileExists(nome) ? cliente.cloud.readFile(nome) : null; } catch { return null; }
  }
  function nuvemGravar(nome, conteudo) {
    if (!cliente || !NOME_NUVEM.test(nome) || typeof conteudo !== "string" || conteudo.length > 1_000_000 || !nuvemHabilitada()) return false;
    try { return !!cliente.cloud.writeFile(nome, conteudo); } catch (e) { log.warn("[steam] nuvem:", e.message); return false; }
  }

  function encerrar() {
    clearTimeout(timerStore);
    if (cliente) { try { cliente.stats.store(); } catch {} }
  }

  return { iniciar, info, ativarConquista, conquistaAtiva, limparConquista, definirStat, lerStat, presenca, dlcInstalado, nuvemLer, nuvemGravar, encerrar, get modo() { return modo; } };
}

module.exports = { criarSteam };
