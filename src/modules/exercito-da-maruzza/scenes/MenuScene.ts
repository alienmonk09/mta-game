import Phaser from 'phaser';
import { getServices } from '../../../core/services';
import { allCasos } from '../data/casos';
import type { CasoData } from '../data/CasoData';
import { makeMuteToggle } from './ui';
import { isCalmMode, setCalmMode } from '../systems/settings';

/** Menu inicial: marca + seletor de casos (data-driven) com recorde por benefício. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { themes, audio } = getServices();
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(themes.color('bg.base', '#0b1020'));

    // backdrop: gradiente de céu (beleza sem poluir a leitura dos cards)
    this.add
      .graphics()
      .setDepth(-10)
      .fillGradientStyle(
        themes.colorNum('bg.top', 0x1b2a55),
        themes.colorNum('bg.top', 0x1b2a55),
        themes.colorNum('bg.base', 0x0b1020),
        themes.colorNum('bg.base', 0x0b1020),
        1,
      )
      .fillRect(0, 0, W, H);

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
      .text(W / 2, H * 0.31, themes.text('menu.pick', 'Escolha o caso:'), {
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
    this.makeCalmToggle(20, 28);

    this.makeSkinToggle(W / 2, H * 0.955);
  }

  /** Seletor de skin (flat ↔ bumba-boi): troca o tema a quente, persiste e recarrega o menu. */
  private makeSkinToggle(cx: number, cy: number): void {
    const { themes, audio, persistence } = getServices();
    const names: Record<string, string> = { 'flat-default': 'Flat', 'bumba-boi': 'Bumba meu boi' };
    const name = names[themes.id] ?? themes.id;
    const t = this.add
      .text(cx, cy, `🎨 Skin: ${name}  ·  tocar p/ trocar`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: themes.color('text', '#e2e8f0'),
        backgroundColor: themes.color('accent.secondary', '#6366f1'),
        padding: { x: 14, y: 9 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);
    t.on('pointerdown', () => {
      audio.unlock();
      audio.play('tap');
      t.disableInteractive(); // guard de reentrância: ignora toques durante o load async
      const next = themes.id === 'bumba-boi' ? 'flat-default' : 'bumba-boi';
      void (async () => {
        try {
          await themes.load(next);
          persistence.setString('skin', next);
        } catch {
          /* skin inválida: mantém a atual */
        }
        this.scene.restart();
      })();
    });
  }

  /** Toggle de modo calmo (acessibilidade): pista mais lenta para o idoso, persistido. */
  private makeCalmToggle(x: number, y: number): void {
    const { themes, audio, persistence } = getServices();
    const onColor = themes.color('accent.primary', '#22c55e');
    const offColor = themes.color('wall', '#475569');
    const base = themes.text('calm.label', '🐢 Modo calmo');
    const label = (): string => `${base}: ${isCalmMode(persistence) ? 'ON' : 'OFF'}`;
    const t = this.add
      .text(x, y, label(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: themes.color('text', '#e2e8f0'),
        backgroundColor: isCalmMode(persistence) ? onColor : offColor,
        padding: { x: 14, y: 9 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);
    t.on('pointerdown', () => {
      audio.unlock();
      audio.play('tap');
      setCalmMode(persistence, !isCalmMode(persistence));
      t.setText(label()).setBackgroundColor(isCalmMode(persistence) ? onColor : offColor);
    });
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
      .text(cx, cy + 34, hs > 0 ? `${themes.text('card.record', '🏆 recorde:')} ${hs}` : themes.text('card.play', '▶ jogar'), {
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
