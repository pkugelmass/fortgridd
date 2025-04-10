# FortGridd Tasks (v2 - develop 2 branch)

## Phase 1: Strengthen Codebase (Started: 2025-04-08)

### Foundational Setup & Initial Cleanup

1.  **Establish Browser-Based Unit Testing:**
    *   [x] Configure test runner to use existing QUnit library files from `tests/vendor/`.
    *   [x] Create `tests/test-runner.html` to load QUnit, game scripts, and test scripts.
    *   [x] Add QUnit display elements (`<div id="qunit">`, `<div id="qunit-fixture">`) to `test-runner.html`.

2.  **Write Initial Unit Tests:**
    *   [x] Identify simple, testable units (e.g., `config.js` values, utility functions).
    *   [x] Create initial test file(s) (e.g., `tests/config.test.js`).
    *   [x] Write basic assertions using QUnit API.

3.  **Centralize Constants:**
    *   [x] Review `js/ai.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/game.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/player.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/map.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/drawing.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/main.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/input.js` for hardcoded values and move to `js/config.js`.
    *   [x] Update reviewed files to reference constants from `config.js`.

### Deeper Refactoring & Consistency
*   [x] Refactor Movement & Pickup Logic: Centralize unit position updates and resource pickups using Game.updateUnitPosition and Game.checkAndPickupResourceAt helpers. (Completed: 2025-04-09)
*   [x] Move Movement/Pickup Helpers: Relocated `checkAndPickupResourceAt` and `updateUnitPosition` from `js/game.js` to new `js/utils.js` file for better organization. Updated calls and `index.html`. (Completed: 2025-04-09)

---
## Phase 2: AI Evolution (Started: 2025-04-08)

### Implement Finite State Machine (FSM)

1.  **Define States & Config:** (Completed: 2025-04-08)
    *   [x] Add AI state constants (`AI_STATE_EXPLORING`, `AI_STATE_SEEKING_RESOURCES`, `AI_STATE_ENGAGING_ENEMY`, `AI_STATE_FLEEING`) to `js/config.js`.
    *   [x] Add AI decision thresholds (`AI_SEEK_HEALTH_THRESHOLD`, `AI_FLEE_HEALTH_THRESHOLD`) to `js/config.js`.
    *   [x] Add resource pickup constants (`AI_AMMO_PICKUP_AMOUNT`) to `js/config.js`.
    *   [x] Add AI medkit property (`AI_START_MEDKITS`) to `js/config.js`.

2.  **Enhance AI Object:** (Completed: 2025-04-08)
    *   [x] Add `state` property to AI objects in `js/ai.js`, initialized to `EXPLORING`. (Completed via refactor 2025-04-08)
    *   [x] Add `medkits` property to AI objects in `js/ai.js`. (Completed in createAndPlaceEnemy 2025-04-08)
    *   [x] Add `targetEnemy` property to AI objects in `js/ai.js`. (Completed in createAndPlaceEnemy 2025-04-08)
    *   [x] Add `targetResourceCoords` property to AI objects in `js/ai.js`. (Completed in createAndPlaceEnemy 2025-04-08)

3.  **Implement FSM Logic:** (Started: 2025-04-08)
    *   [x] Refactor main AI turn function in `js/ai.js` to use state handlers. (Completed: 2025-04-08)
    *   [x] Implement `handleExploringState` function (scan, decide transitions). (Completed: 2025-04-08)
    *   [x] Refactor `js/ai.js` into smaller modules (e.g., state handlers, helpers). (Completed: 2025-04-08)
    *   [x] Implement `handleSeekingResourcesState` function (move to target, pickup logic, transitions). (Completed: 2025-04-08)
    *   [x] Enhance `moveTowards` helper to allow sideways movement if no closer step exists. (Completed: 2025-04-08)
    *   [x] Update AI state logs (`Game.logMessage`) to include enemy coordinates. (Completed: 2025-04-08)
    *   [x] Fix `getValidMoves` to allow movement onto resource tiles (TILE_MEDKIT, TILE_AMMO). (Completed: 2025-04-08 - Discovered during playtest)
    *   [x] Fix visual delay on resource pickup by ensuring `redrawCanvas` runs every AI turn end. (Completed: 2025-04-08 - Discovered during playtest)
    *   [x] Draw enemy ID labels on canvas in `drawEnemies`. (Completed: 2025-04-08)
    *   [x] Implement `handleEngagingEnemyState` function (move/attack target, transitions). (Completed: 2025-04-08)
    *   [x] Refactor AI turn logic for immediate action after re-evaluation. (Completed: 2025-04-09)
        *   [x] Modify state handlers to return true/false. (Completed: 2025-04-09)
        *   [x] Modify `performReevaluation` to only set state. (Verified: 2025-04-09)
            *   [x] Modify `executeAiTurns` to loop until action or limit. (Completed: 2025-04-09)
    *   [x] Implement `handleFleeingState` function (break LOS, transitions). (Completed: 2025-04-09)
    *   [x] Implement Knockback mechanic on attacks. (Completed: 2025-04-09)
    *   [x] Implement AI Medkit Usage logic (decide when to use, apply healing). (Validated: 2025-04-09 after debugging)
    *   [x] Fix AI Ammo Pickup Tile Update: Ensure map tile changes back to `TILE_LAND` after AI picks up ammo. Ensure medkit pickup is working as well. (Discovered: 2025-04-09) (Completed via Movement/Pickup Refactor 2025-04-09)
    *   [x] Review/Tune AI Ammo Seeking threshold and proactive logic. (Discovered: 2025-04-09) (Threshold adjusted manually 2025-04-09)


