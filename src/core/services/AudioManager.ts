export type SfxKey = 'good' | 'bad' | 'tap' | 'win' | 'lose' | 'break';

const MUTE_KEY = 'mta:muted';
const MASTER_VOL = 0.9;

/**
 * Áudio sintetizado via Web Audio API — zero arquivos de asset. SFX por
 * envelope de osciladores + ruído, e uma trilha ambiente leve. Mute persistido.
 * Tudo é não-crítico: nenhum método propaga exceção pro jogo.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** chamar num gesto do usuário (pointerdown) destrava o contexto de áudio */
  unlock(): void {
    this.ensure();
  }

  play(key: SfxKey): void {
    try {
      const ctx = this.ensure();
      if (!ctx || !this.master) return;
      switch (key) {
        case 'good':
          this.tone(523, 0, 0.12, 'triangle', 0.25);
          this.tone(784, 0.08, 0.16, 'triangle', 0.25);
          break;
        case 'bad':
          this.tone(330, 0, 0.14, 'sawtooth', 0.2);
          this.tone(220, 0.09, 0.22, 'sawtooth', 0.2);
          break;
        case 'tap':
          this.tone(880, 0, 0.05, 'square', 0.12);
          break;
        case 'win':
          [523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.1, 0.4, 'triangle', 0.28));
          break;
        case 'lose':
          this.tone(220, 0, 0.5, 'sine', 0.3);
          this.tone(146, 0.12, 0.6, 'sine', 0.3);
          break;
        case 'break':
          this.noise(0.4, 0.45);
          this.tone(110, 0, 0.4, 'square', 0.25);
          break;
      }
    } catch {
      /* áudio é não-crítico */
    }
  }

  startMusic(): void {
    try {
      const ctx = this.ensure();
      if (!ctx || this.musicTimer != null) return;
      const scale = [392, 440, 523, 587, 659, 784];
      let i = 0;
      this.musicTimer = window.setInterval(() => {
        if (!this.ctx || this.muted) return;
        this.tone(scale[i % scale.length], 0, 0.35, 'sine', 0.05);
        i++;
      }, 360);
    } catch {
      /* ignore */
    }
  }

  stopMusic(): void {
    if (this.musicTimer != null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setMuted(value: boolean): void {
    this.muted = value;
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(value ? 0 : MASTER_VOL, this.ctx.currentTime, 0.02);
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOL;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, delay: number, dur: number, type: OscillatorType, peak: number): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, peak: number): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = peak;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(t0);
  }
}
