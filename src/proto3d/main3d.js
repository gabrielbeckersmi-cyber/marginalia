// PROTÓTIPO 2.5D — mesmo jogo (lógica de src/jogo/), mas desenhado em 3D com câmera orbital em 3ª pessoa.
// Terreno em blocos (chunks) com relevo suave; árvores, construções, pessoas e animais são sprites em pé (billboards) virados para a câmera.
// Controles: WASD/setas = andar · Shift = correr · botão direito + arrastar (ou Q/E) = girar a câmera · roda = zoom · botão esquerdo = coletar/atacar · F = comer · R = beber.
import * as THREE from "three";
import { C } from "../jogo/config.js";
import { novoJogo, atualizarJogo } from "../jogo/estado.js";
import { atualizarJogador, alvoEm, descreverAlvo, atacar, alcanceAtaque, comerMelhor, beberDoCantil } from "../jogo/interacao.js";
import { carregarArte, arte } from "../nucleo/assets.js";
import { FOLHAS, FEAT } from "../jogo/dados/arte.js";
import { CONSTR } from "../jogo/dados/construcoes.js";
import { ANIMAIS } from "../jogo/dados/animais.js";
import { T, featEm, setFeat } from "../jogo/mundo.js";
import { hash2, fbm } from "../jogo/rng.js";
import { criarArvores3D } from "./arvores3d.js";

const TS = C.TILE, CHK = 32, RAIO_CHUNKS = 4, NIVEL_AGUA = -0.2;
// ── ajustes de câmera e escala (estimados a partir dos prints do Gabriel) ──
const PITCH_MIN = 0.10, PITCH_MAX = 0.28;     // inclinação vertical da câmera em radianos (≈ 6° a 16°)
const ESCALA_ARVORE = 2.4, ESPACO_ARVORES = 4.6; // árvores bem maiores e afastadas (tiles entre os troncos)
const sx = (v) => v / TS;

// ── luz do dia (igual ao jogo 2D) ──
function luzDoDia(h) {
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t), noite = [58, 72, 128], aurora = [232, 170, 130], dia = [255, 255, 255], ocaso = [246, 176, 120];
  if (h < 4.5) return noite; if (h < 6) return mix(noite, aurora, (h - 4.5) / 1.5); if (h < 8) return mix(aurora, dia, (h - 6) / 2);
  if (h < 17.5) return dia; if (h < 19.5) return mix(dia, ocaso, (h - 17.5) / 2); if (h < 21) return mix(ocaso, noite, (h - 19.5) / 1.5); return noite;
}

// ── relevo: altura por tipo de terreno + colinas suaves em terra ──
const ALTURA = { [T.MAR]: -1.5, [T.AREIA]: 0.05, [T.GRAMA]: 0.22, [T.FLORESTA]: 0.28, [T.PEDRA]: 0.75, [T.RIO]: -0.55, [T.LAGO]: -0.65 };
const COR = { [T.MAR]: "#2c5a68", [T.AREIA]: "#dcc78d", [T.GRAMA]: "#86a352", [T.FLORESTA]: "#628443", [T.PEDRA]: "#928b7c", [T.RIO]: "#4b8aa0", [T.LAGO]: "#4b8aa0" };
const COR_L = {}; for (const k in COR) COR_L[k] = new THREE.Color(COR[k]);
const FUNDO = new THREE.Color("#2c5a68"), RASO = new THREE.Color("#8fb3ae");

