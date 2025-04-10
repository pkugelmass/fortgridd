# AI Engaging Enemy State (`handleEngagingEnemyState`) Design

This document outlines the proposed logic for the `handleEngagingEnemyState(enemy)` function in `js/ai/state_engaging_enemy.js`.

**Assumptions:**
*   The function receives the `enemy` object as input.
*   It can access global state/objects like `player`, `enemies`, `mapData`, `Config`, and `Game`.
*   Helper functions `checkLineOfSight` and `performReevaluation` exist in `js/ai/ai_helpers.js`.
*   `performReevaluation` handles the logic for deciding the next state when the current objective is invalid.

**Logic Flow (Priority Order):**

1.  **Target Validation (Existence & Health):**
    *   Get the current target: `target = enemy.targetEnemy`.
    *   **Check 1: Target Invalid?**
        *   If `target` is null, undefined, or `target.hp <= 0`:
            *   Clear the enemy's target: `enemy.targetEnemy = null`.
            *   Call `performReevaluation(enemy)` to determine the next best state.
            *   Return (end turn for this enemy).

2.  **Line of Sight (LOS) Check:**
    *   **Check 2: Target Visible?**
        *   Use `hasClearLineOfSight(enemy, target, enemy.detectionRange)` (Bresenham) to verify the target is still generally visible within range.
        *   If `hasClearLineOfSight` returns `false`:
            *   Clear the enemy's target: `enemy.targetEnemy = null`.
            *   Call `performReevaluation(enemy)`.
            *   *(Note: This check failing is the primary way an AI "gives up" pursuit if LOS is broken and the target isn't immediately reacquired via `performReevaluation`)*.
            *   Return.

3.  **Health Check (Self-Preservation):**
    *   **Check 3: Flee Condition Met?**
        *   If `enemy.health < enemy.maxHp * Config.AI_FLEE_HEALTH_THRESHOLD`:
            *   Set state: `enemy.state = Config.AI_STATE_FLEEING`.
            *   *(Target enemy remains the same, as `handleFleeingState` needs to know who to flee from)*.
            *   Log the transition (e.g., "Enemy X health low, fleeing!").
            *   Return.

4.  **Attack Logic:**
    *   Calculate distance: `dist = Math.abs(target.row - enemy.row) + Math.abs(target.col - enemy.col)`.
    *   **Check 4: Ranged Attack Possible?**
        *   Check conditions:
            *   `dist > 0` (not self)
            *   `dist <= Config.RANGED_ATTACK_RANGE`
            *   `enemy.ammo > 0`
            *   `hasClearCardinalLineOfSight(enemy, target, Config.RANGED_ATTACK_RANGE)` returns `true` (Use cardinal check for shooting)
        *   If all conditions met:
            *   Perform attack: `target.hp -= Config.AI_ATTACK_DAMAGE`.
            *   Decrement ammo: `enemy.ammo--`.
            *   Log the ranged attack using `Game.logMessage`.
            *   **Check if target defeated:** If `target.hp <= 0`:
                *   Log target defeat.
                *   Clear `enemy.targetEnemy = null`.
                *   Call `performReevaluation(enemy)`.
            *   Return (action complete).
    *   **Check 5: Melee Attack Possible?**
        *   Check condition: `dist === 1` (adjacent).
        *   If adjacent:
            *   Perform attack: `target.hp -= Config.AI_ATTACK_DAMAGE`.
            *   Log the melee attack using `Game.logMessage`.
            *   **Check if target defeated:** If `target.hp <= 0`:
                *   Log target defeat.
                *   Clear `enemy.targetEnemy = null`.
                *   Call `performReevaluation(enemy)`.
            *   Return (action complete).

5.  **Movement Logic (If No Attack Occurred):**
    *   *(Pre-condition: Target valid, visible, AI healthy, AI has ammo, but no attack was possible)*
    *   **A. Get Valid Moves:** `possibleMoves = getValidMoves(enemy)`. If empty, skip to Step 6 (Wait).
    *   **B. Identify Best Moves Towards Target:**
        *   Find moves in `possibleMoves` that get closer to `target` (Manhattan distance). Store these (`closerMoves`).
        *   Find moves in `possibleMoves` that maintain the same distance (`sidewaysMoves`).
        *   Potential candidates are `closerMoves` first, then `sidewaysMoves`.
    *   **C. Filter for Safety (Avoid *Known* Other Enemies):**
        *   Identify `knownOtherThreats`: Create a list of active enemies (excluding self and `target`) that the current AI has `hasClearLineOfSight` to within its `detectionRange`.
        *   Create `safeCandidateMoves`.
        *   Iterate through potential candidate moves (closer, then sideways). For each `move`:
            *   Check if `move` is adjacent to any enemy listed in `knownOtherThreats`.
            *   If the move is *not* adjacent to any known other threat, add it to `safeCandidateMoves`.
    *   **D. Filter for LOS Maintenance (Prefer Keeping Sight):**
        *   Create `losMaintainingMoves`.
        *   Iterate through `safeCandidateMoves`. For each `move`:
            *   Check if `hasClearLineOfSight(enemy, target, enemy.detectionRange)` would still be true *from* the `move` position.
            *   If LOS is maintained, add `move` to `losMaintainingMoves`.
        *   If `losMaintainingMoves` is not empty, these are now the primary candidates. Otherwise, fall back to using all `safeCandidateMoves`.
    *   **E. Select Final Candidate Move:**
        *   From the chosen list (`losMaintainingMoves` or `safeCandidateMoves`):
            *   If multiple candidates exist, prioritize closer moves over sideways moves.
            *   If still multiple candidates (e.g., two equally close safe moves, one maintaining LOS, one not), prioritize the one maintaining LOS.
            *   If still multiple (e.g., two equally close safe moves both maintaining LOS), pick one randomly.
        *   Let the result be `chosenMove`. If no suitable move is found after filtering, `chosenMove` will be null.
    *   **F. Risk Assessment (On Chosen Move):**
        *   If `chosenMove` is not null:
            *   Check if `target` can attack the `chosenMove` square:
                *   `canTargetAttack = (target.resources.ammo > 0)` (Check target ammo)
                *   `targetHasLOSToMove = hasClearLineOfSight(target, chosenMove, Config.RANGED_ATTACK_RANGE)`
            *   `isRisky = canTargetAttack && targetHasLOSToMove`
    *   **G. Risk Aversion (Probabilistic Hesitation):**
        *   If `isRisky`:
            *   Generate `rand = Math.random()`.
            *   If `rand < Config.AI_ENGAGE_RISK_AVERSION_CHANCE`:
                *   Log hesitation.
                *   Return `true` (effectively waits).
    *   **H. Execute Move:**
        *   If `chosenMove` is not null AND (move is not risky OR risk was accepted):
            *   Execute the move: `enemy.row = chosenMove.row`, `enemy.col = chosenMove.col`.
            *   Log the move.
            *   Return `true`.
        *   *(If chosenMove was null, or AI hesitated, fall through to Step 6)*

6.  **Default/Wait (Fallback):**
    *   If somehow none of the above conditions resulted in an action or state change (e.g., couldn't identify a move towards target in step 5A, or AI hesitated in 5C and returned):
        *   Log a "fallback wait" action using `Game.logMessage`.
        *   Return.

**Future Enhancements:**
*   Refine Risk Assessment: Consider target's health, AI's health, relative positions more deeply.
*   Alternative Moves: If hesitation occurs, actively look for a *different*, potentially safer move instead of just waiting.
