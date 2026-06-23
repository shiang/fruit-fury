import type { Vec2, ReachBox } from '../types'
import { clamp } from './math'
import { CONFIG } from '../config'

const DEFAULT = CONFIG.calibration.defaultBox

/** Derive a reach box from collected hand samples; margin pads each edge. */
export function boxFromSamples(samples: Vec2[], margin: number): ReachBox {
  if (samples.length < 2) return { ...DEFAULT }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of samples) {
    if (s.x < minX) minX = s.x
    if (s.x > maxX) maxX = s.x
    if (s.y < minY) minY = s.y
    if (s.y > maxY) maxY = s.y
  }
  return {
    minX: clamp(minX - margin, 0, 1),
    minY: clamp(minY - margin, 0, 1),
    maxX: clamp(maxX + margin, 0, 1),
    maxY: clamp(maxY + margin, 0, 1),
  }
}

/** Persist / load the reach box. Safe to call in non-browser (no-op load). */
export function saveReachBox(box: ReachBox): void {
  try {
    localStorage.setItem(CONFIG.calibration.storageKey, JSON.stringify(box))
  } catch { /* ignore */ }
}

export function loadReachBox(): ReachBox {
  try {
    const raw = localStorage.getItem(CONFIG.calibration.storageKey)
    if (raw) return JSON.parse(raw) as ReachBox
  } catch { /* ignore */ }
  return { ...DEFAULT }
}
