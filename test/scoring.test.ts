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

  it('awards a combo bonus for 3+ fruit within the combo window', () => {
    const g = new GameState()
    g.sliceFruit(0)
    g.sliceFruit(50)
    g.sliceFruit(100)   // 3 within 220ms -> combo
    expect(g.score).toBe(30 + 50)
    expect(g.lastCombo).toBe(3)
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
})
