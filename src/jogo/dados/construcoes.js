// CONSTRUÇÕES — tamanho (tiles), requisitos de habilidade (req), materiais totais (mat), tempo base (s no nível 1 de habilidade).
// receitas: { saida, qtd, ins, base (s), hab, nivel }  ·  vende: itens que o negócio vende (só vende; mercado compra e vende).
export const CONSTR = {
  tenda: { nome: "Tenda", w: 2, h: 2, req: { construcao: 1 }, mat: { fibra: 6, couro: 2 }, tempo: 20, sprite: ["constr_1", 3], tam: 135, moradia: true },
  cabana: { nome: "Cabana", w: 3, h: 3, req: { construcao: 1 }, mat: { madeira: 12, fibra: 8 }, tempo: 50, sprite: ["constr_1", 0], tam: 215, moradia: true },
  casa: { nome: "Casa", w: 4, h: 4, req: { construcao: 8 }, mat: { madeira: 24, pedra: 10, fibra: 10 }, tempo: 140, sprite: ["constr_1", 1], tam: 270, moradia: true },
  poco: { nome: "Poço", w: 2, h: 2, req: { construcao: 1 }, mat: { pedra: 8, madeira: 4 }, tempo: 40, sprite: ["constr_1", 2], tam: 150, agua: true },
  fogueira: { nome: "Fogueira", w: 2, h: 2, req: { construcao: 1 }, mat: { madeira: 2, pedra: 4, galho: 4 }, tempo: 10, sprite: ["recursos", 6], tam: 110, fogueira: true },
  ferraria: { nome: "Ferraria", w: 4, h: 4, req: { construcao: 10, ferraria: 8 }, mat: { pedra: 30, madeira: 20 }, tempo: 200, sprite: ["constr_2", 0], tam: 275, negocio: true, hab: "ferraria",
    receitas: [
      { saida: "lingote_ferro", qtd: 1, ins: { minerio_ferro: 2, carvao: 1 }, base: 18, hab: "ferraria", nivel: 1 },
      { saida: "martelo", qtd: 1, ins: { lingote_ferro: 1, madeira: 1 }, base: 25, hab: "ferraria", nivel: 3 },
      { saida: "machado", qtd: 1, ins: { lingote_ferro: 2, madeira: 1 }, base: 35, hab: "ferraria", nivel: 5 },
      { saida: "picareta", qtd: 1, ins: { lingote_ferro: 2, madeira: 1 }, base: 35, hab: "ferraria", nivel: 5 },
      { saida: "escudo", qtd: 1, ins: { lingote_ferro: 2, tabua: 2 }, base: 50, hab: "ferraria", nivel: 12 },
      { saida: "espada_ferro", qtd: 1, ins: { lingote_ferro: 3, couro: 1 }, base: 70, hab: "ferraria", nivel: 15 },
    ] },
  serraria: { nome: "Serraria", w: 5, h: 4, req: { construcao: 8, carpintaria: 5 }, mat: { madeira: 35, pedra: 10, fibra: 10 }, tempo: 180, sprite: ["constr_2", 1], tam: 290, negocio: true, hab: "carpintaria",
    receitas: [
      { saida: "tabua", qtd: 1, ins: { madeira: 2 }, base: 10, hab: "carpintaria", nivel: 1 },
      { saida: "vara_pesca", qtd: 1, ins: { tabua: 1, fibra: 2 }, base: 20, hab: "carpintaria", nivel: 3 },
      { saida: "arco", qtd: 1, ins: { tabua: 1, fibra: 2 }, base: 30, hab: "carpintaria", nivel: 6 },
    ] },
  cozinha: { nome: "Cozinha", w: 4, h: 4, req: { construcao: 8, culinaria: 5 }, mat: { madeira: 20, pedra: 20, argila: 10 }, tempo: 150, sprite: ["constr_2", 2], tam: 265, negocio: true, hab: "culinaria",
    receitas: [
      { saida: "pao", qtd: 2, ins: { trigo: 2 }, base: 14, hab: "culinaria", nivel: 1 },
      { saida: "carne_assada", qtd: 1, ins: { carne_crua: 1 }, base: 12, hab: "culinaria", nivel: 1 },
      { saida: "ensopado", qtd: 1, ins: { carne_crua: 1, cogumelo: 1, repolho: 1 }, base: 30, hab: "culinaria", nivel: 10 },
    ] },
  mercado: { nome: "Mercado", w: 5, h: 4, req: { construcao: 5 }, mat: { madeira: 40, pedra: 10, fibra: 20 }, tempo: 200, sprite: ["constr_2", 3], tam: 290, negocio: true, mercado: true, hab: "comercio" },
  fazenda: { nome: "Fazenda", w: 6, h: 5, req: { construcao: 6, agricultura: 5 }, mat: { madeira: 18, fibra: 12 }, tempo: 160, sprite: ["constr_3", 1], tam: 330, negocio: true, hab: "agricultura",
    producoes: [{ saida: "trigo", qtd: 3, base: 30, hab: "agricultura" }, { saida: "repolho", qtd: 2, base: 26, hab: "agricultura" }] },
  mina: { nome: "Mina", w: 4, h: 3, req: { construcao: 12, mineracao: 8 }, mat: { madeira: 25, pedra: 15 }, tempo: 220, sprite: ["constr_3", 2], tam: 270, negocio: true, hab: "mineracao",
    producoes: [{ saida: "minerio_ferro", qtd: 2, base: 28, hab: "mineracao" }, { saida: "carvao", qtd: 2, base: 22, hab: "mineracao" }, { saida: "pedra", qtd: 3, base: 20, hab: "mineracao" }] },
};
export const NEGOCIOS = Object.keys(CONSTR).filter((k) => CONSTR[k].negocio);
// itens que cada negócio vende (derivado das receitas/produções; mercado vende qualquer coisa que comprou)
export function itensDoNegocio(tipo) {
  const d = CONSTR[tipo]; if (!d) return [];
  return [...new Set([...(d.receitas || []).map((r) => r.saida), ...(d.producoes || []).map((p) => p.saida)])];
}
