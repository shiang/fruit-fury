import { CONFIG } from '../config'

type SfxName = 'slice' | 'bomb' | 'combo' | 'miss' | 'levelup'

/** Procedural sound effects via Web Audio API — no audio files needed. */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  muted = false

  /** Lazily create the AudioContext (must be triggered by user gesture). */
  init(): void {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = CONFIG.audio.masterVolume
    this.master.connect(this.ctx.destination)
    this.noiseBuffer = this.makeNoiseBuffer()
  }

  private makeNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!
    const len = ctx.sampleRate * 1
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master || this.muted) return
    switch (name) {
      case 'slice': this.slice(); break
      case 'bomb': this.bomb(); break
      case 'combo': this.combo(); break
      case 'miss': this.miss(); break
      case 'levelup': this.levelUp(); break
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    const ctx = this.ctx!
    const t0 = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master!)
    osc.start(t0)
    osc.stop(t0 + dur)
  }

  private slice(): void {
    const ctx = this.ctx!
    const t0 = ctx.currentTime
    // Whoosh: filtered noise sweep
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filt = ctx.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.setValueAtTime(1200, t0)
    filt.frequency.exponentialRampToValueAtTime(300, t0 + 0.12)
    filt.Q.value = 2
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.35, t0)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15)
    src.connect(filt).connect(g).connect(this.master!)
    src.start(t0)
    src.stop(t0 + 0.15)
    // High "splat" tone
    this.tone(700, 0.08, 'sine', 0.15, 250)
  }

  private bomb(): void {
    const ctx = this.ctx!
    const t0 = ctx.currentTime
    // Explosion: low noise burst
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filt = ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.setValueAtTime(800, t0)
    filt.frequency.exponentialRampToValueAtTime(60, t0 + 0.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.6, t0)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5)
    src.connect(filt).connect(g).connect(this.master!)
    src.start(t0)
    src.stop(t0 + 0.5)
    // Low boom
    this.tone(80, 0.4, 'sine', 0.5, 30)
  }

  private combo(): void {
    this.tone(523, 0.1, 'square', 0.15)
    this.tone(659, 0.1, 'square', 0.15, undefined, 0.08)
    this.tone(784, 0.15, 'square', 0.18, undefined, 0.16)
  }

  private miss(): void {
    this.tone(200, 0.2, 'sine', 0.25, 80)
  }

  private levelUp(): void {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => this.tone(f, 0.18, 'square', 0.18, undefined, i * 0.1))
  }
}
