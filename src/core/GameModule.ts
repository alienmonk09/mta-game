import type Phaser from 'phaser';
import type { RunResult } from './types';

export interface ModuleMeta {
  name: string;
  genre: string;
  minEngine: string;
}

/**
 * Contrato de um jogo/mini-jogo. O Hub futuro hospeda qualquer GameModule
 * sem conhecer seus internos (ver docs/roadmap.md §2.1).
 */
export interface GameModule {
  id: string;
  meta: ModuleMeta;
  /** classes de cena que este módulo fornece (a primeira deve ser a de boot) */
  scenes(): Array<new (...args: any[]) => Phaser.Scene>;
  /** key da cena inicial do módulo */
  bootSceneKey: string;
  /** o hub registra aqui para receber o resultado de uma run */
  onResult?(cb: (result: RunResult) => void): void;
}
