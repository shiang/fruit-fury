import { describe, it, expect } from 'vitest'
import { integrate } from '../src/engine/physics'
import type { Entity } from '../src/types'

const ent = (over: Partial<Entity> = {}): Entity => ({
  id: 1, type: 'apple', pos: { x: 0, y: 0 }, vel: { x: 100, y: -200 },
  radius: 40, baseRadius: 40, rotation: 0, angularVel: 2, sliced: false, ...over,
})

describe('integrate', () => {
  it('advances position by velocity * dt', () => {
    const e = integrate(ent({ vel: { x: 100, y: 0 } }), 0.5, 0)
    expect(e.pos.x).toBeCloseTo(50)
  })
  it('applies gravity to vertical velocity', () => {
    const e = integrate(ent({ vel: { x: 0, y: 0 } }), 1, 1000)
    expect(e.vel.y).toBeCloseTo(1000)
  })
  it('advances rotation by angularVel * dt', () => {
    const e = integrate(ent({ rotation: 0, angularVel: 2 }), 0.5, 0)
    expect(e.rotation).toBeCloseTo(1)
  })
  it('does not mutate the input entity', () => {
    const input = ent()
    integrate(input, 1, 1000)
    expect(input.pos).toEqual({ x: 0, y: 0 })
  })
})
