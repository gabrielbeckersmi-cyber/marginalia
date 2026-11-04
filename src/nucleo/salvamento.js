// SALVAMENTO — progresso local + Steam Cloud, sempre mesclados (nunca perde conquista nem recorde).
//
// • Local: arquivo na pasta de dados do jogador (gravação atômica feita pelo Electron) + cópia de segurança.
// • Nuvem: o mesmo conteúdo vai para a Steam Cloud (se ativada no Steamworks e no CONFIGURE-AQUI.js).
//   ⚠ Para a nuvem funcionar: Steamworks → App Admin → Steam Cloud Settings → defina "Byte quota per user" (ex.: 1 MB) e
//     "Number of files allowed per user" (ex.: 10), clique Save e depois Publish. Não precisa cadastrar o nome do arquivo.
// • Cada gravação leva um carimbo (hash). Edição manual casual invalida o arquivo. É proteção BÁSICA, não anti-cheat.
// • Ao abrir: lê local, backup e nuvem; escolhe o mais recente e MESCLA o que não pode regredir (via `mesclar`).
import { P } from "./plataforma.js";

const ARQ = "save.json";
const ARQ_BACKUP = "save_backup.json";
const SAL = "troque-por-um-texto-qualquer-do-seu-jogo"; // mude para algo seu (só dificulta edição casual)

function carimbo(texto) {
  let h = 0x811c9dc5; // FNV-1a 32 bits
  const s = texto + SAL;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
const empacotar = (estado) => { const d = JSON.stringify(estado); return JSON.stringify({ d, h: carimbo(d) }); };
function desempacotar(texto) {
  if (!texto) return null;
  try { const { d, h } = JSON.parse(texto); return carimbo(d) === h ? JSON.parse(d) : null; } catch { return null; }
}

/**
 * @param {() => object} novoEstado  estado inicial
 * @param {(s: object) => object} migrar  converte saves de versões antigas
 * @param {(novo: object, outro: object) => object} mesclar  traz de `outro` o que não pode se perder
 */
export async function carregar(novoEstado, migrar, mesclar) {
  const lidos = [];
  for (const nome of [ARQ, ARQ_BACKUP]) { const s = desempacotar(await P.arquivo.ler(nome)); if (s) lidos.push(s); }
  const nuvem = desempacotar(await P.steam.nuvemLer(ARQ));
  if (nuvem) lidos.push(nuvem);
  if (!lidos.length) return novoEstado();
  lidos.sort((a, b) => (b.ts || 0) - (a.ts || 0)); // mais recente primeiro
  let base = migrar({ ...novoEstado(), ...lidos[0] });
  for (const outro of lidos.slice(1)) base = mesclar(base, migrar({ ...novoEstado(), ...outro }));
  return base;
}

let gravando = Promise.resolve();
/** Grava local e na nuvem. Chamadas seguidas são enfileiradas (nunca duas gravações ao mesmo tempo). */
export function salvar(estado) {
  estado.ts = Date.now();
  const conteudo = empacotar(estado);
  gravando = gravando.then(async () => {
    const anterior = await P.arquivo.ler(ARQ);
    if (anterior) await P.arquivo.gravar(ARQ_BACKUP, anterior);
    await P.arquivo.gravar(ARQ, conteudo);
    await P.steam.nuvemGravar(ARQ, conteudo);
  }).catch((e) => console.warn("[save]", e));
  return gravando;
}

export async function apagar() {
  await P.arquivo.gravar(ARQ, "");
  await P.arquivo.gravar(ARQ_BACKUP, "");
}
