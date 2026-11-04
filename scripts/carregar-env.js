/* Lê o arquivo .env (se existir) para process.env, sem dependências.
 * O .env guarda SENHAS e nunca é versionado (veja .gitignore). */
const fs = require("fs");
const path = require("path");

function carregarEnv(raiz) {
  const arq = path.join(raiz, ".env");
  if (!fs.existsSync(arq)) return;
  for (const linha of fs.readFileSync(arq, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || linha.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
module.exports = { carregarEnv };
