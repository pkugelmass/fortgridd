console.log("state_engaging_enemy.js loaded");

/**
 * Handles AI logic when in the ENGAGING_ENEMY state.
 * Prioritizes target validation, LOS check, self-preservation (fleeing),
 * attacking (ranged then melee), and then moving towards the target with risk assessment.
 * @param {object} enemy - The enemy object in the ENGAGING_ENEMY state.
 */
function handleEngagingEnemyState(enemy) {
    // --- 1. Target Validation (Existence & Health) ---
    const target = enemy.targetEnemy;
    if (!target || target.hp <= 0) {
        console.log(`Enemy ${enemy.id} target invalid or defeated.`);
        enemy.targetEnemy = null;
        performReevaluation(enemy); // Re-evaluate situation
        return;
    }

    // --- 2. Line of Sight (LOS) Check ---
    // Use hasClearLineOfSight and detectionRange to see if the engagement condition still holds
    if (!hasClearLineOfSight(enemy, target, enemy.detectionRange || AI_RANGE_MAX)) {
        console.log(`Enemy ${enemy.id} lost sight of target ${target.id || 'Player'}.`);
        enemy.targetEnemy = null;
        performReevaluation(enemy); // Re-evaluate situation
        return;
    }

    // --- 3. Health Check (Self-Preservation) ---
    const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP); // Use player max as fallback
    if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
        console.log(`Enemy ${enemy.id} HP low (${enemy.hp}), transitioning to FLEEING from ${target.id || 'Player'}.`);
        enemy.state = AI_STATE_FLEEING;
        // Target remains the same, so Fleeing state knows who to flee from
        Game.logMessage(`Enemy ${enemy.id} health low, fleeing!`, LOG_CLASS_ENEMY_EVENT);
        return;
    }

    // --- 4. Attack Logic ---
    const dist = Math.abs(target.row - enemy.row) + Math.abs(target.col - enemy.col);

    // Check 4: Ranged Attack Possible?
    // Use hasClearCardinalLineOfSight and RANGED_ATTACK_RANGE for attack feasibility to match player capabilities
    // Note: We still use Manhattan distance `dist` for adjacency check (melee) and initial range check for simplicity.
    // Visibility checks (step 2) still use the more accurate hasClearLineOfSight (Bresenham).
    if (dist > 0 && dist <= RANGED_ATTACK_RANGE && enemy.resources.ammo > 0 && hasClearCardinalLineOfSight(enemy, target, RANGED_ATTACK_RANGE)) {
        const damage = AI_ATTACK_DAMAGE; // Use AI's damage
        target.hp -= damage;
        enemy.resources.ammo--;
        const targetId = target.id || 'Player';
        Game.logMessage(`Enemy ${enemy.id} shoots ${targetId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})`, LOG_CLASS_ENEMY_EVENT);

        if (target.hp <= 0) {
            console.log(`Enemy ${enemy.id} defeated target ${targetId}.`);
            Game.logMessage(`Enemy ${enemy.id} defeated ${targetId}!`, LOG_CLASS_ENEMY_EVENT); // Log defeat explicitly
            enemy.targetEnemy = null;
            performReevaluation(enemy); // Re-evaluate after kill
        }
        return; // Action complete
    }

    // Check 5: Melee Attack Possible?
    if (dist === 1) {
        const damage = AI_ATTACK_DAMAGE; // Use AI's damage
        target.hp -= damage;
        const targetId = target.id || 'Player';
        Game.logMessage(`Enemy ${enemy.id} melees ${targetId} for ${damage} damage.`, LOG_CLASS_ENEMY_EVENT);

        if (target.hp <= 0) {
            console.log(`Enemy ${enemy.id} defeated target ${targetId}.`);
             Game.logMessage(`Enemy ${enemy.id} defeated ${targetId}!`, LOG_CLASS_ENEMY_EVENT); // Log defeat explicitly
            enemy.targetEnemy = null;
            performReevaluation(enemy); // Re-evaluate after kill
        }
        return; // Action complete
    }

    // --- 5. Movement Logic (If No Attack Occurred) ---

    // Check 6: Out of Ammo? (If we got here, we couldn't attack)
    // Note: Even if out of ammo, AI might still move towards target for melee.
    // The actual attack checks handle ammo requirements.
    // No action needed here if out of ammo, proceed to movement consideration.
    // if (enemy.resources.ammo <= 0) {
    //     console.log(`Enemy ${enemy.id} is out of ammo.`);
    //     performReevaluation(enemy); // BUG: This prevents moving for melee when out of ammo.
    //     return;
    // }

    // Check 7: Consider Moving Towards Target
    // A. Identify Potential Move (Simplified: get best move from moveTowards logic)
    //    We need to find the best move without actually executing it yet for risk assessment.
    //    Let's adapt moveTowards logic slightly or create a helper.
    //    For now, let's find the best move candidate directly.

    const possibleMoves = getValidMoves(enemy);
    let bestMove = null;
    let minDistanceToTarget = dist; // Current distance

    if (possibleMoves.length > 0) {
        let closerMoves = [];
        let sidewaysMoves = [];

        for (const move of possibleMoves) {
            const newDist = Math.abs(target.row - move.row) + Math.abs(target.col - move.col);
            if (newDist < minDistanceToTarget) {
                closerMoves.push({ move: move, distance: newDist });
            } else if (newDist === minDistanceToTarget) {
                sidewaysMoves.push(move);
            }
        }

        if (closerMoves.length > 0) {
            closerMoves.sort((a, b) => a.distance - b.distance);
            bestMove = closerMoves[0].move;
        } else if (sidewaysMoves.length > 0) {
            bestMove = sidewaysMoves[Math.floor(Math.random() * sidewaysMoves.length)];
        }
    }
    // console.log(`DEBUG ${enemy.id}: Potential bestMove identified: ${bestMove ? `(${bestMove.row},${bestMove.col})` : 'None'}`); // Removed debug log

    // If a potential move towards the target exists...
    if (bestMove) {
        const intendedMove = bestMove; // The square we intend to move to

        // B. Risk Assessment
        let isRisky = false;
        // Check if target is capable of attacking (has ammo - assuming player/AI need ammo for ranged)
        // Note: This assumes the target is another AI or the player, which should have a 'resources' property.
        // Need robust check if target could be something else without ammo.
        const canTargetAttack = target.resources && target.resources.ammo > 0;
        let targetHasLOS = false; // Default to false
        if (canTargetAttack) {
            // Check if target has LOS to the *intended destination* within *its* attack range
            targetHasLOS = hasClearLineOfSight(target, intendedMove, RANGED_ATTACK_RANGE);
            if (targetHasLOS) {
                isRisky = true;
            }
        }
        // console.log(`DEBUG ${enemy.id}: Risk Assessment for move to (${intendedMove.row},${intendedMove.col}): canTargetAttack=${canTargetAttack}, targetHasLOS=${targetHasLOS}, isRisky=${isRisky}`); // Removed debug log


        // C. Risk Aversion (Probabilistic Hesitation)
        if (isRisky) {
            const rand = Math.random();
            if (rand < AI_ENGAGE_RISK_AVERSION_CHANCE) {
                // console.log(`DEBUG ${enemy.id}: Hesitating due to risk (chance: ${AI_ENGAGE_RISK_AVERSION_CHANCE}, roll: ${rand.toFixed(2)})`); // Removed debug log
                Game.logMessage(`Enemy ${enemy.id} hesitates due to risk at (${intendedMove.row}, ${intendedMove.col}).`, LOG_CLASS_ENEMY_EVENT);
                return; // Effectively waits
            } else {
                 // console.log(`DEBUG ${enemy.id}: Taking risky move (chance: ${AI_ENGAGE_RISK_AVERSION_CHANCE}, roll: ${rand.toFixed(2)})`); // Removed debug log
            }
        }

        // D. Execute Move (If not too risky or risk accepted)
        // console.log(`DEBUG ${enemy.id}: Executing move to (${intendedMove.row},${intendedMove.col})`); // Removed debug log
        // Log message includes the STARTING position before the move
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) moves towards target ${target.id || 'Player'} to (${intendedMove.row},${intendedMove.col}).`, LOG_CLASS_ENEMY_EVENT);
        enemy.row = intendedMove.row;
        enemy.col = intendedMove.col;
        return; // Action complete

    } else {
        // No move closer or sideways found, proceed to fallback wait
        // console.log(`DEBUG ${enemy.id}: Cannot find move towards target ${target.id || 'Player'}. Proceeding to fallback wait.`); // Removed debug log
    }


    // --- 6. Default/Wait (Fallback) ---
    // If no action taken (e.g., couldn't find a move towards target, or hesitated)
    // console.log(`DEBUG ${enemy.id}: Reached fallback wait.`); // Removed debug log
    Game.logMessage(`Enemy ${enemy.id} waits (engaging ${target.id || 'Player'}).`, LOG_CLASS_ENEMY_EVENT);
    return;
}
