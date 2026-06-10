import type { Theme } from '../types';

/**
 * Carrega e resolve a skin ativa. Arte é DADO (ver docs/roadmap.md §2.2):
 * a lógica referencia chaves lógicas; o ThemeManager resolve para o tema ativo.
 */
export class ThemeManager {
  private theme: Theme | null = null;
  private activeId = 'flat-default';

  async load(id: string): Promise<Theme> {
    const url = `${import.meta.env.BASE_URL}themes/${id}/theme.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Tema "${id}" não encontrado (HTTP ${res.status})`);
    this.theme = (await res.json()) as Theme;
    this.activeId = id;
    return this.theme;
  }

  get id(): string {
    return this.activeId;
  }

  get current(): Theme {
    if (!this.theme) throw new Error('Nenhum tema carregado — chame load() no boot.');
    return this.theme;
  }

  /** cor em string hex (#rrggbb) */
  color(token: string, fallback = '#000000'): string {
    return this.theme?.palette[token] ?? fallback;
  }

  /** cor como número (0xrrggbb) para APIs do Phaser */
  colorNum(token: string, fallback = 0x000000): number {
    const c = this.theme?.palette[token];
    return c ? parseInt(c.replace('#', ''), 16) : fallback;
  }

  /** texto/copy do tema */
  text(key: string, fallback = ''): string {
    return this.theme?.copy[key] ?? fallback;
  }
}
