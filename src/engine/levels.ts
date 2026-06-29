import type { LevelConfig } from '../types'

// Easy start: big fruits, FEW of them, bounce near the top of the window.
// Hard end: small fruits, MORE of them, bounce lower (but still above half window),
// faster horizontal movement, more bombs.
const LEVELS: LevelConfig[] = [
  { level: 1,  name: 'Apple Orchard',     fruitsToAdvance: 8,  spawnIntervalMs: 1400, bombChance: 0.03, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.10, peakHeightMax: 0.16, gravity: 1000, burstCount: 1, horizontalDrift: 120, fruitRadius: 66, bombRadius: 46 },
  { level: 2,  name: 'Citrus Grove',      fruitsToAdvance: 10, spawnIntervalMs: 1300, bombChance: 0.05, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.13, peakHeightMax: 0.20, gravity: 1000, burstCount: 1, horizontalDrift: 160, fruitRadius: 62, bombRadius: 44 },
  { level: 3,  name: 'Berry Patch',       fruitsToAdvance: 14, spawnIntervalMs: 1200, bombChance: 0.07, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.16, peakHeightMax: 0.24, gravity: 1050, burstCount: 2, horizontalDrift: 200, fruitRadius: 58, bombRadius: 42 },
  { level: 4,  name: 'Tropical Paradise', fruitsToAdvance: 18, spawnIntervalMs: 1100, bombChance: 0.09, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.20, peakHeightMax: 0.28, gravity: 1050, burstCount: 2, horizontalDrift: 240, fruitRadius: 54, bombRadius: 42 },
  { level: 5,  name: 'Fruit Storm',       fruitsToAdvance: 22, spawnIntervalMs: 1000, bombChance: 0.12, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.24, peakHeightMax: 0.32, gravity: 1100, burstCount: 2, horizontalDrift: 280, fruitRadius: 50, bombRadius: 40 },
  { level: 6,  name: 'Orchard Blitz',     fruitsToAdvance: 28, spawnIntervalMs: 900,  bombChance: 0.15, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.28, peakHeightMax: 0.36, gravity: 1100, burstCount: 3, horizontalDrift: 320, fruitRadius: 46, bombRadius: 40 },
  { level: 7,  name: 'Bomb Garden',       fruitsToAdvance: 34, spawnIntervalMs: 800,  bombChance: 0.18, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.32, peakHeightMax: 0.40, gravity: 1150, burstCount: 3, horizontalDrift: 360, fruitRadius: 42, bombRadius: 38 },
  { level: 8,  name: 'Fruit Fury',        fruitsToAdvance: 40, spawnIntervalMs: 700,  bombChance: 0.22, goldenHeartChance: 0.008, heartChance: 0.025, slowMoChance: 0.04, shrinkRayChance: 0.03, freezeChance: 0.03, peakHeightMin: 0.36, peakHeightMax: 0.46, gravity: 1200, burstCount: 3, horizontalDrift: 400, fruitRadius: 38, bombRadius: 36 },
]

// Zen mode — endless, no bombs, no hearts, no lives. Fixed level 3 difficulty.
const ZEN_LEVEL: LevelConfig = {
  level: 99, name: 'Zen Garden', fruitsToAdvance: 14, spawnIntervalMs: 1200,
  bombChance: 0, goldenHeartChance: 0, heartChance: 0, slowMoChance: 0.08,
  shrinkRayChance: 0.03, freezeChance: 0.03,
  peakHeightMin: 0.16, peakHeightMax: 0.24, gravity: 1050, burstCount: 2,
  horizontalDrift: 200, fruitRadius: 58, bombRadius: 42,
}

// Time Attack: 60-second sprint, no bombs, no hearts, no lives. Fixed level 5 difficulty.
export const TIME_ATTACK_LEVEL: LevelConfig = {
  level: 98, name: 'Time Attack', fruitsToAdvance: 22, spawnIntervalMs: 1000,
  bombChance: 0, goldenHeartChance: 0, heartChance: 0, slowMoChance: 0.08,
  shrinkRayChance: 0.03, freezeChance: 0.03,
  peakHeightMin: 0.24, peakHeightMax: 0.32, gravity: 1100, burstCount: 2,
  horizontalDrift: 280, fruitRadius: 50, bombRadius: 40,
}

const PREDEFINED_COUNT = LEVELS.length

/** Return the LevelConfig for a given 1-based level number. Scales procedurally past the predefined table. */
export function getLevelConfig(level: number): LevelConfig {
  if (level === ZEN_LEVEL.level) return ZEN_LEVEL
  if (level === TIME_ATTACK_LEVEL.level) return TIME_ATTACK_LEVEL
  if (level >= 1 && level <= PREDEFINED_COUNT) return LEVELS[level - 1]

  const base = LEVELS[PREDEFINED_COUNT - 1]
  const excess = Math.max(0, level - PREDEFINED_COUNT)
  return {
    level,
    name: `Level ${level}`,
    fruitsToAdvance: base.fruitsToAdvance + excess * 5,
    spawnIntervalMs: Math.max(550, base.spawnIntervalMs - excess * 30),
    bombChance: Math.min(0.35, base.bombChance + excess * 0.02),
    goldenHeartChance: base.goldenHeartChance,
    heartChance: base.heartChance,
    slowMoChance: base.slowMoChance,
    shrinkRayChance: base.shrinkRayChance,
    freezeChance: base.freezeChance,
    peakHeightMin: Math.min(0.48, base.peakHeightMin + excess * 0.015),
    peakHeightMax: Math.min(0.50, base.peakHeightMax + excess * 0.01),
    gravity: base.gravity + excess * 25,
    burstCount: Math.min(4, base.burstCount + Math.floor(excess / 4)),
    horizontalDrift: Math.min(600, base.horizontalDrift + excess * 20),
    fruitRadius: Math.max(28, base.fruitRadius - excess * 2),
    bombRadius: Math.max(32, base.bombRadius - excess * 1),
  }
}
