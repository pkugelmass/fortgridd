# FortGridd Animation & Effects System Rewrite Design

## Goals

- **Smooth animation:** No trails, no jerkiness, consistent frame timing.
- **Extensible:** Easy to add new effect types, support for future sprites or more complex visuals.
- **Lightweight:** Minimal overhead, clear separation of concerns, no unnecessary complexity.

---

## Proposed Architecture

### 1. Single Unified Animation Loop
- Use a single `requestAnimationFrame` loop for all game and effect rendering.
- The loop is the only place where canvas drawing happens.
- All game state and effect state are composed into a single "frame" before drawing.

### 2. Frame State Composition
- Each frame, build a "render state" that includes:
  - The current game state (units, map, etc.)
  - Any active effects (animations, overlays, etc.)
- Effects can modify the render state (e.g., interpolate unit positions, add overlays).

### 3. Effect System
- Effects are objects with:
  - `type`
  - `startTime`, `duration`
  - `update(now, renderState)` — mutates/interpolates the render state for this frame
  - `isExpired(now)`
- Effects are managed in a single array. Each frame, expired effects are removed.

### 4. Rendering Pipeline
- Each frame:
  1. Clear the canvas.
  2. Compose the render state (apply all effects).
  3. Draw the map, units, overlays, UI, etc., using the composed state.
- No drawing happens outside this loop.

### 5. Effect Triggers
- Game logic triggers effects by pushing new effect objects into the effect array.
- Effects can be awaited (Promise-based) for sequencing, but the animation loop is always in control of drawing.

### 6. Extensibility
- New effects are just new objects with their own `update` logic.
- Sprites, sound, or more complex visuals can be added by extending the effect and render state logic.

---

## Mermaid Diagram

```mermaid
flowchart TD
    A[Game Logic] --> B[Add Effect to Effect Array]
    B --> C[Unified Animation Loop (requestAnimationFrame)]
    C --> D[Compose Render State (apply effects)]
    D --> E[Draw Frame (map, units, effects, UI)]
    E --> F[Next Frame]
```

---

## Example Frame Loop (Pseudocode)

```js
function animationFrame(now) {
  // 1. Remove expired effects
  effects = effects.filter(e => !e.isExpired(now));

  // 2. Compose render state
  let renderState = getBaseGameState();
  for (const effect of effects) {
    effect.update(now, renderState);
  }

  // 3. Draw everything
  clearCanvas();
  drawMap(renderState);
  drawUnits(renderState);
  drawEffects(renderState); // overlays, floating numbers, etc.
  drawUI(renderState);

  requestAnimationFrame(animationFrame);
}
```

---

## Summary

This design will ensure smooth, modern animation, eliminate trails and jerkiness, and provide a lightweight, extensible foundation for future effects and features.

*Approved by user 2025-04-12*