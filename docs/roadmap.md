# MTA Game — Roadmap & Design

**Jogo:** *Exército da Maruzza*
**Tema:** o escritório de advocacia previdenciária de **Maruzza Teixeira** ajuda segurados
(idosos, rurais, urbanos, PcD) a **derrotar o INSS** e conquistar seus benefícios.
**Objetivo do produto:** diversão + **marca** (viral, compartilhável). Sem agenda comercial pesada.
**Engine:** Phaser 4 · **Build:** Vite + TypeScript · **Alvo:** web mobile-first (também desktop).
**Produção:** 100% por agentes de IA em **workflows paralelos**. Arquitetura **modular, não-monolítica**.

> Fonte da verdade do **design**. Progresso ao vivo e "onde retomar" ficam em
> [`STATUS.md`](STATUS.md). Pesquisa da skin em [`research-bumba-meu-boi.md`](research-bumba-meu-boi.md);
> skills de produção em [`gamedev-skills.md`](gamedev-skills.md).

---

## 0. Status atual

| Fase | Estado |
|---|---|
| 0 — Fundação | ✅ concluída (scaffold modular, contratos, services, tema flat, menu bootável) |
| 1 — MVP jogável | ✅ concluída (crowd-runner jogável, 1 caso BPC) — verificado: typecheck + 16 testes + build + smoke headless. Screenshot: `docs/screens/fase1-runscene.png` |
| 2 — Loop viral | ✅ concluída (ciclo jogar→ganhar→compartilhar: ResultScene + ShareCard canvas, recorde, 5 casos, juice + áudio sintetizado, seletor de casos) — verificado: typecheck + 46 testes + build + smoke + review adversarial. Screenshots: `docs/screens/fase2-{menu,run,card}.png` |
| 3 — Beleza & acessibilidade | ✅ concluída (arte flat procedural zero-asset: multidão de pessoinhas, líder Maruzza, vilão INSS, cenário em parallax, muro+HUD; onboarding 1-toque, modo calmo, alto contraste; copy/cores 100% em tokens) — verificado: typecheck + 50 testes + build + smoke + review adversarial. Screenshots: `docs/screens/fase3-{menu,onboarding,run,wall}.png` |
| 4 — Skin Bumba meu boi | ✅ concluída (`themes/bumba-boi/` — paleta maranhense nos mesmos tokens; seletor flat↔boi a quente, persistido; gameplay intacto, provado por parity + OAB cross-skin + smoke). Screenshots: `docs/screens/fase4-boi-{menu,run,wall}.png` |
| 5 — Hub & expansão | ⏳ próxima |

**Definição de pronto (por fase):** `npm run typecheck && npm test && npm run build && npm run smoke` verdes.

---

## 1. O jogo (núcleo)

*Exército da Maruzza* é um **crowd-runner** (gênero "Count Masters / Stickman Army") — um dos
formatos mais clipados/virais do mobile, e **one-tap** (acessível pra idoso).

**Loop de 1 sessão (30–40s = 1 "caso"):**
1. Você lidera um grupinho de segurados que desce uma pista automaticamente (começa com 1 vovó 👵).
2. Surgem **portões duplos** com operações: **prova boa** (`×2`, `+5` — laudo, CNIS, CadÚnico) vs
   **armadilha do INSS** (`÷2`, `-10` — "exigência", "perícia remarcada"). Você arrasta o dedo pra
   passar a multidão pelo portão **certo**.
3. No fim da pista: o **MURO DE INDEFERIMENTO** com um número (ex: `80`). Multidão **maior** que o
   muro → arromba, **benefício concedido** 🎉. Menor → o muro segura.

**Mecânica = mensagem de marca:** quantidade + qualidade de prova é o que vence o INSS. **Nunca**
promete resultado jurídico (cuidado OAB): você pode chegar com multidão pequena e o muro segurar.

**Gancho viral:** tela final gera um **card automático** — *"Levei 187 provas e derrubei o INSS 👵⚖️ bate meu recorde"* — pronto pra WhatsApp/Reels, com desafio de amigo. O número final é placar comparável e instantâneo.

---

## 2. Princípios de arquitetura (não-monolítico)

Quatro regras que governam todo o código:

1. **Tudo é módulo com fronteira clara.** Cada peça tem um propósito único, fala por interface
   bem definida, e é compreendida/testada isoladamente.
2. **Lógica separada de apresentação.** Sistemas de jogo (crowd, gates, muro) não conhecem sprites
   nem cores — só números e eventos. Isso é o que torna a **skin** trocável.
