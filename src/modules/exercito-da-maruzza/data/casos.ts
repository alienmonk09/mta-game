import type { CasoData } from './CasoData';

/**
 * Registro de casos via glob — adicionar um arquivo em casos/*.json basta,
 * sem tocar em código (conteúdo data-driven, ver roadmap §2.3).
 */
const modules = import.meta.glob<{ default: CasoData }>('./casos/*.json', { eager: true });

const registry: Record<string, CasoData> = {};
for (const path of Object.keys(modules)) {
  const data = modules[path].default;
  registry[data.id] = data;
}

export function getCaso(id: string): CasoData | undefined {
  return registry[id];
}

export function firstCasoId(): string {
  const ids = Object.keys(registry);
  if (ids.length === 0) throw new Error('Nenhum caso cadastrado em data/casos/');
  return ids[0];
}

export function allCasoIds(): string[] {
  return Object.keys(registry);
}
