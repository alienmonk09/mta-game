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

import { applyWeapon } from '../data/weapons';
import { dps, resolveBoss, windowMsFor } from './combat';

export interface RunOutcome {
  provas: number;
  tier: number;
}

/**
 * Simula a run carregando provas E tier. A cada portão escolhe o lado por
 * provas (best=maior / worst=menor) e aplica o weapon-delta daquele lado.
 */
export function simulateOutcome(caso: CasoData, mode: PickMode): RunOutcome {
  const gates = [...caso.gates].sort((a, b) => a.dist - b.dist);
  let provas = caso.start;
  let tier = 0;
  for (const gate of gates) {
    const left = applyOp(provas, gate.left);
    const right = applyOp(provas, gate.right);
    const pickLeft = mode === 'best' ? left >= right : left <= right;
    const side = pickLeft ? gate.left : gate.right;
    provas = pickLeft ? left : right;
    tier = applyWeapon(tier, side.weapon ?? 0);
  }
  return { provas, tier };
}

/**
 * Enumera TODAS as 2^N rotas de portão (N pequeno: ≤6 → ≤64 rotas), com a (provas, tier)
 * de cada uma. Brute-force (spec §8) porque o objetivo do boss — dps(provas, tier) — NÃO é
 * separável por portão: tier é fator multiplicativo, clampado e path-dependent, então
 * greedy-por-provas não maximiza o dps (uma rota de menos provas + tier maior pode bater mais).
 */
function allRouteOutcomes(caso: CasoData): RunOutcome[] {
  const gates = [...caso.gates].sort((a, b) => a.dist - b.dist);
  let routes: RunOutcome[] = [{ provas: caso.start, tier: 0 }];
  for (const gate of gates) {
    const next: RunOutcome[] = [];
    for (const r of routes) {
      for (const side of [gate.left, gate.right]) {
        next.push({ provas: applyOp(r.provas, side), tier: applyWeapon(r.tier, side.weapon ?? 0) });
      }
    }
    routes = next;
  }
  return routes;
}

/**
 * Limitação consciente (MVP): o invariante do boss assume janela de fogo cheia e ignora
 * inimigos (penalidade de provas + roubo de fogo quando um inimigo está na banda do boss).
 * Vale pro caso vitrine (BPC: inimigos fora da banda do boss e dissolvidos por qualquer build
 * boa). Modelar inimigos aqui exigiria geometria de render (GAP_BEFORE_WALL/FIRE_RANGE) na
 * camada pura — fica pra quando a autoria de casos de combate escalar. Ver docs/roadmap.md.
 */

/** Jogando a MELHOR rota (max dps via brute-force), o boss cai dentro da janela de fogo? */
export function isBossWinnable(caso: CasoData): boolean {
  if (caso.bossHp == null) return isWinnable(caso); // caso legado: compara contagem
  const window = windowMsFor(caso.speed);
  const maxDps = Math.max(...allRouteOutcomes(caso).map((o) => dps(o.provas, o.tier)));
  return resolveBoss(caso.bossHp, maxDps, window).broken;
}

/** Jogando a PIOR rota (min dps via brute-force), o boss segura? (senão o caso é trivial) */
export function isBossLosable(caso: CasoData): boolean {
  if (caso.bossHp == null) return isLosable(caso);
  const window = windowMsFor(caso.speed);
  const minDps = Math.min(...allRouteOutcomes(caso).map((o) => dps(o.provas, o.tier)));
  return !resolveBoss(caso.bossHp, minDps, window).broken;
}
