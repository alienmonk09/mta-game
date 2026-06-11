import Phaser from 'phaser';

/**
 * Arte flat PROCEDURAL (zero-asset, como o áudio sintetizado): gera texturas de
 * "pessoinhas" cartoon via Phaser.Graphics e devolve a chave da textura. As cores
 * vêm do tema (skin trocável — ver roadmap §2.2), então a mesma lógica produz
 * arte diferente por skin sem tocar no código.
 *
 * Uso típico:
 *   const key = personTexture(scene, { body, skin, outline });
 *   scene.add.image(x, y, key);
 *
 * Idempotente: a chave embute as cores, então regerar (ex: restart de cena) é no-op.
 */

export interface FigureColors {
  /** corpo/roupa */
  body: number;
  /** pele (cabeça) */
  skin: number;
  /** contorno (contraste — acessibilidade) */
  outline: number;
  /** cabelo (opcional; default deriva do contorno) */
  hair?: number;
  /** detalhe/acento (gravata, broche, viseira) */
  accent?: number;
}

/** Dimensões nativas de cada textura (px) — para layout/espaçamento. */
export const FIGURE = {
  person: { w: 34, h: 46 },
  leader: { w: 44, h: 60 },
  villain: { w: 48, h: 64 },
} as const;

const STROKE = 3;

function key(kind: string, c: FigureColors): string {
  // -1 como sentinela de "ausente" (0 é cor válida: preto puro não pode colidir)
  return `fig:${kind}:${c.body}:${c.skin}:${c.outline}:${c.hair ?? -1}:${c.accent ?? -1}`;
}

/** desenha + estiliza um retângulo arredondado num Graphics */
function blob(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, fill: number, outline: number): void {
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(STROKE, outline, 1);
  g.strokeRoundedRect(x, y, w, h, r);
}

function circle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, fill: number, outline: number): void {
  g.fillStyle(fill, 1);
  g.fillCircle(cx, cy, r);
  g.lineStyle(STROKE, outline, 1);
  g.strokeCircle(cx, cy, r);
}

/** gera a textura `k` desenhando via `draw`, se ainda não existir. Devolve `k`. */
function bake(scene: Phaser.Scene, k: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): string {
  if (scene.textures.exists(k)) return k;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(k, w, h);
  g.destroy();
  return k;
}

/** Segurado comum (follower): cabeça + tronco arredondado + perninhas. Front-facing, amigável. */
export function personTexture(scene: Phaser.Scene, c: FigureColors): string {
  const k = key('person', c);
  const { w, h } = FIGURE.person;
  const hair = c.hair ?? c.outline;
  return bake(scene, k, w, h, (g) => {
    const cx = w / 2;
    // perninhas
    g.fillStyle(hair, 1);
    g.fillRoundedRect(cx - 9, h - 12, 6, 11, 3);
    g.fillRoundedRect(cx + 3, h - 12, 6, 11, 3);
    // tronco
    blob(g, cx - 11, h - 26, 22, 20, 7, c.body, c.outline);
    // cabeça
    circle(g, cx, 13, 10, c.skin, c.outline);
    // cabelinho (faixa em cima)
    g.fillStyle(hair, 1);
    g.fillRoundedRect(cx - 9, 3, 18, 7, 4);
  });
}

/** Maruzza (líder): maior, cabelo de coque, traje + broche dourado (acento). Lidera o cordão. */
export function leaderTexture(scene: Phaser.Scene, c: FigureColors): string {
  const k = key('leader', c);
  const { w, h } = FIGURE.leader;
  const hair = c.hair ?? 0x2a1a2e;
  const accent = c.accent ?? 0xe8b923;
  return bake(scene, k, w, h, (g) => {
    const cx = w / 2;
    // perninhas
    g.fillStyle(hair, 1);
    g.fillRoundedRect(cx - 11, h - 14, 7, 13, 3);
    g.fillRoundedRect(cx + 4, h - 14, 7, 13, 3);
    // traje (corpo)
    blob(g, cx - 15, h - 32, 30, 26, 9, c.body, c.outline);
    // broche/acento no peito
    g.fillStyle(accent, 1);
    g.fillCircle(cx, h - 22, 4);
    // cabeça
    circle(g, cx, 17, 13, c.skin, c.outline);
    // coque + cabelo
    g.fillStyle(hair, 1);
    g.fillRoundedRect(cx - 13, 5, 26, 10, 6);
    g.fillCircle(cx, 4, 6);
  });
}

