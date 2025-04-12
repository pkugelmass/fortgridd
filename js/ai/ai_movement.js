// AI Movement Helpers (Validation, Execution, Knockback)
// console.log("ai_movement.js loaded"); // Removed module loaded log

/**
 * Finds valid adjacent cells for a unit to move into based on gameState.
 * @param {object} unit - The unit (player or enemy) with {row, col, id}.
 * @param {GameState} gameState - The current game state.
 * @returns {Array<object>} - An array of {row, col} objects for valid moves.
 */
function getValidMoves(unit, gameState) {
    const possibleMoves = [];
    if (!unit || !gameState || !gameState.mapData || !gameState.safeZone || !gameState.player || !gameState.enemies) {
        Game.logMessage("getValidMoves: Missing unit or required gameState properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return possibleMoves; // Return empty array if critical data is missing
    }

    const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    const { mapData, safeZone, player, enemies } = gameState; // Destructure for readability
    // Assume config constants like GRID_HEIGHT, GRID_WIDTH, TILE_* are globally available for now

    for (const dir of directions) {
        const targetRow = unit.row + dir.dr;
        const targetCol = unit.col + dir.dc;

        // 1. Check Map Boundaries
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            // 2. Check Safe Zone Boundaries
            if (targetRow >= safeZone.minRow && targetRow <= safeZone.maxRow && targetCol >= safeZone.minCol && targetCol <= safeZone.maxCol) {
                // 3. Check Tile Type (Allow LAND, MEDKIT, AMMO)
                if (mapData[targetRow]) { // Check row exists
                    const tileType = mapData[targetRow][targetCol];
                    if (tileType === TILE_LAND || tileType === TILE_MEDKIT || tileType === TILE_AMMO) {
                        // 4. Check Occupancy (using gameState.player and gameState.enemies)
                        let occupiedByPlayer = (player.hp > 0 && player.row === targetRow && player.col === targetCol);
                        let occupiedByOtherEnemy = false;
                        for (const otherEnemy of enemies) {
                            // Skip self, dead enemies, or invalid enemy objects
                            if (!otherEnemy || (unit.id && otherEnemy.id === unit.id) || otherEnemy.hp <= 0) continue;
                            if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) {
                                occupiedByOtherEnemy = true;
                                break;
                            }
                        }
                        if (!occupiedByPlayer && !occupiedByOtherEnemy) {
                            possibleMoves.push({ row: targetRow, col: targetCol }); // All checks passed
                        }
                    } // End check for valid tile types
                } else {
                     Game.logMessage(`getValidMoves: mapData error at row ${targetRow}`, gameState, { level: 'ERROR', target: 'CONSOLE' });
                } // End check for valid map data row
            } // End check for safe zone
        } // End check for map boundaries
    }
    return possibleMoves;
}

/**
 * Moves the enemy one step towards the target coordinates, using gameState.
 * @param {object} enemy - The enemy object to move.
 * @param {number} targetRow - The target row.
 * @param {number} targetCol - The target column.
 * @param {string} logReason - A short string describing why the enemy is moving.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if the enemy moved, false otherwise.
 */
async function moveTowards(enemy, targetRow, targetCol, logReason, gameState) {
    // Pass gameState to getValidMoves
    const possibleMoves = getValidMoves(enemy, gameState);
    if (possibleMoves.length === 0) {
        Game.logMessage(`Enemy ${enemy.id} cannot move towards ${logReason} (no valid moves).`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        return false;
    }

    const currentDistance = Math.abs(targetRow - enemy.row) + Math.abs(targetCol - enemy.col);
    let closerMoves = [];
    let sidewaysMoves = [];

    for (const move of possibleMoves) {
        const newDist = Math.abs(targetRow - move.row) + Math.abs(targetCol - move.col);
        if (newDist < currentDistance) {
            closerMoves.push({ move: move, distance: newDist });
        } else if (newDist === currentDistance) {
            sidewaysMoves.push(move);
        }
    }

    let chosenMove = null;

    if (closerMoves.length > 0) {
        closerMoves.sort((a, b) => a.distance - b.distance);
        chosenMove = closerMoves[0].move;
    } else if (sidewaysMoves.length > 0) {
        chosenMove = sidewaysMoves[Math.floor(Math.random() * sidewaysMoves.length)];
    }

    if (chosenMove) {
        // Pass gameState to logMessage
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) moves towards ${logReason} to (${chosenMove.row},${chosenMove.col}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        // Await movement animation before updating position
        if (typeof window !== "undefined" && window.Effects && typeof window.Effects.triggerMovementEffect === "function") {
            await window.Effects.triggerMovementEffect({
                unit: enemy,
                from: { row: enemy.row, col: enemy.col },
                to: { row: chosenMove.row, col: chosenMove.col },
                color: enemy.isPlayer ? "#007bff" : "#ff0000"
            });
        }
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col, gameState);
        return true;
    }

    return false;
}

