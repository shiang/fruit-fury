import { CONFIG, CANVAS_SIZE } from '../config'
import { TIME_ATTACK_LEVEL } from '../engine/levels'
import type { Entity, TrailPoint, Vec2, GameMode } from '../types'
import { mapToGame } from '../engine/mapping'
import { BladeTracker } from '../engine/bladeTracker'
import { segmentHitsCircle } from '../engine/collision'
import { integrate } from '../engine/physics'
import { makeSpawn } from '../engine/spawner'
import { GameState } from '../engine/scoring'
import { render, fruitColor, type Half, type Particle } from './renderer'
import { AudioEngine } from './audio'
import { EventScheduler } from '../engine/events'
import type { EventWorld } from '../engine/events/types'
import { hitTestButtons, pointInButton, drawButton, drawMenuCursor, type MenuButton, type MenuIcon } from './menu'
import { MouseSource } from './camera'
import type { HandSource, HandSample } from './camera'
import {
  createTutorialState,
  shouldShowTutorial,
  markTutorialSeen,
  drawTutorialOverlay,
  hitTestTutorialButton,
  getTutorialButtonRect,
  TUTORIAL_CARDS,
} from './tutorial'

type Screen = 'title' | 'calibrate' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'tutorial'

export class Game {
  private screen: Screen = 'title'
  private gameMode: GameMode = 'classic'
  private trackers: BladeTracker[] = []
  private entities: Entity[] = []
  private halves: Half[] = []
  private particles: Particle[] = []
  private state = new GameState()
  private highScore = 0
  private showFeed = true
  private audio = new AudioEngine()

  private lastFrame = performance.now()
  private spawnTimer = 0
  private nextId = 1

  private calibUntil = 0
  private countdownUntil = 0
  private timeAttackStartedAt = 0
  private timeAttackDurationMs = CONFIG.timeAttack.durationMs

  private comboText: string | null = null
  private comboTextUntil = 0
  private levelUpText: string | null = null
  private levelUpTextUntil = 0
  private shake = 0
  private flash = 0
  private slowMoOverlay = 0
  private freezeOverlay = 0
  private shrinkOverlay = 0
  private furyOverlay = 0
  private rainbowOverlay = 0
  private gameOverReason: 'lives' | 'timeup' | null = null

  private latestSample: HandSample = { hands: [], handedness: [], pinching: [], t: performance.now() }
  private mouse: MouseSource | null = null
  private lastCameraHandT = -Infinity
  private lastTrails: TrailPoint[][] = []
  private smoothedPos: (Vec2 | null)[] = [null, null]
  private cursorPos: Vec2[] = []

  private menuBtnStates = new Map<string, { hover: number; holdProgress: number }>()
  private menuButtons: MenuButton[] = []
  private static readonly MENU_HOLD_S = 0.6
  private tutorialState = createTutorialState()
  private tutorialPinchLatch = false
  private eventScheduler: EventScheduler | null = null

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
    window.addEventListener('keydown', (e) => this.onKey(e))
    window.addEventListener('resize', () => this.resize())
    this.fallbackEl.addEventListener('click', this.onMenuClick)
    this.resize()
    if (shouldShowTutorial()) this.showTutorial()
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

  private onKey(e: KeyboardEvent): void {
    this.audio.init()
    const key = e.key
    if (key === 'Escape') {
      if (this.screen === 'playing') { this.screen = 'paused'; return }
      if (this.screen === 'paused') { this.screen = 'playing'; return }
      if (this.screen === 'tutorial') { this.screen = 'title'; return }
    }
    if (key === 'f') this.showFeed = !this.showFeed
    if (key === 'm') this.audio.muted = !this.audio.muted
    if (this.screen === 'title' && key === 'Enter') this.activateMenuButton('play')
    if (this.screen === 'title' && key === 'c') this.activateMenuButton('calibrate')
    if (this.screen === 'gameover' && key === 'Enter') this.activateMenuButton('play')
    if (this.screen === 'paused' && key === 'Enter') this.activateMenuButton('resume')
  }

