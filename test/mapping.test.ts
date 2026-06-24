import { describe, it, expect } from 'vitest'
import { mapToGame } from '../src/engine/mapping'

const canvas = { width: 1000, height: 800 }

describe('mapToGame', () => {
  it('mirrors X: hand at left edge maps to canvas right', () => {
    const p = mapToGame({ x: 0, y: 0.5 }, canvas)
    expect(p.x).toBeCloseTo(1000)
  })
  it('maps center to canvas center', () => {
    const p = mapToGame({ x: 0.5, y: 0.5 }, canvas)
    expect(p.x).toBeCloseTo(500)
    expect(p.y).toBeCloseTo(400)
  })
  it('pure 1:1 mapping with no clamping', () => {
    const p = mapToGame({ x: 0.25, y: 0.75 }, canvas)
    expect(p.x).toBeCloseTo(750)
    expect(p.y).toBeCloseTo(600)
  })
  it('reaches the full canvas — no confinement to a sub-region', () => {
    const tl = mapToGame({ x: 1, y: 0 }, canvas)
    const br = mapToGame({ x: 0, y: 1 }, canvas)
    expect(tl.x).toBeCloseTo(0)
    expect(tl.y).toBeCloseTo(0)
    expect(br.x).toBeCloseTo(1000)
    expect(br.y).toBeCloseTo(800)
  })
})
