# FortGridd Effect System Architecture

## Overview

The effect system provides a modular, extensible way to manage and render transient visual feedback (animations, flashes, floating numbers, etc.) in the game. It is designed to be separate from persistent game logic, supporting both current canvas primitives and future sprite-based effects.

## Key Components

- **effects.js module:** Manages the effect queue, effect object definitions, and the animation loop.
- **Effect objects:** Each effect is an object with:
  - `type` (e.g., "ranged-attack", "move", "flash", "float-number")
  - `startTime` and `duration`
  - `position` (and/or start/end positions for movement/projectiles)
  - `data` (e.g., color, value, sprite, etc.)
  - `draw(ctx, now)` method for rendering (uses primitives or sprite if available)
- **Effect manager/queue:** Stores all active effects, updates them each frame, and removes expired effects.
- **Animation loop:** Uses `requestAnimationFrame` to update and render effects on top of the main game state.

## Integration

- **Effect triggers:** Game logic (e.g., attack, move, pickup) pushes new effects to the queue when events occur.
- **Rendering:** Effects are rendered on top of the main game board, using drawing utilities from `drawing.js`. Effects do not block game logic unless needed (e.g., for movement animation).
- **Separation of concerns:** Effects are transient and not part of `gameState`. The effect system can receive `gameState` as input for effect triggers, but effects themselves are not saved/loaded with the game.

## Extensibility

- New effect types can be added by defining new effect objects with their own `draw` logic.
- Sprite support can be added by allowing the `draw` method to use images if available.
- The architecture supports future expansion to sound, haptics, or more complex effect logic.

## Unit Testing

- Test effect creation (correct effect object added to queue)
- Test effect lifecycle (expires after duration)
- Test effect manager logic (queue, update, cleanup)
- Visual output is best tested manually or with screenshot diffing.

## Mermaid Diagram

```mermaid
flowchart TD
    A[Game Event (e.g., attack, move)] --> B[Add Effect to Queue]
    B --> C[Effect Manager/Array]
    C --> D[requestAnimationFrame Loop]
    D --> E[Update/Remove Expired Effects]
    D --> F[Redraw Game State]
    D --> G[Draw All Active Effects]
    G --> H[Effect draw(ctx, now): primitive or sprite]
```

---

*Document created 2025-04-12 as part of the Phase 3 UX/UI Enhancements.*

---

## Module Responsibilities and Best Practices

**Effect System Core (js/effects.js):**

- All effect definitions, the global effects queue, the animation loop, and the exported API (including trigger functions) are implemented here.
- Each effect type (e.g., ranged attack) has its own trigger function and draw logic in this module.
- The Promise-based sequencing and effect lifecycle management are handled here.

**Game Logic and AI (js/ai.js, js/ai/state_engaging_enemy.js, etc.):**

- Game and AI logic modules are responsible for calling effect trigger functions and awaiting their Promises.
- For example, AI attack logic in js/ai/state_engaging_enemy.js calls and awaits triggerRangedAttackEffect.

**Game Loop and Rendering (js/main.js, js/drawing.js):**

- The main game loop and board rendering logic live here.
- The animation loop in js/effects.js calls redrawCanvas (from js/drawing.js or js/main.js) before drawing effects, ensuring the board is always up to date before effects are rendered.

**Configuration (js/config.js):**

- Timing constants (such as stepTime, AI_TURN_DELAY) and other tunable parameters are typically defined here.

**Best Practice:** When adding a new effect, implement its core logic and trigger function in js/effects.js, integrate calls to it in the appropriate game or AI module, and ensure any configuration is centralized in js/config.js. This modular separation keeps the system maintainable and easy to extend.