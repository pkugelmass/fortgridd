console.log("state_engaging_enemy.js loaded");

/**
 * Handles AI logic when in the ENGAGING_ENEMY state.
 * Prioritizes target validation, LOS check, self-preservation (fleeing),
 * attacking (ranged then melee), and then moving towards the target with risk assessment.
 * @param {object} enemy - The enemy object in the ENGAGING_ENEMY state.
 * @returns {boolean} - True if an action was taken (attack, move, wait), false if re-evaluation is needed.
 */
function handleEngagingEnemyState(enemy) {
    // --- 1. Target Validation (Existence & Health) ---
    const target = enemy.targetEnemy;
    if (!target || target.hp <= 0) {
        console.log(`Enemy ${enemy.id} target invalid or defeated.`);
        enemy.targetEnemy = null;
        performReevaluation(enemy); // Re-evaluate situation
        return false; // Needs re-evaluation
    }

    // --- 2. Line of Sight (LOS) Check ---
    // Use hasClearLineOfSight and detectionRange to see if the engagement condition still holds
    if (!hasClearLineOfSight(enemy, target, enemy.detectionRange || AI_RANGE_MAX)) {
        console.log(`Enemy ${enemy.id} lost sight of target ${target.id || 'Player'}.`);
        enemy.targetEnemy = null;
        performReevaluation(enemy); // Re-evaluate situation
        return false; // Needs re-evaluation
    }

    // --- 3. Health Check (Self-Preservation) ---
    const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP); // Use player max as fallback
    if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
        console.log(`Enemy ${enemy.id} HP low (${enemy.hp}), transitioning to FLEEING from ${target.id || 'Player'}.`);
        enemy.state = AI_STATE_FLEEING;
        // Target remains the same, so Fleeing state knows who to flee from
        Game.logMessage(`Enemy ${enemy.id} health low, fleeing!`, LOG_CLASS_ENEMY_EVENT);
        return false; // State changed, needs re-evaluation in the new state next loop
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
        let knockbackMsg = ""; // Initialize knockback message part

        // --- Knockback Logic (Ranged) ---
        if (target.hp > 0) { // Only apply knockback if target survived
            const knockbackDest = calculateKnockbackDestination(enemy, target);
            // console.log(`[KB Debug AI Ranged] Attacker (${enemy.row},${enemy.col}), Target (${target.row},${target.col})`); // DEBUG REMOVED
            if (knockbackDest) {
                const { row: destRow, col: destCol } = knockbackDest;
                // console.log(`[KB Debug AI Ranged] Calculated Dest: (${destRow},${destCol})`); // DEBUG REMOVED
                // Check destination validity (bounds, terrain, occupancy)
                const isInBounds = destRow >= 0 && destRow < GRID_HEIGHT && destCol >= 0 && destCol < GRID_WIDTH;
                let isTerrainValid = false;
                if (isInBounds && mapData && mapData[destRow]) {
                    const tileType = mapData[destRow][destCol];
                    isTerrainValid = tileType !== TILE_WALL && tileType !== TILE_TREE;
                }
                let isOccupied = false;
                if (isInBounds && isTerrainValid) {
                    // Check player
                    if (typeof player !== 'undefined' && player.hp > 0 && player.row === destRow && player.col === destCol) {
                        isOccupied = true;
                    }
                    // Check other enemies
                    if (!isOccupied && typeof enemies !== 'undefined') {
                        for (const otherEnemy of enemies) {
                            // Check if it's a different, living enemy at the destination
                            if (otherEnemy && otherEnemy.hp > 0 && otherEnemy.id !== target.id && otherEnemy.row === destRow && otherEnemy.col === destCol) {
                                isOccupied = true;
                                break;
                            }
                        }
                    }
                }

                if (isInBounds && isTerrainValid && !isOccupied) {
                    // Game.logMessage(`${targetId} knocked back from (${target.row},${target.col}) to (${destRow},${destCol})!`, target === player ? LOG_CLASS_PLAYER_BAD : LOG_CLASS_ENEMY_EVENT); // REMOVED Redundant Log
                    // Use the new centralized function to update position and handle pickup
                    updateUnitPosition(target, destRow, destCol); // Call global function
                    knockbackMsg = ` ${targetId} knocked back to (${destRow},${destCol}).`; // Store success message
                    // Note: redrawCanvas happens at end of AI turn
                } else {
                    // Optional: Log why knockback failed
                    // console.log(`[KB Debug AI Ranged] Blocked: Bounds=${isInBounds}, Terrain=${isTerrainValid}, Occupied=${isOccupied}`); // DEBUG REMOVED
                    knockbackMsg = " Knockback blocked."; // Store blocked message
                }
            } else {
                 // console.log(`[KB Debug AI Ranged] calculateKnockbackDestination returned null.`); // DEBUG REMOVED
                 knockbackMsg = " Knockback calc error."; // Store error message
            }
        }
        // --- End Knockback Logic ---

        // Log combined attack and knockback message
        Game.logMessage(`Enemy ${enemy.id} shoots ${targetId} for ${damage} damage. (Ammo: ${enemy.resources.ammo})${knockbackMsg}`, LOG_CLASS_ENEMY_EVENT);


        if (target.hp <= 0) {
            console.log(`Enemy ${enemy.id} defeated target ${targetId}.`);
            // Game.logMessage(`Enemy ${enemy.id} defeated ${targetId}!`, LOG_CLASS_ENEMY_EVENT); // Defeat message handled by checkEndConditions now implicitly
            enemy.targetEnemy = null;
            performReevaluation(enemy); // Re-evaluate after kill
            return false; // Needs re-evaluation (find new target/state)
        }
        return true; // Action complete (attacked)
    }

    // Check 5: Melee Attack Possible?
    if (dist === 1) {
        const damage = AI_ATTACK_DAMAGE; // Use AI's damage
        target.hp -= damage;
        const targetId = target.id || 'Player';
        let knockbackMsg = ""; // Initialize knockback message part

        // --- Knockback Logic (Melee) ---
        if (target.hp > 0) { // Only apply knockback if target survived
            const knockbackDest = calculateKnockbackDestination(enemy, target);
            // console.log(`[KB Debug AI Melee] Attacker (${enemy.row},${enemy.col}), Target (${target.row},${target.col})`); // DEBUG REMOVED
            if (knockbackDest) {
                const { row: destRow, col: destCol } = knockbackDest;
                // console.log(`[KB Debug AI Melee] Calculated Dest: (${destRow},${destCol})`); // DEBUG REMOVED
                // Check destination validity (bounds, terrain, occupancy)
                const isInBounds = destRow >= 0 && destRow < GRID_HEIGHT && destCol >= 0 && destCol < GRID_WIDTH;
                let isTerrainValid = false;
                if (isInBounds && mapData && mapData[destRow]) {
                    const tileType = mapData[destRow][destCol];
                    isTerrainValid = tileType !== TILE_WALL && tileType !== TILE_TREE;
                }
                let isOccupied = false;
                if (isInBounds && isTerrainValid) {
                    // Check player
                    if (typeof player !== 'undefined' && player.hp > 0 && player.row === destRow && player.col === destCol) {
                        isOccupied = true;
                    }
                    // Check other enemies
                    if (!isOccupied && typeof enemies !== 'undefined') {
                        for (const otherEnemy of enemies) {
                            // Check if it's a different, living enemy at the destination
                            if (otherEnemy && otherEnemy.hp > 0 && otherEnemy.id !== target.id && otherEnemy.row === destRow && otherEnemy.col === destCol) {
                                isOccupied = true;
                                break;
                            }
                        }
                    }
                }

                if (isInBounds && isTerrainValid && !isOccupied) {
                    // Game.logMessage(`${targetId} knocked back from (${target.row},${target.col}) to (${destRow},${destCol})!`, target === player ? LOG_CLASS_PLAYER_BAD : LOG_CLASS_ENEMY_EVENT); // REMOVED Redundant Log
                    // Use the new centralized function to update position and handle pickup
                    updateUnitPosition(target, destRow, destCol); // Call global function
                    knockbackMsg = ` ${targetId} knocked back to (${destRow},${destCol}).`; // Store success message
                    // Note: redrawCanvas happens at end of AI turn
                } else {
                    // Optional: Log why knockback failed
                     // console.log(`[KB Debug AI Melee] Blocked: Bounds=${isInBounds}, Terrain=${isTerrainValid}, Occupied=${isOccupied}`); // DEBUG REMOVED
                     knockbackMsg = " Knockback blocked."; // Store blocked message
                }
            } else {
                 // console.log(`[KB Debug AI Melee] calculateKnockbackDestination returned null.`); // DEBUG REMOVED
                 knockbackMsg = " Knockback calc error."; // Store error message
            }
        }
        // --- End Knockback Logic ---

        // Log combined attack and knockback message
        Game.logMessage(`Enemy ${enemy.id} melees ${targetId} for ${damage} damage.${knockbackMsg}`, LOG_CLASS_ENEMY_EVENT);

        if (target.hp <= 0) {
            console.log(`Enemy ${enemy.id} defeated target ${targetId}.`);
             // Game.logMessage(`Enemy ${enemy.id} defeated ${targetId}!`, LOG_CLASS_ENEMY_EVENT); // Defeat message handled by checkEndConditions now implicitly
            enemy.targetEnemy = null;
            performReevaluation(enemy); // Re-evaluate after kill
            return false; // Needs re-evaluation (find new target/state)
        }
        return true; // Action complete (attacked)
    }

    // --- 5. Movement Logic (If No Attack Occurred) ---
    // Pre-condition: Target valid, visible, AI healthy, AI has ammo (for ranged), but no attack was possible

    // A. Get Valid Moves
    const possibleMoves = getValidMoves(enemy);
    if (possibleMoves.length === 0) {
        Game.logMessage(`Enemy ${enemy.id} is blocked while engaging ${target.id || 'Player'} and waits.`, LOG_CLASS_ENEMY_EVENT);
        return true; // Wait action
    }

    // B. Identify Best Moves Towards Target
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
    // Combine potential candidates, prioritizing closer moves
    let potentialCandidates = [...closerMoves, ...sidewaysMoves];

    // C. Filter for Safety (Avoid *Known* OTHER Enemies)
    let knownOtherThreats = [];
    // Identify all other potential threats the current enemy can see
    const allVisibleThreats = [player, ...enemies].filter(potentialThreat =>
        potentialThreat &&                                  // Exists
        potentialThreat.hp > 0 &&                           // Alive
        potentialThreat !== enemy &&                        // Not self
        potentialThreat !== target &&                       // Not the primary target
        hasClearLineOfSight(enemy, potentialThreat, enemy.detectionRange || AI_RANGE_MAX) // Visible
    );

    let safeCandidateMoves = [];
    for (const move of potentialCandidates) {
        let isSafe = true;
        // Check if this move lands adjacent to any VISIBLE OTHER threat
        for (const otherThreat of allVisibleThreats) {
            const adjacent = Math.abs(move.row - otherThreat.row) <= 1 && Math.abs(move.col - otherThreat.col) <= 1;
            if (adjacent) {
                isSafe = false;
                // console.log(`DEBUG: Move (${move.row},${move.col}) rejected, adjacent to other threat ${otherThreat.id || 'Player'}`); // Optional Debug
                break; // No need to check other threats for this move
            }
        }
        if (isSafe) {
            safeCandidateMoves.push(move);
        }
    }

    // If no safe moves are found among the candidates, the AI might have to wait or take a non-optimal move (currently falls through to wait)
    if (safeCandidateMoves.length === 0) {
         // If the original candidates weren't empty, but filtering made it empty, log specific reason
         if (potentialCandidates.length > 0) {
              Game.logMessage(`Enemy ${enemy.id} avoids moving closer to ${target.id || 'Player'} due to nearby known threats.`, LOG_CLASS_ENEMY_EVENT);
         } else {
              // This case should be rare if possibleMoves was > 0, means no closer/sideways moves existed initially
              Game.logMessage(`Enemy ${enemy.id} cannot find a suitable move towards ${target.id || 'Player'} and waits.`, LOG_CLASS_ENEMY_EVENT);
         }
         return true; // Wait action
    }

    // D. Filter for LOS Maintenance (Prefer Keeping Sight of Primary Target)
    let losMaintainingMoves = [];
    for (const move of safeCandidateMoves) {
        // Simulate enemy position at the move location
        const tempEnemyPos = { row: move.row, col: move.col };
        // Check if LOS to the *primary target* would be maintained from that position
        if (hasClearLineOfSight(tempEnemyPos, target, enemy.detectionRange || AI_RANGE_MAX)) {
            losMaintainingMoves.push(move);
        }
    }

    let finalCandidates = [];
    if (losMaintainingMoves.length > 0) {
        finalCandidates = losMaintainingMoves;
    } else {
        // Fallback to safe moves even if they break LOS
        finalCandidates = safeCandidateMoves;
    }

    // E. Select Final Candidate Move
    let chosenMove = null;
    if (finalCandidates.length > 0) {
        // Re-prioritize closer moves among the final candidates
        let finalCloserMoves = [];
        let finalSidewaysMoves = [];
        for (const move of finalCandidates) {
             const newDist = Math.abs(target.row - move.row) + Math.abs(target.col - move.col);
             if (newDist < currentDist) {
                 finalCloserMoves.push(move);
             } else if (newDist === currentDist) {
                 finalSidewaysMoves.push(move);
             }
        }

        if (finalCloserMoves.length > 0) {
            // Pick randomly among the best closer moves
            chosenMove = finalCloserMoves[Math.floor(Math.random() * finalCloserMoves.length)];
        } else if (finalSidewaysMoves.length > 0) {
            // Pick randomly among the sideways moves
            chosenMove = finalSidewaysMoves[Math.floor(Math.random() * finalSidewaysMoves.length)];
        }
        // If somehow chosenMove is still null here, it means finalCandidates only contained moves further away, which shouldn't happen based on B.
        // If it does, the AI will fall through to waiting.
    }

    // F. Risk Assessment (On Chosen Move)
    let isRisky = false;
    if (chosenMove) {
        // Check if the primary target can attack the chosen move destination
        const canTargetAttack = target.resources && target.resources.ammo > 0; // Assumes target needs ammo
        let targetHasLOSToMove = false;
        if (canTargetAttack) {
            // Use accurate LOS check for risk assessment
            targetHasLOSToMove = hasClearLineOfSight(target, chosenMove, RANGED_ATTACK_RANGE);
        }
        isRisky = canTargetAttack && targetHasLOSToMove;
    }

    // G. Risk Aversion (Probabilistic Hesitation)
    if (chosenMove && isRisky) {
        const rand = Math.random();
        // Use the globally defined constant (assuming it exists in config.js or similar)
        if (rand < (typeof AI_ENGAGE_RISK_AVERSION_CHANCE !== 'undefined' ? AI_ENGAGE_RISK_AVERSION_CHANCE : 0.3)) {
            Game.logMessage(`Enemy ${enemy.id} hesitates moving to (${chosenMove.row}, ${chosenMove.col}) due to risk from ${target.id || 'Player'}.`, LOG_CLASS_ENEMY_EVENT);
            return true; // Wait action (hesitated)
        }
    }

    // H. Execute Move
    if (chosenMove && (!isRisky || (isRisky /* && risk accepted - implicitly handled by not returning in G */))) {
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) moves towards target ${target.id || 'Player'} to (${chosenMove.row},${chosenMove.col}).`, LOG_CLASS_ENEMY_EVENT);
        // Use the new centralized function to update position and handle pickup
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col); // Call global function
        return true; // Move action complete
    }

    // --- 6. Default/Wait (Fallback) ---
    // Fallback if no move was chosen (e.g., no safe moves, or hesitated)
    Game.logMessage(`Enemy ${enemy.id} waits (engaging ${target.id || 'Player'}).`, LOG_CLASS_ENEMY_EVENT);
    return true; // Wait action complete
}
