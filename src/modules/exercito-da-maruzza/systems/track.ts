/** Bookkeeping de scroll da pista. Puro (sem Phaser), testável. */
export class Track {
  traveled = 0;

  constructor(public speed: number) {}

  /** avança a pista; dtMs em milissegundos */
  update(dtMs: number): void {
    this.traveled += this.speed * (dtMs / 1000);
  }

  /** Y de tela de uma entidade a `dist` da largada, dada a linha da multidão. */
  screenY(dist: number, crowdY: number): number {
    return crowdY - (dist - this.traveled);
  }

  /** já passou (cruzou a multidão) a entidade em `dist`? */
  passed(dist: number): boolean {
    return this.traveled >= dist;
  }
}
