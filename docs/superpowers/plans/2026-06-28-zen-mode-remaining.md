# Zen Mode — Remaining Work Plan (REVISED)

**Date:** 2026-06-28
**Status:** Awaiting user approval

## Problem Statement

Phase 1 implementation adds Zen mode logic but the visual differences between Zen and Classic are too subtle. The user tested Phase 1 and says: "couldn't tell the difference between zen mode and classic."

## Root Causes

1. **Timer is OFF by default** → dead code, no visual indicator
2. **Countdown overlay identical** → first thing player sees is the same
3. **Background unchanged** → dark wood dojo for both modes
4. **No game-over distinction** → both modes show "GAME OVER" screen

## Deliverables

### Phase 2a: Timer model + toggle (PRIORITY #1)
- [ ] Move timer state from `resetGame` default to `GameState` field
- [ ] Default `timerActive = true` for zen mode
- [ ] Add `timerDurationMs` to `GameState` (not CONFIG)
- [ ] Add timer toggle in settings menu (or on-screen button in zen)
- [ ] Support numeric durations: 30s, 60s, 90s (defer 'endless' for now)
- [ ] Update HUD to show timer when `timerActive = true`

### Phase 2b: Zen countdown overlay (PRIORITY #2)
- [ ] Add `beginCountdown` mode-aware: zen shows "ZEN MODE" instead of "3...2...1"
- [ ] Use soft blue/purple palette for zen countdown
- [ ] Add brief "No bombs, no lives, slice freely" subtitle

### Phase 2c: Background gradient + HUD recolor (PRIORITY #2)
- [ ] Add `CONFIG.zen.theme.bgTop` and `CONFIG.zen.theme.bgBottom` (light blue/lavender)
- [ ] Update `render()` in `renderer.ts` to use zen theme colors when `mode === 'zen'`
- [ ] Soften HUD colors (white text → soft blue, gold → pastel)
- [ ] Make ZEN badge pulse/animated (sin wave scale)
- [ ] Timer display: show as countdown text + small progress bar

### Phase 2d: Game-over reason + zen end screen (PRIORITY #3)
- [ ] Add `gameOverReason: 'lives' | 'timeup' | 'endless-quit'` to `Game` class
- [ ] Set reason on timer expiry (`timeup`) vs lives depletion (`lives`)
- [ ] Detect zen game-over (timer expiry) vs classic (lives = 0)
- [ ] Show zen-specific end screen:
  - "Time's Up!" or "Endless Run" instead of "GAME OVER"
  - Final score, fruits sliced, max combo
  - "Play Again" and "Return to Title" buttons
- [ ] Add "End Run" button in pause menu for zen mode (termination path)

### Phase 2e: Audio (PRIORITY #4)
- [ ] Add `audio.play('timewarn')` when 10s remain (one-shot guard)
- [ ] Add `audio.play('timeend')` when timer expires (one-shot guard)
- [ ] Use existing `tone()` for simple tones (no new SFX files)
- [ ] Update `SfxName` union type and `switch` in audio.ts

### Phase 2f: Polish (OPTIONAL — defer if time)
- [ ] Add zen particles (floating petals or bubbles)
- [ ] Soften combo colors (pastel instead of gold)
- [ ] Enhance slow-mo tint in zen (bluer, longer duration)
- [ ] Add zen-specific background music loop (deferred)

## Implementation Order

1. Phase 2a (timer model) — 30 min
2. Phase 2b (countdown overlay) — 15 min
3. Phase 2c (background + HUD) — 30 min
4. Phase 2d (game-over screen) — 45 min
5. Phase 2e (audio) — 20 min
6. Phase 2f (polish) — optional

**Estimated total: 2-3 hours** (excluding polish)

## Acceptance Criteria

- Player can immediately tell they're in Zen mode (visual, audio, UI)
- Timer is ON by default and shows countdown
- Game-over screen shows zen-specific message
- All visual changes are optional and don't break classic mode
- Build succeeds, all tests pass
- No regressions in classic mode

## Testing Plan

### Unit Tests
- `timerActive` defaults to true in zen mode
- `timerDurationMs` is set correctly from settings
- Timer counts down in update loop
- One-shot warning triggers only once at 10s
- One-shot end triggers only once at 0s
- `gameOverReason` is set correctly on timer expiry

### Manual Playtest
- Verify zen mode background is different from classic
- Verify timer displays and counts down
- Verify countdown overlay shows "ZEN MODE"
- Verify timer toggle works (if implemented)
- Verify game-over screen shows zen-specific message
- Verify audio feedback on timer warnings
- Verify no regressions in classic mode

## Notes

- Visual changes should be subtle but clear — not a full theme rework
- Keep classic mode unchanged — all zen changes are gated on `mode === 'zen'`
- Audio feedback should be optional and not intrusive
- Defer 'endless' mode and background music to future phases
- Consolidate `gameMode` vs `state.mode` to single source of truth
