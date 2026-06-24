import type { Vec2 } from '../types'

/** True if segment AB comes within `radius` of `center` (closest-point test). */
export function segmentHitsCircle(a: Vec2, b: Vec2, center: Vec2, radius: number): boolean {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lenSq = abx * abx + aby * aby
  let t = 0
  if (lenSq > 0) {
    t = ((center.x - a.x) * abx + (center.y - a.y) * aby) / lenSq
    t = t < 0 ? 0 : t > 1 ? 1 : t
  }
  const cx = a.x + abx * t
  const cy = a.y + aby * t
  const dx = center.x - cx
  const dy = center.y - cy
  return dx * dx + dy * dy <= radius * radius
}
