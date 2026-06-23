import { describe, it, expect } from 'vitest'
import { segmentHitsCircle } from '../src/engine/collision'

describe('segmentHitsCircle', () => {
  it('detects a segment passing through a circle', () => {
    expect(segmentHitsCircle({ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })
  it('detects a segment ending inside a circle', () => {
    expect(segmentHitsCircle({ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })
  it('returns false when the segment misses', () => {
    expect(segmentHitsCircle({ x: -10, y: 20 }, { x: 10, y: 20 }, { x: 0, y: 0 }, 5)).toBe(false)
  })
  it('returns false when the segment is short of the circle', () => {
    expect(segmentHitsCircle({ x: -20, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 0 }, 5)).toBe(false)
  })
})
