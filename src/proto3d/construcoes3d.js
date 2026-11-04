// CONSTRUÇÕES 3D (protótipo) — monta casas a partir do pacote modular "Medieval Village MegaKit" (Quaternius, CC0).
// 1 módulo do pacote (200 unidades) = 2 tiles do jogo. Cada construção é composta por paredes, cantos, piso e telhado nos módulos do seu retângulo,
// com uma porta na frente (lado sul, virado para a câmera). A geometria é fundida por material (1 malha por material) — poucas chamadas de desenho.
// O telhado fica numa malha separada (`telhado`) para sumir quando o jogador entra.
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { comOclusao } from "./oclusao.js";

export const MOD = 2;                       // tiles por módulo
const K = MOD / 200;                         // unidade do modelo → tiles
const ALTURA_PAREDE = 300;                   // altura de um andar (unidades do modelo)

// Material do pacote → textura (arquivo tex_<nome>.jpg em assets/modelos/vila/), repetição por UV e cor-base
const MATS = {
  MI_Plaster: { tex: "reboco", k: 1.0 }, MI_UnevenBrick: { tex: "tijolo_irregular", k: 1.0 }, MI_Brick: { tex: "tijolo", k: 1.0 }, MI_RedBrick: { tex: "tijolo", k: 1.0 },
  MI_RoundTiles: { tex: "telha", k: 1.0 }, MI_RockTrim: { tex: "pedra", k: 1.0 }, MI_WoodTrim: { tex: "tabuas", k: 1.0 }, MI_WoodTrim_Wear: { tex: "tabuas_gasta", k: 1.0 },
  MI_MetalOrnaments: { tex: "metal", k: 1.0 }, MI_Vine: { tex: "hera", k: 1.0 }, MI_WindowGlass: { cor: "#9fb8bd" },
};
// Estilos de parede: reto, com porta, com janela
const ESTILOS = {
  reboco: { reto: "Wall_Plaster_Straight", porta: "Wall_Plaster_Door_Flat", janela: "Wall_Plaster_Window_Wide_Flat" },
  tijolo: { reto: "Wall_UnevenBrick_Straight", porta: "Wall_UnevenBrick_Door_Flat", janela: "Wall_UnevenBrick_Window_Wide_Flat" },
  madeira: { reto: "Wall_Plaster_WoodGrid", porta: "Wall_Plaster_Door_Flat", janela: "Wall_Plaster_Window_Wide_Flat" },
};
// Modelos de cada tipo de construção (em módulos: mw × mh). Os que não estão aqui continuam como sprite 2D.
export const PLANTAS = {
  cabana:   { mw: 2, mh: 2, estilo: "madeira", telhado: ["Roof_RoundTiles_4x4"], janelas: 1 },
  casa:     { mw: 3, mh: 3, estilo: "reboco",  telhado: ["Roof_RoundTiles_6x6"], janelas: 2, chamine: true },
  ferraria: { mw: 3, mh: 3, estilo: "tijolo",  telhado: ["Roof_RoundTiles_6x6"], janelas: 1, chamine: true },
  serraria: { mw: 3, mh: 2, estilo: "madeira", telhado: ["Roof_RoundTiles_6x4"], janelas: 1 },
  cozinha:  { mw: 2, mh: 2, estilo: "reboco",  telhado: ["Roof_RoundTiles_4x4"], janelas: 1, chamine: true },
  mercado:  { mw: 4, mh: 2, estilo: "madeira", telhado: ["Roof_RoundTiles_4x4", "Roof_RoundTiles_4x4"], janelas: 2, aberto: true },
};
export const temModelo = (tipo) => !!PLANTAS[tipo];
/** Tamanho em tiles (w, h) que a construção passa a ter no protótipo. */
export const tamanhoTiles = (tipo) => [PLANTAS[tipo].mw * MOD, PLANTAS[tipo].mh * MOD];
/** Tiles do interior + porta que o jogador pode pisar (índices locais x,y dentro do retângulo), e tile da porta. */
export function tilesLivres(tipo) {
  const P = PLANTAS[tipo], w = P.mw * MOD, h = P.mh * MOD, livres = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) livres.push([x, y]);
  const pc = portaModulo(P); for (let k = 0; k < MOD; k++) livres.push([pc * MOD + k, h - 1]);     // porta: a faixa de tiles do módulo da porta, na fileira da frente
  return livres;
}
const portaModulo = (P) => Math.floor((P.mw - 1) / 2);   // módulo da porta na frente (centro, arredondado p/ esquerda)

