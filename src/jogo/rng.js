// Números aleatórios com semente + ruído (mundo reproduzível: o save guarda só a semente).
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hash2(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const suave = (t) => t * t * (3 - 2 * t);
export function ruido(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = suave(x - xi), fy = suave(y - yi);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, s, oit = 4) { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oit; i++) { v += ruido(x * f, y * f, s + i * 101) * a; n += a; a *= 0.5; f *= 2; } return v / n; }
export const entre = (rng, a, b) => a + rng() * (b - a);
export const inteiro = (rng, a, b) => Math.floor(a + rng() * (b - a + 1));
export const escolher = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
