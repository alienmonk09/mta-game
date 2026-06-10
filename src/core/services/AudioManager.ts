/** Stub — implementação real na Fase 2 (skill: audio-and-sound). */
export class AudioManager {
  private muted = false;

  play(_key: string): void {
    /* Fase 2 */
  }

  music(_key: string): void {
    /* Fase 2 */
  }

  setMuted(value: boolean): void {
    this.muted = value;
  }

  get isMuted(): boolean {
    return this.muted;
  }
}
