#!/usr/bin/env node
/* Verifica o CONFIGURE-AQUI.js e diz, em português, o que ainda falta.
 *
 *   npm run verificar            → confere tudo; pendências de publicação viram AVISOS no modo teste
 *   npm run verificar:producao   → exige tudo pronto para publicar (erro se MODO_TESTE = true)
 *
 * Código de saída: 0 = sem erros, 1 = há erros.
 */
const path = require("path");
const fs = require("fs");
const { carregarEnv } = require("./carregar-env");

const raiz = path.resolve(__dirname, "..");
carregarEnv(raiz);
const CONFIG = require(path.join(raiz, "CONFIGURE-AQUI.js"));

const exigirProducao = process.argv.includes("--producao");
const emProducao = exigirProducao || CONFIG.MODO_TESTE === false;

const cor = (c, s) => (process.stdout.isTTY ? `\x1b[${c}m${s}\x1b[0m` : s);
const erros = [], avisos = [], oks = [];
const erro = (m) => erros.push(m), aviso = (m) => avisos.push(m), ok = (m) => oks.push(m);
const vazio = (v) => v === undefined || v === null || String(v).trim() === "";
const inteiroPositivo = (v) => Number.isInteger(v) && v > 0;
const pendencia = (m) => (emProducao ? erro(m) : aviso(m + "  (necessário antes de publicar)"));

// ── Modo teste ─────────────────────────────────────────────────────────────
if (CONFIG.MODO_TESTE) {
  if (exigirProducao) erro("MODO_TESTE está true. Mude para false no CONFIGURE-AQUI.js para gerar a versão de publicação.");
  else aviso("MODO_TESTE = true: usa o AppID 480 (Spacewar) e deixa o DevTools (F12) ligado. Normal durante o desenvolvimento.");
} else ok("MODO_TESTE = false (versão de publicação).");

