// src/modules/exercito-da-maruzza/systems/Enemy.ts
import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { obstacleTexture } from './figures';
import { project, type ProjConfig } from './projection';
import type { CasoEnemy } from '../data/CasoData';

/**
 * Obstáculo de burocracia (carimbo/pilha) com HP. NÃO é pessoa. Desce a pista
 * em perspectiva; a barra de HP encolhe conforme leva provas. Quando dissolvido,
 * o chamador (RunScene) chama `kill()` (que dispara o estouro de papel via Fx).
 */
export class Enemy {
  readonly container: Phaser.GameObjects.Container;
  hp: number;
  readonly maxHp: number;
  resolved = false; // já cruzou o plano da heroína (aplicou ou não a penalidade)
  private bar: Phaser.GameObjects.Rectangle;
  private barBg: Phaser.GameObjects.Rectangle;
  private body: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly data: CasoEnemy,
    private cfg: ProjConfig,
  ) {
    const { themes } = getServices();
    this.hp = data.hp;
    this.maxHp = data.hp;
    const key = obstacleTexture(scene, data.kind, {
      body: themes.colorNum('enemy.body', 0x7b8496),
      accent: themes.colorNum('enemy.accent', 0x9aa3b2),
      outline: themes.colorNum('outline', 0xffffff),
    });
    this.body = scene.add.image(0, 0, key).setOrigin(0.5, 0.9);
    this.barBg = scene.add.rectangle(0, 8, 44, 6, 0x000000, 0.4);
    this.bar = scene.add.rectangle(-22, 8, 44, 6, themes.colorNum('gate.bad', 0xef4444)).setOrigin(0, 0.5);
    const label = scene.add
      .text(0, -2, data.label, { fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold', color: themes.color('outline', '#ffffff') })
      .setOrigin(0.5, 2.4);
    this.container = scene.add.container(0, 0, [this.body, this.barBg, this.bar, label]).setDepth(6);
  }

  /** profundidade atual = dist do dado - quanto a pista já andou */
  get depth(): number {
    return this.data.dist;
  }

  /** reposiciona pela profundidade `d` (dist - traveled) */
  place(d: number): void {
    const p = project(d, this.data.lane, this.cfg);
    this.container.setPosition(p.x, p.y).setScale(p.scale);
    this.container.setDepth(6 + (1 - p.t)); // mais perto = mais na frente
  }

  damage(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg);
    this.bar.scaleX = this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  destroy(): void {
    this.container.destroy();
  }
}
