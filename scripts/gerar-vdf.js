#!/usr/bin/env node
/* Gera os scripts do SteamPipe (app_build.vdf e depot_build_*.vdf) em steam-build/ a partir do CONFIGURE-AQUI.js.
 * ⚠ O formato segue os exemplos do SDK da Steam (sdk/tools/ContentBuilder/scripts). Se a Valve mudar algo, compare com eles. */
const fs = require("fs");
const path = require("path");
const raiz = path.resolve(__dirname, "..");
const CONFIG = require(path.join(raiz, "CONFIGURE-AQUI.js"));

function gerar({ exigirTudo = true } = {}) {
  const s = CONFIG.steam;
  const problemas = [];
  if (!(s.appId > 0)) problemas.push("steam.appId ainda é 0.");
  const depots = [];
  for (const [nome, ligado] of Object.entries(CONFIG.plataformas)) {
    if (!ligado) continue;
    const id = s.depots[nome];
    if (!(id > 0)) problemas.push(`steam.depots.${nome} ainda é 0.`);
    else depots.push({ nome, id });
  }
  if (s.branchSetLive === "default") problemas.push('branchSetLive = "default" não é permitido.');
  if (exigirTudo && problemas.length) throw new Error(problemas.join(" "));

  const dist = path.join(raiz, "dist");
  const pasta = path.join(raiz, "steam-build");
  fs.mkdirSync(path.join(pasta, "saida"), { recursive: true });
  const q = (v) => String(v).replace(/"/g, "'");
  const comBarra = (p) => p + path.sep;

  const arquivos = {};
  for (const d of depots) {
    arquivos[`depot_build_${d.id}.vdf`] = [
      '"DepotBuildConfig"', "{",
      `\t"DepotID" "${d.id}"`,
      `\t"ContentRoot" "${q(comBarra(path.join(dist, d.nome)))}"`,
      '\t"FileMapping"', "\t{",
      '\t\t"LocalPath" "*"', '\t\t"DepotPath" "."', '\t\t"Recursive" "1"', "\t}",
      '\t"FileExclusion" "*.pdb"',
      '\t"FileExclusion" "steam_appid.txt"', // nunca enviar o steam_appid.txt de teste
      "}", "",
    ].join("\n");
  }
  arquivos["app_build.vdf"] = [
    '"AppBuild"', "{",
    `\t"AppID" "${s.appId}"`,
    `\t"Desc" "${q(CONFIG.jogo.nome)} v${CONFIG.jogo.versao}"`,
    `\t"BuildOutput" "${q(comBarra(path.join(pasta, "saida")))}"`,
    `\t"ContentRoot" "${q(comBarra(dist))}"`,
    `\t"SetLive" "${q(s.branchSetLive || "")}"`,
    '\t"Depots"', "\t{",
    ...depots.map((d) => `\t\t"${d.id}" "depot_build_${d.id}.vdf"`),
    "\t}", "}", "",
  ].join("\n");

  for (const [nome, conteudo] of Object.entries(arquivos)) fs.writeFileSync(path.join(pasta, nome), conteudo);
  return { pasta, arquivos: Object.keys(arquivos), problemas };
}

module.exports = { gerar };
if (require.main === module) {
  try {
    const r = gerar();
    console.log(`\nScripts do SteamPipe gerados em ${path.relative(raiz, r.pasta)}/:`);
    r.arquivos.forEach((a) => console.log("  • " + a));
    console.log(`\nSetLive = "${CONFIG.steam.branchSetLive}"  (vazio = nada é ativado automaticamente; ative no Steamworks)\n`);
  } catch (e) { console.error("\n✖ " + e.message + "\n  Preencha o CONFIGURE-AQUI.js (seção 4) e rode de novo.\n"); process.exit(1); }
}
