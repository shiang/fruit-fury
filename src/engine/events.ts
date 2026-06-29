import { CONFIG } from '../config'
import type { EventWorld, GameEvent, EventConfig, LightningStrikeConfig, FruitStormConfig } from './events/types'
import { FruitStormEvent } from './events/fruitStorm'
import { LightningStrikeEvent } from './events/lightningStrike'
import { GoldenHourEvent } from './events/goldenHour'

/**
 * Central scheduler that manages all environmental events.
 * Shared across every game mode — no mode-specific event code.
 */
export class EventScheduler {
  private nextStormAt = 0
  private nextLightningAt = 0
  private nextGoldenHour = 0
  private activeEvents: GameEvent[] = []
  private gameOver = false

  // Per-event state
  private fruitStorm = new FruitStormEvent()
  private lightningStrike = new LightningStrikeEvent()
  private goldenHour = new GoldenHourEvent()

  constructor(
    private world: EventWorld,
    private config: EventConfig = CONFIG.events,
    private startTime: number = 0,
  ) {
    // First random event after 5s grace period
    this.nextStormAt = this.startTime + 5000
    this.nextLightningAt = this.startTime + 5000
    // First golden hour at gameStartTime + intervalMs
    this.nextGoldenHour = this.startTime + this.config.goldenHour.intervalMs
  }

  update(now: number, dt: number): void {
    if (this.gameOver) return

    // --- Random event triggering (independent cooldowns) ---
    if (now >= this.nextStormAt) {
      this.tryTriggerStorm(now)
      this.nextStormAt = now + this.config.fruitStorm.minIntervalMs + this.world.rng() * (this.config.fruitStorm.maxIntervalMs - this.config.fruitStorm.minIntervalMs)
    }
    if (now >= this.nextLightningAt) {
      this.tryTriggerLightning(now)
      this.nextLightningAt = now + this.config.lightningStrike.minIntervalMs + this.world.rng() * (this.config.lightningStrike.maxIntervalMs - this.config.lightningStrike.minIntervalMs)
    }

    // --- Periodic golden hour ---
    if (now >= this.nextGoldenHour && !this.goldenHour.isActive) {
      this.activateGoldenHour(now)
      this.nextGoldenHour = now + this.config.goldenHour.intervalMs
    }

    // --- Check golden hour expiry ---
    if (this.goldenHour.isActive && now >= this.goldenHour.endAt) {
      this.goldenHour.isActive = false
      this.world.playSfx('goldenEnd')
    }

    // --- Update active events ---
    const remaining: GameEvent[] = []
    for (const event of this.activeEvents) {
      event.update(now, dt, this.world)
      if (!event.isFinished(now)) {
        remaining.push(event)
      }
    }
    this.activeEvents = remaining
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    for (const event of this.activeEvents) {
      event.draw(ctx, now)
    }
    // Draw golden overlay last so it covers everything
    if (this.goldenHour.isActive) {
      this.drawGoldenOverlay(ctx, now)
    }
  }

  setGameOver(): void {
    this.gameOver = true
  }

  isGoldenHourActive(now: number): boolean {
    return this.goldenHour.isActiveAt(now)
  }

  // --- Random event logic ---

  private tryTriggerStorm(now: number): void {
    if (!this.config.fruitStorm.enabled) return
    if (this.activeEvents.some((e) => e instanceof FruitStormEvent)) return
    if (this.world.entities.filter(e => !e.sliced && !['bomb', 'heart', 'golden-heart', 'slow-mo', 'shrink-ray', 'freeze'].includes(e.type)).length === 0) return
    this.activateFruitStorm(now)
  }

  private tryTriggerLightning(now: number): void {
    if (this.activeEvents.some((e) => e instanceof LightningStrikeEvent)) return
    const fruits = this.world.entities.filter(
      e => !e.sliced && !['bomb', 'heart', 'golden-heart', 'slow-mo', 'shrink-ray', 'freeze'].includes(e.type),
    )
    if (fruits.length === 0) return
    this.activateLightningStrike(now)
  }

  private activateFruitStorm(now: number): void {
    if (this.activeEvents.some((e) => e instanceof FruitStormEvent)) return
    const config: FruitStormConfig = {
      durationMs: this.config.fruitStorm.durationMs,
      spawnIntervalMs: this.config.fruitStorm.spawnIntervalMs,
      spawnCount: this.config.fruitStorm.spawnCount,
    }
    this.fruitStorm.start(now, config)
    this.activeEvents.push(this.fruitStorm as unknown as GameEvent)
    this.world.playSfx('storm')
    this.world.setComboText('🌧️ Fruit Storm!', now + 1500)
  }

  private activateLightningStrike(now: number): void {
    // Find a fruit-type entity to target
    const fruits = this.world.entities.filter(
      (e) => !e.sliced && !['bomb', 'heart', 'golden-heart', 'slow-mo', 'shrink-ray', 'freeze'].includes(e.type),
    )
    if (fruits.length === 0) return
    if (this.activeEvents.some((e) => e instanceof LightningStrikeEvent)) return

    const target = fruits[Math.floor(this.world.rng() * fruits.length)]
    const config: LightningStrikeConfig = this.config.lightningStrike
    this.lightningStrike.start(target, now, config, this.world)
    this.activeEvents.push(this.lightningStrike as unknown as GameEvent)
    this.world.playSfx('lightning')
    this.world.setComboText('⚡ Lightning Strike!', now + 1500)
  }

  private activateGoldenHour(now: number): void {
    this.goldenHour.activate(now, this.config.goldenHour.durationMs, this.config.goldenHour.pointsMultiplier)
    this.world.activateGoldenHour(now)
    this.world.playSfx('goldenStart')
    this.world.setComboText('✨ Golden Hour! 3x Points!', now + 2000)
  }

  // --- Golden hour visual ---

  private drawGoldenOverlay(ctx: CanvasRenderingContext2D, _now: number): void {
    const pulse = 0.04 + 0.025 * Math.sin(_now * 0.004)
    ctx.save()
    ctx.fillStyle = `rgba(255,215,0,${pulse})`
    ctx.fillRect(-40, -40, this.world.canvas.width + 80, this.world.canvas.height + 80)

    // Sparkle dots scattered across the screen
    const sparkleCount = 12
    for (let i = 0; i < sparkleCount; i++) {
      const seed = i * 7919 // prime for pseudo-random spread
      const sx = ((seed * 13) % this.world.canvas.width)
      const sy = ((seed * 17) % this.world.canvas.height)
      const sparkleAge = (_now * 0.003 + i * 0.7) % (Math.PI * 2)
      const sparkleAlpha = 0.3 + 0.4 * Math.max(0, Math.sin(sparkleAge))
      const sparkleSize = 2 + Math.sin(sparkleAge) * 1.5
      ctx.fillStyle = `rgba(255,255,200,${sparkleAlpha})`
      ctx.beginPath()
      ctx.arc(sx, sy, sparkleSize, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}