// ── Jogo ───────────────────────────────────────────────────────────────────
const j = CONFIG.jogo || {};
if (vazio(j.nome) || /\{\{/.test(j.nome)) erro("jogo.nome está vazio ou ainda tem {{marcador}}.");
else ok(`Nome do jogo: "${j.nome}"`);
if (!/^[A-Za-z0-9_-]{1,40}$/.test(j.executavel || "") || /\{\{/.test(j.executavel || ""))
  erro(`jogo.executavel "${j.executavel}" é inválido. Use só letras, números, _ e - (sem espaços ou acentos). Ex.: ArenaNeon`);
else ok(`Executável: ${j.executavel}.exe (Windows) / ${j.executavel} (Linux)`);
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_-]*)+$/.test(j.idPacote || "") || /\{\{/.test(j.idPacote || "")) erro(`jogo.idPacote "${j.idPacote}" é inválido (ex.: com.seunome.arenaneon).`);
if (!/^\d+\.\d+\.\d+$/.test(String(j.versao))) erro(`jogo.versao "${j.versao}" deve ser como 1.0.0.`);
if (vazio(j.desenvolvedor)) pendencia("jogo.desenvolvedor vazio (aparece nos metadados do .exe).");
if (vazio(j.copyright)) aviso("jogo.copyright vazio (ex.: \"© 2026 Seu Nome\").");

// ── Janela ─────────────────────────────────────────────────────────────────
const w = CONFIG.janela || {}, r = w.resolucaoLogica || {};
if (!inteiroPositivo(r.largura) || !inteiroPositivo(r.altura)) erro("janela.resolucaoLogica precisa de largura e altura inteiras.");
else if (Math.abs(r.largura / r.altura - 16 / 9) > 0.01) aviso(`Resolução lógica ${r.largura}×${r.altura} não é 16:9; haverá barras pretas em telas 16:9 (e o Steam Deck é 16:10).`);
if (!inteiroPositivo(w.larguraInicial) || !inteiroPositivo(w.alturaInicial)) erro("janela.larguraInicial/alturaInicial devem ser inteiros positivos.");

// ── Steam ──────────────────────────────────────────────────────────────────
const s = CONFIG.steam || {};
const pl = CONFIG.plataformas || {};
if (!pl.windows && !pl.linux) erro("Nenhuma plataforma marcada em plataformas (windows/linux).");
if (s.appId === 0 || s.appId === undefined) pendencia("steam.appId = 0. Crie o app em partner.steamgames.com e coloque o número aqui.");
else if (!inteiroPositivo(s.appId)) erro(`steam.appId "${s.appId}" deve ser um número inteiro.`);
else if (s.appId === 480) erro("steam.appId = 480 é o app de testes da Valve (Spacewar). Coloque o AppID do SEU jogo.");
else ok(`AppID: ${s.appId}`);
if (s.testarComAppIdProprio && !(s.appId > 0)) erro("steam.testarComAppIdProprio = true, mas steam.appId ainda é 0.");
if (s.appIdTeste !== 480) aviso("steam.appIdTeste normalmente é 480 (Spacewar). Só mude se souber o que está fazendo.");

const ids = [];
for (const p of ["windows", "linux"]) {
  if (!pl[p]) continue;
  const d = s.depots && s.depots[p];
  if (!d) pendencia(`steam.depots.${p} = 0, mas a plataforma "${p}" está ligada (Steamworks → App Admin → SteamPipe → Depots).`);
  else if (!inteiroPositivo(d)) erro(`steam.depots.${p} "${d}" deve ser um número inteiro.`);
  else { ids.push(d); if (d === s.appId) erro(`steam.depots.${p} não pode ser igual ao AppID (o depot é outro número).`); }
}
if (new Set(ids).size !== ids.length) erro("steam.depots: cada plataforma precisa do seu PRÓPRIO depot (ids repetidos).");
if (s.branchSetLive === "default") erro('steam.branchSetLive = "default" é o ramo PÚBLICO. Deixe "" e ative o build pelo Steamworks, depois de testar.');
else if (!vazio(s.branchSetLive) && !/^[A-Za-z0-9_-]{1,32}$/.test(s.branchSetLive)) erro(`steam.branchSetLive "${s.branchSetLive}" é inválido.`);
if (vazio(s.usuarioBuild)) pendencia("steam.usuarioBuild vazio (conta Steam usada só para enviar builds).");
if (s.exigirSteam && CONFIG.MODO_TESTE) aviso("steam.exigirSteam = true: em MODO_TESTE a exigência é ignorada (para você poder testar sem a Steam).");
for (const d of s.dlcs || []) if (!inteiroPositivo(d.appId) || vazio(d.nome)) erro(`steam.dlcs: cada DLC precisa de appId (número) e nome. Problema em: ${JSON.stringify(d)}`);

// ── Conquistas e stats ─────────────────────────────────────────────────────
const idiomas = (CONFIG.idiomas && CONFIG.idiomas.disponiveis) || [];
const conquistas = CONFIG.conquistas || [];
if (!conquistas.length) aviso("Nenhuma conquista configurada. Conquistas são opcionais, mas jogadores da Steam esperam algumas.");
if (conquistas.length > 100) erro(`${conquistas.length} conquistas; o limite inicial da Steam é 100.`);
const vistas = new Set();
for (const c of conquistas) {
  const rot = `conquista "${c.id}"`;
  if (!/^[A-Za-z0-9_]{1,128}$/.test(c.id || "")) { erro(`${rot}: id inválido (use letras, números e _; até 128).`); continue; }
  if (vistas.has(c.id)) erro(`${rot}: id repetido.`);
  vistas.add(c.id);
  for (const i of idiomas) {
    if (vazio(c.nome && c.nome[i])) erro(`${rot}: falta o nome em "${i}".`);
    if (vazio(c.descricao && c.descricao[i])) erro(`${rot}: falta a descrição em "${i}".`);
  }
}
if (conquistas.length && !erros.some((e) => e.startsWith("conquista"))) ok(`${conquistas.length} conquista(s) válidas. Cadastre os MESMOS ids (API Name) no Steamworks: npm run listar-conquistas`);
const statsVistas = new Set();
for (const st of CONFIG.stats || []) {
  if (!/^[A-Za-z0-9_]{1,128}$/.test(st.id || "")) erro(`stat "${st.id}": id inválido.`);
  if (statsVistas.has(st.id)) erro(`stat "${st.id}": id repetido.`);
  statsVistas.add(st.id);
  if (st.tipo !== "int") erro(`stat "${st.id}": só o tipo "int" é suportado neste template.`);
  if (vistas.has(st.id)) erro(`stat "${st.id}" tem o mesmo id de uma conquista.`);
}

// ── Idiomas ────────────────────────────────────────────────────────────────
const idi = CONFIG.idiomas || {};
if (!idiomas.includes(idi.padrao)) erro("idiomas.padrao precisa estar em idiomas.disponiveis.");
for (const i of idiomas) if (!fs.existsSync(path.join(raiz, "src", "idiomas", i + ".js"))) erro(`Falta o arquivo de textos src/idiomas/${i}.js`);

// ── Arquivos ───────────────────────────────────────────────────────────────
if (emProducao && !fs.existsSync(path.join(raiz, j.icone || "loja/icone.ico"))) aviso(`Ícone ${j.icone || "loja/icone.ico"} não encontrado: o .exe sairá com o ícone padrão do Electron.`);
if (!process.env.STEAMCMD) aviso("Variável STEAMCMD não definida (.env): necessária só para `npm run enviar` (caminho do steamcmd).");

// ── Relatório ──────────────────────────────────────────────────────────────
console.log(cor(1, `\nVerificação do CONFIGURE-AQUI.js  (${emProducao ? "modo PUBLICAÇÃO" : "modo desenvolvimento"})\n`));
oks.forEach((m) => console.log(cor(32, "  ✔ ") + m));
avisos.forEach((m) => console.log(cor(33, "  ⚠ ") + m));
erros.forEach((m) => console.log(cor(31, "  ✖ ") + m));
console.log("\n" + (erros.length
  ? cor(31, `${erros.length} erro(s) para corrigir`) + (avisos.length ? `, ${avisos.length} aviso(s).` : ".")
  : cor(32, "Nenhum erro.") + (avisos.length ? ` ${avisos.length} aviso(s) acima.` : " Tudo certo!")) + "\n");
process.exit(erros.length ? 1 : 0);
