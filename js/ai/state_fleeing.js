console.log("state_fleeing.js loaded");

/**
 * Handles AI logic when in the FLEEING state.
 * Priority: Target validation -> Threat visibility -> Cornered check (attack/wait) -> Break LOS -> Move away safely -> Wait.
 * @param {object} enemy - The enemy object.
 * @returns {boolean} - True if an action was taken (move, attack, wait), false if re-evaluation is needed.
 */
function handleFleeingState(enemy) {
    const threat = enemy.targetEnemy;

    // --- 1. Target Validation ---
    if (!threat || threat.hp <= 0) {
        Game.logMessage(`Enemy ${enemy.id} fleeing target invalid/gone. Re-evaluating.`, LOG_CLASS_ENEMY_EVENT);
        enemy.targetEnemy = null;
        performReevaluation(enemy);
        return false; // Needs re-evaluation
    }

    // --- 2. Threat Visibility Check ---
    // Use the accurate LOS check to see if we still perceive the threat
    if (!hasClearLineOfSight(enemy, threat, enemy.detectionRange || AI_RANGE_MAX)) {
        Game.logMessage(`Enemy ${enemy.id} broke LOS with ${threat.id || 'Player'}. Re-evaluating.`, LOG_CLASS_ENEMY_EVENT);
        enemy.targetEnemy = null; // Successfully evaded for now
        performReevaluation(enemy);
        return false; // Needs re-evaluation
    }

    // --- 3. Evaluate Potential Moves & Handle Being Cornered ---
    const possibleMoves = getValidMoves(enemy);

    if (possibleMoves.length === 0) {
        // Cornered! Check if we can attack the threat from here.
        const dist = Math.abs(threat.row - enemy.row) + Math.abs(threat.col - enemy.col);
        let canAttack = false;
        let attackType = null; // 'ranged' or 'melee'

        // Check Ranged Attack
        if (dist > 0 && dist <= RANGED_ATTACK_RANGE && enemy.resources.ammo > 0 && hasClearCardinalLineOfSight(enemy, threat, RANGED_ATTACK_RANGE)) {
            canAttack = true;
            attackType = 'ranged';
        }
        // Check Melee Attack (only if ranged not possible)
        else if (dist === 1) {
            canAttack = true;
            attackType = 'melee';
        }

        if (canAttack) {
            const damage = AI_ATTACK_DAMAGE;
            threat.hp -= damage;
            const targetId = threat.id || 'Player';
            let logMsg = `Cornered Enemy ${enemy.id} desperately `;
            if (attackType === 'ranged') {
                enemy.resources.ammo--;
                logMsg += `shoots ${targetId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})`;
            } else { // Melee
                logMsg += `melees ${targetId} for ${damage} damage.`;
            }
            Game.logMessage(logMsg, LOG_CLASS_ENEMY_EVENT);

            if (threat.hp <= 0) {
                Game.logMessage(`Enemy ${enemy.id} defeated ${targetId} while cornered!`, LOG_CLASS_ENEMY_EVENT);
                enemy.targetEnemy = null;
                performReevaluation(enemy);
                return false; // Needs re-evaluation after kill
            }
            return true; // Attack action complete
        } else {
            // Cannot attack, truly cornered and must wait
            Game.logMessage(`Enemy ${enemy.id} is cornered and waits!`, LOG_CLASS_ENEMY_EVENT);
            return true; // Wait action complete
        }
    }

    // --- 4. Prioritize Moves that Break LOS (If Moves Possible) ---
    let losBreakingMoves = [];
    for (const move of possibleMoves) {
        // Check if the threat would have LOS to the potential move destination
        const threatHasLOSToMove = hasClearLineOfSight(threat, move, threat.detectionRange || AI_RANGE_MAX);
        if (!threatHasLOSToMove) {
            losBreakingMoves.push(move);
        }
    }

    if (losBreakingMoves.length > 0) {
        // Select the LOS-breaking move furthest from the threat
        let bestMove = null;
        let maxDist = -1;
        for (const move of losBreakingMoves) {
            const distFromThreat = Math.abs(move.row - threat.row) + Math.abs(move.col - threat.col);
            if (distFromThreat > maxDist) {
                maxDist = distFromThreat;
                bestMove = move;
            }
        }
        // Execute the chosen move
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) flees towards cover at (${bestMove.row},${bestMove.col}) to break LOS from ${threat.id || 'Player'}.`, LOG_CLASS_ENEMY_EVENT);
        enemy.row = bestMove.row;
        enemy.col = bestMove.col;
        return true; // Action taken
    }

    // --- 5. Fallback: Move Directly Away Safely (If LOS Cannot Be Broken) ---
    let bestAwayMoves = [];
    let maxDistFromThreat = -1;

    // Find the max distance achievable among possible moves
    for (const move of possibleMoves) {
        const distFromThreat = Math.abs(move.row - threat.row) + Math.abs(move.col - threat.col);
        if (distFromThreat > maxDistFromThreat) {
            maxDistFromThreat = distFromThreat;
        }
    }

    // Collect all moves that achieve this max distance
    for (const move of possibleMoves) {
        const distFromThreat = Math.abs(move.row - threat.row) + Math.abs(move.col - threat.col);
        if (distFromThreat === maxDistFromThreat) {
            bestAwayMoves.push(move);
        }
    }

    // Filter for safety (not adjacent to other enemies)
    let safeAwayMoves = [];
    for (const move of bestAwayMoves) {
        let isSafe = true;
        for (const otherEnemy of enemies) {
            if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.id === threat.id || otherEnemy.hp <= 0) continue; // Skip self, threat, dead

            const adjacent = Math.abs(move.row - otherEnemy.row) <= 1 && Math.abs(move.col - otherEnemy.col) <= 1;
            if (adjacent) {
                isSafe = false;
                break;
            }
        }
        if (isSafe) {
            safeAwayMoves.push(move);
        }
    }

    if (safeAwayMoves.length > 0) {
        // Choose one of the safe moves (randomly if multiple)
        const chosenMove = safeAwayMoves[Math.floor(Math.random() * safeAwayMoves.length)];
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) flees away from ${threat.id || 'Player'} to safe spot (${chosenMove.row},${chosenMove.col}).`, LOG_CLASS_ENEMY_EVENT);
        enemy.row = chosenMove.row;
        enemy.col = chosenMove.col;
        return true; // Action taken
    } else {
        // No safe moves away found, must wait
        Game.logMessage(`Enemy ${enemy.id} is blocked/unsafe while fleeing and waits.`, LOG_CLASS_ENEMY_EVENT);
        return true; // Wait action complete
    }
}
