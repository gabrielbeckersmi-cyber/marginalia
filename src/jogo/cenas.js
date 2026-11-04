// CENAS E MENUS — título, criação de personagem, carregamento, pausa, opções e conquistas. A partida em si está em cena_jogo.js.
// Tudo é desenhado no canvas com o estilo único de visual/estilo.js (funciona igual com mouse, teclado e controle).
import CONFIG from "../../CONFIGURE-AQUI.js";
import * as entrada from "../nucleo/entrada.js";
import * as audio from "../nucleo/audio.js";
import { sons } from "../nucleo/audio.js";
import { arte } from "../nucleo/assets.js";
import { t, local, idiomaAtual, trocarIdioma } from "../nucleo/i18n.js";
import { P, emElectron } from "../nucleo/plataforma.js";
import * as steam from "../servicos/steam.js";
import { novoJogo, restaurar, serializar } from "./estado.js";
import { criarCenaJogo } from "./cena_jogo.js";
import { NUM_PESSOAS, ehFeminino } from "./dados/arte.js";
import { HAB } from "./dados/habilidades.js";
import { NOMES_M, NOMES_F, SOBRENOMES } from "./dados/nomes.js";
import { ui, texto, painel, botao, menuVertical, PAL, padraoPapel } from "./visual/estilo.js";
import { desenharQuadro } from "./visual/sprites.js";

// ── Avisos (toasts) de conquista ──
const toasts = [];
export function mostrarToast(id) { toasts.push({ id, ate: performance.now() + 4500 }); sons.conquista(); }
function desenharToasts(ctx, L) {
  const agora = performance.now(); while (toasts.length && toasts[0].ate < agora) toasts.shift();
  toasts.slice(0, 3).forEach((tt, i) => {
    const c = CONFIG.conquistas.find((x) => x.id === tt.id); if (!c) return;
    const w = 380, x = L - w - 20, y = 220 + i * 84; painel(ctx, x, y, w, 70, { bloquear: false });
    texto(ctx, "★", x + 36, y + 46, { tam: 34, cor: PAL.ouro, alinhar: "center" });
    texto(ctx, t("conquista_desbloqueada"), x + 66, y + 28, { tam: 14, cor: PAL.ferrugem, peso: "bold" }); texto(ctx, local(c.nome), x + 66, y + 54, { tam: 21 });
  });
}
const sorteio = (a) => a[Math.floor(Math.random() * a.length)];
const sorteioNome = (fem) => `${sorteio(fem ? NOMES_F : NOMES_M)} ${sorteio(SOBRENOMES)}`;

