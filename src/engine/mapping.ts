import type { Vec2, CanvasSize } from '../types'

/**
 * Map a normalized hand/mouse point (0..1) into game-space pixels using pure
 * 1:1 mapping. X is mirrored to match the mirrored video feed. No clamping —
 * the cursor can reach the entire game window so the player is never confined
 * to a sub-region.
 */
export function mapToGame(hand: Vec2, canvas: CanvasSize): Vec2 {
  return { x: canvas.width * (1 - hand.x), y: canvas.height * hand.y }
}
