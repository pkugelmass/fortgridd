# FortGridd UX Improvements

## Sequential AI Turn Presentation (Current Task)

**Goal:**  
Make AI turns visually sequential and understandable by processing each AI enemy one at a time, with a visible highlight and a pause before/after each action.

### Implementation Plan

1. **Refactor AI Turn Logic**
   - Convert `runAiTurns` to an asynchronous function.
   - Use `await` and `setTimeout` to introduce delays between each enemy's turn.

2. **Highlight the Current AI**
   - Add `gameState.highlightedEnemyId` to track the active enemy.
   - In `drawEnemies`, render the highlighted enemy with a thick, bright (yellow/gold) glowing or pulsing outline around the enemy's red circle.
   - Optionally animate the outline for extra emphasis.

3. **UI Updates**
   - After setting the highlighted enemy and after each action, trigger a redraw to ensure the highlight is visible during the pause.

4. **Delays**
   - Add configurable constants to `js/config.js` for pause durations before and after each enemy acts.

5. **Disable Player Input**
   - Player input is already ignored when it is not the player's turn.

6. **End of AI Sequence**
   - After all enemies have acted, clear the highlight and end the AI turn as before.

### Highlighting Recommendation

- **Primary:** Glowing or pulsing outline around the enemy circle (yellow/gold).
- **Alternative (future):** Combine with a subtle tile highlight if more emphasis is needed.

### Rationale

- This approach is visually distinct, animation-compatible, and will remain clear even as movement animations are added.

---

## Threat Indicator Overlay (Design Decisions)

**Goal:**  
Help the player identify safe squares or dangerous enemies by visually indicating tiles under threat.

### Design Decisions

1. Threat indicators will use a subtle cross-hatch or diagonal line pattern, not a solid color, to avoid adding more red and to minimize clutter.
2. All enemy threats will be shown, with no distinction between melee and ranged for now.
3. Tiles threatened by multiple enemies will be emphasized by increasing the density or opacity of the cross-hatch pattern.
4. Threat overlays will be computed in a single pass before drawing the grid, aggregating threat counts for each tile. This supports efficient rendering, easy toggling, and scalable performance.
5. The overlay will be always on for development and playtesting, with a simple keyboard toggle (e.g., "T") to show/hide the overlay if it proves distracting or too busy.

---

## Threat Indicator Overlay: Implementation Plan (with Unit Testing)

1. **Define Threat Calculation Logic**
   - Implement a function to calculate all tiles threatened by enemies, aggregating threat counts for each tile.
   - **Unit Test:** Test that the function correctly identifies threatened tiles for various enemy positions, types, and map configurations. Include edge cases (e.g., enemies at map borders, overlapping threats).

2. **Update Drawing Pipeline**
   - Modify the grid drawing logic to accept and use the threat map, applying a subtle cross-hatch or diagonal pattern to threatened tiles.
   - Ensure tiles threatened by multiple enemies are visually emphasized (e.g., denser pattern).
   - **Unit Test:** (If drawing logic is testable) Test that the correct visual state is applied to threatened tiles based on the threat map. (Otherwise, rely on visual/manual testing.)

3. **Implement Overlay Toggle**
   - Add a keyboard shortcut (e.g., "T") to toggle the threat overlay on and off.
   - **Unit Test:** Test that toggling the overlay updates the game state and redraws the grid as expected.

4. **Integrate with Game Loop**
   - Ensure threat calculation and overlay drawing are triggered on relevant game state changes (e.g., after enemy or player moves).
   - **Unit Test:** Test that the threat map updates correctly after player/enemy movement and that toggling works in all relevant game states.

5. **Playtest and Refine**
   - Test for visual clarity, performance, and usability.
   - Adjust pattern style, density, or toggle behavior based on feedback.

### Unit Testing Notes

- The most important new tests are for the threat calculation logic and overlay toggle state.
- Existing tests for enemy movement, attack range, and map updates may need to be amended if they assume no threat overlay or if the threat calculation logic is tightly coupled with enemy actions.
- Drawing tests are less critical unless the drawing logic is already unit-tested; otherwise, rely on visual/manual QA for rendering.

---

## Future UX Improvements (Sections to be added)

- **Movement/Attack Animations:** Sliding units, attack effects, etc.
- **Attack/Healing Feedback:** Animations, color flashes, floating numbers.
- **Threat Indicators:** Show attack ranges or danger zones.
- **UI/Stats Bar:** Improve clarity and usefulness.
- **Instructions/Onboarding:** Help new players understand the game.
- **Action Log Redesign:** Improve readability and usefulness.
- **Developer Overlays:** Expose key stats for tuning/balance.

---

*Add new sections here as additional UX improvements are planned or implemented.*

---

## Visual Feedback & Effects System (2025-04-12)

### Intent & Purpose

The goal of the effect system is to make the events of the game clear, understandable, and engaging for the player. This system will provide immediate, visually distinct feedback for key gameplay events (attacks, movement, pickups, etc.), improving both playability and enjoyment. The system should be economical and fit for the current prototype phase, but flexible enough to support future polish or a full visual overhaul.

### Prioritized List of Visual Feedback Improvements

1. **Ranged attack visualization** – Show the attack traveling from attacker to receiver (highest priority for clarity).
2. **Attack feedback** – Color flash or highlight on attacked unit.
3. **Knockback feedback** – Animate unit sliding/jumping to new tile, or show when knockback is blocked.
4. **Damage feedback** – Floating damage numbers, or a red flash.
5. **Healing feedback** – Floating green numbers, or a green flash.
6. **Movement animation** – Animate movement from one tile to another (not just for knockback).
7. **Enemy elimination flourish** – Visual effect when an enemy is defeated.
8. **Blocked movement feedback** – Show when player tries to move but is blocked.
9. **Pickup indication** – Visual effect or floating “+1!” when a pickup occurs.

### Guiding Principles

- **Clarity first:** Effects should make the game state and actions more understandable, not more confusing.
- **Economical:** The system should be simple to implement and maintain, avoiding over-engineering at this stage.
- **Extensible:** The architecture should allow for future polish, new effect types, or a full visual overhaul.
- **Visual hierarchy:** Effects should stand out against the game board and not add to visual clutter.

### Next Steps

1. **Visual Simplification Pass:**  
   Before implementing the effect system, we will do a quick pass to reduce visual clutter on the game board (e.g., tone down overlay colors, reduce tile saturation, clarify threat indicators).

2. **Effect System Implementation:**  
   After simplification, we will implement a single, flexible effect system capable of supporting the prioritized feedback types above.

3. **Iterative Improvement:**  
   As new needs or ideas arise, we will update this document and the effect system accordingly.

---