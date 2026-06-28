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
  mode: GameMode = 'classic'

  private comboCount = 0
  private comboLastT = -Infinity

  get levelConfig() {
    return getLevelConfig(this.level)
  }

  /** Get the combo window for the current mode. */
  get comboWindowMs(): number {
    return this.mode === 'zen' ? CONFIG.zen.comboWindowMs : CONFIG.combo.windowMs
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
    this.score += CONFIG.points.fruit * this.comboCount
    this.fruitsSlicedThisLevel += 1
  }

  sliceBomb(): void {
    if (this.isOver) return
    if (this.mode === 'zen') return // no-op in zen
    this.loseLife()
  }

  missFruit(): void {
    if (this.isOver) return
    if (this.mode === 'zen') return // no-op in zen
    this.loseLife()
  }

  /** Heal lives. Returns the actual number restored. */
  heal(amount: number): number {
    if (this.isOver) return 0
    if (this.mode === 'zen') return 0 // no-op in zen
    const before = this.lives
    this.lives = Math.min(this.lives + amount, CONFIG.lives)
    return this.lives - before
  }

  /** Returns true if the player has sliced enough fruit to advance. */
  checkLevelUp(): boolean {
    if (this.mode === 'zen') return false // no progression in zen
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

  private loseLife(): void {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = 0
      this.isOver = true
    }
  }
}
