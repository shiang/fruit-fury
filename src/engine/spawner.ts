import type { CanvasSize, SpawnEvent, FruitType } from '../types'
import { clamp } from './math'
import { CONFIG } from '../config'

const FRUITS: FruitType[] = ['watermelon', 'apple', 'orange', 'lime']

export interface Difficulty { spawnIntervalMs: number; bombChance: number }

/** Linearly ramp interval down and bomb chance up over CONFIG.spawn.rampMs. */
export function difficultyAt(elapsedMs: number): Difficulty {
  const s = CONFIG.spawn
  const p = clamp(elapsedMs / s.rampMs, 0, 1)
  return {
    spawnIntervalMs: s.baseIntervalMs + (s.minIntervalMs - s.baseIntervalMs) * p,
    bombChance: s.baseBombChance + (s.maxBombChance - s.baseBombChance) * p,
  }
}

/**
 * Build one spawn event. `rng` is an injected 0..1 source (Math.random in prod).
 * rng call order is exactly: bomb-roll, x-position, fruit-pick, vx-spread, speed-spread.
 */
export function makeSpawn(rng: () => number, canvas: CanvasSize, elapsedMs: number): SpawnEvent {
  const s = CONFIG.spawn
  const { bombChance } = difficultyAt(elapsedMs)

  const isBomb = rng() < bombChance                                       // 1: bomb roll
  const x = 0.15 * canvas.width + rng() * 0.7 * canvas.width              // 2: x position
  const fruit = FRUITS[Math.floor(rng() * FRUITS.length) % FRUITS.length] // 3: fruit pick
  const vx = (rng() - 0.5) * 300                                         // 4: horizontal drift
  const speed = s.launchSpeed.min + rng() * (s.launchSpeed.max - s.launchSpeed.min) // 5: speed

  return {
    type: isBomb ? 'bomb' : fruit,
    pos: { x, y: canvas.height + 60 },
    vel: { x: vx, y: -speed },
    radius: isBomb ? s.radius.bomb : s.radius.fruit,
  }
}