function criarMundo3D(J) {
  const M = J.M, N = M.N;
  const tipo = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? T.MAR : M.terr[y * N + x]);
  const alturaTile = (x, y) => { const t = tipo(x, y), h = ALTURA[t]; return t === T.MAR || t === T.RIO || t === T.LAGO ? h : h + (fbm(x * 0.045, y * 0.045, 9, 3) - 0.5) * 1.1; };
  const vh = new Float32Array((N + 1) * (N + 1)).fill(NaN);
  const alturaVert = (i, j) => { const k = j * (N + 1) + i; if (k < 0 || i < 0 || j < 0 || i > N || j > N) return ALTURA[T.MAR]; let v = vh[k]; if (v !== v) { v = (alturaTile(i - 1, j - 1) + alturaTile(i, j - 1) + alturaTile(i - 1, j) + alturaTile(i, j)) / 4; vh[k] = v; } return v; };
  /** Altura do chão em coordenadas do mundo (1 unidade = 1 tile). */
  const alturaEm = (x, z) => { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j; return (alturaVert(i, j) * (1 - fx) + alturaVert(i + 1, j) * fx) * (1 - fz) + (alturaVert(i, j + 1) * (1 - fx) + alturaVert(i + 1, j + 1) * fx) * fz; };

  const idx = []; const n = CHK + 1;
  for (let j = 0; j < CHK; j++) for (let i = 0; i < CHK; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const tmp = new THREE.Color();
  function corVert(i, j) {
    tmp.setRGB(0, 0, 0); const ts = [tipo(i - 1, j - 1), tipo(i, j - 1), tipo(i - 1, j), tipo(i, j)]; let r = 0, g = 0, b = 0;
    for (const t of ts) { const c = COR_L[t]; r += c.r; g += c.g; b += c.b; }
    r /= 4; g /= 4; b /= 4;
    const h = alturaVert(i, j), ruido = 0.9 + 0.2 * hash2(i, j, 3);
    if (h < NIVEL_AGUA) { const p = Math.min(1, (NIVEL_AGUA - h) / 1.1); r = r + (FUNDO.r - r) * p * 0.8 + RASO.r * 0.0; g = g + (FUNDO.g - g) * p * 0.8; b = b + (FUNDO.b - b) * p * 0.8; }
    return [r * ruido, g * ruido, b * ruido];
  }
  const chunks = new Map(), grupo = new THREE.Group();
  function criar(cx, cy) {
    const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gx = cx * CHK + i, gy = cy * CHK + j, k = (j * n + i) * 3, c = corVert(gx, gy);
      pos[k] = gx; pos[k + 1] = alturaVert(gx, gy); pos[k + 2] = gy; col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, material); m.frustumCulled = true; grupo.add(m); return m;
  }
  function atualizar(px, pz) {
    const ccx = Math.floor(px / CHK), ccy = Math.floor(pz / CHK), maxc = Math.ceil(N / CHK);
    for (let dy = -RAIO_CHUNKS; dy <= RAIO_CHUNKS; dy++) for (let dx = -RAIO_CHUNKS; dx <= RAIO_CHUNKS; dx++) {
      const cx = ccx + dx, cy = ccy + dy; if (cx < -1 || cy < -1 || cx > maxc || cy > maxc) continue;
      const k = cx + "," + cy; if (!chunks.has(k)) chunks.set(k, criar(cx, cy));
    }
    for (const [k, m] of chunks) { const [cx, cy] = k.split(",").map(Number); if (Math.abs(cx - ccx) > RAIO_CHUNKS + 2 || Math.abs(cy - ccy) > RAIO_CHUNKS + 2) { grupo.remove(m); m.geometry.dispose(); chunks.delete(k); } }
  }
  return { grupo, atualizar, alturaEm, tipo };
}

