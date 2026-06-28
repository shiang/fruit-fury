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
  it('starts easy: big fruits, fewer fruits, higher bounce', () => {
    const l1 = getLevelConfig(1)
    const l8 = getLevelConfig(8)
    expect(l1.fruitRadius).toBeGreaterThan(l8.fruitRadius)
    expect(l1.burstCount).toBeLessThanOrEqual(l8.burstCount)
    expect(l1.peakHeightMax).toBeLessThan(l8.peakHeightMin)
    expect(l1.spawnIntervalMs).toBeGreaterThan(l8.spawnIntervalMs)
  })
  it('difficulty scales upward across levels', () => {
    const l1 = getLevelConfig(1)
    const l5 = getLevelConfig(5)
    expect(l5.fruitRadius).toBeLessThan(l1.fruitRadius)
    expect(l5.peakHeightMin).toBeGreaterThan(l1.peakHeightMin)
    expect(l5.bombChance).toBeGreaterThan(l1.bombChance)
    expect(l5.horizontalDrift).toBeGreaterThan(l1.horizontalDrift)
  })
  it('hardest level still bounces above half window', () => {
    const l8 = getLevelConfig(8)
    expect(l8.peakHeightMax).toBeLessThanOrEqual(0.5)
  })
  it('procedurally extends past the predefined table', () => {
    const l20 = getLevelConfig(20)
    expect(l20.level).toBe(20)
    expect(l20.spawnIntervalMs).toBeGreaterThanOrEqual(550)
    expect(l20.bombChance).toBeLessThanOrEqual(0.35)
    expect(l20.fruitRadius).toBeGreaterThanOrEqual(28)
    expect(l20.peakHeightMax).toBeLessThanOrEqual(0.5)
  })

  it('returns zen level 99 without procedural scaling', () => {
    const zen = getLevelConfig(99)
    expect(zen.name).toBe('Zen Garden')
    expect(zen.bombChance).toBe(0)
    expect(zen.goldenHeartChance).toBe(0)
    expect(zen.heartChance).toBe(0)
    expect(zen.slowMoChance).toBe(0.08)
    expect(zen.spawnIntervalMs).toBe(1200)
    expect(zen.peakHeightMin).toBe(0.16)
    expect(zen.peakHeightMax).toBe(0.24)
    expect(zen.gravity).toBe(1050)
    expect(zen.burstCount).toBe(2)
    expect(zen.horizontalDrift).toBe(200)
    expect(zen.fruitRadius).toBe(58)
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
  it('uses per-level fruit radius', () => {
    const s = makeSpawn(() => 0.99, canvas, lv1)
    expect(s.radius).toBe(lv1.fruitRadius)
  })
  it('uses per-level bomb radius', () => {
    const highBombLevel: LevelConfig = { ...lv1, bombChance: 0.2 }
    const s = makeSpawn(() => 0.0, canvas, highBombLevel)
    expect(s.radius).toBe(lv1.bombRadius)
  })
  it('produces a heart when rng falls in the heart window', () => {
    const seq = [0.06, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, lv1)
    expect(s.type).toBe('heart')
  })
  it('produces a golden-heart when rng falls in the golden window', () => {
    const seq = [0.035, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, lv1)
    expect(s.type).toBe('golden-heart')
  })
  it('scales launch speed with canvas height for consistent bounce', () => {
    const tallCanvas = { width: 1280, height: 1440 }
    const s720 = makeSpawn(() => 0.5, canvas, lv1)
    const s1440 = makeSpawn(() => 0.5, tallCanvas, lv1)
    // Taller window needs proportionally more speed to reach the same peak ratio
    expect(s1440.vel.y).toBeLessThan(s720.vel.y)
    // Verify peak height matches the level config ratio
    const peak720 = (canvas.height + 60) - s720.vel.y ** 2 / (2 * lv1.gravity)
    const expectedPeak = canvas.height * (lv1.peakHeightMin + lv1.peakHeightMax) / 2
    expect(peak720).toBeCloseTo(expectedPeak, -1)
  })
})
