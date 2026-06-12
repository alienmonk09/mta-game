// src/modules/exercito-da-maruzza/systems/Projectiles.ts
import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { projectileTexture } from './figures';
import { project, type ProjConfig } from './projection';

interface Shot {
  img: Phaser.GameObjects.Image;
  laneX: number;
  d: number; // profundidade atual (sobe de 0 → alvo)
  target: number; // profundidade do alvo
  alive: boolean;
}

const SPEED_D = 4200; // unidades de profundidade por segundo
const MAX = 48; // teto do pool (performance mobile)

/** Projéteis "prova" — só juice. Viajam do plano da heroína até a profundidade do alvo. */
export class Projectiles {
  private shots: Shot[] = [];
  private key: string;

  constructor(private scene: Phaser.Scene, private cfg: ProjConfig) {
    const { themes } = getServices();
    this.key = projectileTexture(scene, {
      paper: themes.colorNum('projectile.paper', 0xfef9e7),
      ink: themes.colorNum('projectile.ink', 0x475569),
      outline: themes.colorNum('outline', 0xffffff),
    });
  }

  /** dispara um projétil da heroína (laneX) rumo à profundidade `targetD` */
  fire(laneX: number, targetD: number): void {
    if (this.shots.filter((s) => s.alive).length >= MAX) return;
    const p = project(0, laneX, this.cfg);
    const img = this.scene.add
      .image(p.x, p.y - 30, this.key)
      .setDepth(18)
      .setScale(p.scale);
    this.shots.push({ img, laneX, d: 0, target: Math.max(60, targetD), alive: true });
  }

  /** avança todos os projéteis; dtMs em ms */
  update(dtMs: number): void {
    const step = SPEED_D * (dtMs / 1000);
    for (const s of this.shots) {
      if (!s.alive) continue;
      s.d += step;
      if (s.d >= s.target) {
        s.alive = false;
        s.img.destroy();
        continue;
      }
      const p = project(s.d, s.laneX, this.cfg);
      s.img.setPosition(p.x, p.y).setScale(p.scale * 0.9);
      s.img.setAlpha(1 - p.t * 0.3);
    }
    this.shots = this.shots.filter((s) => s.alive);
  }

  destroy(): void {
    for (const s of this.shots) s.img.destroy();
    this.shots = [];
  }
}
