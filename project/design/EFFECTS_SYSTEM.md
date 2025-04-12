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