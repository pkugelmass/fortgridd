# FortGridd Tasks (v2 - develop 2 branch)

## Phase 1: Strengthen Codebase (Started: 2025-04-08)
*(Completed foundational setup, initial tests, constant centralization, and movement/pickup refactoring. See `project/COMPLETED_TASKS.md` for details.)*

---
## Phase 2: AI Evolution (Started: 2025-04-08)

### Implement Finite State Machine (FSM)
*(Completed initial FSM implementation, including states, AI object enhancements, core logic, knockback, medkit usage, and various fixes. See `project/COMPLETED_TASKS.md` for details.)*

### Unit Testing & Refinement
*(Initial test setup and triage completed. Next steps involve refactoring and then improving test coverage.)*

*   **Remaining Unit Testing Tasks:**
    *   [ ] Add tests for initial AI state and properties.
    *   [ ] Add unit tests for `calculateKnockbackDestination` helper function. (Added: 2025-04-09)
    *   [ ] Expand unit tests for AI state handlers (Engaging, Fleeing, etc.). (Added: 2025-04-09)
    *   [ ] Fix commented-out unit tests in tests/ai.test.js for handleSeekingResourcesState. (Added: 2025-04-08)
    *   [ ] Add more unit tests as code is refactored/added.

*   **Refined Testing Strategy (Adopted: 2025-04-09):**
    *   [ ] **Prioritize Refactoring:** Proceed with high-priority refactoring tasks (e.g., `ai_helpers.js`, movement checks) after initial test triage. (Next Step)
    *   [ ] **Revisit & Improve Tests:** After refactoring, revisit commented-out tests and write new, targeted tests for the refactored code structure.

 ### Refactoring / Cleanup Tasks
 *(To be prioritized after test triage)*
 *   [ ] **Review Module Length:** Review all `.js` modules; refactor any significantly exceeding ~400 lines. (Added: 2025-04-09)
 *   [ ] **Identify Refactoring Opportunities:** Systematically review code for potential centralization, helper function extraction, or architectural improvements; provide recommendations. (Added: 2025-04-09)
 *   [ ] **Standardize Console Logging:** Implement a consistent format for `console.log` messages (e.g., `SUBJECT (coords) | Verb | Object (coords) | Details`). (Added: 2025-04-09)
 *   [ ] **Write Essential Unit Tests:** Add targeted unit tests for critical functions identified during refactoring or review (focus on behavior, not implementation details). (Added: 2025-04-09)
 *   [x] **Clean Up TASKS.md:** Review completed tasks; consider moving them to a separate archive file (e.g., `project/COMPLETED_TASKS.md`) to keep the main file focused. (Added: 2025-04-09) (Completed: 2025-04-09)
 *   [ ] Review AI state handler modules (`state_*.js`) for length and complexity; refactor if needed. (Added: 2025-04-09)
 *   [x] Refactor ai_helpers.js into smaller, categorized modules (e.g., perception, movement, actions). (Discovered: 2025-04-09) (Completed: 2025-04-09)
 *   [ ] Refactor movement safety check (avoiding known threats) into a reusable helper function in `ai_helpers.js` and update `handleFleeingState` and `handleEngagingEnemyState` to use it. (Discovered: 2025-04-09)
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
*   [ ] Refactor ai_helpers.js into smaller, categorized modules (e.g., perception, movement, actions) if it becomes too large. (Discovered: 2025-04-09)
*   [ ] AI Tuning: Consider knockback effect in movement decisions (esp. for melee AI). (Discovered: 2025-04-09)
*   [ ] Refactor movement safety check (avoiding known threats) into a reusable helper function in `ai_helpers.js` and update `handleFleeingState` and `handleEngagingEnemyState` to use it. (Discovered: 2025-04-09)
*   [ ] Refine AI target selection logic (consider HP, randomness, etc.). (Discovered: 2025-04-08)
*   [ ] Investigate creating a shared `canMoveTo(unit, targetRow, targetCol)` utility function for player/AI move validation. (Discovered: 2025-04-08)
*   [ ] Refactor resource handling (AI & Player) using a configuration object in config.js. (Discovered: 2025-04-08)

---
*(Completed tasks moved to `project/COMPLETED_TASKS.md`)*
