import type Phaser from 'phaser';
import { getServices } from '../../../core/services';

export interface ButtonOpts {
  /** token de cor do fundo (default accent.secondary) */
  bg?: string;
  /** token de cor do texto (default text) */
  fg?: string;
  fontSize?: string;
}

/** Botão grande e tocável (acessível p/ idoso) com hover, som de toque e tween. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Phaser.GameObjects.Text {
  const { themes, audio } = getServices();
  const btn = scene.add
    .text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: opts.fontSize ?? '36px',
      fontStyle: 'bold',
      color: themes.color(opts.fg ?? 'text', '#e2e8f0'),
      backgroundColor: themes.color(opts.bg ?? 'accent.secondary', '#6366f1'),
      align: 'center',
      padding: { x: 30, y: 16 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  btn.on('pointerover', () => btn.setScale(1.06));
  btn.on('pointerout', () => btn.setScale(1));
  btn.on('pointerdown', () => {
    audio.unlock();
    audio.play('tap');
    onClick();
  });
  return btn;
}

/** Botão de mute (🔊/🔇), persistido pelo AudioManager. */
export function makeMuteToggle(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Text {
  const { themes, audio } = getServices();
  const glyph = (): string => (audio.isMuted ? '🔇' : '🔊');
  const t = scene.add
    .text(x, y, glyph(), { fontFamily: 'Arial, sans-serif', fontSize: '36px', color: themes.color('text.muted', '#94a3b8') })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(50);
  t.on('pointerdown', () => {
    audio.unlock();
    audio.toggleMuted();
    audio.play('tap');
    t.setText(glyph());
  });
  return t;
}
