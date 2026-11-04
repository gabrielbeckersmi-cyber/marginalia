// ÁRVORES 3D (protótipo) — modelos FBX do pacote "Ultimate Stylized Nature" (Quaternius, CC0) com texturas geradas por IA no estilo manuscrito.
// Os modelos não têm UV (só cores lisas por material), então a textura é aplicada por projeção "triplanar" no shader: funciona em qualquer forma.
// Contorno de tinta: casco invertido (cópia do modelo, de dentro para fora, em cor escura). Instâncias: um InstancedMesh por modelo.
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { comOclusao } from "./oclusao.js";

export const MODELOS = { 1: ["CommonTree_1", "CommonTree_2", "CommonTree_3"], 2: ["PineTree_1", "PineTree_2", "PineTree_3"], 3: ["CommonTree_Dead_1", "CommonTree_Dead_2"], 4: ["CommonTree_Autumn_1", "CommonTree_Autumn_2"], 24: ["Willow_1", "Willow_2"] };
const ESCALA = 0.03, MAX = 1800;              // modelo ≈ 250 unidades de altura → ≈ 5 unidades do jogo (1 unidade = 1 tile)
// material do FBX → textura e brilho. esc = repetições por unidade do modelo
const REGRAS = {
  Wood: { tex: "casca", esc: 1 / 60, k: 0.8 }, LightWood: { tex: "casca", esc: 1 / 60, k: 1.0 }, White: { tex: "casca_vidoeiro", esc: 1 / 70, k: 1 }, Black: { cor: "#1c1612" },
  Green: { tex: "folhagem", esc: 1 / 55, k: [1.15, 1.85, 1.0] }, DarkGreen: { tex: "folhagem", esc: 1 / 55, k: [0.8, 1.3, 0.85] }, Orange: { tex: "folhagem_outono", esc: 1 / 55, k: 1.5 }, Berry: { cor: "#a3201d" },
  Rock: { tex: "pedra", esc: 1 / 50, k: 1 },
};
const urlTex = (n) => `assets/modelos/tex_${n}.jpg`;

export async function criarArvores3D(cena, luz) {
  const loader = new FBXLoader(), tl = new THREE.TextureLoader(), texturas = {};
  const carregarTex = (n) => texturas[n] || (texturas[n] = new Promise((res) => tl.load(urlTex(n), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; res(t); }, undefined, () => res(null))));
  const matCache = new Map();
  async function material(nome, modelo) {
    const r = REGRAS[nome] || { cor: "#6b8a4a" }, pinheiro = modelo.startsWith("Pine"), chave = nome + (pinheiro ? "|p" : ""); if (matCache.has(chave)) return matCache.get(chave);
    const texNome = pinheiro && (nome === "Green" || nome === "DarkGreen") ? "pinheiro" : r.tex, pk = pinheiro && texNome === "pinheiro" ? (nome === "Green" ? [0.62, 0.95, 0.78] : [0.45, 0.72, 0.6]) : null, tex = texNome ? await carregarTex(texNome) : null;
    const m = new THREE.MeshLambertMaterial({ color: tex ? (pk ? new THREE.Color(...pk) : Array.isArray(r.k) ? new THREE.Color(...r.k) : new THREE.Color(r.k, r.k, r.k)) : new THREE.Color(r.cor || "#888") });
    if (tex) {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTex = { value: tex }; sh.uniforms.uEsc = { value: r.esc };
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vPL; varying vec3 vNL;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvPL = position; vNL = normal;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vPL; varying vec3 vNL; uniform sampler2D uTex; uniform float uEsc;")
          .replace("#include <map_fragment>", `vec3 bw = pow(abs(normalize(vNL)), vec3(3.0)); bw /= (bw.x + bw.y + bw.z); vec3 pp = vPL * uEsc;
 vec3 tcor = texture2D(uTex, pp.zy).rgb * bw.x + texture2D(uTex, pp.xz).rgb * bw.y + texture2D(uTex, pp.xy).rgb * bw.z; diffuseColor.rgb *= tcor;
 float perto = smoothstep(0.8, 3.0, length(vViewPosition)); if (perto < 1.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > perto) discard;`);
      };
      m.customProgramCacheKey = () => "tri" + texNome;
    }
    comOclusao(m, "arv"); matCache.set(chave, m); return m;
  }
  const tinta = new THREE.MeshBasicMaterial({ color: "#241608", side: THREE.BackSide });
  tinta.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * 1.6;"); };
  comOclusao(tinta, "tinta");
  const modelos = {};
  async function carregar(nome) {
    const o = await loader.loadAsync(`assets/modelos/${nome}.fbx`); let malha = null; o.traverse((m) => { if (m.isMesh && !malha) malha = m; }); if (!malha) return null;
    o.updateMatrixWorld(true); const g = malha.geometry.clone().applyMatrix4(malha.matrixWorld); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0);
    const mats = []; for (const fm of [].concat(malha.material)) mats.push(await material(fm.name, nome));
    const im = new THREE.InstancedMesh(g, mats, MAX), ct = new THREE.InstancedMesh(g, tinta, MAX); for (const x of [im, ct]) { x.frustumCulled = false; x.count = 0; cena.add(x); }
    return { im, ct, n: 0 };
  }
  const nomes = [...new Set(Object.values(MODELOS).flat())];
  await Promise.all(nomes.map(async (n) => { try { const m = await carregar(n); if (m) modelos[n] = m; } catch (e) { console.warn("modelo falhou", n, e.message); } }));
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  return {
    ok: Object.keys(modelos).length > 0,
    tem: (f) => !!(MODELOS[f] && MODELOS[f].some((n) => modelos[n])),
    limpar() { for (const m of Object.values(modelos)) m.n = 0; },
    /** a = número 0..1 (escolhe a variante), b = ângulo 0..1, c = tamanho 0..1 */
    adicionar(f, x, y, z, a, b, c, mult = 1) {
      const lista = MODELOS[f].filter((n) => modelos[n]); if (!lista.length) return 0; const m = modelos[lista[Math.floor(a * lista.length) % lista.length]]; if (m.n >= MAX) return 0;
      const esc = ESCALA * (0.85 + c * 0.4) * mult; Q.setFromAxisAngle(Y, b * Math.PI * 2); P.set(x, y - 0.1, z); S.set(esc, esc, esc); M4.compose(P, Q, S); m.im.setMatrixAt(m.n, M4); m.ct.setMatrixAt(m.n, M4); m.n++; return esc;
    },
    fim() { for (const m of Object.values(modelos)) { m.im.count = m.ct.count = m.n; m.im.instanceMatrix.needsUpdate = m.ct.instanceMatrix.needsUpdate = true; } },
  };
}
