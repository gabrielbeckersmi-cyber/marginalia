#!/usr/bin/env node
/* Confere os arquivos da página da loja Steam na pasta loja/: existem? têm o tamanho certo?
 * Não precisa de bibliotecas: lê o tamanho direto do cabeçalho do PNG/JPG/ICO.
 * Tamanhos conforme a documentação da Steam (confirme no Steamworks → Store Presence → Graphical Assets). */
const fs = require("fs");
const path = require("path");
const raiz = path.resolve(__dirname, "..");
const loja = path.join(raiz, "loja");
const cor = (c, s) => (process.stdout.isTTY ? `\x1b[${c}m${s}\x1b[0m` : s);

function dimensoes(arq) {
  const b = fs.readFileSync(arq);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { l: b.readUInt32BE(16), a: b.readUInt32BE(20), tipo: "png" };
  if (b[0] === 0xff && b[1] === 0xd8) { // JPEG: procura o marcador SOFn
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { l: b.readUInt16BE(i + 7), a: b.readUInt16BE(i + 5), tipo: "jpg" };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (b.length > 6 && b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1) { // ICO: maior imagem
    let l = 0, a = 0;
    for (let k = 0; k < b.readUInt16LE(4); k++) { const w = b[6 + k * 16] || 256, h = b[7 + k * 16] || 256; if (w > l) { l = w; a = h; } }
    return { l, a, tipo: "ico" };
  }
  return null;
}
function achar(base) {
  for (const ext of [".png", ".jpg", ".jpeg"]) { const p = path.join(loja, base + ext); if (fs.existsSync(p)) return p; }
  return null;
}

const erros = [], avisos = [], oks = [];
const exatos = [
  ["capsula_cabecalho", 920, 430, "Cápsula de cabeçalho"],
  ["capsula_pequena", 462, 174, "Cápsula pequena"],
  ["capsula_principal", 1232, 706, "Cápsula principal"],
  ["capsula_vertical", 748, 896, "Cápsula vertical"],
];
for (const [base, l, a, nome] of exatos) {
  const arq = achar(base);
  if (!arq) { erros.push(`Falta loja/${base}.png — ${nome} (${l}×${a}).`); continue; }
  const d = dimensoes(arq);
  if (!d) erros.push(`${path.basename(arq)} não é uma imagem PNG/JPG válida.`);
  else if (d.l !== l || d.a !== a) erros.push(`${path.basename(arq)} tem ${d.l}×${d.a}; precisa ser ${l}×${a}.`);
  else oks.push(`${nome}: ${l}×${a} ✔`);
}
const pastaCap = path.join(loja, "capturas");
const caps = fs.existsSync(pastaCap) ? fs.readdirSync(pastaCap).filter((f) => /\.(png|jpe?g)$/i.test(f)) : [];
if (caps.length < 5) erros.push(`Só ${caps.length} captura(s) em loja/capturas/; a Steam exige pelo menos 5 (≥ 1920×1080, 16:9).`);
let capsBoas = 0;
for (const f of caps) {
  const d = dimensoes(path.join(pastaCap, f));
  if (!d) { erros.push(`capturas/${f} não é uma imagem válida.`); continue; }
  if (d.l < 1920 || d.a < 1080) erros.push(`capturas/${f} tem ${d.l}×${d.a}; mínimo 1920×1080.`);
  else if (Math.abs(d.l / d.a - 16 / 9) > 0.02) avisos.push(`capturas/${f} (${d.l}×${d.a}) não é 16:9.`);
  else capsBoas++;
}
if (caps.length >= 5 && capsBoas >= 5) oks.push(`${capsBoas} capturas de tela ✔ (lembre: só imagens do jogo, sem logo ou texto de venda).`);
const ico = path.join(loja, "icone.ico");
if (!fs.existsSync(ico)) avisos.push("Falta loja/icone.ico (≥ 256×256) — o .exe usará o ícone padrão do Electron.");
else { const d = dimensoes(ico); if (!d || d.l < 256) avisos.push("loja/icone.ico deveria ter uma imagem de pelo menos 256×256."); else oks.push("Ícone .ico ✔"); }
if (!fs.existsSync(path.join(loja, "pagina-da-loja.md"))) avisos.push("Falta loja/pagina-da-loja.md (rascunho dos textos da loja) — veja loja/LEIA-ME.md.");

console.log(cor(1, "\nVerificação dos arquivos da página da loja Steam\n"));
oks.forEach((m) => console.log(cor(32, "  ✔ ") + m));
avisos.forEach((m) => console.log(cor(33, "  ⚠ ") + m));
erros.forEach((m) => console.log(cor(31, "  ✖ ") + m));
console.log("\n" + (erros.length ? cor(31, `${erros.length} pendência(s) obrigatória(s).`) : cor(32, "Arquivos da loja prontos.")) + "\n");
process.exit(erros.length ? 1 : 0);
