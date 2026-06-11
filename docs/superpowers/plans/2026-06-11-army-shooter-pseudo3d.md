# Army Shooter 2.5D (MVP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o *Exército da Maruzza* de crowd-runner mínimo em **army shooter 2.5D** (estilo Battle Brigade): câmera em perspectiva, Maruzza heroína atirando provas, inimigos/obstáculos da burocracia, portões de dois eixos (quantidade × qualidade da arma) e boss (muro) com HP — mantendo zero-asset, skins, acessibilidade e OAB-safe.

**Architecture:** Camada **aditiva** sobre os sistemas puros atuais. Novos sistemas puros (`weapons`, `combat`, `projection`) são TDD'dados isoladamente; a integração visual (`Fx`, `Projectiles`, `Enemy`, `figures`, `RunScene`) é verificada por typecheck + smoke headless. Dano é **por tick determinístico** (testável); projéteis são **juice visual**. Gates ganham um campo **opcional `weapon?`** (sem migração de dados). Arte continua **procedural/zero-asset**, recolorida por tokens — habilitando ilustração por-skin no futuro via o resolvedor.

**Tech Stack:** Phaser 4.1, TypeScript 6, Vite 8, Vitest 4, Playwright (smoke). Conteúdo data-driven em JSON.

**Spec:** `docs/superpowers/specs/2026-06-11-army-shooter-pseudo3d-design.md`
**Branch:** `feat/army-shooter-2.5d`

**Convenção de verificação (gate de pronto do projeto):**
`npm run typecheck && npm test && npm run build && npm run smoke` — tudo verde.

---

## Estrutura de arquivos

**Criar (puros, testáveis):**
- `src/modules/exercito-da-maruzza/data/weapons.ts` — escada de tiers de arma (dado) + helpers.
- `src/modules/exercito-da-maruzza/systems/combat.ts` — dps, cadência, dano, penalidade, resolução do boss.
- `src/modules/exercito-da-maruzza/systems/projection.ts` — projeção pseudo-3D (distância+lane → x,y,escala).

**Criar (visuais, verificados por typecheck/smoke):**
- `src/modules/exercito-da-maruzza/systems/Fx.ts` — juice reutilizável (flash, faíscas, estouro de papel).
- `src/modules/exercito-da-maruzza/systems/Projectiles.ts` — pool de projéteis (provas) viajando na profundidade.
- `src/modules/exercito-da-maruzza/systems/Enemy.ts` — obstáculo de burocracia (carimbo/pilha) com barra de HP.

**Modificar:**
- `src/modules/exercito-da-maruzza/data/CasoData.ts` — `GateOp.weapon?`, `CasoData.enemies?`, `CasoData.bossHp?`.
- `src/modules/exercito-da-maruzza/systems/operations.ts` — `isWeaponGate`.
- `src/modules/exercito-da-maruzza/systems/balance.ts` — invariante do boss (provas + tier).
- `src/modules/exercito-da-maruzza/systems/figures.ts` — `projectileTexture`, `obstacleTexture`.
- `src/modules/exercito-da-maruzza/scenes/RunScene.ts` — orquestra projeção + tiro + inimigos + boss.
- `src/modules/exercito-da-maruzza/data/casos/bpc.json` — caso vitrine de combate (weapon gates, enemies, bossHp).
- `public/themes/flat-default/theme.json` + `public/themes/bumba-boi/theme.json` — tokens novos (parity).
- `src/modules/exercito-da-maruzza/data/__tests__/copy-oab.test.ts` — cobre copy nova.
- `scripts/smoke.mjs` — exercita combate.
- `docs/roadmap.md`, `docs/STATUS.md` — registra redesign + fases futuras.

**Intactos:** `track.ts`, skins/`ThemeManager`, `settings.ts`/`onboarding.ts`, `ShareCard`/`ResultScene`/`card.ts`, `MenuScene`, `Scenery.ts`, `Villain.ts` (reusado), `Crowd.ts` (séquito — já é líder + seguidores).

---

## Task 1: `weapons.ts` — escada de tiers de arma (puro, TDD)

**Files:**
- Create: `src/modules/exercito-da-maruzza/data/weapons.ts`
- Test: `src/modules/exercito-da-maruzza/data/__tests__/weapons.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/modules/exercito-da-maruzza/data/__tests__/weapons.test.ts
import { describe, it, expect } from 'vitest';
import { WEAPON_LADDER, clampTier, applyWeapon, tierLabel, tierDmgMul } from '../weapons';

describe('weapons ladder', () => {
  it('tem ao menos 3 tiers em ordem crescente de dano', () => {
    expect(WEAPON_LADDER.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < WEAPON_LADDER.length; i++) {
      expect(WEAPON_LADDER[i].dmgMul).toBeGreaterThan(WEAPON_LADDER[i - 1].dmgMul);
    }
  });

  it('clampTier limita em [0, len-1] e arredonda', () => {
    expect(clampTier(-3)).toBe(0);
    expect(clampTier(99)).toBe(WEAPON_LADDER.length - 1);
    expect(clampTier(1.4)).toBe(1);
  });

  it('applyWeapon soma o delta com clamp', () => {
    expect(applyWeapon(0, +1)).toBe(1);
    expect(applyWeapon(0, -1)).toBe(0);
    expect(applyWeapon(WEAPON_LADDER.length - 1, +1)).toBe(WEAPON_LADDER.length - 1);
  });

  it('tierLabel e tierDmgMul respeitam o clamp', () => {
    expect(tierLabel(0)).toBe(WEAPON_LADDER[0].label);
    expect(tierDmgMul(99)).toBe(WEAPON_LADDER[WEAPON_LADDER.length - 1].dmgMul);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/modules/exercito-da-maruzza/data/__tests__/weapons.test.ts`
Expected: FAIL — `Cannot find module '../weapons'`.

- [ ] **Step 3: Implementar `weapons.ts`**

```ts
// src/modules/exercito-da-maruzza/data/weapons.ts
/**
 * Escada de "armas" = qualidade da prova da Maruzza (conteúdo-como-dado).
 * Subir tier = prova melhor → mais dano. OAB-safe: são tipos de PROVA, não
 * instrumentos que "garantem" resultado. Labels podem ser re-vozeados por skin no futuro.
 */
export interface WeaponTier {
  id: string;
  label: string;
  /** multiplicador de dano sobre a base (1.0 = tier inicial) */
  dmgMul: number;
}

export const WEAPON_LADDER: readonly WeaponTier[] = [
  { id: 'documento', label: 'Documento', dmgMul: 1.0 },
  { id: 'laudo', label: 'Laudo', dmgMul: 1.6 },
  { id: 'dossie', label: 'Dossiê', dmgMul: 2.4 },
];

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(WEAPON_LADDER.length - 1, Math.round(tier)));
}

export function applyWeapon(tier: number, delta: number): number {
  return clampTier(tier + delta);
}

export function tierLabel(tier: number): string {
  return WEAPON_LADDER[clampTier(tier)].label;
}

export function tierDmgMul(tier: number): number {
  return WEAPON_LADDER[clampTier(tier)].dmgMul;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/modules/exercito-da-maruzza/data/__tests__/weapons.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/modules/exercito-da-maruzza/data/weapons.ts src/modules/exercito-da-maruzza/data/__tests__/weapons.test.ts
git commit -m "feat(combat): escada de tiers de arma (qualidade da prova)"
```

---

## Task 2: `combat.ts` — DPS, dano, penalidade, boss (puro, TDD)

**Files:**
- Create: `src/modules/exercito-da-maruzza/systems/combat.ts`
- Test: `src/modules/exercito-da-maruzza/systems/__tests__/combat.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/modules/exercito-da-maruzza/systems/__tests__/combat.test.ts
import { describe, it, expect } from 'vitest';
import {
  dps, fireInterval, applyDamage, enemyPenalty, resolveBoss,
  FIRE_RANGE, windowMsFor,
} from '../combat';

describe('dps', () => {
  it('cresce com as provas', () => {
    expect(dps(100, 0)).toBeGreaterThan(dps(10, 0));
  });
  it('cresce com o tier da arma', () => {
    expect(dps(50, 2)).toBeGreaterThan(dps(50, 0));
  });
  it('com 0 provas ainda dá algum dano (tier 0)', () => {
    expect(dps(0, 0)).toBeGreaterThan(0);
  });
});

describe('fireInterval', () => {
  it('diminui (atira mais rápido) com mais provas, com piso', () => {
    expect(fireInterval(100, 0)).toBeLessThan(fireInterval(1, 0));
    expect(fireInterval(100000, 0)).toBeGreaterThan(0);
  });
});

describe('applyDamage', () => {
  it('subtrai e nunca fica negativo', () => {
    expect(applyDamage(30, 12)).toBe(18);
    expect(applyDamage(10, 999)).toBe(0);
    expect(applyDamage(10, -5)).toBe(10);
  });
});

describe('enemyPenalty', () => {
  it('provas perdidas ∝ HP que sobrou (0 se destruído)', () => {
    expect(enemyPenalty(0)).toBe(0);
    expect(enemyPenalty(30)).toBe(30);
    expect(enemyPenalty(-2)).toBe(0);
  });
});

describe('resolveBoss', () => {
  it('quebra quando o dano na janela >= HP', () => {
    expect(resolveBoss(100, 50, 3000).broken).toBe(true); // 150 >= 100
  });
  it('segura quando o dano na janela < HP', () => {
    expect(resolveBoss(1000, 50, 3000).broken).toBe(false); // 150 < 1000
  });
  it('fraction fica em [0,1] e overkill >= 0', () => {
    const r = resolveBoss(100, 50, 3000);
    expect(r.fraction).toBeLessThanOrEqual(1);
    expect(r.fraction).toBeGreaterThan(0);
    expect(r.overkill).toBeGreaterThanOrEqual(0);
  });
});

describe('windowMsFor', () => {
  it('janela = tempo que o boss leva pra cruzar o alcance de fogo', () => {
    expect(windowMsFor(320)).toBeCloseTo((FIRE_RANGE / 320) * 1000, 5);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/modules/exercito-da-maruzza/systems/__tests__/combat.test.ts`
