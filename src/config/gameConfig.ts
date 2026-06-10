import Phaser from 'phaser';

export const BASE_WIDTH = 720;
export const BASE_HEIGHT = 1280;

export interface GameConfigOptions {
  scenes: Array<new (...args: any[]) => Phaser.Scene>;
  parent?: string;
  backgroundColor?: string;
}

/** Config mobile-first (retrato 9:16), escala FIT centralizada. */
export function createGameConfig(opts: GameConfigOptions): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: opts.parent ?? 'game',
    backgroundColor: opts.backgroundColor ?? '#0b1020',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
    },
    render: { antialias: true },
    scene: opts.scenes,
  };
}
