import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';
import { createServices } from './core/services';
import { ModuleRegistry } from './core/ModuleRegistry';
import exercitoModule from './modules/exercito-da-maruzza';

async function bootstrap(): Promise<void> {
  const services = createServices();
  // skin persistida (default cartoon flat); cai pro flat se a skin salva falhar
  const savedSkin = services.persistence.getString('skin', 'flat-default');
  try {
    await services.themes.load(savedSkin);
  } catch {
    await services.themes.load('flat-default');
    services.persistence.setString('skin', 'flat-default'); // auto-cura: não insiste numa skin inválida a cada boot
  }

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

  // hooks para testes headless (smoke). Inofensivos em produção.
  const w = window as unknown as { __MTA_GAME__?: Phaser.Game; __MTA_SERVICES__?: typeof services };
  w.__MTA_GAME__ = game;
  w.__MTA_SERVICES__ = services;
}

void bootstrap();
