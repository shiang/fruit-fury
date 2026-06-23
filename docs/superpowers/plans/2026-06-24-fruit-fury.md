# Fruit Fury Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser Fruit Ninja clone controlled by webcam hand gestures, with velocity-gated slashing from any direction, calibrated reach-to-canvas mapping, two-handed blades, and juicy Classic-Dojo slash VFX.

**Architecture:** Two decoupled loops — a ~30fps MediaPipe hand-tracking loop that maps fingertips into game space, and a 60fps `requestAnimationFrame` render/game loop. Pure, unit-tested engine modules (mapping, calibration, blade tracking, collision, physics, spawner, scoring) sit behind thin camera/renderer/game glue.

**Tech Stack:** TypeScript, Vite, MediaPipe Tasks Vision (`HandLandmarker`), Canvas 2D, localStorage, Vitest.

---

## File Structure

```
fruit-fury/
  index.html                  # canvas + video elements, mount point
  package.json                # deps + scripts
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  src/
    config.ts                 # all tunable constants
    types.ts                  # shared interfaces
    engine/
      math.ts                 # clamp, vector helpers (pure)
      mapping.ts              # reach box + canvas -> game coords (pure)
      calibration.ts          # samples -> reach box, persistence (pure core)
      bladeTracker.ts         # velocity gate, trail, cutting segments
      collision.ts            # segment vs circle (pure)
      physics.ts              # projectile integration (pure)
      spawner.ts              # difficulty ramp + spawn events (pure, injected rng)
      scoring.ts              # score, lives, combos, game-over (pure)
    game/
      camera.ts               # getUserMedia + MediaPipe + mouse fallback (glue)
      renderer.ts             # Canvas 2D drawing (glue)
      game.ts                 # loop wiring + screen state machine (glue)
    main.ts                   # entry point
  test/
    math.test.ts
    mapping.test.ts
    calibration.test.ts
    bladeTracker.test.ts
    collision.test.ts
    physics.test.ts
    spawner.test.ts
    scoring.test.ts
```