export async function criarConstrucoes3D(cena) {
  const loader = new FBXLoader(), tl = new THREE.TextureLoader(), pecas = new Map(), texs = new Map(), mats = new Map();
  const tex = (n) => texs.get(n) || (texs.set(n, new Promise((res) => tl.load(`assets/modelos/vila/tex_${n}.jpg`, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; res(t); }, undefined, () => res(null)))), texs.get(n));
  async function material(nome) {
    if (mats.has(nome)) return mats.get(nome);
    const r = MATS[nome] || { cor: "#999" }, t = r.tex ? await tex(r.tex) : null;
    const m = new THREE.MeshLambertMaterial({ map: t || null, color: t ? new THREE.Color(r.k, r.k, r.k) : new THREE.Color(r.cor || "#8a7a60"), transparent: false });
    comOclusao(m, "cons"); mats.set(nome, m); return m;
  }
  async function peca(nome) {                           // → [{ mat: nomeMaterial, g: BufferGeometry (já em coordenadas do modelo) }]
    if (pecas.has(nome)) return pecas.get(nome);
    const o = await loader.loadAsync(`assets/modelos/vila/${nome}.fbx`); o.updateMatrixWorld(true); const partes = [];
    o.traverse((m) => { if (!m.isMesh) return; const g = m.geometry.clone().applyMatrix4(m.matrixWorld); const ms = [].concat(m.material);
      if (!g.groups.length || ms.length === 1) { partes.push({ mat: ms[0].name, g: strip(g) }); return; }
      for (const gr of g.groups) { const idx = g.index ? Array.from(g.index.array).slice(gr.start, gr.start + gr.count) : Array.from({ length: gr.count }, (_, i) => gr.start + i); const gg = g.clone(); gg.setIndex(idx); gg.clearGroups(); partes.push({ mat: ms[gr.materialIndex].name, g: strip(gg) }); } });
    pecas.set(nome, partes); return partes;
  }
  const strip = (g) => { for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i)); g.clearGroups(); return g; };
  const nomes = new Set(["Floor_WoodLight", "Wall_Arch", "Corner_Exterior_Wood", "Prop_Chimney", "Prop_Crate"]);
  for (const e of Object.values(ESTILOS)) for (const n of Object.values(e)) nomes.add(n);
  for (const P of Object.values(PLANTAS)) for (const n of P.telhado) nomes.add(n);
  await Promise.all([...nomes].map((n) => peca(n).catch((e) => console.warn("peça falhou", n, e.message))));
  const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s1 = new THREE.Vector3(K, K, K);

  /** Monta a construção; devolve { grupo, telhado } (THREE.Group) em coordenadas do mundo (x,z em tiles; y = altura do chão). */
  async function montar(tipo, tx, ty, yChao) {
    const P = PLANTAS[tipo], E = ESTILOS[P.estilo], por = new Map(), porTel = new Map(), ox = tx, oz = ty, W = P.mw * MOD, H = P.mh * MOD;
    const por_ = (alvo, nome, x, z, yaw, y = 0, esc = 1) => { const ps = pecas.get(nome); if (!ps) return; q.setFromAxisAngle(Y, yaw); v.set(x, y * K + yChao, z); s1.set(K * esc, K * esc, K * esc); mat4.compose(v, q, s1);
      for (const pt of ps) { const g = pt.g.clone().applyMatrix4(mat4); (alvo.get(pt.mat) || alvo.set(pt.mat, []).get(pt.mat)).push(g); } };
    const pc = portaModulo(P); let jan = P.janelas;
    // piso
    for (let i = 0; i < P.mw; i++) for (let j = 0; j < P.mh; j++) por_(por, "Floor_WoodLight", ox + (i + 0.5) * MOD, oz + (j + 0.5) * MOD, 0, 0.5);
    // paredes: 4 lados. lado = [yaw do exterior, função posição do módulo k, nº de módulos]
    const lados = [
      { yaw: 0, n: P.mw, pos: (k) => [ox + (k + 0.5) * MOD, oz + H], front: true },          // sul (frente)
      { yaw: Math.PI, n: P.mw, pos: (k) => [ox + (k + 0.5) * MOD, oz] },                      // norte
      { yaw: Math.PI / 2, n: P.mh, pos: (k) => [ox + W, oz + (k + 0.5) * MOD] },              // leste
      { yaw: -Math.PI / 2, n: P.mh, pos: (k) => [ox, oz + (k + 0.5) * MOD] },                 // oeste
    ];
    let ji = 0;
    for (const L of lados) for (let k = 0; k < L.n; k++) {
      const [x, z] = L.pos(k); let nome = E.reto;
      if (L.front && k === pc) nome = E.porta; else if (jan > 0 && (k + ji) % 2 === 1 && !(L.front && k === pc)) { nome = E.janela; jan--; }
      if (P.aberto && L.front && k !== pc) nome = "Wall_Arch";
      por_(por, nome, x, z, L.yaw, 0);
    }
    // cantos
    for (const [cx, cz, yaw] of [[ox, oz + H, 0], [ox + W, oz + H, 0], [ox, oz, Math.PI], [ox + W, oz, Math.PI]]) por_(por, "Corner_Exterior_Wood", cx, cz, yaw, 0);
    // telhado (centrado em cada trecho de módulos)
    P.telhado.forEach((n, i) => { const f = P.telhado.length; por_(porTel, n, ox + (i + 0.5) * (W / f), oz + H / 2, 0, ALTURA_PAREDE); });
    if (P.chamine) por_(porTel, "Prop_Chimney", ox + W - 1.0, oz + 1.0, 0, 200);
    const montarG = async (mapa, nomeG) => { const g = new THREE.Group(); g.name = nomeG; for (const [nm, geoms] of mapa) { const m = new THREE.Mesh(mergeGeometries(geoms, false), await material(nm)); m.frustumCulled = false; g.add(m); for (const gg of geoms) gg.dispose(); } return g; };
    const grupo = await montarG(por, "paredes"), telhado = await montarG(porTel, "telhado"); cena.add(grupo, telhado); return { grupo, telhado };
  }
  return { montar, remover: (c) => { for (const g of [c.grupo, c.telhado]) { cena.remove(g); g.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); } } };
}
