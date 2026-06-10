import Phaser from 'phaser';
import { getServices } from '../../../core/services';

/** quantas colunas decorativas por lado (recicladas, nunca recriadas) */
const PILLARS_PER_SIDE = 5;
/** espaçamento vertical entre colunas do mesmo lado */
const PILLAR_GAP = 360;
/** velocidade do parallax: fração de `traveled` que a decoração desce */
const PARALLAX = 0.55;

/**
 * Cenário de fundo com profundidade: céu em gradiente, faixa de chão e
 * silhuetas laterais ("colunas de tribunal") em parallax. Tudo decorativo,
 * em depths negativos, atrás de portões/multidão (0) e HUD (10).
 */
export class Scenery {
  private readonly pillars: Phaser.GameObjects.Rectangle[] = [];
  /** Y "virtual" de cada coluna, antes do módulo de reciclagem */
  private readonly baseY: number[] = [];
  /** altura total do ciclo de reciclagem (uma pilha por lado) */
  private readonly cycle: number;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const { themes } = getServices();

    // céu: gradiente vertical bg.top (topo) -> bg.base (base)
    const top = themes.colorNum('bg.top', 0x1b2a55);
    const base = themes.colorNum('bg.base', 0x0b1020);
    const sky = scene.add.graphics().setDepth(-20);
    sky.fillGradientStyle(top, top, base, base, 1);
    sky.fillRect(0, 0, width, height);

    // chão: faixa inferior + linha de horizonte sutil
    const groundTop = height * 0.78;
    const ground = scene.add.graphics().setDepth(-19);
    ground.fillStyle(themes.colorNum('ground', 0x0d1730), 1);
    ground.fillRect(0, groundTop, width, height - groundTop);
    ground.lineStyle(2, themes.colorNum('outline', 0xffffff), 0.12);
    ground.lineBetween(0, groundTop, width, groundTop);

    // colunas laterais em parallax (conjunto fixo, só reposicionado no update)
    const decor = themes.colorNum('decor', 0x1e293b);
    const colW = 54;
    const colH = 220;
    const margin = 46; // distância das bordas, fora das lanes
    const sides = [margin + colW / 2, width - margin - colW / 2];
    this.cycle = PILLARS_PER_SIDE * PILLAR_GAP;

    sides.forEach((x) => {
      for (let i = 0; i < PILLARS_PER_SIDE; i++) {
        const r = scene.add
          .rectangle(x, 0, colW, colH, decor, 0.5)
          .setDepth(-15);
        // contorno sutil pra destacar a silhueta do fundo
        r.setStrokeStyle(2, themes.colorNum('outline', 0xffffff), 0.08);
        this.pillars.push(r);
        // espaça as colunas ao longo do ciclo (topo = mais ao fundo)
        this.baseY.push(-colH + i * PILLAR_GAP);
      }
    });
  }

  /** move o parallax conforme a multidão avança; recicla por módulo */
  update(traveled: number): void {
    const offset = (traveled * PARALLAX) % this.cycle;
    this.pillars.forEach((r, idx) => {
      // desce com o avanço e recicla quando sai pela base
      let y = this.baseY[idx] + offset;
      // mantém dentro de [-cycle, height] reposicionando no topo
      y = ((y + this.cycle) % this.cycle) - r.height;
      r.y = y;
    });
  }
}
