// ENTRADA UNIFICADA — teclado, mouse e controle (Steam Deck / Xbox / PlayStation) viram as mesmas "ações".
// O jogo nunca pergunta "qual tecla?"; pergunta "apertou(confirmar)?" e "mover()". Assim o controle funciona de graça.
// glifo("confirmar") devolve o nome certo do botão conforme o último dispositivo usado (Enter / A / ...).
const ACOES = {
  cima: { teclas: ["ArrowUp", "KeyW"], botoes: [12] },
  baixo: { teclas: ["ArrowDown", "KeyS"], botoes: [13] },
  esquerda: { teclas: ["ArrowLeft", "KeyA"], botoes: [14] },
  direita: { teclas: ["ArrowRight", "KeyD"], botoes: [15] },
  confirmar: { teclas: ["Enter", "Space", "NumpadEnter"], botoes: [0] },
  voltar: { teclas: ["Escape", "Backspace"], botoes: [1] },
  pausar: { teclas: ["Escape", "KeyP"], botoes: [9] },
  // ações do jogo (Marginália)
  interagir: { teclas: ["KeyE"], botoes: [0] },
  atacar: { teclas: [], botoes: [2] },   // só controle: no teclado/mouse o ataque é com o mouse
  inventario: { teclas: ["KeyI", "Tab"], botoes: [3] },
  construir: { teclas: ["KeyB"], botoes: [4] },
  habilidades: { teclas: ["KeyK"], botoes: [5] },
  mapa: { teclas: ["KeyM"], botoes: [8] },
  dormir: { teclas: ["KeyZ"], botoes: [7] },
  comer: { teclas: ["KeyF"], botoes: [6] },
  cantil: { teclas: ["KeyR"], botoes: [10] },
  cancelar: { teclas: ["KeyX"], botoes: [] },
  criar: { teclas: ["KeyC"], botoes: [] },
};
const GLIFOS = {
  teclado: { confirmar: "Enter", voltar: "Esc", pausar: "Esc", mover: "WASD", mirar: "Mouse" },
  gamepad: { confirmar: "A", voltar: "B", pausar: "Start", mover: "L", mirar: "R" },
};

const teclas = new Set();
const novas = new Set();      // ações pressionadas neste passo
const botoesAntes = new Set();
const botoesAgora = new Set();
let pad = null;
let dispositivo = "teclado";
const ponteiro = { x: 640, y: 360, moveu: false, clicou: false, baixo: false, direito: false, cliqueDireito: false, roda: 0, ultimoMov: 0 };
let paraLogico = (x, y) => ({ x, y });

export function iniciarEntrada(canvas, conversor) {
  paraLogico = conversor;
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Tab") e.preventDefault();
    if (e.repeat) { teclas.add(e.code); return; }
    teclas.add(e.code);
    dispositivo = "teclado";
    for (const [acao, def] of Object.entries(ACOES)) if (def.teclas.includes(e.code)) novas.add(acao);
  });
  window.addEventListener("keyup", (e) => teclas.delete(e.code));
  window.addEventListener("blur", () => teclas.clear());
  canvas.addEventListener("pointermove", (e) => {
    const p = paraLogico(e.clientX, e.clientY);
    ponteiro.x = p.x; ponteiro.y = p.y; ponteiro.moveu = true; ponteiro.ultimoMov = performance.now();
    dispositivo = "mouse";
  });
  canvas.addEventListener("pointerdown", (e) => {
    const p = paraLogico(e.clientX, e.clientY);
    ponteiro.x = p.x; ponteiro.y = p.y; dispositivo = "mouse";
    if (e.button === 2) { ponteiro.direito = true; ponteiro.cliqueDireito = true; } else { ponteiro.baixo = true; ponteiro.clicou = true; }
    canvas.focus();
  });
  window.addEventListener("pointerup", (e) => { if (e.button === 2) ponteiro.direito = false; else ponteiro.baixo = false; });
  canvas.addEventListener("wheel", (e) => { ponteiro.roda += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}

/** Lê o controle (chame uma vez por passo). Zona morta aplicada. */
export function sondar() {
  botoesAntes.clear();
  botoesAgora.forEach((b) => botoesAntes.add(b));
  botoesAgora.clear();
  pad = null;
  const lista = (navigator.getGamepads && navigator.getGamepads()) || [];
  for (const g of lista) if (g && g.connected) { pad = g; break; }
  if (!pad) return;
  pad.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.6) botoesAgora.add(i); });
  for (const [acao, def] of Object.entries(ACOES)) {
    if (def.botoes.some((b) => botoesAgora.has(b) && !botoesAntes.has(b))) { novas.add(acao); dispositivo = "gamepad"; }
  }
  // Direcional por analógico também navega nos menus
  const eixoY = pad.axes[1] || 0, eixoX = pad.axes[0] || 0;
  if (Math.abs(eixoY) > 0.6 || Math.abs(eixoX) > 0.6) dispositivo = "gamepad";
}

