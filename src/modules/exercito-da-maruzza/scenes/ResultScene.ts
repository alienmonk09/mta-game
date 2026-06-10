import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import type { RunResult } from '../../../core/types';
import { makeButton, makeMuteToggle } from './ui';
import { statusLabel, summaryLine, buildCardContent } from '../systems/card';

/** Tela final: resultado, recorde, card viral e o que fazer a seguir. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: { result: RunResult }): void {
    const { themes, persistence, share } = getServices();
    const result = data.result;
    const W = this.scale.width;
    const H = this.scale.height;

    const isRecord = persistence.setHighScore(result.casoId, result.score);
    const best = persistence.getHighScore(result.casoId);
    const statusColor = result.won ? themes.color('gate.good', '#22c55e') : themes.color('gate.bad', '#ef4444');

    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));

    if (result.won) this.confetti();

    // status (enquadrado como jogo, nunca veredito jurídico)
    this.add
      .text(W / 2, H * 0.16, statusLabel(result.won), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '54px',
        fontStyle: 'bold',
        align: 'center',
        color: statusColor,
        wordWrap: { width: W * 0.88 },
      })
      .setOrigin(0.5)
      .setDepth(5);

    // número de provas (com count-up)
    const counter = { n: result.start };
    const numberText = this.add
      .text(W / 2, H * 0.34, `${result.start}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '120px',
        fontStyle: 'bold',
        color: themes.color('text', '#e2e8f0'),
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: counter,
      n: result.score,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: () => numberText.setText(Math.round(counter.n).toLocaleString('pt-BR')),
      onComplete: () => numberText.setText(result.score.toLocaleString('pt-BR')),
    });
    this.add
      .text(W / 2, H * 0.41, 'PROVAS', { fontFamily: 'Arial, sans-serif', fontSize: '26px', color: themes.color('text.muted', '#94a3b8') })
      .setOrigin(0.5)
      .setDepth(5);

    // caso + muro
    this.add
      .text(W / 2, H * 0.47, result.casoName, { fontFamily: 'Arial, sans-serif', fontSize: '26px', color: themes.color('text', '#e2e8f0'), align: 'center', wordWrap: { width: W * 0.85 } })
      .setOrigin(0.5)
      .setDepth(5);
    this.add
      .text(W / 2, H * 0.515, summaryLine(result), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: themes.color('text.muted', '#94a3b8'),
      })
      .setOrigin(0.5)
      .setDepth(5);

    // recorde
    if (isRecord) {
      const badge = this.add
        .text(W / 2, H * 0.585, '🏆 NOVO RECORDE!', { fontFamily: 'Arial, sans-serif', fontSize: '34px', fontStyle: 'bold', color: themes.color('accent.primary', '#22c55e') })
        .setOrigin(0.5)
        .setDepth(5);
      this.tweens.add({ targets: badge, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.add
        .text(W / 2, H * 0.585, `🏆 Recorde: ${best.toLocaleString('pt-BR')}`, { fontFamily: 'Arial, sans-serif', fontSize: '26px', color: themes.color('text.muted', '#94a3b8') })
        .setOrigin(0.5)
        .setDepth(5);
    }

    // ações
    makeButton(this, W / 2, H * 0.7, '📤 Compartilhar', () => void share.share(buildCardContent(result)), {
      bg: 'accent.primary',
      fg: 'bg.base',
    }).setDepth(5);
    makeButton(this, W / 2, H * 0.79, '↺ Jogar de novo', () => this.scene.start('RunScene', { casoId: result.casoId }), {
      bg: 'accent.secondary',
      fg: 'text',
    }).setDepth(5);
    makeButton(this, W / 2, H * 0.875, '🏠 Menu', () => this.scene.start('MenuScene'), {
      bg: 'wall',
      fg: 'text',
    }).setDepth(5);

    makeMuteToggle(this, W - 50, 50);
  }

  private confetti(): void {
    const { themes } = getServices();
    const W = this.scale.width;
    const colors = [
      themes.colorNum('accent.primary', 0x22c55e),
      themes.colorNum('accent.secondary', 0x6366f1),
      themes.colorNum('gate.good', 0x22c55e),
      themes.colorNum('text', 0xe2e8f0),
    ];
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, W);
      const size = Phaser.Math.Between(8, 18);
      const piece = this.add
        .rectangle(x, Phaser.Math.Between(-200, -20), size, size, Phaser.Utils.Array.GetRandom(colors))
        .setDepth(1)
        .setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: piece,
        y: this.scale.height + 40,
        angle: piece.angle + Phaser.Math.Between(180, 540),
        delay: Phaser.Math.Between(0, 700),
        duration: Phaser.Math.Between(1800, 3000),
        ease: 'Cubic.easeIn',
        onComplete: () => piece.destroy(),
      });
    }
  }
}
