export interface Vec2 { x: number; y: number }

export interface ReachBox { minX: number; minY: number; maxX: number; maxY: number }

export interface CanvasSize { width: number; height: number }

export type FruitType = 'watermelon' | 'apple' | 'orange' | 'lime' | 'strawberry' | 'pineapple' | 'peach' | 'kiwi'
export type EntityType = FruitType | 'bomb'

export interface Entity {
  id: number
  type: EntityType
  pos: Vec2
  vel: Vec2
  radius: number
  rotation: number
  angularVel: number
  sliced: boolean
}

export interface TrailPoint { pos: Vec2; t: number }

export interface CuttingSegment { from: Vec2; to: Vec2 }

export interface SpawnEvent {
  type: EntityType
  pos: Vec2
  vel: Vec2
  radius: number
}

export interface LevelConfig {
  level: number
  name: string
  fruitsToAdvance: number
  spawnIntervalMs: number
  bombChance: number
  launchSpeedMin: number
  launchSpeedMax: number
  gravity: number
  burstCount: number
  horizontalDrift: number
}
