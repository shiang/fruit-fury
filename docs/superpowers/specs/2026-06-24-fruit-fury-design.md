# Fruit Fury — Design Spec

**Date:** 2026-06-24
**Status:** Approved for planning

## Summary

Fruit Fury is a browser-based Fruit Ninja clone controlled by webcam hand
gestures. The player slashes falling fruit by swiping their hands in front of
the camera. Slashing works from any direction, driven by real hand motion
vectors rather than fixed gestures. A short calibration step maps the player's
comfortable physical reach precisely onto the game canvas for an ergonomic,
accurate experience.

## Goals

- Play Fruit Ninja "Classic mode" using webcam hand tracking, no mouse/touch required.
- Slash from any direction via velocity-gated motion detection.
- Precise, ergonomic mapping from the player's physical reach to game space.
- Juicy, satisfying slash visual effects in a "Classic Dojo" art style.
- Run entirely in the browser; no backend.

## Non-Goals (v1)

- Multiplayer / networking.
- Multiple game modes beyond Classic (Arcade/Zen deferred).
- Accounts or cloud leaderboards (local high score only).
- Mobile/touch-first design (desktop webcam is the target; mouse fallback exists for testing).

## Core Decisions

| Decision | Choice |
|---|---|
| Slash model | **Velocity-gated swipe** — blade cuts only when the hand moves fast enough |
| Spatial mapping | **Quick calibration** of reach box → full canvas, with sensible default to start |
| Hands | **Two hands**, two independent blades |
| Webcam feed | **Shown dimmed behind game**, with toggle in settings |
| Features | Bombs, lives/missed fruit, combos, score + persistent high score |
| Bomb penalty | **Costs one life** (not instant game over) |
| Art style | **Classic Dojo** — warm wooden backdrop, white katana trail, juicy fruit/splatter |

## Tech Stack

- **TypeScript + Vite** — dev server and build.
- **MediaPipe Tasks Vision `HandLandmarker`** — in-browser, GPU-accelerated hand
  tracking; up to 2 hands, 21 landmarks each.
- **Canvas 2D** rendering — no game engine, for full control of blade ribbon and
  particle VFX while staying lightweight.
- **localStorage** — persists high score and calibration.
- **Vitest** — unit tests for pure engine logic.

## Architecture

Two decoupled loops:

1. **Tracking loop** (~30fps, driven by MediaPipe callback): read fingertip
   positions for each detected hand, map into game space, feed the Blade Tracker.
2. **Render/game loop** (60fps via `requestAnimationFrame`): advance physics,
   spawn entities, run slice collisions, update score/lives/combos, render
   everything (dimmed feed, blade ribbons, fruit, particles, HUD). The blade
   trail interpolates between tracking samples so motion stays smooth despite the
   slower tracking rate.

### Modules

Pure logic modules (camera-free, unit-tested):

- **`mapping`** — converts a normalized hand landmark to game-space coordinates
  using the calibrated reach box; handles horizontal mirroring.
- **`calibration`** — accumulates hand position extremes over a sampling window
  to produce a reach box (min/max X/Y + margin); serializes to/from localStorage.
- **`bladeTracker`** — per hand: maintains recent positions, computes velocity,
  decides "hot" state (above threshold), emits cutting segments and trail points.
- **`collision`** — segment vs. circle intersection; determines which fruit a hot
  blade segment slices, with per-fruit debounce.
- **`spawner`** — produces fruit/bomb launch events (position, velocity, type)
  with difficulty ramping over time.
- **`physics`** — projectile motion (gravity) for whole fruit, halves, particles.
- **`scoring`** — points, combo detection (3+ slices within one swipe window),
  multipliers, lives, game-over state.

Thin glue modules (manually playtested):

- **`camera`** — `getUserMedia`, MediaPipe init, permission/error handling, mouse fallback.
- **`renderer`** — Canvas 2D draw routines for feed, ribbon, fruit, halves, particles, HUD, screen effects.
- **`game`** — wires loops, screens, and state transitions together.

## Spatial Mapping & Calibration

- **Blade point:** index fingertip (landmark 8) of each hand.
- **Calibration step:** the player waves both hands around the area they can
  comfortably reach for ~3 seconds. The system records min/max X and Y across
  samples → reach box, expanded by a small margin. Saved to localStorage and
  re-runnable from the menu.
- **Mapping formula** (per axis, normalized landmark coords in `[0,1]`):
  - `gameX = canvasWidth  * (1 - clamp((handX - boxMinX) / boxWidth,  0, 1))`  *(mirrored)*
  - `gameY = canvasHeight *      clamp((handY - boxMinY) / boxHeight, 0, 1)`
- **Default box:** centered, ~60% of the frame, so the game is playable before
  calibration.
- Mirroring makes hand-right = blade-right, matching the mirrored feed the player sees.

## Slash Detection (any direction)

- Each tracking frame, compute fingertip velocity in game space (px/sec) from the
  last sample and elapsed time.
- If velocity > `SLASH_VELOCITY_THRESHOLD`, the blade is "hot."
- The line segment from the previous to current position is a **cutting segment**.
  A fruit is sliced if a hot segment intersects its bounding circle. Using the
  real motion vector makes slashing direction-agnostic.
- Per-fruit slice debounce prevents one swipe from re-cutting the same fruit.

## Slash VFX (Classic Dojo)

- **Blade ribbon:** tapered, motion-blurred trail following the fingertip, white-hot
  core with soft glow, thickness scaling with speed, fading over ~150ms.
- **Cut:** fruit splits into two halves that fly apart with spin under gravity;
  colored juice-particle burst; brief screen splatter decal.
- **Combo (3+ in one swipe):** screen flash, "Combo xN!" banner, bonus points,
  extra spark burst.
- **Bomb hit:** screen shake + smoke puff; costs a life.

## Game Systems

- **Spawner:** lobs fruit and occasional bombs from the bottom edge in arcing
  trajectories; spawn rate and bomb frequency ramp with elapsed time.
- **Fruit:** several types, each with its own color and juice; whole fruit and
  two-half variants for the cut animation.
- **Bombs:** slicing one costs one life.
- **Lives:** start at 3; letting a fruit fall off-screen costs one; game over at 0.
- **Score:** points per fruit + combo multipliers; persistent high score in localStorage.

## Screens & Flow

Title → (Calibrate | Play) → Countdown → Game → Game Over (score, high score,
replay). Settings accessible from Title: toggle webcam feed visibility, recalibrate.

## Error Handling & Degradation

- **No camera / permission denied:** clear on-screen message and a **mouse-fallback**
  control mode so the game remains playable and testable.
- **No hands detected:** blades simply idle; gentle hint to step into frame.
- Particle counts capped; static background pre-rendered to an offscreen canvas to
  protect frame rate.

## Testing Strategy

- **Unit tests (Vitest):** mapping math, calibration box derivation,
  velocity gating, segment–circle intersection, combo counting, scoring, life loss
  — all camera-free.
- **Manual playtest:** webcam feel, calibration ergonomics, VFX, difficulty ramp.
- Glue (camera/renderer/DOM) kept thin around the tested core.

## Tunable Parameters (initial)

- `SLASH_VELOCITY_THRESHOLD`, blade trail lifetime (~150ms), calibration margin,
  combo window, spawn rate ramp, gravity, starting lives (3), particle caps.
  Collected in one config module for easy tuning during playtest.
