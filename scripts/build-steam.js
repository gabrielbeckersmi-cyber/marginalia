#!/usr/bin/env node
/* Gera as pastas de build do jogo para a Steam (uma por sistema) em dist/.
 *
 *   npm run build:steam          → versão de PUBLICAÇÃO (exige MODO_TESTE = false e config completa)
 *   npm run build:steam:teste    → versão de teste (MODO_TESTE pode estar true; grava steam_appid.txt = 480
 *                                  para você abrir o .exe direto, sem passar pela Steam)
 *
 * Saída: dist/windows/<Jogo>.exe  e  dist/linux/<Jogo>  — cada pasta é o conteúdo de um "depot" do SteamPipe.
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { carregarEnv } = require("./carregar-env");

const raiz = path.resolve(__dirname, "..");
carregarEnv(raiz);
const CONFIG = require(path.join(raiz, "CONFIGURE-AQUI.js"));
const teste = process.argv.includes("--teste");
const soPlataforma = (process.argv.find((a) => a.startsWith("--so=")) || "").slice(5); // --so=linux (útil em testes)

function rodar(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: raiz, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) { console.error(`\n✖ Falhou: ${cmd} ${args.join(" ")}`); process.exit(r.status || 1); }
}

(async () => {
  // 1) Verificação
  if (!teste) {
    if (CONFIG.MODO_TESTE) { console.error("\n✖ MODO_TESTE está true. Para publicar, mude para false no CONFIGURE-AQUI.js (ou use `npm run build:steam:teste`).\n"); process.exit(1); }
    rodar(process.execPath, ["scripts/verificar-config.js", "--producao"]);
  } else {
    rodar(process.execPath, ["scripts/verificar-config.js"]);
  }
  // 2) Compila o jogo (src/ → www/)
  rodar(process.execPath, ["scripts/gerar-assets-md.js"]);
  rodar(process.execPath, ["build.mjs"]);

  // 3) Empacota com o Electron
  const { packager } = await import("@electron/packager");
  const saida = path.join(raiz, "dist");
  fs.rmSync(saida, { recursive: true, force: true });
  fs.mkdirSync(saida, { recursive: true });

  const alvos = [];
  if (CONFIG.plataformas.windows && (!soPlataforma || soPlataforma === "windows")) alvos.push({ nome: "windows", plataforma: "win32" });
  if (CONFIG.plataformas.linux && (!soPlataforma || soPlataforma === "linux")) alvos.push({ nome: "linux", plataforma: "linux" });

  const temWine = spawnSync(process.platform === "win32" ? "where" : "which", ["wine"], { stdio: "ignore" }).status === 0;
  const iconePath = path.join(raiz, CONFIG.jogo.icone || "loja/icone.ico");

  for (const alvo of alvos) {
    console.log(`\n▶ Empacotando ${alvo.nome}...`);
    const opcoes = {
      dir: raiz,
      out: path.join(saida, "_tmp"),
      name: CONFIG.jogo.executavel,
      executableName: CONFIG.jogo.executavel,
      platform: alvo.plataforma,
      arch: "x64",
      overwrite: true,
      prune: false,                // a lista branca abaixo já decide exatamente o que entra
      asar: { unpack: "**/*.{node,dll,so,dylib}" }, // bibliotecas nativas (Steam) ficam fora do asar para o sistema carregá-las
      // LISTA BRANCA: só entra no pacote o que o jogo precisa para rodar. Qualquer outra coisa (src/, scripts/, test/,
      // .env, node_modules de desenvolvimento, arquivos que você criar na pasta...) fica de fora automaticamente.
      ignore: (arq) => {
        if (arq === "" || arq === "/package.json" || arq === "/CONFIGURE-AQUI.js") return false;
        if (arq === "/node_modules" || /^\/node_modules\/steamworks\.js(\/|$)/.test(arq)) return false;
        if (/^\/(electron|www)(\/|$)/.test(arq)) return false;
        return true;
      },
      quiet: true,
    };
    // Editar o .exe (ícone, versão) precisa do Windows ou do Wine.
    const podeEditarExe = alvo.plataforma !== "win32" || process.platform === "win32" || temWine;
    if (podeEditarExe && alvo.plataforma === "win32") {
      opcoes.appVersion = CONFIG.jogo.versao;
      if (CONFIG.jogo.copyright) opcoes.appCopyright = CONFIG.jogo.copyright;
      opcoes.win32metadata = { CompanyName: CONFIG.jogo.desenvolvedor || "", FileDescription: CONFIG.jogo.nome, ProductName: CONFIG.jogo.nome };
      if (fs.existsSync(iconePath)) opcoes.icon = iconePath;
    } else if (alvo.plataforma === "win32") {
      console.log("  ⚠ Sem Windows/Wine neste computador: o .exe sairá com o ícone e metadados PADRÃO do Electron. Gere o build no Windows para o ícone final.");
    }
    const [pasta] = await packager(opcoes);
    const destino = path.join(saida, alvo.nome);
    fs.renameSync(pasta, destino);

    // Remove as bibliotecas da Steam de outros sistemas (reduz o tamanho).
    const sw = ["resources/app.asar.unpacked/node_modules/steamworks.js/dist", "resources/app/node_modules/steamworks.js/dist"].map((p) => path.join(destino, p)).find(fs.existsSync);
    if (sw) {
      const manter = alvo.plataforma === "win32" ? "win64" : "linux64";
      for (const d of fs.readdirSync(sw)) if (d !== manter) fs.rmSync(path.join(sw, d), { recursive: true, force: true });
      // A Valve recomenda a biblioteca da Steam ao lado do executável: copiamos também para a raiz (o original fica junto do módulo nativo).
      const lib = alvo.plataforma === "win32" ? "steam_api64.dll" : "libsteam_api.so";
      if (fs.existsSync(path.join(sw, manter, lib))) fs.copyFileSync(path.join(sw, manter, lib), path.join(destino, lib));
    } else console.log("  ⚠ steamworks.js não encontrado dentro do pacote (confira se `npm install` foi feito).");

    if (teste) fs.writeFileSync(path.join(destino, "steam_appid.txt"), String(CONFIG.steam.appIdTeste) + "\n");
    else if (fs.existsSync(path.join(destino, "steam_appid.txt"))) fs.rmSync(path.join(destino, "steam_appid.txt"));
    console.log(`  ✔ dist/${alvo.nome}/`);
  }
  fs.rmSync(path.join(saida, "_tmp"), { recursive: true, force: true });

  console.log(`\nPronto${teste ? " (build de TESTE — não envie para a Steam)" : ""}. Próximos passos:`);
  console.log("  1. Teste a pasta dist/ (abra o executável). Em Linux/Steam Deck use o terminal para ver mensagens.");
  console.log(teste ? "  2. Para publicar: MODO_TESTE = false, preencha appId/depots e rode `npm run build:steam`." : "  2. npm run vdf   (gera os scripts do SteamPipe)\n  3. npm run enviar:simular   (mostra o que seria enviado)\n  4. npm run enviar");
})().catch((e) => { console.error("\n✖ Erro no build:", e && e.message ? e.message : e); process.exit(1); });
