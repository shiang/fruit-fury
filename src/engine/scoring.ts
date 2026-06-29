import { CONFIG } from '../config'
import type { GameMode } from '../types'
import { getLevelConfig } from './levels'

/** Mutable game state: score, lives, level progression, and rolling combo detection. */
export class GameState {
  score = 0
  lives: number = CONFIG.lives
  isOver = false
  lastCombo = 0
  level = 1
  fruitsSlicedThisLevel = 0
  slowMoUntil = 0
  freezeUntil = 0
  shrinkUntil = 0
  mode: GameMode = 'classic'

  private comboCount = 0
  private comboLastT = -Infinity

  // Golden hour state
  public goldenMultiplier = 1
  public goldenHourUntil = 0

  get levelConfig() {
    return getLevelConfig(this.level)
  }

  /** Get the combo window for the current mode. */
  get comboWindowMs(): number {
    if (this.mode === 'zen') return CONFIG.zen.comboWindowMs
    if (this.mode === 'time-attack') return CONFIG.timeAttack.comboWindowMs
    return CONFIG.combo.windowMs
  }

  /** Register a fruit slice at time t (ms). Handles combo accrual + scoring. */
  sliceFruit(t: number): void {
    if (this.isOver) return
    if (t - this.comboLastT <= this.comboWindowMs) {
      this.comboCount += 1
    } else {
      this.comboCount = 1
    }
    this.comboLastT = t
    this.lastCombo = this.comboCount

    // Combo chain multiplier: each slice in a combo is worth comboCount x base points
    // Golden hour multiplier stacks on top (default 1, 3 during golden hour)
    this.score += CONFIG.points.fruit * this.comboCount * this.goldenMultiplier
    this.fruitsSlicedThisLevel += 1
  }

  sliceBomb(): void {
    if (this.isOver) return
    if (this.mode === 'zen' || this.mode === 'time-attack') return // no-op in zen/time-attack
    this.loseLife()
  }

  missFruit(): void {
    if (this.isOver) return
    if (this.mode === 'zen' || this.mode === 'time-attack') return // no-op in zen/time-attack
    this.loseLife()
  }

  /** Heal lives. Returns the actual number restored. */
  heal(amount: number): number {
    if (this.isOver) return 0
    if (this.mode === 'zen' || this.mode === 'time-attack') return 0 // no-op in zen/time-attack
    const before = this.lives
    this.lives = Math.min(this.lives + amount, CONFIG.lives)
    return this.lives - before
  }

  /** Returns true if the player has sliced enough fruit to advance. */
  checkLevelUp(): boolean {
    if (this.mode === 'zen' || this.mode === 'time-attack') return false // no progression in zen/time-attack
    if (this.fruitsSlicedThisLevel >= this.levelConfig.fruitsToAdvance) {
      this.level += 1
      this.fruitsSlicedThisLevel = 0
      return true
    }
    return false
  }

  /** Check if slow-motion is currently active. Returns time scale (1 = normal, 0.3 = slow). */
  isSlowMoActive(now: number): number {
    if (now < this.slowMoUntil) {
      return 0.3 // 30% speed
    }
    return 1
  }

  /** Activate slow-motion for the configured duration. */
  activateSlowMo(now: number): void {
    this.slowMoUntil = now + CONFIG.slowMo.durationMs
  }

  /** Check if freeze is currently active. */
  isFrozen(now: number): boolean {
    return now < this.freezeUntil
  }

  /** Activate freeze for the configured duration. */
  activateFreeze(now: number): void {
    this.freezeUntil = now + CONFIG.freeze.durationMs
  }

  /** Check if shrink is currently active. */
  isShrinking(now: number): boolean {
    return now < this.shrinkUntil
  }

  /** Activate shrink for the configured duration. */
  activateShrink(now: number): void {
    this.shrinkUntil = now + CONFIG.shrinkRay.durationMs
  }

  /** Activate golden hour for the configured duration. Sets 3x points multiplier. */
  activateGoldenHour(now: number): void {
    this.goldenHourUntil = now + CONFIG.events.goldenHour.durationMs
    this.goldenMultiplier = CONFIG.events.goldenHour.pointsMultiplier
  }

  /** Returns true if golden hour is currently active. */
  isGoldenHourActive(now: number): boolean {
    if (now >= this.goldenHourUntil) {
      this.goldenMultiplier = 1
      return false
    }
    return true
  }

  private loseLife(): void {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = 0
      this.isOver = true
    }
  }
}