/** Chame ao FIM de cada passo da simulação. */
export function fimPasso() {
  novas.clear();
  ponteiro.clicou = false; ponteiro.cliqueDireito = false; ponteiro.roda = 0;
  ponteiro.moveu = false;
}

const zona = (v, z = 0.2) => (Math.abs(v) < z ? 0 : v);

/** Ação pressionada agora (segurando). */
export function segurando(acao) {
  const def = ACOES[acao];
  return def.teclas.some((k) => teclas.has(k)) || def.botoes.some((b) => botoesAgora.has(b));
}
/** Ação que COMEÇOU a ser pressionada neste passo (use em menus). */
export const apertou = (acao) => novas.has(acao);

/** Direção de movimento, vetor com tamanho ≤ 1. */
export function mover() {
  let x = (teclas.has("ArrowRight") || teclas.has("KeyD") ? 1 : 0) - (teclas.has("ArrowLeft") || teclas.has("KeyA") ? 1 : 0);
  let y = (teclas.has("ArrowDown") || teclas.has("KeyS") ? 1 : 0) - (teclas.has("ArrowUp") || teclas.has("KeyW") ? 1 : 0);
  if (pad) {
    x += zona(pad.axes[0] || 0) + (botoesAgora.has(15) ? 1 : 0) - (botoesAgora.has(14) ? 1 : 0);
    y += zona(pad.axes[1] || 0) + (botoesAgora.has(13) ? 1 : 0) - (botoesAgora.has(12) ? 1 : 0);
  }
  const m = Math.hypot(x, y);
  return m > 1 ? { x: x / m, y: y / m } : { x, y };
}

/** Segurando Shift (ou clique do analógico esquerdo): correr. */
export const correr = () => teclas.has("ShiftLeft") || teclas.has("ShiftRight") || botoesAgora.has(11);

/** Direção de mira (vetor unitário) ou null se o jogador não está mirando. Mouse tem prioridade se foi mexido há pouco. */
export function mirar(origem) {
  if (pad) {
    const x = zona(pad.axes[2] || 0, 0.3), y = zona(pad.axes[3] || 0, 0.3);
    if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m }; }
  }
  if (dispositivo === "mouse") {
    const dx = ponteiro.x - origem.x, dy = ponteiro.y - origem.y, m = Math.hypot(dx, dy);
    if (m > 8) return { x: dx / m, y: dy / m };
  }
  return null;
}

export const ponteiroAtual = () => ponteiro;
export const dispositivoAtual = () => dispositivo;
export const temControle = () => !!pad;
/** Nome do botão para mostrar na tela, conforme o dispositivo em uso. */
export const glifo = (acao) => (GLIFOS[dispositivo === "gamepad" ? "gamepad" : "teclado"][acao] || acao);

// Para testes automáticos: injeta uma ação como se o jogador tivesse apertado.
export function simular(acao) { novas.add(acao); }
export function simularTecla(codigo, ligado) { if (ligado) teclas.add(codigo); else teclas.delete(codigo); }
