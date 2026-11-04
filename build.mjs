// Compila o jogo: src/ → www/ (pasta que o Electron serve em app://jogo/).
//   node build.mjs            → build de produção (minificado)
//   node build.mjs --servir   → servidor local em http://localhost:5173 com recompilação automática
//                               (bom para ajustar o jogo rápido no navegador; sem Steam)
import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const servir = process.argv.includes("--servir");

await rm("www", { recursive: true, force: true });
await mkdir("www", { recursive: true });
await cp("public", "www", { recursive: true });

const opcoes = {
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  target: ["chrome120"],           // Chromium embutido no Electron: moderno
  outfile: "www/app.js",
  minify: !servir,
  sourcemap: servir,
  logLevel: "info",
  loader: { ".cjs": "js" },
};

if (servir) {
  const ctx = await context(opcoes);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: "www", port: 5173 });
  console.log(`\nJogo rodando em http://localhost:${port}  (no navegador a Steam é SIMULADA: conquistas ficam só no save local)\n`);
} else {
  await build(opcoes);
}
