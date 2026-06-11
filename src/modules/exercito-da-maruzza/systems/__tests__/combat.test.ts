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