Engine modules are pure and unit-tested (Tasks 2–9). Glue modules are integration-built and manually playtested (Tasks 10–14).

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`, `src/config.ts`, `src/types.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "fruit-fury",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.14"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: { host: true, open: false },
})
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { globals: true, environment: 'node' },
})
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fruit Fury</title>
    <style>
      html, body { margin: 0; height: 100%; background: #1c130a; overflow: hidden; }
      #stage { position: fixed; inset: 0; display: grid; place-items: center; }
      #game { max-width: 100vw; max-height: 100vh; touch-action: none; cursor: crosshair; }
      #cam { display: none; }
    </style>
  </head>
  <body>
    <div id="stage">
      <canvas id="game" width="1280" height="720"></canvas>
    </div>
    <video id="cam" autoplay playsinline muted></video>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/config.ts`**

```ts
export const CONFIG = {
  canvas: { width: 1280, height: 720 },
  hand: { fingertipLandmark: 8, maxHands: 2 },
  slash: { velocityThreshold: 900, trailLifetimeMs: 160, minSegmentPx: 4 },
  calibration: {
    sampleMs: 3000,
    margin: 0.04,
    defaultBox: { minX: 0.2, minY: 0.2, maxX: 0.8, maxY: 0.8 },
    storageKey: 'fruitFury.reachBox',
  },
  combo: { windowMs: 220, minForBonus: 3, bonusPerExtra: 50 },
  spawn: {
    baseIntervalMs: 1100,
    minIntervalMs: 450,
    rampMs: 60000,
    baseBombChance: 0.07,
    maxBombChance: 0.2,
    launchSpeed: { min: 850, max: 1050 },
    radius: { fruit: 46, bomb: 40 },
  },
  physics: { gravity: 1400 },
  lives: 3,
  points: { fruit: 10 },
  particles: { maxCount: 400, perCut: 14 },
  highScoreKey: 'fruitFury.highScore',
} as const
```

- [ ] **Step 7: Create `src/types.ts`**

```ts
export interface Vec2 { x: number; y: number }

export interface ReachBox { minX: number; minY: number; maxX: number; maxY: number }

export interface CanvasSize { width: number; height: number }

export type FruitType = 'watermelon' | 'apple' | 'orange' | 'lime'
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
```

- [ ] **Step 8: Create placeholder `src/main.ts`**

```ts
console.log('Fruit Fury booting…')
```

- [ ] **Step 9: Install and verify**

Run: `npm install`
Expected: completes without errors, creates `node_modules/`.

Run: `npm run test`
Expected: Vitest reports "No test files found" (exit 0) — runner works.

Run: `npm run dev` then open the printed URL, confirm console logs "Fruit Fury booting…", then stop the dev server.
Expected: page loads, no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Fruit Fury project (Vite + TS + Vitest)"
```

---

## Task 2: Math + Mapping (pure)

**Files:**
- Create: `src/engine/math.ts`, `src/engine/mapping.ts`
- Test: `test/math.test.ts`, `test/mapping.test.ts`

- [ ] **Step 1: Write failing tests for math helpers — `test/math.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { clamp, sub, len, dist } from '../src/engine/math'

describe('math', () => {
  it('clamps to range', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-2, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  it('subtracts vectors', () => {
    expect(sub({ x: 3, y: 5 }, { x: 1, y: 2 })).toEqual({ x: 2, y: 3 })
  })
  it('computes length and distance', () => {
    expect(len({ x: 3, y: 4 })).toBe(5)
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/math.test.ts`
Expected: FAIL — cannot resolve `../src/engine/math`.

- [ ] **Step 3: Implement `src/engine/math.ts`**

```ts
import type { Vec2 } from '../types'

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function len(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/math.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write failing tests for mapping — `test/mapping.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { mapToGame } from '../src/engine/mapping'

const canvas = { width: 1000, height: 800 }
const box = { minX: 0.2, minY: 0.2, maxX: 0.8, maxY: 0.8 }

describe('mapToGame', () => {
  it('mirrors X: hand at box left maps to canvas right', () => {
    const p = mapToGame({ x: 0.2, y: 0.5 }, box, canvas)
    expect(p.x).toBeCloseTo(1000)
  })
  it('maps box center to canvas center', () => {
    const p = mapToGame({ x: 0.5, y: 0.5 }, box, canvas)
    expect(p.x).toBeCloseTo(500)
    expect(p.y).toBeCloseTo(400)
  })
  it('clamps hand outside the box to canvas edges', () => {
    const p = mapToGame({ x: 1.0, y: 1.0 }, box, canvas)
    expect(p.x).toBeCloseTo(0)   // far right of reach -> left after mirror
    expect(p.y).toBeCloseTo(800)
  })
  it('does not divide by zero on a degenerate box', () => {
    const p = mapToGame({ x: 0.5, y: 0.5 }, { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, canvas)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run test/mapping.test.ts`
Expected: FAIL — cannot resolve `../src/engine/mapping`.

- [ ] **Step 7: Implement `src/engine/mapping.ts`**

```ts
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
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run test/mapping.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add src/engine/math.ts src/engine/mapping.ts test/math.test.ts test/mapping.test.ts
git commit -m "feat: add math helpers and reach-box->game mapping"
```

---

## Task 3: Calibration (pure core + persistence)

**Files:**
- Create: `src/engine/calibration.ts`
- Test: `test/calibration.test.ts`

- [ ] **Step 1: Write failing tests — `test/calibration.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { boxFromSamples } from '../src/engine/calibration'

describe('boxFromSamples', () => {
  it('returns the bounding box of samples plus margin', () => {
    const box = boxFromSamples(
      [{ x: 0.3, y: 0.4 }, { x: 0.7, y: 0.6 }, { x: 0.5, y: 0.2 }],
      0.0,
    )
    expect(box).toEqual({ minX: 0.3, minY: 0.2, maxX: 0.7, maxY: 0.6 })
  })
  it('applies margin and clamps to [0,1]', () => {
    const box = boxFromSamples([{ x: 0.05, y: 0.5 }, { x: 0.95, y: 0.5 }], 0.1)
    expect(box.minX).toBeCloseTo(0)      // 0.05 - 0.1 clamped to 0
    expect(box.maxX).toBeCloseTo(1)      // 0.95 + 0.1 clamped to 1
  })
  it('falls back to the default box when there are too few samples', () => {
    const box = boxFromSamples([], 0.04)
    expect(box).toEqual({ minX: 0.2, minY: 0.2, maxX: 0.8, maxY: 0.8 })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/calibration.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/engine/calibration.ts`**

```ts
import type { Vec2, ReachBox } from '../types'
import { clamp } from './math'
import { CONFIG } from '../config'

const DEFAULT = CONFIG.calibration.defaultBox

/** Derive a reach box from collected hand samples; margin pads each edge. */
export function boxFromSamples(samples: Vec2[], margin: number): ReachBox {
  if (samples.length < 2) return { ...DEFAULT }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of samples) {
    if (s.x < minX) minX = s.x
    if (s.x > maxX) maxX = s.x
    if (s.y < minY) minY = s.y
    if (s.y > maxY) maxY = s.y
  }
  return {
    minX: clamp(minX - margin, 0, 1),
    minY: clamp(minY - margin, 0, 1),
    maxX: clamp(maxX + margin, 0, 1),
    maxY: clamp(maxY + margin, 0, 1),
  }
}

/** Persist / load the reach box. Safe to call in non-browser (no-op load). */
export function saveReachBox(box: ReachBox): void {
  try {
    localStorage.setItem(CONFIG.calibration.storageKey, JSON.stringify(box))
  } catch { /* ignore */ }
}

export function loadReachBox(): ReachBox {
  try {
    const raw = localStorage.getItem(CONFIG.calibration.storageKey)
    if (raw) return JSON.parse(raw) as ReachBox
  } catch { /* ignore */ }
  return { ...DEFAULT }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/calibration.test.ts`
Expected: PASS (3 tests). (`saveReachBox`/`loadReachBox` are exercised manually in the browser.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/calibration.ts test/calibration.test.ts
git commit -m "feat: add calibration box derivation and persistence"
```

---

## Task 4: Blade Tracker (velocity gate + trail)

**Files:**
- Create: `src/engine/bladeTracker.ts`
- Test: `test/bladeTracker.test.ts`

- [ ] **Step 1: Write failing tests — `test/bladeTracker.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { BladeTracker } from '../src/engine/bladeTracker'

// threshold 900 px/s, trail lifetime 160ms, minSegment 4px
const make = () => new BladeTracker(900, 160, 4)

describe('BladeTracker', () => {
  it('emits no segment on the first sample', () => {
    const b = make()
    expect(b.push({ x: 0, y: 0 }, 0)).toBeNull()
  })

  it('emits a cutting segment when speed exceeds threshold', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    // 100px in 0.05s = 2000 px/s > 900
    const seg = b.push({ x: 100, y: 0 }, 50)
    expect(seg).not.toBeNull()
    expect(seg!.from).toEqual({ x: 0, y: 0 })
    expect(seg!.to).toEqual({ x: 100, y: 0 })
  })

  it('emits no segment for slow movement', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    // 10px in 0.1s = 100 px/s < 900
    expect(b.push({ x: 10, y: 0 }, 100)).toBeNull()
  })

  it('ignores sub-minimum jitter segments', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    // 2px movement < minSegment 4px even if fast
    expect(b.push({ x: 2, y: 0 }, 1)).toBeNull()
  })

  it('prunes trail points older than the lifetime', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    b.push({ x: 100, y: 0 }, 50)
    expect(b.getTrail(60).length).toBe(2)   // both within 160ms
    expect(b.getTrail(300).length).toBe(0)  // both older than 160ms
  })

  it('reset clears state so next push emits no segment', () => {
    const b = make()
    b.push({ x: 0, y: 0 }, 0)
    b.reset()
    expect(b.push({ x: 100, y: 0 }, 50)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/bladeTracker.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/engine/bladeTracker.ts`**

```ts
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

  /** Trail points still within the fade lifetime, oldest first. */
  getTrail(now: number): TrailPoint[] {
    this.trail = this.trail.filter((p) => now - p.t <= this.trailLifetimeMs)
    return this.trail
  }

  reset(): void {
    this.last = null
    this.trail = []
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/bladeTracker.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/bladeTracker.ts test/bladeTracker.test.ts
git commit -m "feat: add velocity-gated blade tracker with fading trail"
```

---

## Task 5: Collision (segment vs circle)

**Files:**
- Create: `src/engine/collision.ts`
- Test: `test/collision.test.ts`

- [ ] **Step 1: Write failing tests — `test/collision.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { segmentHitsCircle } from '../src/engine/collision'

describe('segmentHitsCircle', () => {
  it('detects a segment passing through a circle', () => {
    expect(segmentHitsCircle({ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })
  it('detects a segment ending inside a circle', () => {
    expect(segmentHitsCircle({ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })
  it('returns false when the segment misses', () => {
    expect(segmentHitsCircle({ x: -10, y: 20 }, { x: 10, y: 20 }, { x: 0, y: 0 }, 5)).toBe(false)
  })
  it('returns false when the segment is short of the circle', () => {
    expect(segmentHitsCircle({ x: -20, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 0 }, 5)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/collision.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/engine/collision.ts`**

```ts
import type { Vec2 } from '../types'

/** True if segment AB comes within `radius` of `center` (closest-point test). */
export function segmentHitsCircle(a: Vec2, b: Vec2, center: Vec2, radius: number): boolean {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lenSq = abx * abx + aby * aby
  let t = 0
  if (lenSq > 0) {
    t = ((center.x - a.x) * abx + (center.y - a.y) * aby) / lenSq
    t = t < 0 ? 0 : t > 1 ? 1 : t
  }
  const cx = a.x + abx * t
  const cy = a.y + aby * t
  const dx = center.x - cx
  const dy = center.y - cy
  return dx * dx + dy * dy <= radius * radius
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/collision.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/collision.ts test/collision.test.ts
git commit -m "feat: add segment-vs-circle slice collision"
```

---

## Task 6: Physics (projectile integration)

**Files:**
- Create: `src/engine/physics.ts`
- Test: `test/physics.test.ts`

- [ ] **Step 1: Write failing tests — `test/physics.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { integrate } from '../src/engine/physics'
import type { Entity } from '../src/types'

const ent = (over: Partial<Entity> = {}): Entity => ({
  id: 1, type: 'apple', pos: { x: 0, y: 0 }, vel: { x: 100, y: -200 },
  radius: 40, rotation: 0, angularVel: 2, sliced: false, ...over,
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/physics.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/engine/physics.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/physics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/physics.ts test/physics.test.ts
git commit -m "feat: add pure projectile physics integration"
```

---

## Task 7: Spawner (difficulty ramp + spawn events)

**Files:**
- Create: `src/engine/spawner.ts`
- Test: `test/spawner.test.ts`

- [ ] **Step 1: Write failing tests — `test/spawner.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { difficultyAt, makeSpawn } from '../src/engine/spawner'

const canvas = { width: 1280, height: 720 }

describe('difficultyAt', () => {
  it('starts at base interval and base bomb chance', () => {
    const d = difficultyAt(0)
    expect(d.spawnIntervalMs).toBeCloseTo(1100)
    expect(d.bombChance).toBeCloseTo(0.07)
  })
  it('ramps toward min interval and max bomb chance over time', () => {
    const d = difficultyAt(60000)
    expect(d.spawnIntervalMs).toBeCloseTo(450)
    expect(d.bombChance).toBeCloseTo(0.2)
  })
  it('does not overshoot past full ramp', () => {
    const d = difficultyAt(999999)
    expect(d.spawnIntervalMs).toBeCloseTo(450)
    expect(d.bombChance).toBeCloseTo(0.2)
  })
})

describe('makeSpawn', () => {
  it('launches from below the canvas moving upward', () => {
    const s = makeSpawn(() => 0.5, canvas, 0)
    expect(s.pos.y).toBeGreaterThanOrEqual(canvas.height)
    expect(s.vel.y).toBeLessThan(0)
  })
  it('produces a bomb when rng is below the bomb chance', () => {
    // first rng call decides bomb; force it tiny
    const seq = [0.0, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, 60000)
    expect(s.type).toBe('bomb')
  })
  it('produces a fruit when rng is above the bomb chance', () => {
    const seq = [0.99, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const s = makeSpawn(() => seq[i++], canvas, 0)
    expect(s.type).not.toBe('bomb')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/spawner.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/engine/spawner.ts`**

```ts
import type { CanvasSize, SpawnEvent, FruitType } from '../types'
import { clamp } from './math'
import { CONFIG } from '../config'

const FRUITS: FruitType[] = ['watermelon', 'apple', 'orange', 'lime']

export interface Difficulty { spawnIntervalMs: number; bombChance: number }

/** Linearly ramp interval down and bomb chance up over CONFIG.spawn.rampMs. */
export function difficultyAt(elapsedMs: number): Difficulty {
  const s = CONFIG.spawn
  const p = clamp(elapsedMs / s.rampMs, 0, 1)
  return {
    spawnIntervalMs: s.baseIntervalMs + (s.minIntervalMs - s.baseIntervalMs) * p,
    bombChance: s.baseBombChance + (s.maxBombChance - s.baseBombChance) * p,
  }
}

/**
 * Build one spawn event. `rng` is an injected 0..1 source (Math.random in prod).
 * rng call order is exactly: bomb-roll, x-position, fruit-pick, vx-spread, speed-spread.
 */
export function makeSpawn(rng: () => number, canvas: CanvasSize, elapsedMs: number): SpawnEvent {
  const s = CONFIG.spawn
  const { bombChance } = difficultyAt(elapsedMs)

  const isBomb = rng() < bombChance                                       // 1: bomb roll
  const x = 0.15 * canvas.width + rng() * 0.7 * canvas.width              // 2: x position
  const fruit = FRUITS[Math.floor(rng() * FRUITS.length) % FRUITS.length] // 3: fruit pick
  const vx = (rng() - 0.5) * 300                                         // 4: horizontal drift
  const speed = s.launchSpeed.min + rng() * (s.launchSpeed.max - s.launchSpeed.min) // 5: speed

  return {
    type: isBomb ? 'bomb' : fruit,
    pos: { x, y: canvas.height + 60 },
    vel: { x: vx, y: -speed },
    radius: isBomb ? s.radius.bomb : s.radius.fruit,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/spawner.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/spawner.ts test/spawner.test.ts
git commit -m "feat: add difficulty ramp and spawn-event generator"
```

---

## Task 8: Scoring, Combos, Lives (pure state)

**Files:**
- Create: `src/engine/scoring.ts`
- Test: `test/scoring.test.ts`

- [ ] **Step 1: Write failing tests — `test/scoring.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { GameState } from '../src/engine/scoring'

describe('GameState', () => {
  it('starts with full lives and zero score', () => {
    const g = new GameState()
    expect(g.lives).toBe(3)
    expect(g.score).toBe(0)
    expect(g.isOver).toBe(false)
  })

  it('adds points per fruit sliced', () => {
    const g = new GameState()
    g.sliceFruit(0)
    expect(g.score).toBe(10)
  })

  it('awards a combo bonus for 3+ fruit within the combo window', () => {
    const g = new GameState()
    g.sliceFruit(0)
    g.sliceFruit(50)
    g.sliceFruit(100)   // 3 within 220ms -> combo
    // 3*10 base + bonus (1 extra over the min of 3 -> 0 extra) => bonus = 50*(3-2)=50
    expect(g.score).toBe(30 + 50)
    expect(g.lastCombo).toBe(3)
  })

  it('does not combo when slices are spread beyond the window', () => {
    const g = new GameState()
    g.sliceFruit(0)
    g.sliceFruit(300)   // gap > 220ms resets the run
    g.sliceFruit(600)
    expect(g.lastCombo).toBe(1)
    expect(g.score).toBe(30)
  })

  it('loses a life on a missed fruit and ends at zero', () => {
    const g = new GameState()
    g.missFruit(); g.missFruit(); expect(g.isOver).toBe(false)
    g.missFruit(); expect(g.lives).toBe(0); expect(g.isOver).toBe(true)
  })

  it('loses a life when a bomb is sliced', () => {
    const g = new GameState()
    g.sliceBomb()
    expect(g.lives).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/scoring.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/engine/scoring.ts`**

```ts
import { CONFIG } from '../config'

/** Mutable game state: score, lives, and rolling combo detection. */
export class GameState {
  score = 0
  lives = CONFIG.lives
  isOver = false
  lastCombo = 0

  private comboCount = 0
  private comboLastT = -Infinity

  /** Register a fruit slice at time t (ms). Handles combo accrual + scoring. */
  sliceFruit(t: number): void {
    if (this.isOver) return
    if (t - this.comboLastT <= CONFIG.combo.windowMs) {
      this.comboCount += 1
    } else {
      this.comboCount = 1
    }
    this.comboLastT = t
    this.lastCombo = this.comboCount

    this.score += CONFIG.points.fruit
    if (this.comboCount >= CONFIG.combo.minForBonus) {
      this.score += CONFIG.combo.bonusPerExtra * (this.comboCount - (CONFIG.combo.minForBonus - 1))
    }
  }

  sliceBomb(): void {
    if (this.isOver) return
    this.loseLife()
  }

  missFruit(): void {
    if (this.isOver) return
    this.loseLife()
  }

  private loseLife(): void {
    this.lives -= 1
    if (this.lives <= 0) {
      this.lives = 0
      this.isOver = true
    }
  }
}
```

> **Combo math check:** with `minForBonus = 3` and `bonusPerExtra = 50`, the bonus on the 3rd slice is `50 * (3 - 2) = 50`; a 4th within-window slice adds another `50 * (4 - 2) = 100`. The test asserts the 3-slice case totals `30 + 50 = 80`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/scoring.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: all engine tests PASS (math, mapping, calibration, bladeTracker, collision, physics, spawner, scoring).

- [ ] **Step 6: Commit**

```bash
git add src/engine/scoring.ts test/scoring.test.ts
git commit -m "feat: add scoring, combo, and lives state"
```

---

## Task 9: Camera + Hand Tracking (glue)

**Files:**
- Create: `src/game/camera.ts`

This wraps MediaPipe `HandLandmarker` over a webcam stream and exposes mapped fingertip positions. Includes a mouse fallback when no camera is available. Not unit-tested (browser/hardware dependent); verified manually.

- [ ] **Step 1: Implement `src/game/camera.ts`**

```ts
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Vec2 } from '../types'
import { CONFIG } from '../config'

export interface HandSample { hands: Vec2[]; t: number } // normalized 0..1 fingertips

export type HandListener = (sample: HandSample) => void

/** Source of fingertip samples. Either webcam+MediaPipe or a mouse fallback. */
export interface HandSource {
  start(onSample: HandListener): Promise<void>
  stop(): void
  readonly mode: 'camera' | 'mouse'
}

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export class CameraSource implements HandSource {
  readonly mode = 'camera' as const
  private landmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private raf = 0
  private running = false

  constructor(private video: HTMLVideoElement) {}

  async start(onSample: HandListener): Promise<void> {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: CONFIG.hand.maxHands,
    })
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: 'user' },
      audio: false,
    })
    this.video.srcObject = this.stream
    await this.video.play()
    this.running = true

    const tick = () => {
      if (!this.running || !this.landmarker) return
      const now = performance.now()
      const res = this.landmarker.detectForVideo(this.video, now)
      const tip = CONFIG.hand.fingertipLandmark
      const hands: Vec2[] = (res.landmarks ?? [])
        .map((lm) => lm[tip])
        .filter(Boolean)
        .map((p) => ({ x: p.x, y: p.y }))
      onSample({ hands, t: now })
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.landmarker?.close()
    this.landmarker = null
  }
}

/** Mouse fallback: reports the cursor as a single normalized hand. */
export class MouseSource implements HandSource {
  readonly mode = 'mouse' as const
  private listener: HandListener | null = null
  private handler = (e: MouseEvent) => {
    const r = this.el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    // Mirror so it matches the camera pipeline's mirror in mapToGame.
    this.listener?.({ hands: [{ x: 1 - x, y }], t: performance.now() })
  }

  constructor(private el: HTMLElement) {}

  async start(onSample: HandListener): Promise<void> {
    this.listener = onSample
    this.el.addEventListener('mousemove', this.handler)
  }

  stop(): void {
    this.el.removeEventListener('mousemove', this.handler)
    this.listener = null
  }
}

/** Try the camera; fall back to mouse on any failure. */
export async function createHandSource(
  video: HTMLVideoElement,
  fallbackEl: HTMLElement,
): Promise<HandSource> {
  const cam = new CameraSource(video)
  try {
    // Probe permissions/availability early by constructing+starting later;
    // here we just return camera and let game.ts handle start() errors.
    void cam
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((s) => s.getTracks().forEach((t) => t.stop()))
    return cam
  } catch {
    return new MouseSource(fallbackEl)
  }
}
```

> **Note:** `MouseSource` pre-mirrors X (`1 - x`) because `mapToGame` mirrors again, so the mouse ends up un-mirrored and directly under the cursor — correct for a non-camera fallback. The camera path is genuinely mirrored, which is what the player expects from a selfie view.

- [ ] **Step 2: Manual smoke check**

Add a temporary log in `src/main.ts`:

```ts
import { createHandSource } from './game/camera'

const video = document.getElementById('cam') as HTMLVideoElement
const canvas = document.getElementById('game') as HTMLCanvasElement
const src = await createHandSource(video, canvas)
console.log('hand source mode:', src.mode)
await src.start((s) => { if (s.hands.length) console.log(s.hands[0]) })
```

Run: `npm run dev`, open the URL, allow camera.
Expected: console logs `hand source mode: camera` and a stream of `{x, y}` values as you move your hand. If you deny the camera, it logs `mouse` and reports cursor coords. Revert this temporary `main.ts` after checking.

- [ ] **Step 3: Commit**

```bash
git add src/game/camera.ts
git commit -m "feat: add MediaPipe hand-tracking source with mouse fallback"
```

---

## Task 10: Renderer (Canvas 2D drawing)

**Files:**
- Create: `src/game/renderer.ts`

Draws: dimmed mirrored webcam feed (optional), fruit/bombs, sliced halves, juice particles, blade ribbons, HUD (score, lives, high score), and screen effects (flash, shake, combo banner). Glue; verified visually.

- [ ] **Step 1: Implement `src/game/renderer.ts`**

```ts
import type { Entity, TrailPoint, Vec2 } from '../types'
import { CONFIG } from '../config'

export interface Particle { pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string }
export interface Half { pos: Vec2; vel: Vec2; rotation: number; angularVel: number; color: string; side: -1 | 1; radius: number; life: number }

const FRUIT_COLORS: Record<string, string> = {
  watermelon: '#e0394e',
  apple: '#c6303a',
  orange: '#f59226',
  lime: '#7ac043',
  bomb: '#1a1a1a',
}

export function fruitColor(type: string): string {
  return FRUIT_COLORS[type] ?? '#ccc'
}

export interface RenderInput {
  ctx: CanvasRenderingContext2D
  video: HTMLVideoElement | null
  showFeed: boolean
  entities: Entity[]
  halves: Half[]
  particles: Particle[]
  trails: TrailPoint[][]      // one trail per hand
  score: number
  lives: number
  highScore: number
  comboText: string | null
  shake: number               // 0..1 intensity
  flash: number               // 0..1 white flash alpha
  now: number
}

export function render(input: RenderInput): void {
  const { ctx } = input
  const { width, height } = CONFIG.canvas
  ctx.save()

  // screen shake
  if (input.shake > 0) {
    const m = 16 * input.shake
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m)
  }

  // background: dojo wood gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#5a4226')
  bg.addColorStop(1, '#2e2012')
  ctx.fillStyle = bg
  ctx.fillRect(-40, -40, width + 80, height + 80)

  // dimmed mirrored webcam feed
  if (input.showFeed && input.video && input.video.readyState >= 2) {
    ctx.save()
    ctx.globalAlpha = 0.28
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(input.video, 0, 0, width, height)
    ctx.restore()
  }

  drawParticles(ctx, input.particles)
  drawHalves(ctx, input.halves)
  drawEntities(ctx, input.entities)
  for (const trail of input.trails) drawBlade(ctx, trail, input.now)

  // combo banner
  if (input.comboText) {
    ctx.save()
    ctx.font = 'bold 64px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffd35e'
    ctx.strokeStyle = '#6b4a12'
    ctx.lineWidth = 6
    ctx.strokeText(input.comboText, width / 2, height / 2)
    ctx.fillText(input.comboText, width / 2, height / 2)
    ctx.restore()
  }

  drawHud(ctx, input)

  // white flash overlay
  if (input.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${input.flash})`
    ctx.fillRect(-40, -40, width + 80, height + 80)
  }
  ctx.restore()
}

function drawEntities(ctx: CanvasRenderingContext2D, entities: Entity[]) {
  for (const e of entities) {
    ctx.save()
    ctx.translate(e.pos.x, e.pos.y)
    ctx.rotate(e.rotation)
    if (e.type === 'bomb') {
      ctx.fillStyle = '#141414'
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#ff5630'; ctx.lineWidth = 3; ctx.stroke()
      ctx.fillStyle = '#ff7a45'
      ctx.fillRect(-3, -e.radius - 10, 6, 12) // fuse
    } else {
      ctx.fillStyle = fruitColor(e.type)
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath(); ctx.arc(-e.radius * 0.3, -e.radius * 0.3, e.radius * 0.22, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

function drawHalves(ctx: CanvasRenderingContext2D, halves: Half[]) {
  for (const h of halves) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, h.life))
    ctx.translate(h.pos.x, h.pos.y)
    ctx.rotate(h.rotation)
    ctx.fillStyle = h.color
    ctx.beginPath()
    ctx.arc(0, 0, h.radius, h.side === 1 ? -Math.PI / 2 : Math.PI / 2, h.side === 1 ? Math.PI / 2 : (3 * Math.PI) / 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(-2, -h.radius, 4, h.radius * 2) // cut face highlight
    ctx.restore()
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

function drawBlade(ctx: CanvasRenderingContext2D, trail: TrailPoint[], now: number) {
  if (trail.length < 2) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i]
    const age = (now - b.t) / CONFIG.slash.trailLifetimeMs
    const alpha = Math.max(0, 1 - age)
    const width = 2 + 14 * alpha
    ctx.strokeStyle = `rgba(255,255,255,${0.25 * alpha})`
    ctx.lineWidth = width + 10
    ctx.beginPath(); ctx.moveTo(a.pos.x, a.pos.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke()
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`
    ctx.lineWidth = width
    ctx.beginPath(); ctx.moveTo(a.pos.x, a.pos.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.stroke()
  }
  ctx.restore()
}

function drawHud(ctx: CanvasRenderingContext2D, input: RenderInput) {
  ctx.save()
  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = '#fff8e7'
  ctx.textAlign = 'left'
  ctx.fillText(`Score ${input.score}`, 24, 44)
  ctx.font = '20px sans-serif'
  ctx.fillText(`Best ${input.highScore}`, 24, 72)
  ctx.textAlign = 'right'
  ctx.font = '32px sans-serif'
  ctx.fillText('❤'.repeat(input.lives) + '·'.repeat(Math.max(0, CONFIG.lives - input.lives)), CONFIG.canvas.width - 24, 44)
  ctx.restore()
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Renderer is exercised visually in Task 11.)

- [ ] **Step 3: Commit**

```bash
git add src/game/renderer.ts
git commit -m "feat: add Canvas 2D renderer (feed, fruit, halves, blade, HUD, VFX)"
```

---

## Task 11: Game Loop + Screen State Machine (glue)

**Files:**
- Create: `src/game/game.ts`
- Modify: `src/main.ts`

Wires the hand source, engine modules, and renderer into a 60fps loop with Title → Calibrate → Countdown → Playing → GameOver states. Verified by playtest.

- [ ] **Step 1: Implement `src/game/game.ts`**

```ts
import { CONFIG } from '../config'
import type { Entity, EntityType, ReachBox, TrailPoint, Vec2 } from '../types'
import { mapToGame } from '../engine/mapping'
import { boxFromSamples, loadReachBox, saveReachBox } from '../engine/calibration'
import { BladeTracker } from '../engine/bladeTracker'
import { segmentHitsCircle } from '../engine/collision'
import { integrate } from '../engine/physics'
import { difficultyAt, makeSpawn } from '../engine/spawner'
import { GameState } from '../engine/scoring'
import { render, fruitColor, type Half, type Particle } from './renderer'
import type { HandSource, HandSample } from './camera'

type Screen = 'title' | 'calibrate' | 'countdown' | 'playing' | 'gameover'

export class Game {
  private screen: Screen = 'title'
  private box: ReachBox = loadReachBox()
  private trackers: BladeTracker[] = []
  private entities: Entity[] = []
  private halves: Half[] = []
  private particles: Particle[] = []
  private state = new GameState()
  private highScore = Number(localStorage.getItem(CONFIG.highScoreKey) ?? 0)
  private showFeed = true

  private lastFrame = performance.now()
  private elapsed = 0
  private spawnTimer = 0
  private nextId = 1

  private calibSamples: Vec2[] = []
  private calibUntil = 0
  private countdownUntil = 0

  private comboText: string | null = null
  private comboTextUntil = 0
  private shake = 0
  private flash = 0

  private latestSample: HandSample = { hands: [], t: performance.now() }

  constructor(
    private ctx: CanvasRenderingContext2D,
    private video: HTMLVideoElement,
    private source: HandSource,
    private rng: () => number = Math.random,
  ) {
    for (let i = 0; i < CONFIG.hand.maxHands; i++) {
      this.trackers.push(new BladeTracker(
        CONFIG.slash.velocityThreshold, CONFIG.slash.trailLifetimeMs, CONFIG.slash.minSegmentPx,
      ))
    }
  }

  async start(): Promise<void> {
    await this.source.start((s) => { this.latestSample = s })
    window.addEventListener('keydown', (e) => this.onKey(e.key))
    this.loop()
  }

  private onKey(key: string): void {
    if (key === 'f') this.showFeed = !this.showFeed
    if (this.screen === 'title' && key === 'Enter') this.beginCountdown()
    if (this.screen === 'title' && key === 'c') this.beginCalibration()
    if (this.screen === 'gameover' && key === 'Enter') { this.resetGame(); this.beginCountdown() }
  }

  private beginCalibration(): void {
    this.screen = 'calibrate'
    this.calibSamples = []
    this.calibUntil = performance.now() + CONFIG.calibration.sampleMs
  }

  private beginCountdown(): void {
    this.screen = 'countdown'
    this.countdownUntil = performance.now() + 3000
  }

  private resetGame(): void {
    this.entities = []; this.halves = []; this.particles = []
    this.state = new GameState()
    this.elapsed = 0; this.spawnTimer = 0
    this.trackers.forEach((t) => t.reset())
  }

  private loop = (): void => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    this.update(now, dt)
    this.draw(now)
    requestAnimationFrame(this.loop)
  }

  /** Map current fingertip samples to game space and feed trackers; returns hot segments. */
  private updateBlades(now: number): { trails: TrailPoint[][]; segments: { from: Vec2; to: Vec2 }[] } {
    const trails: TrailPoint[][] = []
    const segments: { from: Vec2; to: Vec2 }[] = []
    const hands = this.latestSample.hands
    for (let i = 0; i < this.trackers.length; i++) {
      const tracker = this.trackers[i]
      if (i < hands.length) {
        const p = mapToGame(hands[i], this.box, CONFIG.canvas)
        const seg = tracker.push(p, now)
        if (seg) segments.push(seg)
      }
      trails.push(tracker.getTrail(now))
    }
    return { trails, segments }
  }

  private update(now: number, dt: number): void {
    // decay effects
    this.shake = Math.max(0, this.shake - dt * 3)
    this.flash = Math.max(0, this.flash - dt * 4)
    if (this.comboText && now > this.comboTextUntil) this.comboText = null

    if (this.screen === 'calibrate') {
      for (const h of this.latestSample.hands) this.calibSamples.push(h)
      if (now >= this.calibUntil) {
        this.box = boxFromSamples(this.calibSamples, CONFIG.calibration.margin)
        saveReachBox(this.box)
        this.screen = 'title'
      }
      return
    }

    if (this.screen === 'countdown') {
      if (now >= this.countdownUntil) this.screen = 'playing'
    }

    if (this.screen !== 'playing') {
      this.updateBlades(now) // keep trails alive visually
      this.advanceCosmetic(dt)
      return
    }

    // PLAYING
    this.elapsed += dt * 1000
    const { segments } = this.updateBlades(now)

    // spawn
    this.spawnTimer -= dt * 1000
    if (this.spawnTimer <= 0) {
      const ev = makeSpawn(this.rng, CONFIG.canvas, this.elapsed)
      this.entities.push({
        id: this.nextId++, type: ev.type, pos: ev.pos, vel: ev.vel,
        radius: ev.radius, rotation: 0, angularVel: (this.rng() - 0.5) * 6, sliced: false,
      })
      this.spawnTimer = difficultyAt(this.elapsed).spawnIntervalMs
    }

    // integrate + cull misses
    const survivors: Entity[] = []
    for (const e of this.entities) {
      const moved = integrate(e, dt, CONFIG.physics.gravity)
      if (moved.pos.y - moved.radius > CONFIG.canvas.height && moved.vel.y > 0) {
        if (moved.type !== 'bomb') this.state.missFruit()  // dropped fruit costs a life
        continue
      }
      survivors.push(moved)
    }
    this.entities = survivors

    // slicing
    for (const seg of segments) {
      for (const e of this.entities) {
        if (e.sliced) continue
        if (segmentHitsCircle(seg.from, seg.to, e.pos, e.radius)) {
          e.sliced = true
          if (e.type === 'bomb') this.onBomb(e)
          else this.onSlice(e, now)
        }
      }
    }
    this.entities = this.entities.filter((e) => !e.sliced)

    this.advanceCosmetic(dt)

    if (this.state.isOver) {
      if (this.state.score > this.highScore) {
        this.highScore = this.state.score
        localStorage.setItem(CONFIG.highScoreKey, String(this.highScore))
      }
      this.screen = 'gameover'
    }
  }

  private onSlice(e: Entity, now: number): void {
    this.state.sliceFruit(now)
    this.spawnHalves(e)
    this.spawnParticles(e.pos, fruitColor(e.type))
    if (this.state.lastCombo >= CONFIG.combo.minForBonus) {
      this.comboText = `Combo x${this.state.lastCombo}!`
      this.comboTextUntil = now + 900
      this.flash = Math.min(1, this.flash + 0.5)
    }
  }

  private onBomb(e: Entity): void {
    this.state.sliceBomb()
    this.shake = 1
    this.spawnParticles(e.pos, '#333', 26)
    if (this.state.isOver) {
      if (this.state.score > this.highScore) {
        this.highScore = this.state.score
        localStorage.setItem(CONFIG.highScoreKey, String(this.highScore))
      }
      this.screen = 'gameover'
    }
  }

  private spawnHalves(e: Entity): void {
    const color = fruitColor(e.type)
    for (const side of [-1, 1] as const) {
      this.halves.push({
        pos: { ...e.pos }, vel: { x: e.vel.x + side * 120, y: e.vel.y * 0.5 },
        rotation: e.rotation, angularVel: side * 4, color, side, radius: e.radius, life: 1,
      })
    }
  }

  private spawnParticles(pos: Vec2, color: string, count = CONFIG.particles.perCut): void {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2
      const sp = 120 + this.rng() * 320
      this.particles.push({
        pos: { ...pos }, vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
        life: 0.6, maxLife: 0.6, color,
      })
      if (this.particles.length > CONFIG.particles.maxCount) this.particles.shift()
    }
  }

  private advanceCosmetic(dt: number): void {
    const g = CONFIG.physics.gravity
    this.halves = this.halves
      .map((h) => ({
        ...h,
        vel: { x: h.vel.x, y: h.vel.y + g * dt },
        pos: { x: h.pos.x + h.vel.x * dt, y: h.pos.y + (h.vel.y + g * dt) * dt },
        rotation: h.rotation + h.angularVel * dt,
        life: h.life - dt * 0.7,
      }))
      .filter((h) => h.life > 0 && h.pos.y - h.radius < CONFIG.canvas.height + 80)
    this.particles = this.particles
      .map((p) => ({
        ...p,
        vel: { x: p.vel.x, y: p.vel.y + g * 0.5 * dt },
        pos: { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt },
        life: p.life - dt,
      }))
      .filter((p) => p.life > 0)
  }

  private draw(now: number): void {
    const trails = this.trackers.map((t) => t.getTrail(now))
    render({
      ctx: this.ctx, video: this.video, showFeed: this.showFeed,
      entities: this.entities, halves: this.halves, particles: this.particles,
      trails, score: this.state.score, lives: this.state.lives, highScore: this.highScore,
      comboText: this.comboText, shake: this.shake, flash: this.flash, now,
    })
    this.drawOverlay(now)
  }

  private drawOverlay(now: number): void {
    const ctx = this.ctx
    const { width, height } = CONFIG.canvas
    const center = (lines: string[]) => {
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, width, height)
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff8e7'
      ctx.font = 'bold 56px sans-serif'; ctx.fillText(lines[0], width / 2, height / 2 - 40)
      ctx.font = '26px sans-serif'
      lines.slice(1).forEach((l, i) => ctx.fillText(l, width / 2, height / 2 + 20 + i * 38))
      ctx.restore()
    }
    if (this.screen === 'title') {
      center(['🍉 Fruit Fury', 'Enter — Play   ·   C — Calibrate', `F — toggle camera (${this.showFeed ? 'on' : 'off'})`, `Best ${this.highScore}`])
    } else if (this.screen === 'calibrate') {
      const left = Math.max(0, Math.ceil((this.calibUntil - now) / 1000))
      center(['Calibrate', 'Wave both hands around the area you can comfortably reach', `${left}…`])
    } else if (this.screen === 'countdown') {
      const left = Math.max(1, Math.ceil((this.countdownUntil - now) / 1000))
      center([`${left}`])
    } else if (this.screen === 'gameover') {
      center(['Game Over', `Score ${this.state.score}   ·   Best ${this.highScore}`, 'Enter — Play again'])
    }
  }
}
```

- [ ] **Step 2: Wire `src/main.ts`**

```ts
import { CONFIG } from './config'
import { createHandSource } from './game/camera'
import { Game } from './game/game'

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  const video = document.getElementById('cam') as HTMLVideoElement
  canvas.width = CONFIG.canvas.width
  canvas.height = CONFIG.canvas.height
  const ctx = canvas.getContext('2d')!
  const source = await createHandSource(video, canvas)
  const game = new Game(ctx, video, source)
  await game.start()
}

boot().catch((err) => {
  console.error(err)
  document.body.innerHTML = `<p style="color:#fff;font:20px sans-serif;padding:2rem">Failed to start: ${err}</p>`
})
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Playtest**

Run: `npm run dev`, open the URL, allow the camera.
Expected:
- Title screen shows; press **C**, wave hands for 3s, returns to title.
- Press **Enter**, countdown 3·2·1, fruit starts lobbing up.
- Fast hand swipes leave a glowing trail and slice fruit into halves with particle bursts.
- Slow movements don't cut.
- Slicing 3+ quickly shows a "Combo x3!" banner + flash.
- Missing fruit and slicing bombs reduce hearts; at 0 hearts → Game Over with score + best.
- **F** toggles the dimmed webcam feed.

- [ ] **Step 5: Commit**

```bash
git add src/game/game.ts src/main.ts
git commit -m "feat: wire game loop, screens, slicing, VFX, and scoring"
```

---

## Task 12: Build Verification + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: `tsc` passes and Vite emits `dist/` with no errors.

- [ ] **Step 2: Preview the build**

Run: `npm run preview`, open the URL, confirm the game loads and a slice works.
Expected: identical behavior to dev.

- [ ] **Step 3: Write `README.md`**

```markdown
# 🍉 Fruit Fury

Webcam-controlled Fruit Ninja clone. Slash falling fruit by swiping your hands
in front of the camera — from any direction. Built with TypeScript, Vite,
MediaPipe HandLandmarker, and Canvas 2D.

## Run

```bash
npm install
npm run dev
```

Open the printed URL and allow camera access.

## Controls

- **Enter** — start / restart
- **C** — calibrate your reach (wave both hands around your comfortable area for 3s)
- **F** — toggle the dimmed webcam feed
- No camera? It falls back to mouse control automatically.

## How it works

- MediaPipe tracks up to two index-fingertips at ~30fps.
- A calibration step maps your comfortable reach onto the full game canvas (mirrored).
- A velocity gate turns fast hand motion into cutting segments; segment-vs-circle
  tests decide what gets sliced — so slashing works from any direction.
- Slicing 3+ fruit in one quick swipe scores a combo.

## Test

```bash
npm run test
```

## Tuning

All gameplay constants live in `src/config.ts` (slash velocity threshold, combo
window, spawn ramp, gravity, lives, etc.).
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README and verify production build"
```

---

## Self-Review Notes (for the planner — already reconciled)

- **Spec coverage:** velocity-gated slashing (Task 4 + 11), any-direction (segment vectors, Task 5 + 11), calibration/mapping (Tasks 2–3 + 11), two hands (Task 11 trackers loop), dimmed feed toggle (Tasks 10–11, key `F`), bombs cost a life (Task 8 + 11), lives/miss (Task 8 + 11), combos (Task 8 + 11), score + high score (Task 8 + 11 localStorage), Classic Dojo VFX (Tasks 10–11), mouse fallback (Task 9), decoupled loops (Task 9 camera RAF + Task 11 game RAF), Vitest unit tests (Tasks 2–8), tunable config (Task 1). All covered.
- **Type consistency:** `Vec2`, `ReachBox`, `Entity`, `TrailPoint`, `CuttingSegment`, `SpawnEvent` defined in Task 1 and used consistently. `Half`/`Particle` defined in renderer (Task 10) and imported by game (Task 11). `mapToGame`, `boxFromSamples`, `BladeTracker.push/getTrail/reset`, `segmentHitsCircle`, `integrate`, `difficultyAt/makeSpawn`, `GameState.sliceFruit/sliceBomb/missFruit` names match across tasks.
- **Placeholder scan:** no TBD/TODO; the one intentional rewrite (spawner draft → corrected) is called out explicitly with deletion instruction.
```
