// src/modules/exercito-da-maruzza/systems/projection.ts
/**
 * Projeção pseudo-3D (2.5D), PURA. Mapeia (profundidade na pista, lane) →
 * (x, y, escala) na tela. Phaser é 2D — isto é só projeção em perspectiva.
 * Os sistemas continuam 1D (distância); só este arquivo "sabe" da câmera.
 *
 *   d = dist - track.traveled   (≥0 à frente; 0 = plano da heroína)
 *   laneX ∈ [-1, 1]             (-1 = esquerda, +1 = direita)
 */
export interface ProjConfig {
  width: number;
  /** y de tela do horizonte (px, topo da pista) */
  horizonY: number;
  /** y de tela do plano da heroína (px, perto da câmera) */
  heroY: number;
  /** escala perto (d=0) e no horizonte */
  nearScale: number;
  farScale: number;
  /** meia-largura do espalhamento das lanes perto e no horizonte (px) */
  halfLaneNear: number;
  halfLaneFar: number;
  /** profundidade (unidades de pista) que mapeia pro horizonte */
  dHorizon: number;
}

export interface Projected {
  x: number;
  y: number;
  scale: number;
  /** 0 (perto) .. 1 (horizonte) */
  t: number;
}

export function project(d: number, laneX: number, cfg: ProjConfig): Projected {
  const t = Math.max(0, Math.min(1, d / cfg.dHorizon));
  const scale = cfg.nearScale + (cfg.farScale - cfg.nearScale) * t;
  const y = cfg.heroY + (cfg.horizonY - cfg.heroY) * t;
  const halfLane = cfg.halfLaneNear + (cfg.halfLaneFar - cfg.halfLaneNear) * t;
  const x = cfg.width / 2 + laneX * halfLane;
  return { x, y, scale, t };
}
