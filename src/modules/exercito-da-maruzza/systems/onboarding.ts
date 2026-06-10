import Phaser from 'phaser';
import type { Persistence } from '../../../core/services/Persistence';
import { getServices } from '../../../core/services';

/** Só mostra na primeira partida (flag persistida 'onboarded'). */
export function shouldShowOnboarding(p: Persistence): boolean {
  return !p.getFlag('onboarded');
}

/** Marca que o jogador já viu o onboarding. */
export function markOnboarded(p: Persistence): void {
  p.setFlag('onboarded', true);
}

/**
 * Overlay de onboarding 1-toque por cima de tudo (depth >= 100).
 * Enquadrado como JOGO — nunca conselho jurídico. Texto grande e de alto
 * contraste para acessibilidade (idoso). 1º toque dispensa e chama onDismiss.
 */
export function showOnboarding(scene: Phaser.Scene, onDismiss: () => void): void {
  const { themes } = getServices();
  const W = scene.scale.width;
  const H = scene.scale.height;

  const container = scene.add.container(0, 0).setDepth(100);

  // fundo escuro semi-transparente, interativo p/ capturar o toque
  const veil = scene.add
    .rectangle(0, 0, W, H, themes.colorNum('bg.base', 0x0b1020), 0.82)
    .setOrigin(0, 0)
    .setInteractive();

  const title = scene.add
    .text(W / 2, H * 0.28, themes.text('onboarding.title', 'Como jogar'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '52px',
      fontStyle: 'bold',
      color: themes.color('text', '#e2e8f0'),
      align: 'center',
    })
    .setOrigin(0.5);

  const instruction = scene.add
    .text(
      W / 2,
      H * 0.46,
      themes.text(
        'onboarding.body',
        'Arraste o dedo 👆 e leve a turma pelos portões que SOMAM e MULTIPLICAM (+ e ×, verdes). Fuja dos que subtraem e dividem (− e ÷, vermelhos).',
      ),
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        color: themes.color('text', '#e2e8f0'),
        align: 'center',
        wordWrap: { width: W * 0.86 },
      },
    )
    .setOrigin(0.5);

  // ícone simples de toque/mão
  const icon = scene.add
    .text(W / 2, H * 0.66, '👆', { fontFamily: 'Arial, sans-serif', fontSize: '72px' })
    .setOrigin(0.5);

  const cta = scene.add
    .text(W / 2, H * 0.78, themes.text('onboarding.cta', '▶ Toque para começar'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: themes.color('gate.good', '#22c55e'),
      align: 'center',
    })
    .setOrigin(0.5);

  // pulsa o CTA pra chamar a atenção
  scene.tweens.add({
    targets: cta,
    scale: 1.12,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  container.add([veil, title, instruction, icon, cta]);

  // 1º toque em qualquer ponto: dispensa e segue o jogo
  veil.once('pointerdown', () => {
    container.destroy();
    onDismiss();
  });
}
