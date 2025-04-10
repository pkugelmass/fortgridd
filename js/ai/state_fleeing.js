console.log("state_fleeing.js loaded");

/**
 * Handles AI logic when in the FLEEING state, using gameState.
 * Priority: Target validation -> Threat visibility -> Cornered check (attack/wait) -> Break LOS -> Move away safely -> Wait.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action was taken (move, attack, wait), false if re-evaluation is needed.
 */
function handleFleeingState(enemy, gameState) {
    // Check dependencies
    if (!enemy || !gameState || !gameState.player || !gameState.enemies || !gameState.mapData || typeof Game === 'undefined' || typeof Game.logMessage !== 'function' || typeof performReevaluation !== 'function' || typeof hasClearLineOfSight !== 'function' || typeof hasClearCardinalLineOfSight !== 'function' || typeof getValidMoves !== 'function' || typeof isMoveSafe !== 'function' || typeof updateUnitPosition !== 'function') {
        console.error("handleFleeingState: Missing enemy, gameState, or required functions.");
        return false; // Cannot act without dependencies
    }
    const enemyId = enemy.id || 'Unknown Enemy';
    const { player, enemies, mapData } = gameState; // Destructure

    // --- 1. Target Validation ---
    const threatObject = enemy.targetEnemy; // This should be the actual object (player or an enemy from gameState.enemies)
    if (!threatObject || threatObject.hp <= 0) {
        // Game.logMessage(`Enemy ${enemyId} fleeing target invalid/gone. Re-evaluating.`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
        enemy.targetEnemy = null;
        performReevaluation(enemy, gameState); // Pass gameState
        return false; // Needs re-evaluation
    }
    const threatId = threatObject === player ? 'Player' : threatObject.id;

    // --- 2. Threat Visibility Check ---
    // Assume AI_RANGE_MAX is global for now
    if (!hasClearLineOfSight(enemy, threatObject, enemy.detectionRange || AI_RANGE_MAX, gameState)) { // Pass gameState
        // Game.logMessage(`Enemy ${enemyId} broke LOS with ${threatId}. Re-evaluating.`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
        enemy.targetEnemy = null; // Successfully evaded
        performReevaluation(enemy, gameState); // Pass gameState
        return false; // Needs re-evaluation
    }

    // --- 3. Evaluate Potential Moves & Handle Being Cornered ---
    const possibleMoves = getValidMoves(enemy, gameState); // Pass gameState

    if (possibleMoves.length === 0) {
        // Cornered! Check if we can attack the threat from here.
        const dist = Math.abs(threatObject.row - enemy.row) + Math.abs(threatObject.col - enemy.col);
        let canAttack = false;
        let attackType = null;
        // Assume RANGED_ATTACK_RANGE, AI_ATTACK_DAMAGE are global

        // Check Ranged Attack
        if (dist > 0 && dist <= RANGED_ATTACK_RANGE && enemy.resources.ammo > 0 && hasClearCardinalLineOfSight(enemy, threatObject, RANGED_ATTACK_RANGE, gameState)) { // Pass gameState
            canAttack = true;
            attackType = 'ranged';
        }
        // Check Melee Attack
        else if (dist === 1) {
            canAttack = true;
            attackType = 'melee';
        }

        if (canAttack) {
            const damage = AI_ATTACK_DAMAGE;
            threatObject.hp -= damage; // Modify target HP directly
            let logMsg = `Cornered Enemy ${enemyId} desperately `;
            if (attackType === 'ranged') {
                enemy.resources.ammo--; // Modify self ammo
                logMsg += `shoots ${threatId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})`;
            } else {
                logMsg += `melees ${threatId} for ${damage} damage.`;
            }
            Game.logMessage(logMsg, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState

            // Knockback is not applied when cornered? Or should it be? Let's assume not for now.

            if (threatObject.hp <= 0) {
                // Game.logMessage(`Enemy ${enemyId} defeated ${threatId} while cornered!`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
                enemy.targetEnemy = null;
                performReevaluation(enemy, gameState); // Pass gameState
                return false; // Needs re-evaluation after kill
            }
            return true; // Attack action complete
        } else {
            // Cannot attack, truly cornered
            Game.logMessage(`Enemy ${enemyId} is cornered and waits!`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
            return true; // Wait action complete
        }
    }

    // --- 4. Prioritize Moves that Break LOS (If Moves Possible) ---
    let losBreakingMoves = [];
    for (const move of possibleMoves) {
        // Pass gameState to hasClearLineOfSight
        const threatHasLOSToMove = hasClearLineOfSight(threatObject, move, threatObject.detectionRange || AI_RANGE_MAX, gameState);
        if (!threatHasLOSToMove) {
            losBreakingMoves.push(move);
        }
    }

    if (losBreakingMoves.length > 0) {
        let bestMove = null;
        let maxDist = -1;
        for (const move of losBreakingMoves) {
            const distFromThreat = Math.abs(move.row - threatObject.row) + Math.abs(move.col - threatObject.col);
            if (distFromThreat > maxDist) {
                maxDist = distFromThreat;
                bestMove = move;
            }
        }
        if (bestMove) { // Ensure a best move was actually found
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) flees towards cover at (${bestMove.row},${bestMove.col}) to break LOS from ${threatId}.`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
            // Pass gameState to updateUnitPosition (anticipating refactor)
            updateUnitPosition(enemy, bestMove.row, bestMove.col, gameState);
            return true; // Action taken
        }
        // If bestMove is somehow null, fall through to next strategy
    }

    // --- 5. Fallback: Move Directly Away Safely (If LOS Cannot Be Broken) ---
    let bestAwayMoves = [];
    let maxDistFromThreat = -1;

    for (const move of possibleMoves) {
        const distFromThreat = Math.abs(move.row - threatObject.row) + Math.abs(move.col - threatObject.col);
        if (distFromThreat > maxDistFromThreat) {
            maxDistFromThreat = distFromThreat;
        }
    }

    for (const move of possibleMoves) {
        const distFromThreat = Math.abs(move.row - threatObject.row) + Math.abs(move.col - threatObject.col);
        if (distFromThreat === maxDistFromThreat) {
            bestAwayMoves.push(move);
        }
    }

    // Filter for safety using gameState
    const safeAwayMoves = bestAwayMoves.filter(move => isMoveSafe(enemy, move.row, move.col, gameState)); // Pass gameState

    if (safeAwayMoves.length > 0) {
        const chosenMove = safeAwayMoves[Math.floor(Math.random() * safeAwayMoves.length)];
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) flees away from ${threatId} to safe spot (${chosenMove.row},${chosenMove.col}).`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
        // Pass gameState to updateUnitPosition (anticipating refactor)
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col, gameState);
        return true; // Action taken
    } else {
        // No safe moves away found, must wait
        Game.logMessage(`Enemy ${enemyId} is blocked/unsafe while fleeing and waits.`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
        return true; // Wait action complete
    }
}