4.  **Unit Testing:** (Started: 2025-04-08)
    *   [x] Create `tests/ai.test.js`. (Completed: 2025-04-08)
    *   [x] Fix failing tests for `handleExploringState` by adjusting test setup. (Completed: 2025-04-08)
    *   [ ] Add tests for initial AI state and properties.
    *   [x] Add tests for state transitions based on various conditions (Started with Exploring state). (Started: 2025-04-08)
    *   [x] Add tests for resource pickup functionality (`handleSeekingResourcesState`, `performReevaluation`). (Completed: 2025-04-08)
    *   [x] Add tests for basic state actions (moving, fleeing) (Started with Exploring state default actions). (Started: 2025-04-08)
    *   [ ] Add unit tests for `calculateKnockbackDestination` helper function. (Added: 2025-04-09)
    *   [ ] Expand unit tests for AI state handlers (Engaging, Fleeing, etc.). (Added: 2025-04-09)


 ### Ongoing / Refinement

 *   [ ] Add more unit tests as code is refactored/added.
 *   [ ] Fix commented-out unit tests in tests/ai.test.js for handleSeekingResourcesState. (Added: 2025-04-08)
 *   [ ] Review AI state handler modules (`state_*.js`) for length and complexity; refactor if needed. (Added: 2025-04-09)
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
*   [x] Further refine AI risk assessment in ENGAGE state (e.g., consider safer alternative moves, avoid known threats, prefer maintaining LOS). (Completed: 2025-04-09)
*   [ ] Refactor movement safety check (avoiding known threats) into a reusable helper function in `ai_helpers.js` and update `handleFleeingState` and `handleEngagingEnemyState` to use it. (Discovered: 2025-04-09)
*   [ ] Refine AI target selection logic (consider HP, randomness, etc.). (Discovered: 2025-04-08)
*   [ ] Investigate creating a shared `canMoveTo(unit, targetRow, targetCol)` utility function for player/AI move validation. (Discovered: 2025-04-08)
*   [ ] Refactor resource handling (AI & Player) using a configuration object in config.js. (Discovered: 2025-04-08)
*   [x] Refactor duplicated enemy creation logic from initializeGame/resetGame into createAndPlaceEnemy helper function. (Completed: 2025-04-08)
*   [x] Add unit tests for createAndPlaceEnemy helper function in tests/main.test.js. (Completed: 2025-04-08)

---
## Completed Tasks
*(Move completed task lines here)*
4.  **Code Cleanup & Refactoring:** (Completed: 2025-04-08)
    *   [x] Review all `.js` files for redundant comments.
    *   [x] Identify and extract duplicated code into reusable helper functions (created `js/utils.js` with `isCellOccupied`, `traceLine`).
    *   [x] Break down long/complex functions (refactored `executeAiTurns` into helpers).
    *   [x] Ensure consistent naming conventions and formatting (addressed during refactoring).
    *   [x] **Develop unit tests for refactored code to verify functionality** (added tests for `isCellOccupied`, `traceLine`).
5.  **Establish Consistent Logging:** (Completed: 2025-04-08)
    *   [x] Define a logging convention (reviewed existing: `console.log` for load/debug, `console.warn` for non-critical, `console.error` for critical, `Game.logMessage` for UI).
    *   [x] Apply logging convention consistently (reviewed files, minor cleanup).
