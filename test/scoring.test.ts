import { describe, it, expect } from 'vitest'
import { GameState } from '../src/engine/scoring'
import { getLevelConfig } from '../src/engine/levels'

describe('GameState', () => {
  it('starts with full lives and zero score', () => {
    const g = new GameState()
    expect(g.lives).toBe(5)
    expect(g.score).toBe(0)
    expect(g.isOver).toBe(false)
    expect(g.level).toBe(1)
  })

  it('adds points per fruit sliced', () => {
    const g = new GameState()
    g.sliceFruit(0)
    expect(g.score).toBe(10)
    expect(g.fruitsSlicedThisLevel).toBe(1)
  })

  it('applies combo chain multiplier: each slice in a combo is worth comboCount x base', () => {
    const g = new GameState()
    g.sliceFruit(0)      // combo 1: 10*1 = 10
    g.sliceFruit(50)     // combo 2: 10*2 = 20
    g.sliceFruit(100)    // combo 3: 10*3 = 30
    expect(g.score).toBe(60)  // 10 + 20 + 30
    expect(g.lastCombo).toBe(3)
  })

  it('resets combo when slices are spread beyond the window', () => {
    const g = new GameState()
    g.sliceFruit(0)      // combo 1: 10
    g.sliceFruit(300)    // gap > 220ms -> reset to combo 1: 10
    g.sliceFruit(600)    // combo 1 again: 10
    expect(g.lastCombo).toBe(1)
    expect(g.score).toBe(30)
  })

  it('does not combo when slices are spread beyond the window', () => {
    const g = new GameState()
    g.sliceFruit(0)
    g.sliceFruit(300)
    g.sliceFruit(600)
    expect(g.lastCombo).toBe(1)
    expect(g.score).toBe(30)
  })

  it('loses a life on a missed fruit and ends at zero', () => {
    const g = new GameState()
    g.missFruit(); g.missFruit(); g.missFruit(); g.missFruit(); expect(g.isOver).toBe(false)
    g.missFruit(); expect(g.lives).toBe(0); expect(g.isOver).toBe(true)
  })

  it('loses a life when a bomb is sliced', () => {
    const g = new GameState()
    g.sliceBomb()
    expect(g.lives).toBe(4)
  })

  it('levels up after slicing the required number of fruits', () => {
    const g = new GameState()
    const needed = getLevelConfig(1).fruitsToAdvance
    for (let i = 0; i < needed; i++) g.sliceFruit(i * 300)
    expect(g.checkLevelUp()).toBe(true)
    expect(g.level).toBe(2)
    expect(g.fruitsSlicedThisLevel).toBe(0)
  })

  it('does not level up before the required count', () => {
    const g = new GameState()
    g.sliceFruit(0)
    expect(g.checkLevelUp()).toBe(false)
    expect(g.level).toBe(1)
  })

  it('heal restores lives up to max', () => {
    const g = new GameState()
    g.sliceBomb()
    g.sliceBomb()
    expect(g.lives).toBe(3)
    g.heal(1)
    expect(g.lives).toBe(4)
    g.heal(10)
    expect(g.lives).toBe(5)
  })

  it('heal returns actual lives restored', () => {
    const g = new GameState()
    g.sliceBomb()
    expect(g.lives).toBe(4)
    expect(g.heal(1)).toBe(1)
    expect(g.heal(10)).toBe(0)
  })

  describe('slow-motion', () => {
    it('starts with normal time scale (1.0)', () => {
      const g = new GameState()
      expect(g.isSlowMoActive(0)).toBe(1)
    })

    it('returns 0.3 time scale while active', () => {
      const g = new GameState()
      g.activateSlowMo(1000)
      expect(g.isSlowMoActive(2000)).toBe(0.3)
    })

    it('returns 1.0 after duration expires', () => {
      const g = new GameState()
      g.activateSlowMo(0)
      expect(g.isSlowMoActive(4000)).toBe(1)
    })

    it('extends duration on re-activation', () => {
      const g = new GameState()
      g.activateSlowMo(0)
      expect(g.isSlowMoActive(2000)).toBe(0.3)
      g.activateSlowMo(2000)
      expect(g.isSlowMoActive(4500)).toBe(0.3)
      expect(g.isSlowMoActive(5000)).toBe(1)
    })
  })

  describe('zen mode', () => {
    it('missFruit is no-op', () => {
      const g = new GameState()
      g.mode = 'zen'
      g.lives = 3
      g.missFruit()
      expect(g.lives).toBe(3)
      expect(g.isOver).toBe(false)
    })

    it('sliceBomb is no-op', () => {
      const g = new GameState()
      g.mode = 'zen'
      g.lives = 3
      g.sliceBomb()
      expect(g.lives).toBe(3)
      expect(g.isOver).toBe(false)
    })

    it('heal is no-op', () => {
      const g = new GameState()
      g.mode = 'zen'
      g.lives = 2
      const restored = g.heal(1)
      expect(restored).toBe(0)
      expect(g.lives).toBe(2)
    })

    it('checkLevelUp always returns false', () => {
      const g = new GameState()
      g.mode = 'zen'
      for (let i = 0; i < 100; i++) g.sliceFruit(i * 300)
      expect(g.checkLevelUp()).toBe(false)
      expect(g.level).toBe(1)
    })

    it('combo window is 400ms (wider than classic 220ms)', () => {
      const g = new GameState()
      g.mode = 'zen'
      expect(g.comboWindowMs).toBe(400)
    })

    it('combo window is 220ms in classic mode', () => {
      const g = new GameState()
      expect(g.comboWindowMs).toBe(220)
    })

    it('timer defaults to active and 90s', () => {
      const g = new GameState()
      g.mode = 'zen'
      expect(g.timerActive).toBe(true)
      expect(g.timerDurationMs).toBe(90000)
      expect(g.timeRemaining).toBe(90000)
    })
  })
})
