// src/modules/exercito-da-maruzza/systems/combat.ts
/**
 * Combate PURO e determinístico (sem Phaser). O DANO é calculado por tick
 * (dps × dt) — testável e balanceável. Os projéteis visuais (Projectiles.ts)
 * são só juice e NÃO carregam a colisão. "Mais provas + arma melhor = mais dano"
 * é a mensagem de marca: quantidade E qualidade de prova derrubam o muro.
 */
import { tierDmgMul } from '../data/weapons';

const DPS_BASE = 6; // dano/s base (0 provas extras, tier documento)
const PROVAS_FACTOR = 0.6; // cada prova soma 60% do dano-base
const BASE_INTERVAL = 520; // ms entre disparos com poucas provas
const MIN_INTERVAL = 80; // piso de cadência (ms)
const RATE_FACTOR = 0.04; // quão rápido a cadência acelera com provas

/** alcance de fogo (unidades de pista): o boss entra em alcance a esta distância. */
export const FIRE_RANGE = 900;

/** Dano por segundo. Monotônico crescente em provas e em tier. */
export function dps(provas: number, tier: number): number {
  const p = Math.max(0, provas);
  return DPS_BASE * tierDmgMul(tier) * (1 + p * PROVAS_FACTOR);
}

/** Intervalo entre disparos (ms) — só cadência visual; cai com mais provas, com piso. */
export function fireInterval(provas: number, _tier: number): number {
  const p = Math.max(0, provas);
  return Math.max(MIN_INTERVAL, BASE_INTERVAL / (1 + p * RATE_FACTOR));
}

/** Aplica dano a um HP, com piso 0; ignora dano negativo. */
export function applyDamage(hp: number, dmg: number): number {
  return Math.max(0, hp - Math.max(0, dmg));
}

/** Provas perdidas quando um inimigo chega vivo: proporcional ao HP restante. */
export function enemyPenalty(hpRemaining: number): number {
  return Math.max(0, Math.round(hpRemaining));
}

/** Janela de fogo no boss (ms) = tempo pra cruzar FIRE_RANGE na velocidade do caso. */
export function windowMsFor(speed: number): number {
  return (FIRE_RANGE / Math.max(1, speed)) * 1000;
}

export interface BossResult {
  broken: boolean;
  fraction: number;
  overkill: number;
}

/** Resolve o muro como dreno de HP: dano = dps × janela. */
export function resolveBoss(bossHp: number, dpsValue: number, windowMs: number): BossResult {
  const dmg = Math.max(0, dpsValue) * (Math.max(0, windowMs) / 1000);
  const fraction = bossHp <= 0 ? 1 : Math.min(1, dmg / bossHp);
  return { broken: dmg >= bossHp, fraction, overkill: Math.max(0, dmg - bossHp) };
}
