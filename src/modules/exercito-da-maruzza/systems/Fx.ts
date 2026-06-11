// src/modules/exercito-da-maruzza/systems/Fx.ts
import Phaser from 'phaser';

/**
 * Juice reutilizável (direção de arte B): flash de tiro, faíscas de impacto,
 * estouro de papel ao dissolver obstáculo. Tudo procedural, cores via parâmetro
 * (o chamador resolve pelos tokens do tema). Cada efeito se autodestrói.
 */
export class Fx {
  constructor(private scene: Phaser.Scene) {}

  /** clarão curto na boca da "arma" da heroína */
  muzzleFlash(x: number, y: number, color: number): void {
    const f = this.scene.add.circle(x, y, 10, color, 0.9).setDepth(20);
    this.scene.tweens.add({
      targets: f, scale: 1.8, alpha: 0, duration: 130, ease: 'Quad.easeOut',
      onComplete: () => f.destroy(),
    });
  }

  /** faíscas no ponto de impacto (inimigo/boss levando dano) */
  impactSparks(x: number, y: number, color: number, n = 6): void {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const s = this.scene.add.circle(x, y, 3, color, 1).setDepth(20);
      this.scene.tweens.add({
        targets: s,
        x: x + Math.cos(a) * Phaser.Math.Between(20, 46),
        y: y + Math.sin(a) * Phaser.Math.Between(20, 46),
        alpha: 0, scale: 0.3, duration: 320, ease: 'Cubic.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  /** estouro de papel/carimbo quando um obstáculo é dissolvido */
  paperBurst(x: number, y: number, color: number, n = 10): void {
    for (let i = 0; i < n; i++) {
      const p = this.scene.add
        .rectangle(x, y, Phaser.Math.Between(4, 9), Phaser.Math.Between(4, 9), color)
        .setDepth(20)
        .setAngle(Phaser.Math.Between(0, 360));
      this.scene.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-70, 70),
        y: y + Phaser.Math.Between(-90, 30),
        angle: Phaser.Math.Between(-260, 260),
        alpha: 0, duration: Phaser.Math.Between(420, 700), ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }
}
