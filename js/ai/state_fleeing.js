// console.log("state_fleeing.js loaded"); // Removed module loaded log


/**
 * Validates if the enemy should continue fleeing from its current target.
 * Checks target existence, health, and if LOS has been broken.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {{isValid: boolean, threatObject: object|null, needsReevaluation: boolean, reason: string|null}}
 */
function _validateFleeState(enemy, gameState) {
    const { player, enemies } = gameState;
    const enemyId = enemy.id || 'Unknown Enemy';

    // --- 1. Target Validation ---
    const currentThreatObject = enemy.targetEnemy; // Should be the actual object
    if (!currentThreatObject || currentThreatObject.hp <= 0) {
        Game.logMessage(`Enemy ${enemyId} fleeing target invalid/gone. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.targetEnemy = null;
        // performReevaluation called by main loop
        return { isValid: false, threatObject: null, needsReevaluation: true, reason: 'no_target' };
    }
    const threatId = currentThreatObject === player ? 'Player' : currentThreatObject.id;

    // --- 2. Threat Visibility Check (Did we escape?) ---
    if (!hasClearLineOfSight(enemy, currentThreatObject, enemy.detectionRange || AI_RANGE_MAX, gameState)) {
        Game.logMessage(`Enemy ${enemyId} broke LOS with ${threatId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.targetEnemy = null; // Successfully evaded
        // performReevaluation called by main loop
        return { isValid: false, threatObject: null, needsReevaluation: true, reason: 'escaped' };
    }

    // If checks pass, continue fleeing
    return { isValid: true, threatObject: currentThreatObject, needsReevaluation: false, reason: null };
}


/**
 * Determines and executes the best flee move for an enemy that is not cornered.
 * Prioritizes moves that break Line of Sight (LOS) with the threat,
 * then moves that maximize distance from the threat safely.
 * @param {object} enemy - The fleeing enemy object.
 * @param {object} threatObject - The object the enemy is fleeing from.
 * @param {Array<object>} possibleMoves - Array of valid moves {row, col}.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - Always returns true, as either moving or waiting is considered a completed action.
 */
async function _determineAndExecuteFleeMove(enemy, threatObject, possibleMoves, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const threatId = threatObject === gameState.player ? 'Player' : threatObject.id;

    // --- Prioritize Moves that Break LOS ---
    let losBreakingMoves = [];
    for (const move of possibleMoves) {
        const threatHasLOSToMove = hasClearLineOfSight(threatObject, move, threatObject.detectionRange || AI_RANGE_MAX, gameState);
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
            // Also ensure the move itself is safe from other threats
            if (isMoveSafe(enemy, move.row, move.col, gameState) && distFromThreat > maxDist) {
                maxDist = distFromThreat;
                bestMove = move;
            }
        }
        if (bestMove) {
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) flees towards cover at (${bestMove.row},${bestMove.col}) to break LOS from ${threatId}.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
            if (typeof animationSystem !== "undefined" && typeof AnimationSystem.createMovementEffect === "function") {
                const moveEffect = AnimationSystem.createMovementEffect({
                    unit: enemy,
                    from: { row: enemy.row, col: enemy.col },
                    to: { row: bestMove.row, col: bestMove.col },
                    color: enemy.color || "#e53935",
                    duration: typeof MOVEMENT_ANIMATION_DURATION !== "undefined" ? MOVEMENT_ANIMATION_DURATION : 180,
                    easing: typeof ANIMATION_EASING !== "undefined" ? ANIMATION_EASING : "easeInOut"
                });
                animationSystem.addEffect(moveEffect);
                if (moveEffect.promise) {
                    await moveEffect.promise;
                }
            }
            updateUnitPosition(enemy, bestMove.row, bestMove.col, gameState);
            return true; // Action taken
        }
        // If no *safe* LOS-breaking move found, fall through
    }

    // --- Fallback: Move Directly Away Safely ---
    let bestAwayMoves = [];
    let maxDistFromThreat = -1;

    // Find the max distance achievable among all possible moves
    for (const move of possibleMoves) {
        const distFromThreat = Math.abs(move.row - threatObject.row) + Math.abs(move.col - threatObject.col);
        if (distFromThreat > maxDistFromThreat) {
            maxDistFromThreat = distFromThreat;
        }
    }

    // Collect all moves that achieve this max distance
    for (const move of possibleMoves) {
        const distFromThreat = Math.abs(move.row - threatObject.row) + Math.abs(move.col - threatObject.col);
        if (distFromThreat === maxDistFromThreat) {
            bestAwayMoves.push(move);
        }
    }

    // Filter these best-distance moves for safety
    const safeAwayMoves = bestAwayMoves.filter(move => isMoveSafe(enemy, move.row, move.col, gameState));

    if (safeAwayMoves.length > 0) {
        // Choose a random safe move among those that maximize distance
        const chosenMove = safeAwayMoves[Math.floor(Math.random() * safeAwayMoves.length)];
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) flees away from ${threatId} to safe spot (${chosenMove.row},${chosenMove.col}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        if (typeof animationSystem !== "undefined" && typeof AnimationSystem.createMovementEffect === "function") {
            const moveEffect = AnimationSystem.createMovementEffect({
                unit: enemy,
                from: { row: enemy.row, col: enemy.col },
                to: { row: chosenMove.row, col: chosenMove.col },
                color: enemy.color || "#e53935",
                duration: typeof MOVEMENT_ANIMATION_DURATION !== "undefined" ? MOVEMENT_ANIMATION_DURATION : 180,
                easing: typeof ANIMATION_EASING !== "undefined" ? ANIMATION_EASING : "easeInOut"
            });
            animationSystem.addEffect(moveEffect);
            if (moveEffect.promise) {
                await moveEffect.promise;
            }
        }
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col, gameState);
        return true; // Action taken
    } else {
        // No safe moves away found, must wait
        Game.logMessage(`Enemy ${enemyId} is blocked/unsafe while fleeing and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        return true; // Wait action complete
    }
}


/**
 * Handles the logic when a fleeing enemy has no possible moves (is cornered).
 * Attempts a desperate attack if possible, otherwise waits.
 * @param {object} enemy - The cornered enemy object.
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
    if (dist > 0 && dist <= RANGED_ATTACK_RANGE && enemy.resources.ammo > 0 && hasClearCardinalLineOfSight(enemy, threatObject, RANGED_ATTACK_RANGE, gameState)) {
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
        threatObject.hp -= damage;
        let logMsg = `Cornered Enemy ${enemyId} desperately `;
        if (attackType === 'ranged') {
            enemy.resources.ammo--;
            logMsg += `shoots ${threatId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})`;
        } else {
            logMsg += `melees ${threatId} for ${damage} damage.`;
        }
        Game.logMessage(logMsg, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });

        // Knockback is not applied when cornered? Let's keep it that way for now.

        if (threatObject.hp <= 0) {
            Game.logMessage(`Enemy ${enemyId} defeated ${threatId} while cornered! Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            enemy.targetEnemy = null;
            // performReevaluation called by main loop
            return false; // Needs re-evaluation after kill
        }
        return true; // Attack action complete
    } else {
        // Cannot attack, truly cornered
        Game.logMessage(`Enemy ${enemyId} is cornered and waits!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        return true; // Wait action complete
    }
}


/**
 * Handles AI logic when in the FLEEING state. Orchestrates validation, cornered checks, and movement.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action was taken (move, attack, wait), false if re-evaluation is needed.
 */
async function handleFleeingState(enemy, gameState) {
    // Check dependencies (Simplified)
     if (!enemy || !gameState || !gameState.player || !gameState.enemies || !gameState.mapData || typeof Game === 'undefined' || typeof Game.logMessage !== 'function') {
         Game.logMessage("handleFleeingState: Missing critical data.", gameState, { level: 'ERROR', target: 'CONSOLE' });
         return false; // Cannot act
     }
    const enemyId = enemy.id || 'Unknown Enemy';
    // const { player, enemies, mapData } = gameState; // Destructure only if needed later

    // --- 1. Validate State ---
    const validationResult = _validateFleeState(enemy, gameState);
    if (!validationResult.isValid) {
        // Reason logged in helper. Re-evaluation needed if target lost/escaped.
        return false; // Signal to main loop to re-evaluate
    }
    const threatObject = validationResult.threatObject;
    const threatId = threatObject === gameState.player ? 'Player' : threatObject.id; // Use gameState.player here

    // --- 2. Evaluate Potential Moves & Handle Being Cornered ---
    const possibleMoves = getValidMoves(enemy, gameState);

    if (possibleMoves.length === 0) {
        // Cornered! Delegate to helper.
        return _handleCorneredFleeingEnemy(enemy, threatObject, gameState);
    }

    // --- 3. Determine Flee Move (If Not Cornered) ---
    return await _determineAndExecuteFleeMove(enemy, threatObject, possibleMoves, gameState);
}
