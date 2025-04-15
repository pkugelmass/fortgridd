/**
 * Validates if the enemy should continue fleeing from its current target.
 * Checks target existence, health, and if LOS has been broken.
 * @param {Enemy} enemy - The enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {{isValid: boolean, threatObject: object|null, needsReevaluation: boolean, reason: string|null}}
 */
function _validateFleeState(enemy, gameState) {
    const { player, enemies } = gameState;
    const enemyId = enemy.id || 'Unknown Enemy';

    // 1. Target Validation
    const currentThreatObject = enemy.targetEnemy;
    if (!currentThreatObject || currentThreatObject.hp <= 0) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} fleeing target invalid/gone. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        enemy.targetEnemy = null;
        return { isValid: false, threatObject: null, needsReevaluation: true, reason: 'no_target' };
    }
    const threatId = currentThreatObject === player ? 'Player' : currentThreatObject.id;

    // 2. Threat Visibility Check (Did we escape?)
    if (typeof hasClearLineOfSight === 'function' && !hasClearLineOfSight(enemy, currentThreatObject, enemy.detectionRange || window.AI_RANGE_MAX, gameState)) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} broke LOS with ${threatId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        enemy.targetEnemy = null;
        return { isValid: false, threatObject: null, needsReevaluation: true, reason: 'escaped' };
    }

    // If checks pass, continue fleeing
    return { isValid: true, threatObject: currentThreatObject, needsReevaluation: false, reason: null };
}

/**
 * Determines and executes the best flee move for an enemy that is not cornered.
 * Prioritizes moves that break Line of Sight (LOS) with the threat,
 * then moves that maximize distance from the threat safely.
 * @param {Enemy} enemy - The fleeing enemy instance.
 * @param {object} threatObject - The object the enemy is fleeing from.
 * @param {Array<object>} possibleMoves - Array of valid moves {row, col}.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - Always returns true, as either moving or waiting is considered a completed action.
 */
async function _determineAndExecuteFleeMove(enemy, threatObject, possibleMoves, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const threatId = threatObject === gameState.player ? 'Player' : threatObject.id;

    // Prioritize Moves that Break LOS
    let losBreakingMoves = [];
    for (const move of possibleMoves) {
        const threatHasLOSToMove = typeof hasClearLineOfSight === 'function' && hasClearLineOfSight(threatObject, move, threatObject.detectionRange || window.AI_RANGE_MAX, gameState);
        if (!threatHasLOSToMove) {
            losBreakingMoves.push(move);
        }
    }

    if (losBreakingMoves.length > 0) {
        // Find the LOS-breaking move furthest from the threat
        let bestMove = null;
        let maxDist = -1;
        for (const move of losBreakingMoves) {
            const distFromThreat = Math.abs(move.row - threatObject.row) + Math.abs(move.col - threatObject.col);
            if (typeof isMoveSafe === 'function' && isMoveSafe(enemy, move.row, move.col, gameState) && distFromThreat > maxDist) {
                maxDist = distFromThreat;
                bestMove = move;
            }
        }
        if (bestMove) {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) flees towards cover at (${bestMove.row},${bestMove.col}) to break LOS from ${threatId}.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
            }
            if (typeof updateUnitPosition === 'function') {
                updateUnitPosition(enemy, bestMove.row, bestMove.col, gameState);
            }
            return true;
        }
    }

    // Fallback: Move Directly Away Safely
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
    const safeAwayMoves = bestAwayMoves.filter(move => typeof isMoveSafe === 'function' ? isMoveSafe(enemy, move.row, move.col, gameState) : true);

    if (safeAwayMoves.length > 0) {
        const chosenMove = safeAwayMoves[Math.floor(Math.random() * safeAwayMoves.length)];
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) flees away from ${threatId} to safe spot (${chosenMove.row},${chosenMove.col}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        if (typeof updateUnitPosition === 'function') {
            updateUnitPosition(enemy, chosenMove.row, chosenMove.col, gameState);
        }
        return true;
    } else {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} is blocked/unsafe while fleeing and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        return true;
    }
}

/**
 * Handles the logic when a fleeing enemy has no possible moves (is cornered).
 * Attempts a desperate attack if possible, otherwise waits.
 * @param {Enemy} enemy - The cornered enemy instance.
 * @param {object} threatObject - The object the enemy is fleeing from.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action (attack/wait) was taken, false if the threat was defeated.
 */
function _handleCorneredFleeingEnemy(enemy, threatObject, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const threatId = threatObject === gameState.player ? 'Player' : threatObject.id;

    // Cornered! Check if we can attack the threat from here.
    const dist = Math.abs(threatObject.row - enemy.row) + Math.abs(threatObject.col - enemy.col);
    let canAttack = false;
    let attackType = null;

    // Check Ranged Attack
    if (
        dist > 0 &&
        dist <= window.RANGED_ATTACK_RANGE &&
        enemy.resources.ammo > 0 &&
        typeof hasClearCardinalLineOfSight === 'function' &&
        hasClearCardinalLineOfSight(enemy, threatObject, window.RANGED_ATTACK_RANGE, gameState)
    ) {
        canAttack = true;
        attackType = 'ranged';
    }
    // Check Melee Attack
    else if (dist === 1) {
        canAttack = true;
        attackType = 'melee';
    }

    if (canAttack) {
        const damage = window.AI_ATTACK_DAMAGE;
        threatObject.hp -= damage;
        let logMsg = `Cornered Enemy ${enemyId} desperately `;
        if (attackType === 'ranged') {
            enemy.resources.ammo--;
            logMsg += `shoots ${threatId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})`;
        } else {
            logMsg += `melees ${threatId} for ${damage} damage.`;
        }
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(logMsg, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        if (threatObject.hp <= 0) {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage(`Enemy ${enemyId} defeated ${threatId} while cornered! Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            }
            enemy.targetEnemy = null;
            return false;
        }
        return true;
    } else {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} is cornered and waits!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        return true;
    }
}

/**
 * Handles AI logic when in the FLEEING state. Orchestrates validation, cornered checks, and movement.
 * @param {Enemy} enemy - The enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - True if an action was taken (move, attack, wait), false if re-evaluation is needed.
 */
async function handleFleeingState(enemy, gameState) {
    if (
        !enemy ||
        !gameState ||
        !gameState.player ||
        !gameState.enemies ||
        !gameState.mapData ||
        typeof Game === 'undefined' ||
        typeof Game.logMessage !== 'function'
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("handleFleeingState: Missing critical data.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }
    const enemyId = enemy.id || 'Unknown Enemy';

    // 1. Validate State
    const validationResult = _validateFleeState(enemy, gameState);
    if (!validationResult.isValid) {
        return false;
    }
    const threatObject = validationResult.threatObject;

    // 2. Evaluate Potential Moves & Handle Being Cornered
    const possibleMoves = typeof getValidMoves === 'function' ? getValidMoves(enemy, gameState) : [];

    if (possibleMoves.length === 0) {
        // Cornered! Delegate to helper.
        return _handleCorneredFleeingEnemy(enemy, threatObject, gameState);
    }

    // 3. Determine Flee Move (If Not Cornered)
    return await _determineAndExecuteFleeMove(enemy, threatObject, possibleMoves, gameState);
}

// Attach to global scope for Enemy FSM
window.handleFleeingState = handleFleeingState;