import { CONFIG } from '../config'
import type { Entity, ReachBox, TrailPoint, Vec2 } from '../types'
import { mapToGame } from '../engine/mapping'
import { boxFromSamples, loadReachBox, saveReachBox } from '../engine/calibration'
import { BladeTracker } from '../engine/bladeTracker'
import { segmentHitsCircle } from '../engine/collision'
import { integrate } from '../engine/physics'
import { difficultyAt, makeSpawn } from '../engine/spawner'
import { GameState } from '../engine/scoring'
import { render, fruitColor, type Half, type Particle } from './renderer'
import { MouseSource } from './camera'
import type { HandSource, HandSample } from './camera'

type Screen = 'title' | 'calibrate' | 'countdown' | 'playing' | 'gameover'

export class Game {
  private screen: Screen = 'title'
  private box: ReachBox = loadReachBox()
  private trackers: BladeTracker[] = []
  private entities: Entity[] = []
  private halves: Half[] = []
  private particles: Particle[] = []
  private state = new GameState()
  private highScore = Number(localStorage.getItem(CONFIG.highScoreKey) ?? 0)
  private showFeed = true

  private lastFrame = performance.now()
  private elapsed = 0
  private spawnTimer = 0
  private nextId = 1

  private calibSamples: Vec2[] = []
  private calibUntil = 0
  private countdownUntil = 0

  private comboText: string | null = null
  private comboTextUntil = 0
  private shake = 0
  private flash = 0

  private latestSample: HandSample = { hands: [], t: performance.now() }
  private mouse: MouseSource | null = null

  constructor(
    private ctx: CanvasRenderingContext2D,
    private video: HTMLVideoElement,
    private camera: HandSource,
    private fallbackEl: HTMLElement,
    private rng: () => number = Math.random,
  ) {
    for (let i = 0; i < CONFIG.hand.maxHands; i++) {
      this.trackers.push(new BladeTracker(
        CONFIG.slash.velocityThreshold, CONFIG.slash.trailLifetimeMs, CONFIG.slash.minSegmentPx,
      ))
    }
  }

  async start(): Promise<void> {
    window.addEventListener('keydown', (e) => this.onKey(e.key))
    this.loop()                 // render immediately — title shows right away
    this.attachInput()          // do NOT await; never blocks the loop
  }

  private attachInput(): void {
    // mouse is the immediate default so there's always input + interactivity
    this.mouse = new MouseSource(this.fallbackEl)
    void this.mouse.start((s) => { this.latestSample = s })

    // upgrade to camera in the background when hands actually arrive
    void this.camera
      .start((s) => {
        if (s.hands.length > 0 && this.mouse) {
          this.mouse.stop()
          this.mouse = null
        }
        this.latestSample = s
      })
      .catch((err) => {
        console.warn('Camera unavailable; using mouse control.', err)
      })
  }

  private onKey(key: string): void {
    if (key === 'f') this.showFeed = !this.showFeed
    if (this.screen === 'title' && key === 'Enter') this.beginCountdown()
    if (this.screen === 'title' && key === 'c') this.beginCalibration()
    if (this.screen === 'gameover' && key === 'Enter') { this.resetGame(); this.beginCountdown() }
  }

  private beginCalibration(): void {
    this.screen = 'calibrate'
    this.calibSamples = []
    this.calibUntil = performance.now() + CONFIG.calibration.sampleMs
  }

  private beginCountdown(): void {
    this.screen = 'countdown'
    this.countdownUntil = performance.now() + 3000
  }

  private resetGame(): void {
    this.entities = []; this.halves = []; this.particles = []
    this.state = new GameState()
    this.elapsed = 0; this.spawnTimer = 0
    this.trackers.forEach((t) => t.reset())
  }

