import { describe, it, expect } from 'vitest'
import { GameState } from '../src/engine/scoring'

describe('GameState', () => {
  it('starts with full lives and zero score', () => {
    const g = new GameState()
    expect(g.lives).toBe(3)
    expect(g.score).toBe(0)
    expect(g.isOver).toBe(false)
  })

  it('adds points per fruit sliced', () => {
    const g = new GameState()
    g.sliceFruit(0)
    expect(g.score).toBe(10)
  })

  it('awards a combo bonus for 3+ fruit within the combo window', () => {
    const g = new GameState()
    g.sliceFruit(0)
    g.sliceFruit(50)
    g.sliceFruit(100)   // 3 within 220ms -> combo
    // 3*10 base + bonus (1 extra over the min of 3 -> 0 extra) => bonus = 50*(3-2)=50
    expect(g.score).toBe(30 + 50)
    expect(g.lastCombo).toBe(3)
  })

  it('does not combo when slices are spread beyond the window', () => {
    const g = new GameState()
    g.sliceFruit(0)
    g.sliceFruit(300)   // gap > 220ms resets the run
    g.sliceFruit(600)
    expect(g.lastCombo).toBe(1)
    expect(g.score).toBe(30)
  })

  it('loses a life on a missed fruit and ends at zero', () => {
    const g = new GameState()
    g.missFruit(); g.missFruit(); expect(g.isOver).toBe(false)
    g.missFruit(); expect(g.lives).toBe(0); expect(g.isOver).toBe(true)
  })

  it('loses a life when a bomb is sliced', () => {
    const g = new GameState()
    g.sliceBomb()
    expect(g.lives).toBe(2)
  })
})
