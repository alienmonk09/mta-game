import { describe, it, expect } from 'vitest';
import themeJson from '../../../../../public/themes/flat-default/theme.json';

/**
 * O card viral e a tela de resultado leem a copy do tema. Como o card é o
 * artefato mais compartilhável (sai do contexto de jogo), a copy NUNCA pode
 * soar como veredito/promessa jurídica (cuidado OAB). Este teste trava isso.
 */
const copy = (themeJson as { copy: Record<string, string> }).copy;

// frases que insinuam resultado jurídico real
const FORBIDDEN = /benef[ií]cio concedido|concedid|defere|deferid|voc[eê] tem direito|garantid/i;

describe('copy OAB-safe (tema flat-default)', () => {
  const keys = ['result.win', 'result.lose', 'card.brand', 'card.subtitle', 'card.metric', 'card.viral', 'card.footnote'];

  for (const key of keys) {
    it(`"${key}" não promete/insinua resultado jurídico`, () => {
      const value = copy[key];
      expect(value, `copy["${key}"] ausente no tema`).toBeTruthy();
      expect(FORBIDDEN.test(value), `copy["${key}"] = "${value}" soa como veredito jurídico`).toBe(false);
    });
  }

  it('vitória é enquadrada como jogo (fala do muro)', () => {
    expect(copy['result.win'].toLowerCase()).toContain('muro');
  });
});
