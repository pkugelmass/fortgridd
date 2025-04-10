// AI Movement Helpers (Validation, Execution, Knockback)
console.log("ai_movement.js loaded");

/**
 * Finds valid adjacent land cells for a unit to move into.
 * @param {object} unit - The unit (player or enemy) with {row, col}.
 * @returns {Array<object>} - An array of {row, col} objects for valid moves (within map bounds, correct tile type, unoccupied, and inside safe zone).
 */
function getValidMoves(unit) {
    const possibleMoves = [];
    const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    const safeZone = Game.getSafeZone(); // Get current safe zone boundaries

    for (const dir of directions) {
        const targetRow = unit.row + dir.dr;
        const targetCol = unit.col + dir.dc;

        // 1. Check Map Boundaries
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            // 2. Check Safe Zone Boundaries
            if (targetRow >= safeZone.minRow && targetRow <= safeZone.maxRow && targetCol >= safeZone.minCol && targetCol <= safeZone.maxCol) {
                // 3. Check Tile Type (Allow LAND, MEDKIT, AMMO)
                if (typeof mapData !== 'undefined' && mapData[targetRow]) {
                    const tileType = mapData[targetRow][targetCol];
                    if (tileType === TILE_LAND || tileType === TILE_MEDKIT || tileType === TILE_AMMO) {
                        // 4. Check Occupancy
                        let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol);
                        let occupiedByOtherEnemy = false;
                        if (enemies && enemies.length > 0) {
                    for (const otherEnemy of enemies) {
                        if (!otherEnemy || (unit.id && otherEnemy.id === unit.id) || otherEnemy.hp <= 0) continue; // Skip self or dead
                        if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) {
                            occupiedByOtherEnemy = true;
                                    break;
                                }
                            }
                        }
                        if (!occupiedByPlayer && !occupiedByOtherEnemy) {
                            possibleMoves.push({ row: targetRow, col: targetCol }); // All checks passed
                        }
                    } // End check for valid tile types
                } else if (typeof mapData === 'undefined' || !mapData[targetRow]) {
                     console.error("getValidMoves: mapData error at row", targetRow);
                } // End check for valid map data row
            } // End check for safe zone
        } // End check for map boundaries
    }
    return possibleMoves;
}

/**
 * Moves the enemy one step towards the target coordinates.
 * @param {object} enemy - The enemy object to move.
 * @param {number} targetRow - The target row.
 * @param {number} targetCol - The target column.
 * @param {string} logReason - A short string describing why the enemy is moving (e.g., "safety", "center", "resource").
 * @returns {boolean} - True if the enemy moved (or attempted a random fallback move), false if truly blocked.
 */
function moveTowards(enemy, targetRow, targetCol, logReason) {
    const possibleMoves = getValidMoves(enemy);
    if (possibleMoves.length === 0) {
        // Game.logMessage(`Enemy ${enemy.id} cannot move towards ${logReason} (no valid moves).`, LOG_CLASS_ENEMY_EVENT); // Optional: Log why it's stuck
        return false; // No valid moves at all
    }

    const currentDistance = Math.abs(targetRow - enemy.row) + Math.abs(targetCol - enemy.col);
    let closerMoves = [];
    let sidewaysMoves = [];

    // Categorize valid moves
    for (const move of possibleMoves) {
        const newDist = Math.abs(targetRow - move.row) + Math.abs(targetCol - move.col);
        if (newDist < currentDistance) {
            closerMoves.push({ move: move, distance: newDist });
        } else if (newDist === currentDistance) {
            sidewaysMoves.push(move);
        }
    }

    let chosenMove = null;

    // 1. Prioritize closer moves
    if (closerMoves.length > 0) {
        // Find the best among closer moves (minimum distance)
        closerMoves.sort((a, b) => a.distance - b.distance);
        chosenMove = closerMoves[0].move;
        // Game.logMessage(`Enemy ${enemy.id} choosing closer move towards ${logReason}.`, LOG_CLASS_DEBUG); // Debug log
    }
    // 2. If no closer moves, consider sideways moves
    else if (sidewaysMoves.length > 0) {
        // Pick a random sideways move to avoid bias/loops
        chosenMove = sidewaysMoves[Math.floor(Math.random() * sidewaysMoves.length)];
        // Game.logMessage(`Enemy ${enemy.id} choosing sideways move towards ${logReason}.`, LOG_CLASS_DEBUG); // Debug log
    }

    // 3. Execute chosen move (closer or sideways)
    if (chosenMove) {
        // Log message includes the STARTING position before the move
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) moves towards ${logReason} to (${chosenMove.row},${chosenMove.col}).`, LOG_CLASS_ENEMY_EVENT);
        // Use the new centralized function to update position and handle pickup
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col); // Call global function
        return true;
    }

    // 4. Fallback: No closer or sideways move possible. Indicate failure to move towards target.
    // Game.logMessage(`Enemy ${enemy.id} blocked towards ${logReason}, cannot move closer/sideways.`, LOG_CLASS_DEBUG); // Debug log
    return false; // Indicate no move towards the target was made
}

/**
 * Moves the enemy to a random valid adjacent cell.
 * @param {object} enemy - The enemy object to move.
 * @returns {boolean} - True if the enemy moved, false otherwise.
 */
function moveRandomly(enemy) {
    const possibleMoves = getValidMoves(enemy);
    if (possibleMoves.length > 0) {
        const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        // Log message includes the STARTING position before the move
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) moves randomly to (${chosenMove.row},${chosenMove.col}).`, LOG_CLASS_ENEMY_EVENT);
        // Use the new centralized function to update position and handle pickup
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col); // Call global function
        return true;
    }
    // Log failure to move randomly only if it was attempted as a fallback (e.g., from moveTowards)
    // Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) cannot move randomly (no valid moves).`, LOG_CLASS_ENEMY_EVENT);
    return false; // No valid moves
}

