export type SfxName = 'move' | 'ok' | 'back' | 'count' | 'go' | 'pickup' | 'bump' | 'land' | 'nitro' | 'lap' | 'finish' | 'buy' | 'deny';

/** Small synthesized arcade sound set. Silent until the first key press, or always with ?mute. */
export class Sfx {
  volume = 6;
  engines = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: { osc: OscillatorNode; gain: GainNode }[] = [];
  private readonly muted = new URLSearchParams(location.search).has('mute');

  unlock(): void {
    if (this.muted) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'square', to = freq, delay = 0): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private thud(dur: number, vol: number, cutoff: number): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = (this.volume / 10) * 0.5;
    switch (name) {
      case 'move': this.tone(520, 0.04, 0.08); break;
      case 'ok': this.tone(660, 0.06, 0.1); this.tone(990, 0.08, 0.1, 'square', 990, 0.06); break;
      case 'back': this.tone(440, 0.08, 0.1, 'square', 300); break;
      case 'count': this.tone(440, 0.14, 0.16); break;
      case 'go': this.tone(880, 0.45, 0.16); break;
      case 'pickup': this.tone(880, 0.05, 0.12); this.tone(1320, 0.1, 0.12, 'square', 1320, 0.05); break;
      case 'bump': this.thud(0.09, 0.3, 500); break;
      case 'land': this.thud(0.14, 0.35, 260); break;
      case 'nitro': this.tone(180, 0.5, 0.1, 'sawtooth', 620); break;
      case 'lap': this.tone(784, 0.08, 0.12); this.tone(1046, 0.14, 0.12, 'square', 1046, 0.08); break;
      case 'finish': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 0.14, 'square', f, i * 0.12)); break;
      case 'buy': this.tone(700, 0.05, 0.1); this.tone(1050, 0.1, 0.1, 'square', 1050, 0.05); break;
      case 'deny': this.tone(160, 0.14, 0.1, 'square', 120); break;
    }
  }

  /** Engine note for one human truck; pass a negative speed to silence it. */
  setEngine(i: number, speed01: number): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    let e = this.engine[i];
    if (!e) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      const gain = c.createGain();
      gain.gain.value = 0;
      osc.connect(f).connect(gain).connect(this.master);
      osc.start();
      e = this.engine[i] = { osc, gain };
    }
    const on = this.engines && speed01 >= 0;
    e.gain.gain.setTargetAtTime(on ? 0.035 : 0, c.currentTime, 0.05);
    if (on) e.osc.frequency.setTargetAtTime(48 + speed01 * 95 + i * 3, c.currentTime, 0.06);
  }

  stopEngines(): void {
    for (let i = 0; i < this.engine.length; i++) if (this.engine[i]) this.setEngine(i, -1);
  }
}
