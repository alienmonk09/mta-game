// src/modules/exercito-da-maruzza/scenes/RunScene.ts
import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import type { ThemeManager } from '../../../core/services/ThemeManager';
import type { RunResult } from '../../../core/types';
import { getCaso, firstCasoId } from '../data/casos';
import type { CasoData, GateOp, GatePair } from '../data/CasoData';
import { Track } from '../systems/track';
import { applyOp, isGoodOp, opSign, isWeaponGate } from '../systems/operations';
import { pickSide, gateOpFor } from '../systems/gates';
import { resolveWall } from '../systems/wall';
import { Crowd } from '../systems/Crowd';
import { Scenery } from '../systems/Scenery';
import { Villain } from '../systems/Villain';
import { buildShareText } from '../systems/share';
import { effectiveSpeed, isCalmMode, CALM_SPEED_FACTOR } from '../systems/settings';
import { shouldShowOnboarding, markOnboarded, showOnboarding } from '../systems/onboarding';
import { project, type ProjConfig } from '../systems/projection';
import { dps, fireInterval, applyDamage, enemyPenalty, FIRE_RANGE } from '../systems/combat';
import { applyWeapon, tierLabel } from '../data/weapons';
import { Projectiles } from '../systems/Projectiles';
import { Enemy } from '../systems/Enemy';
import { Fx } from '../systems/Fx';

interface GateView {
  pair: GatePair;
  resolved: boolean;
  left: Phaser.GameObjects.Container;
  right: Phaser.GameObjects.Container;
}

const GAP_BEFORE_WALL = 700;
const WALL_H = 80;

export class RunScene extends Phaser.Scene {
  private caso!: CasoData;
  private track!: Track;
  private crowd!: Crowd;
  private scenery!: Scenery;
  private villain!: Villain;
  private projectiles!: Projectiles;
  private fx!: Fx;
  private cfg!: ProjConfig;
  private gateViews: GateView[] = [];
  private enemies: Enemy[] = [];
  private wall!: Phaser.GameObjects.Container;
  private wallRect!: Phaser.GameObjects.Rectangle;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private wallDist = 0;
  private bossHp = 0;
  private bossHpMax = 0;
  private countText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private tier = 0;
  private fireAcc = 0;
  private calmFactor = 1; // <1 no modo calmo: desacelera tiro junto com a pista
  private targetLaneX = 0; // -1..1
  private heroLaneX = 0;
  private ended = false;
  private running = true;

  constructor() {
    super('RunScene');
  }

  /** lane em px (centro) → laneX normalizado [-1,1] a partir do x do ponteiro */
  private toLaneX(px: number): number {
    const half = this.cfg.halfLaneNear;
    return Phaser.Math.Clamp((px - this.scale.width / 2) / half, -1, 1);
  }

