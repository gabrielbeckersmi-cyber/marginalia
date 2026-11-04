// HABILIDADES (1–100, com % dentro de cada nível). Para criar uma nova: adicione aqui e use o id nas receitas/ações.
export const HAB = [
  { id: "coleta", nome: "Coleta" }, { id: "lenhador", nome: "Cortar madeira" }, { id: "mineracao", nome: "Mineração" },
  { id: "construcao", nome: "Construção" }, { id: "ferraria", nome: "Ferraria" }, { id: "culinaria", nome: "Culinária" },
  { id: "cacada", nome: "Caça" }, { id: "pesca", nome: "Pesca" }, { id: "comercio", nome: "Venda" },
  { id: "agricultura", nome: "Agricultura" }, { id: "carpintaria", nome: "Carpintaria" }, { id: "combate", nome: "Combate" },
];
export const IDX = Object.fromEntries(HAB.map((h, i) => [h.id, i]));
export const NOME_HAB = Object.fromEntries(HAB.map((h) => [h.id, h.nome]));
// profissão → habilidade principal
export const PROFISSOES = {
  coletor: "coleta", lenhador: "lenhador", minerador: "mineracao", construtor: "construcao", ferreiro: "ferraria",
  cozinheiro: "culinaria", cacador: "cacada", pescador: "pesca", comerciante: "comercio", agricultor: "agricultura", carpinteiro: "carpintaria",
};
export const NOME_PROF = { coletor: "Coletor", lenhador: "Lenhador", minerador: "Minerador", construtor: "Construtor", ferreiro: "Ferreiro", cozinheiro: "Cozinheiro", cacador: "Caçador", pescador: "Pescador", comerciante: "Comerciante", agricultor: "Agricultor", carpinteiro: "Carpinteiro", bandido: "Bandido", sem: "Sem ofício" };