Expected: FAIL — `Cannot find module '../combat'`.

- [ ] **Step 3: Implementar `combat.ts`**

```ts
// src/modules/exercito-da-maruzza/systems/combat.ts
/**
 * Combate PURO e determinístico (sem Phaser). O DANO é calculado por tick
 * (dps × dt) — testável e balanceável. Os projéteis visuais (Projectiles.ts)
 * são só juice e NÃO carregam a colisão. "Mais provas + arma melhor = mais dano"
 * é a mensagem de marca: quantidade E qualidade de prova derrubam o muro.
 */
import { tierDmgMul } from '../data/weapons';

const DPS_BASE = 6; // dano/s base (0 provas extras, tier documento)
const PROVAS_FACTOR = 0.6; // cada prova soma 60% do dano-base
const BASE_INTERVAL = 520; // ms entre disparos com poucas provas
const MIN_INTERVAL = 80; // piso de cadência (ms)
const RATE_FACTOR = 0.04; // quão rápido a cadência acelera com provas

/** alcance de fogo (unidades de pista): o boss entra em alcance a esta distância. */
export const FIRE_RANGE = 900;

/** Dano por segundo. Monotônico crescente em provas e em tier. */
export function dps(provas: number, tier: number): number {
  const p = Math.max(0, provas);
  return DPS_BASE * tierDmgMul(tier) * (1 + p * PROVAS_FACTOR);
}

/** Intervalo entre disparos (ms) — só cadência visual; cai com mais provas, com piso. */
export function fireInterval(provas: number, _tier: number): number {
  const p = Math.max(0, provas);
  return Math.max(MIN_INTERVAL, BASE_INTERVAL / (1 + p * RATE_FACTOR));
}

/** Aplica dano a um HP, com piso 0; ignora dano negativo. */
export function applyDamage(hp: number, dmg: number): number {
  return Math.max(0, hp - Math.max(0, dmg));
}

/** Provas perdidas quando um inimigo chega vivo: proporcional ao HP restante. */
export function enemyPenalty(hpRemaining: number): number {
  return Math.max(0, Math.round(hpRemaining));
}

/** Janela de fogo no boss (ms) = tempo pra cruzar FIRE_RANGE na velocidade do caso. */
export function windowMsFor(speed: number): number {
  return (FIRE_RANGE / Math.max(1, speed)) * 1000;
}

export interface BossResult {
  broken: boolean;
  fraction: number;
  overkill: number;
}

/** Resolve o muro como dreno de HP: dano = dps × janela. */
export function resolveBoss(bossHp: number, dpsValue: number, windowMs: number): BossResult {
  const dmg = Math.max(0, dpsValue) * (Math.max(0, windowMs) / 1000);
  const fraction = bossHp <= 0 ? 1 : Math.min(1, dmg / bossHp);
  return { broken: dmg >= bossHp, fraction, overkill: Math.max(0, dmg - bossHp) };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/modules/exercito-da-maruzza/systems/__tests__/combat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/exercito-da-maruzza/systems/combat.ts src/modules/exercito-da-maruzza/systems/__tests__/combat.test.ts
git commit -m "feat(combat): dps-tick determinístico, penalidade de inimigo e resolução do boss"
```

---

## Task 3: `projection.ts` — perspectiva pseudo-3D (puro, TDD)

**Files:**
- Create: `src/modules/exercito-da-maruzza/systems/projection.ts`
- Test: `src/modules/exercito-da-maruzza/systems/__tests__/projection.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/modules/exercito-da-maruzza/systems/__tests__/projection.test.ts
import { describe, it, expect } from 'vitest';
import { project, type ProjConfig } from '../projection';

const cfg: ProjConfig = {
  width: 720, horizonY: 400, heroY: 1000,
  nearScale: 1, farScale: 0.25,
  halfLaneNear: 300, halfLaneFar: 60,
  dHorizon: 3000,
};

describe('project', () => {
  it('no plano da heroína (d=0): perto, escala cheia, y=heroY', () => {
    const p = project(0, 0, cfg);
    expect(p.t).toBe(0);
    expect(p.scale).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(1000);
    expect(p.x).toBeCloseTo(360); // centro
  });

  it('no horizonte (d=dHorizon): longe, escala mínima, y=horizonY', () => {
    const p = project(3000, 0, cfg);
    expect(p.t).toBe(1);
    expect(p.scale).toBeCloseTo(0.25);
    expect(p.y).toBeCloseTo(400);
  });

  it('clampa além do horizonte', () => {
    expect(project(9999, 0, cfg).t).toBe(1);
  });

  it('lanes convergem ao ponto de fuga com a profundidade', () => {
    const near = project(0, 1, cfg);
    const far = project(3000, 1, cfg);
    expect(near.x - 360).toBeCloseTo(300); // halfLaneNear
    expect(far.x - 360).toBeCloseTo(60); // halfLaneFar (convergiu)
    expect(Math.abs(far.x - 360)).toBeLessThan(Math.abs(near.x - 360));
  });

  it('laneX negativo vai pra esquerda do centro', () => {
    expect(project(0, -1, cfg).x).toBeLessThan(360);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run src/modules/exercito-da-maruzza/systems/__tests__/projection.test.ts`
Expected: FAIL — `Cannot find module '../projection'`.

- [ ] **Step 3: Implementar `projection.ts`**

```ts
// src/modules/exercito-da-maruzza/systems/projection.ts
/**
 * Projeção pseudo-3D (2.5D), PURA. Mapeia (profundidade na pista, lane) →
 * (x, y, escala) na tela. Phaser é 2D — isto é só projeção em perspectiva.
 * Os sistemas continuam 1D (distância); só este arquivo "sabe" da câmera.
 *
 *   d = dist - track.traveled   (≥0 à frente; 0 = plano da heroína)
 *   laneX ∈ [-1, 1]             (-1 = esquerda, +1 = direita)
 */
export interface ProjConfig {
  width: number;
  /** y de tela do horizonte (px, topo da pista) */
  horizonY: number;
  /** y de tela do plano da heroína (px, perto da câmera) */
  heroY: number;
  /** escala perto (d=0) e no horizonte */
  nearScale: number;
  farScale: number;
  /** meia-largura do espalhamento das lanes perto e no horizonte (px) */
  halfLaneNear: number;
  halfLaneFar: number;
  /** profundidade (unidades de pista) que mapeia pro horizonte */
  dHorizon: number;
}

export interface Projected {
  x: number;
  y: number;
  scale: number;
  /** 0 (perto) .. 1 (horizonte) */
  t: number;
}

export function project(d: number, laneX: number, cfg: ProjConfig): Projected {
  const t = Math.max(0, Math.min(1, d / cfg.dHorizon));
  const scale = cfg.nearScale + (cfg.farScale - cfg.nearScale) * t;
  const y = cfg.heroY + (cfg.horizonY - cfg.heroY) * t;
  const halfLane = cfg.halfLaneNear + (cfg.halfLaneFar - cfg.halfLaneNear) * t;
  const x = cfg.width / 2 + laneX * halfLane;
  return { x, y, scale, t };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run src/modules/exercito-da-maruzza/systems/__tests__/projection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/exercito-da-maruzza/systems/projection.ts src/modules/exercito-da-maruzza/systems/__tests__/projection.test.ts
git commit -m "feat(render): projeção pseudo-3D pura (distância+lane → x,y,escala)"
```

---

## Task 4: Estender `CasoData` + `operations.isWeaponGate` (TDD leve)

Adiciona o segundo eixo (arma) e o conteúdo de combate como **dados opcionais** — sem migrar os 5 casos nem mexer em `applyOp`/`isGoodOp`/`opSign` (os 65 testes continuam verdes).

**Files:**
- Modify: `src/modules/exercito-da-maruzza/data/CasoData.ts`
- Modify: `src/modules/exercito-da-maruzza/systems/operations.ts`
- Test: `src/modules/exercito-da-maruzza/systems/__tests__/operations.test.ts:33` (acrescenta bloco)

- [ ] **Step 1: Escrever o teste que falha** (acrescentar ao fim de `operations.test.ts`)

```ts
// acrescentar em src/modules/exercito-da-maruzza/systems/__tests__/operations.test.ts
import { isWeaponGate } from '../operations';

describe('isWeaponGate', () => {
  it('detecta portão que mexe no tier da arma', () => {
    expect(isWeaponGate({ op: 'add', value: 0, label: '', weapon: 1 })).toBe(true);
    expect(isWeaponGate({ op: 'mul', value: 2, label: '', weapon: -1 })).toBe(true);
  });
  it('portão só de provas não é portão de arma', () => {
    expect(isWeaponGate({ op: 'mul', value: 2, label: '' })).toBe(false);
    expect(isWeaponGate({ op: 'add', value: 0, label: '', weapon: 0 })).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/modules/exercito-da-maruzza/systems/__tests__/operations.test.ts`
