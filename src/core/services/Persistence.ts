/** Recorde local via localStorage (sem backend no MVP). */
export class Persistence {
  private readonly prefix = 'mta:';

  getHighScore(casoId: string): number {
    const v = localStorage.getItem(`${this.prefix}hs:${casoId}`);
    return v ? Number(v) : 0;
  }

  /** grava se for recorde; retorna true se bateu o recorde */
  setHighScore(casoId: string, score: number): boolean {
    if (score > this.getHighScore(casoId)) {
      localStorage.setItem(`${this.prefix}hs:${casoId}`, String(score));
      return true;
    }
    return false;
  }
}
