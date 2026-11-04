/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║                                                                          ║
   ║   CONFIGURE-AQUI.js  —  O ÚNICO ARQUIVO QUE VOCÊ PRECISA PREENCHER       ║
   ║                                                                          ║
   ║   Tudo o que depende de VOCÊ (IDs da Steam, nomes, conquistas, depots,   ║
   ║   usuário de upload) está aqui. O jogo, o build e as verificações leem   ║
   ║   este arquivo.                                                          ║
   ║                                                                          ║
   ║   Depois de editar, rode:   npm run verificar                            ║
   ║   (ele diz em português o que ainda falta)                               ║
   ║                                                                          ║
   ║   ⚠ NUNCA coloque senhas aqui. A senha da conta de upload é digitada     ║
   ║     no steamcmd (ou fica no .env, que não é versionado).                 ║
   ║                                                                          ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const CONFIG = {

  // ═══════════════════════════════════════════════════════════════════════
  //  1) INTERRUPTOR PRINCIPAL  ◄◄◄  O MAIS IMPORTANTE
  // ═══════════════════════════════════════════════════════════════════════
  //  true  = MODO DE DESENVOLVIMENTO/TESTE:
  //            • usa o AppID 480 ("Spacewar", app de testes da Valve) em vez do seu;
  //            • DevTools liberado (F12) e painel de depuração (F3) ligados;
  //            • não deixa gerar build de publicação.
  //  false = MODO DE PUBLICAÇÃO:
  //            • usa o SEU AppID; DevTools e depuração desligados.
  //  Só mude para false quando for gerar a versão que vai para a Steam.
  MODO_TESTE: true,


  // ═══════════════════════════════════════════════════════════════════════
  //  2) DADOS DO JOGO
  // ═══════════════════════════════════════════════════════════════════════
  jogo: {
    // Nome que aparece na janela e no atalho.
    nome: "Marginália",

    // Nome do arquivo executável: sem espaços/acentos (ex.: ArenaNeon → ArenaNeon.exe).
    executavel: "Marginalia",

    // Identificador interno (estilo "com.seunome.jogo"); não aparece para o jogador.
    idPacote: "com.gabriel.marginalia",

    // Versão (ex.: "1.0.0"). Aparece na descrição do build enviado à Steam.
    versao: "1.0.0",

    // Seu nome ou o do estúdio (aparece nos metadados do .exe e na política/créditos).
    desenvolvedor: "Gabriel",
    copyright: "",

    // Ícone do .exe (formato .ico, ≥ 256×256). Opcional; sem ele o .exe usa o ícone padrão do Electron.
    // Obs.: incluir o ícone no .exe só funciona se você gerar o build NO WINDOWS (ou com Wine instalado).
    icone: "loja/icone.ico",
  },


  // ═══════════════════════════════════════════════════════════════════════
  //  3) JANELA E RESOLUÇÃO
  // ═══════════════════════════════════════════════════════════════════════
  //  O jogo desenha numa tela "lógica" fixa (16:9) e escala para qualquer janela,
  //  com barras pretas se necessário. 1280×720 funciona bem no Steam Deck (1280×800).
  janela: {
    larguraInicial: 1280,
    alturaInicial: 720,
    telaCheiaPadrao: false,        // no Steam Deck o jogo já abre em tela cheia automaticamente
    resolucaoLogica: { largura: 1280, altura: 720 },
  },


  // ═══════════════════════════════════════════════════════════════════════
  //  4) STEAM  (Steamworks)
  // ═══════════════════════════════════════════════════════════════════════
  //  Onde conseguir: https://partner.steamgames.com → "Create new app" (cobra a taxa por jogo)
  //  → o AppID aparece na página do app. Depots: App Admin → SteamPipe → Depots.
  steam: {

    // SEU AppID (número). Deixe 0 até criar o app no Steamworks.
    appId: 0,

    // AppID de testes da Valve (não mude). Usado quando MODO_TESTE = true.
    appIdTeste: 480,

    // Em MODO_TESTE, usar o SEU AppID em vez do 480? (true só depois que o app existir
    // e você precisar testar conquistas/nuvem de verdade).
    testarComAppIdProprio: false,

    // IDs dos "depots" (pacotes de arquivos por sistema). Normalmente appId+1 (Windows) e appId+2 (Linux),
    // mas confira em: App Admin → SteamPipe → Depots. 0 = ainda não criado.
    depots: { windows: 0, linux: 0 },

    // Em qual "branch" (ramo) colocar o build ao enviar. Deixe "" para NÃO ativar nada
    // automaticamente (você ativa no Steamworks, o jeito mais seguro). Exemplos: "beta", "teste".
    // ⚠ "default" é o ramo público: o script se recusa a usá-lo.
    branchSetLive: "",

    // Seu usuário Steam DE UPLOAD (use uma conta só para builds, com permissão "Edit App Metadata"/"Publish").
    // A SENHA não vai aqui: o steamcmd pede na hora.
    usuarioBuild: "",

    // true = o jogo se recusa a abrir sem a Steam rodando (proteção simples contra cópias).
    // false = abre normalmente sem Steam (conquistas ficam guardadas e são enviadas depois).
    exigirSteam: false,

    // Sincronizar o save na Steam Cloud? (precisa ativar no Steamworks: App Admin → Cloud).
    nuvem: true,

    // Mostrar o que o jogador está fazendo na lista de amigos ("Na onda 5").
    richPresence: true,

    // DLCs (opcional): [{ appId: 123456, nome: "Pacote Extra" }]. O jogo pode perguntar se está instalado.
    dlcs: [],
  },


  // ═══════════════════════════════════════════════════════════════════════
  //  5) PLATAFORMAS DO BUILD
  // ═══════════════════════════════════════════════════════════════════════
  //  A Steam só exige que o jogo abra em TODOS os sistemas que você marcar na página da loja
  //  (a revisão da Valve testa isso). Marque só o que você consegue testar.
  //  macOS não está incluso: precisa de um Mac para assinar/notarizar (veja references/06-build-e-steampipe.md).
  plataformas: {
    windows: true,   // ~95% dos jogadores
    linux: true,     // inclui Steam Deck (roda nativo)
  },


  // ═══════════════════════════════════════════════════════════════════════
  //  6) CONQUISTAS E ESTATÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════
  //  ⚠ Os "id" daqui precisam ser IDÊNTICOS ao "API Name" cadastrado em
  //     Steamworks → App Admin → Stats & Achievements (maiúsculas/minúsculas importam).
  //  Rode  npm run listar-conquistas  para ver a tabela pronta para copiar para o Steamworks.
  //  Limite inicial da Steam: 100 conquistas por jogo. Nomes e ícones devem ser "para todas as idades".
  //  Ícones: a Steam pede duas versões por conquista (desbloqueada e bloqueada) — veja ASSETS.md.
  conquistas: [
    { id: "CHEGADA", oculta: false, nome: { pt: "Terra à Vista", en: "Land Ho" }, descricao: { pt: "Desembarque na ilha.", en: "Set foot on the island." } },
    { id: "FUNDADOR", oculta: false, nome: { pt: "Fundador", en: "Founder" }, descricao: { pt: "Funde uma cidade construindo o primeiro poço.", en: "Found a city by building its first well." } },
    { id: "TETO_PROPRIO", oculta: false, nome: { pt: "Teto Próprio", en: "A Roof of Your Own" }, descricao: { pt: "Construa uma moradia.", en: "Build a dwelling." } },
    { id: "APRENDIZ", oculta: false, nome: { pt: "Aprendiz", en: "Apprentice" }, descricao: { pt: "Alcance o nível 10 em uma habilidade.", en: "Reach level 10 in a skill." } },
    { id: "MESTRE", oculta: false, nome: { pt: "Mestre de Ofício", en: "Master Craftsman" }, descricao: { pt: "Alcance o nível 50 em uma habilidade.", en: "Reach level 50 in a skill." } },
    { id: "COMERCIANTE", oculta: false, nome: { pt: "Comerciante", en: "Merchant" }, descricao: { pt: "Construa um mercado.", en: "Build a market." } },
    { id: "SETE_DIAS", oculta: false, nome: { pt: "Uma Semana na Ilha", en: "A Week on the Island" }, descricao: { pt: "Sobreviva por 7 dias.", en: "Survive 7 days." } },
    { id: "CEM_ALMAS", oculta: false, nome: { pt: "Cem Almas", en: "A Hundred Souls" }, descricao: { pt: "Chegue a 100 colonos na ilha.", en: "Reach 100 colonists on the island." } },
    { id: "DEFENSOR", oculta: true, nome: { pt: "Defensor da Colônia", en: "Colony Defender" }, descricao: { pt: "Derrote um bandido.", en: "Defeat a bandit." } },
  ],

  // Estatísticas numéricas enviadas à Steam (tipo "int"). Também cadastre em Stats & Achievements.
  stats: [
    { id: "DIAS_SOBREVIVIDOS", tipo: "int" },
    { id: "POPULACAO", tipo: "int" },
  ],


  // ═══════════════════════════════════════════════════════════════════════
  //  7) BALANCEAMENTO (jogo de exemplo — o Claude adapta ao seu jogo)
  // ═══════════════════════════════════════════════════════════════════════
  balanceamento: {},   // o balanceamento do Marginália fica em src/jogo/config.js (e src/jogo/dados/*)


  // ═══════════════════════════════════════════════════════════════════════
  //  8) IDIOMAS
  // ═══════════════════════════════════════════════════════════════════════
  //  O jogo usa o idioma da Steam (ou do sistema) se estiver na lista; senão o padrão.
  //  Os idiomas que você listar aqui devem ser marcados também na página da loja (Steamworks → Supported Languages).
  idiomas: { padrao: "pt", disponiveis: ["pt"] },
};


/* ══════════════════════════════════════════════════════════════════════════
   ▼▼▼  NÃO MEXA DAQUI PARA BAIXO  ▼▼▼
   ══════════════════════════════════════════════════════════════════════════ */

/** AppID que o jogo realmente usa ao iniciar a Steam (480 em teste, o seu em publicação). */
CONFIG.steam.appIdEfetivo = function () {
  const s = CONFIG.steam;
  if (CONFIG.MODO_TESTE) return s.testarComAppIdProprio && s.appId > 0 ? s.appId : s.appIdTeste;
  return s.appId;
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;       // usado pelo Electron (processo principal) e pelos scripts (Node)
} else if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