export function criarCenas(G) {
  const { motor } = G, L = motor.L, A = motor.A, estado = () => G.estado;

  function fundoCapa(ctx, escurecer = 0) {
    const img = arte("capa");
    if (img) { const k = Math.max(L / img.width, A / img.height); ctx.drawImage(img, (L - img.width * k) / 2, (A - img.height * k) / 2, img.width * k, img.height * k); }
    else { ctx.fillStyle = padraoPapel(ctx); ctx.fillRect(0, 0, L, A); }
    if (escurecer) { ctx.fillStyle = `rgba(30,18,8,${escurecer})`; ctx.fillRect(0, 0, L, A); }
  }
  const sincroniza = () => ui.sincronizar();

  // ── carregando (dá um quadro para a tela aparecer antes do trabalho pesado) ──
  function cenaCarregando(msg, tarefa) {
    let q = 0;
    return {
      atualizar() { if (++q === 3) tarefa(); },
      desenhar(ctx) { fundoCapa(ctx, 0.45); painel(ctx, L / 2 - 260, A / 2 - 50, 520, 100, { bloquear: false }); texto(ctx, msg, L / 2, A / 2 + 10, { tam: 26, alinhar: "center" }); ui.fimQuadro(); },
    };
  }
  function iniciarPartida(J) { motor.trocar(criarCenaJogo(G, J, { aoPausar, aoMenu })); }
  function novaPartida(aparencia) {
    motor.trocar(cenaCarregando("Gerando a ilha…", () => {
      const J = novoJogo((Math.random() * 2 ** 31) | 0, aparencia); estado().partida = null; steam.desbloquear(estado(), "CHEGADA"); iniciarPartida(J);
    }));
  }
  function continuar() {
    motor.trocar(cenaCarregando("Carregando a ilha…", () => { iniciarPartida(restaurar(estado().partida)); }));
  }
  function aoPausar(S) { motor.empurrar(cenaPausa(S)); }
  function aoMenu(S) { if (!S.morreu) { estado().partida = serializar(S.J); } else estado().partida = null; G.guardar(true); motor.trocar(cenaTitulo()); }

  // ── Título ──
  function cenaTitulo() {
    const est = {}; let confirmando = false;
    return {
      entrar() { steam.presenca("steam_display", "#Menu"); },
      atualizar() { sincroniza(); },
      desenhar(ctx) {
        fundoCapa(ctx);
        texto(ctx, CONFIG.jogo.nome, L / 2, 100, { tam: 82, alinhar: "center", peso: "bold", cor: "#3a2312", estilo: "italic" });
        texto(ctx, "Uma ilha por colonizar", L / 2, 134, { tam: 22, alinhar: "center", cor: "#6a4a28", estilo: "italic" });
        const tem = !!estado().partida;
        painel(ctx, 36, 290, 360, 400, { bloquear: true });
        if (confirmando) {
          texto(ctx, "Já existe uma partida salva.", 216, 346, { tam: 20, alinhar: "center" }); texto(ctx, "Começar outra apaga a atual.", 216, 374, { tam: 20, alinhar: "center" });
          menuVertical(ctx, est, [{ rotulo: "Apagar e começar nova", acao: () => { confirmando = false; motor.trocar(cenaCriacao()); } }, { rotulo: "Voltar", acao: () => { confirmando = false; } }], 216, 410, 300, 50, 12);
        } else {
          const it = [{ rotulo: "Continuar", acao: continuar, desab: !tem }, { rotulo: "Novo jogo", acao: () => { if (tem) confirmando = true; else motor.trocar(cenaCriacao()); } }, { rotulo: t("conquistas"), acao: () => motor.empurrar(cenaConquistas()) }, { rotulo: t("opcoes"), acao: () => motor.empurrar(cenaOpcoes()) }];
          if (emElectron) it.push({ rotulo: t("sair"), acao: () => P.janela.sair() });
          menuVertical(ctx, est, it, 216, 316, 300, 52, 14);
        }
        const si = steam.obterInfo(), linha = si.disponivel ? t("steam_conectada", { nome: si.nome }) : si.modo === "mock" ? t("steam_teste") : t("steam_desligada");
        texto(ctx, linha, 20, A - 14, { tam: 14, cor: "#f6ecd0", sombra: true });
        texto(ctx, t("versao", { v: CONFIG.jogo.versao }) + (CONFIG.MODO_TESTE ? "  ·  " + t("modo_teste") : ""), L - 20, A - 14, { tam: 14, cor: "#f6ecd0", alinhar: "right", sombra: true });
        desenharToasts(ctx, L); ui.fimQuadro();
      },
    };
  }

  // ── Criação de personagem (só aparência; todos os atributos começam em 1) ──
  function cenaCriacao() {
    const f = { sprite: "pessoa_1", nome: sorteioNome(false), fem: false }; let tempo = 0, enter = false; const est = {};
    const tecla = (e) => {
      if (e.key === "Enter") { enter = true; return; } if (e.key === "Backspace") { f.nome = f.nome.slice(0, -1); return; }
      if (e.key.length === 1 && f.nome.length < 22 && !e.ctrlKey && !e.metaKey) { f.nome += e.key; e.stopPropagation?.(); }
    };
    return {
      entrar() { window.addEventListener("keydown", tecla); }, sair() { window.removeEventListener("keydown", tecla); },
      atualizar(dt) { tempo += dt; sincroniza(); if (!enter) ui.confirmar = false; enter = false; },
      desenhar(ctx) {
        fundoCapa(ctx, 0.35);
        painel(ctx, 60, 50, 1160, 620, { titulo: "Quem é você?" });
        // pré-visualização girando
        ctx.save(); ctx.beginPath(); ctx.roundRect(100, 110, 280, 330, 8); ctx.fillStyle = "#c9ad6c90"; ctx.fill(); ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        const dir = Math.floor(tempo / 1.2) % 4, passo = Math.floor(tempo * 7) % 4; desenharQuadro(ctx, f.sprite, dir * 4 + passo, 240, 410, 250);
        texto(ctx, "Aparência", 420, 128, { tam: 22, peso: "bold" });
        for (let i = 1; i <= NUM_PESSOAS; i++) {
          const cx = 420 + ((i - 1) % 5) * 150, cy = 144 + Math.floor((i - 1) / 5) * 150, sel = f.sprite === "pessoa_" + i, hover = ui.dentro(cx, cy, 140, 140);
          ctx.fillStyle = sel ? "#f0e0b0" : hover ? "#e8d4a0" : "#d6bd8680"; ctx.strokeStyle = sel ? PAL.ferrugem : PAL.tintaClara; ctx.lineWidth = sel ? 4 : 2; ctx.beginPath(); ctx.roundRect(cx, cy, 140, 140, 8); ctx.fill(); ctx.stroke();
          desenharQuadro(ctx, "pessoa_" + i, 0, cx + 70, cy + 134, 130); ui.bloquear(cx, cy, 140, 140);
          if (hover && ui.clique) { ui.clique = false; const antes = ehFeminino(f.sprite); f.sprite = "pessoa_" + i; f.fem = ehFeminino(f.sprite); if (f.fem !== antes) f.nome = sorteioNome(f.fem); sons.menu(); }
        }
        texto(ctx, "Nome", 100, 480, { tam: 22, peso: "bold" });
        ctx.fillStyle = "#f3e6c2"; ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(100, 494, 450, 46, 6); ctx.fill(); ctx.stroke();
        texto(ctx, f.nome + (Math.floor(tempo * 2) % 2 ? "|" : ""), 114, 526, { tam: 26 });
        if (botao(ctx, 566, 494, 160, 46, "Sortear", { tam: 18 })) f.nome = sorteioNome(ehFeminino(f.sprite));
        texto(ctx, "Atributos", 760, 480, { tam: 22, peso: "bold" });
        texto(ctx, "Todas as 12 habilidades começam no nível 1.", 760, 510, { tam: 16, cor: PAL.tintaClara }); texto(ctx, "Evolua praticando ou pagando mestres.", 760, 532, { tam: 16, cor: PAL.tintaClara });
        texto(ctx, "Você chegará de navio com mais 19 colonos para fundar a primeira cidade.", 100, 580, { tam: 18, cor: PAL.tintaClara, estilo: "italic" });
        const ok = f.nome.trim().length >= 2;
        if (botao(ctx, 760, 590, 220, 56, "Zarpar!", { desab: !ok, tam: 24 })) novaPartida({ sprite: f.sprite, nome: f.nome.trim(), fem: ehFeminino(f.sprite) });
        if (botao(ctx, 996, 590, 190, 56, t("voltar"), { tam: 22 }) ) motor.trocar(cenaTitulo());
        ui.fimQuadro();
      },
    };
  }

  // ── Pausa ──
  function cenaPausa(S) {
    const est = {};
    return {
      transparente: true,
      entrar() { audio.suspender(); }, sair() { audio.retomar(); },
      atualizar() { sincroniza(); if (entrada.apertou("voltar") || entrada.apertou("pausar")) motor.remover(); },
      desenhar(ctx) {
        ctx.fillStyle = "#140a0488"; ctx.fillRect(0, 0, L, A);
        painel(ctx, L / 2 - 230, 120, 460, 460, { titulo: t("pausado") });
        menuVertical(ctx, est, [{ rotulo: t("continuar"), acao: () => motor.remover() }, { rotulo: "Salvar agora", acao: () => { estado().partida = serializar(S.J); G.guardar(true); S.J.avisos.push({ tipo: "item", texto: "Jogo salvo" }); motor.remover(); } }, { rotulo: t("opcoes"), acao: () => motor.empurrar(cenaOpcoes()) }, { rotulo: "Salvar e voltar ao menu", acao: () => aoMenu(S) }], L / 2, 190, 360, 54, 14);
        ui.fimQuadro();
      },
    };
  }

  // ── Conquistas ──
  function cenaConquistas() {
    const lista = CONFIG.conquistas; let rolagem = 0;
    return {
      atualizar() { sincroniza(); if (entrada.apertou("voltar")) motor.remover(); rolagem = Math.max(0, Math.min(Math.max(0, lista.length - 5), rolagem + ui.roda)); ui.roda = 0; },
      desenhar(ctx) {
        fundoCapa(ctx, 0.5); painel(ctx, L / 2 - 460, 40, 920, 640, { titulo: t("conquistas") });
        const feitas = lista.filter((c) => estado().conquistas[c.id]).length; texto(ctx, t("conquistas_progresso", { a: feitas, b: lista.length }), L / 2, 84, { tam: 17, alinhar: "center", cor: PAL.tintaClara });
        lista.slice(rolagem, rolagem + 5).forEach((c, k) => {
          const y = 104 + k * 94, ok = !!estado().conquistas[c.id], escondida = c.oculta && !ok;
          ctx.fillStyle = ok ? "#f0e0b0" : "#d6bd8666"; ctx.strokeStyle = ok ? PAL.ouro : PAL.tintaClara; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(L / 2 - 420, y, 840, 84, 8); ctx.fill(); ctx.stroke();
          texto(ctx, ok ? "★" : "☆", L / 2 - 376, y + 54, { tam: 42, cor: ok ? PAL.ouro : "#8a7a58", alinhar: "center" });
          texto(ctx, escondida ? t("conquista_oculta") : local(c.nome), L / 2 - 330, y + 36, { tam: 24, peso: "bold", cor: ok ? PAL.tinta : PAL.tintaClara });
          texto(ctx, escondida ? t("conquista_oculta_desc") : local(c.descricao), L / 2 - 330, y + 64, { tam: 17, cor: PAL.tintaClara });
        });
        if (botao(ctx, L / 2 - 110, A - 82, 220, 46, t("voltar"))) motor.remover();
        ui.fimQuadro();
      },
    };
  }

  // ── Opções ──
  function cenaOpcoes() {
    let telaCheia = false; const est = {}; P.janela.eTelaCheia().then((v) => { telaCheia = !!v; }).catch(() => {});
    return {
      atualizar() { sincroniza(); if (entrada.apertou("voltar")) motor.remover(); },
      desenhar(ctx) {
        fundoCapa(ctx, 0.5); painel(ctx, L / 2 - 250, 140, 500, 420, { titulo: t("opcoes") });
        menuVertical(ctx, est, [
          { rotulo: `${t("opcoes_som")}: ${estado().opcoes.mudo ? t("desligado") : t("ligado")}`, acao: () => { estado().opcoes.mudo = !estado().opcoes.mudo; audio.definirMudo(estado().opcoes.mudo); G.guardar(); } },
          { rotulo: `${t("opcoes_tela_cheia")}: ${telaCheia ? t("ligado") : t("desligado")}`, acao: async () => { telaCheia = !!(await P.janela.telaCheia(!telaCheia)); estado().opcoes.telaCheia = telaCheia; G.guardar(); } },
          { rotulo: t("voltar"), acao: () => motor.remover() },
        ], L / 2, 210, 380, 54, 16);
        ui.fimQuadro();
      },
    };
  }

  return { titulo: cenaTitulo, criacao: cenaCriacao, conquistas: cenaConquistas, opcoes: cenaOpcoes, continuar, novaPartida };
}
