# MTA Game — Exército da Maruzza

Jogo de marca do escritório de advocacia previdenciária **Maruzza Teixeira**: um
**crowd-runner** onde você junta uma multidão de provas e derruba o muro do INSS.

- **Engine:** Phaser 4 · **Build:** Vite + TypeScript
- **Arquitetura:** modular (cada sistema/jogo é um módulo) — ver [`docs/roadmap.md`](docs/roadmap.md)
- **Arte:** cartoon flat + sistema de skins (skin Bumba meu boi na Fase 4)

## Rodar

```bash
npm install
npm run dev        # servidor de desenvolvimento (Vite)
npm run build      # typecheck + build de produção
npm run preview    # serve o build
npm run typecheck  # só checagem de tipos
npm test           # testes (Vitest)
```

## Documentos

- [`docs/roadmap.md`](docs/roadmap.md) — design, arquitetura modular, fases, sistema de skins, hub futuro
- [`docs/gamedev-skills.md`](docs/gamedev-skills.md) — skills de gamedev instaladas e quando usar
- [`docs/research-bumba-meu-boi.md`](docs/research-bumba-meu-boi.md) — pesquisa da identidade maranhense (skin)

## Estrutura

```
src/
  main.ts              boot
  config/              Phaser.Game + escala mobile-first
  core/                contratos (GameModule, ModuleRegistry) + services
  modules/             cada jogo é um módulo autocontido
    exercito-da-maruzza/
public/themes/         skins (dados): flat-default, bumba-boi (futuro)
docs/
```