  create(data: { casoId?: string }): void {
    const { themes } = getServices();
    const caso = getCaso(data?.casoId ?? firstCasoId());
    if (!caso) throw new Error(`Caso "${data?.casoId}" não encontrado`);
    this.caso = caso;
    const calm = isCalmMode(getServices().persistence);
    this.track = new Track(effectiveSpeed(caso.speed, calm));
    this.gateViews = [];
    this.enemies = [];
    this.ended = false;
    this.running = true;
    this.tier = 0;
    this.fireAcc = 0;
    this.calmFactor = calm ? CALM_SPEED_FACTOR : 1;

    const W = this.scale.width;
    const H = this.scale.height;
    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));
    this.scenery = new Scenery(this, W, H);

    // config de projeção pseudo-3D (perspectiva suave p/ legibilidade)
    this.cfg = {
      width: W,
      horizonY: H * 0.34,
      heroY: H * 0.82,
      nearScale: 1,
      farScale: 0.3,
      halfLaneNear: W * 0.38,
      halfLaneFar: W * 0.06,
      dHorizon: GAP_BEFORE_WALL + this.maxGateDist() + 200,
    };
    this.targetLaneX = 0;
    this.heroLaneX = 0;

    this.drawRoad();
    this.fx = new Fx(this);
    this.projectiles = new Projectiles(this, this.cfg);

    // multidão (séquito atrás da heroína) — no plano de perto
    const heroPos = project(0, 0, this.cfg);
    this.crowd = new Crowd(
      this,
      heroPos.x,
      heroPos.y,
      caso.start,
      themes.colorNum('accent.primary', 0x22c55e),
      themes.colorNum('outline', 0xffffff),
    );

    // portões
    for (const pair of caso.gates) {
      const left = this.makeGate(pair.left, -0.5, themes);
      const right = this.makeGate(pair.right, 0.5, themes);
      this.gateViews.push({ pair, resolved: false, left, right });
    }

    // inimigos (obstáculos da burocracia)
    for (const e of caso.enemies ?? []) {
      this.enemies.push(new Enemy(this, e, this.cfg));
    }

    // muro / boss
    this.wallDist = this.maxGateDist() + GAP_BEFORE_WALL;
    this.bossHpMax = caso.bossHp ?? 0;
    this.bossHp = this.bossHpMax;
    const laneW = this.cfg.halfLaneNear * 2;
    this.wallRect = this.add
      .rectangle(0, 0, laneW, WALL_H, themes.colorNum('wall', 0x475569))
      .setStrokeStyle(4, themes.colorNum('outline', 0xffffff), 0.3);
    const wallTop = this.add.rectangle(0, -WALL_H / 2 + 6, laneW, 14, themes.colorNum('wall.top', 0x64748b));
    const wallTxt = this.add
      .text(0, 6, `${themes.text('wall.label', 'MURO')}\n${caso.wall}`, { fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: themes.color('outline', '#ffffff'), align: 'center' })
      .setOrigin(0.5);
    // barra de HP do boss (só visível em caso de combate)
    const barBg = this.add.rectangle(0, -WALL_H / 2 - 16, laneW * 0.7, 10, 0x000000, 0.4);
    this.bossBar = this.add
      .rectangle(-(laneW * 0.7) / 2, -WALL_H / 2 - 16, laneW * 0.7, 10, themes.colorNum('gate.bad', 0xef4444))
      .setOrigin(0, 0.5);
    if (this.bossHpMax <= 0) {
      barBg.setVisible(false);
      this.bossBar.setVisible(false);
    }
    this.wall = this.add.container(W / 2, -300, [this.wallRect, wallTop, wallTxt, barBg, this.bossBar]);
    this.villain = new Villain(this, W / 2, -300 - WALL_H / 2);

    // HUD
    this.add.rectangle(W / 2, 0, W, H * 0.17, themes.colorNum('bg.base', 0x0b1020), 0.92).setOrigin(0.5, 0).setDepth(9);
    this.add.rectangle(W / 2, H * 0.17, W, 2, themes.colorNum('outline', 0xffffff), 0.15).setOrigin(0.5, 0.5).setDepth(9);
    this.add.text(W / 2, H * 0.02, caso.name, { fontFamily: 'Arial', fontSize: '22px', color: themes.color('text', '#e2e8f0') }).setOrigin(0.5, 0).setDepth(10);
    this.countText = this.add
      .text(W / 2, H * 0.08, `${caso.start}`, { fontFamily: 'Arial', fontSize: '72px', fontStyle: 'bold', color: themes.color('accent.primary', '#22c55e') })
      .setOrigin(0.5)
      .setDepth(10);
    this.add.text(W / 2, H * 0.145, themes.text('card.metric', 'PROVAS'), { fontFamily: 'Arial', fontSize: '22px', color: themes.color('text.muted', '#94a3b8') }).setOrigin(0.5).setDepth(10);
    // indicador de ARMA (eixo qualidade)
    this.weaponText = this.add
      .text(W * 0.97, H * 0.055, `${themes.text('hud.weapon', 'ARMA')}\n${tierLabel(this.tier)}`, { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: themes.color('leader.accent', '#e8b923'), align: 'right' })
      .setOrigin(1, 0)
      .setDepth(10);

    // input: arrasta a heroína (lane)
    const { audio } = getServices();
    const steer = (p: Phaser.Input.Pointer): void => {
      if (!this.running) return;
      this.targetLaneX = this.toLaneX(p.x);
    };
    this.input.on('pointermove', steer);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      audio.startMusic();
      steer(p);
    });

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

  private maxGateDist(): number {
    return this.caso.gates.length ? Math.max(...this.caso.gates.map((g) => g.dist)) : 0;
  }

  /** pista em perspectiva (trapézio estático) — vende o pseudo-3D sob os elementos projetados */
  private drawRoad(): void {
    const { themes } = getServices();
    const g = this.add.graphics().setDepth(0);
    const cx = this.cfg.width / 2;
    const yNear = this.cfg.heroY + 80;
    const yFar = this.cfg.horizonY;
    const wNear = this.cfg.halfLaneNear * 1.25;
    const wFar = this.cfg.halfLaneFar * 1.6;
    g.fillStyle(themes.colorNum('ground', 0x0d1730), 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(cx - wFar, yFar),
        new Phaser.Math.Vector2(cx + wFar, yFar),
        new Phaser.Math.Vector2(cx + wNear, yNear),
        new Phaser.Math.Vector2(cx - wNear, yNear),
      ],
      true,
    );
    g.lineStyle(3, themes.colorNum('outline', 0xffffff), 0.12);
    g.beginPath();
    g.moveTo(cx - wFar, yFar);
    g.lineTo(cx - wNear, yNear);
    g.moveTo(cx + wFar, yFar);
    g.lineTo(cx + wNear, yNear);
    g.strokePath();
  }

  /** portão num lado (laneX) — estilo difere se for de PROVAS (verde/vermelho) ou ARMA (dourado) */
  private makeGate(op: GateOp, laneX: number, themes: ThemeManager): Phaser.GameObjects.Container {
    const weaponGate = isWeaponGate(op);
    const color = weaponGate
      ? themes.colorNum('leader.accent', 0xe8b923)
      : isGoodOp(op)
        ? themes.colorNum('gate.good', 0x22c55e)
        : themes.colorNum('gate.bad', 0xef4444);
    const w = this.cfg.halfLaneNear * 0.8;
    const rect = this.add.rectangle(0, 0, w, 70, color, 0.85);
    const ink = themes.color('outline', '#ffffff');
    const head = weaponGate ? `ARMA ${op.weapon! > 0 ? '↑' : '↓'}` : `${opSign(op)}${op.value}`;
    const sign = this.add.text(0, -8, head, { fontFamily: 'Arial', fontSize: '32px', fontStyle: 'bold', color: ink }).setOrigin(0.5);
    const label = this.add.text(0, 26, op.label, { fontFamily: 'Arial', fontSize: '15px', color: ink }).setOrigin(0.5);
    const c = this.add.container(0, -300, [rect, sign, label]);
    c.setData('laneX', laneX);
    return c;
  }

  override update(_time: number, delta: number): void {
    if (this.ended || !this.running) return;
    this.track.update(delta);
    this.scenery.update(this.track.traveled);
    this.projectiles.update(delta);

    // a heroína (e o séquito) seguem o ponteiro suavemente em lane
    this.heroLaneX = Phaser.Math.Linear(this.heroLaneX, this.targetLaneX, 0.15);
    const heroPos = project(0, this.heroLaneX, this.cfg);
    this.crowd.setX(heroPos.x);

    // portões: posiciona por profundidade + resolve ao cruzar o plano
    for (const gv of this.gateViews) {
      const d = gv.pair.dist - this.track.traveled;
      this.placeGateSide(gv.left, d);
      this.placeGateSide(gv.right, d);
      if (!gv.resolved && d <= 0) {
        gv.resolved = true;
        const side = pickSide(this.heroLaneX, 0); // centro = 0 em laneX
        const op = gateOpFor(gv.pair, side);
        this.applyGate(op);
        const chosen = side === 'left' ? gv.left : gv.right;
        const other = side === 'left' ? gv.right : gv.left;
        chosen.setAlpha(0.3);
        other.setAlpha(0.12);
        this.tweens.add({ targets: chosen, scaleX: chosen.scaleX * 1.15, scaleY: chosen.scaleY * 1.15, duration: 90, yoyo: true });
      }
    }

    // inimigos: posiciona, leva fogo do alvo da frente, e aplica penalidade ao cruzar
    this.updateCombat(delta);

    // muro/boss: posiciona e resolve
    const wallD = this.wallDist - this.track.traveled;
    const wp = project(Math.max(0, wallD), 0, this.cfg);
    this.wall.setPosition(wp.x, wp.y).setScale(wp.scale);
    this.villain.setY(wp.y - (WALL_H / 2) * wp.scale);
    this.villain.image.setScale(wp.scale);
    if (wallD <= 0) {
      this.end(this.bossHpMax > 0 ? this.bossHp <= 0 : resolveWall(this.crowd.count, this.caso.wall));
    }
  }

  private placeGateSide(c: Phaser.GameObjects.Container, d: number): void {
    const laneX = (c.getData('laneX') as number) ?? 0;
    const p = project(Math.max(0, d), laneX, this.cfg);
    c.setPosition(p.x, p.y).setScale(p.scale);
  }

  private applyGate(op: GateOp): void {
    const { audio, themes } = getServices();
    if (isWeaponGate(op)) {
      this.tier = applyWeapon(this.tier, op.weapon!);
      this.weaponText.setText(`${themes.text('hud.weapon', 'ARMA')}\n${tierLabel(this.tier)}`);
      audio.play('good');
      this.tweens.add({ targets: this.weaponText, scale: 1.3, duration: 130, yoyo: true, ease: 'Back.easeOut' });
    } else {
      const good = isGoodOp(op);
      this.crowd.setCount(applyOp(this.crowd.count, op));
      this.countText.setText(`${this.crowd.count}`);
      this.popCount(good);
      audio.play(good ? 'good' : 'bad');
    }
  }

  /** auto-fire + dano por tick no alvo da frente + penalidade de inimigo */
  private updateCombat(delta: number): void {
    const { themes } = getServices();
    const provas = this.crowd.count;

    // posiciona e limpa inimigos
    let target: Enemy | null = null;
    let targetD = Number.POSITIVE_INFINITY;
    for (const e of this.enemies) {
      if (e.resolved) continue;
      const d = e.depth - this.track.traveled;
      e.place(Math.max(0, d));
      if (d <= 0) {
        // chegou vivo? subtrai provas ∝ HP restante
        e.resolved = true;
        if (!e.dead) {
          const pen = enemyPenalty(e.hp);
          if (pen > 0) {
            this.crowd.setCount(Math.max(0, provas - pen));
            this.countText.setText(`${this.crowd.count}`);
            this.popCount(false);
            getServices().audio.play('bad');
          }
        }
        this.fx.paperBurst(e.container.x, e.container.y, themes.colorNum('enemy.accent', 0x9aa3b2));
        e.destroy();
        continue;
      }
      // alvo de fogo = inimigo vivo mais à frente dentro do alcance
      if (!e.dead && d < targetD && d <= FIRE_RANGE) {
        target = e;
        targetD = d;
      }
    }
    this.enemies = this.enemies.filter((e) => !e.resolved);

    // boss entra como alvo quando não há inimigo à frente e está em alcance
    const wallD = this.wallDist - this.track.traveled;
    const bossInRange = this.bossHpMax > 0 && wallD > 0 && wallD <= FIRE_RANGE;

    // dano por tick determinístico — modo calmo desacelera o tiro junto com a pista (coerência §6)
    const cdt = delta * this.calmFactor;
    const dmg = dps(provas, this.tier) * (cdt / 1000);
    if (target) {
      target.damage(dmg);
      this.fx.impactSparks(target.container.x, target.container.y, themes.colorNum('accent.primary', 0x22c55e), 3);
      if (target.dead) {
        target.resolved = true;
        this.fx.paperBurst(target.container.x, target.container.y, themes.colorNum('enemy.accent', 0x9aa3b2));
        target.destroy();
        this.enemies = this.enemies.filter((e) => !e.resolved);
      }
    } else if (bossInRange) {
      this.bossHp = applyDamage(this.bossHp, dmg);
      this.bossBar.scaleX = this.bossHpMax > 0 ? this.bossHp / this.bossHpMax : 0;
      const wp = project(Math.max(0, wallD), 0, this.cfg);
      this.fx.impactSparks(wp.x, wp.y, themes.colorNum('accent.primary', 0x22c55e), 3);
    }

    // cadência visual de tiro (projétil-juice) rumo ao alvo
    this.fireAcc += cdt;
    const interval = fireInterval(provas, this.tier);
    if (this.fireAcc >= interval && (target || bossInRange)) {
      this.fireAcc = 0;
      const aimD = target ? targetD : Math.max(0, wallD);
      this.projectiles.fire(this.heroLaneX, aimD);
      const hp = project(0, this.heroLaneX, this.cfg);
      this.fx.muzzleFlash(hp.x, hp.y - 36, themes.colorNum('projectile.paper', 0xfef9e7));
    }
  }

  private popCount(good: boolean): void {
    const { themes } = getServices();
    const baseColor = themes.color('accent.primary', '#22c55e');
    this.countText.setColor(good ? themes.color('gate.good', '#22c55e') : themes.color('gate.bad', '#ef4444'));
    this.tweens.add({
      targets: this.countText, scale: good ? 1.3 : 0.8, duration: 120, yoyo: true, ease: 'Back.easeOut',
      onComplete: () => this.countText.setColor(baseColor),
    });
  }

  private end(won: boolean): void {
    this.ended = true;
    const { themes, audio } = getServices();
    this.cameras.main.shake(won ? 380 : 260, won ? 0.012 : 0.008);
    this.villain.react(won);
    this.projectiles.destroy();

    if (won) {
      audio.play('break');
      this.breakWall(themes.colorNum('wall', 0x475569));
      this.tweens.add({ targets: this.crowd.container, y: this.crowd.container.y - 80, duration: 350, ease: 'Quad.easeOut' });
      this.time.delayedCall(160, () => audio.play('win'));
    } else {
      audio.play('lose');
      this.tweens.add({ targets: this.wall, scaleY: this.wall.scaleY * 1.12, duration: 90, yoyo: true, repeat: 2 });
      this.tweens.add({ targets: this.crowd.container, y: this.crowd.container.y + 36, duration: 220, yoyo: true, ease: 'Quad.easeOut' });
    }

    const result: RunResult = {
      won, score: this.crowd.count, start: this.caso.start, wall: this.caso.wall,
      casoId: this.caso.id, casoName: this.caso.name, shareText: '',
    };
    result.shareText = buildShareText(result, themes.text('share.emoji', '👵⚖️'));
    this.time.delayedCall(900, () => this.scene.start('ResultScene', { result }));
  }

  private breakWall(color: number): void {
    const { x, y } = this.wall;
    const laneW = this.cfg.halfLaneNear * 2 * this.wall.scaleX;
    this.wall.setVisible(false);
    const pieces = 9;
    for (let i = 0; i < pieces; i++) {
      const px = x - laneW / 2 + (laneW / pieces) * (i + 0.5);
      const frag = this.add.rectangle(px, y, laneW / pieces - 4, 64 * this.wall.scaleY, color).setDepth(15);
      this.tweens.add({
        targets: frag, x: px + Phaser.Math.Between(-180, 180), y: y - Phaser.Math.Between(120, 360),
        angle: Phaser.Math.Between(-220, 220), alpha: 0, duration: 700, ease: 'Cubic.easeOut',
        onComplete: () => frag.destroy(),
      });
    }
  }
}
