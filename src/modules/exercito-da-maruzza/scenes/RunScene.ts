import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import type { ThemeManager } from '../../../core/services/ThemeManager';
import { getCaso, firstCasoId } from '../data/casos';
import type { CasoData, GateOp, GatePair } from '../data/CasoData';
import { Track } from '../systems/track';
import { applyOp, isGoodOp, opSign } from '../systems/operations';
import { pickSide, gateOpFor } from '../systems/gates';
import { resolveWall } from '../systems/wall';
import { Crowd } from '../systems/Crowd';

interface GateView {
  pair: GatePair;
  resolved: boolean;
  left: Phaser.GameObjects.Container;
  right: Phaser.GameObjects.Container;
}

const GAP_BEFORE_WALL = 700;

export class RunScene extends Phaser.Scene {
  private caso!: CasoData;
  private track!: Track;
  private crowd!: Crowd;
  private gateViews: GateView[] = [];
  private wall!: Phaser.GameObjects.Container;
  private wallDist = 0;
  private countText!: Phaser.GameObjects.Text;
  private targetX = 0;
  private crowdY = 0;
  private laneLeft = 0;
  private laneRight = 0;
  private centerX = 0;
  private ended = false;

  constructor() {
    super('RunScene');
  }

  create(data: { casoId?: string }): void {
    const { themes } = getServices();
    const caso = getCaso(data?.casoId ?? firstCasoId());
    if (!caso) throw new Error(`Caso "${data?.casoId}" não encontrado`);
    this.caso = caso;
    this.track = new Track(caso.speed);
    this.gateViews = [];
    this.ended = false;

    const W = this.scale.width;
    const H = this.scale.height;
    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));
    this.laneLeft = W * 0.12;
    this.laneRight = W * 0.88;
    this.centerX = W / 2;
    this.crowdY = H * 0.8;
    this.targetX = this.centerX;
    const laneW = this.laneRight - this.laneLeft;

    // pista (fundo)
    this.add.rectangle(this.centerX, H / 2, laneW, H, themes.colorNum('accent.secondary', 0x6366f1), 0.06);
    // linha da multidão
    this.add.rectangle(this.centerX, this.crowdY + 40, laneW, 2, 0xffffff, 0.12);

    // multidão
    this.crowd = new Crowd(
      this,
      this.centerX,
      this.crowdY,
      caso.start,
      themes.colorNum('accent.primary', 0x22c55e),
      themes.colorNum('accent.secondary', 0x6366f1),
    );

    // portões
    for (const pair of caso.gates) {
      const left = this.makeGate(pair.left, this.laneLeft + laneW * 0.25, laneW * 0.46, themes);
      const right = this.makeGate(pair.right, this.laneLeft + laneW * 0.75, laneW * 0.46, themes);
      this.gateViews.push({ pair, resolved: false, left, right });
    }

    // muro
    this.wallDist = Math.max(...caso.gates.map((g) => g.dist)) + GAP_BEFORE_WALL;
    const wallRect = this.add.rectangle(0, 0, laneW, 80, themes.colorNum('wall', 0x475569)).setStrokeStyle(4, 0xffffff, 0.3);
    const wallTxt = this.add
      .text(0, 0, `MURO\n${caso.wall}`, { fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: '#ffffff', align: 'center' })
      .setOrigin(0.5);
    this.wall = this.add.container(this.centerX, -300, [wallRect, wallTxt]);

    // HUD
    this.add.text(this.centerX, H * 0.02, caso.name, { fontFamily: 'Arial', fontSize: '22px', color: themes.color('text', '#e2e8f0') }).setOrigin(0.5, 0).setDepth(10);
    this.countText = this.add
      .text(this.centerX, H * 0.08, `${caso.start}`, { fontFamily: 'Arial', fontSize: '76px', fontStyle: 'bold', color: themes.color('accent.primary', '#22c55e') })
      .setOrigin(0.5)
      .setDepth(10);
    this.add.text(this.centerX, H * 0.145, 'PROVAS', { fontFamily: 'Arial', fontSize: '24px', color: themes.color('text.muted', '#94a3b8') }).setOrigin(0.5).setDepth(10);

    // input: arrasta o líder
    const steer = (p: Phaser.Input.Pointer): void => {
      this.targetX = Phaser.Math.Clamp(p.x, this.laneLeft, this.laneRight);
    };
    this.input.on('pointermove', steer);
    this.input.on('pointerdown', steer);
  }

  private makeGate(op: GateOp, cx: number, w: number, themes: ThemeManager): Phaser.GameObjects.Container {
    const color = isGoodOp(op) ? themes.colorNum('gate.good', 0x22c55e) : themes.colorNum('gate.bad', 0xef4444);
    const rect = this.add.rectangle(0, 0, w, 66, color, 0.85);
    const sign = this.add.text(0, -8, `${opSign(op)}${op.value}`, { fontFamily: 'Arial', fontSize: '36px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    const label = this.add.text(0, 24, op.label, { fontFamily: 'Arial', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
    return this.add.container(cx, -300, [rect, sign, label]);
  }

  override update(_time: number, delta: number): void {
    if (this.ended) return;
    this.track.update(delta);

    // a multidão segue o ponteiro suavemente
    this.crowd.setX(Phaser.Math.Linear(this.crowd.x, this.targetX, 0.15));

    // portões
    for (const gv of this.gateViews) {
      const y = this.track.screenY(gv.pair.dist, this.crowdY);
      gv.left.y = y;
      gv.right.y = y;
      if (!gv.resolved && this.track.passed(gv.pair.dist)) {
        gv.resolved = true;
        const side = pickSide(this.crowd.x, this.centerX);
        const op = gateOpFor(gv.pair, side);
        this.crowd.setCount(applyOp(this.crowd.count, op));
        this.countText.setText(`${this.crowd.count}`);
        (side === 'left' ? gv.left : gv.right).setAlpha(0.25);
        (side === 'left' ? gv.right : gv.left).setAlpha(0.12);
      }
    }

    // muro
    this.wall.y = this.track.screenY(this.wallDist, this.crowdY);
    if (this.track.passed(this.wallDist)) {
      this.end(resolveWall(this.crowd.count, this.caso.wall));
    }
  }

  private end(won: boolean): void {
    this.ended = true;
    const { themes } = getServices();
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setDepth(20);
    this.add
      .text(W / 2, H * 0.4, won ? 'BENEFÍCIO\nCONCEDIDO! 🎉' : 'O MURO\nSEGUROU 😞', {
        fontFamily: 'Arial',
        fontSize: '60px',
        fontStyle: 'bold',
        align: 'center',
        color: won ? themes.color('gate.good', '#22c55e') : themes.color('gate.bad', '#ef4444'),
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.add
      .text(W / 2, H * 0.56, `Provas: ${this.crowd.count}   ·   Muro: ${this.caso.wall}`, {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: themes.color('text', '#e2e8f0'),
      })
      .setOrigin(0.5)
      .setDepth(21);

    const again = this.add
      .text(W / 2, H * 0.7, '↺ Jogar de novo', {
        fontFamily: 'Arial',
        fontSize: '34px',
        fontStyle: 'bold',
        color: themes.color('bg.base', '#0b1020'),
        backgroundColor: themes.color('accent.primary', '#22c55e'),
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    again.once('pointerdown', () => this.scene.start('MenuScene'));
  }
}
