import { CONFIG } from '../config'
import { getLevelConfig } from './levels'

/** Mutable game state: score, lives, level progression, and rolling combo detection. */
export class GameState {
  score = 0
  lives: number = CONFIG.lives
  isOver = false
  lastCombo = 0
  level = 1
  fruitsSlicedThisLevel = 0

  private comboCount = 0
  private comboLastT = -Infinity

  get levelConfig() {
    return getLevelConfig(this.level)
  }

  /** Register a fruit slice at time t (ms). Handles combo accrual + scoring. */
  sliceFruit(t: number): void {
    if (this.isOver) return
    if (t - this.comboLastT <= CONFIG.combo.windowMs) {
      this.comboCount += 1
    } else {
      this.comboCount = 1
    }
    this.comboLastT = t
    this.lastCombo = this.comboCount

    this.score += CONFIG.points.fruit
    if (this.comboCount >= CONFIG.combo.minForBonus) {
      this.score += CONFIG.combo.bonusPerExtra * (this.comboCount - (CONFIG.combo.minForBonus - 1))
    }
    this.fruitsSlicedThisLevel += 1
  }

  sliceBomb(): void {
    if (this.isOver) return
    this.loseLife()
  }

  missFruit(): void {
    if (this.isOver) return
    this.loseLife()
  }

  /** Heal lives. Returns the actual number restored. */
  heal(amount: number): number {
    if (this.isOver) return 0
    const before = this.lives
    this.lives = Math.min(this.lives + amount, CONFIG.lives)
    return this.lives - before
  }

  /** Returns true if the player has sliced enough fruit to advance. */
  checkLevelUp(): boolean {
    if (this.fruitsSlicedThisLevel >= this.levelConfig.fruitsToAdvance) {
      this.level += 1
      this.fruitsSlicedThisLevel = 0
      return true
    }
    return false
  }

  private loseLife(): void {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = 0
      this.isOver = true
    }
  }
}
