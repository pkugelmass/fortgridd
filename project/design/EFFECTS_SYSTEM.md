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


---

# Effects System: Animation Layer Refactor Summary

## Purpose

To unify and simplify the rendering of both static and animated units (player, enemies) by introducing a true "animation layer" that leverages the main drawing functions for all cases. This eliminates code duplication, ensures visual consistency, and makes future effects easier to implement.

## Key Points

- **Single Source of Truth for Drawing:**  
  All units (static or animated) are drawn using the same `drawPlayer` and `drawEnemies` functions.

- **Interpolated Animation:**  
  These functions are refactored to accept optional interpolated coordinates (row/col or x/y). During animation, the effect system calls them with interpolated positions.

- **Animation Layer Responsibility:**  
  The animation layer decides which units are animated and which are static in each frame.  
  - Static units: drawn at their grid position.
  - Animated units: drawn at their interpolated position, and skipped in the static draw pass.

- **No Duplication:**  
  The effect system never hard-codes its own drawing logic for units. All visual features (outlines, health bars, highlights) are handled in one place.

- **Extensible:**  
  New effects (e.g., knockback, dashes) can use the same pattern, passing interpolated positions to the main draw functions.

## Example API

```js
// In drawing.js
function drawPlayer(ctx, player, cellSize, opts = {}) {
    const row = opts.interpolatedRow ?? player.row;
    const col = opts.interpolatedCol ?? player.col;
    // ...draw using row/col...
}

// In effects.js (movement effect)
drawPlayer(ctx, unit, cellSize, { interpolatedRow: row, interpolatedCol: col });
```

## Benefits

- **Visual Consistency:** Animated and static units always look the same.
- **Maintainability:** All drawing logic is in one place.
- **Clarity:** The animation layer is responsible for all visual interpolation.
- **Fun:** Smooth, modern movement and effects, with less risk of bugs or visual artifacts.

## Next Steps

1. Refactor `drawPlayer` and `drawEnemies` to accept interpolated positions.
2. Update the movement effect to use these functions for animation.
3. Test with both static and animated units to ensure visual consistency.
4. Document the new animation layer for future contributors.