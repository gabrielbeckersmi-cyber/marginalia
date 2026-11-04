# Checklist de lançamento na Steam — Marginália

> Marque conforme avança. Prazos e valores mudam: **confirme no Steamworks** (documentação) antes de contar com eles.

## 1. Conta e app
- [ ] Cadastro no Steamworks concluído (identidade, impostos, banco)
- [ ] Taxa do app paga (US$ 100; reembolsável após US$ 1.000 em vendas — confirmar)
- [ ] AppID no `CONFIGURE-AQUI.js` · depots Windows/Linux criados e preenchidos
- [ ] Respeitado o período de espera de contas/jogos novos (hoje ~21 dias para o primeiro título — confirmar)

## 2. Jogo
- [ ] `npm run teste` e `npm run teste:e2e` passam
- [ ] Jogou do início ao fim no Windows e (se marcou Linux) no Linux/Steam Deck
- [ ] Funciona com **teclado+mouse** e com **controle** (menus navegáveis só com o controle)
- [ ] Tela cheia, janela redimensionada, fechar no meio da partida: sem perder progresso
- [ ] Conquistas testadas **com o seu AppID** (nenhuma desbloqueia sozinha; a oculta só no momento certo)
- [ ] Steam Cloud testada: salvar num PC, abrir noutro (ou apagar a pasta de dados e abrir)
- [ ] Sem Steam aberta: o jogo abre e avisa de forma amigável (se `exigirSteam`) ou funciona offline
- [ ] Textos revisados em todos os idiomas marcados; **sem conteúdo de terceiros** sem licença (arte, música, fontes)

## 3. Steamworks (configuração)
- [ ] Conquistas e stats cadastrados e **publicados** (`npm run listar-conquistas`) · ícones das conquistas enviados (2 por conquista)
- [ ] Steam Cloud: cota de bytes e número de arquivos definidos, **Save + Publish** feitos (o ícone de nuvem só aparece depois de publicar)
- [ ] Rich Presence enviado (opcional)
- [ ] Idiomas suportados marcados (iguais ao `idiomas.disponiveis`)
- [ ] Classificação etária / questionário de conteúdo preenchido
- [ ] **Divulgação de IA** preenchida, se algum conteúdo (arte, texto, música, código que gera conteúdo) foi feito com IA generativa — conteúdo pré-gerado e gerado em tempo real têm campos diferentes
- [ ] Preço e regiões definidos · impostos/pagamentos conferidos

## 4. Página da loja
- [ ] Cápsulas 920×430, 462×174, 1232×706, 748×896 · arte da biblioteca · ícones
- [ ] ≥ 5 capturas de tela (≥ 1920×1080, só jogo real) · trailer (recomendado)
- [ ] Descrição curta e longa, tags, requisitos do sistema → `loja/pagina-da-loja.md`
- [ ] `npm run verificar:loja` sem pendências
- [ ] Página **"Coming Soon"** publicada com antecedência (mínimo hoje: 2 semanas)
- [ ] Revisão da página aprovada (alguns dias úteis — planeje ~1 semana)

## 5. Build
- [ ] `MODO_TESTE: false` · `npm run verificar:producao` com zero erros
- [ ] `npm run build:steam` (no Windows, para o ícone/versão do `.exe`) · não existe `steam_appid.txt` em `dist/`
- [ ] `npm run vdf` → `npm run enviar:simular` → `npm run enviar`
- [ ] Build colocado num ramo **beta** e jogado instalando pela Steam
- [ ] Build enviado para **revisão** (alguns dias úteis)

## 6. Dia do lançamento
- [ ] Você aperta o botão de lançamento no Steamworks (a Steam não lança sozinha)
- [ ] Build aprovado no ramo **default** · testou instalando a versão pública
- [ ] Acompanhe fóruns/avaliações e tenha um plano de patch (`jogo.versao` sobe a cada envio)

## 7. Depois
- [ ] Atualizar `jogo.versao`, enviar patches pelo mesmo fluxo (`enviar`) sempre para beta primeiro
- [ ] Responder a bugs e avaliações; considerar DLC/atualizações (`steam.dlcs`)
