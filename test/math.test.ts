import { describe, it, expect } from 'vitest'
import { clamp, sub, len, dist } from '../src/engine/math'

describe('math', () => {
  it('clamps to range', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-2, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  it('subtracts vectors', () => {
    expect(sub({ x: 3, y: 5 }, { x: 1, y: 2 })).toEqual({ x: 2, y: 3 })
  })
  it('computes length and distance', () => {
    expect(len({ x: 3, y: 4 })).toBe(5)
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})
