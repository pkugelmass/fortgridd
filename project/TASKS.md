# FortGridd Tasks (v2 - develop 2 branch)

## Phase 1: Strengthen Codebase (Started: 2025-04-08)
*(Completed foundational setup, initial tests, constant centralization, and movement/pickup refactoring. See `project/COMPLETED_TASKS.md` for details.)*

---
## Phase 2: AI Evolution (Started: 2025-04-08)

### Implement Finite State Machine (FSM)
*(Completed initial FSM implementation, including states, AI object enhancements, core logic, knockback, medkit usage, and various fixes. See `project/COMPLETED_TASKS.md` for details.)*

### Unit Testing & Refinement
*(Initial test setup and triage completed. Next steps involve refactoring and then improving test coverage.)*

*   
*   **Refined Testing Strategy (Adopted: 2025-04-09):**
    *   [X] **Prioritize Refactoring:** Proceed with high-priority refactoring tasks (e.g., `ai_helpers.js`, movement checks) after initial test triage. (Next Step)
    *   [ ] **Revisit & Improve Tests:** After refactoring, revisit commented-out tests and write new, targeted tests for the refactored code structure.

### Comprehensive Unit Testing Overhaul (Plan Adopted: 2025-04-10)
*(Systematically review and rewrite/create unit tests module by module, focusing on core logic, edge cases, and failure states. Mock dependencies as needed. Skip trivial code and rendering logic. See `project/TESTING_GUIDELINES.md`)*
*   [X] **Test `js/utils.js`** (Completed: 2025-04-10 - Split into `tests/utils/*`, added helpers, fixed failures)
*   [X] **Test `js/config.js`** (Completed: 2025-04-10 - Refactored existing tests for type/range checks)
*   [X] **Test `js/gameState.js`** (Completed: 2025-04-10 - Added constructor default checks)
*   [X] **Test `js/map.js`** (Completed: 2025-04-10 - Added tests for `createMapData` structure and `countWallNeighbours`)
*   [X] **Test `js/player.js` & `js/playerActions.js`** (Completed: 2025-04-10 - Deleted player.js, added tests for playerActions.js; Verified & Fixed: 2025-04-10)
*   [X] **Test `js/ai.js` (Core FSM Logic)** (Completed: 2025-04-10 - Replaced legacy tests, added new tests for `performReevaluation` & `runAiTurns`)
*   [ ] **Test `js/ai/*` (State handlers, perception, movement, etc.)** (In Progress)
    *   [X] Test `js/ai/ai_perception.js` (Completed: 2025-04-10)
    *   [X] Test `js/ai/ai_actions.js` (Completed: 2025-04-10)
    *   [X] Test `js/ai/ai_movement.js` (Completed: 2025-04-10 - Fixed failing test)
    *   [X] Test `js/ai/state_exploring.js` (Completed: 2025-04-11 - Re-written & Passing)
    *   [X] Test `js/ai/state_healing.js` (Completed: 2025-04-11 - Verified & Passing)
    *   [X] Test `js/ai/state_engaging_enemy.js` (Completed: 2025-04-11 - Added tests & Passing)
    *   [X] Test `js/ai/state_fleeing.js` (Completed: 2025-04-11 - Added tests & Passing)
    *   [X] Test `js/ai/state_seeking_resources.js` (Completed: 2025-04-11 - Added tests & Passing)
