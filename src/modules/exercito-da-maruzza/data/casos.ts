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

/** Todos os casos ordenados por dificuldade (campo `order`), depois por nome. */
export function allCasos(): CasoData[] {
  return Object.values(registry).sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

export function firstCasoId(): string {
  const casos = allCasos();
  if (casos.length === 0) throw new Error('Nenhum caso cadastrado em data/casos/');
  return casos[0].id;
}

export function allCasoIds(): string[] {
  return allCasos().map((c) => c.id);
}
