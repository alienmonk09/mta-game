import type Phaser from 'phaser';
import type { GameModule } from '../../core/GameModule';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { RunScene } from './scenes/RunScene';

const exercitoModule: GameModule = {
  id: 'exercito-da-maruzza',
  meta: { name: 'Exército da Maruzza', genre: 'crowd-runner', minEngine: 'phaser@4' },
  bootSceneKey: 'BootScene',
  scenes(): Array<new (...args: any[]) => Phaser.Scene> {
    return [BootScene, MenuScene, RunScene];
  },
};

export default exercitoModule;
