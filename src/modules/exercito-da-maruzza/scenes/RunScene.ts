import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import type { ThemeManager } from '../../../core/services/ThemeManager';
import type { RunResult } from '../../../core/types';
import { getCaso, firstCasoId } from '../data/casos';
import type { CasoData, GateOp, GatePair } from '../data/CasoData';
import { Track } from '../systems/track';
import { applyOp, isGoodOp, opSign } from '../systems/operations';
import { pickSide, gateOpFor } from '../systems/gates';
import { resolveWall } from '../systems/wall';
import { Crowd } from '../systems/Crowd';
import { Scenery } from '../systems/Scenery';
import { Villain } from '../systems/Villain';
import { buildShareText } from '../systems/share';
import { effectiveSpeed, isCalmMode } from '../systems/settings';
import { shouldShowOnboarding, markOnboarded, showOnboarding } from '../systems/onboarding';

interface GateView {
  pair: GatePair;
  resolved: boolean;
  left: Phaser.GameObjects.Container;
  right: Phaser.GameObjects.Container;
}

const GAP_BEFORE_WALL = 700;
const WALL_H = 80; // altura do muro; o vilão "pisa" no topo (wall.y - WALL_H/2)

export class RunScene extends Phaser.Scene {
  private caso!: CasoData;
  private track!: Track;
  private crowd!: Crowd;
  private scenery!: Scenery;
  private villain!: Villain;
  private gateViews: GateView[] = [];
  private wall!: Phaser.GameObjects.Container;
  private wallRect!: Phaser.GameObjects.Rectangle;
  private wallDist = 0;
  private countText!: Phaser.GameObjects.Text;
  private targetX = 0;
  private crowdY = 0;
  private laneLeft = 0;
  private laneRight = 0;
  private centerX = 0;
  private ended = false;
  /** false enquanto o onboarding está na tela: congela a pista até o 1º toque */
  private running = true;

  constructor() {
    super('RunScene');
  }

