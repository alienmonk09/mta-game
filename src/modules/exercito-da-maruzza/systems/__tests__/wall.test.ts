import { describe, it, expect } from 'vitest';
import { resolveWall } from '../wall';

describe('resolveWall', () => {
  it('arromba quando >= limiar', () => {
    expect(resolveWall(60, 60)).toBe(true);
    expect(resolveWall(76, 60)).toBe(true);
  });
  it('segura quando abaixo do limiar', () => {
    expect(resolveWall(59, 60)).toBe(false);
    expect(resolveWall(0, 1)).toBe(false);
  });
});
