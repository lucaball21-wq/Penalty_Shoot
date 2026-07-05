export class AudioManager {
  ctx: AudioContext | null = null;
  crowdGain: GainNode | null = null;
  crowdSource: AudioBufferSourceNode | null = null;

  constructor() {
    try { this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch (e) { this.ctx = null; }
  }

  async _ensureCrowd() {
    if (!this.ctx) return;
    if (this.crowdSource) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    const gain = this.ctx.createGain(); gain.gain.value = 0.08;
    src.connect(lp); lp.connect(gain); gain.connect(this.ctx.destination);
    src.start();
    this.crowdSource = src; this.crowdGain = gain;
  }

  async playCrowd() { await this._ensureCrowd(); }

  playGoal() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 440; g.gain.value = 0;
    o.connect(g); g.connect(this.ctx.destination);
    const now = this.ctx.currentTime; g.gain.linearRampToValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    o.start(); o.stop(now + 0.9);
  }

  playMiss() {
    if (!this.ctx) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    src.connect(f); f.connect(this.ctx.destination);
    src.start();
  }

  boostCrowd(mult: number, ms: number) {
    if (!this.crowdGain) return;
    const orig = this.crowdGain.gain.value;
    this.crowdGain.gain.setTargetAtTime(Math.min(1, orig * mult), this.ctx!.currentTime, 0.02);
    setTimeout(() => { if (this.crowdGain) this.crowdGain.gain.setTargetAtTime(orig, this.ctx!.currentTime, 0.02); }, ms);
  }

  lowerCrowd(level: number, ms: number) {
    if (!this.crowdGain) return;
    const orig = this.crowdGain.gain.value;
    this.crowdGain.gain.setTargetAtTime(level, this.ctx!.currentTime, 0.02);
    setTimeout(() => { if (this.crowdGain) this.crowdGain.gain.setTargetAtTime(orig, this.ctx!.currentTime, 0.02); }, ms);
  }
}
