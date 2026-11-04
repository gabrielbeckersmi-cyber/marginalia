#!/usr/bin/env node
/* Envia o conteúdo de dist/ para a Steam usando o steamcmd (SteamPipe).
 *
 *   npm run enviar:simular   → mostra o comando e confere tudo, SEM enviar
 *   npm run enviar           → envia (o steamcmd pede a senha e o código Steam Guard na hora)
 *
 * Segurança:
 *  • a senha NUNCA é lida, salva ou passada por este script: o steamcmd pergunta direto a você;
 *  • recusa enviar em MODO_TESTE, com depots/AppID zerados, ou ativando o ramo público ("default");
 *  • enviar NÃO publica o jogo: o build só fica disponível para você; liberar para os jogadores é um passo manual no Steamworks.
 */
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const { spawnSync } = require("child_process");
const { carregarEnv } = require("./carregar-env");
const { gerar } = require("./gerar-vdf");

const raiz = path.resolve(__dirname, "..");
carregarEnv(raiz);
const CONFIG = require(path.join(raiz, "CONFIGURE-AQUI.js"));
const simular = process.argv.includes("--simular");
const falhar = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };

if (CONFIG.MODO_TESTE && !simular) falhar("MODO_TESTE está true. Gere o build de publicação (MODO_TESTE = false) antes de enviar.");
if (!CONFIG.steam.usuarioBuild) falhar("Preencha steam.usuarioBuild no CONFIGURE-AQUI.js (conta Steam usada para enviar builds).");

let r;
try { r = gerar(); } catch (e) { falhar(e.message); }

for (const [nome, ligado] of Object.entries(CONFIG.plataformas)) {
  if (!ligado) continue;
  const pasta = path.join(raiz, "dist", nome);
  const exe = nome === "windows" ? CONFIG.jogo.executavel + ".exe" : CONFIG.jogo.executavel;
  if (!fs.existsSync(path.join(pasta, exe))) falhar(`Não achei dist/${nome}/${exe}. Rode antes: npm run build:steam`);
  if (fs.existsSync(path.join(pasta, "steam_appid.txt"))) falhar(`dist/${nome} tem um steam_appid.txt (build de TESTE). Gere o build de publicação.`);
}

const steamcmd = process.env.STEAMCMD || "steamcmd";
const vdf = path.join(r.pasta, "app_build.vdf");
const args = ["+login", CONFIG.steam.usuarioBuild, "+run_app_build", vdf, "+quit"];

console.log("\nComando que será executado:\n  " + [steamcmd, ...args].join(" ") + "\n");
console.log(`App ${CONFIG.steam.appId} · versão ${CONFIG.jogo.versao} · ramo ativado automaticamente: ${CONFIG.steam.branchSetLive ? '"' + CONFIG.steam.branchSetLive + '"' : "NENHUM (você ativa no Steamworks)"}`);
if (simular) { console.log("\n(simulação: nada foi enviado)\n"); process.exit(0); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Digite o AppID para confirmar o envio: ', (resp) => {
  rl.close();
  if (resp.trim() !== String(CONFIG.steam.appId)) falhar("AppID não confere. Envio cancelado.");
  const res = spawnSync(steamcmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (res.error) falhar(`Não consegui executar o steamcmd (${res.error.message}). Defina STEAMCMD no .env com o caminho completo.`);
  if (res.status !== 0) falhar("O steamcmd terminou com erro. Veja as mensagens acima.");
  console.log("\n✔ Build enviado. Próximo passo: Steamworks → App Admin → SteamPipe → Builds → defina o build no ramo desejado.\n");
});
