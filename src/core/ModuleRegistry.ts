import type { GameModule } from './GameModule';

/** Registro de módulos — base do Hub (Fase 5). */
export class ModuleRegistry {
  private modules = new Map<string, GameModule>();

  register(module: GameModule): this {
    this.modules.set(module.id, module);
    return this;
  }

  get(id: string): GameModule | undefined {
    return this.modules.get(id);
  }

  all(): GameModule[] {
    return [...this.modules.values()];
  }
}
