import Phaser from 'phaser';

const MAX_DOTS = 48;
const COLS = 6;
const DOT_R = 11;
const SPACING = 22;

/**
 * Multidão visual: um líder (Maruzza) + um blob de seguidores que reflete a
 * contagem (capada visualmente em MAX_DOTS; o número real vai no HUD).
 */
export class Crowd {
  readonly container: Phaser.GameObjects.Container;
  count: number;
  private readonly dots: Phaser.GameObjects.Arc[] = [];

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    count: number,
    private color: number,
    leaderColor: number,
    outlineColor = 0xffffff,
  ) {
    this.count = count;
    this.container = scene.add.container(x, y);
    const leader = scene.add.circle(0, 0, 16, leaderColor).setStrokeStyle(3, outlineColor);
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
      const d = this.scene.add.circle(0, 0, DOT_R, this.color);
      this.dots.push(d);
      this.container.add(d);
    }
    while (this.dots.length > want) {
      this.dots.pop()?.destroy();
    }
    this.dots.forEach((d, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      d.setPosition((col - (COLS - 1) / 2) * SPACING, 30 + row * SPACING);
    });
  }
}
