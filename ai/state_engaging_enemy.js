/**
 * Validates if the enemy can continue engaging its current target.
 * Checks target existence, health, LOS, and if the enemy should flee.
 * @param {Enemy} enemy - The enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {{isValid: boolean, validatedTarget: object|null, needsReevaluation: boolean, reason: string|null}}
 */
function _validateEngageState(enemy, gameState) {
    const { player, enemies } = gameState;
    const enemyId = enemy.id || 'Unknown Enemy';

    // 1. Target Validation (Existence & Health)
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
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} target invalid or defeated. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        enemy.targetEnemy = null;
        return { isValid: false, validatedTarget: null, needsReevaluation: true, reason: 'no_target' };
    }
    const validatedTarget = currentTargetObject;
    const targetId = validatedTarget === player ? 'Player' : validatedTarget.id;

    // 2. Line of Sight (LOS) Check
    if (typeof hasClearLineOfSight === 'function' && !hasClearLineOfSight(enemy, validatedTarget, enemy.detectionRange || window.AI_RANGE_MAX, gameState)) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} lost sight of target ${targetId}. Re-evaluating.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        enemy.targetEnemy = null;
        return { isValid: false, validatedTarget: null, needsReevaluation: true, reason: 'no_los' };
    }

    // 3. Health Check (Self-Preservation)
    const hpPercent = enemy.hp / (enemy.maxHp || window.PLAYER_MAX_HP);
    if (hpPercent < window.AI_FLEE_HEALTH_THRESHOLD) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} HP low (${enemy.hp}), transitioning to FLEEING from ${targetId}.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        enemy.state = window.AI_STATE_FLEEING;
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} health low, fleeing!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        return { isValid: false, validatedTarget: validatedTarget, needsReevaluation: true, reason: 'fleeing' };
    }

    // If all checks pass
    return { isValid: true, validatedTarget: validatedTarget, needsReevaluation: false, reason: null };
}

/**
 * Attempts to perform a ranged or melee attack against the target.
 * Handles damage application, ammo decrement, and knockback.
 * @param {Enemy} enemy - The attacking enemy instance.
 * @param {object} target - The target unit object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an attack was made, false otherwise. Also returns false if target was defeated.
 */