/**
 * Moves the enemy to a random valid adjacent cell, using gameState.
 * @param {object} enemy - The enemy object to move.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if the enemy moved, false otherwise.
 */
async function moveRandomly(enemy, gameState) {
    // Pass gameState to getValidMoves
    const possibleMoves = getValidMoves(enemy, gameState);
    if (possibleMoves.length > 0) {
        const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        // Pass gameState to logMessage
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) moves randomly to (${chosenMove.row},${chosenMove.col}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        // Await movement animation before updating position
        if (typeof window !== "undefined" && window.Effects && typeof window.Effects.triggerMovementEffect === "function") {
            await window.Effects.triggerMovementEffect({
                unit: enemy,
                from: { row: enemy.row, col: enemy.col },
                to: { row: chosenMove.row, col: chosenMove.col },
                color: enemy.isPlayer ? "#007bff" : "#ff0000"
            });
        }
        updateUnitPosition(enemy, chosenMove.row, chosenMove.col, gameState);
        return true;
    }
    return false;
}

/**
 * Checks if a potential move destination is considered "safe" for an enemy, using gameState.
 * Safe means not adjacent to other known (visible) threats (excluding self and primary target).
 * @param {object} enemy - The enemy considering the move.
 * @param {number} targetRow - The row of the potential move destination.
 * @param {number} targetCol - The column of the potential move destination.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if the move is considered safe, false otherwise.
 */
function isMoveSafe(enemy, targetRow, targetCol, gameState) {
    if (!enemy || !gameState || !gameState.player || !gameState.enemies) {
        Game.logMessage("isMoveSafe: Missing enemy or required gameState properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return false; // Cannot determine safety without full state
    }
    const primaryTarget = enemy.targetEnemy;
    const { player, enemies } = gameState; // Destructure

    // Combine player and enemies into a list of potential threats
    const potentialThreats = [];
    if (player.hp > 0) {
        potentialThreats.push(player);
    }
    potentialThreats.push(...enemies); // Add all enemies from gameState

    for (const threat of potentialThreats) {
        // Skip if threat is invalid, dead, the enemy itself, or the primary target
        if (!threat || threat.hp <= 0 || threat === enemy || (primaryTarget && threat === primaryTarget)) {
            continue;
        }

        // Check visibility (anticipating hasClearLineOfSight needing gameState)
        // Assume AI_RANGE_MAX is globally available for now
        if (typeof hasClearLineOfSight === 'function' && hasClearLineOfSight(enemy, threat, enemy.detectionRange || AI_RANGE_MAX, gameState)) {
            // Check adjacency
            const adjacent = Math.abs(targetRow - threat.row) <= 1 && Math.abs(targetCol - threat.col) <= 1;
            if (adjacent) {
                Game.logMessage(`[isMoveSafe] Move to (${targetRow},${targetCol}) unsafe due to adjacent visible threat: ${threat.id || 'Player'} at (${threat.row},${threat.col})`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
                return false; // Move is not safe
            }
        }
    }

    return true; // No adjacent visible threats found
}

// calculateKnockbackDestination function moved to js/utils.js (2025-04-10)
