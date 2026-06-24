import { CONFIG } from '../config'

/** Mutable game state: score, lives, and rolling combo detection. */
export class GameState {
  score = 0
  lives: number = CONFIG.lives
  isOver = false
  lastCombo = 0

  private comboCount = 0
  private comboLastT = -Infinity

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
  }

  sliceBomb(): void {
    if (this.isOver) return
    this.loseLife()
  }

  missFruit(): void {
    if (this.isOver) return
    this.loseLife()
  }

  private loseLife(): void {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = 0
      this.isOver = true
    }
  }
}
