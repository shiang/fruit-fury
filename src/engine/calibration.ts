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

/** Type guard: a persisted box is only trusted if all bounds are finite, in [0,1], and ordered. */
function isValidBox(b: unknown): b is ReachBox {
  if (typeof b !== 'object' || b === null) return false
  const r = b as Record<string, unknown>
  const nums = [r.minX, r.minY, r.maxX, r.maxY]
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) return false
  return (r.minX as number) < (r.maxX as number) && (r.minY as number) < (r.maxY as number)
}

export function loadReachBox(): ReachBox {
  try {
    const raw = localStorage.getItem(CONFIG.calibration.storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isValidBox(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return { ...DEFAULT }
}
