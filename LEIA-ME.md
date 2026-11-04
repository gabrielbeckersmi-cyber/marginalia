# Marginália — do zero à Steam

> Quer mudar regras, números ou telas? Veja o **GDD.md**: ele diz exatamente qual arquivo editar para cada coisa.

Este projeto é um jogo **HTML5 dentro do Electron**, já ligado à **Steamworks** (conquistas, estatísticas, Steam Cloud, overlay, presença, Steam Deck). Você só preenche **um arquivo** — `CONFIGURE-AQUI.js` — e usa uns poucos comandos.

> **Antes de qualquer coisa:** rode `npm install` (uma vez). Precisa do **Node.js 22.12 ou mais novo** (https://nodejs.org).

## Comandos (o dia a dia)

| Comando | O que faz |
|---|---|
| `npm run dev` | Jogo no **navegador** (http://localhost:5173), recarrega ao salvar. Steam **simulada**. Ótimo para mexer rápido. |
| `npm run start:sem-steam` | Jogo no **Electron** (janela de verdade), **sem** a Steam. Testa save, tela cheia, fechar janela. |
| `npm run start` | Jogo no Electron **com a Steam aberta** e logada. Usa o AppID **480** (Spacewar, app de testes da Valve), então dá para ver o overlay e a conexão, mas as conquistas **não** existem neste app. |
| `npm run verificar` | Diz em português o que falta no `CONFIGURE-AQUI.js`. |
| `npm run listar-conquistas` | Tabela das conquistas para você cadastrar no Steamworks (e `loja/conquistas.csv`). |
| `npm run teste` / `npm run teste:e2e` | Testes automáticos do adaptador da Steam / do jogo no Electron de verdade. |
| `npm run build:steam:teste` | Gera `dist/windows` e `dist/linux` **de teste** (com `steam_appid.txt`), para abrir o executável direto. |
| `npm run build:steam` | Gera as pastas **de publicação** (exige `MODO_TESTE: false` e config completa). |
| `npm run vdf` | Gera os scripts do SteamPipe (`steam-build/`). |
| `npm run enviar:simular` / `npm run enviar` | Mostra / executa o envio do build para a Steam (via `steamcmd`). |
| `npm run verificar:loja` | Confere os arquivos da página da loja (tamanhos das imagens etc.). |

## Roteiro completo

### Fase A — Fazer o jogo (você pode ficar aqui por semanas)
1. `npm run dev` e jogue. O jogo de exemplo (**Arena Neon**) é só o ponto de partida: o Claude troca `src/jogo/` pelo seu jogo.
2. A arte final é opcional agora: sem arquivo em `public/assets/`, o jogo desenha formas neon. A lista do que precisa existe em **`ASSETS.md`** (gerado).
3. Mantenha `MODO_TESTE: true` o tempo todo, até a fase D.

### Fase B — Criar a conta e o app na Steam (comece cedo: tem prazos!)
1. Entre em **https://partner.steamgames.com** e conclua o cadastro de **Steamworks** (identidade, dados fiscais e bancários).
2. Pague a **taxa por jogo** (US$ 100 na documentação atual; é **reembolsável** depois que o jogo passa de US$ 1.000 em vendas). Confirme valor e regras na hora.
3. Crie o app → anote o **AppID** → coloque em `steam.appId` no `CONFIGURE-AQUI.js`.
4. **SteamPipe → Depots**: crie/anote um depot para Windows e outro para Linux → `steam.depots`.
5. **Stats & Achievements**: cadastre as conquistas e estatísticas (`npm run listar-conquistas`) e clique **Publish**. Os `API Name` precisam ser idênticos aos do jogo.
6. **Steam Cloud**: Steamworks → App Admin → *Steam Cloud Settings* → defina a cota de bytes por usuário (ex.: 1 MB) e o número de arquivos (ex.: 10) → **Save** e depois **Publish**. O jogo grava `save.json` pela API, então **não** precisa cadastrar o nome do arquivo. (Confira os nomes exatos dos menus; a Valve muda a interface.)
7. **Rich Presence**: envie `loja/rich-presence.txt` (opcional).
8. Monte a **página da loja** (textos de `loja/pagina-da-loja.md`, imagens de `loja/`) e publique a página **"Coming Soon"** — a Steam exige que ela fique no ar por um tempo mínimo antes do lançamento (hoje: 2 semanas).

### Fase C — Testar com o SEU AppID
1. `steam.testarComAppIdProprio: true` (mantenha `MODO_TESTE: true`) e `npm run start` com a Steam aberta: agora as conquistas e a nuvem funcionam de verdade.
2. `npm run build:steam:teste` e abra `dist/…` no Windows e no Linux/Steam Deck (se tiver).

### Fase D — Build de publicação e envio
1. No `CONFIGURE-AQUI.js`: `MODO_TESTE: false`, `appId`, `depots`, `usuarioBuild`, `desenvolvedor`.
2. `npm run verificar:producao` (tem que dar **zero erros**) e `npm run verificar:loja`.
3. **Gere o build no Windows** se quiser o ícone/versão no `.exe` (no Linux sem Wine ele sai com o ícone padrão do Electron). `npm run build:steam`.
4. Copie `.env.exemplo` para `.env` e preencha `STEAMCMD`. `npm run vdf`, `npm run enviar:simular`, `npm run enviar`. O `steamcmd` pede a **senha** e o código do **Steam Guard** — este projeto nunca guarda senha.
5. No Steamworks → SteamPipe → Builds: coloque o build num **ramo de teste (ex.: beta)**, instale pela Steam e jogue. Só então envie para **revisão**.

### Fase E — Lançamento
Siga `CHECKLIST-LANCAMENTO-STEAM.md`. A revisão da loja e a do build levam alguns dias úteis (planeje ~1 semana) e **você** aperta o botão de lançar.

## Como o projeto é organizado

```
CONFIGURE-AQUI.js      ← o ÚNICO arquivo que você preenche
electron/              ← janela, Steam, arquivos (main.cjs, preload.cjs, steam.cjs). Raramente muda.
src/
  main.js              ← liga tudo
  nucleo/              ← motor (passo fixo), entrada (teclado/mouse/controle), áudio, save, i18n, assets
  servicos/steam.js    ← conquistas/stats/presença (não trava sem Steam; reenvia depois)
  jogo/                ← ARENA e CENAS: é aqui que mora o seu jogo
  idiomas/             ← textos (pt, en). Um arquivo por idioma
  assets-manifest.cjs  ← lista de arte (gera ASSETS.md)
public/assets/         ← solte a arte final aqui (mesmo nome do manifesto)
loja/                  ← arte e textos da página da Steam
scripts/               ← verificadores, build, VDF, envio
test/                  ← testes automáticos
```

## Perguntas frequentes

**O jogo abre e fecha sozinho no build de publicação, fora da Steam.** É de propósito: com o seu AppID, se o jogo não foi aberto pela Steam, ele pede à Steam para reabri-lo. Para testar fora da Steam use `npm run build:steam:teste` (inclui `steam_appid.txt`) ou `npm run start:sem-steam`.

**Conquista não aparece.** Confira: (1) está cadastrada e **publicada** no Steamworks; (2) o `API Name` é idêntico; (3) você está rodando com o seu AppID (`testarComAppIdProprio`) — no 480 elas não existem. Enquanto isso, o jogo guarda a conquista no save e reenvia quando puder.

**O jogador instalou em outro PC.** O save vem pela Steam Cloud (se ativada) e o jogo **mescla** save local + nuvem: recordes só sobem e conquistas se somam; nada se perde.

**Quero mudar para Godot/Unity.** Possível, mas é outro projeto: peça ao Claude para comparar (a skill tem um guia de escolha de tecnologia). O passo a passo da Steam (conta, loja, depots, upload) é o mesmo.

**macOS?** Não está incluso: exige um Mac para assinar e "notarizar". Peça ao Claude o guia de macOS da skill quando for a hora.
