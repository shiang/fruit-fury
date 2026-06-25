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
  combo: { windowMs: 220, minForBonus: 3, bonusPerExtra: 50 },
  spawn: {
    radius: { fruit: 46, bomb: 40 },
  },
  lives: 5,
  points: { fruit: 10 },
  particles: { maxCount: 400, perCut: 14 },
  audio: { masterVolume: 0.35 },
  highScoreKey: 'fruitFury.highScore',
} as const
