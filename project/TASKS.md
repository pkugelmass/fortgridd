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


 ### Refactoring / Cleanup Tasks
 *(To be prioritized after test triage)*
     *   [ ] **js/game.js:** Simplify `applyStormDamage` (e.g., helper for `isOutsideSafeZone`). (Identified: 2025-04-10)
     *   [ ] **js/game.js:** Decouple logging (`logMessage`) from UI updates (`updateLogDisplay`). (Identified: 2025-04-10)
     *   [ ] **js/main.js:** Simplify `createAndPlaceEnemy` (separate position finding/accessibility from creation). (Identified: 2025-04-10)
     *   [ ] **js/main.js:** Reduce `initializeGame`/`resetGame` duplication (use shared helpers). (Identified: 2025-04-10)
     *   [ ] **js/drawing.js:** Improve parameter passing (pass data like player, enemies, mapData explicitly). (Identified: 2025-04-10) (*Partially done*)
     *   [ ] **js/ai/state_engaging_enemy.js:** Break down large handler function. (Identified: 2025-04-10)
     *   [ ] **js/ai/state_engaging_enemy.js:** Separate concerns (validation, decision, execution). (Identified: 2025-04-10)
     *   [ ] **js/ai/state_engaging_enemy.js:** Simplify/extract complex movement logic. (Identified: 2025-04-10)
     *   [ ] **js/ai/state_fleeing.js:** Break down large handler function (cornered, LOS break, safe move). (Identified: 2025-04-10)
     *   [ ] **js/ai/state_fleeing.js:** Separate concerns (validation, decision, execution). (Identified: 2025-04-10)
     *   [ ] **js/ai/state_fleeing.js:** Extract complex movement strategy logic (LOS break, safe move). (Identified: 2025-04-10)
     *   [ ] **js/ai/state_seeking_resources.js:** Separate concerns (validation, movement, arrival/pickup). (Identified: 2025-04-10)
     *   [ ] **js/ai/state_seeking_resources.js:** Clarify pickup logic/reliance on `moveTowards` side effects. (Identified: 2025-04-10)
 *   [ ] **Standardize Console Logging:** Implement a consistent format for `console.log` messages (e.g., `SUBJECT (coords) | Verb | Object (coords) | Details`). (Added: 2025-04-09)
 *   [ ] **Write Essential Unit Tests:** Add targeted unit tests for critical functions identified during refactoring or review (focus on behavior, not implementation details). (Added: 2025-04-09)
 *   [ ] Review AI state handler modules (`state_*.js`) for length and complexity; refactor if needed. (Added: 2025-04-09)
 *   [ ] Investigate creating a shared `canMoveTo(unit, targetRow, targetCol)` utility function for player/AI move validation. (Discovered: 2025-04-08)
 *   [ ] Refactor resource handling (AI & Player) using a configuration object in config.js. (Discovered: 2025-04-08)

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
