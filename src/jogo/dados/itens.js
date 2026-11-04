// ITENS — preço base (em moedas), fome (quanto reduz da barra de fome, 0–100), ícone [folha, índice].
export const ITENS = {
  madeira: { nome: "Madeira", preco: 4, icone: ["itens_1", 0] },
  pedra: { nome: "Pedra", preco: 5, icone: ["itens_1", 1] },
  minerio_ferro: { nome: "Minério de ferro", preco: 9, icone: ["itens_1", 2] },
  lingote_ferro: { nome: "Lingote de ferro", preco: 28, icone: ["itens_1", 3] },
  carvao: { nome: "Carvão", preco: 6, icone: ["itens_1", 4] },
  fibra: { nome: "Fibra", preco: 2, icone: ["itens_1", 5] },
  argila: { nome: "Argila", preco: 4, icone: ["itens_1", 6] },
  tabua: { nome: "Tábua", preco: 11, icone: ["itens_1", 7] },
  bagas: { nome: "Bagas", preco: 3, fome: 4, icone: ["itens_1", 8] },
  maca: { nome: "Maçã", preco: 4, fome: 6, icone: ["itens_1", 9] },
  cogumelo: { nome: "Cogumelo", preco: 4, fome: 5, icone: ["itens_1", 10] },
  peixe_cru: { nome: "Peixe cru", preco: 7, fome: 8, icone: ["itens_1", 11] },
  carne_crua: { nome: "Carne crua", preco: 9, fome: 9, icone: ["itens_1", 12] },
  carne_assada: { nome: "Carne assada", preco: 18, fome: 28, icone: ["itens_1", 13] },
  pao: { nome: "Pão", preco: 12, fome: 22, icone: ["itens_1", 14] },
  ensopado: { nome: "Ensopado", preco: 30, fome: 42, icone: ["itens_1", 15] },
  repolho: { nome: "Repolho", preco: 4, fome: 6, icone: ["plantas", 15] },
  trigo: { nome: "Trigo", preco: 5, icone: ["itens_2", 9] },
  couro: { nome: "Couro", preco: 10, icone: ["itens_2", 7] },
  galho: { nome: "Galho", preco: 1, icone: ["itens_3", 0] },
  peixe_assado: { nome: "Peixe assado", preco: 16, fome: 22, icone: ["itens_3", 4] },
  machado_pedra: { nome: "Machado de pedra", preco: 22, ferramenta: "lenhador", tier: 1, durab: 18, arma: 4, icone: ["itens_3", 1] },
  picareta_pedra: { nome: "Picareta de pedra", preco: 24, ferramenta: "mineracao", tier: 1, durab: 18, arma: 3, icone: ["itens_3", 2] },
  machado: { nome: "Machado de ferro", preco: 60, ferramenta: "lenhador", tier: 2, durab: 70, arma: 6, icone: ["itens_2", 3] },
  picareta: { nome: "Picareta de ferro", preco: 65, ferramenta: "mineracao", tier: 2, durab: 70, arma: 5, icone: ["itens_2", 4] },
  martelo: { nome: "Martelo", preco: 40, ferramenta: "construcao", icone: ["itens_2", 11] },
  vara_pesca: { nome: "Vara de pesca", preco: 30, ferramenta: "pesca", tier: 1, durab: 40, icone: ["itens_2", 12] },
  arco: { nome: "Arco", preco: 70, arma: 8, ferramenta: "cacada", alcance: true, durab: 90, icone: ["itens_2", 5] },
  espada_ferro: { nome: "Espada de ferro", preco: 140, arma: 13, ferramenta: "cacada", durab: 130, icone: ["itens_2", 2] },
  escudo: { nome: "Escudo", preco: 90, defesa: 0.25, icone: ["itens_2", 6] },
};
export const COMIDAS = Object.keys(ITENS).filter((k) => ITENS[k].fome);
export const FERRAMENTAS = Object.keys(ITENS).filter((k) => ITENS[k].ferramenta);
export const nomeItem = (id) => (ITENS[id] ? ITENS[id].nome : id);

// Textos do painel de detalhes do item (mochila).
export const DESC = {
  madeira: "Achas de tronco. Quase toda obra usa; a serraria faz tábuas com ela.",
  pedra: "Pedra bruta de pedregulho ou seixos. Poços, casas e ferrarias levam pedra.",
  minerio_ferro: "Minério de veio de ferro. Vai à ferraria, com carvão, para virar lingote.",
  lingote_ferro: "Ferro fundido. Matéria-prima de ferramentas, escudos e espadas.",
  carvao: "Carvão de veio. Alimenta a forja da ferraria.",
  fibra: "Ervas e juncos trançáveis. Tendas, cabanas e arcos precisam dela.",
  argila: "Barro de beira de rio. Usada na construção da cozinha.",
  tabua: "Madeira serrada na serraria. Vale bem mais que o tronco.",
  bagas: "Frutinhas silvestres. Saciam pouco, mas estão por toda parte.",
  maca: "Colhida de macieiras. Boa para beliscar durante a viagem.",
  cogumelo: "Cogumelo do mato. Entra no ensopado.",
  peixe_cru: "Pescado fresco de rio ou lago.",
  carne_crua: "Carne de caça. Fica bem melhor assada na cozinha.",
  carne_assada: "Carne assada na cozinha. Sacia bastante.",
  pao: "Pão de trigo da cozinha. Barato e reforçado.",
  ensopado: "Ensopado de carne, cogumelo e repolho: a refeição mais forte.",
  repolho: "Hortaliça de fazenda ou horta silvestre.",
  trigo: "Grão de trigo. A cozinha faz pão com ele.",
  couro: "Pele curtida de animal. Tendas e espadas levam couro.",
  galho: "Galhos secos do chão ou de árvores caídas. Alimentam a fogueira e entram na fabricação de ferramentas.",
  peixe_assado: "Peixe assado na fogueira. Sacia bem mais que cru.",
  machado_pedra: "Machado tosco: o mínimo para cortar árvores. Quebra depressa. Árvores maiores exigem nível mais alto.",
  picareta_pedra: "Picareta tosca: o mínimo para quebrar pedregulhos e minerar. Quebra depressa.",
  machado: "Machado de ferro: corta mais rápido e dura muito mais. Necessário para as árvores mais antigas.",
  picareta: "Picareta de ferro: minera mais rápido e dura muito mais.",
  martelo: "Ferramenta de obra: facilita a construção.",
  vara_pesca: "Para pescar em rios e lagos. Desgasta com o uso.",
  arco: "Arma de longo alcance: atira de longe (mouse), mas erra mais quanto mais longe o alvo. Desgasta com o uso.",
  espada_ferro: "A melhor arma disponível. Equipe antes de lutar.",
  escudo: "Equipado, reduz em 25% o dano que você recebe.",
};
export const USO_FERRAMENTA = { lenhador: "cortar árvores e remover tocos", mineracao: "quebrar pedras e minerar", construcao: "construir", pesca: "pescar", cacada: "caçar" };
export function tipoDoItem(k) {
  const d = ITENS[k]; if (!d) return "Item";
  if (d.fome) return "Comida"; if (d.defesa) return "Escudo";
  if (d.arma) return d.ferramenta && d.ferramenta !== "cacada" ? "Ferramenta e arma" : "Arma";
  return d.ferramenta ? "Ferramenta" : "Material";
}