3. **Conteúdo é dado, não código.** Cada "caso"/benefício é um JSON. Adicionar conteúdo = adicionar
   arquivo, sem tocar em sistema — permite produção **paralela** por agentes.
4. **O jogo é um *GameModule*.** *Exército* implementa um contrato genérico para que, no futuro, um
   **Hub** ("Escritório da Maruzza") hospede outros mini-jogos sem reescrever nada.

### 2.1 Contrato de módulo (`GameModule`)

Contrato implementado (`src/core/GameModule.ts`):

```ts
interface GameModule {
  id: string;                                          // "exercito-da-maruzza"
  meta: { name: string; genre: string; minEngine: string };
  scenes(): Array<new (...a: any[]) => Phaser.Scene>;  // cenas do módulo (1ª = boot)
  bootSceneKey: string;
  onResult?(cb: (r: RunResult) => void): void;         // hub registra p/ receber { won, score, ... }
}
```

**Services** (`src/core/services/`): `ThemeManager`, `AudioManager`, `Persistence`, `ShareCard`,
`InputManager`, `L10n` (+`Analytics?` futuro). Criados no boot via `createServices()` e acessados
por `getServices()` (singleton) — sem acoplar cenas ao construtor.

> O ciclo de vida rico de hub (`pause/resume/destroy`, montar/desmontar módulo a quente) entra na
> **Fase 5**; o contrato acima é o suficiente pro MVP e já é hub-ready.

### 2.2 Sistema de Skins (decisão de arte)

Arte é **dado**, trocável sem tocar na lógica. Skins ficam em `public/themes/` (servidas como
estático, carregadas por `fetch` no boot — trocáveis sem rebuild):

```
public/themes/
  flat-default/      # 1ª versão (cartoon flat) — o MVP usa esta
    theme.json       # paleta (tokens), copy; (assets/ quando houver sprites)
  bumba-boi/         # skin de identidade maranhense (Fase 4, pós-pesquisa)
    theme.json
```

A lógica referencia **chaves lógicas** (`bg.base`, `accent.primary`, `gate.good`, `gate.bad`,
`wall`, tokens de paleta/copy). O `ThemeManager` resolve token→valor do tema ativo
(`color`/`colorNum`/`text`). **Trocar de skin = `themes.load(id)`.** Zero mudança de gameplay.

> Direção travada: **base Cartoon Flat**, com **Bumba meu boi como skin** plugável.
> Detalhe da skin do boi (paleta/motivos/personagens) → seção **§7**, preenchida com a pesquisa.

### 2.3 Estrutura de pastas

```
src/
  main.ts                      # boot: createServices, carrega tema, cria Phaser.Game
  vite-env.d.ts
  config/gameConfig.ts         # Phaser.Game, escala mobile-first (720×1280, FIT)
  core/
    types.ts                   # Theme, RunParams, RunResult
    GameModule.ts              # contrato
    ModuleRegistry.ts          # registro de módulos (base do hub)
    services/                  # index.ts = createServices()/getServices()
      ThemeManager.ts AudioManager.ts Persistence.ts ShareCard.ts InputManager.ts L10n.ts
  modules/
    exercito-da-maruzza/
      index.ts                 # implements GameModule
      scenes/  BootScene.ts MenuScene.ts RunScene.ts      # ResultScene.ts → Fase 2
      systems/ track.ts wall.ts gates.ts operations.ts Crowd.ts
               __tests__/*.test.ts
      data/    CasoData.ts casos.ts casos/*.json          # 1 JSON por caso/benefício
  hub/                         # Fase 5 (futuro): HubScene + catálogo
public/themes/ flat-default/   # bumba-boi/ → Fase 4
scripts/smoke.mjs              # verificação headless (Playwright)
docs/
```

Cada `modules/<id>/` é **autocontido** → o monólito nunca nasce. Sistemas puros (`track`, `wall`,
`gates`, `operations`) não importam Phaser → testáveis isoladamente no Vitest.

---

## 3. Stack & tooling

| Camada | Escolha | Porquê |
|---|---|---|
| Engine | **Phaser 4.1** | atual, melhor renderer; skills oficiais instaladas |
| Linguagem | **TypeScript 6** | contratos/interfaces tornam os módulos confiáveis pra agentes |
| Build/dev | **Vite 8** | HMR rápido, preview instantâneo, bundle modular |
| Testes | **Vitest 4** | unitário nos sistemas puros (track/wall/gates/operations) |
| Verificação | **Playwright** (`npm run smoke`) | boot headless + cenas sem erro de runtime + screenshot |
| Persistência | **localStorage** (MVP) | recorde local sem backend |
| Share | **Canvas → Web Share API / download** | card viral 100% client-side, sem backend |
| Deploy | estático (Vercel/Netlify/Pages) | jogo é SPA estática |

