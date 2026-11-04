// OCLUSÃO — quando uma árvore/parede/telhado fica entre a câmera e o personagem, o trecho perto do personagem fica translúcido
// (pontilhado de tela, ~22% opaco). Um único uniform (uJog) é compartilhado por todos os materiais que chamarem `comOclusao`.
import * as THREE from "three";
export const uJog = { value: new THREE.Vector4(-9999, -9999, 0, 100) };   // xy = pixel do personagem, z = distância dele à câmera, w = raio (px)
const ALFA_MIN = 0.22;

/** Acrescenta a oclusão a um material THREE (usa onBeforeCompile; encadeia com um já existente). */
export function comOclusao(mat, id = "ocl") {
  const antes = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (antes) antes(sh, r);
    sh.uniforms.uJog = uJog;
    sh.vertexShader = sh.vertexShader.replace("void main() {", "varying vec3 vVPo;\nvoid main() {").replace("#include <project_vertex>", "#include <project_vertex>\nvVPo = mvPosition.xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", "uniform vec4 uJog; varying vec3 vVPo;\nvoid main() {\n" +
      `  { float dj = length(vVPo); if (dj < uJog.z - 0.5) { float dd = length(gl_FragCoord.xy - uJog.xy); float k = smoothstep(uJog.w * 0.55, uJog.w, dd);
    float manter = mix(${ALFA_MIN.toFixed(2)}, 1.0, k); if (manter < 1.0 && fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) > manter) discard; } }\n`);
  };
  const chave = mat.customProgramCacheKey; mat.customProgramCacheKey = () => (chave ? chave.call(mat) : "") + "|" + id;
  return mat;
}
