import { describe, it, expect } from 'vitest'
import { makeSpawn } from '../src/engine/spawner'
import { getLevelConfig } from '../src/engine/levels'
import type { LevelConfig } from '../src/types'

const canvas = { width: 1280, height: 720 }
const lv1 = getLevelConfig(1)

describe('getLevelConfig', () => {
  it('returns predefined levels with correct names', () => {
    expect(getLevelConfig(1).name).toBe('Apple Orchard')
    expect(getLevelConfig(4).name).toBe('Tropical Paradise')
  })
  it('scales difficulty upward across levels', () => {
    const l1 = getLevelConfig(1)
    const l5 = getLevelConfig(5)
    expect(l5.spawnIntervalMs).toBeLessThan(l1.spawnIntervalMs)
    expect(l5.bombChance).toBeGreaterThan(l1.bombChance)
    expect(l5.gravity).toBeGreaterThanOrEqual(l1.gravity)
  })
  it('procedurally extends past the predefined table', () => {
    const l20 = getLevelConfig(20)
    expect(l20.level).toBe(20)
    expect(l20.spawnIntervalMs).toBeGreaterThanOrEqual(380)
    expect(l20.bombChance).toBeLessThanOrEqual(0.35)
  })
})

describe('makeSpawn', () => {
  it('launches from below the canvas moving upward', () => {
    const s = makeSpawn(() => 0.5, canvas, lv1)
    expect(s.pos.y).toBeGreaterThanOrEqual(canvas.height)
    expect(s.vel.y).toBeLessThan(0)
  })
  it('produces a bomb when rng is below the bomb chance', () => {
    const highBombLevel: LevelConfig = { ...lv1, bombChance: 0.2 }
    const seq = [0.0, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, highBombLevel)
    expect(s.type).toBe('bomb')
  })
  it('produces a fruit when rng is above the bomb chance', () => {
    const seq = [0.99, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, lv1)
    expect(s.type).not.toBe('bomb')
  })
})