// ── sprites em pé (billboards instanciados): um grupo por folha de sprites ──
const uRight = { value: new THREE.Vector3(1, 0, 0) }, uTint = { value: new THREE.Color(1, 1, 1) }, uFogCor = { value: new THREE.Color("#b9d4d8") }, uFogPerto = { value: 60 }, uFogLonge = { value: 125 };
const VERT = `attribute vec3 iPos; attribute vec2 iSize; attribute vec4 iUV; attribute float iAlfa; uniform vec3 uRight; varying vec2 vUv; varying float vAlfa; varying float vDist;
void main(){ vec3 wp = iPos + uRight * position.x * iSize.x + vec3(0.0,1.0,0.0) * position.y * iSize.y; vUv = iUV.xy + uv * iUV.zw; vAlfa = iAlfa; vec4 mv = viewMatrix * vec4(wp,1.0); vDist = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
const FRAG = `uniform sampler2D map; uniform vec3 uTint; uniform vec3 uFogCor; uniform float uFogPerto; uniform float uFogLonge; varying vec2 vUv; varying float vAlfa; varying float vDist;
void main(){ vec4 c = texture2D(map, vUv); if (c.a < 0.45) discard;
 float perto = smoothstep(1.5, 5.0, vDist); if (perto < 1.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > perto) discard; if (vAlfa < 0.99 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
 vec3 rgb = c.rgb * uTint; float f = smoothstep(uFogPerto, uFogLonge, vDist); gl_FragColor = vec4(mix(rgb, uFogCor, f), 1.0);
 #include <colorspace_fragment>
}`;
/** Tira o rosa/magenta que sobra do recorte de fundo nas bordas dos sprites: pixels de borda viram tinta escura (contorno limpo mesmo de perto). */
function limparBorda(img) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]; if (a === 0) continue; const r = d[i], gg = d[i + 1], b = d[i + 2];
    const magenta = r > gg * 1.25 && b > gg * 1.25 && Math.abs(r - b) < 110;
    if (a < 250 || magenta) { const k = magenta ? 1 : 1 - a / 255 * 0.5; d[i] = d[i] * (1 - k) + 42 * k; d[i + 1] = d[i + 1] * (1 - k) + 27 * k; d[i + 2] = d[i + 2] * (1 - k) + 16 * k; if (magenta && a < 200) d[i + 3] = 0; }
  }
  g.putImageData(id, 0, 0); return c;
}
class Grupo {
  constructor(chave, max, cena) {
    const f = FOLHAS[chave], img = arte(chave); this.ok = !!(f && img); if (!this.ok) return;
    this.f = f; this.max = max; this.n = 0;
    const tex = new THREE.Texture(limparBorda(img)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    this.a = { pos: new Float32Array(max * 3), size: new Float32Array(max * 2), uv: new Float32Array(max * 4), alfa: new Float32Array(max) };
    const dyn = (arr, k, nome) => { const at = new THREE.InstancedBufferAttribute(arr, k); at.setUsage(THREE.DynamicDrawUsage); g.setAttribute(nome, at); return at; };
    this.at = [dyn(this.a.pos, 3, "iPos"), dyn(this.a.size, 2, "iSize"), dyn(this.a.uv, 4, "iUV"), dyn(this.a.alfa, 1, "iAlfa")];
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, uniforms: { map: { value: tex }, uRight, uTint, uFogCor, uFogPerto, uFogLonge } });
    this.g = g; this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; cena.add(this.mesh);
  }
  limpar() { this.n = 0; }
  add(x, y, z, w, h, idx, alfa = 1, esp = false) {
    if (!this.ok || this.n >= this.max) return; const i = this.n++, f = this.f, col = idx % f.cols, lin = Math.floor(idx / f.cols);
    this.a.pos[i * 3] = x; this.a.pos[i * 3 + 1] = y; this.a.pos[i * 3 + 2] = z; this.a.size[i * 2] = w; this.a.size[i * 2 + 1] = h;
    let u0 = col / f.cols, du = 1 / f.cols; if (esp) { u0 += du; du = -du; }
    this.a.uv[i * 4] = u0; this.a.uv[i * 4 + 1] = 1 - (lin + 1) / f.rows; this.a.uv[i * 4 + 2] = du; this.a.uv[i * 4 + 3] = 1 / f.rows; this.a.alfa[i] = alfa;
  }
  fim() { if (!this.ok) return; for (const a of this.at) a.needsUpdate = true; this.g.instanceCount = this.n; this.mesh.visible = this.n > 0; }
}

// ── árvores mais espaçadas (só no protótipo): mantém uma por vez numa distância mínima, em ordem sorteada, para a mata não tapar o personagem ──
function espacarArvores(J) {
  const M = J.M, N = M.N, alta = (f) => { const d = FEAT[f]; return d && d.bloq && (d.grupos.includes("madeira") || f === 4); }, lista = [];
  for (let i = 0; i < N * N; i++) { const f = M.feat[i]; if (f && alta(f)) lista.push(i); }
  const pri = (i) => hash2(i % N, (i / N) | 0, 77); lista.sort((a, b) => pri(a) - pri(b));
  const cel = ESPACO_ARVORES, gw = Math.ceil(N / cel) + 1, grade = new Map(), r2 = ESPACO_ARVORES * ESPACO_ARVORES;
  for (const i of lista) {
    const x = i % N, y = (i / N) | 0, cx = (x / cel) | 0, cy = (y / cel) | 0; let ok = true;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) { const v = grade.get((cy + dy) * gw + cx + dx); if (v) for (const q of v) if ((q[0] - x) ** 2 + (q[1] - y) ** 2 < r2) { ok = false; break; } }
    if (ok) { const k = cy * gw + cx; (grade.get(k) || grade.set(k, []).get(k)).push([x, y]); } else setFeat(M, x, y, 0);
  }
}

// ── partida ──
async function iniciar() {
  await carregarArte();
  const J = novoJogo(+new URLSearchParams(location.search).get("semente") || (Date.now() % 100000) + 1, { sprite: new URLSearchParams(location.search).get("p") || "pessoa_2", nome: "Viajante" });
  const p = J.jogador, M = J.M;
  espacarArvores(J);
  J.chegando = false; p.x = (M.porto.tx + 0.5) * TS; p.y = (M.porto.ty - 2.5) * TS; p.dir = 3; p.stam = 100;

  const canvas = document.getElementById("tela3d");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
  cena.fog = new THREE.Fog("#b9d4d8", 60, 125);
  const luzAmb = new THREE.HemisphereLight(0xffffff, 0x6b7a4a, 1.05), sol = new THREE.DirectionalLight(0xffffff, 1.1); sol.position.set(-0.5, 1, 0.35);
  cena.add(luzAmb, sol);
  const mundo = criarMundo3D(J); cena.add(mundo.grupo);
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ color: "#4a95ab", transparent: true, opacity: 0.74, depthWrite: false }));
  agua.rotation.x = -Math.PI / 2; agua.renderOrder = 1; cena.add(agua);

  // árvores em 3D (modelos do Quaternius + textura IA). ?arvores=sprite volta para os sprites 2D
  const arv3d = new URLSearchParams(location.search).get("arvores") === "sprite" ? null : await criarArvores3D(cena).catch((e) => { console.warn("árvores 3D indisponíveis", e); return null; });
  // grupos de sprites
  const grupos = new Map(), grupoDe = (chave, max = 3000) => { let g = grupos.get(chave); if (!g) { g = new Grupo(chave, max, cena); grupos.set(chave, g); } return g; };
  for (const c of ["plantas", "recursos", "extras"]) grupoDe(c, 14000);
  // sombras (manchas escuras no chão)
  const SOMBRAS = 4000, sombras = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SOMBRAS);
  sombras.frustumCulled = false; cena.add(sombras); const mS = new THREE.Matrix4(), qS = new THREE.Quaternion(), pS = new THREE.Vector3(), sS = new THREE.Vector3(); let nS = 0;
  const sombra = (x, y, z, r) => { if (nS >= SOMBRAS) return; pS.set(x, y + 0.04, z); sS.set(r, 1, r * 0.8); mS.compose(pS, qS, sS); sombras.setMatrixAt(nS++, mS); };
  const anel = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf6e08a, transparent: true, opacity: 0.9, depthTest: false })); anel.renderOrder = 5; anel.visible = false; cena.add(anel);

  // câmera orbital
  const orb = { yaw: 0.0, pitch: 0.19, dist: 9.5, alvo: new THREE.Vector3(sx(p.x), 1.2, sx(p.y)) };
  const S = { J, orb, teclas: new Set(), baixo: false, alvo: null, mouse: { x: 0, y: 0 }, arrasta: false, msgs: [], tempo: 0, movimento: { x: 0, y: 1 }, acc: 0 };
  const redimensionar = () => { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  window.addEventListener("resize", redimensionar); redimensionar();
  window.addEventListener("keydown", (e) => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault(); if (!e.repeat) { if (e.code === "KeyF") comerMelhor(J); if (e.code === "KeyR") beberDoCantil(J); } S.teclas.add(e.code); });
  window.addEventListener("keyup", (e) => S.teclas.delete(e.code)); window.addEventListener("blur", () => S.teclas.clear());
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => { S.mouse.x = e.clientX; S.mouse.y = e.clientY; if (e.button === 2 || e.button === 1) S.arrasta = true; else S.baixo = true; canvas.setPointerCapture(e.pointerId); });
  window.addEventListener("pointerup", (e) => { if (e.button === 2 || e.button === 1) S.arrasta = false; else S.baixo = false; });
  canvas.addEventListener("pointermove", (e) => { if (S.arrasta) { orb.yaw -= (e.clientX - S.mouse.x) * 0.006; orb.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, orb.pitch + (e.clientY - S.mouse.y) * 0.0012)); } S.mouse.x = e.clientX; S.mouse.y = e.clientY; });
  canvas.addEventListener("wheel", (e) => { orb.dist = Math.max(5, Math.min(18, orb.dist * (1 + Math.sign(e.deltaY) * 0.1))); e.preventDefault(); }, { passive: false });

  // ── escolha do alvo sob o mouse (no espaço da tela: funciona com árvores altas) ──
  const v3 = new THREE.Vector3();
  const naTela = (x, y, z) => { v3.set(x, y, z).project(cam); return [(v3.x * 0.5 + 0.5) * window.innerWidth, (-v3.y * 0.5 + 0.5) * window.innerHeight, v3.z]; };
  function escolherAlvo() {
    let melhor = null, md = 1e9; const consider = (x, y, z, raio, fn) => { const [px, py, pz] = naTela(x, y, z); if (pz > 1) return; const d = Math.hypot(px - S.mouse.x, py - S.mouse.y) / raio; if (d < 1 && d < md) { md = d; melhor = fn; } };
    const k = (e) => (e.sprite ? 1 : 1);
    for (const e of J.npcs) { if (Math.abs(sx(e.x) - sx(p.x)) > 40 || Math.abs(sx(e.y) - sx(p.y)) > 40) continue; const gy = mundo.alturaEm(sx(e.x), sx(e.y)); consider(sx(e.x), gy + 0.9, sx(e.y), 50, () => alvoEm(J, e.x, e.y - 28)); }
    for (const a of J.animais) { if (Math.abs(sx(a.x) - sx(p.x)) > 40 || Math.abs(sx(a.y) - sx(p.y)) > 40) continue; const gy = mundo.alturaEm(sx(a.x), sx(a.y)); consider(sx(a.x), gy + 0.5, sx(a.y), 44, () => alvoEm(J, a.x, a.y - 20)); }
    const tx0 = Math.floor(sx(p.x)), ty0 = Math.floor(sx(p.y));
    for (let ty = ty0 - 16; ty <= ty0 + 16; ty++) for (let tx = tx0 - 16; tx <= tx0 + 16; tx++) {
      const f = featEm(M, tx, ty); if (!f) continue; const d = FEAT[f]; if (!d) continue; const alta = d.grupos.includes("madeira") || f === 4, h = sx(d.tam) * (alta ? ESCALA_ARVORE : 1.1);
      consider(tx + 0.5, mundo.alturaEm(tx + 0.5, ty + 0.5) + h * 0.4, ty + 0.5, alta ? 70 : 34, () => alvoEm(J, (tx + 0.5) * TS, (ty + 0.5) * TS));
    }
    for (const b of J.construcoes) { const cx = b.tx + b.w / 2, cz = b.ty + b.h / 2; if (Math.abs(cx - sx(p.x)) > 40 || Math.abs(cz - sx(p.y)) > 40) continue; consider(cx, mundo.alturaEm(cx, cz) + 1.5, cz, 90, () => alvoEm(J, cx * TS, cz * TS)); }
    return melhor ? melhor() : null;
  }

  // ── passo da simulação ──
  const DT = 1 / 60;
  function passo() {
    const tk = S.teclas, ix = (tk.has("KeyD") || tk.has("ArrowRight") ? 1 : 0) - (tk.has("KeyA") || tk.has("ArrowLeft") ? 1 : 0), iy = (tk.has("KeyS") || tk.has("ArrowDown") ? 1 : 0) - (tk.has("KeyW") || tk.has("ArrowUp") ? 1 : 0);
    const cy = Math.cos(orb.yaw), sy = Math.sin(orb.yaw);
    let dx = ix * cy + iy * sy, dy = -ix * sy + iy * cy;            // direita da câmera = (cos,-sin); "para trás" = (sin,cos)
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    if (dx || dy) { S.movimento.x = dx; S.movimento.y = dy; }
    const correr = tk.has("ShiftLeft") || tk.has("ShiftRight"), al = S.alvo, hostil = al && (al.tipo === "animal" || (al.tipo === "npc" && al.ref.bandido));
    atualizarJogador(J, { dir: { x: dx, y: dy }, mundo: { x: p.x, y: p.y }, segura: S.baixo && !hostil, alvo: al, correr }, DT);
    if (S.baixo && hostil && Math.hypot(al.x - p.x, al.y - p.y) <= alcanceAtaque(J)) atacar(J, al);
    atualizarJogo(J, DT);
  }

  // ── desenho ──
  const HUD = { vida: document.getElementById("b-vida"), fome: document.getElementById("b-fome"), sede: document.getElementById("b-sede"), cans: document.getElementById("b-cans"), stam: document.getElementById("b-stam"), hora: document.getElementById("hora-t"), dica: document.getElementById("dica"), msgs: document.getElementById("msgs"), ouro: document.getElementById("ouro") };
  const linhaPessoa = (e, fx, fz) => {                                // 0 baixo, 1 esquerda, 2 direita, 3 cima — relativo à câmera
    const r = fx * uRight.value.x + fz * uRight.value.z, fw = -fx * Math.sin(orb.yaw) - fz * Math.cos(orb.yaw);
    return Math.abs(r) > Math.abs(fw) ? (r > 0 ? 2 : 1) : fw < 0 ? 0 : 3;
  };
  const FACE = [[0, 1], [-1, 0], [1, 0], [0, -1]];
  let tFeat = 0, tUI = 0;
  function reconstruir() {
    nS = 0; for (const g of grupos.values()) g.limpar(); if (arv3d && arv3d.ok) arv3d.limpar();
    const px = sx(p.x), pz = sx(p.y), tem = (c) => grupoDe(c);
    // elementos do mapa
    const R = 46, x0 = Math.max(0, Math.floor(px - R)), x1 = Math.min(M.N - 1, Math.ceil(px + R)), y0 = Math.max(0, Math.floor(pz - R)), y1 = Math.min(M.N - 1, Math.ceil(pz + R));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const f = M.feat[ty * M.N + tx]; if (!f) continue; const d = FEAT[f]; if (!d) continue;
      const alta = d.grupos.includes("madeira") || f === 4, w = sx(d.tam) * (alta ? ESCALA_ARVORE : 1.1), x = tx + 0.5 + (hash2(tx, ty, 5) - 0.5) * 0.17, z = ty + 0.9, y = mundo.alturaEm(x, z);
      if (arv3d && arv3d.ok && arv3d.tem(f)) { const e = arv3d.adicionar(f, x, y, z, hash2(tx, ty, 21), hash2(tx, ty, 22), hash2(tx, ty, 23), f === 24 ? 1.35 : 1); sombra(x, y, z, e * 70); continue; }
      tem(d.f[0]).add(x, y - 0.05, z, w, w, d.f[1]); if (d.bloq) sombra(x, y, z, w * 0.22);
    }
    // construções
    for (const b of J.construcoes) {
      const d = CONSTR[b.tipo], cx = b.tx + b.w / 2, cz = b.ty + b.h - 0.1; if (Math.abs(cx - px) > R + 10 || Math.abs(cz - pz) > R + 10) continue;
      const w = sx(d.tam), y = mundo.alturaEm(cx, cz); tem(d.sprite[0]).add(cx, y - 0.05, cz, w, w, d.sprite[1], b.prog >= 1 ? 1 : 0.55 + 0.2 * b.prog); sombra(cx, y, cz, w * 0.34);
    }
    // animais
    for (const a of J.animais) {
      if (Math.abs(sx(a.x) - px) > R || Math.abs(sx(a.y) - pz) > R) continue; const A = ANIMAIS[a.esp], x = sx(a.x), z = sx(a.y), y = mundo.alturaEm(x, z), w = sx(A.tam * 1.15), face = a.dir === 1 ? -1 : 1;
      const esp = face * uRight.value.x < 0; tem("animal_" + a.esp).add(x, y, z, w, w, a.mov ? Math.floor(a.anim) % 4 : 0, 1, esp); sombra(x, y, z, w * 0.3);
    }
    // pessoas (colonos, bandidos e o jogador)
    const pessoa = (e, mov) => {
      if (Math.abs(sx(e.x) - px) > R + 4 || Math.abs(sx(e.y) - pz) > R + 4) return; const x = sx(e.x), z = sx(e.y), y = mundo.alturaEm(x, z);
      const fa = FACE[e.dir === undefined ? 0 : e.dir], fx = mov ? mov.x : fa[0], fz = mov ? mov.y : fa[1];
      const correr = e.mov && e.correndo, linha = linhaPessoa(e, fx, fz) + (correr ? 4 : 0), f = e.mov || e.trab ? Math.floor(e.anim || 0) % 4 : 0;
      const bal = e.mov ? Math.abs(Math.sin((e.anim || 0) * 0.8)) * 0.04 : 0;
      tem(e.sprite).add(x, y + bal, z, 1.75, 1.75, linha * 4 + f, e.flash > 0 ? 0.6 : 1); sombra(x, y, z, 0.4);
      if (e.nome && e !== p && Math.hypot(e.x - p.x, e.y - p.y) < 170) rotulos.push([x, y + 1.9, z, e.nome]);
    };
    rotulos.length = 0;
    for (const e of J.npcs) pessoa(e, null); pessoa(p, S.movimento);
    for (const s of J.navios) { const x = sx(s.x), z = sx(s.y + 120), w = 9.2; tem("navio").add(x, NIVEL_AGUA - 0.35, z, w, w, 0); }
    for (const g of grupos.values()) g.fim(); if (arv3d && arv3d.ok) arv3d.fim(); sombras.count = nS; sombras.instanceMatrix.needsUpdate = true;
  }
  const rotulos = [], rotEl = document.getElementById("rotulos"), nomesEl = new Map();

  let ultimo = performance.now();
  function quadro(agora) {
    const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora; S.tempo += dt; S.acc += dt;
    let passos = 0; while (S.acc >= DT && passos < 6) { S.acc -= DT; passo(); passos++; } if (S.acc > DT * 6) S.acc = 0;
    // câmera
    if (S.teclas.has("KeyQ")) orb.yaw += 1.8 * dt; if (S.teclas.has("KeyE")) orb.yaw -= 1.8 * dt;
    const px = sx(p.x), pz = sx(p.y), py = mundo.alturaEm(px, pz) + 1.25, k = 1 - Math.exp(-12 * dt);
    orb.alvo.x += (px - orb.alvo.x) * k; orb.alvo.y += (py - orb.alvo.y) * k; orb.alvo.z += (pz - orb.alvo.z) * k;
    const cp = Math.cos(orb.pitch);
    cam.position.set(orb.alvo.x + Math.sin(orb.yaw) * cp * orb.dist, orb.alvo.y + Math.sin(orb.pitch) * orb.dist, orb.alvo.z + Math.cos(orb.yaw) * cp * orb.dist);
    const ch = mundo.alturaEm(cam.position.x, cam.position.z) + 0.6; if (cam.position.y < ch) cam.position.y = ch;
    cam.lookAt(orb.alvo); cam.updateMatrixWorld();
    uRight.value.set(Math.cos(orb.yaw), 0, -Math.sin(orb.yaw));
    // luz e céu conforme a hora
    const l = luzDoDia(J.hora); uTint.value.setRGB(l[0] / 255, l[1] / 255, l[2] / 255, THREE.SRGBColorSpace);
    const ceu = new THREE.Color("#bcd6d8").multiply(uTint.value); cena.background = ceu; cena.fog.color.copy(ceu); uFogCor.value.copy(ceu);
    luzAmb.color.copy(uTint.value); sol.color.copy(uTint.value); luzAmb.intensity = 1.9; sol.intensity = 0.9;
    agua.position.set(px, NIVEL_AGUA + Math.sin(S.tempo * 1.3) * 0.025, pz);
    // mundo e sprites
    tFeat -= dt; if (tFeat <= 0) { tFeat = 0.25; mundo.atualizar(px, pz); }
    reconstruir();
    // alvo sob o mouse
    S.alvo = S.arrasta ? null : escolherAlvo();
    if (S.alvo) { const a = S.alvo, ax = sx(a.x), az = sx(a.y); anel.visible = true; anel.position.set(ax, mundo.alturaEm(ax, az) + 0.08, az); anel.scale.setScalar(a.tipo === "constr" ? 2.4 : 1); } else anel.visible = false;
    renderer.render(cena, cam);
    // HUD
    tUI -= dt; if (tUI <= 0) {
      tUI = 0.1; const set = (el, v) => { el.style.width = Math.max(0, Math.min(100, v)) + "%"; };
      set(HUD.vida, p.hp / (p.hpMax || 100) * 100); set(HUD.fome, p.fome); set(HUD.sede, p.sede); set(HUD.cans, p.cans); set(HUD.stam, p.stam === undefined ? 100 : p.stam);
      const h = Math.floor(J.hora), mi = Math.floor((J.hora - h) * 60); HUD.hora.textContent = `Dia ${J.dia} · ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`; HUD.ouro.textContent = Math.floor(p.ouro) + " moedas";
      const d = S.alvo ? descreverAlvo(J, S.alvo) : null; HUD.dica.textContent = d ? d.txt : ""; HUD.dica.className = d && !d.ok ? "ruim" : "";
      while (J.avisos.length) { const a = J.avisos.shift(); if (a && a.texto) S.msgs.push({ t: 5, texto: a.texto }); }
      S.msgs = S.msgs.filter((m) => (m.t -= 0.1) > 0).slice(-5); HUD.msgs.innerHTML = S.msgs.map((m) => `<div>${m.texto}</div>`).join("");
    }
    // nomes sobre colonos próximos
    const usados = new Set();
    for (const [x, y, z, nome] of rotulos) { const [qx, qy, qz] = naTela(x, y, z); if (qz > 1) continue; let el = nomesEl.get(nome); if (!el) { el = document.createElement("span"); el.textContent = nome; rotEl.appendChild(el); nomesEl.set(nome, el); } el.style.transform = `translate(${qx}px,${qy}px) translate(-50%,-100%)`; el.style.display = "block"; usados.add(nome); }
    for (const [nome, el] of nomesEl) if (!usados.has(nome)) el.style.display = "none";
    requestAnimationFrame(quadro);
  }
  window.__proto = { arv3d, J, S, orb, cam, mundo, renderer, passo, quadro: () => 0 };
  document.getElementById("carregando").remove();
  requestAnimationFrame(quadro);
}
iniciar();
