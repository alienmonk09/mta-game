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

  /** lê flag booleana genérica (default false). */
  getFlag(key: string): boolean {
    return localStorage.getItem(`${this.prefix}flag:${key}`) === '1';
  }

  /** grava flag booleana genérica. */
  setFlag(key: string, value: boolean): void {
    localStorage.setItem(`${this.prefix}flag:${key}`, value ? '1' : '0');
  }

  /** lê string genérica (ex: skin ativa) com fallback. */
  getString(key: string, fallback = ''): string {
    return localStorage.getItem(`${this.prefix}str:${key}`) ?? fallback;
  }

  /** grava string genérica. */
  setString(key: string, value: string): void {
    localStorage.setItem(`${this.prefix}str:${key}`, value);
  }
}
