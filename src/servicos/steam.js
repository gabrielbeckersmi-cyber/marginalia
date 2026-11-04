// SERVIÇO STEAM (lado do jogo) — conquistas, estatísticas, presença e sincronização.
//
// Regras que este arquivo garante:
//  1. O jogo NUNCA trava por causa da Steam: sem Steam (navegador, .exe aberto direto, Steam offline) tudo continua
//     funcionando e as conquistas ficam registradas no save local (estado.conquistas[id].enviada = false).
//  2. Assim que a Steam estiver disponível, sincronizar() envia o que faltou — e também traz para o save local
//     o que a Steam já tem (jogador que instalou em outro PC).
//  3. Só IDs que existem no CONFIGURE-AQUI.js são aceitos (o main.cjs valida de novo do outro lado).
import CONFIG from "../../CONFIGURE-AQUI.js";
import { P } from "../nucleo/plataforma.js";

let info = { modo: "navegador", disponivel: false, nome: "", idioma: null, noDeck: false, appId: 0, erro: null, nuvemAtiva: false };
let aoDesbloquear = () => {};
const idsConquistas = new Set(CONFIG.conquistas.map((c) => c.id));

export const obterInfo = () => info;
/** A interface registra aqui o que fazer ao desbloquear (ex.: mostrar um aviso na tela). */
export function aoConquistar(fn) { aoDesbloquear = fn; }

export async function iniciar(estado) {
  try { info = await P.steam.iniciar(); } catch (e) { console.warn("[steam]", e); }
  await sincronizar(estado);
  return info;
}

/** Desbloqueia uma conquista (idempotente). Devolve true se foi NOVA. */
export function desbloquear(estado, id) {
  if (!idsConquistas.has(id) || estado.conquistas[id]) return false;
  const registro = { ts: Date.now(), enviada: false };
  estado.conquistas[id] = registro;
  if (info.disponivel) {
    P.steam.conquista(id).then((ok) => { if (ok) registro.enviada = true; }).catch(() => {});
  }
  aoDesbloquear(id);
  return true;
}

/** Envia pendentes para a Steam e traz as que a Steam já tem. */
export async function sincronizar(estado) {
  if (!info.disponivel) return;
  for (const c of CONFIG.conquistas) {
    const local = estado.conquistas[c.id];
    if (local && !local.enviada) { if (await P.steam.conquista(c.id)) local.enviada = true; }
    else if (!local && (await P.steam.conquistaAtiva(c.id))) estado.conquistas[c.id] = { ts: Date.now(), enviada: true };
  }
  // Estatísticas nunca diminuem: vale o maior valor entre save local e Steam.
  for (const s of CONFIG.stats || []) {
    const remoto = await P.steam.statLer(s.id);
    const chaveLocal = s.id === "DIAS_SOBREVIVIDOS" ? "melhorDias" : null;
    if (chaveLocal && typeof remoto === "number") estado[chaveLocal] = Math.max(estado[chaveLocal] || 0, remoto);
  }
}

export function stat(nome, valor) { if (info.disponivel) P.steam.stat(nome, valor).catch(() => {}); }

/** Rich Presence: o que aparece para os amigos. Precisa do arquivo de localização no Steamworks (loja/rich-presence.txt). */
export function presenca(chave, valor) { if (info.disponivel) P.steam.presenca(chave, valor).catch(() => {}); }

export const dlcInstalado = (appId) => (info.disponivel ? P.steam.dlc(appId) : Promise.resolve(false));
