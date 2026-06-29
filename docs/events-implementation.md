# Environmental Events Implementation

## Overview
Three environmental events have been added to Fruit Fury that apply to **all game modes** (Classic, Zen, Time Attack):

1. **Fruit Storm** - Random event where fruits rain from the top of the screen
2. **Lightning Strike** - A bolt zaps a random fruit, creating a chain reaction
3. **Golden Hour** - Every 30 seconds, all fruits temporarily turn golden for 3x points

## Architecture

### Shared Event System
All events are managed by a central `EventScheduler` class that is **mode-agnostic**. The scheduler:
- Triggers random events (Fruit Storm, Lightning Strike) based on configurable probabilities
- Triggers periodic events (Golden Hour) on a fixed schedule
- Manages active event state and cleanup
- Draws event-specific visuals

### DRY Principles
- **No mode-specific event code** - All event logic is in `src/engine/events/`
- **Shared configuration** - Event timing and behavior configured once in `config.ts`
- **Unified world interface** - Events interact with the game through `EventWorld` interface
- **Easy extension** - New events just implement the `GameEvent` interface

## File Structure

```
src/engine/events/
├── types.ts              # Event types, config, EventWorld interface
├── fruitStorm.ts         # Fruit storm event implementation
├── lightningStrike.ts    # Lightning strike with chain reaction
├── lightningBolt.ts      # Visual bolt generation and rendering
└── goldenHour.ts         # Golden hour state management

src/engine/events.ts      # EventScheduler class (orchestrates all events)
```

## Event Details

### Fruit Storm
- **Frequency**: Every 45-120 seconds (random)
- **Duration**: 4 seconds
- **Behavior**: Fruits rain from the top of the screen with realistic physics
- **Visual**: Fruits spawn at random x positions, fall with gravity and horizontal drift
- **Audio**: Storm sound effect

### Lightning Strike
- **Frequency**: Every 60-150 seconds (random)
- **Chain Radius**: 130px
- **Chain Delay**: 200ms between chain levels
- **Max Chain Depth**: 4 levels
- **Behavior**: 
  1. Lightning bolt strikes a random fruit
  2. Chain reaction zaps nearby fruits with delay
  3. Each zapped fruit triggers another round of nearby zaps
- **Visual**: Jagged lightning bolt from top of screen to target
- **Audio**: Lightning crack + thunder

### Golden Hour
- **Frequency**: Every 30 seconds
- **Duration**: 5 seconds
- **Points Multiplier**: 3x
- **Behavior**: All fruits on screen get golden tint, slicing gives 3x points
- **Visual**: Pulsing golden overlay with sparkle particles
- **Audio**: Magical shimmer on start, gentle chime on end

## Integration

### Config (`src/config.ts`)
```typescript
events: {
  fruitStorm: { minIntervalMs, maxIntervalMs, durationMs },
  lightningStrike: { minIntervalMs, maxIntervalMs, chainRadius, chainDelayMs, boltDurationMs, maxChainDepth },
  goldenHour: { intervalMs, durationMs, pointsMultiplier }
}
```

### Scoring (`src/engine/scoring.ts`)
- Added `goldenMultiplier` state (default 1, set to 3 during Golden Hour)
- `sliceFruit()` now multiplies score by `goldenMultiplier`
- `activateGoldenHour(now)` sets the multiplier and expiry time
- `isGoldenHourActive(now)` checks if golden hour is currently active

### Game Loop (`src/game/game.ts`)
- EventScheduler instantiated in `resetGame()`
- `eventScheduler.update(now, dt)` called in playing state
- `eventScheduler.draw(ctx, now)` called in `drawOverlay()`
- World context passed to scheduler (entities, RNG, particles, etc.)

### Audio (`src/game/audio.ts`)
Added procedural sound effects:
- `storm()` - Rain/splat sounds
- `lightning()` - Thunder crack
- `goldenStart()` - Magical arpeggio
- `goldenEnd()` - Gentle chime

## EventWorld Interface

Events interact with the game through this interface:
```typescript
interface EventWorld {
  entities: Entity[]
  rng: () => number
  canvas: { width: number; height: number }
  spawnParticles(pos: Vec2, color: string, count: number): void
  shake: number
  flash: number
  setComboText(text: string, until: number): void
  playSfx(name: string): void
  processSlice(entity: Entity, now: number): void
  nextId(): number
  fruitType(): EntityType
  fruitRadius(): number
  activateGoldenHour(now: number): void
}
```

## GameEvent Interface

New events implement this interface:
```typescript
interface GameEvent {
  update(now: number, dt: number, world: EventWorld): void
  isFinished(now: number): boolean
  draw(ctx: CanvasRenderingContext2D, now: number): void
}
```

## Adding New Events

1. Create a new file in `src/engine/events/` (e.g., `rainbow.ts`)
2. Implement the `GameEvent` interface
3. Add event config to `CONFIG.events` in `config.ts`
4. Register in `EventScheduler`:
   - Add private field: `private rainbow = new RainbowEvent()`
   - Add to `update()` if periodic, or to `tryTriggerRandomEvent()` if random
   - Add to `draw()` if has visuals
5. Add sound effects to `AudioEngine` if needed

## Testing

Run TypeScript compiler:
```bash
npx tsc --noEmit
```

The implementation is fully type-checked and compiles cleanly.

## Balance Notes

- Events are **additive** - they don't remove other gameplay elements
- **No bomb penalties** in Zen/Time Attack modes (existing behavior preserved)
- Events work with **existing power-ups** (slow-mo, shrink, freeze)
- Golden Hour multiplier **stacks with combo multiplier**