async function _attemptEngageAttack(enemy, target, gameState) {
    // Use Unit's shoot for ranged, moveOrAttack for melee
    const { row: enemyRow, col: enemyCol } = window.toGridCoords(enemy);
    const { row: targetRow, col: targetCol } = window.toGridCoords(target);
    const dist = Math.abs(targetRow - enemyRow) + Math.abs(targetCol - enemyCol);

    // Ranged attack if in range and LOS
    if (
        dist > 0 &&
        dist <= window.RANGED_ATTACK_RANGE &&
        enemy.resources.ammo > 0 &&
        typeof hasClearCardinalLineOfSight === 'function' &&
        hasClearCardinalLineOfSight(
            { row: enemyRow, col: enemyCol, ...enemy },
            { row: targetRow, col: targetCol, ...target },
            window.RANGED_ATTACK_RANGE, gameState
        )
    ) {
        // Direction vector for shoot
        const dx = Math.sign(targetCol - enemyCol);
        const dy = Math.sign(targetRow - enemyRow);
        // Use shoot method (centralized)
        return enemy.shoot({ dx, dy }, gameState, { range: window.RANGED_ATTACK_RANGE, damage: window.AI_ATTACK_DAMAGE });
    }

    // Melee attack if adjacent
    if (dist === 1) {
        // Use moveOrAttack with AI damage
        return enemy.moveOrAttack(targetCol, targetRow, gameState, { damage: window.AI_ATTACK_DAMAGE });
    }

    // Not in range
    if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
        Game.logMessage(`Enemy cannot attack: not in range for melee or ranged.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
    }
    return false;
}

/**
 * Determines and executes the best move for an enemy engaging a target.
 * Considers getting closer, maintaining LOS, safety, and risk aversion.
 * Logs the move or wait action.
 * @param {Enemy} enemy - The moving enemy instance.
 * @param {object} target - The target unit object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - Always returns true, as either moving or waiting is considered a completed action.
 */
async function _determineAndExecuteEngageMove(enemy, target, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const targetId = target === gameState.player ? 'Player' : target.id;

    // A. Get Valid Moves
    const possibleMoves = typeof getValidMoves === 'function' ? getValidMoves(enemy, gameState) : [];
    if (possibleMoves.length === 0) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} is blocked while engaging ${targetId} and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        return true;
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
    const safeCandidateMoves = potentialCandidates.filter(move =>
        typeof isMoveSafe === 'function' ? isMoveSafe(enemy, move.row, move.col, gameState) : true
    );
    if (safeCandidateMoves.length === 0) {
        const logReason = potentialCandidates.length > 0 ? "avoids moving closer due to nearby known threats" : "cannot find a suitable move";
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} ${logReason} towards ${targetId} and waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        return true;
    }

    // D. Filter for LOS Maintenance
    let losMaintainingMoves = [];
    for (const move of safeCandidateMoves) {
        const tempEnemyPos = { row: move.row, col: move.col };
        if (typeof hasClearLineOfSight === 'function' && hasClearLineOfSight(tempEnemyPos, target, enemy.detectionRange || window.AI_RANGE_MAX, gameState)) {
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
        const targetHasLOS = targetCanShoot && typeof hasClearLineOfSight === 'function' && hasClearLineOfSight(target, chosenMove, window.RANGED_ATTACK_RANGE, gameState);
        isRiskyMove = targetCanShoot && targetHasLOS;
    }

    // G. Risk Aversion
    if (chosenMove && isRiskyMove) {
        const riskChance = typeof window.AI_ENGAGE_RISK_AVERSION_CHANCE !== 'undefined' ? window.AI_ENGAGE_RISK_AVERSION_CHANCE : 0.3;
        if (Math.random() < riskChance) {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage(`Enemy ${enemyId} hesitates moving to (${chosenMove.row}, ${chosenMove.col}) due to risk from ${targetId}.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
            }
            return true;
        }
    }

    // H. Execute Move or Wait
    if (chosenMove) {
        // Use Unit's moveOrAttack for movement
        enemy.moveOrAttack(chosenMove.col, chosenMove.row, gameState);
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) moves towards target ${targetId} to (${chosenMove.row},${chosenMove.col}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        return true;
    } else {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} waits (engaging ${targetId}, no suitable move).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        return true;
    }
}

/**
 * Handles AI logic when in the ENGAGING_ENEMY state. Orchestrates validation, attack, and movement.
 * @param {Enemy} enemy - The enemy instance in the ENGAGING_ENEMY state.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - True if an action was taken (attack, move, wait), false if re-evaluation is needed.
 */
async function handleEngagingEnemyState(enemy, gameState) {
    if (!enemy || !gameState || !gameState.player || !gameState.enemies || !gameState.mapData || typeof Game === 'undefined' || typeof Game.logMessage !== 'function') {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("handleEngagingEnemyState: Missing critical data.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }

    // 1. Validate State
    const validationResult = _validateEngageState(enemy, gameState);
    if (!validationResult.isValid) {
        return false;
    }
    const validatedTarget = validationResult.validatedTarget;

    // 2. Attempt Attack
    const attackMade = await _attemptEngageAttack(enemy, validatedTarget, gameState);
    if (attackMade) {
        return true;
    }
    if (enemy.targetEnemy === null) {
        return false;
    }

    // 3. Determine and Execute Move (If No Attack Occurred)
    return await _determineAndExecuteEngageMove(enemy, validatedTarget, gameState);
}

// Attach to global scope for Enemy FSM
window.handleEngagingEnemyState = handleEngagingEnemyState;