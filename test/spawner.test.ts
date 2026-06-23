import { describe, it, expect } from 'vitest'
import { difficultyAt, makeSpawn } from '../src/engine/spawner'

const canvas = { width: 1280, height: 720 }

describe('difficultyAt', () => {
  it('starts at base interval and base bomb chance', () => {
    const d = difficultyAt(0)
    expect(d.spawnIntervalMs).toBeCloseTo(1100)
    expect(d.bombChance).toBeCloseTo(0.07)
  })
  it('ramps toward min interval and max bomb chance over time', () => {
    const d = difficultyAt(60000)
    expect(d.spawnIntervalMs).toBeCloseTo(450)
    expect(d.bombChance).toBeCloseTo(0.2)
  })
  it('does not overshoot past full ramp', () => {
    const d = difficultyAt(999999)
    expect(d.spawnIntervalMs).toBeCloseTo(450)
    expect(d.bombChance).toBeCloseTo(0.2)
  })
})

describe('makeSpawn', () => {
  it('launches from below the canvas moving upward', () => {
    const s = makeSpawn(() => 0.5, canvas, 0)
    expect(s.pos.y).toBeGreaterThanOrEqual(canvas.height)
    expect(s.vel.y).toBeLessThan(0)
  })
  it('produces a bomb when rng is below the bomb chance', () => {
    // first rng call decides bomb; force it tiny
    const seq = [0.0, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, 60000)
    expect(s.type).toBe('bomb')
  })
  it('produces a fruit when rng is above the bomb chance', () => {
    const seq = [0.99, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, 0)
    expect(s.type).not.toBe('bomb')
  })
})
