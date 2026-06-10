# STATUS — build noturno (LER PRIMEIRO ao retomar)

> Arquivo de continuidade do **loop de 1h**. A cada retomada: leia este arquivo + `roadmap.md`,
> execute a próxima fase pendente, **verifique** (typecheck/build), atualize este arquivo, e
> rearme o loop se ainda for antes das **07:00**.

## Goal
Build autônomo do **Exército da Maruzza** (crowd-runner, Phaser 4, modular). Roadmap → implementar
fase a fase → loop horário até as 07:00 (contornar limite de uso). Arte: **cartoon flat + skins**;
skin **Bumba meu boi** na Fase 4.

## Decisões travadas
- Jogo: Exército da Maruzza (crowd-runner estilo Count Masters). Hub + outros jogos = futuro (§6 roadmap).
- Stack: Phaser 4.1 + Vite 8 + TS 6 + Vitest 4. Mobile-first portrait 720×1280.
- Arte: base cartoon flat (`themes/flat-default`); skin `bumba-boi` (spec em roadmap §7) na Fase 4.
- Sem backend no MVP (recorde local; card viral client-side).

## Progresso por fase
- [x] **Fase 0 — Fundação** ✅ scaffold Vite+TS+Phaser4; contratos `GameModule`/`ModuleRegistry`;
      services (ThemeManager real + stubs); `gameConfig` mobile-first; módulo `exercito-da-maruzza`
      com BootScene+MenuScene; tema `flat-default`. **Verificado:** typecheck ✓, build ✓, serve ✓.
- [x] **Fase 1 — MVP jogável** ✅ implementado e verificado:
      - sistemas puros + testes: `systems/{track,wall,gates,operations}.ts` + `__tests__/*` (16 testes ✓)
      - `systems/Crowd.ts` (multidão visual), `scenes/RunScene.ts` (orquestra tudo, input arrasta o líder)
      - `data/CasoData.ts` (schema) + `data/casos.ts` (loader glob) + `data/casos/bpc.json` (1 caso, muro 60)
      - `MenuScene` botão JOGAR → `RunScene`
      - **Verificado:** typecheck ✓, 16 testes ✓, build ✓, **smoke headless** (`npm run smoke`) boot+RunScene ✓
        — screenshot em `docs/screens/fase1-runscene.png`
      - infra nova: Playwright + `scripts/smoke.mjs` (reutilizável a cada tick)
- [x] **Fase 2 — Loop viral** ✅ implementado e verificado:
      - `ResultScene` (recorde local, count-up, confete, botões compartilhar/jogar/menu, mute)
      - `ShareCard` real **genérico** (Canvas→PNG 1080×1350, Web Share API + fallback download); copy do card
        vem do `theme.json` (dado, trocável por skin) e o módulo monta `CardContent` (`systems/card.ts`)
      - `AudioManager` real (SFX sintetizados via Web Audio + trilha ambiente + mute persistido — **zero assets**)
      - Juice: `Crowd.pulse`, flash de portão, count pop, camera shake, muro estilhaça (vitória) / segura (derrota)
      - casos data-driven (BPC + auxílio-doença + apos. rural + apos. urbana; 5º caso-tutorial adicionado na
        auditoria pós-Fase 4), balanceados (invariante testado: vencível jogando bem, perdível jogando mal)
      - `MenuScene` com seletor de casos data-driven (recorde por caso) + token `outline` (cores 100% via tema)
      - **Verificado:** typecheck ✓, **46 testes** ✓, build ✓, smoke headless (boot→Menu→Run→Result→card PNG) ✓
        — screenshots em `docs/screens/fase2-{menu,run,card}.png`
      - **Review adversarial** (workflow 3 dimensões + verificação cética): 6 achados confirmados e corrigidos
        (ShareCard agnóstico ao módulo; card reenquadrado como JOGO p/ risco OAB; BPC sem termos judiciais)
- [x] **Fase 3 — Beleza & acessibilidade** ✅ implementado e verificado:
      - **Arte flat procedural (zero-asset, como o áudio):** `systems/figures.ts` gera texturas de
        pessoinhas via `Graphics.generateTexture` (idempotente) — segurado, líder **Maruzza** (broche
        dourado), **vilão INSS** (burocrata cinza). Cores 100% via tokens do tema.
      - `Crowd` virou gente (não bolinhas); `systems/Scenery.ts` (céu em gradiente + chão + colunas de
        tribunal em parallax); `systems/Villain.ts` (perito no muro, reage a vitória/derrota); muro com
        capa de topo; **barra de HUD** no topo (portões emergem por baixo → legibilidade).
      - **Acessibilidade (idoso):** `systems/onboarding.ts` (overlay 1-toque, copy ensina os **sinais
        +/× vs −/÷** — à prova de daltonismo, enquadrado como jogo); `systems/settings.ts` **modo calmo**
        (velocidade ×0.6, persistido) + toggle no menu; HUD grande/alto contraste. `Persistence` ganhou
        flags genéricas. Copy nova 100% em tokens do tema (skin-ready p/ Fase 4).
      - **Verificado:** typecheck ✓, **50 testes** ✓ (4 novos em `settings.test.ts`), build ✓, smoke ✓
        — screenshots em `docs/screens/fase3-{menu,onboarding,run,wall}.png`
      - **Review adversarial** (2 dimensões paralelas: correção/ciclo-de-vida + arquitetura/acessibilidade):
        achados reais corrigidos (copy do onboarding tematizada; sinais p/ daltônico; steer travado no
        onboarding; token `leader.accent`; sentinela na chave de textura). Inertes (cleanup automático do
        Phaser no shutdown) descartados.
