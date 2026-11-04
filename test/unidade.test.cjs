// Testes do adaptador da Steam com uma biblioteca FALSA (não precisa da Steam nem do Electron).
//   npm run teste
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const CONFIG = require(path.join(__dirname, "..", "CONFIGURE-AQUI.js"));
const { criarSteam } = require("../electron/steam.cjs");

const silencio = { log() {}, warn() {} };

function bibliotecaFalsa({ falhaInit = false, reiniciar = false } = {}) {
  const chamadas = { ativadas: [], stats: {}, stores: 0, nuvem: {}, rich: {}, reiniciou: false };
  return {
    chamadas,
    lib: {
      restartAppIfNecessary: () => { chamadas.reiniciou = true; return reiniciar; },
      init: () => {
        if (falhaInit) throw new Error("Steam não está rodando");
        return {
          localplayer: { getName: () => "Jogador", setRichPresence: (k, v) => { chamadas.rich[k] = v; } },
          apps: { currentGameLanguage: () => "brazilian", isDlcInstalled: (id) => id === 123 },
          utils: { isSteamRunningOnSteamDeck: () => true },
          achievement: { activate: (id) => { chamadas.ativadas.push(id); return true; }, isActivated: (id) => chamadas.ativadas.includes(id), clear: () => true },
          stats: { setInt: (n, v) => { chamadas.stats[n] = v; return true; }, getInt: (n) => chamadas.stats[n] ?? 0, store: () => { chamadas.stores++; return true; } },
          cloud: {
            isEnabledForAccount: () => true, isEnabledForApp: () => true,
            fileExists: (n) => n in chamadas.nuvem, readFile: (n) => chamadas.nuvem[n], writeFile: (n, c) => { chamadas.nuvem[n] = c; return true; },
          },
          // propriedade extra só para provar que ela NUNCA é exposta
          perigosa: () => { throw new Error("não deveria ser chamada"); },
        };
      },
      electronEnableSteamOverlay: () => {},
    },
  };
}
const config = (extra = {}) => ({ ...CONFIG, MODO_TESTE: true, steam: { ...CONFIG.steam, appIdEfetivo: () => 480 }, ...extra });

test("conecta e informa dados do jogador", () => {
  const f = bibliotecaFalsa(); const s = criarSteam(config(), silencio, () => f.lib);
  const info = s.iniciar();
  assert.equal(info.modo, "steam"); assert.equal(info.nome, "Jogador"); assert.equal(info.idioma, "brazilian"); assert.equal(info.noDeck, true);
});

test("sem Steam: modo indisponível e funções viram no-op (o jogo continua)", () => {
  const f = bibliotecaFalsa({ falhaInit: true }); const s = criarSteam(config(), silencio, () => f.lib);
  const info = s.iniciar();
  assert.equal(info.modo, "indisponivel"); assert.equal(info.disponivel, false); assert.match(info.erro, /Steam/);
  assert.equal(s.ativarConquista("CHEGADA"), false); assert.equal(s.nuvemLer("save.json"), null);
});

test("STEAM_MODO=mock não toca na biblioteca", () => {
  process.env.STEAM_MODO = "mock";
  try {
    const s = criarSteam(config(), silencio, () => { throw new Error("não deveria carregar"); });
    assert.equal(s.iniciar().modo, "mock");
  } finally { delete process.env.STEAM_MODO; }
});

test("conquista: só IDs do CONFIGURE-AQUI.js, e grava (store) na hora", () => {
  const f = bibliotecaFalsa(); const s = criarSteam(config(), silencio, () => f.lib); s.iniciar();
  assert.equal(s.ativarConquista("CHEGADA"), true);
  assert.equal(f.chamadas.stores, 1);
  for (const ruim of ["NAO_EXISTE", "../x", "", null, undefined, 42, "A".repeat(200), { id: "CHEGADA" }]) assert.equal(s.ativarConquista(ruim), false, String(ruim));
  assert.deepEqual(f.chamadas.ativadas, ["CHEGADA"]);
  assert.equal(s.conquistaAtiva("CHEGADA"), true);
});

test("stats: só os cadastrados, limitados a int32 não negativo, e gravação agrupada", async () => {
  const f = bibliotecaFalsa(); const s = criarSteam(config(), silencio, () => f.lib); s.iniciar();
  assert.equal(s.definirStat("DIAS_SOBREVIVIDOS", 41.9), true); assert.equal(f.chamadas.stats.DIAS_SOBREVIVIDOS, 41);
  s.definirStat("DIAS_SOBREVIVIDOS", 1e12); assert.equal(f.chamadas.stats.DIAS_SOBREVIVIDOS, 2147483647);
  s.definirStat("DIAS_SOBREVIVIDOS", -5); assert.equal(f.chamadas.stats.DIAS_SOBREVIVIDOS, 0);
  assert.equal(s.definirStat("OUTRO", 1), false); assert.equal(s.definirStat("DIAS_SOBREVIVIDOS", NaN), false);
  assert.equal(f.chamadas.stores, 0, "stats não devem gravar a cada mudança (a Steam limita a frequência)");
  s.encerrar(); assert.equal(f.chamadas.stores, 1, "ao encerrar grava o que ficou pendente");
});

test("nuvem: valida nome e tamanho", () => {
  const f = bibliotecaFalsa(); const s = criarSteam(config(), silencio, () => f.lib); s.iniciar();
  assert.equal(s.nuvemGravar("save.json", "{}"), true); assert.equal(s.nuvemLer("save.json"), "{}");
  assert.equal(s.nuvemGravar("../fora", "x"), false); assert.equal(s.nuvemGravar("a/b", "x"), false);
  assert.equal(s.nuvemGravar("save.json", "x".repeat(1_000_001)), false); assert.equal(s.nuvemLer("../fora"), null);
});

test("presença: só chaves simples e valor curto", () => {
  const f = bibliotecaFalsa(); const s = criarSteam(config(), silencio, () => f.lib); s.iniciar();
  assert.equal(s.presenca("steam_display", "#Menu"), true); assert.equal(s.presenca("Chave Ruim!", "x"), false);
  s.presenca("onda", "9".repeat(1000)); assert.equal(f.chamadas.rich.onda.length, 256);
});

test("produção com AppID: pede à Steam para reiniciar o jogo se foi aberto fora dela", () => {
  const f = bibliotecaFalsa({ reiniciar: true });
  const cfg = config({ MODO_TESTE: false, steam: { ...CONFIG.steam, appId: 999, appIdEfetivo: () => 999 } });
  const s = criarSteam(cfg, silencio, () => f.lib);
  assert.equal(s.iniciar().modo, "reiniciando"); assert.equal(f.chamadas.reiniciou, true);
});

test("em MODO_TESTE nunca reinicia pela Steam (AppID 480 não é o seu jogo)", () => {
  const f = bibliotecaFalsa({ reiniciar: true }); const s = criarSteam(config(), silencio, () => f.lib);
  assert.equal(s.iniciar().modo, "steam"); assert.equal(f.chamadas.reiniciou, false);
});

test("appIdEfetivo: 480 em teste, o seu em produção", () => {
  const c = JSON.parse(JSON.stringify({ ...CONFIG, steam: { ...CONFIG.steam } }));
  c.steam.appIdEfetivo = CONFIG.steam.appIdEfetivo;
  assert.equal(CONFIG.steam.appIdEfetivo(), CONFIG.MODO_TESTE ? 480 : CONFIG.steam.appId);
});
