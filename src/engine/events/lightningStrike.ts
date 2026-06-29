import type { Entity, Vec2 } from '../../types'
import { generateLightningBolt, drawLightningBolt } from './lightningBolt'
import type { EventWorld, LightningStrikeConfig } from './types'

interface ChainStep {
  fruits: Entity[]
  atTime: number
  depth: number
}

export class LightningStrikeEvent {
  private bolt: Vec2[] = []
  private boltStart = 0
  private boltDuration = 0
  private chainQueue: ChainStep[] = []
  private started = false
  private config!: LightningStrikeConfig
  private world!: EventWorld

  start(target: Entity, now: number, config: LightningStrikeConfig, world: EventWorld): void {
    this.world = world
    this.config = config
    this.boltStart = now
    this.boltDuration = config.boltDurationMs
    this.bolt = generateLightningBolt(
      { x: target.pos.x, y: -10 },
      target.pos,
      80,
      7,
      this.world.rng,
    )
    this.chainQueue = []

    // Slice the initial target immediately
    world.processSlice(target, now)
    world.spawnParticles(target.pos, '#ffff88', 10)
    world.setShake(0.6)
    world.setFlash(0.5)

    // Schedule chain reaction
    const nearby = this.findNearby(target, world)
    if (nearby.length > 0) {
      this.chainQueue.push({
        fruits: nearby,
        atTime: now + config.chainDelayMs,
        depth: 1,
      })
    }

    this.started = true
  }

  update(now: number, _dt: number, world: EventWorld): void {
    if (!this.started) return

    // Process chain steps that are due
    while (this.chainQueue.length > 0 && this.chainQueue[0].atTime <= now) {
      const step = this.chainQueue.shift()!
      const nextStepFruits: Entity[] = []

      for (const fruit of step.fruits) {
        if (fruit.sliced) continue
        const isFruit = !['bomb', 'heart', 'golden-heart', 'slow-mo', 'shrink-ray', 'freeze'].includes(fruit.type)
        if (!isFruit) continue

        // Process slice effects through world callback (it sets sliced = true internally)
        world.processSlice(fruit, now)
        this.bolt = generateLightningBolt(
          { x: fruit.pos.x, y: -10 },
          fruit.pos,
          50,
          5,
          this.world.rng,
        )
        this.boltStart = now
        this.boltDuration = this.config.boltDurationMs
        world.spawnParticles(fruit.pos, '#ffff88', 6)

        // Schedule next chain level
        if (step.depth < this.config.maxChainDepth) {
          const deeper = this.findNearby(fruit, world)
          if (deeper.length > 0) {
            nextStepFruits.push(...deeper)
          }
        }
      }

      if (nextStepFruits.length > 0) {
        this.chainQueue.push({
          fruits: nextStepFruits,
          atTime: now + this.config.chainDelayMs,
          depth: step.depth + 1,
        })
      }
    }

    // Event ends after bolt fades + chain queue empty
    if (now >= this.boltStart + this.boltDuration && this.chainQueue.length === 0) {
      this.started = false
    }
  }

  isFinished(now: number): boolean {
    return !this.started || (now >= this.boltStart + this.boltDuration && this.chainQueue.length === 0)
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    if (!this.started || this.bolt.length < 2) return
    const age = now - this.boltStart
    drawLightningBolt(ctx, this.bolt, age, this.boltDuration)
  }

  private findNearby(target: Entity, world: EventWorld): Entity[] {
    const radius = this.config.chainRadius
    const nearby: Entity[] = []
    for (const e of world.entities) {
      if (e === target || e.sliced) continue
      const isFruit = !['bomb', 'heart', 'golden-heart', 'slow-mo', 'shrink-ray', 'freeze'].includes(e.type)
      if (!isFruit) continue
      const dx = e.pos.x - target.pos.x
      const dy = e.pos.y - target.pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= radius) {
        nearby.push(e)
      }
    }
    // Sort by distance so closest zap first
    nearby.sort((a, b) => {
      const da = Math.hypot(a.pos.x - target.pos.x, a.pos.y - target.pos.y)
      const db = Math.hypot(b.pos.x - target.pos.x, b.pos.y - target.pos.y)
      return da - db
    })
    return nearby
  }
}
