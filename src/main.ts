import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { createServices } from './core/services';
import { ModuleRegistry } from './core/ModuleRegistry';
import exercitoModule from './modules/exercito-da-maruzza';

async function bootstrap(): Promise<void> {
  const services = createServices();
  await services.themes.load('flat-default'); // skin inicial (cartoon flat)

  const registry = new ModuleRegistry();
  registry.register(exercitoModule);

  const active = registry.get('exercito-da-maruzza');
  if (!active) throw new Error('Módulo ativo não encontrado no registry.');

  const config = createGameConfig({
    scenes: active.scenes(),
    backgroundColor: services.themes.color('bg.base', '#0b1020'),
  });

  const game = new Phaser.Game(config);
  game.registry.set('activeModule', active.id);

  // hook para testes headless (smoke). Inofensivo em produção.
  (window as unknown as { __MTA_GAME__?: Phaser.Game }).__MTA_GAME__ = game;
}

void bootstrap();
