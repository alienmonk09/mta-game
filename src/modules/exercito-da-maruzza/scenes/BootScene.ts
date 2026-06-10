import Phaser from 'phaser';

/** Tema já é carregado no bootstrap (main.ts). Aqui só seguimos pro menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
