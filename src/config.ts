import type { CanvasSize } from './types'

/** Mutable canvas dimensions — updated on init and window resize. */
export const CANVAS_SIZE: CanvasSize = { width: 1280, height: 720 }

export const CONFIG = {
  hand: { fingertipLandmark: 8, maxHands: 2 },
  slash: { velocityThreshold: 700, trailLifetimeMs: 160, minSegmentPx: 4, smoothing: 0.4 },
  calibration: {
    sampleMs: 3000,
    margin: 0.04,
    defaultBox: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    storageKey: 'fruitFury.reachBox',
  },
  combo: { windowMs: 220 },
  lives: 5,
  points: { fruit: 10 },
  bonus: { heartHeal: 1, goldenHeartHeal: 5, heartChance: 0.025, goldenHeartChance: 0.008 },
  slowMo: { durationMs: 3000, chance: 0.04 },
  shrinkRay: { durationMs: 4000, chance: 0.03 },
  freeze: { durationMs: 2000, chance: 0.03 },
  particles: { maxCount: 400, perCut: 14 },
  audio: { masterVolume: 0.35 },
  highScoreKey: 'fruitFury.highScore',
  highScoreZenKey: 'fruitFury.highScore.zen',
  highScoreTimeAttackKey: 'fruitFury.highScore.timeAttack',
  timeAttack: {
    durationMs: 60_000,
    bombChance: 0,
    heartChance: 0,
    goldenHeartChance: 0,
    slowMoChance: 0.08,
    spawnIntervalMs: 1000,
    comboWindowMs: 300,
  },
  events: {
    fruitStorm: {
      minIntervalMs: 90000,
      maxIntervalMs: 180000,
      durationMs: 2000,
      spawnIntervalMs: 400,
      spawnCount: 2,
      enabled: true,
    },
    lightningStrike: {
      minIntervalMs: 60000,
      maxIntervalMs: 150000,
      chainRadius: 130,
      chainDelayMs: 200,
      boltDurationMs: 600,
      maxChainDepth: 4,
    },
    goldenHour: {
      intervalMs: 30000,
      durationMs: 5000,
      pointsMultiplier: 3,
    },
  },
  zen: {
    level: 99,
    bombChance: 0,
    heartChance: 0,
    goldenHeartChance: 0,
    slowMoChance: 0.08,
    spawnIntervalMs: 1200,
    comboWindowMs: 400,
  },
} as const
