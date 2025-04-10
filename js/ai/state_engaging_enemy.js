// console.log("state_engaging_enemy.js loaded"); // Removed module loaded log

/**
 * Handles AI logic when in the ENGAGING_ENEMY state, using gameState.
 * Prioritizes target validation, LOS check, self-preservation (fleeing),
 * attacking (ranged then melee), and then moving towards the target with risk assessment.
 * @param {object} enemy - The enemy object in the ENGAGING_ENEMY state.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action was taken (attack, move, wait), false if re-evaluation is needed.
 */
function handleEngagingEnemyState(enemy, gameState) {
    // Check dependencies (Added applyKnockback, removed calculateKnockbackDestination)
    if (!enemy || !gameState || !gameState.player || !gameState.enemies || !gameState.mapData || typeof Game === 'undefined' || typeof Game.logMessage !== 'function' || typeof performReevaluation !== 'function' || typeof hasClearLineOfSight !== 'function' || typeof hasClearCardinalLineOfSight !== 'function' || typeof applyKnockback !== 'function' || typeof updateUnitPosition !== 'function' || typeof getValidMoves !== 'function' || typeof isMoveSafe !== 'function') {
        Game.logMessage("handleEngagingEnemyState: Missing enemy, gameState, or required functions (incl. applyKnockback).", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return false; // Cannot act without dependencies
    }
    const enemyId = enemy.id || 'Unknown Enemy';
    const { player, enemies, mapData } = gameState; // Destructure

    // --- 1. Target Validation (Existence & Health) ---
    const target = enemy.targetEnemy;
    // Ensure target exists within the current gameState's player/enemies list and is alive
    let currentTargetObject = null;
    if (target) {
        if (target === player && player.hp > 0) {
            currentTargetObject = player;
        } else if (target !== player) {
            currentTargetObject = enemies.find(e => e === target && e.hp > 0);
        }
    }

    if (!currentTargetObject) {
        Game.logMessage(`Enemy ${enemyId} target invalid or defeated. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.targetEnemy = null;
        performReevaluation(enemy, gameState); // Pass gameState
        return false; // Needs re-evaluation
    }
    // Use the validated currentTargetObject from now on
    const validatedTarget = currentTargetObject;
    const targetId = validatedTarget === player ? 'Player' : validatedTarget.id;


    // --- 2. Line of Sight (LOS) Check ---
    // Use hasClearLineOfSight and detectionRange
    // Assume AI_RANGE_MAX is global for now
    if (!hasClearLineOfSight(enemy, validatedTarget, enemy.detectionRange || AI_RANGE_MAX, gameState)) { // Pass gameState
        Game.logMessage(`Enemy ${enemyId} lost sight of target ${targetId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.targetEnemy = null;
        performReevaluation(enemy, gameState); // Pass gameState
        return false; // Needs re-evaluation
    }

    // --- 3. Health Check (Self-Preservation) ---
    // Assume AI_FLEE_HEALTH_THRESHOLD is global for now
    const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP); // Use player max as fallback
    if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
        Game.logMessage(`Enemy ${enemyId} HP low (${enemy.hp}), transitioning to FLEEING from ${targetId}.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.state = AI_STATE_FLEEING;
        // Target remains the same
        Game.logMessage(`Enemy ${enemyId} health low, fleeing!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT }); // Player log
        return false; // State changed, needs re-evaluation next loop
    }

    // --- 4. Attack Logic ---
    const dist = Math.abs(validatedTarget.row - enemy.row) + Math.abs(validatedTarget.col - enemy.col);
    // Assume RANGED_ATTACK_RANGE, AI_ATTACK_DAMAGE, TILE_*, GRID_* are global for now

    // Check 4a: Ranged Attack Possible?
    if (dist > 0 && dist <= RANGED_ATTACK_RANGE && enemy.resources.ammo > 0 && hasClearCardinalLineOfSight(enemy, validatedTarget, RANGED_ATTACK_RANGE, gameState)) { // Pass gameState
        const damage = AI_ATTACK_DAMAGE;
        validatedTarget.hp -= damage; // Modify target HP directly
        enemy.resources.ammo--; // Modify enemy ammo
        let knockbackMsg = "";

        // --- Knockback Logic (Ranged) ---
        if (validatedTarget.hp > 0) { // Only apply knockback if target survived the initial damage
            const knockbackResult = applyKnockback(enemy, validatedTarget, gameState); // Use centralized function
            if (knockbackResult.success) {
                knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
            } else if (knockbackResult.reason !== 'calc_error') { // Don't log calc errors usually
                knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
            }
            // No need for manual checks or updateUnitPosition call here
        }
        // --- End Knockback Logic ---

        // Pass gameState to logMessage
        Game.logMessage(`Enemy ${enemyId} shoots ${targetId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})${knockbackMsg}`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });

        // Check if target was defeated *after* potential knockback
        if (validatedTarget.hp <= 0) {
            Game.logMessage(`Enemy ${enemyId} defeated target ${targetId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            enemy.targetEnemy = null;
            performReevaluation(enemy, gameState);
            return false;
        }
        return true; // Action complete (attacked)
    }

    // Check 4b: Melee Attack Possible?
    if (dist === 1) {
        const damage = AI_ATTACK_DAMAGE;
        validatedTarget.hp -= damage;
        let knockbackMsg = "";

        // --- Knockback Logic (Melee) ---
        if (validatedTarget.hp > 0) { // Only apply knockback if target survived the initial damage
            const knockbackResult = applyKnockback(enemy, validatedTarget, gameState); // Use centralized function
            if (knockbackResult.success) {
                knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
            } else if (knockbackResult.reason !== 'calc_error') {
                knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
            }
            // No need for manual checks or updateUnitPosition call here
        }
        // --- End Knockback Logic ---

        // Pass gameState to logMessage
        Game.logMessage(`Enemy ${enemyId} melees ${targetId} for ${damage} damage.${knockbackMsg}`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });

        // Check if target was defeated *after* potential knockback
        if (validatedTarget.hp <= 0) {
            Game.logMessage(`Enemy ${enemyId} defeated target ${targetId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            enemy.targetEnemy = null;
            performReevaluation(enemy, gameState); // Pass gameState
            // Let main loop handle removal based on HP check
            return false; // Needs re-evaluation
        }
        return true; // Action complete (attacked)
    }

    // --- 5. Movement Logic (If No Attack Occurred) ---

    // A. Get Valid Moves (pass gameState)
    const possibleMoves = getValidMoves(enemy, gameState);
    if (possibleMoves.length === 0) {
        Game.logMessage(`Enemy ${enemyId} is blocked while engaging ${targetId} and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        return true; // Wait action
    }

    // B. Identify Best Moves Towards Target
    let closerMoves = [];
    let sidewaysMoves = [];
    const currentDist = Math.abs(validatedTarget.row - enemy.row) + Math.abs(validatedTarget.col - enemy.col);

    for (const move of possibleMoves) {
        const newDist = Math.abs(validatedTarget.row - move.row) + Math.abs(validatedTarget.col - move.col);
        if (newDist < currentDist) {
            closerMoves.push(move);
        } else if (newDist === currentDist) {
            sidewaysMoves.push(move);
        }
    }
    let potentialCandidates = [...closerMoves, ...sidewaysMoves];

    // C. Filter for Safety (Avoid *Known* OTHER Enemies)
    // Pass gameState to hasClearLineOfSight
    const allVisibleThreats = [player, ...enemies].filter(potentialThreat =>
        potentialThreat &&
        potentialThreat.hp > 0 &&
        potentialThreat !== enemy &&
        potentialThreat !== validatedTarget &&
        hasClearLineOfSight(enemy, potentialThreat, enemy.detectionRange || AI_RANGE_MAX, gameState) // Pass gameState
    );

    // Pass gameState to isMoveSafe
    const safeCandidateMoves = potentialCandidates.filter(move => isMoveSafe(enemy, move.row, move.col, gameState));

    if (safeCandidateMoves.length === 0) {
         if (potentialCandidates.length > 0) {
              Game.logMessage(`Enemy ${enemyId} avoids moving closer to ${targetId} due to nearby known threats.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
         } else {
              Game.logMessage(`Enemy ${enemyId} cannot find a suitable move towards ${targetId} and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
         }
         return true; // Wait action
    }

    // D. Filter for LOS Maintenance (Prefer Keeping Sight of Primary Target)
    let losMaintainingMoves = [];
    for (const move of safeCandidateMoves) {
        const tempEnemyPos = { row: move.row, col: move.col };
        // Pass gameState to hasClearLineOfSight
        if (hasClearLineOfSight(tempEnemyPos, validatedTarget, enemy.detectionRange || AI_RANGE_MAX, gameState)) {
            losMaintainingMoves.push(move);
        }
    }

    let finalCandidates = [];
    if (losMaintainingMoves.length > 0) {
        finalCandidates = losMaintainingMoves;
    } else {
        finalCandidates = safeCandidateMoves;
    }

    // E. Select Final Candidate Move
    let chosenMove = null;
    if (finalCandidates.length > 0) {
        let finalCloserMoves = [];
        let finalSidewaysMoves = [];
        for (const move of finalCandidates) {
             const newDist = Math.abs(validatedTarget.row - move.row) + Math.abs(validatedTarget.col - move.col);
             if (newDist < currentDist) {
                 finalCloserMoves.push(move);
             } else if (newDist === currentDist) {
                 finalSidewaysMoves.push(move);
             }
        }

        if (finalCloserMoves.length > 0) {
            chosenMove = finalCloserMoves[Math.floor(Math.random() * finalCloserMoves.length)];
        } else if (finalSidewaysMoves.length > 0) {
            chosenMove = finalSidewaysMoves[Math.floor(Math.random() * finalSidewaysMoves.length)];
        }
    }

    // F. Risk Assessment (On Chosen Move)
    let isRisky = false;
    if (chosenMove) {
        const canTargetAttack = validatedTarget.resources && validatedTarget.resources.ammo > 0;
        let targetHasLOSToMove = false;
        if (canTargetAttack) {
            // Pass gameState to hasClearLineOfSight
            targetHasLOSToMove = hasClearLineOfSight(validatedTarget, chosenMove, RANGED_ATTACK_RANGE, gameState);
        }
        isRisky = canTargetAttack && targetHasLOSToMove;
    }

    // G. Risk Aversion (Probabilistic Hesitation)
    // Assume AI_ENGAGE_RISK_AVERSION_CHANCE is global for now
    if (chosenMove && isRisky) {
        const rand = Math.random();
        if (rand < (typeof AI_ENGAGE_RISK_AVERSION_CHANCE !== 'undefined' ? AI_ENGAGE_RISK_AVERSION_CHANCE : 0.3)) {
            Game.logMessage(`Enemy ${enemyId} hesitates moving to (${chosenMove.row}, ${chosenMove.col}) due to risk from ${targetId}.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
            return true; // Wait action (hesitated)
        }
    }

    // H. Execute Move
    if (chosenMove && (!isRisky || isRisky /* risk accepted */)) {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) moves towards target ${targetId} to (${chosenMove.row},${chosenMove.col}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        // Pass gameState to updateUnitPosition (anticipating refactor)
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col, gameState);
        return true; // Move action complete
    }

    // --- 6. Default/Wait (Fallback) ---
    Game.logMessage(`Enemy ${enemyId} waits (engaging ${targetId}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
    return true; // Wait action complete
}
