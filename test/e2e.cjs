// TESTE DE PONTA A PONTA no Electron de verdade (janela real, preload real, IPC real) com a Steam em modo "mock".
// Em servidor sem monitor use:  xvfb-run -a node test/e2e.cjs
// Saída: test/_saida/*.png (capturas de tela) e um relatório no terminal. Código de saída ≠ 0 se algo falhar.
const path = require("path");
const fs = require("fs");
const os = require("os");
const { _electron } = require("playwright-core");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "_saida");
fs.mkdirSync(saida, { recursive: true });
const dados = fs.mkdtempSync(path.join(os.tmpdir(), "jogo-e2e-"));
let falhas = 0;
const confere = (cond, msg) => { console.log((cond ? "  ✔ " : "  ✖ ") + msg); if (!cond) falhas++; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrir() {
  const app = await _electron.launch({
    executablePath: require("electron"),
    args: [".", "--no-sandbox", `--user-data-dir=${dados}`],
    cwd: raiz,
    env: { ...process.env, STEAM_MODO: "mock" },
  });
  const pagina = await app.firstWindow();
  pagina.on("pageerror", (e) => { console.log("  ✖ erro na página: " + e.message); falhas++; });
  await pagina.waitForFunction(() => window.__teste && window.__teste.motor.profundidade() > 0, null, { timeout: 20000 });
  return { app, pagina };
}

(async () => {
  console.log("\n▶ 1ª execução");
  let idiomaAntes = "";
  let { app, pagina } = await abrir();

  // Isolamento: o jogo NÃO pode ter acesso ao Node
  const iso = await pagina.evaluate(() => ({ req: typeof window.require, proc: typeof window.process, plat: typeof window.plataforma, fs: typeof window.plataforma?.fs, steam: Object.keys(window.plataforma.steam) }));
  confere(iso.req === "undefined" && iso.proc === "undefined", "renderer sem require/process (contextIsolation ok)");
  confere(iso.plat === "object" && iso.fs === "undefined", "só window.plataforma exposto");
  const info = await pagina.evaluate(() => window.__teste.info);
  confere(info.modo === "mock", `Steam em modo mock (modo=${info.modo})`);

  // Protocolo app:// bloqueia fugas de pasta
  const traversal = await pagina.evaluate(async () => (await fetch("app://jogo/..%2fCONFIGURE-AQUI.js")).status);
  confere(traversal === 403 || traversal === 404, `app:// recusa sair da pasta www (status ${traversal})`);
  const normal = await pagina.evaluate(async () => (await fetch("app://jogo/index.html")).status);
  confere(normal === 200, "app://jogo/index.html carrega (fetch funciona)");

  // IPC valida entradas
  const ipc = await pagina.evaluate(async () => ({
    leituraFora: await window.plataforma.arquivo.ler("../../etc/passwd"),
    gravaFora: await window.plataforma.arquivo.gravar("../x.txt", "oi"),
    conquistaRuim: await window.plataforma.steam.conquista("NAO_EXISTE"),
  }));
  confere(ipc.leituraFora === null && ipc.gravaFora === false && ipc.conquistaRuim === false, "IPC recusa nomes de arquivo/conquista inválidos");


  await pagina.screenshot({ path: path.join(saida, "01-titulo.png") });

  // ── Fluxo de jogador pela interface: Novo jogo → criação de personagem → Zarpar ──
  const clicar = async (x, y) => {
    const r = await pagina.evaluate(() => { const c = document.getElementById("tela").getBoundingClientRect(); return { l: c.left, t: c.top, w: c.width, h: c.height }; });
    await pagina.mouse.click(r.l + (x / 1280) * r.w, r.t + (y / 720) * r.h); await pagina.evaluate(() => window.__teste.motor.avancar(0.1));
  };
  const S = () => pagina.evaluate(() => { const s = window.__teste.motor.topo().S; return s ? { npcs: s.J.npcs.length, chegando: s.J.chegando, cidades: s.J.cidades.length, ouro: s.J.jogador.ouro, nome: s.J.jogador.nome, sprite: s.J.jogador.sede !== undefined && s.J.jogador.sprite, hab: s.J.jogador.hab.slice(), mortes: s.J.mortes, constr: s.J.construcoes.length, painel: s.painel } : null; });
  await clicar(216, 408);                                  // "Novo jogo" (Continuar está desabilitado)
  await pagina.screenshot({ path: path.join(saida, "02-criacao.png") });
  await clicar(570, 200);                                  // escolhe a aparência nº 2
  await pagina.evaluate(() => window.__teste.motor.avancar(0.1));
  await clicar(870, 618);                                  // Zarpar!
  await pagina.waitForFunction(() => window.__teste.motor.topo().S, null, { timeout: 20000 });
  let st = await S();
  confere(st && st.chegando === true && st.hab.every((v) => v === 1), `partida criada: chegando de navio, todos os atributos = 1 (sprite ${st && st.sprite})`);
  confere(st.sprite === "pessoa_2", "aparência escolhida na criação foi aplicada");
  await pagina.screenshot({ path: path.join(saida, "03-navio.png") });
  await pagina.evaluate(() => window.__teste.motor.avancar(45));
  st = await S(); confere(st.chegando === false && st.npcs === 19, `navio atracou e 19 colonos desembarcaram (${st.npcs})`);
  await pagina.screenshot({ path: path.join(saida, "04-porto.png") });

  // ── Fundar uma cidade: poço construído segurando o mouse (mesmo caminho do jogo) ──
  await pagina.evaluate(() => {
    const T = window.__teste, s = T.motor.topo().S, J = s.J, M = J.M, p = J.jogador, TS = 48, pt = M.porto;
    achou: for (let y = pt.ty - 140; y < pt.ty - 25; y++) for (let x = pt.tx - 80; x < pt.tx + 80; x++) {
      let ok = true; for (let dy = -2; dy <= 6 && ok; dy++) for (let dx = -4; dx <= 4; dx++) if (!T.mundo.caminhavel(M, x + dx, y + dy)) { ok = false; break; }
      if (ok) { for (let dy = -3; dy <= 7; dy++) for (let dx = -5; dx <= 5; dx++) M.feat[(y + dy) * M.N + x + dx] = 0; p.x = (x + 0.5) * TS; p.y = (y + 0.5) * TS; break achou; } }
    p.inv.pedra = 20; p.inv.madeira = 20; p.fome = p.sede = p.cans = 0; T.motor.avancar(1.5);
    const tx = Math.floor(p.x / TS) - 1, ty = Math.floor(p.y / TS) + 2, r = T.interacao.colocarObra(J, "poco", tx, ty);
    if (!r.ok) throw new Error("não colocou o poço: " + r.motivo);
    const alvo = T.interacao.alvoEm(J, (tx + 1) * TS, (ty + 1) * TS);
    for (let i = 0; i < 1500 && r.obra.prog < 1; i++) { T.interacao.atualizarJogador(J, { dir: { x: 0, y: 0 }, mundo: { x: 0, y: 0 }, segura: true, alvo }, 1 / 20); }
    T.motor.avancar(3.5);
  });
  st = await S(); confere(st.cidades === 1, "poço concluído funda a cidade");
  const conq = await pagina.evaluate(() => Object.keys(window.__teste.G.estado.conquistas).sort());
  confere(["CHEGADA", "FUNDADOR"].every((c) => conq.includes(c)), `conquistas CHEGADA e FUNDADOR registradas (${conq.join(", ")})`);
  await pagina.screenshot({ path: path.join(saida, "05-cidade-fundada.png") });

  // ── Painéis pelas teclas de atalho ──
  for (const [acao, id, arq] of [["inventario", "inventario", "06-mochila"], ["construir", "construir", "07-construir"], ["habilidades", "habilidades", "08-habilidades"], ["mapa", "mapa", "09-mapa"]]) {
    await pagina.evaluate((a) => { const T = window.__teste; T.motor.topo().S.painel = null; T.entrada.simular(a); T.motor.avancar(0.1); }, acao);
    confere((await S()).painel === id, `atalho abre o painel ${id}`);
    await pagina.screenshot({ path: path.join(saida, arq + ".png") });
  }
  await pagina.evaluate(() => { const T = window.__teste; T.motor.topo().S.painel = null; T.motor.avancar(0.1); });

  // ── 6 minutos de vida na ilha: colonos vivem sem quebrar nada ──
  await pagina.evaluate(() => { const J = window.__teste.motor.topo().S.J; for (let i = 0; i < 6; i++) { window.__teste.motor.avancar(60); J.jogador.fome = J.jogador.sede = J.jogador.cans = 0; } });
  st = await S(); confere(st.npcs >= 17 && st.mortes <= 3, `colonos sobrevivem 6 min (${st.npcs} vivos, ${st.mortes} mortes)`);
  await pagina.screenshot({ path: path.join(saida, "10-colonia.png") });

  // ── Pausa → salvar e voltar ao menu ──
  await pagina.evaluate(() => { window.__teste.entrada.simular("pausar"); window.__teste.motor.avancar(0.05); });
  confere(await pagina.evaluate(() => window.__teste.motor.profundidade() === 2), "Esc abre a pausa");
  await pagina.screenshot({ path: path.join(saida, "11-pausa.png") });
  await clicar(640, 190 + 3 * 68 + 27);                    // "Salvar e voltar ao menu"
  const salvou = await pagina.evaluate(() => { const p = window.__teste.G.estado.partida; return p ? { npcs: p.npcs.length, cidades: p.cidades.length, kb: Math.round(JSON.stringify(p).length / 1024) } : null; });
  confere(salvou && salvou.cidades >= 1, `partida gravada (${salvou && salvou.npcs} colonos, ${salvou && salvou.kb} KB)`);

  // Telas de conquistas e opções
  await pagina.evaluate(() => { const T = window.__teste; T.motor.trocar(T.cenas.titulo()); T.motor.empurrar(T.cenas.conquistas()); T.motor.avancar(0.1); });
  await pagina.screenshot({ path: path.join(saida, "12-conquistas.png") });
  await pagina.evaluate(() => { const T = window.__teste; T.motor.trocar(T.cenas.titulo()); T.motor.empurrar(T.cenas.opcoes()); T.motor.avancar(0.1); });
  await pagina.screenshot({ path: path.join(saida, "13-opcoes.png") });
  const ncons = salvou.npcs;

  // Fechar a janela: o Electron pede ao jogo para salvar antes
  await app.close();
  const arqSave = path.join(dados, "saves", "save.json");
  confere(fs.existsSync(arqSave), "save.json gravado na pasta de dados");

  console.log("\n▶ 2ª execução (a partida deve voltar pelo botão Continuar)");
  ({ app, pagina } = await abrir());
  const persist = await pagina.evaluate(() => { const e = window.__teste.G.estado; return { partida: !!e.partida, conquistas: Object.keys(e.conquistas).length }; });
  confere(persist.partida && persist.conquistas >= 2, `partida e conquistas persistiram (${JSON.stringify(persist)})`);
  const clicar2 = async (x, y) => { const r = await pagina.evaluate(() => { const c = document.getElementById("tela").getBoundingClientRect(); return { l: c.left, t: c.top, w: c.width, h: c.height }; }); await pagina.mouse.click(r.l + (x / 1280) * r.w, r.t + (y / 720) * r.h); await pagina.evaluate(() => window.__teste.motor.avancar(0.1)); };
  await pagina.evaluate(() => window.__teste.motor.avancar(0.2)); await pagina.screenshot({ path: path.join(saida, "14-titulo-continuar.png") });
  await clicar2(216, 342);                                 // "Continuar"
  await pagina.waitForFunction(() => window.__teste.motor.topo().S, null, { timeout: 20000 });
  const R = await pagina.evaluate(() => { const s = window.__teste.motor.topo().S; return { npcs: s.J.npcs.length, cidades: s.J.cidades.length, constr: s.J.construcoes.length, chegando: s.J.chegando }; });
  confere(R.npcs === ncons && R.cidades === salvou.cidades && R.chegando === false, `Continuar restaura a ilha (${R.npcs} colonos, ${R.constr} construções)`);
  await pagina.evaluate(() => window.__teste.motor.avancar(5)); await pagina.screenshot({ path: path.join(saida, "15-continuou.png") });

  // Save adulterado é recusado e o backup assume
  await app.close();
  const bruto = JSON.parse(fs.readFileSync(arqSave, "utf8")); bruto.d = bruto.d.replace('"melhorDias":', '"melhorDias":9'); fs.writeFileSync(arqSave, JSON.stringify(bruto));
  console.log("\n▶ 3ª execução (save adulterado)");
  ({ app, pagina } = await abrir());
  const adulterado = await pagina.evaluate(() => window.__teste.G.estado.melhorDias);
  confere(adulterado < 90 && adulterado >= 0, `save adulterado foi ignorado (melhorDias=${adulterado})`);
  await app.close();

  fs.rmSync(dados, { recursive: true, force: true });
  console.log(falhas ? `\n✖ ${falhas} verificação(ões) falharam\n` : "\n✔ Tudo passou. Capturas em test/_saida/\n");
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error("\n✖ O teste quebrou:", e); process.exit(2); });
