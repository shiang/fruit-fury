import type { Entity, Vec2, EntityType } from '../../types'

// --- Config ---

export interface EventConfig {
  fruitStorm: {
    minIntervalMs: number
    maxIntervalMs: number
    durationMs: number
    spawnIntervalMs: number
    spawnCount: number
    enabled: boolean
  }
  lightningStrike: {
    minIntervalMs: number
    maxIntervalMs: number
    chainRadius: number
    chainDelayMs: number
    boltDurationMs: number
    maxChainDepth: number
  }
  goldenHour: {
    intervalMs: number
    durationMs: number
    pointsMultiplier: number
  }
}

export type FruitStormConfig = Pick<EventConfig['fruitStorm'], 'durationMs' | 'spawnIntervalMs' | 'spawnCount'>
export type LightningStrikeConfig = EventConfig['lightningStrike']

// --- World interface — what events need from the Game ---

export interface EventWorld {
  get entities(): Entity[]
  rng: () => number
  canvas: { width: number; height: number }
  spawnParticles(pos: Vec2, color: string, count: number): void
  shake: number
  setShake(v: number): void
  flash: number
  setFlash(v: number): void
  setComboText(text: string, until: number): void
  playSfx(name: string): void
  processSlice(entity: Entity, now: number): void
  nextId(): number
  fruitType(): EntityType
  fruitRadius(): number
  fruitRadiusFixed(): number
  activateGoldenHour(now: number): void
}

// --- Game event interface ---

export interface GameEvent {
  update(now: number, dt: number, world: EventWorld): void
  isFinished(now: number): boolean
  draw(ctx: CanvasRenderingContext2D, now: number): void
}
