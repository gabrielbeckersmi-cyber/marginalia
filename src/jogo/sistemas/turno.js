// TURNO DE TRABALHO do jogador — ao escolher "Trabalhar" num negócio (seu ou onde é empregado) ele fica lá, SEM CONTROLE, por 8 h de jogo
// (1 h = 60 s) ou até apertar Cancelar. Trabalhar pelo menos 6 h garante o pagamento (salário do empregador + Benefício da Coroa), 1× por dia.
// Durante o turno o jogador produz sozinho (melhor receita possível) ou treina comércio no mercado.
import { C } from "../config.js";
import { CONSTR } from "../dados/construcoes.js";
import { hab, ganhar } from "./habilidades.js";
import * as neg from "./negocios.js";
import * as eco from "./economia.js";
import { distAteConstr } from "./construcao.js";

export const TURNO = { duracao: 8 * 60, minimo: 6 * 60 };          // em segundos de jogo
export const horasTxt = (s) => `${Math.floor(s / 60)}h${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Pode começar turno em `b`? Devolve null se sim, ou o motivo. */
export function motivoNaoPodeTrabalhar(J, b) {
  const p = J.jogador;
  if (J.turno) return "Você já está trabalhando";
  if (!b || b.prog < 1 || !CONSTR[b.tipo].negocio) return "Aqui não há trabalho";
  if (!(b.dono === 0 || p.emprego === b.id)) return "Você não trabalha aqui";
  if (p.dormindo || J.chegando) return "Agora não";
  if (distAteConstr(b, p.x, p.y) > C.ALCANCE + 30) return "Chegue mais perto";
  if (p.cans >= 90) return "Você está exausto demais";
  return null;
}
export function iniciarTurno(J, b) {
  const m = motivoNaoPodeTrabalhar(J, b); if (m) return { ok: false, motivo: m };
  const p = J.jogador; p.dir = 3; p.mov = false; J.acao = null; p.fab = null;
  J.turno = { b: b.id, t: 0, produzido: 0, msg: "" };
  J.avisos.push({ tipo: "item", texto: `Você começou o turno em: ${CONSTR[b.tipo].nome}` });
  return { ok: true };
}
/** Termina o turno (por tempo completo ou cancelamento) e paga se cumpriu o mínimo. */
export function cancelarTurno(J, motivo = "Turno cancelado") {
  const T = J.turno; if (!T) return; J.turno = null;
  const p = J.jogador; p.trab = false; p.fab = null;
  if (T.t < TURNO.minimo) { J.avisos.push({ tipo: "item", texto: `${motivo} — só ${horasTxt(T.t)} de 6h: sem pagamento` }); return; }
  J.avisos.push({ tipo: "item", texto: motivo });
  pagarTurno(J, T);
}
function pagarTurno(J, T) {
  const p = J.jogador, b = J.constrPorId.get(T.b); if (!b) return;
  if (p.pagoDia === J.dia) { J.avisos.push({ tipo: "item", texto: "Você já recebeu hoje" }); return; }
  let total = 0, falta = "";
  if (b.dono !== 0) {                         // empregado: salário combinado, do ouro do dono
    const dono = eco.donoDe(J, b), sal = p.salario ?? (b.vaga && b.vaga.salario) ?? 0;
    if (dono && sal > 0) { const s = Math.min(dono.ouro, sal); dono.ouro -= s; p.ouro += s; total += s; if (s < sal) falta = " (o dono não tinha o suficiente)"; }
    else if (!dono) falta = " (o dono não existe mais)";
  }
  const coroa = eco.beneficioCoroa(J, p, true); p.ouro += coroa; total += coroa; J.eco.injetadoHoje += coroa;
  p.pagoDia = J.dia; p.trabalhouHoje = true;
  J.avisos.push({ tipo: "item", texto: `Turno pago: +${total} moedas${falta}` });
}
/** Chamado uma vez por passo com o tempo de jogo decorrido (d). */
export function atualizarTurno(J, d) {
  const T = J.turno; if (!T) return;
  const p = J.jogador, b = J.constrPorId.get(T.b);
  if (!b || b.prog < 1) return cancelarTurno(J, "O local de trabalho não existe mais");
  if (p.dormindo) return cancelarTurno(J, "Você desmaiou de cansaço");
  if (J.jogadorMorreu) { J.turno = null; return; }
  T.t += d; p.trab = true; p.trabHab = "fabricar"; p.mov = false; p.anim = (p.anim || 0) + d * 3;
  const dn = CONSTR[b.tipo];
  if (dn.mercado) { ganhar(p, "comercio", 0.05 * d); T.msg = "Atendendo no balcão"; }
  else {
    if (!T.a) { const r = neg.melhorAcao(J, p, b); if (r.a) { T.a = r.a; T.msg = `Produzindo: ${r.a.saida}`; } else T.msg = r.falta; }
    if (T.a) { const r = neg.avancar(J, p, b, T.a, d); if (r.erro || r.fim) { if (r.fim) T.produzido += r.qtd; T.a = null; } }
  }
  if (T.t >= TURNO.duracao) cancelarTurno(J, "Fim do turno");
}