**Sem backend no MVP.** Ranking online (leaderboard) é módulo opcional de Fase 5.

---

## 4. Roadmap por fases

Cada fase entrega algo jogável/verificável. ⚙️ = sistemas, 🎨 = arte, 📦 = conteúdo, 🚀 = viral.

### Fase 0 — Fundação `[base p/ paralelismo]` ✅
- Scaffold Vite+TS+Phaser 4, `gameConfig` (escala portrait mobile-first).
- Contratos congelados: `GameModule`, `Services`, `Theme`, `CasoData`.
- Services (`ThemeManager` real + stubs), `ModuleRegistry`, módulo com Boot/Menu, tema `flat-default`.
- **Entregue:** menu bootável carregando o tema flat. Interfaces congeladas → destravam paralelismo.
  Verificado: typecheck + build + serve.

### Fase 1 — MVP jogável ⚙️🎨 ✅
- Sistemas puros + testes: `track` (scroll), `gates`/`operations` (portões duplos ×2/+5/÷2/−), `wall`
  (resolução) — 16 testes Vitest.
- `Crowd` (multidão visual segue o líder), `RunScene` (orquestra; input arrasta o líder).
- 1 caso jogável (`data/casos/bpc.json`, muro 60), skin **flat-default**, HUD (contador de provas).
- **Entregue:** joga 1 caso do início ao "concedido/segurou". Verificado: typecheck + 16 testes +
  build + **smoke headless** (boot→RunScene sem erro) + screenshot (`docs/screens/fase1-runscene.png`).

### Fase 2 — Loop viral 🚀📦 ✅
- `ResultScene` + `ShareCard` (canvas → imagem → compartilhar/baixar). ShareCard é **genérico** (núcleo
  não conhece o módulo); a copy do card vem do `theme.json` e o módulo monta `CardContent` (`systems/card.ts`).
- Recorde local (`Persistence`), casos data-driven (BPC, auxílio-doença, aposentadoria rural/urbana;
  + caso-tutorial salário-maternidade adicionado na auditoria pós-Fase 4 → **5 casos**) com seletor no menu.
- `tweens`/juice: multidão pulsando, muro estilhaçando, confete, camera shake. `AudioManager` real
  (SFX sintetizados via Web Audio + trilha ambiente + mute persistido, **sem arquivos de asset**).
- **Marco atingido:** ciclo completo jogar → ganhar → compartilhar card. Produto viral mínimo entregue.
- Copy enquadrada como **jogo** (nunca veredito jurídico — cuidado OAB): vitória = "MURO DERRUBADO!",
  travada por teste (`copy-oab.test.ts`). Conteúdo balanceado por simulador puro (`balance.ts`) + testes.

### Fase 3 — Beleza & acessibilidade 🎨 ✅
- Arte flat **procedural** (zero-asset, como o áudio sintetizado): `systems/figures.ts` gera texturas
  de pessoinhas (segurado/líder Maruzza/vilão INSS) via `Graphics.generateTexture`, recoloridas por
  tokens do tema. `Crowd` virou gente; `Scenery` (céu/chão/colunas em parallax); `Villain` no muro;
  barra de HUD legível (`game-ui-design`).
- Acessibilidade pro idoso: onboarding 1-toque (ensina **+/× vs −/÷**, à prova de daltonismo),
  **modo calmo** (velocidade ×0.6, persistido) no menu, alto contraste, alvos grandes.
- Arquitetura: copy **e** cores da UI nova 100% via tokens do tema → skin `bumba-boi` (Fase 4)
  troca tudo sem tocar em código. Produzida em **workflow paralelo** (4 agentes / arquivos disjuntos
  sobre o contrato `figures.ts`).
- **Marco atingido:** "bonito e fácil" de verdade no celular do público-alvo.

### Fase 4 — Skin Bumba meu boi 🐂🎨 ✅
- `public/themes/bumba-boi/theme.json`: paleta maranhense (veludo, ouro de canutilho, jewel tones de
  festa, magenta da Ama, renda) nos **mesmos tokens lógicos** do §2.2; copy "cordão encantado", OAB-safe.
  As figuras procedurais (`figures.ts`) **recolorem sozinhas** — followers dourados, Maruzza magenta,
  vilão INSS mantido frio/cinza (fora do vocabulário do boi, conforme §7).
