import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { firstCasoId } from '../data/casos';

/**
 * Menu inicial. Prova viva da Fase 0: renderiza título, subtítulo e uma faixa
 * de paleta lida do tema ativo — demonstrando o sistema de skins funcionando.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { themes } = getServices();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));

    this.add
      .text(width / 2, height * 0.24, themes.text('title', 'Exército da Maruzza'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: themes.color('accent.primary', '#22c55e'),
        align: 'center',
        wordWrap: { width: width * 0.82 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.4, themes.text('subtitle', ''), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: themes.color('text.muted', '#94a3b8'),
        align: 'center',
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5);

    // faixa de paleta — comprova que o tema está vivo
    const tokens = ['gate.good', 'gate.bad', 'accent.secondary', 'wall', 'accent.primary'];
    const sw = 92;
    const gap = 14;
    const total = tokens.length * sw + (tokens.length - 1) * gap;
    let x = width / 2 - total / 2 + sw / 2;
    for (const token of tokens) {
      this.add.rectangle(x, height * 0.52, sw, sw, themes.colorNum(token, 0x333333)).setOrigin(0.5);
      x += sw + gap;
    }

    const btn = this.add
      .text(width / 2, height * 0.68, themes.text('play', '▶ JOGAR'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: themes.color('bg.base', '#0b1020'),
        backgroundColor: themes.color('accent.primary', '#22c55e'),
        padding: { x: 36, y: 18 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    btn.once('pointerdown', () => {
      this.scene.start('RunScene', { casoId: firstCasoId() });
    });

    this.add
      .text(width / 2, height * 0.95, `skin ativa: ${themes.id}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: themes.color('text.muted', '#64748b'),
      })
      .setOrigin(0.5);
  }
}
