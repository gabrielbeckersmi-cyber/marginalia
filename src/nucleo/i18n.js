// TEXTOS E IDIOMAS — todo texto visível fica em src/idiomas/<idioma>.js (nunca direto no código).
// Para adicionar um idioma: crie src/idiomas/es.js, importe aqui, adicione em TEXTOS e em idiomas.disponiveis (CONFIGURE-AQUI.js)
// — e marque o idioma também na página da loja (Steamworks → Supported Languages).
import CONFIG from "../../CONFIGURE-AQUI.js";
import pt from "../idiomas/pt.js";
import en from "../idiomas/en.js";

const TEXTOS = { pt, en };
let atual = CONFIG.idiomas.padrao;

// Nomes de idioma da Steam (apps.currentGameLanguage) → nosso código.
const IDIOMA_STEAM = { brazilian: "pt", portuguese: "pt", english: "en", spanish: "es", latam: "es", french: "fr", german: "de", italian: "it", russian: "ru", schinese: "zh", tchinese: "zh", japanese: "ja", koreana: "ko" };

/** Preferência salva > idioma da Steam > idioma do sistema > padrão (só entre os disponíveis). */
export function iniciarIdioma(preferido, idiomaSteam) {
  const doSistema = (navigator.language || "").slice(0, 2).toLowerCase();
  const daSteam = IDIOMA_STEAM[String(idiomaSteam || "").toLowerCase()];
  atual = [preferido, daSteam, doSistema, CONFIG.idiomas.padrao].find((i) => i && CONFIG.idiomas.disponiveis.includes(i) && TEXTOS[i]) || CONFIG.idiomas.padrao;
  document.documentElement.lang = atual;
  return atual;
}
export const idiomaAtual = () => atual;
export function trocarIdioma(codigo) { if (TEXTOS[codigo] && CONFIG.idiomas.disponiveis.includes(codigo)) { atual = codigo; document.documentElement.lang = codigo; } }

/** t("chave", { n: 5 }) → troca {n}. Falta a chave? cai no idioma padrão e depois mostra a própria chave. */
export function t(chave, vars = {}) {
  const base = TEXTOS[atual]?.[chave] ?? TEXTOS[CONFIG.idiomas.padrao]?.[chave] ?? chave;
  return String(base).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

/** Texto de um campo {pt, en} do CONFIGURE-AQUI.js (nome/descrição de conquista) no idioma atual. */
export const local = (obj) => (obj && (obj[atual] ?? obj[CONFIG.idiomas.padrao] ?? Object.values(obj)[0])) || "";

export const numero = (n) => Math.floor(n).toLocaleString(atual === "pt" ? "pt-BR" : "en-US");
