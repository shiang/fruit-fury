import { CONFIG, CANVAS_SIZE } from '../config'
import type { Entity, TrailPoint, Vec2 } from '../types'
import { mapToGame } from '../engine/mapping'
import { BladeTracker } from '../engine/bladeTracker'
import { segmentHitsCircle } from '../engine/collision'
import { integrate } from '../engine/physics'
import { makeSpawn } from '../engine/spawner'
import { GameState } from '../engine/scoring'
import { render, fruitColor, type Half, type Particle } from './renderer'
import { AudioEngine } from './audio'
import { MouseSource } from './camera'
import type { HandSource, HandSample } from './camera'

type Screen = 'title' | 'calibrate' | 'countdown' | 'playing' | 'gameover'

export class Game {
  private screen: Screen = 'title'
  private trackers: BladeTracker[] = []
  private entities: Entity[] = []
  private halves: Half[] = []
  private particles: Particle[] = []
  private state = new GameState()
  private highScore = Number(localStorage.getItem(CONFIG.highScoreKey) ?? 0)
  private showFeed = true
  private audio = new AudioEngine()

  private lastFrame = performance.now()
  private spawnTimer = 0
  private nextId = 1

  private calibUntil = 0
  private countdownUntil = 0

  private comboText: string | null = null
  private comboTextUntil = 0
  private levelUpText: string | null = null
  private levelUpTextUntil = 0
  private shake = 0
  private flash = 0