  private loop = (): void => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    this.update(now, dt)
    this.draw(now)
    requestAnimationFrame(this.loop)
  }

  /** Map current fingertip samples to game space and feed trackers; returns hot segments. */
  private updateBlades(now: number): { trails: TrailPoint[][]; segments: { from: Vec2; to: Vec2 }[] } {
    const trails: TrailPoint[][] = []
    const segments: { from: Vec2; to: Vec2 }[] = []
    const hands = this.latestSample.hands
    for (let i = 0; i < this.trackers.length; i++) {
      const tracker = this.trackers[i]
      if (i < hands.length) {
        const p = mapToGame(hands[i], this.box, CONFIG.canvas)
        const seg = tracker.push(p, now)
        if (seg) segments.push(seg)
      }
      trails.push(tracker.getTrail(now))
    }
    return { trails, segments }
  }

  private update(now: number, dt: number): void {
    // decay effects
    this.shake = Math.max(0, this.shake - dt * 3)
    this.flash = Math.max(0, this.flash - dt * 4)
    if (this.comboText && now > this.comboTextUntil) this.comboText = null

    if (this.screen === 'calibrate') {
      for (const h of this.latestSample.hands) this.calibSamples.push(h)
      if (now >= this.calibUntil) {
        this.box = boxFromSamples(this.calibSamples, CONFIG.calibration.margin)
        saveReachBox(this.box)
        this.screen = 'title'
      }
      return
    }

    if (this.screen === 'countdown') {
      if (now >= this.countdownUntil) this.screen = 'playing'
    }

    if (this.screen !== 'playing') {
      this.updateBlades(now) // keep trails alive visually
      this.advanceCosmetic(dt)
      return
    }

    // PLAYING
    this.elapsed += dt * 1000
    const { segments } = this.updateBlades(now)

    // spawn
    this.spawnTimer -= dt * 1000
    if (this.spawnTimer <= 0) {
      const ev = makeSpawn(this.rng, CONFIG.canvas, this.elapsed)
      this.entities.push({
        id: this.nextId++, type: ev.type, pos: ev.pos, vel: ev.vel,
        radius: ev.radius, rotation: 0, angularVel: (this.rng() - 0.5) * 6, sliced: false,
      })
      this.spawnTimer = difficultyAt(this.elapsed).spawnIntervalMs
    }

    // integrate + cull misses
    const survivors: Entity[] = []
    for (const e of this.entities) {
      const moved = integrate(e, dt, CONFIG.physics.gravity)
      if (moved.pos.y - moved.radius > CONFIG.canvas.height && moved.vel.y > 0) {
        if (moved.type !== 'bomb') this.state.missFruit()  // dropped fruit costs a life
        continue
      }
      survivors.push(moved)
    }
    this.entities = survivors

    // slicing
    for (const seg of segments) {
      for (const e of this.entities) {
        if (e.sliced) continue
        if (segmentHitsCircle(seg.from, seg.to, e.pos, e.radius)) {
          e.sliced = true
          if (e.type === 'bomb') this.onBomb(e)
          else this.onSlice(e, now)
        }
      }
    }
    this.entities = this.entities.filter((e) => !e.sliced)

    this.advanceCosmetic(dt)

    if (this.state.isOver) {
      if (this.state.score > this.highScore) {
        this.highScore = this.state.score
        localStorage.setItem(CONFIG.highScoreKey, String(this.highScore))
      }
      this.screen = 'gameover'
    }
  }

  private onSlice(e: Entity, now: number): void {
    this.state.sliceFruit(now)
    this.spawnHalves(e)
    this.spawnParticles(e.pos, fruitColor(e.type))
    if (this.state.lastCombo >= CONFIG.combo.minForBonus) {
      this.comboText = `Combo x${this.state.lastCombo}!`
      this.comboTextUntil = now + 900
      this.flash = Math.min(1, this.flash + 0.5)
    }
  }

  private onBomb(e: Entity): void {
    this.state.sliceBomb()
    this.shake = 1
    this.spawnParticles(e.pos, '#333', 26)
    if (this.state.isOver) {
      if (this.state.score > this.highScore) {
        this.highScore = this.state.score
        localStorage.setItem(CONFIG.highScoreKey, String(this.highScore))
      }
      this.screen = 'gameover'
    }
  }

  private spawnHalves(e: Entity): void {
    const color = fruitColor(e.type)
    for (const side of [-1, 1] as const) {
      this.halves.push({
        pos: { ...e.pos }, vel: { x: e.vel.x + side * 120, y: e.vel.y * 0.5 },
        rotation: e.rotation, angularVel: side * 4, color, side, radius: e.radius, life: 1,
      })
    }
  }

  private spawnParticles(pos: Vec2, color: string, count: number = CONFIG.particles.perCut): void {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2
      const sp = 120 + this.rng() * 320
      this.particles.push({
        pos: { ...pos }, vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
        life: 0.6, maxLife: 0.6, color,
      })
      if (this.particles.length > CONFIG.particles.maxCount) this.particles.shift()
    }
  }

  private advanceCosmetic(dt: number): void {
    const g = CONFIG.physics.gravity
    this.halves = this.halves
      .map((h) => ({
        ...h,
        vel: { x: h.vel.x, y: h.vel.y + g * dt },
        pos: { x: h.pos.x + h.vel.x * dt, y: h.pos.y + (h.vel.y + g * dt) * dt },
        rotation: h.rotation + h.angularVel * dt,
        life: h.life - dt * 0.7,
      }))
      .filter((h) => h.life > 0 && h.pos.y - h.radius < CONFIG.canvas.height + 80)
    this.particles = this.particles
      .map((p) => ({
        ...p,
        vel: { x: p.vel.x, y: p.vel.y + g * 0.5 * dt },
        pos: { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt },
        life: p.life - dt,
      }))
      .filter((p) => p.life > 0)
  }

  private draw(now: number): void {
    const trails = this.trackers.map((t) => t.getTrail(now))
    render({
      ctx: this.ctx, video: this.video, showFeed: this.showFeed,
      entities: this.entities, halves: this.halves, particles: this.particles,
      trails, score: this.state.score, lives: this.state.lives, highScore: this.highScore,
      comboText: this.comboText, shake: this.shake, flash: this.flash, now,
    })
    this.drawOverlay(now)
  }

  private drawOverlay(now: number): void {
    const ctx = this.ctx
    const { width, height } = CONFIG.canvas
    const center = (lines: string[]) => {
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, width, height)
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff8e7'
      ctx.font = 'bold 56px sans-serif'; ctx.fillText(lines[0], width / 2, height / 2 - 40)
      ctx.font = '26px sans-serif'
      lines.slice(1).forEach((l, i) => ctx.fillText(l, width / 2, height / 2 + 20 + i * 38))
      ctx.restore()
    }
    if (this.screen === 'title') {
      center(['🍉 Fruit Fury', 'Enter — Play   ·   C — Calibrate', `F — toggle camera (${this.showFeed ? 'on' : 'off'})`, `Best ${this.highScore}`])
    } else if (this.screen === 'calibrate') {
      const left = Math.max(0, Math.ceil((this.calibUntil - now) / 1000))
      center(['Calibrate', 'Wave both hands around the area you can comfortably reach', `${left}…`])
    } else if (this.screen === 'countdown') {
      const left = Math.max(1, Math.ceil((this.countdownUntil - now) / 1000))
      center([`${left}`])
    } else if (this.screen === 'gameover') {
      center(['Game Over', `Score ${this.state.score}   ·   Best ${this.highScore}`, 'Enter — Play again'])
    }
  }
}
