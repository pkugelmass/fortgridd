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
    *   [ ] Design effect system architecture (modular, supports shapes/icons/sprites)
    *   [ ] Set up animation loop (requestAnimationFrame)
    *   [ ] Implement core effect system (effect queue/manager, effect lifecycle)
    *   [ ] Implement ranged attack visualization effect (bullet/line/projectile)
    *   [ ] Implement movement animation effect (including knockback)
    *   [ ] Integrate effect triggers for these effects (modify game logic to trigger effects)
    *   [ ] Refactor AI turn sequencing and movement system after effect system is proven
    *   [ ] Implement additional effects (attack feedback, knockback, damage, healing, elimination, blocked, pickup)
    *   [ ] Unit testing (effect triggering, lifecycle, manager logic)
    *   [ ] Documentation & playtest checklist
    *   [ ] Add TODOs/placeholders for future sprite support in code and docs
*   [ ] Experiment with adding a few fun sprites or visual touches.
*   [ ] Revisit the idea of highlighting the "current" enemy.
*   [ ] Revisit the idea of directional threat indication.

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
