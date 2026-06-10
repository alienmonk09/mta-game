import { describe, it, expect } from 'vitest';
import { pickSide, gateOpFor } from '../gates';
import type { GatePair } from '../../data/CasoData';

const gate: GatePair = {
  dist: 100,
  left: { op: 'mul', value: 2, label: 'L' },
  right: { op: 'sub', value: 3, label: 'R' },
};

describe('pickSide', () => {
  it('x à esquerda do centro -> left', () => {
    expect(pickSide(100, 360)).toBe('left');
  });
  it('x à direita do centro -> right', () => {
    expect(pickSide(500, 360)).toBe('right');
  });
});

describe('gateOpFor', () => {
  it('retorna a op do lado escolhido', () => {
    expect(gateOpFor(gate, 'left').label).toBe('L');
    expect(gateOpFor(gate, 'right').label).toBe('R');
  });
});