Expected: FAIL — `isWeaponGate` não exportada.

- [ ] **Step 3: Estender `CasoData.ts`** (adicionar `weapon?` em `GateOp`; `enemies?`/`bossHp?` em `CasoData`)

```ts
// src/modules/exercito-da-maruzza/data/CasoData.ts
/** Schema de um "caso" (benefício) — conteúdo data-driven. */

export type OpKind = 'mul' | 'add' | 'div' | 'sub';

export interface GateOp {
  op: OpKind;
  value: number;
  /** rótulo da prova/armadilha (ex: "Laudo médico", "Falta CNIS") */
  label: string;
  /** se presente e ≠ 0, este lado também altera o TIER DA ARMA (±) ao ser cruzado */
  weapon?: number;
}

export interface GatePair {
  /** distância da largada (px) onde o portão cruza a multidão */
  dist: number;
  left: GateOp;
  right: GateOp;
}

/** Obstáculo de burocracia (nunca pessoa) que desce a pista e tem HP. */
export interface CasoEnemy {
  /** tipo visual: carimbo de exigência, pilha de processos... */
  kind: 'carimbo' | 'pilha';
  /** distância da largada onde aparece */
  dist: number;
  /** lane ∈ [-1, 1] */
  lane: number;
  /** vida (dano necessário pra dissolver) */
  hp: number;
  /** rótulo (ex: "Exigência", "Fila", "Indeferido") */
  label: string;
}

export interface CasoData {
  id: string;
  name: string;
  /** frase curta de sabor (subtítulo no menu) */
  tagline?: string;
  /** ordem de exibição no menu (menor = primeiro/mais fácil) */
  order?: number;
  /** tamanho inicial do exército */
  start: number;
  /** velocidade de scroll (px/s) */
  speed: number;
  gates: GatePair[];
  /** limiar do muro de indeferimento (modo legado: compara contagem) */
  wall: number;
  /** obstáculos da burocracia na pista (opcional) */
  enemies?: CasoEnemy[];
  /** HP do boss; se presente, o muro vira dreno de HP (combate). Senão usa `wall`. */
  bossHp?: number;
}
```

- [ ] **Step 4: Estender `operations.ts`** (adicionar `isWeaponGate` ao fim; nada mais muda)

```ts
// acrescentar ao fim de src/modules/exercito-da-maruzza/systems/operations.ts
/** Este lado de portão mexe no tier da arma (eixo qualidade)? */
export function isWeaponGate(op: GateOp): boolean {
  return (op.weapon ?? 0) !== 0;
}
```

- [ ] **Step 5: Rodar a suíte inteira e ver tudo verde**

Run: `npm test`
Expected: PASS — testes existentes intactos + novos de `isWeaponGate`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/exercito-da-maruzza/data/CasoData.ts src/modules/exercito-da-maruzza/systems/operations.ts src/modules/exercito-da-maruzza/systems/__tests__/operations.test.ts
git commit -m "feat(data): GateOp.weapon? + CasoData.enemies/bossHp (eixo qualidade, aditivo)"
```

---

## Task 5: `balance.ts` — invariante do boss (provas + tier) (puro, TDD)

Mantém `simulateRun`/`isWinnable`/`isLosable` intactos (testes atuais passam). Adiciona simulação que carrega **tier** ao longo do caminho greedy e checa o boss via `combat`.

**Files:**
- Modify: `src/modules/exercito-da-maruzza/systems/balance.ts`
- Test: `src/modules/exercito-da-maruzza/systems/__tests__/balance.test.ts:61` (acrescenta bloco)

- [ ] **Step 1: Escrever o teste que falha** (acrescentar ao fim de `balance.test.ts`)

```ts
// acrescentar em src/modules/exercito-da-maruzza/systems/__tests__/balance.test.ts
import { simulateOutcome, isBossWinnable, isBossLosable } from '../balance';