  private latestSample: HandSample = { hands: [], handedness: [], t: performance.now() }
  private mouse: MouseSource | null = null
  private lastCameraHandT = -Infinity
  private lastTrails: TrailPoint[][] = []
  private smoothedPos: (Vec2 | null)[] = [null, null]
  private cursorPos: Vec2[] = []

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
    window.addEventListener('resize', () => this.resize())
    this.resize()
    this.loop()
    this.attachInput()
  }

  private resize(): void {
    const canvas = this.ctx.canvas
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    CANVAS_SIZE.width = canvas.width
    CANVAS_SIZE.height = canvas.height
  }

  private attachInput(): void {
    this.mouse = new MouseSource(this.fallbackEl)
    void this.mouse.start((s) => {
      if (performance.now() - this.lastCameraHandT < 1000) return
      this.latestSample = s
    })

    void this.camera
      .start((s) => {
        if (s.hands.length > 0) {
          this.lastCameraHandT = performance.now()
          this.latestSample = s
        }
      })
      .catch((err) => {
        console.warn('Camera unavailable; using mouse control.', err)
      })
  }

  private onKey(key: string): void {
    this.audio.init()
    if (key === 'f') this.showFeed = !this.showFeed
    if (key === 'm') this.audio.muted = !this.audio.muted
    if (this.screen === 'title' && key === 'Enter') this.beginCountdown()
    if (this.screen === 'title' && key === 'c') this.beginCalibration()
    if (this.screen === 'gameover' && key === 'Enter') { this.resetGame(); this.beginCountdown() }
  }

  private beginCalibration(): void {
    this.screen = 'calibrate'
    this.calibUntil = performance.now() + CONFIG.calibration.sampleMs
  }

  private beginCountdown(): void {
    this.screen = 'countdown'
    this.countdownUntil = performance.now() + 3000
  }

  private resetGame(): void {
    this.entities = []; this.halves = []; this.particles = []
    this.state = new GameState()
    this.spawnTimer = 0
    this.trackers.forEach((t) => t.reset())
    this.smoothedPos = [null, null]
    this.levelUpText = null
  }

  private loop = (): void => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    this.update(now, dt)
    this.draw(now)
    requestAnimationFrame(this.loop)
  }

  private updateBlades(now: number): { trails: TrailPoint[][]; segments: { from: Vec2; to: Vec2 }[] } {
    const segments: { from: Vec2; to: Vec2 }[] = []
    const hands = this.latestSample.hands
    const labels = this.latestSample.handedness ?? []
    const used = [false, false]
    const alpha = CONFIG.slash.smoothing
    this.cursorPos = []
    for (let i = 0; i < hands.length && i < this.trackers.length; i++) {
      let slot = labels[i] === 'Left' ? 0 : 1
      if (used[slot]) slot = used[0] ? 1 : 0
      used[slot] = true
      const raw = mapToGame(hands[i], CANVAS_SIZE)
      const prev = this.smoothedPos[slot]
      const p = prev
        ? { x: prev.x + alpha * (raw.x - prev.x), y: prev.y + alpha * (raw.y - prev.y) }
        : raw
      this.smoothedPos[slot] = p
      this.cursorPos.push(p)
      const seg = this.trackers[slot].push(p, now)
      if (seg) segments.push(seg)
    }
    for (let s = 0; s < this.smoothedPos.length; s++) {
      if (!used[s]) this.smoothedPos[s] = null
    }
    this.lastTrails = this.trackers.map((t) => t.getTrail(now))
    return { trails: this.lastTrails, segments }
  }

  private update(now: number, dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 3)
    this.flash = Math.max(0, this.flash - dt * 4)
    if (this.comboText && now > this.comboTextUntil) this.comboText = null
    if (this.levelUpText && now > this.levelUpTextUntil) this.levelUpText = null

    if (this.screen === 'calibrate') {
      if (now >= this.calibUntil) this.screen = 'title'
      this.updateBlades(now)
      return
    }

    if (this.screen === 'countdown') {
      if (now >= this.countdownUntil) this.screen = 'playing'
    }

    if (this.screen !== 'playing') {
      this.updateBlades(now)
      this.advanceCosmetic(dt)
      return
    }

    // PLAYING
    const { segments } = this.updateBlades(now)
    const lv = this.state.levelConfig

    // spawn
    this.spawnTimer -= dt * 1000
    if (this.spawnTimer <= 0) {
      for (let b = 0; b < lv.burstCount; b++) {
        const ev = makeSpawn(this.rng, CANVAS_SIZE, lv)
        this.entities.push({
          id: this.nextId++, type: ev.type, pos: ev.pos, vel: ev.vel,
          radius: ev.radius, rotation: 0, angularVel: (this.rng() - 0.5) * 6, sliced: false,
        })
      }
      this.spawnTimer = lv.spawnIntervalMs
    }

    // integrate + cull misses
    const survivors: Entity[] = []
    for (const e of this.entities) {
      const moved = integrate(e, dt, lv.gravity)
      if (moved.pos.y - moved.radius > CANVAS_SIZE.height && moved.vel.y > 0) {
        if (moved.type !== 'bomb') {
          this.state.missFruit()
          this.audio.play('miss')
        }
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
    this.checkLevelUp(now)
    this.endGameIfOver()
  }

  private checkLevelUp(now: number): void {
    if (this.state.checkLevelUp()) {
      this.levelUpText = `Level ${this.state.level}!`
      this.levelUpTextUntil = now + 2000
      this.flash = Math.min(1, this.flash + 0.6)
      this.audio.play('levelup')
    }
  }

  private endGameIfOver(): void {
    if (!this.state.isOver) return
    if (this.state.score > this.highScore) {
      this.highScore = this.state.score
      localStorage.setItem(CONFIG.highScoreKey, String(this.highScore))
    }
    this.screen = 'gameover'
  }

  private onSlice(e: Entity, now: number): void {
    this.state.sliceFruit(now)
    this.spawnHalves(e)
    this.spawnParticles(e.pos, fruitColor(e.type))
    this.audio.play('slice')
    if (this.state.lastCombo >= CONFIG.combo.minForBonus) {
      this.comboText = `Combo x${this.state.lastCombo}!`
      this.comboTextUntil = now + 900
      this.flash = Math.min(1, this.flash + 0.5)
      this.audio.play('combo')
    }
  }

  private onBomb(e: Entity): void {
    this.state.sliceBomb()
    this.shake = 1
    this.spawnParticles(e.pos, '#333', 26)
    this.audio.play('bomb')
  }

  private spawnHalves(e: Entity): void {
    for (const side of [-1, 1] as const) {
      this.halves.push({
        pos: { ...e.pos }, vel: { x: e.vel.x + side * 120, y: e.vel.y * 0.5 },
        rotation: e.rotation, angularVel: side * 4, color: fruitColor(e.type),
        type: e.type, side, radius: e.radius, life: 1,
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
    const g = this.state.levelConfig.gravity
    for (const h of this.halves) {
      h.vel.y += g * dt
      h.pos.x += h.vel.x * dt
      h.pos.y += h.vel.y * dt
      h.rotation += h.angularVel * dt
      h.life -= dt * 0.7
    }
    this.halves = this.halves.filter((h) => h.life > 0 && h.pos.y - h.radius < CANVAS_SIZE.height + 80)
    for (const p of this.particles) {
      p.vel.y += g * 0.5 * dt
      p.pos.x += p.vel.x * dt
      p.pos.y += p.vel.y * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  private draw(now: number): void {
    const trails = this.lastTrails
    const lv = this.state.levelConfig
    render({
      ctx: this.ctx, video: this.video, showFeed: this.showFeed, canvas: CANVAS_SIZE,
      entities: this.entities, halves: this.halves, particles: this.particles,
      trails, cursors: this.cursorPos, score: this.state.score, lives: this.state.lives,
      maxLives: CONFIG.lives, highScore: this.highScore,
      level: this.state.level, levelName: lv.name,
      fruitsThisLevel: this.state.fruitsSlicedThisLevel, fruitsToAdvance: lv.fruitsToAdvance,
      comboText: this.comboText, levelUpText: this.levelUpText,
      shake: this.shake, flash: this.flash, now,
    })
    this.drawOverlay(now)
  }

  private drawOverlay(now: number): void {
    const ctx = this.ctx
    const { width, height } = CANVAS_SIZE
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
      center(['Fruit Fury', 'Enter — Play   |   C — Calibrate', `F — toggle camera (${this.showFeed ? 'on' : 'off'})   |   M — mute (${this.audio.muted ? 'on' : 'off'})`, `Best ${this.highScore}`])
    } else if (this.screen === 'calibrate') {
      const left = Math.max(0, Math.ceil((this.calibUntil - now) / 1000))
      center(['Calibrate', 'Wave both hands around the area you can comfortably reach', `${left}...`])
    } else if (this.screen === 'countdown') {
      const left = Math.max(1, Math.ceil((this.countdownUntil - now) / 1000))
      center([`${left}`])
    } else if (this.screen === 'gameover') {
      center(['Game Over', `Score ${this.state.score}   |   Best ${this.highScore}`, `Reached Level ${this.state.level}`, 'Enter — Play again'])
    }
  }
}
