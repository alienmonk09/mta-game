// src/modules/exercito-da-maruzza/data/weapons.ts
/**
 * Escada de "armas" = qualidade da prova da Maruzza (conteúdo-como-dado).
 * Subir tier = prova melhor → mais dano. OAB-safe: são tipos de PROVA, não
 * instrumentos que "garantem" resultado. Labels podem ser re-vozeados por skin no futuro.
 */
export interface WeaponTier {
  id: string;
  label: string;
  /** multiplicador de dano sobre a base (1.0 = tier inicial) */
  dmgMul: number;
}

export const WEAPON_LADDER: readonly WeaponTier[] = [
  { id: 'documento', label: 'Documento', dmgMul: 1.0 },
  { id: 'laudo', label: 'Laudo', dmgMul: 1.6 },
  { id: 'dossie', label: 'Dossiê', dmgMul: 2.4 },
];

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(WEAPON_LADDER.length - 1, Math.round(tier)));
}

export function applyWeapon(tier: number, delta: number): number {
  return clampTier(tier + delta);
}

export function tierLabel(tier: number): string {
  return WEAPON_LADDER[clampTier(tier)].label;
}

export function tierDmgMul(tier: number): number {
  return WEAPON_LADDER[clampTier(tier)].dmgMul;
}
