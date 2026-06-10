import { describe, it, expect } from 'vitest';
import { allCasoIds, getCaso } from '../casos';
import { isWinnable, isLosable, simulateRun } from '../../systems/balance';
import type { OpKind } from '../CasoData';

const OPS: OpKind[] = ['mul', 'add', 'div', 'sub'];

describe('casos registrados', () => {
  it('existe pelo menos um caso', () => {
    expect(allCasoIds().length).toBeGreaterThan(0);
  });

  for (const id of allCasoIds()) {
    const caso = getCaso(id)!;

    describe(`caso "${id}"`, () => {
      it('tem metadados válidos', () => {
        expect(caso.id).toBe(id);
        expect(caso.name.trim().length).toBeGreaterThan(0);
        expect(Number.isInteger(caso.start)).toBe(true);
        expect(caso.start).toBeGreaterThanOrEqual(1);
        expect(caso.speed).toBeGreaterThan(0);
        expect(caso.wall).toBeGreaterThan(0);
        expect(caso.gates.length).toBeGreaterThanOrEqual(1);
      });

      it('portões com distância crescente e operações válidas', () => {
        let prev = -1;
        for (const g of caso.gates) {
          expect(g.dist).toBeGreaterThan(prev);
          prev = g.dist;
          for (const side of [g.left, g.right]) {
            expect(OPS).toContain(side.op);
            expect(side.value).toBeGreaterThan(0);
            expect(side.label.trim().length).toBeGreaterThan(0);
            expect(side.label.length).toBeLessThanOrEqual(16);
          }
        }
      });

      it('é balanceado: vence jogando bem, perde jogando mal', () => {
        const best = simulateRun(caso, 'best');
        const worst = simulateRun(caso, 'worst');
        expect(isWinnable(caso), `best=${best} deve >= wall=${caso.wall}`).toBe(true);
        expect(isLosable(caso), `worst=${worst} deve < wall=${caso.wall}`).toBe(true);
      });
    });
  }
});
