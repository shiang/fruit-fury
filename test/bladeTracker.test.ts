import { describe, it, expect } from 'vitest'
import { BladeTracker } from '../src/engine/bladeTracker'

// threshold 700 px/s, trail lifetime 160ms, minSegment 4px
const make = () => new BladeTracker(700, 160, 4)

describe('BladeTracker', () => {
  it('emits no segment on the first sample', () => {
    const b = make()
    expect(b.push({ x: 0, y: 0 }, 0)).toBeNull()
  })

  it('emits a cutting segment when speed exceeds threshold', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    // 100px in 0.05s = 2000 px/s > 700
    const seg = b.push({ x: 100, y: 0 }, 50)
    expect(seg).not.toBeNull()
    expect(seg!.from).toEqual({ x: 0, y: 0 })
    expect(seg!.to).toEqual({ x: 100, y: 0 })
  })

  it('emits no segment for slow movement', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    // 10px in 0.1s = 100 px/s < 700
    expect(b.push({ x: 10, y: 0 }, 100)).toBeNull()
  })

  it('ignores sub-minimum jitter segments', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    // 2px movement < minSegment 4px even if fast
    expect(b.push({ x: 2, y: 0 }, 1)).toBeNull()
  })

  it('prunes trail points older than the lifetime', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    b.push({ x: 100, y: 0 }, 50)
    expect(b.getTrail(60).length).toBe(2)   // both within 160ms
    expect(b.getTrail(300).length).toBe(0)  // both older than 160ms
  })

  it('returns null when two samples share a timestamp (dt === 0)', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 10)
    expect(b.push({ x: 100, y: 0 }, 10)).toBeNull()
  })

  it('reset clears state so next push emits no segment', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    b.reset()
    expect(b.push({ x: 100, y: 0 }, 50)).toBeNull()
  })
})
