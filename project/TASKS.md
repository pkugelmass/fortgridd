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
    *   [ ] Refactor config constants into the Game object if needed.
    *   [ ] Add developer debug mode to visualize sequencing steps.
*   [ ] Show attack ranges or threat indicators to help the player identify safe squares or dangerous enemies.
*   [ ] Add clear visual feedback for attacks, knockbacks, damage, and healing (e.g., animations, color flashes, floating numbers).
*   [ ] Add simple movement/attack animations (e.g., sliding units).
*   [ ] Experiment with adding a few fun sprites or visual touches.
*   [ ] Revisit the idea of highlighting the "current" enemy.

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
