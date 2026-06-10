import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { villainTexture } from './figures';

/** profundidade: à frente do muro/cenário (negativos a 0), atrás do HUD (10) */
const DEPTH = 5;

/**
 * Vilão INSS: o "chefe de fase" burocrático parado em cima do muro de
 * indeferimento. Frio e formal — perito de cara fechada, nunca caricatura.
 * Quando a multidão arromba o muro ele é derrubado/foge; quando o muro segura,
 * faz uma pose convencida. Arte procedural via villainTexture (cores do tema).
 */
export class Villain {
  readonly image: Phaser.GameObjects.Image;
  /** tween de respiração/balanço; parado antes da reação final */
  private idle?: Phaser.Tweens.Tween;

  constructor(private scene: Phaser.Scene, x: number, y: number) {
    const { themes } = getServices();
    const key = villainTexture(scene, {
      body: themes.colorNum('villain.body', 0x64748b),
      skin: themes.colorNum('villain.skin', 0xcbd5e1),
      outline: themes.colorNum('outline', 0xffffff),
      accent: themes.colorNum('villain.accent', 0x334155),
    });

    // origin (0.5, 1): "pisa" no topo do muro a partir do y informado
    this.image = scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(DEPTH);

    // idle sutil: balança de leve pra não ficar estático (formal, contido)
    this.idle = scene.tweens.add({
      targets: this.image,
      angle: { from: -2, to: 2 },
      duration: 1400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** reposiciona em Y todo frame — `y` é o topo do muro (origin bottom) */
  setY(y: number): void {
    this.image.y = y;
  }

  /** desfecho: won=true → derrubado; won=false → pose convencida */
  react(won: boolean): void {
    this.idle?.stop();
    this.idle = undefined;

    if (won) {
      // multidão arrombou: voa pro lado com rotação, sobe e some
      this.scene.tweens.add({
        targets: this.image,
        y: '-=160',
        x: '+=80',
        angle: 220,
        alpha: 0,
        duration: 600,
        ease: 'Back.easeIn',
      });
      return;
    }

    // muro segurou: pulinho convencido de braços cruzados (curto, contido)
    this.scene.tweens.add({
      targets: this.image,
      y: '-=10',
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 180,
      ease: 'Quad.easeOut',
      yoyo: true,
      repeat: 1,
    });
  }
}
