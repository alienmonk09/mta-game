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
- [ ] **Fase 2 — Loop viral** ⬅️ **PRÓXIMO** (ResultScene + ShareCard canvas, recorde, 3-5 casos, juice/áudio)
- [ ] **Fase 3 — Beleza & acessibilidade**
- [ ] **Fase 4 — Skin Bumba meu boi** (implementar `themes/bumba-boi/` conforme roadmap §7)
- [ ] **Fase 5 — Hub & expansão**

## Verificação (sempre rodar antes de marcar fase como done)
```bash
npm run typecheck && npm test && npm run build && npm run smoke
```

## Loop
- **Build noturno CANCELADO** a pedido do usuário (2026-06-10 ~00:2x). Não rearmar ScheduleWakeup.
- Última atualização: Fase 0 ✅ · Fase 1 ✅ · Roadmap finalizado ✅. **Próximo: Fase 2 (loop viral).**

## Como retomar (nova sessão) — sem perder nada
Tudo está versionado no repo **privado** `alienmonk09/mta-game` (e no disco em
`/Users/jader/dev/mta-game`). Backup/clone: `gh repo clone alienmonk09/mta-game`. Para retomar:
1. `cd /Users/jader/dev/mta-game`
2. Abrir o Claude Code e dizer: **"leia docs/STATUS.md e continue da Fase 2"**.
3. Sanidade antes de codar: `npm run typecheck && npm test && npm run build && npm run smoke` (tudo verde).
4. Próxima fase e checklist completo: este arquivo + `docs/roadmap.md` (§4 Fase 2).

> As skills de gamedev estão instaladas no projeto (`.claude/skills/`) e aparecem após reload da sessão.
> Se o `node_modules` sumir: `npm install`.
