export class GoldenHourEvent {
  isActive = false
  endAt = 0

  activate(now: number, durationMs: number, _multiplier: number): void {
    this.isActive = true
    this.endAt = now + durationMs
  }

  isActiveAt(now: number): boolean {
    return this.isActive && now < this.endAt
  }
}
