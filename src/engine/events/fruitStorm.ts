import type { Entity } from '../../types'
import type { EventWorld, FruitStormConfig } from './types'

export class FruitStormEvent {
  private spawnTimer = 0
  private endAt = 0
  private started = false
  private config!: FruitStormConfig

  start(now: number, config: FruitStormConfig): void {
    this.config = config
    this.spawnTimer = 0
    this.endAt = now + config.durationMs
    this.started = true
  }

  update(now: number, dt: number, world: EventWorld): void {
    if (!this.started) return
    if (now >= this.endAt) {
      this.started = false
      return
    }

    this.spawnTimer -= dt * 1000
    if (this.spawnTimer <= 0) {
      for (let b = 0; b < this.config.spawnCount; b++) {
        const x = 0.1 * world.canvas.width + world.rng() * 0.8 * world.canvas.width
        const type = world.fruitType()
        const radius = world.fruitRadiusFixed()
        const vx = (world.rng() - 0.5) * 160
        const vy = 250 + world.rng() * 350
        const fruit: Entity = {
          id: world.nextId(),
          type,
          pos: { x, y: -radius - 10 },
          vel: { x: vx, y: vy },
          radius,
          baseRadius: radius,
          rotation: 0,
          angularVel: (world.rng() - 0.5) * 6,
          sliced: false,
        }
        world.entities.push(fruit)
      }
      this.spawnTimer = this.config.spawnIntervalMs
    }
  }

  isFinished(now: number): boolean {
    return !this.started || now >= this.endAt
  }

  draw(_ctx: CanvasRenderingContext2D, _now: number): void {
    // No persistent visual — fruits themselves are drawn by the renderer.
    // A subtle top-of-screen vignette could be added here in the future.
  }
}
