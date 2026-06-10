import type { CasoData, GatePair } from '../data/CasoData';
import { applyOp } from './operations';

/**
 * Simulador de balanceamento. Puro e testável — usado nos testes pra garantir
 * que todo caso é vencível jogando bem e perdível jogando mal (conteúdo data-driven
 * gerado por agentes precisa dessa rede de segurança).
 *
 * Greedy por portão é ótimo: applyOp é monotônica não-decrescente na contagem,
 * então maximizar (ou minimizar) a cada passo maximiza (minimiza) o total final.
 */
export type PickMode = 'best' | 'worst';

function chooseCount(count: number, gate: GatePair, mode: PickMode): number {
  const left = applyOp(count, gate.left);
  const right = applyOp(count, gate.right);
  return mode === 'best' ? Math.max(left, right) : Math.min(left, right);
}

export function simulateRun(caso: CasoData, mode: PickMode): number {
  const gates = [...caso.gates].sort((a, b) => a.dist - b.dist);
  let count = caso.start;
  for (const gate of gates) count = chooseCount(count, gate, mode);
  return count;
}

/** jogando perfeito, a multidão arromba o muro? */
export function isWinnable(caso: CasoData): boolean {
  return simulateRun(caso, 'best') >= caso.wall;
}

/** jogando péssimo, o muro segura? (senão o caso é trivial) */
export function isLosable(caso: CasoData): boolean {
  return simulateRun(caso, 'worst') < caso.wall;
}
