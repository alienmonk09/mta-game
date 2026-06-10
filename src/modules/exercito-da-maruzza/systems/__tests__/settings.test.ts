import { describe, it, expect } from 'vitest';
import { effectiveSpeed, CALM_SPEED_FACTOR } from '../settings';

describe('effectiveSpeed', () => {
  it('mantém a velocidade quando calm=false', () => {
    expect(effectiveSpeed(300, false)).toBe(300);
  });

  it('reduz por CALM_SPEED_FACTOR quando calm=true', () => {
    expect(effectiveSpeed(300, true)).toBe(300 * CALM_SPEED_FACTOR);
    expect(effectiveSpeed(300, true)).toBe(180);
  });

  it('0 continua 0 em ambos os modos', () => {
    expect(effectiveSpeed(0, false)).toBe(0);
    expect(effectiveSpeed(0, true)).toBe(0);
  });

  it('modo calmo é sempre mais lento que o normal (base > 0)', () => {
    expect(effectiveSpeed(500, true)).toBeLessThan(effectiveSpeed(500, false));
  });
});
