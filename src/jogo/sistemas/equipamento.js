// EQUIPAMENTO — o que o jogador segura (mão: arma/ferramenta) e veste (escudo). Só guarda o NOME do item; ele continua na mochila.
// Se o item sair da mochila (vendido, descartado), deixa de valer sozinho — por isso sempre se lê com equipado().
import { ITENS } from "../dados/itens.js";
import * as inv from "./inventario.js";

export const SLOTS = { mao: "Mão", escudo: "Escudo" };
export const slotDe = (item) => { const d = ITENS[item]; if (!d) return null; if (d.defesa) return "escudo"; if (d.ferramenta || d.arma) return "mao"; return null; };
export const equipado = (e, slot) => { const q = e.equip && e.equip[slot]; return q && inv.tem(e, q) ? q : null; };
export const estaEquipado = (e, item) => { const s = slotDe(item); return !!s && equipado(e, s) === item; };
export function equipar(e, item) {
  const s = slotDe(item); if (!s || !inv.tem(e, item)) return false;
  e.equip = e.equip || { mao: null, escudo: null }; e.equip[s] = item; return true;
}
export function desequipar(e, slot) { if (e.equip) e.equip[slot] = null; }
/** Dano base da arma na mão (punhos = 3). */
export const danoDaMao = (e) => { const m = equipado(e, "mao"); return m && ITENS[m].arma ? ITENS[m].arma : 3; };
/** Multiplicador de dano recebido (escudo equipado = 0,75). */
export const fatorDefesa = (e) => (equipado(e, "escudo") ? 1 - ITENS.escudo.defesa : 1);
