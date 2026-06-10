import type { Persistence } from '../../../core/services/Persistence';

/** Modo calmo reduz a velocidade da pista (idoso não se apressa). */
export const CALM_SPEED_FACTOR = 0.6;

/** PURO: velocidade efetiva conforme modo calmo. */
export function effectiveSpeed(baseSpeed: number, calm: boolean): number {
  return calm ? baseSpeed * CALM_SPEED_FACTOR : baseSpeed;
}

/** Lê se o modo calmo está ligado (flag persistida 'calm'). */
export function isCalmMode(p: Persistence): boolean {
  return p.getFlag('calm');
}

/** Liga/desliga o modo calmo. */
export function setCalmMode(p: Persistence, v: boolean): void {
  p.setFlag('calm', v);
}