  private onMenuClick = (e: MouseEvent): void => {
    this.audio.init()
    const r = this.ctx.canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE.width / r.width
    const scaleY = CANVAS_SIZE.height / r.height
    const pos = { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY }

    if (this.screen === 'tutorial') {
      const btn = getTutorialButtonRect(CANVAS_SIZE.width, CANVAS_SIZE.height)
      if (hitTestTutorialButton(btn, pos)) this.advanceOrDismissTutorial()
      return
    }

    if (this.screen !== 'title' && this.screen !== 'gameover' && this.screen !== 'paused') return
    const buttons = this.buildMenuButtons()
    for (const btn of buttons) {
      if (pointInButton(btn, pos.x, pos.y)) {
        this.activateMenuButton(btn.id)
        return
      }
    }
  }

  private activateMenuButton(id: string): void {
    this.audio.init()
    this.audio.play('menuclick')
    this.menuBtnStates.clear()
    switch (id) {
      case 'play':
        if (this.screen === 'gameover') this.resetGame('classic')
        this.beginCountdown()
        break
      case 'zen':
        this.resetGame('zen')
        this.beginCountdown()
        break
      case 'time-attack':
        this.resetGame('time-attack')
        this.beginCountdown()
        break
      case 'calibrate':
        this.beginCalibration()
        break
      case 'howto':
        this.showTutorial()
        break
      case 'camera':
        this.showFeed = !this.showFeed
        break
      case 'sound':
        this.audio.muted = !this.audio.muted
        break
      case 'resume':
        this.screen = 'playing'
        break
      case 'quit':
        this.screen = 'title'
        this.resetGame()
        window.close()
        break
    }
  }

  private mkBtn(id: string, label: string, icon: MenuIcon, x: number, y: number, w: number, h: number, small: boolean, toggled: boolean): MenuButton {
    const state = this.menuBtnStates.get(id)
    return { id, label, icon, x, y, w, h, hover: state?.hover ?? 0, holdProgress: state?.holdProgress ?? 0, small, toggled }
  }

  private buildMenuButtons(): MenuButton[] {
    const { width, height } = CANVAS_SIZE
    const cx = width / 2
    const buttons: MenuButton[] = []
    const bw = Math.min(320, width * 0.38)
    const bh = Math.min(64, height * 0.085)

    if (this.screen === 'title') {
      let y = height * 0.44
      buttons.push(this.mkBtn('play', 'Play', 'play', cx, y, bw, bh, false, true))
      y += bh + 14
      buttons.push(this.mkBtn('zen', 'Zen Mode', 'zen', cx, y, bw, bh, false, true))
      y += bh + 14
      buttons.push(this.mkBtn('time-attack', 'Time Attack', 'restart', cx, y, bw, bh, false, true))
      y += bh + 14
      buttons.push(this.mkBtn('calibrate', 'Calibrate', 'calibrate', cx, y, bw, bh, false, true))
      y += bh + 14
      buttons.push(this.mkBtn('howto', 'How to Play', 'howto', cx, y, bw, bh, false, true))
      y += bh + 24
      const tw = Math.min(170, width * 0.2)
      const th = 44
      buttons.push(this.mkBtn('camera', `Camera ${this.showFeed ? 'On' : 'Off'}`, this.showFeed ? 'camera' : 'cameraOff', cx - tw / 2 - 10, y, tw, th, true, this.showFeed))
      buttons.push(this.mkBtn('sound', `Sound ${this.audio.muted ? 'Off' : 'On'}`, this.audio.muted ? 'soundOff' : 'sound', cx + tw / 2 + 10, y, tw, th, true, !this.audio.muted))
    } else if (this.screen === 'gameover') {
      let y = height * 0.60
      buttons.push(this.mkBtn('play', 'Play Again', 'restart', cx, y, bw, bh, false, true))
      if (this.gameMode === 'zen') {
        y += bh + 18
        buttons.push(this.mkBtn('zen', 'Zen Again', 'zen', cx, y, bw, bh, false, true))
      }
      if (this.gameMode === 'time-attack') {
        y += bh + 18
        buttons.push(this.mkBtn('time-attack', 'Time Attack Again', 'restart', cx, y, bw, bh, false, true))
      }
    } else if (this.screen === 'paused') {
      let y = height * 0.42
      buttons.push(this.mkBtn('resume', 'Resume', 'play', cx, y, bw, bh, false, true))
      y += bh + 18
      buttons.push(this.mkBtn('quit', 'Quit', 'quit', cx, y, bw, bh, false, true))
    }
    return buttons
  }