/**
 * Checks if a potential move destination is considered "safe" for an enemy.
 * Safe means the destination is not adjacent to any other known (visible) threats
 * (excluding the enemy itself and its primary target).
 * @param {object} enemy - The enemy considering the move.
 * @param {number} targetRow - The row of the potential move destination.
 * @param {number} targetCol - The column of the potential move destination.
 * @returns {boolean} - True if the move is considered safe, false otherwise.
 */
function isMoveSafe(enemy, targetRow, targetCol) {
    const primaryTarget = enemy.targetEnemy; // The enemy being focused on (e.g., fleeing from or engaging)

    // Combine player and enemies into a list of potential threats
    const potentialThreats = [];
    if (typeof player !== 'undefined' && player.hp > 0) {
        potentialThreats.push(player);
    }
    if (typeof enemies !== 'undefined') {
        potentialThreats.push(...enemies);
    }

    for (const threat of potentialThreats) {
        // Skip if threat is invalid, dead, the enemy itself, or the primary target
        if (!threat || threat.hp <= 0 || threat === enemy || (primaryTarget && threat === primaryTarget)) { // Ensure primaryTarget exists before comparing
            continue;
        }

        // Check if the enemy can actually see this other threat
        // Assumes hasClearLineOfSight is available (loaded before this script)
        if (typeof hasClearLineOfSight === 'function' && hasClearLineOfSight(enemy, threat, enemy.detectionRange || AI_RANGE_MAX)) {
            // Check if the potential move is adjacent to this visible threat
            const adjacent = Math.abs(targetRow - threat.row) <= 1 && Math.abs(targetCol - threat.col) <= 1;
            if (adjacent) {
                console.error(`[isMoveSafe ERROR] Adjacent and visible threat found: ${threat.id || 'Player'}. Returning false.`); // Add ERROR log
                return false; // Move is not safe
            }
        }
    }

    return true; // No adjacent visible threats found, move is safe
}


/**
 * Calculates the potential destination tile for knockback based on attacker/target positions.
 * Pushes 1 tile directly away from the attacker.
 * @param {object} attacker - The unit initiating the attack ({row, col}).
 * @param {object} target - The unit being hit ({row, col}).
 * @returns {object|null} - Coordinates {row, col} of the tile the target would be pushed to, or null if input is invalid.
 */
function calculateKnockbackDestination(attacker, target) {
    // DEBUG: Log input coordinates - REMOVED
    // console.log(`[KB Calc Input] Attacker: (${attacker?.row}, ${attacker?.col}), Target: (${target?.row}, ${target?.col})`);

    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null) {
        console.error("calculateKnockbackDestination: Invalid attacker or target position.");
        return null; // Indicate error or invalid input
    }

    const dr = target.row - attacker.row;
    const dc = target.col - attacker.col;

    // Determine the push direction vector (sign of the difference)
    // This pushes directly away, including diagonals
    let pushDr = Math.sign(dr);
    let pushDc = Math.sign(dc);

    // Handle the case where attacker and target are somehow in the same spot
    // (shouldn't happen for attacks, but defensive check)
    if (pushDr === 0 && pushDc === 0) {
         // Default push direction if calculation fails (e.g., push down)
         console.warn("calculateKnockbackDestination: Attacker and target at same position? Defaulting push direction.");
         pushDr = 1;
    }

    // Calculate the destination tile
    const destinationRow = target.row + pushDr;
    const destinationCol = target.col + pushDc;

    // console.log(`Knockback Calc: Attacker (${attacker.row},${attacker.col}), Target (${target.row},${target.col}) -> Push (${pushDr},${pushDc}) -> Dest (${destinationRow},${destinationCol})`); // Debug

    return { row: destinationRow, col: destinationCol };
}
