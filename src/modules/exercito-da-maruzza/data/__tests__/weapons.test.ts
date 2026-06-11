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
