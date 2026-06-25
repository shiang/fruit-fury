import type { LevelConfig } from '../types'

const LEVELS: LevelConfig[] = [
  { level: 1,  name: 'Apple Orchard',     fruitsToAdvance: 8,  spawnIntervalMs: 1200, bombChance: 0.05, launchSpeedMin: 1050, launchSpeedMax: 1250, gravity: 1100, burstCount: 1, horizontalDrift: 250 },
  { level: 2,  name: 'Citrus Grove',      fruitsToAdvance: 12, spawnIntervalMs: 1050, bombChance: 0.08, launchSpeedMin: 1080, launchSpeedMax: 1300, gravity: 1100, burstCount: 1, horizontalDrift: 280 },
  { level: 3,  name: 'Berry Patch',       fruitsToAdvance: 16, spawnIntervalMs: 950,  bombChance: 0.10, launchSpeedMin: 1100, launchSpeedMax: 1350, gravity: 1150, burstCount: 1, horizontalDrift: 300 },
  { level: 4,  name: 'Tropical Paradise', fruitsToAdvance: 20, spawnIntervalMs: 850,  bombChance: 0.12, launchSpeedMin: 1150, launchSpeedMax: 1380, gravity: 1150, burstCount: 2, horizontalDrift: 320 },
  { level: 5,  name: 'Fruit Storm',       fruitsToAdvance: 25, spawnIntervalMs: 750,  bombChance: 0.14, launchSpeedMin: 1180, launchSpeedMax: 1420, gravity: 1200, burstCount: 2, horizontalDrift: 350 },
  { level: 6,  name: 'Orchard Blitz',     fruitsToAdvance: 30, spawnIntervalMs: 680,  bombChance: 0.16, launchSpeedMin: 1200, launchSpeedMax: 1450, gravity: 1200, burstCount: 2, horizontalDrift: 380 },
  { level: 7,  name: 'Bomb Garden',       fruitsToAdvance: 35, spawnIntervalMs: 600,  bombChance: 0.18, launchSpeedMin: 1220, launchSpeedMax: 1480, gravity: 1250, burstCount: 3, horizontalDrift: 400 },
  { level: 8,  name: 'Fruit Fury',        fruitsToAdvance: 40, spawnIntervalMs: 520,  bombChance: 0.20, launchSpeedMin: 1250, launchSpeedMax: 1520, gravity: 1250, burstCount: 3, horizontalDrift: 420 },
]

const PREDEFINED_COUNT = LEVELS.length

/** Return the LevelConfig for a given 1-based level number. Scales procedurally past the predefined table. */
export function getLevelConfig(level: number): LevelConfig {
  if (level >= 1 && level <= PREDEFINED_COUNT) return LEVELS[level - 1]

  const base = LEVELS[PREDEFINED_COUNT - 1]
  const excess = Math.max(0, level - PREDEFINED_COUNT)
  return {
    level,
    name: `Level ${level}`,
    fruitsToAdvance: base.fruitsToAdvance + excess * 5,
    spawnIntervalMs: Math.max(380, base.spawnIntervalMs - excess * 40),
    bombChance: Math.min(0.35, base.bombChance + excess * 0.02),
    launchSpeedMin: base.launchSpeedMin + excess * 20,
    launchSpeedMax: base.launchSpeedMax + excess * 25,
    gravity: base.gravity + excess * 25,
    burstCount: Math.min(4, base.burstCount + Math.floor(excess / 3)),
    horizontalDrift: Math.min(550, base.horizontalDrift + excess * 20),
  }
}
