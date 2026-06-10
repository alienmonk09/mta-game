import type { GatePair, GateOp } from '../data/CasoData';

/** Lado escolhido conforme o x do líder relativo ao centro da pista. */
export function pickSide(leaderX: number, centerX: number): 'left' | 'right' {
  return leaderX < centerX ? 'left' : 'right';
}

/** Operação do portão no lado escolhido. */
export function gateOpFor(gate: GatePair, side: 'left' | 'right'): GateOp {
  return side === 'left' ? gate.left : gate.right;
}
