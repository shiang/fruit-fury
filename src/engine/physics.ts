import type { Entity } from '../types'

/** Pure projectile step: returns a new Entity advanced by dt (seconds) under gravity. */
export function integrate(e: Entity, dt: number, gravity: number): Entity {
  const vy = e.vel.y + gravity * dt
  return {
    ...e,
    vel: { x: e.vel.x, y: vy },
    pos: { x: e.pos.x + e.vel.x * dt, y: e.pos.y + vy * dt },
    rotation: e.rotation + e.angularVel * dt,
  }
}
