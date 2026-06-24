import { describe, it, expect } from 'vitest'
import { boxFromSamples } from '../src/engine/calibration'

describe('boxFromSamples', () => {
  it('returns the bounding box of samples plus margin', () => {
    const box = boxFromSamples(
      [{ x: 0.3, y: 0.4 }, { x: 0.7, y: 0.6 }, { x: 0.5, y: 0.2 }],
      0.0,
    )
    expect(box).toEqual({ minX: 0.3, minY: 0.2, maxX: 0.7, maxY: 0.6 })
  })
  it('applies margin and clamps to [0,1]', () => {
    const box = boxFromSamples([{ x: 0.05, y: 0.5 }, { x: 0.95, y: 0.5 }], 0.1)
    expect(box.minX).toBeCloseTo(0)      // 0.05 - 0.1 clamped to 0
    expect(box.maxX).toBeCloseTo(1)      // 0.95 + 0.1 clamped to 1
  })
  it('falls back to the default box when there are too few samples', () => {
    const box = boxFromSamples([], 0.04)
    expect(box).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 1 })
  })
})
