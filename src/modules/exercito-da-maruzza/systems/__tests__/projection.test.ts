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