  create(data: { casoId?: string }): void {
    const { themes } = getServices();
    const caso = getCaso(data?.casoId ?? firstCasoId());
    if (!caso) throw new Error(`Caso "${data?.casoId}" não encontrado`);
    this.caso = caso;
    const calm = isCalmMode(getServices().persistence);
    this.track = new Track(effectiveSpeed(caso.speed, calm));
    this.gateViews = [];
    this.ended = false;
    this.running = true;

    const W = this.scale.width;
    const H = this.scale.height;
    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));
    this.scenery = new Scenery(this, W, H);
    this.laneLeft = W * 0.12;
    this.laneRight = W * 0.88;
    this.centerX = W / 2;
    this.crowdY = H * 0.8;
    this.targetX = this.centerX;
    const laneW = this.laneRight - this.laneLeft;

    // pista (fundo)
    this.add.rectangle(this.centerX, H / 2, laneW, H, themes.colorNum('accent.secondary', 0x6366f1), 0.06);
    // linha da multidão
    this.add.rectangle(this.centerX, this.crowdY + 40, laneW, 2, themes.colorNum('outline', 0xffffff), 0.12);

    // multidão
    this.crowd = new Crowd(
      this,
      this.centerX,
      this.crowdY,
      caso.start,
      themes.colorNum('accent.primary', 0x22c55e),
      themes.colorNum('outline', 0xffffff),
    );

    // portões
    for (const pair of caso.gates) {
      const left = this.makeGate(pair.left, this.laneLeft + laneW * 0.25, laneW * 0.46, themes);
      const right = this.makeGate(pair.right, this.laneLeft + laneW * 0.75, laneW * 0.46, themes);
      this.gateViews.push({ pair, resolved: false, left, right });
    }

    // muro
    this.wallDist = Math.max(...caso.gates.map((g) => g.dist)) + GAP_BEFORE_WALL;
    this.wallRect = this.add
      .rectangle(0, 0, laneW, WALL_H, themes.colorNum('wall', 0x475569))
      .setStrokeStyle(4, themes.colorNum('outline', 0xffffff), 0.3);
    // faixa de topo (capa de concreto) — leve volume
    const wallTop = this.add.rectangle(0, -WALL_H / 2 + 6, laneW, 14, themes.colorNum('wall.top', 0x64748b));
    const wallTxt = this.add
      .text(0, 6, `${themes.text('wall.label', 'MURO')}\n${caso.wall}`, { fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: themes.color('outline', '#ffffff'), align: 'center' })
      .setOrigin(0.5);
    this.wall = this.add.container(this.centerX, -300, [this.wallRect, wallTop, wallTxt]);

    // vilão INSS em cima do muro (chefe de fase burocrático)
    this.villain = new Villain(this, this.centerX, -300 - WALL_H / 2);

    // HUD — barra no topo: os portões emergem por baixo dela (legibilidade)
    this.add.rectangle(this.centerX, 0, W, H * 0.17, themes.colorNum('bg.base', 0x0b1020), 0.92).setOrigin(0.5, 0).setDepth(9);
    this.add.rectangle(this.centerX, H * 0.17, W, 2, themes.colorNum('outline', 0xffffff), 0.15).setOrigin(0.5, 0.5).setDepth(9);
    this.add.text(this.centerX, H * 0.02, caso.name, { fontFamily: 'Arial', fontSize: '22px', color: themes.color('text', '#e2e8f0') }).setOrigin(0.5, 0).setDepth(10);
    this.countText = this.add
      .text(this.centerX, H * 0.08, `${caso.start}`, { fontFamily: 'Arial', fontSize: '76px', fontStyle: 'bold', color: themes.color('accent.primary', '#22c55e') })
      .setOrigin(0.5)
      .setDepth(10);
    this.add.text(this.centerX, H * 0.145, themes.text('card.metric', 'PROVAS'), { fontFamily: 'Arial', fontSize: '24px', color: themes.color('text.muted', '#94a3b8') }).setOrigin(0.5).setDepth(10);

    // input: arrasta o líder
    const { audio } = getServices();
    const steer = (p: Phaser.Input.Pointer): void => {
      if (!this.running) return; // não move a turma enquanto o onboarding congela a pista
      this.targetX = Phaser.Math.Clamp(p.x, this.laneLeft, this.laneRight);
    };
    this.input.on('pointermove', steer);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      audio.startMusic();
      steer(p);
    });

    // onboarding 1-toque na primeira partida: congela a pista até dispensar
    const { persistence } = getServices();
    if (shouldShowOnboarding(persistence)) {
      this.running = false;
      showOnboarding(this, () => {
        markOnboarded(persistence);
        this.running = true;
        audio.unlock();
        audio.startMusic();
      });
    }
  }

  private makeGate(op: GateOp, cx: number, w: number, themes: ThemeManager): Phaser.GameObjects.Container {
    const color = isGoodOp(op) ? themes.colorNum('gate.good', 0x22c55e) : themes.colorNum('gate.bad', 0xef4444);
    const rect = this.add.rectangle(0, 0, w, 66, color, 0.85);
    const ink = themes.color('outline', '#ffffff');
    const sign = this.add.text(0, -8, `${opSign(op)}${op.value}`, { fontFamily: 'Arial', fontSize: '36px', fontStyle: 'bold', color: ink }).setOrigin(0.5);
    const label = this.add.text(0, 24, op.label, { fontFamily: 'Arial', fontSize: '15px', color: ink }).setOrigin(0.5);
    return this.add.container(cx, -300, [rect, sign, label]);
  }

  override update(_time: number, delta: number): void {
    if (this.ended || !this.running) return;
    this.track.update(delta);
    this.scenery.update(this.track.traveled);

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
        const good = isGoodOp(op);
        this.crowd.setCount(applyOp(this.crowd.count, op));
        this.countText.setText(`${this.crowd.count}`);
        this.popCount(good);
        getServices().audio.play(good ? 'good' : 'bad');
        const chosen = side === 'left' ? gv.left : gv.right;
        const other = side === 'left' ? gv.right : gv.left;
        chosen.setAlpha(0.3);
        other.setAlpha(0.12);
        this.tweens.add({ targets: chosen, scaleX: 1.15, scaleY: 1.15, duration: 90, yoyo: true });
      }
    }

    // muro (+ vilão em cima dele: topo = wall.y - WALL_H/2)
    this.wall.y = this.track.screenY(this.wallDist, this.crowdY);
    this.villain.setY(this.wall.y - WALL_H / 2);
    if (this.track.passed(this.wallDist)) {
      this.end(resolveWall(this.crowd.count, this.caso.wall));
    }
  }

  /** pop no contador de provas: cor + escala conforme o portão foi bom/ruim */
  private popCount(good: boolean): void {
    const { themes } = getServices();
    const baseColor = themes.color('accent.primary', '#22c55e');
    this.countText.setColor(good ? themes.color('gate.good', '#22c55e') : themes.color('gate.bad', '#ef4444'));
    this.tweens.add({
      targets: this.countText,
      scale: good ? 1.3 : 0.8,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => this.countText.setColor(baseColor),
    });
  }

  private end(won: boolean): void {
    this.ended = true;
    const { themes, audio } = getServices();

    this.cameras.main.shake(won ? 380 : 260, won ? 0.012 : 0.008);
    this.villain.react(won);

    if (won) {
      audio.play('break');
      this.breakWall(themes.colorNum('wall', 0x475569));
      // a multidão avança triunfante
      this.tweens.add({ targets: this.crowd.container, y: this.crowd.container.y - 80, duration: 350, ease: 'Quad.easeOut' });
      this.time.delayedCall(160, () => audio.play('win'));
    } else {
      audio.play('lose');
      // muro pisca e segura; multidão recua
      this.tweens.add({ targets: this.wall, scaleY: 1.12, duration: 90, yoyo: true, repeat: 2 });
      this.tweens.add({ targets: this.crowd.container, y: this.crowd.container.y + 36, duration: 220, yoyo: true, ease: 'Quad.easeOut' });
    }

    const result: RunResult = {
      won,
      score: this.crowd.count,
      start: this.caso.start,
      wall: this.caso.wall,
      casoId: this.caso.id,
      casoName: this.caso.name,
      shareText: '',
    };
    result.shareText = buildShareText(result, themes.text('share.emoji', '👵⚖️'));

    this.time.delayedCall(900, () => this.scene.start('ResultScene', { result }));
  }

  /** estilhaça o muro em fragmentos que voam pra fora */
  private breakWall(color: number): void {
    const { x, y } = this.wall;
    const laneW = this.laneRight - this.laneLeft;
    this.wall.setVisible(false);
    const pieces = 9;
    for (let i = 0; i < pieces; i++) {
      const px = x - laneW / 2 + (laneW / pieces) * (i + 0.5);
      const frag = this.add.rectangle(px, y, laneW / pieces - 4, 64, color).setDepth(15);
      this.tweens.add({
        targets: frag,
        x: px + Phaser.Math.Between(-180, 180),
        y: y - Phaser.Math.Between(120, 360),
        angle: Phaser.Math.Between(-220, 220),
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => frag.destroy(),
      });
    }
  }
}
