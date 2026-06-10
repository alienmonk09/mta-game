import type { GateOp } from '../data/CasoData';

/** Aplica a operação de um portão à contagem. Puro e testável. */
export function applyOp(count: number, op: GateOp): number {
  let n: number;
  switch (op.op) {
    case 'mul':
      n = count * op.value;
      break;
    case 'add':
      n = count + op.value;
      break;
    case 'div':
      n = op.value === 0 ? count : count / op.value;
      break;
    case 'sub':
      n = count - op.value;
      break;
  }
  return Math.max(0, Math.round(n));
}

/** Um portão é "bom" (multiplica/soma) ou "ruim" (divide/subtrai). */
export function isGoodOp(op: GateOp): boolean {
  return op.op === 'mul' || op.op === 'add';
}

/** Sinal de exibição do operador. */
export function opSign(op: GateOp): string {
  switch (op.op) {
    case 'mul':
      return '×';
    case 'add':
      return '+';
    case 'div':
      return '÷';
    case 'sub':
      return '−';
  }
}
