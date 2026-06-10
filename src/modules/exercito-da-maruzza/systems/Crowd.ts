import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { personTexture, leaderTexture } from './figures';

const MAX_DOTS = 40; // cap VISUAL (número real continua no HUD)
const COLS = 5;
const SPACING_X = 40; // pessoa tem ~34px de largura → folga p/ não sobrepor
const SPACING_Y = 30; // ~46px de altura, mas origem (0.5,1) deixa a grade compacta
const ROW_TOP = 56; // 1ª fileira de seguidores ABAIXO do líder

/**
 * Multidão visual: um líder (Maruzza) + um cordão de seguidores (pessoinhas
 * cartoon flat) que reflete a contagem (capada visualmente em MAX_DOTS; o
 * número real vai no HUD). Texturas vêm do gerador procedural em figures.ts.
 */
export class Crowd {
  readonly container: Phaser.GameObjects.Container;
  count: number;
  private readonly dots: Phaser.GameObjects.Image[] = [];
  private readonly personKey: string;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    count: number,
    color: number,
    outlineColor = 0xffffff,
  ) {
    this.count = count;
    this.container = scene.add.container(x, y);

    const { themes } = getServices();

    // textura do seguidor (reutilizada por todas as pessoinhas)
    this.personKey = personTexture(scene, {
      body: color,
      skin: themes.colorNum('skin', 0xf4c79a),
      outline: outlineColor,
      hair: themes.colorNum('hair', 0x3a2a1a),
    });

    // líder Maruzza: no topo/centro, à frente da turma, levemente maior
    const leaderKey = leaderTexture(scene, {
      body: themes.colorNum('leader.body', 0xf59e0b),
      skin: themes.colorNum('skin', 0xf4c79a),
      outline: outlineColor,
      hair: themes.colorNum('leader.hair', 0x2a1a2e),
      accent: themes.colorNum('leader.accent', 0xe8b923),
    });
    const leader = scene.add.image(0, 0, leaderKey).setOrigin(0.5, 1).setScale(1.1);
    this.container.add(leader);

    this.render();
  }

  get x(): number {
    return this.container.x;
  }

  setX(x: number): void {
    this.container.x = x;
  }

  setCount(n: number): void {
    const grew = n >= this.count;
    this.count = Math.max(0, n);
    this.render();
    this.pulse(grew);
  }

  /** feedback tátil: pop ao crescer, encolhe ao diminuir */
  pulse(grew: boolean): void {
    const s = grew ? 1.18 : 0.86;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: s,
      scaleY: s,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private render(): void {
    const want = Math.min(this.count, MAX_DOTS);
    while (this.dots.length < want) {
      const p = this.scene.add.image(0, 0, this.personKey).setOrigin(0.5, 1);
      this.dots.push(p);
      this.container.add(p);
    }
    while (this.dots.length > want) {
      this.dots.pop()?.destroy();
    }
    // grade em colunas, abaixo do líder
    this.dots.forEach((p, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      p.setPosition(
        (col - (COLS - 1) / 2) * SPACING_X,
        ROW_TOP + row * SPACING_Y,
      );
    });
  }
}
