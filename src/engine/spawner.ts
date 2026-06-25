import type { CanvasSize, SpawnEvent, FruitType, LevelConfig } from '../types'
import { CONFIG } from '../config'

const FRUITS: FruitType[] = ['watermelon', 'apple', 'orange', 'lime', 'strawberry', 'pineapple', 'peach', 'kiwi']

/**
 * Build one spawn event from a LevelConfig. `rng` is an injected 0..1 source.
 * rng call order: bomb-roll, x-position, fruit-pick, vx-spread, speed-spread.
 */
export function makeSpawn(rng: () => number, canvas: CanvasSize, level: LevelConfig): SpawnEvent {
  const isBomb = rng() < level.bombChance
  const x = 0.15 * canvas.width + rng() * 0.7 * canvas.width
  const fruit = FRUITS[Math.floor(rng() * FRUITS.length) % FRUITS.length]
  const vx = (rng() - 0.5) * level.horizontalDrift
  const speed = level.launchSpeedMin + rng() * (level.launchSpeedMax - level.launchSpeedMin)

  return {
    type: isBomb ? 'bomb' : fruit,
    pos: { x, y: canvas.height + 60 },
    vel: { x: vx, y: -speed },
    radius: isBomb ? CONFIG.spawn.radius.bomb : CONFIG.spawn.radius.fruit,
  }
}
