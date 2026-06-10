import { describe, it, expect } from 'vitest';
import { buildShareText } from '../share';
import type { RunResult } from '../../../../core/types';

const base: RunResult = {
  won: true,
  score: 187,
  start: 1,
  wall: 60,
  casoId: 'bpc',
  casoName: 'BPC-LOAS da Dona Cida',
  shareText: '',
};

describe('buildShareText', () => {
  it('vitória cita o número de provas e o caso', () => {
    const t = buildShareText({ ...base, won: true, score: 187 });
    expect(t).toContain('187');
    expect(t).toContain('DERRUBEI');
    expect(t).toContain('BPC-LOAS da Dona Cida');
  });

  it('derrota cita o muro e não promete vitória', () => {
    const t = buildShareText({ ...base, won: false, score: 42, wall: 60 });
    expect(t).toContain('42');
    expect(t).toContain('60');
    expect(t).toContain('segurou');
    expect(t).not.toContain('DERRUBEI');
  });

  it('formata número grande em pt-BR', () => {
    const t = buildShareText({ ...base, won: true, score: 12345 });
    expect(t).toContain('12.345');
  });

  it('nunca promete resultado jurídico (OAB)', () => {
    const win = buildShareText({ ...base, won: true });
    const lose = buildShareText({ ...base, won: false });
    for (const t of [win, lose]) {
      expect(t.toLowerCase()).not.toContain('você tem direito');
      expect(t.toLowerCase()).not.toContain('garantido');
    }
  });
});
