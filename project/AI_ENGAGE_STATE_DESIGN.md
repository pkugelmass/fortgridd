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
        *   Use `checkLineOfSight(enemy, target, enemy.detectionRange)` to verify the target is still within detection range and has a clear cardinal path.
        *   If `checkLineOfSight` returns `false`:
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
            *   `checkLineOfSight(enemy, target, Config.RANGED_ATTACK_RANGE)` returns `true`
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
    *   **Check 6: Out of Ammo?**
        *   If `enemy.ammo <= 0`:
            *   Call `performReevaluation(enemy)`.
            *   Return.
    *   **Check 7: Consider Moving Towards Target:**
        *   If none of the above actions/transitions occurred (i.e., target is valid, visible, AI is healthy enough, has ammo, but couldn't attack):
            *   **A. Identify Potential Move:** Determine the best adjacent square (`intendedMove`) to move towards the target (using logic similar to `moveTowards` but without executing the move yet). If no valid move gets closer or sideways, skip to fallback wait (Step 6).
            *   **B. Risk Assessment:**
                *   Check if `target` can attack the `intendedMove` square:
                    *   `canTargetAttack = (target.ammo > 0)` (Assuming target needs ammo to attack; adjust if melee threat is relevant)
                    *   `targetHasLOS = checkLineOfSight(target, intendedMove, Config.RANGED_ATTACK_RANGE)` (Check if target has LOS to the destination within *its* attack range)
                *   `isRisky = canTargetAttack && targetHasLOS`
            *   **C. Risk Aversion (Probabilistic Hesitation):**
                *   If `isRisky`:
                    *   Generate random number `rand = Math.random()`.
                    *   If `rand < Config.AI_ENGAGE_RISK_AVERSION_CHANCE` (e.g., 0.3):
                        *   Log "Enemy X hesitates due to risk at (intendedMove.row, intendedMove.col)."
                        *   Return (effectively waits).
                    *   *(Requires adding `AI_ENGAGE_RISK_AVERSION_CHANCE` constant to `config.js`)*.
            *   **D. Execute Move:**
                *   If the move wasn't deemed too risky OR the AI decided to take the risk:
                    *   Execute the move to `intendedMove`: `enemy.row = intendedMove.row`, `enemy.col = intendedMove.col`.
                    *   Log the move (e.g., "Enemy X moves towards target Y to (r,c).").
                    *   Return.

6.  **Default/Wait (Fallback):**
    *   If somehow none of the above conditions resulted in an action or state change (e.g., couldn't identify a move towards target in step 5A, or AI hesitated in 5C and returned):
        *   Log a "fallback wait" action using `Game.logMessage`.
        *   Return.

**Future Enhancements:**
*   Refine Risk Assessment: Consider target's health, AI's health, relative positions more deeply.
*   Alternative Moves: If hesitation occurs, actively look for a *different*, potentially safer move instead of just waiting.