  private updateMenu(dt: number): void {
    const buttons = this.buildMenuButtons()
    const cursor = this.cursorPos.length > 0 ? this.cursorPos[0] : null
    const selectedIdx = cursor ? hitTestButtons(buttons, cursor) : -1
    const pinching = this.latestSample.pinching?.[0] ?? false

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i]
      const isSelected = i === selectedIdx
      const targetHover = isSelected ? 1 : 0
      btn.hover += (targetHover - btn.hover) * Math.min(1, dt * 12)

      if (isSelected && pinching) {
        btn.holdProgress += dt / Game.MENU_HOLD_S
        if (btn.holdProgress >= 1) {
          this.activateMenuButton(btn.id)
          btn.holdProgress = 0
        }
      } else {
        btn.holdProgress = Math.max(0, btn.holdProgress - dt * 3)
      }
      this.menuBtnStates.set(btn.id, { hover: btn.hover, holdProgress: btn.holdProgress })
    }
    this.menuButtons = buttons
  }

  private beginCalibration(): void {
    this.screen = 'calibrate'
    this.calibUntil = performance.now() + CONFIG.calibration.sampleMs
  }

  private beginCountdown(): void {
    this.screen = 'countdown'
    this.countdownUntil = performance.now() + 3000
    if (this.gameMode === 'time-attack') {
      this.timeAttackStartedAt = performance.now() + 3000
    }
  }

  private showTutorial(): void {
    this.screen = 'tutorial'
    this.tutorialState = createTutorialState()
    this.tutorialState.isShowing = true
    this.tutorialState.startTime = performance.now()
    this.tutorialPinchLatch = false
  }

  private advanceOrDismissTutorial(): void {
    const state = this.tutorialState
    if (state.currentCard < TUTORIAL_CARDS.length - 1) {
      state.currentCard++
      this.audio.play('menuclick')
    } else {
      markTutorialSeen()
      state.isShowing = false
      this.screen = 'title'
      this.audio.play('menuclick')
    }
  }

  private updateTutorial(_now: number, _dt: number): void {
    const state = this.tutorialState
    if (!state.isShowing) return

    const cursor = this.cursorPos.length > 0 ? this.cursorPos[0] : null
    const pinching = this.latestSample.pinching?.[0] ?? false

    if (cursor && pinching && !this.tutorialPinchLatch) {
      const btn = getTutorialButtonRect(CANVAS_SIZE.width, CANVAS_SIZE.height)
      if (hitTestTutorialButton(btn, cursor)) {
        this.tutorialPinchLatch = true
        this.advanceOrDismissTutorial()
      }
    }
    if (!pinching) this.tutorialPinchLatch = false
  }

  private resetGame(mode: GameMode = 'classic'): void {
    this.entities = []; this.halves = []; this.particles = []
    this.state = new GameState()
    this.state.mode = mode
    this.gameMode = mode
    this.highScore = Number(localStorage.getItem(this.getHighScoreKey(mode)) ?? 0)
    this.spawnTimer = 0
    this.trackers.forEach((t) => t.reset())
    this.smoothedPos = [null, null]
    this.levelUpText = null
    this.menuBtnStates.clear()
    this.gameOverReason = null
    this.timeAttackStartedAt = 0
    this.furyOverlay = 0
    this.rainbowOverlay = 0
    
    // Zen mode: use dedicated zen level (no bombs, no hearts)
    if (mode === 'zen') {
      this.state.level = CONFIG.zen.level
    }
    // Time attack: use dedicated time attack level
    if (mode === 'time-attack') {
      this.state.level = TIME_ATTACK_LEVEL.level
      this.timeAttackDurationMs = CONFIG.timeAttack.durationMs
    }

    // Initialize event scheduler (shared across all modes)
    // Classic mode: disable Fruit Storm (too hard with 5 lives)
    const eventConfig = mode === 'classic'
      ? { ...CONFIG.events, fruitStorm: { ...CONFIG.events.fruitStorm, enabled: false } }
      : CONFIG.events
    this.eventScheduler = new EventScheduler(this.buildEventWorld(), eventConfig, performance.now())
  }

  private getHighScoreKey(mode: GameMode): string {
    if (mode === 'zen') return CONFIG.highScoreZenKey
    if (mode === 'time-attack') return CONFIG.highScoreTimeAttackKey
    return CONFIG.highScoreKey
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
    this.slowMoOverlay = Math.max(0, this.slowMoOverlay - dt * 1.5)
    this.freezeOverlay = Math.max(0, this.freezeOverlay - dt * 1.2)
    this.shrinkOverlay = Math.max(0, this.shrinkOverlay - dt * 1.2)
    this.furyOverlay = Math.max(0, this.furyOverlay - dt * 0.8)
    this.rainbowOverlay = Math.max(0, this.rainbowOverlay - dt * 0.6)
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

    if (this.screen === 'tutorial') {
      this.updateTutorial(now, dt)
      this.updateBlades(now)
      return
    }

    if (this.screen !== 'playing') {
      this.updateBlades(now)
      if (this.screen !== 'paused') this.advanceCosmetic(dt)
      if (this.screen === 'title' || this.screen === 'gameover' || this.screen === 'paused') {
        this.updateMenu(dt)
      }
      return
    }

    // PLAYING
    const { segments } = this.updateBlades(now)
    const lv = this.state.levelConfig

    // spawn
    this.spawnTimer -= dt * 1000
    const spawnInterval = this.state.isFuryMode ? lv.spawnIntervalMs / CONFIG.furyMode.spawnMultiplier : lv.spawnIntervalMs
    if (this.spawnTimer <= 0) {
      for (let b = 0; b < lv.burstCount; b++) {
        const ev = makeSpawn(this.rng, CANVAS_SIZE, lv)
        this.entities.push({
          id: this.nextId++, type: ev.type, pos: ev.pos, vel: ev.vel,
          radius: ev.radius, baseRadius: ev.radius,
          rotation: 0, angularVel: (this.rng() - 0.5) * 6, sliced: false,
        })
      }
      this.spawnTimer = spawnInterval
    }

    // integrate + cull misses
    const timeScale = this.state.isSlowMoActive(now)
    const frozen = this.state.isFrozen(now)
    const shrinking = this.state.isShrinking(now)
    const survivors: Entity[] = []
    for (const e of this.entities) {
      // Apply shrink effect to bomb radii
      if (shrinking && e.type === 'bomb') {
        e.radius = e.baseRadius * 0.5
      } else {
        e.radius = e.baseRadius
      }
      const moved = integrate(e, dt * timeScale, lv.gravity, frozen)
      if (moved.pos.y - moved.radius > CANVAS_SIZE.height && moved.vel.y > 0) {
        if (moved.type !== 'bomb' && moved.type !== 'heart' && moved.type !== 'golden-heart') {
          this.state.missFruit()
          if (this.gameMode !== 'zen') this.audio.play('miss')
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
          else if (e.type === 'heart' || e.type === 'golden-heart') this.onBonus(e, now)
          else if (e.type === 'slow-mo') this.onSlowMo(e, now)
          else if (e.type === 'shrink-ray') this.onShrinkRay(e, now)
          else if (e.type === 'freeze') this.onFreeze(e, now)
          else this.onSlice(e, now)
        }
      }
    }
    this.entities = this.entities.filter((e) => !e.sliced)

    this.advanceCosmetic(dt)
    this.checkLevelUp(now)
    this.checkTimeAttackTimer(now)
    this.state.isGoldenHourActive(now)
    this.eventScheduler?.update(now, dt)
    this.endGameIfOver()
  }

  private checkTimeAttackTimer(now: number): void {
    if (this.gameMode !== 'time-attack' || this.timeAttackStartedAt === 0) return
    const elapsed = now - this.timeAttackStartedAt
    if (elapsed >= this.timeAttackDurationMs) {
      this.state.isOver = true
      this.gameOverReason = 'timeup'
    }
  }

  private checkLevelUp(now: number): void {
    if (this.state.checkLevelUp()) {
      if (this.gameMode !== 'zen') {
        this.levelUpText = `Level ${this.state.level}!`
        this.levelUpTextUntil = now + 2000
        this.flash = Math.min(1, this.flash + 0.6)
        this.audio.play('levelup')
      }
    }
  }

  private endGameIfOver(): void {
    if (!this.state.isOver) return
    this.saveHighScore()
    this.screen = 'gameover'
  }

  private saveHighScore(): void {
    if (this.state.score > this.highScore) {
      this.highScore = this.state.score
      localStorage.setItem(this.getHighScoreKey(this.gameMode), String(this.highScore))
    }
  }

  private onSlice(e: Entity, now: number): void {
    this.state.sliceFruit(now, e.type)
    this.spawnHalves(e)
    this.spawnParticles(e.pos, fruitColor(e.type))
    this.audio.play('slice')
    if (this.state.lastCombo >= 2) {
      this.comboText = `Combo x${this.state.lastCombo}!`
      this.comboTextUntil = now + 900
      this.flash = Math.min(1, this.flash + 0.5)
      this.audio.play('combo')
    }
    // Check perfect slice streak
    if (this.state.perfectStreak >= CONFIG.furyMode.streakThreshold && !this.state.isFuryMode) {
      this.state.activateFuryMode(now)
      this.furyOverlay = 1
      this.comboText = '🔥 FURY MODE! 2x Points!'
      this.comboTextUntil = now + 1500
      this.flash = Math.min(1, this.flash + 0.8)
      this.audio.play('combo')
    }
    // Check rainbow combo
    if (this.state.checkRainbowCombo(now)) {
      this.rainbowOverlay = 1
      this.comboText = '🌈 RAINBOW COMBO! +500!'
      this.comboTextUntil = now + 1500
      this.flash = Math.min(1, this.flash + 0.8)
      this.audio.play('combo')
      // Spawn rainbow particles
      this.spawnRainbowExplosion()
    }
  }

  private spawnRainbowExplosion(): void {
    const rainbowColors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0000ff', '#8b00ff']
    for (const color of rainbowColors) {
      this.spawnParticles(
        { x: CANVAS_SIZE.width / 2, y: CANVAS_SIZE.height / 2 },
        color,
        15,
      )
    }
  }

  private onBomb(e: Entity): void {
    this.state.sliceBomb()
    this.shake = 1
    this.spawnParticles(e.pos, '#333', 26)
    this.audio.play('bomb')
  }

  private onBonus(e: Entity, now: number): void {
    const isGolden = e.type === 'golden-heart'
    const healAmount = isGolden ? CONFIG.bonus.goldenHeartHeal : CONFIG.bonus.heartHeal
    const restored = this.state.heal(healAmount)
    this.spawnParticles(e.pos, isGolden ? '#ffd700' : '#ff4d6d', 20)
    this.flash = Math.min(1, this.flash + 0.4)
    if (restored > 0) {
      this.comboText = isGolden ? `Full Health!` : `+${restored} Life!`
      this.comboTextUntil = now + 1000
    }
    this.audio.play('heal')
  }

  private onSlowMo(e: Entity, now: number): void {
    this.state.activateSlowMo(now)
    this.spawnParticles(e.pos, '#87ceeb', 24)
    this.slowMoOverlay = 1
    this.comboText = 'Slow Motion!'
    this.comboTextUntil = now + 1200
    this.audio.play('slowmo')
  }

  private onShrinkRay(e: Entity, now: number): void {
    this.state.activateShrink(now)
    this.spawnParticles(e.pos, '#d946ef', 24)
    this.shrinkOverlay = 1
    this.comboText = 'Shrink Ray!'
    this.comboTextUntil = now + 1200
    this.audio.play('shrink')
  }

  private onFreeze(e: Entity, now: number): void {
    this.state.activateFreeze(now)
    this.spawnParticles(e.pos, '#38bdf8', 24)
    this.freezeOverlay = 1
    this.comboText = 'Frozen!'
    this.comboTextUntil = now + 1200
    this.audio.play('freeze')
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
    const lv = this.state.levelConfig
    const isMenu = this.screen === 'title' || this.screen === 'gameover' || this.screen === 'paused' || this.screen === 'tutorial'
    const showStandardCursor = !isMenu
    const timeAttackElapsedMs = this.gameMode === 'time-attack' && this.timeAttackStartedAt > 0
      ? Math.max(0, now - this.timeAttackStartedAt)
      : undefined
    render({
      ctx: this.ctx, video: this.video, showFeed: this.showFeed, showHud: this.screen === 'playing' || this.screen === 'countdown', canvas: CANVAS_SIZE,
      entities: this.entities, halves: this.halves, particles: this.particles,
      trails: isMenu ? [] : this.lastTrails, cursors: showStandardCursor ? this.cursorPos : [],
      score: this.state.score, lives: this.state.lives,
      maxLives: CONFIG.lives, highScore: this.highScore,
      level: this.state.level, levelName: lv.name,
      fruitsThisLevel: this.state.fruitsSlicedThisLevel, fruitsToAdvance: lv.fruitsToAdvance,
      comboCount: this.state.lastCombo, comboText: this.comboText, levelUpText: this.levelUpText,
      shake: this.shake, flash: this.flash, slowMoOverlay: this.slowMoOverlay, freezeOverlay: this.freezeOverlay, shrinkOverlay: this.shrinkOverlay, furyOverlay: this.furyOverlay, rainbowOverlay: this.rainbowOverlay, now,
      mode: this.gameMode,
      timeAttackElapsedMs,
      timeAttackDurationMs: this.timeAttackDurationMs,
    })
    this.drawOverlay(now)
  }

  private drawOverlay(now: number): void {
    const ctx = this.ctx
    const { width, height } = CANVAS_SIZE
    const cx = width / 2

    // Draw event visuals on top of everything
    this.eventScheduler?.draw(ctx, now)

    if (this.screen === 'title') {
      this.drawTitleScreen(ctx, cx, width, height, now)
    } else if (this.screen === 'gameover') {
      this.drawGameOverScreen(ctx, cx, width, height, now)
    } else if (this.screen === 'paused') {
      this.drawPauseScreen(ctx, cx, width, height, now)
    } else if (this.screen === 'calibrate') {
      const left = Math.max(0, Math.ceil((this.calibUntil - now) / 1000))
      this.drawSimpleOverlay(ctx, width, height, ['Calibrate', 'Wave both hands around the area you can comfortably reach', `${left}...`])
    } else if (this.screen === 'countdown') {
      const left = Math.max(1, Math.ceil((this.countdownUntil - now) / 1000))
      if (this.gameMode === 'zen') {
        this.drawSimpleOverlay(ctx, width, height, ['ZEN MODE', 'No bombs, no lives, slice freely', `${left}...`])
      } else if (this.gameMode === 'time-attack') {
        this.drawSimpleOverlay(ctx, width, height, ['TIME ATTACK', '60 seconds. Slice everything.', `${left}...`])
      } else {
        this.drawSimpleOverlay(ctx, width, height, [`${left}`])
      }
    } else if (this.screen === 'tutorial') {
      drawTutorialOverlay(ctx, this.tutorialState, now, width, height)
    }

    // Cursor (menu screens + tutorial)
    if ((this.screen === 'title' || this.screen === 'gameover' || this.screen === 'paused' || this.screen === 'tutorial') && this.cursorPos.length > 0) {
      const cursor = this.cursorPos[0]
      const pinching = this.latestSample.pinching?.[0] ?? false
      const hoveredBtn = this.menuButtons.length > 0
        ? this.menuButtons.find((b, _i) => pointInButton(b, cursor.x, cursor.y))
        : undefined
      drawMenuCursor(ctx, cursor, pinching, hoveredBtn?.holdProgress ?? 0)
    }
  }

  private drawTitleScreen(ctx: CanvasRenderingContext2D, cx: number, width: number, height: number, now: number): void {
    // Dark backdrop
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, width, height)

    // Title with gradient + glow
    const titleSize = Math.round(height * 0.09)
    const titleY = height * 0.28
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255,180,60,0.5)'
    ctx.shadowBlur = 30
    ctx.font = `bold ${titleSize}px sans-serif`
    const grad = ctx.createLinearGradient(0, titleY - titleSize / 2, 0, titleY + titleSize / 2)
    grad.addColorStop(0, '#ffd35e')
    grad.addColorStop(0.5, '#ff9e6d')
    grad.addColorStop(1, '#e0394e')
    ctx.fillStyle = grad
    ctx.fillText('FRUIT FURY', cx, titleY)

    // Best score
    ctx.shadowBlur = 0
    ctx.font = `${Math.round(height * 0.028)}px sans-serif`
    ctx.fillStyle = 'rgba(255,248,231,0.7)'
    ctx.fillText(`Best  ${this.highScore}`, cx, titleY + titleSize * 0.8)

    // Buttons
    for (const btn of this.menuButtons) drawButton(ctx, btn, now)

    // Hint
    const usingCamera = performance.now() - this.lastCameraHandT < 2000
    ctx.font = `${Math.round(height * 0.02)}px sans-serif`
    ctx.fillStyle = 'rgba(255,248,231,0.45)'
    ctx.fillText(usingCamera ? 'Hover + pinch to select  |  keys: Enter / C / F / M' : 'Click to select  |  keys: Enter / C / F / M', cx, height * 0.93)

    ctx.restore()
  }

  private drawGameOverScreen(ctx: CanvasRenderingContext2D, cx: number, width: number, height: number, now: number): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, width, height)

    // Title
    const titleSize = Math.round(height * 0.08)
    const titleY = height * 0.25
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    if (this.gameMode === 'zen') {
      // Zen mode: soft colors
      const reason = this.gameOverReason === 'timeup' ? "Time's Up!" : 'Run Complete'
      ctx.shadowColor = 'rgba(135,206,235,0.5)'
      ctx.shadowBlur = 20
      ctx.font = `bold ${titleSize}px sans-serif`
      ctx.fillStyle = '#87ceeb'
      ctx.fillText(reason, cx, titleY)
    } else if (this.gameMode === 'time-attack') {
      // Time attack: fiery orange
      ctx.shadowColor = 'rgba(255,120,30,0.5)'
      ctx.shadowBlur = 25
      ctx.font = `bold ${titleSize}px sans-serif`
      ctx.fillStyle = '#ff781e'
      ctx.fillText("Time's Up!", cx, titleY)
    } else {
      // Classic mode: red
      ctx.shadowColor = 'rgba(200,30,40,0.5)'
      ctx.shadowBlur = 25
      ctx.font = `bold ${titleSize}px sans-serif`
      ctx.fillStyle = '#e0394e'
      ctx.fillText('GAME OVER', cx, titleY)
    }

    // Stats panel
    ctx.shadowBlur = 0
    const statY = titleY + titleSize * 0.9
    ctx.font = `bold ${Math.round(height * 0.035)}px sans-serif`
    ctx.fillStyle = '#fff8e7'
    ctx.fillText(`Score  ${this.state.score}`, cx, statY)
    ctx.font = `${Math.round(height * 0.025)}px sans-serif`
    ctx.fillStyle = 'rgba(255,248,231,0.7)'
    if (this.gameMode === 'time-attack') {
      ctx.fillText(`Best  ${this.highScore}     Slices  ${this.state.fruitsSlicedThisLevel}`, cx, statY + height * 0.045)
    } else {
      ctx.fillText(`Best  ${this.highScore}     Level  ${this.state.level}`, cx, statY + height * 0.045)
    }

    // Buttons
    for (const btn of this.menuButtons) drawButton(ctx, btn, now)

    // Hint
    const usingCamera = performance.now() - this.lastCameraHandT < 2000
    ctx.font = `${Math.round(height * 0.02)}px sans-serif`
    ctx.fillStyle = 'rgba(255,248,231,0.45)'
    ctx.fillText(usingCamera ? 'Hover + pinch to select  |  Enter to play again' : 'Click to play again  |  Enter', cx, height * 0.93)

    ctx.restore()
  }

  private drawPauseScreen(ctx: CanvasRenderingContext2D, cx: number, width: number, height: number, now: number): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, width, height)

    const titleSize = Math.round(height * 0.08)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255,211,94,0.5)'
    ctx.shadowBlur = 25
    ctx.font = `bold ${titleSize}px sans-serif`
    ctx.fillStyle = '#ffd35e'
    ctx.fillText('PAUSED', cx, height * 0.25)

    // Buttons
    ctx.shadowBlur = 0
    for (const btn of this.menuButtons) drawButton(ctx, btn, now)

    // Hint
    const usingCamera = performance.now() - this.lastCameraHandT < 2000
    ctx.font = `${Math.round(height * 0.02)}px sans-serif`
    ctx.fillStyle = 'rgba(255,248,231,0.45)'
    ctx.fillText(usingCamera ? 'Hover + pinch to select  |  ESC to resume' : 'Click to select  |  ESC to resume', cx, height * 0.93)

    ctx.restore()
  }

  private buildEventWorld(): EventWorld {
    const game = this
    return {
      get entities() { return game.entities },
      rng: this.rng,
      canvas: CANVAS_SIZE,
      spawnParticles: (pos, color, count) => this.spawnParticles(pos, color, count),
      get shake() { return game.shake },
      setShake: (v: number) => { game.shake = v; },
      get flash() { return game.flash },
      setFlash: (v: number) => { game.flash = v; },
      setComboText: (text, until) => {
        this.comboText = text
        this.comboTextUntil = until
      },
      playSfx: (name) => this.audio.play(name as never),
      processSlice: (entity, now) => this.processSlice(entity, now),
      nextId: () => this.nextId++,
      fruitType: () => {
        const types = ['watermelon', 'apple', 'orange', 'lime', 'strawberry', 'pineapple', 'peach', 'kiwi'] as const
        return types[Math.floor(this.rng() * types.length)]
      },
      fruitRadius: () => {
        const base = 25 + this.state.level * 2
        return base + (this.rng() - 0.5) * 10
      },
      fruitRadiusFixed: () => this.state.levelConfig.fruitRadius,
      activateGoldenHour: (now: number) => this.state.activateGoldenHour(now),
    }
  }

  private processSlice(entity: Entity, now: number): void {
    if (entity.sliced) return
    entity.sliced = true
    if (entity.type === 'bomb') this.onBomb(entity)
    else if (entity.type === 'heart' || entity.type === 'golden-heart') this.onBonus(entity, now)
    else if (entity.type === 'slow-mo') this.onSlowMo(entity, now)
    else if (entity.type === 'shrink-ray') this.onShrinkRay(entity, now)
    else if (entity.type === 'freeze') this.onFreeze(entity, now)
    else this.onSlice(entity, now)
  }

  private drawSimpleOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, lines: string[]): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, width, height)
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff8e7'
    ctx.font = `bold ${Math.round(height * 0.075)}px sans-serif`; ctx.fillText(lines[0], width / 2, height / 2 - 40)
    ctx.font = `${Math.round(height * 0.032)}px sans-serif`
    lines.slice(1).forEach((l, i) => ctx.fillText(l, width / 2, height / 2 + 20 + i * 38))
    ctx.restore()
  }
}
