// ÁUDIO — efeitos gerados por código (sem arquivos de som). Para sons reais (.ogg), solte em public/assets/ e use new Audio("assets/x.ogg").
// O áudio é suspenso quando a janela perde o foco (ex.: overlay da Steam) e volta sozinho.
let ctx = null;
let mudo = false;
let volume = 0.8;

function obter() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
  return ctx;
}
export const definirMudo = (v) => { mudo = !!v; };
export const definirVolume = (v) => { volume = Math.max(0, Math.min(1, v)); };
export const estaMudo = () => mudo;

export function beep(freq = 660, duracao = 0.07, tipo = "sine", vol = 0.12, deslize = 0) {
  if (mudo) return;
  const c = obter();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (c.state !== "running") return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (deslize) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + deslize), c.currentTime + duracao);
  g.gain.setValueAtTime(vol * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duracao);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duracao);
}

export const sons = {
  tiro: () => beep(880, 0.04, "square", 0.04, -300),
  abate: () => beep(240, 0.12, "sawtooth", 0.09, -150),
  dano: () => beep(120, 0.25, "sawtooth", 0.16, -60),
  item: () => { beep(520, 0.08, "triangle", 0.1); setTimeout(() => beep(780, 0.1, "triangle", 0.1), 70); },
  onda: () => { beep(440, 0.1, "square", 0.07); setTimeout(() => beep(660, 0.14, "square", 0.07), 110); },
  conquista: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.14, "triangle", 0.1), i * 90)); },
  menu: () => beep(600, 0.04, "sine", 0.06),
  confirmar: () => beep(900, 0.07, "triangle", 0.08),
  fim: () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => beep(f, 0.22, "sawtooth", 0.09), i * 160)); },
};

export function suspender() { if (ctx && ctx.state === "running") ctx.suspend().catch(() => {}); }
export function retomar() { if (ctx && ctx.state === "suspended" && !mudo) ctx.resume().catch(() => {}); }