*   [ ] **Test `js/game.js`**
*   [ ] **Test `js/input.js` (functions called by handlers)**
*   [ ] **Test `js/drawing.js` & `js/ui.js` (underlying logic only)**
*   [ ] **Test `js/main.js` (initialization)**


 ### Refactoring / Cleanup Tasks
 *(To be prioritized after test triage)*
     *   [X] **Refactor `js/main.js`:** Reduce size and improve separation of concerns by moving logic to `drawing.js`, `game.js`, and new `playerActions.js`. (Completed: 2025-04-10)
     *   [X] **js/game.js:** Simplify `applyStormDamage` (use `isOutsideSafeZone` helper). (Completed: 2025-04-10)
     *   [X] **js/game.js:** Decouple logging (`logMessage`) from UI updates (`updateLogDisplay`) - *Note: Comment updated in `logMessage`; actual decoupling requires main loop/UI refactor.* (Completed: 2025-04-10)
     *   [ ] **js/drawing.js:** Improve parameter passing (pass data like player, enemies, mapData explicitly). (Identified: 2025-04-10) (*Partially done*)
     *   [X] **js/ai/state_engaging_enemy.js:** Break down large handler function. (Completed: 2025-04-10)
     *   [X] **js/ai/state_engaging_enemy.js:** Separate concerns (validation, decision, execution). (Completed: 2025-04-10)
     *   [X] **js/ai/state_engaging_enemy.js:** Simplify/extract complex movement logic. (Completed: 2025-04-10)
     *   [X] **js/ai/state_fleeing.js:** Break down large handler function (cornered, LOS break, safe move). (Completed: 2025-04-10)
     *   [X] **js/ai/state_fleeing.js:** Separate concerns (validation, decision, execution). (Completed: 2025-04-10)
     *   [X] **js/ai/state_fleeing.js:** Extract complex movement strategy logic (LOS break, safe move). (Completed: 2025-04-10)
     *   [X] **js/ai/state_seeking_resources.js:** Separate concerns (validation, movement, arrival/pickup). (Completed: 2025-04-10)
     *   [X] **js/ai/state_seeking_resources.js:** Clarify pickup logic/reliance on `moveTowards` side effects. (Completed: 2025-04-10 - Refactored, added comments)
 *   [X] **Standardize Logging System (Refactor):** (Design: `project/design/LOGGING_DESIGN.md`) (Completed: 2025-04-10)
     *   [X] Add `CONSOLE_LOG_LEVEL` setting to `js/config.js`.
     *   [X] Modify `Game.logMessage` in `js/game.js` to use new parameters (`level`, `target`, `className`).
     *   [X] Refactor all existing `Game.logMessage` callsites with appropriate `level`, `target`, `className`. (*Note: `main.js` required `write_to_file` fallback*)
     *   [X] Refactor all direct `console.*` calls to use `Game.logMessage` or remove them. (*Note: `main.js` required `write_to_file` fallback; some remain in `map.js`, `drawing.js` due to lack of `gameState` context*)
 *   [ ] **Write Essential Unit Tests:** Add targeted unit tests for critical functions identified during refactoring or review (focus on behavior, not implementation details). (Added: 2025-04-09)
 *   [ ] Review AI state handler modules (`state_*.js`) for length and complexity; refactor if needed. (Added: 2025-04-09)
 *   [ ] Investigate creating a shared `canMoveTo(unit, targetRow, targetCol)` utility function for player/AI move validation. (Discovered: 2025-04-08)
 *   [ ] Refactor resource handling (AI & Player) using a configuration object in config.js. (Discovered: 2025-04-08)
 *   [ ] Refactor repetitive test setup boilerplate into a helper function in `test-helpers.js`. (Identified: 2025-04-10)

 ### General Process
 *   [ ] Practice small, logical Git commits with clear messages.

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
 *   [ ] Fix player starting ammo initialization in js/main.js to correctly use PLAYER_START_AMMO from config.js (remove || 3 fallback). (Discovered: 2025-04-09)
 *   [ ] Modify findNearbyResource to ignore resources outside the safe zone. (Discovered: 2025-04-09)
 *   [ ] Modify getValidMoves to prevent movement into/within the storm (check safe zone). (Discovered: 2025-04-09)
 *   [ ] AI Tuning: Consider knockback effect in movement decisions (esp. for melee AI). (Discovered: 2025-04-09)
 *   [ ] Refine AI target selection logic (consider HP, randomness, etc.). (Discovered: 2025-04-08)
 *   [ ] Investigate creating a shared `canMoveTo(unit, targetRow, targetCol)` utility function for player/AI move validation. (Discovered: 2025-04-08)
*   [ ] Refactor resource handling (AI & Player) using a configuration object in config.js. (Discovered: 2025-04-08)

---
*(Completed tasks moved to `project/COMPLETED_TASKS.md`)*
