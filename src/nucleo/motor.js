// MOTOR — laço de jogo com passo FIXO de 1/60 s (a física não muda com o FPS do monitor/Steam Deck),
// pilha de cenas (menu → jogo → pausa), e escala automática da tela lógica 16:9 para qualquer janela.
import * as entrada from "./entrada.js";

const PASSO = 1 / 60;

export function criarMotor(canvas, CONFIG) {
  const L = CONFIG.janela.resolucaoLogica.largura;
  const A = CONFIG.janela.resolucaoLogica.altura;
  const ctx = canvas.getContext("2d");
  const pilha = [];
  let ultimo = 0, acum = 0, fps = 0, quadros = 0, tFps = 0, mostrarFps = false;

  function ajustar() {
    const dpr = window.devicePixelRatio || 1;
    const esc = Math.min(window.innerWidth / L, window.innerHeight / A);
    canvas.style.width = Math.floor(L * esc) + "px";
    canvas.style.height = Math.floor(A * esc) + "px";
    canvas.width = Math.max(1, Math.round(L * esc * dpr));
    canvas.height = Math.max(1, Math.round(A * esc * dpr));
    ctx.setTransform(canvas.width / L, 0, 0, canvas.height / A, 0, 0);
  }
  /** Converte coordenadas da janela (clientX/Y) para a tela lógica. */
  function paraLogico(cx, cy) {
    const r = canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * L, y: ((cy - r.top) / r.height) * A };
  }

  const topo = () => pilha[pilha.length - 1];
  function empurrar(cena) { topo()?.pausar?.(); pilha.push(cena); cena.entrar?.(); }
  function remover() { const c = pilha.pop(); c?.sair?.(); topo()?.retomar?.(); }
  function trocar(cena) { while (pilha.length) pilha.pop().sair?.(); pilha.push(cena); cena.entrar?.(); }

  function desenhar() {
    ctx.setTransform(canvas.width / L, 0, 0, canvas.height / A, 0, 0);
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, L, A);
    // desenha a partir da última cena opaca (as de cima podem ser "transparentes", como a pausa)
    let ini = pilha.length - 1;
    while (ini > 0 && pilha[ini].transparente) ini--;
    for (let i = Math.max(0, ini); i < pilha.length; i++) pilha[i].desenhar(ctx, L, A);
    if (mostrarFps) {
      ctx.fillStyle = "#9fb"; ctx.font = "16px monospace"; ctx.textAlign = "left";
      ctx.fillText(`${fps} fps · cenas: ${pilha.length}`, 10, A - 10);
    }
  }

  function passo() {
    entrada.sondar();
    topo()?.atualizar?.(PASSO);
    entrada.fimPasso();
  }

  function quadro(agora) {
    requestAnimationFrame(quadro);
    let dt = (agora - ultimo) / 1000;
    ultimo = agora;
    if (dt > 0.25) dt = 0.25; // voltou de uma pausa longa (overlay da Steam, aba oculta): não "recupera" o tempo perdido
    acum += dt;
    let n = 0;
    while (acum >= PASSO && n < 5) { passo(); acum -= PASSO; n++; }
    if (n === 5) acum = 0;
    quadros++; tFps += dt;
    if (tFps >= 0.5) { fps = Math.round(quadros / tFps); quadros = 0; tFps = 0; }
    desenhar();
  }

  function iniciar() {
    ajustar();
    window.addEventListener("resize", ajustar);
    document.addEventListener("fullscreenchange", ajustar);
    const perdeu = () => topo()?.perdeuFoco?.();
    window.addEventListener("blur", perdeu);
    document.addEventListener("visibilitychange", () => { if (document.hidden) perdeu(); });
    requestAnimationFrame((t) => { ultimo = t; requestAnimationFrame(quadro); });
  }

  /** Só para testes automáticos: roda `segundos` de simulação de forma síncrona. */
  function avancar(segundos) {
    const n = Math.round(segundos / PASSO);
    for (let i = 0; i < n; i++) passo();
    desenhar();
    return n;
  }

  return {
    ctx, L, A, iniciar, empurrar, remover, trocar, avancar, paraLogico,
    topo, profundidade: () => pilha.length,
    alternarFps: () => { mostrarFps = !mostrarFps; },
  };
}
