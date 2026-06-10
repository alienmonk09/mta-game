import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { allCasos } from '../data/casos';
import type { CasoData } from '../data/CasoData';
import { makeMuteToggle } from './ui';

/** Menu inicial: marca + seletor de casos (data-driven) com recorde por benefício. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { themes, audio } = getServices();
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));

    // destrava áudio + trilha no primeiro toque (política de autoplay)
    this.input.once('pointerdown', () => {
      audio.unlock();
      audio.startMusic();
    });

    this.add
      .text(W / 2, H * 0.1, themes.text('title', 'Exército da Maruzza'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '50px',
        fontStyle: 'bold',
        color: themes.color('accent.primary', '#22c55e'),
        align: 'center',
        wordWrap: { width: W * 0.86 },
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.2, themes.text('subtitle', ''), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: themes.color('text.muted', '#94a3b8'),
        align: 'center',
        wordWrap: { width: W * 0.8 },
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.31, 'Escolha o caso:', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: themes.color('text', '#e2e8f0'),
      })
      .setOrigin(0.5);

    const casos = allCasos();
    const cardH = 120;
    const gap = 20;
    const top = H * 0.37;
    casos.forEach((caso, i) => {
      this.makeCasoCard(caso, W / 2, top + cardH / 2 + i * (cardH + gap), W * 0.86, cardH);
    });

    makeMuteToggle(this, W - 50, 50);

    this.add
      .text(W / 2, H * 0.97, `skin: ${themes.id}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: themes.color('text.muted', '#64748b'),
      })
      .setOrigin(0.5);
  }

  private makeCasoCard(caso: CasoData, cx: number, cy: number, w: number, h: number): void {
    const { themes, audio, persistence } = getServices();
    const accent = themes.colorNum('accent.secondary', 0x6366f1);
    const hs = persistence.getHighScore(caso.id);

    const card = this.add
      .rectangle(cx, cy, w, h, accent, 0.14)
      .setStrokeStyle(2, accent, 0.55)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx, cy - 22, caso.name, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: themes.color('text', '#e2e8f0'),
        align: 'center',
        wordWrap: { width: w * 0.92 },
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 34, hs > 0 ? `🏆 recorde: ${hs}` : '▶ jogar', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: hs > 0 ? themes.color('accent.primary', '#22c55e') : themes.color('text.muted', '#94a3b8'),
      })
      .setOrigin(0.5);

    card.on('pointerover', () => card.setFillStyle(accent, 0.28));
    card.on('pointerout', () => card.setFillStyle(accent, 0.14));
    card.on('pointerdown', () => {
      audio.unlock();
      audio.startMusic();
      audio.play('tap');
      this.scene.start('RunScene', { casoId: caso.id });
    });
  }
}