- Seletor de skin no menu (flat ↔ boi): `themes.load` a quente + persistência (`Persistence` string +
  `main.ts` boota a skin salva) + `scene.restart`.
- **Validado que só dados mudam:** teste de parity (toda skin preenche todos os tokens), OAB cross-skin
  (guarda anti-veredito agora cobre todas as skins) e smoke headless que troca pra boi e roda sem erro.
- **Marco atingido:** prova viva do sistema de skins + identidade maranhense. (Motivos profundos —
  fitas, penas, azulejo bordado — ficam como polish futuro; o contrato de cor/copy está provado.)

### Fase 5 — Hub & expansão 🏛️
- `HubScene` ("Escritório da Maruzza") hospedando módulos via `ModuleRegistry`; *Exército* = módulo 1.
- Backlog dos outros jogos como **módulos futuros** (ver **§6**). Leaderboard online opcional.
- **Marco:** plataforma multi-jogo, não um app só.

### Fase R — Army Shooter 2.5D (redesign do núcleo) ✅/⏳
- Câmera **pseudo-3D** (`projection.ts`), **Maruzza heroína atiradora** (provas = potência da arma),
  **combate dps-tick** (`combat.ts`) + projéteis-juice (`Projectiles`), **inimigos/obstáculos** da burocracia
  (`Enemy`), **portões de dois eixos** (quantidade × qualidade — `GateOp.weapon?`), **boss com HP** (`resolveBoss`).
- Arte segue **procedural/zero-asset** (direção B); fronteira do resolvedor mantém a porta aberta pra ilustração por-skin (C).
- Spec: `docs/superpowers/specs/2026-06-11-army-shooter-pseudo3d-design.md`.

### Fase 6 — Campanha por níveis (futuro)
- Casos viram estágios de dificuldade crescente; timeline de encontros (ondas); boss crescente; desbloqueio progressivo.

### Fase 7 — Meta-progressão "Escritório da Maruzza" (futuro)
- Recurso entre runs → upgrades permanentes (exército inicial, arma de largada, perks). Liga ao Hub (§5).

---

## 5. Produção paralela por agentes de IA

Depois que a **Fase 0 congela as interfaces**, estes blocos rodam em **paralelo** (worktrees
isolados, sem colidir):

| Workstream | Depende de | Skill(s) principais |
|---|---|---|
| `config/gameConfig` + boot | — | `game-setup-and-config` |
| Cenas (Boot/Menu/Run/Result) | contrato de cena | `scenes` |
| Sistemas puros `track`/`wall`/`gates`/`operations` (+ testes) | `CasoData` | `phaser-design-patterns` (conceito) |
| `Crowd` (multidão visual) + `RunScene` (orquestra) | sistemas + tipos | `sprites-and-images`, `phaser-design-patterns` |
| Juice/transições | sistemas prontos | `tweens`, `v4-new-features` |
| `AudioManager` | service stub | `audio-and-sound` |
| HUD + acessibilidade | cena Run | `game-ui-design` |
| `ThemeManager` + skin flat | schema `theme.json` | `sprites-and-images`, `animations` |
| Arte flat / skin boi | `theme.json` | `pixel-art-sprites` (sprite/anim), geração de imagem |
| `ShareCard` / `ResultScene` | `RunResult` | `scenes` (Canvas API) |
| Conteúdo (`casos/*.json`) | `CasoData` | — (dados, fan-out massivo) |

> Regra de ouro de paralelismo: **interface antes de implementação**. Nenhum agente começa um
> sistema antes do contrato dele existir (Fase 0). Detalhe das skills em `docs/gamedev-skills.md`.

---

## 6. Catálogo de módulos futuros (hub)

Conceitos validados nos brainstorms, guardados como **mini-games plugáveis** (mesmo `GameModule`):

**Viral/topo de funil:** Fura-Fila do INSS (Flappy) · Plantão MTA: 5 Segundos (WarioWare).
**Retenção/idoso joga:** Caça-Provas na Bagunça (Hidden Object) · Monta o Caso (Jigsaw) ·
Maruzza Clicker (Cookie Clicker).
**Marca profunda:** Caso a Caso (Reigns) · Segura o Corredor (Tower Defense) ·
Que Lutador Você É? (quiz) · Maruzzator (Akinator).
**Banco:** INSSdle (Wordle diário, maior nota de viralidade).

