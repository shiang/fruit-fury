import type { CanvasSize, SpawnEvent, FruitType, LevelConfig } from '../types'
import { CONFIG } from '../config'

const FRUITS: FruitType[] = ['watermelon', 'apple', 'orange', 'lime', 'strawberry', 'pineapple', 'peach', 'kiwi']

/**
 * Build one spawn event from a LevelConfig. `rng` is an injected 0..1 source.
 * rng call order: type-roll, x-position, fruit-pick, vx-spread, peak-spread.
 * Launch speed is computed so the fruit peaks at canvas.height * peakRatio,
 * making bounce height scale correctly with any browser window size.
 */
export function makeSpawn(rng: () => number, canvas: CanvasSize, level: LevelConfig): SpawnEvent {
  const roll = rng()
  const goldenThreshold = level.bombChance + CONFIG.bonus.goldenHeartChance
  const heartThreshold = goldenThreshold + CONFIG.bonus.heartChance
  const slowMoThreshold = heartThreshold + CONFIG.slowMo.chance

  let type: SpawnEvent['type']
  let radius: number

  if (roll < level.bombChance) {
    type = 'bomb'
    radius = level.bombRadius
  } else if (roll < goldenThreshold) {
    type = 'golden-heart'
    radius = level.fruitRadius
  } else if (roll < heartThreshold) {
    type = 'heart'
    radius = level.fruitRadius
  } else if (roll < slowMoThreshold) {
    type = 'slow-mo'
    radius = level.fruitRadius
  } else {
    type = FRUITS[Math.floor(rng() * FRUITS.length) % FRUITS.length]
    radius = level.fruitRadius
  }

  const x = 0.15 * canvas.width + rng() * 0.7 * canvas.width
  const vx = (rng() - 0.5) * level.horizontalDrift
  const peakRatio = level.peakHeightMin + rng() * (level.peakHeightMax - level.peakHeightMin)

  const launchY = canvas.height + 60
  const peakY = canvas.height * peakRatio
  const riseHeight = launchY - peakY
  const speed = Math.sqrt(2 * level.gravity * riseHeight)

  return {
    type,
    pos: { x, y: launchY },
    vel: { x: vx, y: -speed },
    radius,
  }
}
