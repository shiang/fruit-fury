import type { Vec2, ReachBox, CanvasSize } from '../types'
import { clamp } from './math'

const EPS = 1e-6

/** Map a normalized hand point (0..1) into game-space pixels, mirroring X. */
export function mapToGame(hand: Vec2, box: ReachBox, canvas: CanvasSize): Vec2 {
  const bw = box.maxX - box.minX
  const bh = box.maxY - box.minY
  const nx = bw > EPS ? clamp((hand.x - box.minX) / bw, 0, 1) : 0.5
  const ny = bh > EPS ? clamp((hand.y - box.minY) / bh, 0, 1) : 0.5
  return { x: canvas.width * (1 - nx), y: canvas.height * ny }
}
