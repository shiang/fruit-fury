import type { Vec2, TrailPoint, CuttingSegment } from '../types'
import { dist } from './math'

/** Tracks one hand: gates fast motion into cutting segments and keeps a fading trail. */
export class BladeTracker {
  private last: TrailPoint | null = null
  private trail: TrailPoint[] = []

  constructor(
    private velocityThreshold: number,
    private trailLifetimeMs: number,
    private minSegmentPx: number,
  ) {}

  /** Feed a new mapped position at time t (ms). Returns a cutting segment if "hot". */
  push(pos: Vec2, t: number): CuttingSegment | null {
    this.trail.push({ pos, t })
    const prev = this.last
    this.last = { pos, t }
    if (!prev) return null

    const dt = (t - prev.t) / 1000
    if (dt <= 0) return null

    const d = dist(prev.pos, pos)
    if (d < this.minSegmentPx) return null

    const speed = d / dt
    if (speed < this.velocityThreshold) return null

    return { from: prev.pos, to: pos }
  }

  /**
   * Trail points still within the fade lifetime, oldest first.
   * Side effect: prunes expired points from internal state. Returns a shallow
   * copy so callers cannot mutate the tracker's internal array.
   */
  getTrail(now: number): TrailPoint[] {
    this.trail = this.trail.filter((p) => now - p.t <= this.trailLifetimeMs)
    return this.trail.slice()
  }

  reset(): void {
    this.last = null
    this.trail = []
  }
}
