#!/usr/bin/env node
/* Mostra as conquistas e estatísticas como você deve cadastrá-las no Steamworks
 * (App Admin → Stats & Achievements) e grava loja/conquistas.csv para consulta.
 * Os "API Name" precisam ser IDÊNTICOS aos do jogo. */
const fs = require("fs");
const path = require("path");
const raiz = path.resolve(__dirname, "..");
const CONFIG = require(path.join(raiz, "CONFIGURE-AQUI.js"));

console.log("\nCONQUISTAS (cadastre em Steamworks → Stats & Achievements → Achievements)\n");
const linhas = [["API Name", "Oculta", "Idioma", "Nome", "Descrição", "Ícone desbloqueado (256×256)", "Ícone bloqueado (256×256)"]];
for (const c of CONFIG.conquistas) {
  console.log(`  ${c.id}${c.oculta ? "   [OCULTA]" : ""}`);
  for (const i of CONFIG.idiomas.disponiveis) {
    console.log(`     ${i}: ${c.nome[i]} — ${c.descricao[i]}`);
    linhas.push([c.id, c.oculta ? "sim" : "não", i, c.nome[i], c.descricao[i], `${c.id.toLowerCase()}.jpg`, `${c.id.toLowerCase()}_bloqueada.jpg`]);
  }
}
console.log("\nESTATÍSTICAS (Stats & Achievements → Stats; tipo INT, valor inicial 0)\n");
for (const s of CONFIG.stats || []) console.log(`  ${s.id}  (int)`);
console.log("\nLembrete: depois de cadastrar, clique em *Publish* na página do app no Steamworks para as conquistas valerem.\n");
const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
fs.mkdirSync(path.join(raiz, "loja"), { recursive: true });
fs.writeFileSync(path.join(raiz, "loja", "conquistas.csv"), "﻿" + csv);
console.log("Tabela gravada em loja/conquistas.csv\n");