- [x] **Fase 4 — Skin Bumba meu boi** ✅ implementado e verificado:
      - `public/themes/bumba-boi/theme.json` — paleta maranhense (veludo quase-preto, **ouro** de
        canutilho, vermelho/azul/verde-festa, magenta da Ama, renda) mapeada nos **mesmos tokens lógicos**;
        copy re-vozeada ("cordão encantado") e OAB-safe. Arte procedural (figures.ts) **recolore sozinha**.
      - **Seletor de skin** no menu (flat ↔ boi): troca a quente (`themes.load`), persiste
        (`Persistence.getString/setString` + `main.ts` boota a skin salva) e recarrega o menu.
      - **Validação do contrato de skin:** gameplay 100% intacto (só dados mudam). Provado por:
        teste de **parity** (toda skin tem todos os tokens de paleta/copy do contrato) + **OAB cross-skin**
        (a guarda agora trava todas as skins) + **smoke** que troca pra boi a quente e roda a RunScene sem erro.
      - **Verificado:** typecheck ✓, **65 testes** ✓, build ✓, smoke ✓ (+swap boi)
        — screenshots em `docs/screens/fase4-boi-{menu,run,wall}.png` + `fase4-{card,result}-{flat-default,bumba-boi}.png`
- [x] **Auditoria adversarial pós-Fase 4** ✅ (workflow paralelo: 5 dimensões × verificação cética; 14 achados
      confirmados, 0 refutados — vários com brute-force das 64 rotas). Corrigidos:
      - **Curva de dificuldade invertida** (BPC era order=1 mas é o mais difícil: lane-switch + folga mínima):
        adicionado caso-tutorial **salário-maternidade** (order 1, fácil/perdoável) e reordenado por dificuldade
        real (BPC → order 5 "boss"). Agora são **5 casos** de verdade (doc dizia 5, havia 4).
      - **Copy não-tematizada** (achado de contrato §2.2): shareText (emoji 👵 vs card 🐂), labels da ResultScene
        (recorde/botões), `PROVAS`/`MURO` do HUD, `Escolha o caso:`/recorde do menu → tudo via tokens do tema
        (`share.emoji`, `result.*`, `btn.*`, `wall.label`, `menu.pick`, `card.record/play` nas 2 skins).
      - Reentrância do toggle de skin (guard); auto-cura da skin inválida no boot; `summaryLine` consistente
        (toLocaleString); número mágico do vilão → `WALL_H`; fallback morto do `leader.body` (param removido).
      - **Adiados conscientemente** (impacto nulo, fix = churn): cache de texturas `fig:*` (teto de 6 ao trocar
        skin, negligível); `AudioManager.stopMusic` código morto (API plausível p/ futuro pause).
- [ ] **Fase 5 — Hub & expansão** ⏸️ **ADIADA** (decisão 2026-06-10): construir Hub multi-jogo com
      apenas 1 módulo é YAGNI. O contrato `GameModule` já é hub-ready; a Fase 5 entra quando existir um
      **2º jogo** (ver §6: INSSdle/Wordle, Fura-Fila Flappy, etc.). Aí o Hub vira dor real.

## Verificação (sempre rodar antes de marcar fase como done)
```bash
npm run typecheck && npm test && npm run build && npm run smoke
```

## Loop
- **Build noturno CANCELADO** a pedido do usuário (2026-06-10 ~00:2x). Não rearmar ScheduleWakeup.
- Última atualização (2026-06-10): Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · **Fase 4 ✅ (skin
  Bumba meu boi + seletor a quente; contrato de skin provado por parity + OAB cross-skin + smoke)**.
  **Sistema de skins validado: trocar `theme.json` = trocar a cara, gameplay intacto.** Próximo: Fase 5 (Hub).
- Produção da Fase 3 com **workflow paralelo**: 4 agentes em arquivos disjuntos (Scenery, settings+onboarding,
  Crowd, Villain) sobre o contrato `figures.ts`. Fase 4 mais serial (arquivos compartilhados + 1 theme criativo).

## Como retomar (nova sessão) — sem perder nada
Tudo está versionado no repo **privado** `alienmonk09/mta-game` (e no disco em
`/Users/jader/dev/mta-game`). Backup/clone: `gh repo clone alienmonk09/mta-game`. Para retomar:
1. `cd /Users/jader/dev/mta-game`
2. Abrir o Claude Code e dizer: **"leia docs/STATUS.md e continue da Fase 3"**.
3. Sanidade antes de codar: `npm run typecheck && npm test && npm run build && npm run smoke` (tudo verde).
4. Próxima fase e checklist completo: este arquivo + `docs/roadmap.md` (§4 Fase 2).

> As skills de gamedev estão instaladas no projeto (`.claude/skills/`) e aparecem após reload da sessão.
> Se o `node_modules` sumir: `npm install`.