/** Vilão INSS: burocrata cinza, viseira/boné, cara fechada. Frio e formal (nunca do vocabulário do boi). */
export function villainTexture(scene: Phaser.Scene, c: FigureColors): string {
  const k = key('villain', c);
  const { w, h } = FIGURE.villain;
  const accent = c.accent ?? 0x334155;
  return bake(scene, k, w, h, (g) => {
    const cx = w / 2;
    // perninhas
    g.fillStyle(accent, 1);
    g.fillRoundedRect(cx - 12, h - 15, 8, 14, 3);
    g.fillRoundedRect(cx + 4, h - 15, 8, 14, 3);
    // terno
    blob(g, cx - 16, h - 34, 32, 28, 6, c.body, c.outline);
    // gravata
    g.fillStyle(accent, 1);
    g.fillTriangle(cx, h - 33, cx - 4, h - 22, cx + 4, h - 22);
    // cabeça
    circle(g, cx, 18, 13, c.skin, c.outline);
    // boné/viseira (autoridade burocrática)
    g.fillStyle(accent, 1);
    g.fillRoundedRect(cx - 14, 7, 28, 8, 3);
    g.fillRoundedRect(cx - 16, 13, 32, 4, 2);
    // sobrancelhas franzidas
    g.lineStyle(3, c.outline, 1);
    g.beginPath();
    g.moveTo(cx - 8, 18);
    g.lineTo(cx - 2, 21);
    g.moveTo(cx + 8, 18);
    g.lineTo(cx + 2, 21);
    g.strokePath();
  });
}

/** Projétil "prova": um documentinho (folha com dobra) — cores do tema. */
export function projectileTexture(scene: Phaser.Scene, c: { paper: number; ink: number; outline: number }): string {
  const k = `fig:proj:${c.paper}:${c.ink}:${c.outline}`;
  const w = 16, h = 20;
  return bake(scene, k, w, h, (g) => {
    // folha
    g.fillStyle(c.paper, 1);
    g.fillRoundedRect(2, 1, w - 4, h - 2, 3);
    g.lineStyle(2, c.outline, 1);
    g.strokeRoundedRect(2, 1, w - 4, h - 2, 3);
    // linhas de texto (tinta)
    g.fillStyle(c.ink, 1);
    g.fillRect(5, 6, w - 10, 2);
    g.fillRect(5, 10, w - 10, 2);
    g.fillRect(5, 14, w - 12, 2);
  });
}

/**
 * Obstáculo de burocracia (NUNCA pessoa): carimbo "exigência" ou pilha de
 * processos. `kind` muda a silhueta; cores vêm do tema (enemy.*).
 */
export function obstacleTexture(scene: Phaser.Scene, kind: 'carimbo' | 'pilha', c: { body: number; accent: number; outline: number }): string {
  const k = `fig:obst:${kind}:${c.body}:${c.accent}:${c.outline}`;
  const w = 56, h = 56;
  return bake(scene, k, w, h, (g) => {
    const cx = w / 2;
    if (kind === 'carimbo') {
      // cabo + base de carimbo
      g.fillStyle(c.accent, 1);
      g.fillRoundedRect(cx - 6, 6, 12, 16, 4); // cabo
      blob(g, cx - 18, 22, 36, 16, 5, c.body, c.outline); // corpo
      blob(g, cx - 22, 38, 44, 12, 4, c.accent, c.outline); // base
    } else {
      // pilha de 3 folhas empilhadas, levemente tortas
      blob(g, cx - 20, 30, 40, 18, 3, c.body, c.outline);
      blob(g, cx - 18, 18, 38, 16, 3, c.body, c.outline);
      blob(g, cx - 16, 8, 34, 14, 3, c.accent, c.outline);
    }
  });
}
