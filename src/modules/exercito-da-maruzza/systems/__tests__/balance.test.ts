import { describe, it, expect } from 'vitest';
import { simulateRun, isWinnable, isLosable } from '../balance';
import type { CasoData } from '../../data/CasoData';

const oneGate: CasoData = {
  id: 't1',
  name: 't1',
  start: 2,
  speed: 300,
  wall: 10,
  gates: [{ dist: 1, left: { op: 'mul', value: 3, label: 'a' }, right: { op: 'sub', value: 1, label: 'b' } }],
};

describe('simulateRun', () => {
  it('best escolhe o maior resultado por portão', () => {
    expect(simulateRun(oneGate, 'best')).toBe(6); // max(2*3, 2-1)
  });

  it('worst escolhe o menor resultado por portão', () => {
    expect(simulateRun(oneGate, 'worst')).toBe(1); // min(6, 1)
  });

  it('encadeia portões na ordem de distância', () => {
    const caso: CasoData = {
      ...oneGate,
      gates: [
        { dist: 100, left: { op: 'add', value: 4, label: '' }, right: { op: 'sub', value: 1, label: '' } },
        { dist: 50, left: { op: 'mul', value: 2, label: '' }, right: { op: 'div', value: 2, label: '' } },
      ],
    };
    // ordenado por dist: dist50 primeiro (best: 2*2=4), depois dist100 (best: 4+4=8)
    expect(simulateRun(caso, 'best')).toBe(8);
    // worst: dist50 -> 2/2=1, dist100 -> 1-1=0
    expect(simulateRun(caso, 'worst')).toBe(0);
  });

  it('best nunca é menor que worst', () => {
    expect(simulateRun(oneGate, 'best')).toBeGreaterThanOrEqual(simulateRun(oneGate, 'worst'));
  });
});

describe('invariantes de design', () => {
  const balanceado: CasoData = {
    id: 'bal',
    name: 'bal',
    start: 1,
    speed: 300,
    wall: 12,
    gates: [
      { dist: 520, left: { op: 'mul', value: 3, label: '' }, right: { op: 'sub', value: 1, label: '' } },
      { dist: 1040, left: { op: 'add', value: 9, label: '' }, right: { op: 'div', value: 2, label: '' } },
    ],
  };

  it('caminho ótimo vence (>= muro) e caminho péssimo perde (< muro)', () => {
    expect(simulateRun(balanceado, 'best')).toBe(12); // (1*3=3) -> (3+9=12) >= 12
    expect(simulateRun(balanceado, 'worst')).toBe(0); // (1-1=0) -> (0/2=0) < 12
    expect(isWinnable(balanceado)).toBe(true);
    expect(isLosable(balanceado)).toBe(true);
  });
});

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