Originais do 1º brainstorm: duelo de cartas, visual novel de tribunal, runner clássico, match-3.

---

## 7. Skin Bumba meu boi — identidade maranhense

Spec derivada da pesquisa (ver `research-bumba-meu-boi.md`, fontes IPHAN/UNESCO/UFMA).
A skin `bumba-boi` é **homenagem** ao Complexo Cultural do Bumba-meu-boi do Maranhão
(Patrimônio IPHAN 2011 / UNESCO 2019), não réplica.

**Eixo estético:** bordado brilhante sobre veludo escuro.

**Paleta (cores de referência — mapear pros tokens lógicos do §2.2):**
| ref | cor | origem |
|---|---|---|
| `bg.base` | `#0E0B14` veludo quase-preto | base do couro/farda |
| `accent.red` | `#D81E3F` | jewel tone festa |
| `accent.blue` | `#2547C0` azul-real | jewel tone |
| `accent.green` | `#0E9F6E` | jewel tone |
| `accent.magenta` | `#E0218A` | jewel tone |
| `metal.gold` | `#E8B923` | canutilho/galão |
| `sparkle` | `#FFF3B0` | paetê/lantejoula (highlights) |
| `lace.white` | `#F7F3E8` | renda (tambor de crioula) |
| `tile.cobalt` | `#2D5DA1` | azulejo de São Luís |

**Motivos/formas:** bordado (estrelas, flores, "chuvisco" de canutilho), **fitas longas coloridas**
(animação de movimento), **penas de ema** (cocar dramático), azulejo geométrico (fundos/bordas/UI),
galões e brilho de paetê (highlights animados).

**5 sotaques → 5 variações de brincante** na multidão (diversidade visual barata via reskin de
follower): da Ilha/matraca (caboclo-de-pena), da Baixada/Pindaré (rajado de fitas), Guimarães/zabumba,
Cururupu/costa-de-mão, orquestra.

**Mapa de personagens → entidades do jogo:**
| Tradição | Entidade do jogo |
|---|---|
| O **Boi** (rei encantado) | totem/estandarte-herói que lidera o cordão |
| **Amo/Patrão** (cantador, apito) | **Maruzza** como a *Ama* que comanda |
| caboclos-de-pena / rajados / vaqueiros / índias | os **segurados** (followers/multidão) |
| **Cazumbá** (máscara + túnica de santos) | unidade especial/curinga **aliada** (nunca vilão) |
| Pai Francisco / Catirina | alívio cômico / tutorial / bônus |
| **INSS** | vilão **fora** do vocabulário do boi: frio/burocrático (cinza, azulejo apagado, carimbos) |

**Ponte narrativa:** encantados = realeza; Rei Sebastião encantado num touro negro (Lençóis) → o
**Boi-rei da justiça** lidera o cordão da Maruzza pra romper o muro do INSS. (inspiração; fonte única)

**Como vira skin:** entra em `public/themes/bumba-boi/theme.json` sem tocar em sistema (regra §2.2).
⚠️ O `theme.json` do boi preenche os **mesmos tokens lógicos** que o engine lê (§2.2):
`bg.base`→veludo, `accent.primary`→ouro, `gate.good`→verde-bandeira, `gate.bad`→vermelho-festa,
`wall`→cinza/azulejo, `text`/`text.muted`→renda. As cores acima são a *fonte*; os tokens lógicos é
que o código consome (cores extras do boi entram como tokens adicionais opcionais). Validação da
Fase 4 = trocar `flat-default` ↔ `bumba-boi` a quente, gameplay intacto.

**Ética (do relatório):** homenagem com atribuição; evitar trivializar motivos sagrados; considerar
**consultoria/parceria com um grupo de boi maranhense** (autenticidade + retorno à comunidade).

---

## 8. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Tuning de dificuldade (curva da multidão) — IA balanceia mal | sistemas puros testáveis + parâmetros em dados; playtest na Fase 3 |
| Tom "vencer o INSS" soar como promessa de resultado (OAB) | copy revisada: "no jogo", nunca "você tem direito"; muro pode segurar |
| Card viral sem graça = sem viral | card é entregável de 1ª classe (Fase 2), iterado com variações |
| Skin quebrar gameplay | regra §2.2: lógica lê só tokens lógicos; Fase 4 valida troca a quente |
| Genérico demais (mais um crowd-runner) | identidade maranhense (skin boi) como diferencial de marca |
