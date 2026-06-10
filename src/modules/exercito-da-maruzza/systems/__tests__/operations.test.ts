import { describe, it, expect } from 'vitest';
import { applyOp, isGoodOp, opSign } from '../operations';

describe('applyOp', () => {
  it('multiplica', () => {
    expect(applyOp(10, { op: 'mul', value: 2, label: '' })).toBe(20);
  });
  it('soma', () => {
    expect(applyOp(10, { op: 'add', value: 5, label: '' })).toBe(15);
  });
  it('divide com piso (round)', () => {
    expect(applyOp(7, { op: 'div', value: 2, label: '' })).toBe(4); // 3.5 -> 4
    expect(applyOp(5, { op: 'div', value: 2, label: '' })).toBe(3); // 2.5 -> 3
  });
  it('subtrai', () => {
    expect(applyOp(10, { op: 'sub', value: 3, label: '' })).toBe(7);
  });
  it('nunca fica negativo', () => {
    expect(applyOp(2, { op: 'sub', value: 8, label: '' })).toBe(0);
  });
  it('não explode com divisor zero', () => {
    expect(applyOp(10, { op: 'div', value: 0, label: '' })).toBe(10);
  });
});

describe('isGoodOp', () => {
  it('mul/add são bons; div/sub são ruins', () => {
    expect(isGoodOp({ op: 'mul', value: 2, label: '' })).toBe(true);
    expect(isGoodOp({ op: 'add', value: 2, label: '' })).toBe(true);
    expect(isGoodOp({ op: 'div', value: 2, label: '' })).toBe(false);
    expect(isGoodOp({ op: 'sub', value: 2, label: '' })).toBe(false);
  });
});

describe('opSign', () => {
  it('mapeia os sinais', () => {
    expect(opSign({ op: 'mul', value: 1, label: '' })).toBe('×');
    expect(opSign({ op: 'div', value: 1, label: '' })).toBe('÷');
  });
});
