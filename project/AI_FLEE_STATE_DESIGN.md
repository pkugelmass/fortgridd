# AI Fleeing State (`handleFleeingState`) Design

This document outlines the proposed logic for the `handleFleeingState(enemy)` function in `js/ai/state_fleeing.js`. The primary goal is to break line of sight (LOS) with the threat (`enemy.targetEnemy`), falling back to maximizing distance if LOS cannot be broken immediately.

**Assumptions:**
*   The function receives the `enemy` object, which has a `targetEnemy` property indicating the threat.
*   It can access global state/objects like `player`, `enemies`, `mapData`, `Config`, and `Game`.
*   Helper functions `checkLineOfSight`, `performReevaluation`, and `getValidMoves` exist in `js/ai/ai_helpers.js`.

**Logic Flow (Priority Order):**

1.  **Target Validation:**
    *   Get the threat: `threat = enemy.targetEnemy`.
    *   **Check 1: Threat Invalid?**
        *   If `threat` is null, undefined, or `threat.hp <= 0`:
            *   Clear the enemy's target: `enemy.targetEnemy = null`.
            *   Call `performReevaluation(enemy)` to determine the next best state (likely `EXPLORING` if no other threats/needs).
            *   Return (end turn).
    *   **Check 2: Threat Still Visible?**
        *   Use `hasClearLineOfSight(enemy, threat, enemy.detectionRange)` (using the Bresenham algorithm helper) to see if the fleeing AI can still perceive the threat.
        *   If `hasClearLineOfSight` returns `false`:
            *   The AI has successfully evaded for now.
            *   Clear `enemy.targetEnemy = null`.
            *   Call `performReevaluation(enemy)`.
            *   Return.

2.  **Evaluate Potential Moves & Handle Being Cornered:**
    *   Get all valid adjacent moves: `possibleMoves = getValidMoves(enemy)`.
    *   **If `possibleMoves.length === 0` (Cornered):**
        *   **Check Attack Capability:** Determine if the AI can attack `enemy.targetEnemy` from its current position.
            *   Calculate distance (`dist`).
            *   Check Ranged: `dist <= RANGED_ATTACK_RANGE`, `enemy.resources.ammo > 0`, and `hasClearCardinalLineOfSight(enemy, enemy.targetEnemy, RANGED_ATTACK_RANGE)`?
            *   Check Melee: `dist === 1`?
        *   **If Attack Possible:**
            *   Perform the highest priority attack (Ranged > Melee).
            *   Log the desperate attack.
            *   Handle target defeat (if `target.hp <= 0`, clear target, `performReevaluation`, return `false`).
            *   If target survives, return `true` (attack action complete).
        *   **If Attack Not Possible:**
            *   Log "Enemy X is cornered and waits!".
            *   Return `true` (wait action complete).
    *   *(If not cornered, proceed to step 3)*

3.  **Prioritize Moves that Break LOS (If Moves Possible):**
    *   Create an empty list: `losBreakingMoves = []`.
    *   For each `move` in `possibleMoves`:
        *   Check if the threat would have LOS to the `move` position using the correct helper:
            `threatHasLOS = hasClearLineOfSight(enemy.targetEnemy, move, enemy.targetEnemy.detectionRange)`
        *   If `threatHasLOS` is `false`:
            *   Add `move` to `losBreakingMoves`.
    *   **If LOS-breaking moves exist:**
        *   Select the best LOS-breaking move (e.g., the one maximizing Manhattan distance from the `threat`). Let this be `chosenMove`.
        *   Execute the move: `enemy.row = chosenMove.row`, `enemy.col = chosenMove.col`.
        *   Log the move (e.g., "Enemy X flees towards cover at (r,c) to break LOS from Threat Y.").
        *   Return `true` (action taken).

4.  **Fallback: Move Directly Away Safely (If LOS Cannot Be Broken):**
    *   If `losBreakingMoves` is empty:
        *   Find all moves in `possibleMoves` that maximize the Manhattan distance from the `threat`. Store these potential best moves.
        *   **Filter for Safety:** Create a new list `safeAwayMoves`. Iterate through the potential best moves. For each `move`, check if it lands adjacent to any *other* enemy (excluding self and the current `threat`). If the move is not adjacent to another enemy, add it to `safeAwayMoves`.
        *   **If `safeAwayMoves` exist:**
            *   Select the best move from `safeAwayMoves` (if multiple are equally far and safe, pick one randomly or the first). Let this be `chosenMove`.
            *   Execute the move: `enemy.row = chosenMove.row`, `enemy.col = chosenMove.col`.
            *   Log the move (e.g., "Enemy X flees away from Threat Y to (r,c).").
            *   Return `true` (action taken).
        *   **Else (no safe moves away found):**
            *   Log "Enemy X is blocked/unsafe while fleeing and waits."
            *   Return `true` (wait action complete).

**Helper Function Considerations:**
*   Might need a `moveAwayFrom(unit, targetRow, targetCol)` helper, similar to `moveTowards` but maximizing distance. Alternatively, the logic can be implemented directly within this state handler.

**Future Enhancements:**
*   Consider fleeing towards known medkits if health is critical.
*   More sophisticated cover evaluation (not just breaking LOS).
*   Transitioning to `ENGAGING_ENEMY` if cornered.