describe('boss (provas + tier)', () => {
  const combate: CasoData = {
    id: 'cb', name: 'cb', start: 1, speed: 320, wall: 60, bossHp: 200,
    gates: [
      { dist: 520, left: { op: 'mul', value: 2, label: 'Laudo', weapon: 1 }, right: { op: 'sub', value: 3, label: 'Sem laudo' } },
      { dist: 1040, left: { op: 'add', value: 5, label: 'CNIS' }, right: { op: 'div', value: 2, label: 'Falta CNIS' } },
      { dist: 1560, left: { op: 'mul', value: 2, label: 'CadÚnico', weapon: 1 }, right: { op: 'sub', value: 5, label: 'Exigência' } },
    ],
  };

  it('caminho best acumula provas e sobe o tier nos lados escolhidos', () => {
    const o = simulateOutcome(combate, 'best');
    expect(o.provas).toBe(simulateRun(combate, 'best'));
    expect(o.tier).toBeGreaterThan(0); // pegou ao menos um weapon-up
  });

  it('boss é vencível jogando bem e perdível jogando mal', () => {
    expect(isBossWinnable(combate)).toBe(true);
    expect(isBossLosable(combate)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/modules/exercito-da-maruzza/systems/__tests__/balance.test.ts`
Expected: FAIL — `simulateOutcome`/`isBossWinnable`/`isBossLosable` não exportadas.

- [ ] **Step 3: Estender `balance.ts`** (acrescentar; não tocar no que existe)

```ts
// acrescentar ao fim de src/modules/exercito-da-maruzza/systems/balance.ts
import { applyWeapon } from '../data/weapons';
import { dps, resolveBoss, windowMsFor } from './combat';

export interface RunOutcome {
  provas: number;
  tier: number;
}

/**
 * Simula a run carregando provas E tier. A cada portão escolhe o lado por
 * provas (best=maior / worst=menor) e aplica o weapon-delta daquele lado.
 */
export function simulateOutcome(caso: CasoData, mode: PickMode): RunOutcome {
  const gates = [...caso.gates].sort((a, b) => a.dist - b.dist);
  let provas = caso.start;
  let tier = 0;
  for (const gate of gates) {
    const left = applyOp(provas, gate.left);
    const right = applyOp(provas, gate.right);
    const pickLeft = mode === 'best' ? left >= right : left <= right;
    const side = pickLeft ? gate.left : gate.right;
    provas = pickLeft ? left : right;
    tier = applyWeapon(tier, side.weapon ?? 0);
  }
  return { provas, tier };
}

/** Jogando pra maximizar provas, o boss cai dentro da janela de fogo? */
export function isBossWinnable(caso: CasoData): boolean {
  if (caso.bossHp == null) return isWinnable(caso); // caso legado: compara contagem
  const o = simulateOutcome(caso, 'best');
  return resolveBoss(caso.bossHp, dps(o.provas, o.tier), windowMsFor(caso.speed)).broken;
}

/** Jogando pra minimizar provas, o boss segura? (senão o caso é trivial) */
export function isBossLosable(caso: CasoData): boolean {
  if (caso.bossHp == null) return isLosable(caso);
  const o = simulateOutcome(caso, 'worst');
  return !resolveBoss(caso.bossHp, dps(o.provas, o.tier), windowMsFor(caso.speed)).broken;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/modules/exercito-da-maruzza/systems/__tests__/balance.test.ts`
Expected: PASS (testes antigos + boss).

- [ ] **Step 5: Commit**

```bash
git add src/modules/exercito-da-maruzza/systems/balance.ts src/modules/exercito-da-maruzza/systems/__tests__/balance.test.ts
git commit -m "feat(balance): invariante do boss (provas+tier vencível/perdível)"
```

---

## Task 6: Caso vitrine de combate (`bpc.json`) + invariante em todos os casos reais

Enriquece o BPC (caso "boss", order 5) com weapon gates, inimigos e `bossHp`. Adiciona um teste que roda o invariante sobre **todos os casos reais** (combate → boss; legado → contagem).

**Files:**
- Modify: `src/modules/exercito-da-maruzza/data/casos/bpc.json`
- Test: `src/modules/exercito-da-maruzza/data/__tests__/casos.test.ts` (acrescenta bloco — arquivo já existe)

- [ ] **Step 1: Escrever o teste que falha** (acrescentar ao fim de `casos.test.ts`)

```ts
// acrescentar em src/modules/exercito-da-maruzza/data/__tests__/casos.test.ts
import { allCasos } from '../casos';
import { isBossWinnable, isBossLosable } from '../../systems/balance';

describe('invariante de combate em todos os casos reais', () => {
  for (const caso of allCasos()) {
    it(`"${caso.id}" é vencível jogando bem e perdível jogando mal`, () => {
      expect(isBossWinnable(caso), `${caso.id} não é vencível nem no melhor caminho`).toBe(true);
      expect(isBossLosable(caso), `${caso.id} é vencível até no pior caminho (trivial)`).toBe(true);
    });
  }

  it('o caso BPC tem combate (bossHp + inimigos + ao menos um weapon gate)', () => {
    const bpc = allCasos().find((c) => c.id === 'bpc')!;
    expect(bpc.bossHp).toBeGreaterThan(0);
    expect(bpc.enemies?.length ?? 0).toBeGreaterThan(0);
    const hasWeaponGate = bpc.gates.some((g) => (g.left.weapon ?? 0) !== 0 || (g.right.weapon ?? 0) !== 0);
    expect(hasWeaponGate).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/modules/exercito-da-maruzza/data/__tests__/casos.test.ts`
Expected: FAIL — BPC ainda não tem `bossHp`/`enemies`/weapon gate.

- [ ] **Step 3: Reescrever `bpc.json`** (provas inalteradas → balance de contagem intacto; acrescenta arma/inimigos/bossHp)

```json
{
  "id": "bpc",
  "name": "BPC-LOAS da Dona Cida",
  "tagline": "Renda e deficiência provadas derrubam o muro",
  "order": 5,
  "start": 1,
  "speed": 320,
  "wall": 60,
  "bossHp": 400,
  "gates": [
    { "dist": 520,  "left": { "op": "mul", "value": 2, "label": "Laudo médico", "weapon": 1 }, "right": { "op": "sub", "value": 3, "label": "Sem laudo" } },
    { "dist": 1040, "left": { "op": "add", "value": 5, "label": "CNIS" },            "right": { "op": "div", "value": 2, "label": "Falta CNIS" } },
    { "dist": 1560, "left": { "op": "sub", "value": 5, "label": "Exigência" },        "right": { "op": "mul", "value": 2, "label": "CadÚnico" } },
    { "dist": 2080, "left": { "op": "mul", "value": 2, "label": "Perícia", "weapon": 1 }, "right": { "op": "div", "value": 2, "label": "Remarcada" } },
    { "dist": 2600, "left": { "op": "add", "value": 10, "label": "Testemunha" },      "right": { "op": "sub", "value": 8, "label": "Indeferido" } },
    { "dist": 3120, "left": { "op": "div", "value": 3, "label": "Renda alta" },        "right": { "op": "mul", "value": 2, "label": "Laudo social" } }
  ],
  "enemies": [
    { "kind": "carimbo", "dist": 800,  "lane": -0.5, "hp": 30, "label": "Exigência" },
    { "kind": "pilha",   "dist": 1800, "lane": 0.5,  "hp": 60, "label": "Fila" },
    { "kind": "carimbo", "dist": 2400, "lane": 0.0,  "hp": 90, "label": "Indeferido" }
  ]
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/modules/exercito-da-maruzza/data/__tests__/casos.test.ts`
Expected: PASS — invariante vale pra todos os casos (BPC via boss; os outros 4 via contagem legada).

- [ ] **Step 5: Commit**

```bash
git add src/modules/exercito-da-maruzza/data/casos/bpc.json src/modules/exercito-da-maruzza/data/__tests__/casos.test.ts
git commit -m "feat(content): BPC vira caso vitrine de combate (weapon gates, inimigos, bossHp)"
```

---

## Task 7: `figures.ts` — texturas de projétil e obstáculo (visual)

Arte procedural nova, recolorida por tokens. Sem teste unitário (geração precisa de `Scene`); validada por typecheck + smoke.

**Files:**
- Modify: `src/modules/exercito-da-maruzza/systems/figures.ts`

- [ ] **Step 1: Acrescentar `projectileTexture` e `obstacleTexture`** (ao fim de `figures.ts`, antes do EOF)

```ts
// acrescentar ao fim de src/modules/exercito-da-maruzza/systems/figures.ts

/** Projétil "prova": um documentinho (folha com dobra) — cores do tema. */
export function projectileTexture(scene: Phaser.Scene, c: { paper: number; ink: number; outline: number }): string {
  const k = `fig:proj:${c.paper}:${c.ink}:${c.outline}`;
  const w = 16, h = 20;
  return bake(scene, k, w, h, (g) => {
    // folha
    g.fillStyle(c.paper, 1);
    g.fillRoundedRect(2, 1, w - 4, h - 2, 3);
    g.lineStyle(2, c.outline, 1);
    g.strokeRoundedRect(2, 1, w - 4, h - 2, 3);
    // linhas de texto (tinta)
    g.fillStyle(c.ink, 1);
    g.fillRect(5, 6, w - 10, 2);
    g.fillRect(5, 10, w - 10, 2);
    g.fillRect(5, 14, w - 12, 2);
  });
}

/**
 * Obstáculo de burocracia (NUNCA pessoa): carimbo "exigência" ou pilha de
 * processos. `kind` muda a silhueta; cores vêm do tema (enemy.*).
 */
export function obstacleTexture(scene: Phaser.Scene, kind: 'carimbo' | 'pilha', c: { body: number; accent: number; outline: number }): string {
  const k = `fig:obst:${kind}:${c.body}:${c.accent}:${c.outline}`;
  const w = 56, h = 56;
  return bake(scene, k, w, h, (g) => {
    const cx = w / 2;
    if (kind === 'carimbo') {
      // cabo + base de carimbo
      g.fillStyle(c.accent, 1);
      g.fillRoundedRect(cx - 6, 6, 12, 16, 4); // cabo
      blob(g, cx - 18, 22, 36, 16, 5, c.body, c.outline); // corpo
      blob(g, cx - 22, 38, 44, 12, 4, c.accent, c.outline); // base
    } else {
      // pilha de 3 folhas empilhadas, levemente tortas
      blob(g, cx - 20, 30, 40, 18, 3, c.body, c.outline);
      blob(g, cx - 18, 18, 38, 16, 3, c.body, c.outline);
      blob(g, cx - 16, 8, 34, 14, 3, c.accent, c.outline);
    }
  });
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS (sem erros de tipo).

- [ ] **Step 3: Commit**

```bash
git add src/modules/exercito-da-maruzza/systems/figures.ts
git commit -m "feat(art): texturas procedurais de projétil (prova) e obstáculo (carimbo/pilha)"
```

---

## Task 8: Tokens de tema (parity flat ↔ boi)

Adiciona tokens de cor/copy pros elementos novos, nas **duas** skins (o parity test exige paridade). Mantém OAB-safe.

**Files:**
- Modify: `public/themes/flat-default/theme.json`
- Modify: `public/themes/bumba-boi/theme.json`

- [ ] **Step 1: Acrescentar tokens em `flat-default/theme.json`**

Na seção `palette`, adicionar (antes do `"text"`):
```json
    "enemy.body": "#7b8496",
    "enemy.accent": "#9aa3b2",
    "projectile.paper": "#fef9e7",
    "projectile.ink": "#475569",
```
Na seção `copy`, adicionar (antes do `"share.emoji"`):
```json
    "hud.weapon": "ARMA",
```

- [ ] **Step 2: Acrescentar os MESMOS tokens em `bumba-boi/theme.json`** (cores re-vozeadas pra skin do boi)

Na `palette`:
```json
    "enemy.body": "#5A6678",
    "enemy.accent": "#7C879B",
    "projectile.paper": "#FFF3B0",
    "projectile.ink": "#2A323F",
```
Na `copy`:
```json
    "hud.weapon": "ARMA",
```

- [ ] **Step 3: Verificar parity + OAB**

Run: `npx vitest run src/modules/exercito-da-maruzza/data/__tests__/copy-oab.test.ts`
Expected: PASS — parity exige que boi tenha todos os tokens de flat (agora tem); copy nova não bate na regex proibida.

- [ ] **Step 4: Commit**

```bash
git add public/themes/flat-default/theme.json public/themes/bumba-boi/theme.json
git commit -m "feat(theme): tokens de inimigo/projétil/arma nas duas skins (parity)"
```

---

## Task 9: `Fx.ts` — juice reutilizável (visual)

Helpers de partículas/flash, cores por tema. Sem teste unitário; validado por typecheck + smoke.

**Files:**
- Create: `src/modules/exercito-da-maruzza/systems/Fx.ts`

- [ ] **Step 1: Implementar `Fx.ts`**

```ts
// src/modules/exercito-da-maruzza/systems/Fx.ts
import Phaser from 'phaser';

/**
 * Juice reutilizável (direção de arte B): flash de tiro, faíscas de impacto,
 * estouro de papel ao dissolver obstáculo. Tudo procedural, cores via parâmetro
 * (o chamador resolve pelos tokens do tema). Cada efeito se autodestrói.
 */
export class Fx {
  constructor(private scene: Phaser.Scene) {}

  /** clarão curto na boca da "arma" da heroína */
  muzzleFlash(x: number, y: number, color: number): void {
    const f = this.scene.add.circle(x, y, 10, color, 0.9).setDepth(20);
    this.scene.tweens.add({
      targets: f, scale: 1.8, alpha: 0, duration: 130, ease: 'Quad.easeOut',
      onComplete: () => f.destroy(),
    });
  }

  /** faíscas no ponto de impacto (inimigo/boss levando dano) */
  impactSparks(x: number, y: number, color: number, n = 6): void {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const s = this.scene.add.circle(x, y, 3, color, 1).setDepth(20);
      this.scene.tweens.add({
        targets: s,
        x: x + Math.cos(a) * Phaser.Math.Between(20, 46),
        y: y + Math.sin(a) * Phaser.Math.Between(20, 46),
        alpha: 0, scale: 0.3, duration: 320, ease: 'Cubic.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  /** estouro de papel/carimbo quando um obstáculo é dissolvido */
  paperBurst(x: number, y: number, color: number, n = 10): void {
    for (let i = 0; i < n; i++) {
      const p = this.scene.add
        .rectangle(x, y, Phaser.Math.Between(4, 9), Phaser.Math.Between(4, 9), color)
        .setDepth(20)
        .setAngle(Phaser.Math.Between(0, 360));
      this.scene.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-70, 70),
        y: y + Phaser.Math.Between(-90, 30),
        angle: Phaser.Math.Between(-260, 260),
        alpha: 0, duration: Phaser.Math.Between(420, 700), ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/exercito-da-maruzza/systems/Fx.ts
git commit -m "feat(juice): Fx reutilizável (muzzle flash, faíscas, estouro de papel)"
```

---

## Task 10: `Projectiles.ts` — pool de provas (visual)

Pool de imagens de projétil viajando na profundidade (perto→horizonte) via `projection`. Puramente juice (não carrega dano). Validado por typecheck + smoke.

**Files:**
- Create: `src/modules/exercito-da-maruzza/systems/Projectiles.ts`

- [ ] **Step 1: Implementar `Projectiles.ts`**

```ts
// src/modules/exercito-da-maruzza/systems/Projectiles.ts
import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { projectileTexture } from './figures';
import { project, type ProjConfig } from './projection';

interface Shot {
  img: Phaser.GameObjects.Image;
  laneX: number;
  d: number; // profundidade atual (sobe de 0 → alvo)
  target: number; // profundidade do alvo
  alive: boolean;
}

const SPEED_D = 4200; // unidades de profundidade por segundo
const MAX = 48; // teto do pool (performance mobile)

/** Projéteis "prova" — só juice. Viajam do plano da heroína até a profundidade do alvo. */
export class Projectiles {
  private shots: Shot[] = [];
  private key: string;

  constructor(private scene: Phaser.Scene, private cfg: ProjConfig) {
    const { themes } = getServices();
    this.key = projectileTexture(scene, {
      paper: themes.colorNum('projectile.paper', 0xfef9e7),
      ink: themes.colorNum('projectile.ink', 0x475569),
      outline: themes.colorNum('outline', 0xffffff),
    });
  }

  /** dispara um projétil da heroína (laneX) rumo à profundidade `targetD` */
  fire(laneX: number, targetD: number): void {
    if (this.shots.filter((s) => s.alive).length >= MAX) return;
    const p = project(0, laneX, this.cfg);
    const img = this.scene.add
      .image(p.x, p.y - 30, this.key)
      .setDepth(18)
      .setScale(p.scale);
    this.shots.push({ img, laneX, d: 0, target: Math.max(60, targetD), alive: true });
  }

  /** avança todos os projéteis; dtMs em ms */
  update(dtMs: number): void {
    const step = SPEED_D * (dtMs / 1000);
    for (const s of this.shots) {
      if (!s.alive) continue;
      s.d += step;
      if (s.d >= s.target) {
        s.alive = false;
        s.img.destroy();
        continue;
      }
      const p = project(s.d, s.laneX, this.cfg);
      s.img.setPosition(p.x, p.y).setScale(p.scale * 0.9);
      s.img.setAlpha(1 - p.t * 0.3);
    }
    this.shots = this.shots.filter((s) => s.alive);
  }

  destroy(): void {
    for (const s of this.shots) s.img.destroy();
    this.shots = [];
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/exercito-da-maruzza/systems/Projectiles.ts
git commit -m "feat(juice): pool de projéteis (provas) viajando na profundidade"
```

---

## Task 11: `Enemy.ts` — obstáculo de burocracia (visual)

`EnemyView` envolve a textura de obstáculo + barra de HP, posicionada por `projection`. Dado (`CasoEnemy`) + estado de HP em runtime. Validado por typecheck + smoke.

**Files:**
- Create: `src/modules/exercito-da-maruzza/systems/Enemy.ts`

- [ ] **Step 1: Implementar `Enemy.ts`**

```ts
// src/modules/exercito-da-maruzza/systems/Enemy.ts
import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { obstacleTexture } from './figures';
import { project, type ProjConfig } from './projection';
import type { CasoEnemy } from '../data/CasoData';

/**
 * Obstáculo de burocracia (carimbo/pilha) com HP. NÃO é pessoa. Desce a pista
 * em perspectiva; a barra de HP encolhe conforme leva provas. Quando dissolvido,
 * o chamador (RunScene) chama `kill()` (que dispara o estouro de papel via Fx).
 */
export class Enemy {
  readonly container: Phaser.GameObjects.Container;
  hp: number;
  readonly maxHp: number;
  resolved = false; // já cruzou o plano da heroína (aplicou ou não a penalidade)
  private bar: Phaser.GameObjects.Rectangle;
  private barBg: Phaser.GameObjects.Rectangle;
  private body: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly data: CasoEnemy,
    private cfg: ProjConfig,
  ) {
    const { themes } = getServices();
    this.hp = data.hp;
    this.maxHp = data.hp;
    const key = obstacleTexture(scene, data.kind, {
      body: themes.colorNum('enemy.body', 0x7b8496),
      accent: themes.colorNum('enemy.accent', 0x9aa3b2),
      outline: themes.colorNum('outline', 0xffffff),
    });
    this.body = scene.add.image(0, 0, key).setOrigin(0.5, 0.9);
    this.barBg = scene.add.rectangle(0, 8, 44, 6, 0x000000, 0.4);
    this.bar = scene.add.rectangle(-22, 8, 44, 6, themes.colorNum('gate.bad', 0xef4444)).setOrigin(0, 0.5);
    const label = scene.add
      .text(0, -2, data.label, { fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: themes.color('outline', '#ffffff') })
      .setOrigin(0.5, 2.4);
    this.container = scene.add.container(0, 0, [this.body, this.barBg, this.bar, label]).setDepth(6);
  }

  /** profundidade atual = dist do dado - quanto a pista já andou */
  get depth(): number {
    return this.data.dist;
  }

  /** reposiciona pela profundidade `d` (dist - traveled) */
  place(d: number): void {
    const p = project(d, this.data.lane, this.cfg);
    this.container.setPosition(p.x, p.y).setScale(p.scale);
    this.container.setDepth(6 + (1 - p.t)); // mais perto = mais na frente
  }

  damage(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg);
    this.bar.scaleX = this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/exercito-da-maruzza/systems/Enemy.ts
git commit -m "feat(combat): EnemyView (obstáculo de burocracia com HP, em perspectiva)"
```

---

## Task 12: `RunScene` — integra projeção + tiro + inimigos + boss (visual)

A peça grande. Reescreve a `RunScene` mantendo a estrutura atual (track/gates/wall/crowd/villain/onboarding) e plugando: projeção pseudo-3D em tudo, auto-fire da Maruzza (dps-tick + projéteis-juice), inimigos com HP/penalidade, portões de dois eixos (estilo + weapon delta) e boss com dreno de HP. Validado por typecheck + smoke.

**Files:**
- Modify: `src/modules/exercito-da-maruzza/scenes/RunScene.ts` (substituição integral)

- [ ] **Step 1: Substituir `RunScene.ts` pelo conteúdo abaixo**

```ts
// src/modules/exercito-da-maruzza/scenes/RunScene.ts
import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import type { ThemeManager } from '../../../core/services/ThemeManager';
import type { RunResult } from '../../../core/types';
import { getCaso, firstCasoId } from '../data/casos';
import type { CasoData, GateOp, GatePair } from '../data/CasoData';
import { Track } from '../systems/track';
import { applyOp, isGoodOp, opSign, isWeaponGate } from '../systems/operations';
import { pickSide, gateOpFor } from '../systems/gates';
import { resolveWall } from '../systems/wall';
import { Crowd } from '../systems/Crowd';
import { Scenery } from '../systems/Scenery';
import { Villain } from '../systems/Villain';
import { buildShareText } from '../systems/share';
import { effectiveSpeed, isCalmMode, CALM_SPEED_FACTOR } from '../systems/settings';
import { shouldShowOnboarding, markOnboarded, showOnboarding } from '../systems/onboarding';
import { project, type ProjConfig } from '../systems/projection';
import { dps, fireInterval, applyDamage, enemyPenalty, FIRE_RANGE } from '../systems/combat';
import { applyWeapon, tierLabel } from '../data/weapons';
import { Projectiles } from '../systems/Projectiles';
import { Enemy } from '../systems/Enemy';
import { Fx } from '../systems/Fx';

interface GateView {
  pair: GatePair;
  resolved: boolean;
  left: Phaser.GameObjects.Container;
  right: Phaser.GameObjects.Container;
}

const GAP_BEFORE_WALL = 700;
const WALL_H = 80;

export class RunScene extends Phaser.Scene {
  private caso!: CasoData;
  private track!: Track;
  private crowd!: Crowd;
  private scenery!: Scenery;
  private villain!: Villain;
  private projectiles!: Projectiles;
  private fx!: Fx;
  private cfg!: ProjConfig;
  private gateViews: GateView[] = [];
  private enemies: Enemy[] = [];
  private wall!: Phaser.GameObjects.Container;
  private wallRect!: Phaser.GameObjects.Rectangle;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private wallDist = 0;
  private bossHp = 0;
  private bossHpMax = 0;
  private countText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private tier = 0;
  private fireAcc = 0;
  private calmFactor = 1; // <1 no modo calmo: desacelera tiro junto com a pista
  private targetLaneX = 0; // -1..1
  private heroLaneX = 0;
  private ended = false;
  private running = true;

  constructor() {
    super('RunScene');
  }

  /** lane em px (centro) → laneX normalizado [-1,1] a partir do x do ponteiro */
  private toLaneX(px: number): number {
    const half = this.cfg.halfLaneNear;
    return Phaser.Math.Clamp((px - this.scale.width / 2) / half, -1, 1);
  }

  create(data: { casoId?: string }): void {
    const { themes } = getServices();
    const caso = getCaso(data?.casoId ?? firstCasoId());
    if (!caso) throw new Error(`Caso "${data?.casoId}" não encontrado`);
    this.caso = caso;
    const calm = isCalmMode(getServices().persistence);
    this.track = new Track(effectiveSpeed(caso.speed, calm));
    this.gateViews = [];
    this.enemies = [];
    this.ended = false;
    this.running = true;
    this.tier = 0;
    this.fireAcc = 0;
    this.calmFactor = calm ? CALM_SPEED_FACTOR : 1;

    const W = this.scale.width;
    const H = this.scale.height;
    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));
    this.scenery = new Scenery(this, W, H);

    // config de projeção pseudo-3D (perspectiva suave p/ legibilidade)
    this.cfg = {
      width: W,
      horizonY: H * 0.34,
      heroY: H * 0.82,
      nearScale: 1,
      farScale: 0.3,
      halfLaneNear: W * 0.38,
      halfLaneFar: W * 0.06,
      dHorizon: GAP_BEFORE_WALL + this.maxGateDist() + 200,
    };
    this.targetLaneX = 0;
    this.heroLaneX = 0;

    this.drawRoad();
    this.fx = new Fx(this);
    this.projectiles = new Projectiles(this, this.cfg);

    // multidão (séquito atrás da heroína) — no plano de perto
    const heroPos = project(0, 0, this.cfg);
    this.crowd = new Crowd(
      this,
      heroPos.x,
      heroPos.y,
      caso.start,
      themes.colorNum('accent.primary', 0x22c55e),
      themes.colorNum('outline', 0xffffff),
    );

    // portões
    for (const pair of caso.gates) {
      const left = this.makeGate(pair.left, -0.5, themes);
      const right = this.makeGate(pair.right, 0.5, themes);
      this.gateViews.push({ pair, resolved: false, left, right });
    }

    // inimigos (obstáculos da burocracia)
    for (const e of caso.enemies ?? []) {
      this.enemies.push(new Enemy(this, e, this.cfg));
    }

    // muro / boss
    this.wallDist = this.maxGateDist() + GAP_BEFORE_WALL;
    this.bossHpMax = caso.bossHp ?? 0;
    this.bossHp = this.bossHpMax;
    const laneW = this.cfg.halfLaneNear * 2;
    this.wallRect = this.add
      .rectangle(0, 0, laneW, WALL_H, themes.colorNum('wall', 0x475569))
      .setStrokeStyle(4, themes.colorNum('outline', 0xffffff), 0.3);
    const wallTop = this.add.rectangle(0, -WALL_H / 2 + 6, laneW, 14, themes.colorNum('wall.top', 0x64748b));
    const wallTxt = this.add
      .text(0, 6, `${themes.text('wall.label', 'MURO')}\n${caso.wall}`, { fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: themes.color('outline', '#ffffff'), align: 'center' })
      .setOrigin(0.5);
    // barra de HP do boss (só visível em caso de combate)
    const barBg = this.add.rectangle(0, -WALL_H / 2 - 16, laneW * 0.7, 10, 0x000000, 0.4);
    this.bossBar = this.add
      .rectangle(-(laneW * 0.7) / 2, -WALL_H / 2 - 16, laneW * 0.7, 10, themes.colorNum('gate.bad', 0xef4444))
      .setOrigin(0, 0.5);
    if (this.bossHpMax <= 0) {
      barBg.setVisible(false);
      this.bossBar.setVisible(false);
    }
    this.wall = this.add.container(W / 2, -300, [this.wallRect, wallTop, wallTxt, barBg, this.bossBar]);
    this.villain = new Villain(this, W / 2, -300 - WALL_H / 2);

    // HUD
    this.add.rectangle(W / 2, 0, W, H * 0.17, themes.colorNum('bg.base', 0x0b1020), 0.92).setOrigin(0.5, 0).setDepth(9);
    this.add.rectangle(W / 2, H * 0.17, W, 2, themes.colorNum('outline', 0xffffff), 0.15).setOrigin(0.5, 0.5).setDepth(9);
    this.add.text(W / 2, H * 0.02, caso.name, { fontFamily: 'Arial', fontSize: '22px', color: themes.color('text', '#e2e8f0') }).setOrigin(0.5, 0).setDepth(10);
    this.countText = this.add
      .text(W / 2, H * 0.08, `${caso.start}`, { fontFamily: 'Arial', fontSize: '72px', fontStyle: 'bold', color: themes.color('accent.primary', '#22c55e') })
      .setOrigin(0.5)
      .setDepth(10);
    this.add.text(W / 2, H * 0.145, themes.text('card.metric', 'PROVAS'), { fontFamily: 'Arial', fontSize: '22px', color: themes.color('text.muted', '#94a3b8') }).setOrigin(0.5).setDepth(10);
    // indicador de ARMA (eixo qualidade)
    this.weaponText = this.add
      .text(W * 0.97, H * 0.055, `${themes.text('hud.weapon', 'ARMA')}\n${tierLabel(this.tier)}`, { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: themes.color('leader.accent', '#e8b923'), align: 'right' })
      .setOrigin(1, 0)
      .setDepth(10);

    // input: arrasta a heroína (lane)
    const { audio } = getServices();
    const steer = (p: Phaser.Input.Pointer): void => {
      if (!this.running) return;
      this.targetLaneX = this.toLaneX(p.x);
    };
    this.input.on('pointermove', steer);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      audio.startMusic();
      steer(p);
    });

    const { persistence } = getServices();
    if (shouldShowOnboarding(persistence)) {
      this.running = false;
      showOnboarding(this, () => {
        markOnboarded(persistence);
        this.running = true;
        audio.unlock();
        audio.startMusic();
      });
    }
  }

  private maxGateDist(): number {
    return this.caso.gates.length ? Math.max(...this.caso.gates.map((g) => g.dist)) : 0;
  }

  /** pista em perspectiva (trapézio estático) — vende o pseudo-3D sob os elementos projetados */
  private drawRoad(): void {
    const { themes } = getServices();
    const g = this.add.graphics().setDepth(0);
    const cx = this.cfg.width / 2;
    const yNear = this.cfg.heroY + 80;
    const yFar = this.cfg.horizonY;
    const wNear = this.cfg.halfLaneNear * 1.25;
    const wFar = this.cfg.halfLaneFar * 1.6;
    g.fillStyle(themes.colorNum('ground', 0x0d1730), 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(cx - wFar, yFar),
        new Phaser.Math.Vector2(cx + wFar, yFar),
        new Phaser.Math.Vector2(cx + wNear, yNear),
        new Phaser.Math.Vector2(cx - wNear, yNear),
      ],
      true,
    );
    g.lineStyle(3, themes.colorNum('outline', 0xffffff), 0.12);
    g.beginPath();
    g.moveTo(cx - wFar, yFar);
    g.lineTo(cx - wNear, yNear);
    g.moveTo(cx + wFar, yFar);
    g.lineTo(cx + wNear, yNear);
    g.strokePath();
  }

  /** portão num lado (laneX) — estilo difere se for de PROVAS (verde/vermelho) ou ARMA (dourado) */
  private makeGate(op: GateOp, laneX: number, themes: ThemeManager): Phaser.GameObjects.Container {
    const weaponGate = isWeaponGate(op);
    const color = weaponGate
      ? themes.colorNum('leader.accent', 0xe8b923)
      : isGoodOp(op)
        ? themes.colorNum('gate.good', 0x22c55e)
        : themes.colorNum('gate.bad', 0xef4444);
    const w = this.cfg.halfLaneNear * 0.8;
    const rect = this.add.rectangle(0, 0, w, 70, color, 0.85);
    const ink = themes.color('outline', '#ffffff');
    const head = weaponGate ? `ARMA ${op.weapon! > 0 ? '↑' : '↓'}` : `${opSign(op)}${op.value}`;
    const sign = this.add.text(0, -8, head, { fontFamily: 'Arial', fontSize: '32px', fontStyle: 'bold', color: ink }).setOrigin(0.5);
    const label = this.add.text(0, 26, op.label, { fontFamily: 'Arial', fontSize: '15px', color: ink }).setOrigin(0.5);
    const c = this.add.container(0, -300, [rect, sign, label]);
    c.setData('laneX', laneX);
    return c;
  }

  override update(_time: number, delta: number): void {
    if (this.ended || !this.running) return;
    this.track.update(delta);
    this.scenery.update(this.track.traveled);
    this.projectiles.update(delta);

    // a heroína (e o séquito) seguem o ponteiro suavemente em lane
    this.heroLaneX = Phaser.Math.Linear(this.heroLaneX, this.targetLaneX, 0.15);
    const heroPos = project(0, this.heroLaneX, this.cfg);
    this.crowd.setX(heroPos.x);

    // portões: posiciona por profundidade + resolve ao cruzar o plano
    for (const gv of this.gateViews) {
      const d = gv.pair.dist - this.track.traveled;
      this.placeGateSide(gv.left, d);
      this.placeGateSide(gv.right, d);
      if (!gv.resolved && d <= 0) {
        gv.resolved = true;
        const side = pickSide(this.heroLaneX, 0); // centro = 0 em laneX
        const op = gateOpFor(gv.pair, side);
        this.applyGate(op);
        const chosen = side === 'left' ? gv.left : gv.right;
        const other = side === 'left' ? gv.right : gv.left;
        chosen.setAlpha(0.3);
        other.setAlpha(0.12);
        this.tweens.add({ targets: chosen, scaleX: chosen.scaleX * 1.15, scaleY: chosen.scaleY * 1.15, duration: 90, yoyo: true });
      }
    }

    // inimigos: posiciona, leva fogo do alvo da frente, e aplica penalidade ao cruzar
    this.updateCombat(delta);

    // muro/boss: posiciona e resolve
    const wallD = this.wallDist - this.track.traveled;
    const wp = project(Math.max(0, wallD), 0, this.cfg);
    this.wall.setPosition(wp.x, wp.y).setScale(wp.scale);
    this.villain.setY(wp.y - (WALL_H / 2) * wp.scale);
    this.villain.image.setScale(wp.scale);
    if (wallD <= 0) {
      this.end(this.bossHpMax > 0 ? this.bossHp <= 0 : resolveWall(this.crowd.count, this.caso.wall));
    }
  }

  private placeGateSide(c: Phaser.GameObjects.Container, d: number): void {
    const laneX = (c.getData('laneX') as number) ?? 0;
    const p = project(Math.max(0, d), laneX, this.cfg);
    c.setPosition(p.x, p.y).setScale(p.scale);
  }

  private applyGate(op: GateOp): void {
    const { audio, themes } = getServices();
    if (isWeaponGate(op)) {
      this.tier = applyWeapon(this.tier, op.weapon!);
      this.weaponText.setText(`${themes.text('hud.weapon', 'ARMA')}\n${tierLabel(this.tier)}`);
      audio.play('good');
      this.tweens.add({ targets: this.weaponText, scale: 1.3, duration: 130, yoyo: true, ease: 'Back.easeOut' });
    } else {
      const good = isGoodOp(op);
      this.crowd.setCount(applyOp(this.crowd.count, op));
      this.countText.setText(`${this.crowd.count}`);
      this.popCount(good);
      audio.play(good ? 'good' : 'bad');
    }
  }

  /** auto-fire + dano por tick no alvo da frente + penalidade de inimigo */
  private updateCombat(delta: number): void {
    const { themes } = getServices();
    const provas = this.crowd.count;

    // posiciona e limpa inimigos
    let target: Enemy | null = null;
    let targetD = Number.POSITIVE_INFINITY;
    for (const e of this.enemies) {
      if (e.resolved) continue;
      const d = e.depth - this.track.traveled;
      e.place(Math.max(0, d));
      if (d <= 0) {
        // chegou vivo? subtrai provas ∝ HP restante
        e.resolved = true;
        if (!e.dead) {
          const pen = enemyPenalty(e.hp);
          if (pen > 0) {
            this.crowd.setCount(Math.max(0, provas - pen));
            this.countText.setText(`${this.crowd.count}`);
            this.popCount(false);
            getServices().audio.play('bad');
          }
        }
        this.fx.paperBurst(e.container.x, e.container.y, themes.colorNum('enemy.accent', 0x9aa3b2));
        e.destroy();
        continue;
      }
      // alvo de fogo = inimigo vivo mais à frente dentro do alcance
      if (!e.dead && d < targetD && d <= FIRE_RANGE) {
        target = e;
        targetD = d;
      }
    }
    this.enemies = this.enemies.filter((e) => !e.resolved);

    // boss entra como alvo quando não há inimigo à frente e está em alcance
    const wallD = this.wallDist - this.track.traveled;
    const bossInRange = this.bossHpMax > 0 && wallD > 0 && wallD <= FIRE_RANGE;

    // dano por tick determinístico — modo calmo desacelera o tiro junto com a pista (coerência §6)
    const cdt = delta * this.calmFactor;
    const dmg = dps(provas, this.tier) * (cdt / 1000);
    if (target) {
      target.damage(dmg);
      this.fx.impactSparks(target.container.x, target.container.y, themes.colorNum('accent.primary', 0x22c55e), 3);
      if (target.dead) {
        target.resolved = true;
        this.fx.paperBurst(target.container.x, target.container.y, themes.colorNum('enemy.accent', 0x9aa3b2));
        target.destroy();
        this.enemies = this.enemies.filter((e) => !e.resolved);
      }
    } else if (bossInRange) {
      this.bossHp = applyDamage(this.bossHp, dmg);
      this.bossBar.scaleX = this.bossHpMax > 0 ? this.bossHp / this.bossHpMax : 0;
      const wp = project(Math.max(0, wallD), 0, this.cfg);
      this.fx.impactSparks(wp.x, wp.y, themes.colorNum('accent.primary', 0x22c55e), 3);
    }

    // cadência visual de tiro (projétil-juice) rumo ao alvo
    this.fireAcc += cdt;
    const interval = fireInterval(provas, this.tier);
    if (this.fireAcc >= interval && (target || bossInRange)) {
      this.fireAcc = 0;
      const aimD = target ? targetD : Math.max(0, wallD);
      this.projectiles.fire(this.heroLaneX, aimD);
      const hp = project(0, this.heroLaneX, this.cfg);
      this.fx.muzzleFlash(hp.x, hp.y - 36, themes.colorNum('projectile.paper', 0xfef9e7));
    }
  }

  private popCount(good: boolean): void {
    const { themes } = getServices();
    const baseColor = themes.color('accent.primary', '#22c55e');
    this.countText.setColor(good ? themes.color('gate.good', '#22c55e') : themes.color('gate.bad', '#ef4444'));
    this.tweens.add({
      targets: this.countText, scale: good ? 1.3 : 0.8, duration: 120, yoyo: true, ease: 'Back.easeOut',
      onComplete: () => this.countText.setColor(baseColor),
    });
  }

  private end(won: boolean): void {
    this.ended = true;
    const { themes, audio } = getServices();
    this.cameras.main.shake(won ? 380 : 260, won ? 0.012 : 0.008);
    this.villain.react(won);
    this.projectiles.destroy();

    if (won) {
      audio.play('break');
      this.breakWall(themes.colorNum('wall', 0x475569));
      this.tweens.add({ targets: this.crowd.container, y: this.crowd.container.y - 80, duration: 350, ease: 'Quad.easeOut' });
      this.time.delayedCall(160, () => audio.play('win'));
    } else {
      audio.play('lose');
      this.tweens.add({ targets: this.wall, scaleY: this.wall.scaleY * 1.12, duration: 90, yoyo: true, repeat: 2 });
      this.tweens.add({ targets: this.crowd.container, y: this.crowd.container.y + 36, duration: 220, yoyo: true, ease: 'Quad.easeOut' });
    }

    const result: RunResult = {
      won, score: this.crowd.count, start: this.caso.start, wall: this.caso.wall,
      casoId: this.caso.id, casoName: this.caso.name, shareText: '',
    };
    result.shareText = buildShareText(result, themes.text('share.emoji', '👵⚖️'));
    this.time.delayedCall(900, () => this.scene.start('ResultScene', { result }));
  }

  private breakWall(color: number): void {
    const { x, y } = this.wall;
    const laneW = this.cfg.halfLaneNear * 2 * this.wall.scaleX;
    this.wall.setVisible(false);
    const pieces = 9;
    for (let i = 0; i < pieces; i++) {
      const px = x - laneW / 2 + (laneW / pieces) * (i + 0.5);
      const frag = this.add.rectangle(px, y, laneW / pieces - 4, 64 * this.wall.scaleY, color).setDepth(15);
      this.tweens.add({
        targets: frag, x: px + Phaser.Math.Between(-180, 180), y: y - Phaser.Math.Between(120, 360),
        angle: Phaser.Math.Between(-220, 220), alpha: 0, duration: 700, ease: 'Cubic.easeOut',
        onComplete: () => frag.destroy(),
      });
    }
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS. (Se acusar `pickSide(this.heroLaneX, 0)` — confere que `pickSide(leaderX, centerX)` devolve `'left'` quando `leaderX < centerX`; com centro 0, laneX negativo → 'left'. ✓)

- [ ] **Step 3: Verificar a suíte de testes (nada quebrou nos sistemas puros)**

Run: `npm test`
Expected: PASS (todos os testes — RunScene não tem teste unitário, mas os sistemas que ela usa estão cobertos).

- [ ] **Step 4: Commit**

```bash
git add src/modules/exercito-da-maruzza/scenes/RunScene.ts
git commit -m "feat(run): pseudo-3D + auto-fire da Maruzza + inimigos + boss com HP"
```

---

## Task 13: Estender o smoke headless (exercita o combate)

Garante que a `RunScene` nova roda sem erro de runtime no BPC (que agora tem inimigos/boss) e que o boss resolve. Reutiliza a estrutura atual do smoke.

**Files:**
- Modify: `scripts/smoke.mjs:73-78` (o trecho que entra na RunScene)

- [ ] **Step 1: Aumentar o tempo de run e validar progresso de combate**

Substituir o bloco (linhas ~73-78 do `scripts/smoke.mjs`):
```js
  // entra na RunScene e deixa rodar (gera erro de runtime se a cena quebrar)
  await page.evaluate(() => window.__MTA_GAME__.scene.start('RunScene', { casoId: 'bpc' }));
  await sleep(2500);
  const inRun = await page.evaluate(() => window.__MTA_GAME__.scene.getScenes(true).map((s) => s.scene.key));
  if (!inRun.includes('RunScene')) throw new Error(`RunScene não ativa (ativas: ${inRun.join(', ')})`);
  console.log(`RunScene rodando · cenas ativas: ${inRun.join(', ')}`);
```
por:
```js
  // entra na RunScene (BPC tem inimigos + boss com HP) e deixa rodar até resolver,
  // simulando toque pra dispensar o onboarding/iniciar áudio. Gera erro se a cena quebrar.
  await page.evaluate(() => window.__MTA_GAME__.scene.start('RunScene', { casoId: 'bpc' }));
  await sleep(800);
  await page.mouse.click(240, 600); // dispensa onboarding na 1ª vez / inicia
  await sleep(2500);
  const inRun = await page.evaluate(() => window.__MTA_GAME__.scene.getScenes(true).map((s) => s.scene.key));
  // a run dura ~12s; aqui ela ainda deve estar ativa (ou já em ResultScene), sem erro de runtime
  if (!inRun.includes('RunScene') && !inRun.includes('ResultScene')) {
    throw new Error(`nem RunScene nem ResultScene ativas (ativas: ${inRun.join(', ')})`);
  }
  console.log(`RunScene de combate rodando · cenas ativas: ${inRun.join(', ')}`);
```

- [ ] **Step 2: Rodar o smoke**

Run: `npm run build && npm run smoke`
Expected: PASS — `✅ smoke OK`, sem erros de runtime; screenshot em `/tmp/mta-smoke.png`.

- [ ] **Step 3: Inspecionar o screenshot** (sanity visual do pseudo-3D + tiro)

Run: `open /tmp/mta-smoke.png` (ou abrir o arquivo)
Expected: pista em perspectiva, Maruzza/séquito na frente, HUD com PROVAS + ARMA.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke.mjs
git commit -m "test(smoke): exercita a run de combate (inimigos + boss) no BPC"
```

---

## Task 14: Estender a guarda OAB pra copy nova

Garante que a copy nova player-facing (HUD de arma + labels da escada de armas) também é travada contra promessa jurídica.

**Files:**
- Modify: `src/modules/exercito-da-maruzza/data/__tests__/copy-oab.test.ts:18`

- [ ] **Step 1: Incluir `hud.weapon` no conjunto OAB**

Substituir a linha 18 (`const OAB_KEYS = [...]`) por:
```ts
const OAB_KEYS = ['result.win', 'result.lose', 'card.brand', 'card.subtitle', 'card.metric', 'card.viral', 'card.footnote', 'hud.weapon'];
```

- [ ] **Step 2: Travar também os labels da escada de armas** (vivem em código, não no tema)

Adicionar o import junto dos outros no topo de `copy-oab.test.ts`:
```ts
import { WEAPON_LADDER } from '../weapons';
```
e acrescentar ao fim do arquivo:
```ts
describe('labels de arma OAB-safe (qualidade da prova, não promessa)', () => {
  for (const tier of WEAPON_LADDER) {
    it(`"${tier.label}" não promete/insinua resultado jurídico`, () => {
      expect(FORBIDDEN.test(tier.label), `arma "${tier.label}" soa como veredito`).toBe(false);
    });
  }
});
```

> **Decisão consciente (revisão adversarial):** rótulos de inimigo/portão ("Exigência", "Indeferido", "Laudo médico"…) são **vocabulário do obstáculo/prova**, não promessa de vitória — "Indeferido" (recusa) é o OPOSTO de prometer benefício. A guarda OAB mira o enquadramento de **vitória/resultado/card** (já coberto) + os labels de arma. **Não** varremos labels de inimigo: a regex `deferid` daria falso-positivo em "in**deferid**o", que é correto no jogo.

- [ ] **Step 3: Rodar o teste**

Run: `npx vitest run src/modules/exercito-da-maruzza/data/__tests__/copy-oab.test.ts`
Expected: PASS — `hud.weapon`="ARMA" e os labels Documento/Laudo/Dossiê não batem na regex; parity intacto.

- [ ] **Step 4: Commit**

```bash
git add src/modules/exercito-da-maruzza/data/__tests__/copy-oab.test.ts
git commit -m "test(oab): guarda anti-veredito cobre hud.weapon + labels de arma"
```

---

## Task 15: Verificação final + docs

Roda o gate de pronto completo e registra o redesign no roadmap/STATUS.

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Gate de pronto completo**

Run: `npm run typecheck && npm test && npm run build && npm run smoke`
Expected: tudo verde. Se algo falhar, corrigir antes de prosseguir (não marcar a fase como done com vermelho).

- [ ] **Step 2: Atualizar `docs/roadmap.md`** — adicionar ao fim da §4 (depois da Fase 5):

```markdown
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
```

- [ ] **Step 3: Atualizar `docs/STATUS.md`** — acrescentar na lista de progresso:

```markdown
- [x] **Redesign Army Shooter 2.5D (MVP)** ✅ pseudo-3D (`projection`), Maruzza atiradora, `combat` dps-tick,
      inimigos (`Enemy`), portões de dois eixos (`GateOp.weapon?`), boss com HP (`resolveBoss`), juice (`Fx`),
      projéteis (`Projectiles`). BPC = caso vitrine. **Verificado:** typecheck + testes + build + smoke (combate).
      Campanha (Fase 6) e meta-progressão (Fase 7) ficam pro futuro.
```

- [ ] **Step 4: Commit**

```bash
git add docs/roadmap.md docs/STATUS.md
git commit -m "docs: registra redesign army shooter 2.5D + fases 6/7 no roadmap"
```

- [ ] **Step 5: Integrar a branch** (decidir com o usuário: merge na main / PR). Sugerido:

```bash
git checkout main && git merge --no-ff feat/army-shooter-2.5d -m "Merge: redesign army shooter 2.5D (MVP)"
```

---

## Notas de implementação

- **Por que `weapon?` opcional e não union discriminado (como no spec):** zero migração dos 5 JSONs, `applyOp`/`isGoodOp`/`opSign` intactos, 65 testes verdes. Mesmo design de dois eixos, menos risco. Decisão de plano.
- **Dano por tick, projétil só juice:** mantém `combat.ts` puro/testável e elimina colisão frágil. O projétil viaja na profundidade só pra dar feedback; quem decide o dano é `dps × dt` no alvo da frente.
- **Auto-mira (acessibilidade):** o alvo é o inimigo vivo mais à frente em `FIRE_RANGE`; sem inimigo, o boss em alcance. Steering serve só pra portões. Mira por lane = roadmap (modo desafio).
- **Janela do boss = aproximação:** o boss leva fogo enquanto está em `FIRE_RANGE` (≈ `windowMsFor(speed)`); o invariante de `balance.ts` usa exatamente essa janela. Mais provas/arma → boss morre antes de chegar.
- **Casos legados (sem `bossHp`):** continuam no modo contagem (`resolveWall`) e sem inimigos — totalmente funcionais. Enriquecer os outros 4 casos com inimigos/weapon gates é tarefa de **dados** trivial pós-MVP (BPC é o exemplo a copiar), guardada pelo mesmo invariante.
- **Acessibilidade não regride:** perspectiva suave, alvos grandes ao chegar, modo calmo escala a velocidade (e portanto a janela/cadência) junto.

## Revisão adversarial (workflow 4 lentes) — achados aplicados / decisões

- **[blocker corrigido]** `Phaser.Geom.Point` **não existe** no Phaser 4.1 (typecheck quebraria) → estrada usa `Phaser.Math.Vector2` (que é o tipo que `fillPoints` espera).
- **[corrigido]** Modo calmo escala a **cadência de tiro** junto (via `calmFactor`) — antes só a pista desacelerava (coerência §6).
- **[corrigido]** OAB cobre `hud.weapon` + labels da escada de armas; labels de inimigo ficam de fora por serem vocabulário de obstáculo (ver nota na Task 14).
- **[YAGNI — removido]** `shotDamage` e `tierArt`/campo `art` saíram: sem consumidor (dano é por tick; arte do projétil vem de token de tema).
- **Resolvedor de arte (§5.4):** satisfeito pelo padrão atual de `figures.ts` (arte por conceito + tokens). Dispatcher único por chave + asset por-skin = item C (ilustração) do roadmap. Não é gap; é YAGNI.
- **Anti-daltonismo:** redundância não-cromática = sinal `+ × − ÷` (eixo provas) + texto `ARMA ↑/↓` (eixo qualidade), já ensinados no onboarding. Cor é reforço.
- **Maruzza atiradora:** MVP reusa a arte de líder atual; pose/arma ilustrada = polish do C.
- **Casos legados:** o teste de contagem já existente em `casos.test.ts` prova que os 4 passam o invariante; a Task 6 só soma o eixo boss (que delega à contagem pra eles).
- **2 kinds de inimigo** (`carimbo`/`pilha`) no MVP; "perícia remarcada" entra como `label`. Arquétipo de portão "ganância" (weapon −1) é suportado/testado mas não está no caso vitrine — entra na enriquecida pós-MVP.
- **Smoke de combate:** checagem de **não-crash** da run real (pseudo-3D + tiro + inimigos + boss); asserts comportamentais finos = futuro.
- **Janela do boss usa `caso.speed` bruto** no invariante: como modo calmo escala pista *e* tiro pelo mesmo fator, a vencibilidade é invariante ao modo calmo (aproximação consciente — dps tratado como ~constante na janela).
