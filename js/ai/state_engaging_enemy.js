// console.log("state_engaging_enemy.js loaded"); // Removed module loaded log


/**
 * Validates if the enemy can continue engaging its current target.
 * Checks target existence, health, LOS, and if the enemy should flee.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {{isValid: boolean, validatedTarget: object|null, needsReevaluation: boolean, reason: string|null}}
 */
function _validateEngageState(enemy, gameState) {
    const { player, enemies } = gameState;
    const enemyId = enemy.id || 'Unknown Enemy';

    // --- 1. Target Validation (Existence & Health) ---
    const target = enemy.targetEnemy;
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
        // performReevaluation is called by the main loop if this returns false
        return { isValid: false, validatedTarget: null, needsReevaluation: true, reason: 'no_target' };
    }
    const validatedTarget = currentTargetObject;
    const targetId = validatedTarget === player ? 'Player' : validatedTarget.id;

    // --- 2. Line of Sight (LOS) Check ---
    if (!hasClearLineOfSight(enemy, validatedTarget, enemy.detectionRange || AI_RANGE_MAX, gameState)) {
        Game.logMessage(`Enemy ${enemyId} lost sight of target ${targetId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.targetEnemy = null;
        // performReevaluation is called by the main loop if this returns false
        return { isValid: false, validatedTarget: null, needsReevaluation: true, reason: 'no_los' };
    }

    // --- 3. Health Check (Self-Preservation) ---
    const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP);
    if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
        Game.logMessage(`Enemy ${enemyId} HP low (${enemy.hp}), transitioning to FLEEING from ${targetId}.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.state = AI_STATE_FLEEING; // Change state directly
        Game.logMessage(`Enemy ${enemyId} health low, fleeing!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        return { isValid: false, validatedTarget: validatedTarget, needsReevaluation: true, reason: 'fleeing' }; // Needs re-eval due to state change
    }

    // If all checks pass
    return { isValid: true, validatedTarget: validatedTarget, needsReevaluation: false, reason: null };
}


/**
 * Attempts to perform a ranged or melee attack against the target.
 * Handles damage application, ammo decrement, and knockback.
 * @param {object} enemy - The attacking enemy object.
 * @param {object} target - The target unit object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an attack was made, false otherwise. Also returns false if target was defeated.
 */
async function _attemptEngageAttack(enemy, target, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const targetId = target === gameState.player ? 'Player' : target.id;
    const dist = Math.abs(target.row - enemy.row) + Math.abs(target.col - enemy.col);

    // Ranged Attack
    if (dist > 0 && dist <= RANGED_ATTACK_RANGE && enemy.resources.ammo > 0 && hasClearCardinalLineOfSight(enemy, target, RANGED_ATTACK_RANGE, gameState)) {
        // --- Visual Effect: Enemy Ranged Attack Projectile ---
        let rangedAttackEffect = null;
        if (typeof animationSystem !== 'undefined' && typeof AnimationSystem.createRangedAttackEffect === 'function' && typeof traceLine === 'function') {
            const traceEndX = target.col;
            const traceEndY = target.row;
            const linePoints = traceLine(enemy.col, enemy.row, traceEndX, traceEndY);
            rangedAttackEffect = AnimationSystem.createRangedAttackEffect({
                linePoints,
                hitCell: { row: target.row, col: target.col },
                color: "#ff5252"
            });
            animationSystem.addEffect(rangedAttackEffect);
        }
        if (rangedAttackEffect && rangedAttackEffect.promise) {
            await rangedAttackEffect.promise;
        }
        const damage = AI_ATTACK_DAMAGE;
        target.hp -= damage;
        enemy.resources.ammo--;
        let knockbackMsg = "";
        if (target.hp > 0) {
            const knockbackResult = applyKnockback(enemy, target, gameState);
            if (knockbackResult.success) {
                knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
            } else if (knockbackResult.reason !== 'calc_error') {
                knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
            }
        }
        Game.logMessage(`Enemy ${enemyId} shoots ${targetId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})${knockbackMsg}`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        if (target.hp <= 0) {
            Game.logMessage(`Enemy ${enemyId} defeated target ${targetId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            enemy.targetEnemy = null; // Clear target since it's defeated
            return false; // Needs re-evaluation
        }
        return true; // Attack made
    }

    // Melee Attack
    if (dist === 1) {
        const damage = AI_ATTACK_DAMAGE;
        target.hp -= damage;
        let knockbackMsg = "";
        if (target.hp > 0) {
            const knockbackResult = applyKnockback(enemy, target, gameState);
            if (knockbackResult.success) {
                knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
            } else if (knockbackResult.reason !== 'calc_error') {
                knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
            }
        }
        Game.logMessage(`Enemy ${enemyId} melees ${targetId} for ${damage} damage.${knockbackMsg}`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        if (target.hp <= 0) {
            Game.logMessage(`Enemy ${enemyId} defeated target ${targetId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            enemy.targetEnemy = null; // Clear target since it's defeated
            return false; // Needs re-evaluation
        }
        return true; // Attack made
    }

    return false; // No attack made
}


/**
 * Determines and executes the best move for an enemy engaging a target.
 * Considers getting closer, maintaining LOS, safety, and risk aversion.
 * Logs the move or wait action.
 * @param {object} enemy - The moving enemy object.
 * @param {object} target - The target unit object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - Always returns true, as either moving or waiting is considered a completed action.
 */
async function _determineAndExecuteEngageMove(enemy, target, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const targetId = target === gameState.player ? 'Player' : target.id;
 
    // A. Get Valid Moves
    const possibleMoves = getValidMoves(enemy, gameState);
    if (possibleMoves.length === 0) {
        Game.logMessage(`Enemy ${enemyId} is blocked while engaging ${targetId} and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        return true; // Wait action
    }
 
    // B. Identify Best Moves
    let closerMoves = [];
    let sidewaysMoves = [];
    const currentDist = Math.abs(target.row - enemy.row) + Math.abs(target.col - enemy.col);
    for (const move of possibleMoves) {
        const newDist = Math.abs(target.row - move.row) + Math.abs(target.col - move.col);
        if (newDist < currentDist) {
            closerMoves.push(move);
        } else if (newDist === currentDist) {
            sidewaysMoves.push(move);
        }
    }
    let potentialCandidates = [...closerMoves, ...sidewaysMoves];
 
    // C. Filter for Safety
    const safeCandidateMoves = potentialCandidates.filter(move => isMoveSafe(enemy, move.row, move.col, gameState));
    if (safeCandidateMoves.length === 0) {
         const logReason = potentialCandidates.length > 0 ? "avoids moving closer due to nearby known threats" : "cannot find a suitable move";
         Game.logMessage(`Enemy ${enemyId} ${logReason} towards ${targetId} and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
         return true; // Wait action
    }
 
    // D. Filter for LOS Maintenance
    let losMaintainingMoves = [];
    for (const move of safeCandidateMoves) {
        const tempEnemyPos = { row: move.row, col: move.col };
        if (hasClearLineOfSight(tempEnemyPos, target, enemy.detectionRange || AI_RANGE_MAX, gameState)) {
            losMaintainingMoves.push(move);
        }
    }
    let finalCandidates = losMaintainingMoves.length > 0 ? losMaintainingMoves : safeCandidateMoves;
 
    // E. Select Move
    let chosenMove = null;
    if (finalCandidates.length > 0) {
        let finalCloserMoves = finalCandidates.filter(move => {
            const newDist = Math.abs(target.row - move.row) + Math.abs(target.col - move.col);
            return newDist < currentDist;
        });
        if (finalCloserMoves.length > 0) {
            chosenMove = finalCloserMoves[Math.floor(Math.random() * finalCloserMoves.length)];
        } else {
            chosenMove = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
        }
    }
 
    // F. Risk Assessment
    let isRiskyMove = false;
    if (chosenMove) {
        const targetCanShoot = target.resources && target.resources.ammo > 0;
        const targetHasLOS = targetCanShoot && hasClearLineOfSight(target, chosenMove, RANGED_ATTACK_RANGE, gameState);
        isRiskyMove = targetCanShoot && targetHasLOS;
    }
 
    // G. Risk Aversion
    if (chosenMove && isRiskyMove) {
        const riskChance = typeof AI_ENGAGE_RISK_AVERSION_CHANCE !== 'undefined' ? AI_ENGAGE_RISK_AVERSION_CHANCE : 0.3;
        if (Math.random() < riskChance) {
            Game.logMessage(`Enemy ${enemyId} hesitates moving to (${chosenMove.row}, ${chosenMove.col}) due to risk from ${targetId}.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
            return true; // Wait action
        }
    }
 
    // H. Execute Move or Wait
    if (chosenMove) {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) moves towards target ${targetId} to (${chosenMove.row},${chosenMove.col}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        // Animate enemy movement before updating position
        let moveEffect = null;
        if (typeof animationSystem !== "undefined" && typeof AnimationSystem.createMovementEffect === "function") {
            moveEffect = AnimationSystem.createMovementEffect({
                unit: enemy,
                from: { row: enemy.row, col: enemy.col },
                to: { row: chosenMove.row, col: chosenMove.col },
                color: enemy.color || "#e53935",
                duration: typeof MOVEMENT_ANIMATION_DURATION !== "undefined" ? MOVEMENT_ANIMATION_DURATION : 180,
                easing: typeof ANIMATION_EASING !== "undefined" ? ANIMATION_EASING : "easeInOut"
            });
            animationSystem.addEffect(moveEffect);
        }
        if (moveEffect && moveEffect.promise) {
            await moveEffect.promise;
        }
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col, gameState);
        return true; // Move action complete
    } else {
        // Fallback wait if no move was chosen after all filtering
        Game.logMessage(`Enemy ${enemyId} waits (engaging ${targetId}, no suitable move).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        return true; // Wait action complete
    }
}


/**
 * Handles AI logic when in the ENGAGING_ENEMY state. Orchestrates validation, attack, and movement.
 * @param {object} enemy - The enemy object in the ENGAGING_ENEMY state.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action was taken (attack, move, wait), false if re-evaluation is needed.
 */
async function handleEngagingEnemyState(enemy, gameState) {
    // Check dependencies (Simplified, assuming they are loaded)
     if (!enemy || !gameState || !gameState.player || !gameState.enemies || !gameState.mapData || typeof Game === 'undefined' || typeof Game.logMessage !== 'function') {
         Game.logMessage("handleEngagingEnemyState: Missing critical data.", gameState, { level: 'ERROR', target: 'CONSOLE' });
         return false; // Cannot act
     }
    // const enemyId = enemy.id || 'Unknown Enemy'; // No longer needed directly here
    // const { player, enemies, mapData } = gameState; // No longer needed directly here

    // --- 1. Validate State ---
    const validationResult = _validateEngageState(enemy, gameState);
    if (!validationResult.isValid) {
        // Reason logged in helper. If state changed (fleeing), re-eval needed.
        // If target lost, re-eval needed.
        return false; // Signal to main loop to re-evaluate
    }
    const validatedTarget = validationResult.validatedTarget;

    // --- 2. Attempt Attack ---
    const attackMade = await _attemptEngageAttack(enemy, validatedTarget, gameState);
    if (attackMade) {
        return true; // Attack was the action for this turn
    }
    // If attackMade is false, it might be because the target was defeated,
    // in which case _attemptEngageAttack already cleared enemy.targetEnemy and logged.
    // We need to signal re-evaluation.
    if (enemy.targetEnemy === null) {
        return false; // Target defeated during attack attempt, re-evaluate needed
    }

    // --- 3. Determine and Execute Move (If No Attack Occurred) ---
    return await _determineAndExecuteEngageMove(enemy, validatedTarget, gameState);
}
