import { describe, it, expect } from 'vitest';
import { Track } from '../track';

describe('Track', () => {
  it('acumula distância por velocidade e tempo', () => {
    const t = new Track(300);
    t.update(1000); // 1s
    expect(t.traveled).toBe(300);
    t.update(500); // +0.5s
    expect(t.traveled).toBe(450);
  });

  it('screenY: entidade longe fica acima da multidão; ao chegar, na linha', () => {
    const t = new Track(100);
    const crowdY = 800;
    // ainda não andou: entidade a 200px está 200px acima da linha
    expect(t.screenY(200, crowdY)).toBe(600);
    t.update(2000); // andou 200px
    expect(t.screenY(200, crowdY)).toBe(800); // chegou na linha
  });

  it('passed vira true quando traveled alcança a dist', () => {
    const t = new Track(100);
    expect(t.passed(150)).toBe(false);
    t.update(2000); // 200px
    expect(t.passed(150)).toBe(true);
  });
});
