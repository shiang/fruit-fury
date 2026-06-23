import { describe, it, expect } from 'vitest'
import { mapToGame } from '../src/engine/mapping'

const canvas = { width: 1000, height: 800 }
const box = { minX: 0.2, minY: 0.2, maxX: 0.8, maxY: 0.8 }

describe('mapToGame', () => {
  it('mirrors X: hand at box left maps to canvas right', () => {
    const p = mapToGame({ x: 0.2, y: 0.5 }, box, canvas)
    expect(p.x).toBeCloseTo(1000)
  })
  it('maps box center to canvas center', () => {
    const p = mapToGame({ x: 0.5, y: 0.5 }, box, canvas)
    expect(p.x).toBeCloseTo(500)
    expect(p.y).toBeCloseTo(400)
  })
  it('clamps hand outside the box to canvas edges', () => {
    const p = mapToGame({ x: 1.0, y: 1.0 }, box, canvas)
    expect(p.x).toBeCloseTo(0)   // far right of reach -> left after mirror
    expect(p.y).toBeCloseTo(800)
  })
  it('does not divide by zero on a degenerate box', () => {
    const p = mapToGame({ x: 0.5, y: 0.5 }, { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, canvas)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
  })
})
