# FortGridd Handoff Document (2025-04-10 - Start of Session 3)

*(Purpose: To capture the immediate next steps and context for the next work session.)*

## Project Context

*   **Project:** FortGridd - Turn-based tactical survival game.
*   **Current Branch:** `develop 2`
*   **Last Major Actions:**
    *   Completed initial test triage following AI FSM implementation.
    *   Cleaned up `project/TASKS.md` by moving completed items to `project/COMPLETED_TASKS.md`.
    *   Refactored `js/ai/ai_helpers.js` into smaller, categorized modules: `ai_perception.js`, `ai_movement.js`, `ai_actions.js`, `ai_map_utils.js`.
    *   Refactored movement safety check into `isMoveSafe` in `ai_movement.js`.
    *   Refactored `tests/ai.test.js` into smaller files.
    *   Reviewed all JS modules for length (none exceeded guideline).
    *   Systematically reviewed all JS modules for refactoring opportunities and added detailed sub-tasks to `project/TASKS.md`.

## Next Task & Plan: Implement Major Refactoring

Following the review, the next major step is to implement the identified refactoring opportunities, focusing primarily on reducing global dependencies and improving modularity.

We are in the midst of this refactoring plan. I asked the AI to write a full report on what the plan is, where we are, and what needs to be done to complete the refactor. Here is its report: 


1. Overall Refactoring Plan (from project/handoff.md)

The primary goal is a major refactoring to reduce global dependencies, improve modularity, and enhance testability before adding new features. The plan is divided into four phases:

Phase 1: Establish Core Game State & Decouple Main Logic: Create a central GameState object and refactor js/game.js, js/main.js (initialization/reset), and js/player.js to use it, removing global state variables like player, enemies, mapData.
Phase 2: Decouple Input & Drawing: Refactor js/input.js (handleKeyDown) to return action intents instead of executing logic directly. Refactor js/drawing.js functions to accept gameState or its properties. Update the main loop/event listeners in js/main.js to handle this new flow.
Phase 3: Refactor AI & Utilities: Modify AI helper functions (js/ai/*.js except states), AI state handlers (js/ai/state_*.js), and utility functions (js/utils.js, js/map.js) to accept gameState and other dependencies as parameters, removing global access.
Phase 4: Extract Complex/Duplicated Logic: Centralize logic like knockback, extract complex shooting/AI movement logic into dedicated helper functions.
2. Current Progress (Completed Steps)

We have successfully completed:

Phase 1:
Created js/gameState.js defining the GameState class.
Refactored js/game.js functions (applyStormDamage, logMessage, etc.) to accept and use a gameState parameter.
Refactored js/main.js (initializeGame, resetGame, createAndPlaceEnemy, updateStatusBar, redrawCanvas, resizeAndDraw) to create, manage, and pass the gameState object.
Refactored js/player.js to remove the global player object definition.
Phase 2:
Refactored js/input.js (handleKeyDown) to return action intent strings (e.g., 'MOVE_UP', 'HEAL').
Refactored js/drawing.js functions (drawMapCells, drawPlayer, drawEnemies, drawUI) to accept gameState or relevant parts.
Updated the keydown listener in js/main.js to call handleKeyDown and pass the intent to a (currently basic) processPlayerTurn function.
Phase 3:
Refactored AI helpers (js/ai/ai_actions.js, js/ai/ai_map_utils.js, js/ai/ai_movement.js, js/ai/ai_perception.js) to accept and use gameState.
Refactored all AI state handlers (js/ai/state_*.js) to accept and use gameState.
Refactored utilities in js/utils.js (checkAndPickupResourceAt, updateUnitPosition) to accept and use gameState. Moved findStartPosition here.
Refactored js/map.js (createMapData, countWallNeighbours) to accept a configuration object instead of using global constants.
Phase 4 (Partial):
Centralized Knockback: Moved calculateKnockbackDestination to js/utils.js, created applyKnockback in js/utils.js (handling calculation, validation, and position update), and updated js/ai/state_engaging_enemy.js to use applyKnockback.
Extracted Shooting LoS: Extracted the Bresenham algorithm into traceLine in js/utils.js and refactored hasClearLineOfSight in js/ai/ai_perception.js to use traceLine.
Corrected script load order in index.html.
3. Current Step & Problem

We are currently in the middle of the Integration Step: "Integrate Refactoring & Restore Basic Functionality". Specifically, we were working on implementing the player action logic within the processPlayerTurn function in js/main.js.

The problem encountered was that my attempts to use the replace_in_file tool to modify js/main.js failed twice in a row. This was due to the SEARCH blocks in my tool use being too large or not matching the exact current content of the file (potentially due to subtle formatting differences or errors in constructing the block). The tool requires an exact match to function correctly.

4. Next Steps (Detailed for Handoff)

To get back on track and complete the integration:

Retry js/main.js Modification: Use the replace_in_file tool again, but this time with smaller, more precise SEARCH blocks targeting only the sections that need changing:
Target 1: Replace the placeholder processPlayerTurn function definition with the fully implemented version containing the switch statement to handle all player action intents (MOVE_*, WAIT, HEAL, SHOOT_*), calling appropriate helper functions (applyKnockback, updateUnitPosition, traceLine), modifying gameState, logging messages via Game.logMessage, and setting the turnEnded flag.
Target 2: Update the createMapData() call within initializeGame (and potentially resetGame if not already done) to construct and pass the mapConfig object derived from global constants, as required by the refactored createMapData function.
(If replace_in_file fails again after careful targeting, the fallback is to use write_to_file with the complete intended content of js/main.js, incorporating the implemented processPlayerTurn and the updated createMapData call.)
Refactor AI Turn Execution:
Read js/ai.js.
Modify performReevaluation to accept (enemy, gameState) and pass gameState to any helpers it calls (like findNearestVisibleEnemy, findNearbyResource).
Modify executeAiTurns (or create runAiTurns if it doesn't exist) to:
Accept gameState.
Get the list of active enemies from gameState.enemies.
Loop through each active enemy.
Call performReevaluation(enemy, gameState).
Call the appropriate state handler function (e.g., handleExploringState(enemy, gameState)) based on enemy.state.
Call Game.endAiTurn(gameState) after all AI turns are processed.
Update the call in js/main.js (inside processPlayerTurn's post-action block) to correctly call this refactored AI turn execution function (e.g., runAiTurns(gameState)).
Testing: After completing steps 1 & 2, the basic game loop should be functional again. Test player movement, waiting, healing, shooting, and basic AI reactions to ensure the core mechanics work with the new gameState structure. Debug any errors arising from the refactoring.
Continue Phase 4: Once basic functionality is restored and validated:
Extract complex AI movement strategies (LOS breaking, safe fleeing) from state handlers into dedicated helpers in js/ai/ai_movement.js.
Simplify createAndPlaceEnemy further if needed (e.g., separate position finding completely).
Address TODOs & Cleanup: Work through remaining tasks in project/TASKS.md, such as standardizing console logging and adding more unit tests.
To proceed with Step 1 (Retry js/main.js Modification), please switch back to