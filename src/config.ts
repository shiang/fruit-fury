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
  particles: { maxCount: 400, perCut: 14 },
  audio: { masterVolume: 0.35 },
  highScoreKey: 'fruitFury.highScore',
  highScoreZenKey: 'fruitFury.highScore.zen',
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
