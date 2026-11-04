#!/usr/bin/env node
/* Gera o ASSETS.md (lista de imagens) a partir de src/assets-manifest.cjs. Roda no "npm run build". */
const fs = require("fs");
const path = require("path");
const raiz = path.resolve(__dirname, "..");
const M = require(path.join(raiz, "src", "assets-manifest.cjs"));

const L = [];
L.push("# ASSETS — imagens do jogo e da página da Steam", "");
L.push("> Arquivo GERADO a partir de `src/assets-manifest.cjs` (não edite aqui; edite o manifesto e rode `npm run build`).", "");
L.push("**Como trocar a arte:** salve o arquivo com EXATAMENTE o nome da coluna *Arquivo* em `public/assets/` e rode `npm run build`.");
L.push("Sem o arquivo, o jogo desenha uma versão vetorial neon no lugar — nada quebra.", "");
L.push("## Dentro do jogo (`public/assets/`)", "");
L.push("| Arquivo | Para quê | Tamanho | Fundo |", "|---|---|---|---|");
for (const a of M.assets) L.push(`| \`${a.arquivo}\` | ${a.descricao} | ${a.largura}×${a.altura}px | ${a.transparente ? "transparente (PNG)" : "opaco"} |`);
L.push("", "## Página da loja Steam (você envia no Steamworks; ficam em `loja/`)", "");
L.push("| Item | Tamanho | Formato | Observação |", "|---|---|---|---|");
for (const l of M.loja) L.push(`| ${l.item} | ${l.tamanho} | ${l.formato} | ${l.obs} |`);
L.push("", "Nomes esperados pelo `npm run verificar:loja`: `loja/capsula_cabecalho.png`, `loja/capsula_pequena.png`, `loja/capsula_principal.png`, `loja/capsula_vertical.png`, `loja/capturas/*.png` (mínimo 5), `loja/icone.ico`.", "");
fs.writeFileSync(path.join(raiz, "ASSETS.md"), L.join("\n"));
console.log(`ASSETS.md gerado (${M.assets.length} assets do jogo).`);
