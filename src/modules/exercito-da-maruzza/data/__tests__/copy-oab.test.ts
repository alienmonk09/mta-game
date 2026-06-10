import { describe, it, expect } from 'vitest';
import flat from '../../../../../public/themes/flat-default/theme.json';
import boi from '../../../../../public/themes/bumba-boi/theme.json';

/**
 * Contrato de skin (roadmap §2.2): arte/copy é DADO. Toda skin preenche os MESMOS
 * tokens lógicos (parity) e, como o card viral sai do contexto de jogo, a copy
 * NUNCA pode soar como veredito/promessa jurídica (cuidado OAB). Travado p/ todas as skins.
 */
type Theme = { palette: Record<string, string>; copy: Record<string, string> };
const THEMES: Record<string, Theme> = {
  'flat-default': flat as Theme,
  'bumba-boi': boi as Theme,
};

// frases que insinuam resultado jurídico real
const FORBIDDEN = /benef[ií]cio concedido|concedid|defere|deferid|voc[eê] tem direito|garantid/i;
const OAB_KEYS = ['result.win', 'result.lose', 'card.brand', 'card.subtitle', 'card.metric', 'card.viral', 'card.footnote'];

describe.each(Object.entries(THEMES))('copy OAB-safe (tema %s)', (_id, theme) => {
  for (const key of OAB_KEYS) {
    it(`"${key}" não promete/insinua resultado jurídico`, () => {
      const value = theme.copy[key];
      expect(value, `copy["${key}"] ausente`).toBeTruthy();
      expect(FORBIDDEN.test(value), `copy["${key}"] = "${value}" soa como veredito jurídico`).toBe(false);
    });
  }

  it('vitória é enquadrada como jogo (fala do muro)', () => {
    expect(theme.copy['result.win'].toLowerCase()).toContain('muro');
  });
});

describe('parity de tokens entre skins (a skin não pode "esquecer" um token)', () => {
  const flatPalette = Object.keys(flat.palette);
  const flatCopy = Object.keys(flat.copy);

  for (const [id, theme] of Object.entries(THEMES)) {
    it(`skin "${id}" tem todos os tokens de paleta do contrato`, () => {
      const missing = flatPalette.filter((k) => !(k in theme.palette));
      expect(missing, `paleta sem tokens: ${missing.join(', ')}`).toEqual([]);
    });
    it(`skin "${id}" tem todas as chaves de copy do contrato`, () => {
      const missing = flatCopy.filter((k) => !(k in theme.copy));
      expect(missing, `copy sem chaves: ${missing.join(', ')}`).toEqual([]);
    });
  }
});
