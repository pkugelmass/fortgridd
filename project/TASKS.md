# FortGridd Tasks (v2 - develop 2 branch)

## Phase 1: Strengthen Codebase (Started: 2025-04-08)
*(Completed foundational setup, initial tests, constant centralization, and movement/pickup refactoring. See `project/COMPLETED_TASKS.md` for details.)*

---
## Phase 3: UI/UX Enhancements (Current Phase)

### Planned improvements - in-game
*   [ ] Implement sequential AI turn presentation with highlighting and delays so the user can follow the action.
    *   [x] Refactor AI turn sequencing to async/await with minimal/no highlight. (Completed 2025-04-12)
    *   [X] Implement a short delay between each AI turn (e.g., 200–400ms, configurable).
    *   [X] Ensure redraws occur after each enemy action (test with a visible log or counter).
*   [ ] Show attack ranges or threat indicators to help the player identify safe squares or dangerous enemies.
    *   [x] Define threat calculation logic: Implement a function to calculate all tiles threatened by enemies, aggregating threat counts for each tile. Add unit tests for correct threat identification, including edge cases. (Completed 2025-04-12)
    *   [X] Update drawing pipeline: Modify grid drawing logic to use the threat map, applying a subtle cross-hatch or diagonal pattern to threatened tiles. Emphasize multiply-threatened tiles. (Unit test if feasible; otherwise, rely on visual QA.)
    *   [X] Implement overlay toggle: Add a keyboard shortcut (e.g., "T") to toggle the threat overlay on/off. Unit test toggle state and redraw.
    *   [X] Integrate with game loop: Ensure threat calculation and overlay drawing update after player/enemy moves. Unit test threat map updates and toggle in all relevant states.
    *   [X] Playtest and refine: Test for clarity, performance, and usability. Adjust pattern style, density, or toggle behavior as needed.
*   [X] Light visual pass for clarity / reducing "busy"-ness.
*   [ ] Add clear visual feedback for movement, attacks, knockbacks, damage, and healing (e.g., animations, color flashes, floating numbers).
    *   [X] Design effect system architecture (modular, supports shapes/icons/sprites)
    *   [X] Set up animation loop (requestAnimationFrame)
    *   [X] Implement core effect system (effect queue/manager, effect lifecycle)
    *   [x] Implement ranged attack visualization effect (bullet/line/projectile) (Completed 2025-04-12)
    *   [x] Refactor effect triggers to return Promises that resolve when the animation completes (Completed 2025-04-12)
    *   [x] Update AI turn logic to sequence effects using async/await and Promise.all for parallel and sequential effects (Completed 2025-04-12)
    *   [x] Unit test and playtest effect sequencing and turn pacing (Completed 2025-04-12)
*   [ ] Implement movement animation effect (including knockback)
    *   [ ] Make all animation durations (movement, knockback, ranged, etc.) configurable in config.js
    *   [ ] Implement movement animation effect (sliding, with optional easing)
    *   [ ] Integrate movement effect into player and AI movement logic, using Promises for sequencing
    *   [ ] Implement knockback effect with bounce (or shake for failed movement)
    *   [ ] Integrate knockback effect into game logic
    *   [ ] Implement highlighting of active unit (player or enemy) during their turn
    *   [ ] Playtest and adjust animation durations and effects for clarity and readability




    *   [ ] Implement additional effects (attack feedback, knockback, damage, healing, elimination, blocked, pickup)
    *   [ ] Unit testing (effect triggering, lifecycle, manager logic)
    *   [x] Documentation & playtest checklist (EFFECTS_SYSTEM.md updated, 2025-04-12)
    *   [ ] Add TODOs/placeholders for future sprite support in code and docs
*   [ ] Experiment with adding a few fun sprites or visual touches.
*   [ ] Revisit the idea of highlighting the "current" enemy.
*   [ ] Revisit the idea of directional threat indication.
*   [ ] Consider having the player's threat squares indicated as well
*   [ ] Consider a stronger visual indicator when it's the player's turn and not.

### Planned improvements - UI
*   [ ] Improve the stats/info bar at the top for clarity and usefulness; review which stats are shown.
*   [ ] Add instructions or an overview to help new players understand the game.
*   [ ] Tidy up the HTML/CSS frame for usability/attractiveness (not final polish).
*   [ ] Redesign or improve the on-screen action log for readability and usefulness.
*   [ ] Add developer/debug overlays or tools to expose key stats for future tuning/balance. (maybe)

*   [ ] Add new UI/UX tasks here as they are identified.

### General Process
*   [ ] Practice small, logical Git commits with clear messages.

---

### Subtasks: Sequential AI Turn Presentation & Highlighting




---
## Phase 3: UI/UX Enhancements (Future)

*   [ ] Implement Sequential AI Turn Presentation: (Added: 2025-04-09)
    *   Modify `executeAiTurns` to process AIs one by one asynchronously.
    *   Highlight current AI.
    *   Add configurable pauses (`setTimeout`) before/after AI action.
    *   Ensure display updates correctly after each action.
    *   **Crucially:** Disable player input during the entire AI sequence.
    *   Consider making pause durations configurable (via `config.js` or user setting).

---
## Discovered During Work
*(Add new tasks identified during development here)*
(check safe zone). (Discovered: 2025-04-09, Completed: 2025-04-12)
 *   [ ] AI Tuning: Consider knockback effect in movement decisions (esp. for melee AI). (Discovered: 2025-04-09)
 *   [ ] Refine AI target selection logic (consider HP, randomness, etc.). (Discovered: 2025-04-08)
 *   [ ] Investigate creating a shared `canMoveTo(unit, targetRow, targetCol)` utility function for player/AI move validation. (Discovered: 2025-04-08)
*   [ ] Refactor resource handling (AI & Player) using a configuration object in config.js. (Discovered: 2025-04-08)

---
*(Completed tasks moved to `project/COMPLETED_TASKS.md`)*
