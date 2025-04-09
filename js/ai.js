console.log("ai.js loaded");

// --- AI Configuration ---
// Detection range now stored per enemy in the 'enemies' array objects

// Array to hold all enemy objects
let enemies = [];

// --- AI Line of Sight Helper ---
/**
 * Checks if an attacker has a clear cardinal (non-diagonal) line of sight to a target.
 * @param {object} attacker - The enemy object shooting ({row, col}).
 * @param {object} target - The target object ({row, col}).
 * @param {number} maxRange - The maximum range to check (from config.js).
 * @returns {boolean} - True if line of sight is clear, false otherwise.
 */
function canShootTarget(attacker, target, maxRange) {
    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof GRID_WIDTH === 'undefined') {
        console.error("canShootTarget: Missing critical data or invalid unit positions."); return false;
    }
    const dr = target.row - attacker.row; const dc = target.col - attacker.col; const dist = Math.abs(dr) + Math.abs(dc);
    if (dist === 0 || dist > maxRange) { return false; } if (dr !== 0 && dc !== 0) { return false; } // Not cardinal
    const stepR = Math.sign(dr); const stepC = Math.sign(dc);
    for (let i = 1; i < dist; i++) { // Check cells between
        const checkRow = attacker.row + stepR * i; const checkCol = attacker.col + stepC * i;
        if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { return false; }
        if (mapData && mapData[checkRow]){ const tileType = mapData[checkRow][checkCol]; if (tileType === TILE_WALL || tileType === TILE_TREE) { return false; } }
        else { console.error("mapData issue during LoS check at row", checkRow); return false; }
    }
    return true; // LoS is clear
}


// --- AI Turn Logic --- (Uses Game.logMessage with classes)

/**
 * Executes turns for all AI enemies. Logs actions with CSS classes.
 * Executes turns for all AI enemies based on their current state.
 * Calls the appropriate state handler function for each enemy.
 */
function executeAiTurns() {
    if (typeof Game === 'undefined' || Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        if (typeof Game !== 'undefined' && !Game.isGameOver() && Game.getCurrentTurn() === 'ai') {
            Game.endAiTurn(); // Ensure turn ends even if AI logic is skipped
        }
        return;
    }

    const currentEnemiesTurnOrder = [...enemies]; // Iterate over a snapshot

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        const enemy = enemies.find(e => e.id === currentEnemiesTurnOrder[i].id); // Find current enemy in main array
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip if invalid/dead

        // --- FSM Logic ---
        // Call the handler function corresponding to the enemy's current state
        switch (enemy.state) {
            case AI_STATE_EXPLORING:
                handleExploringState(enemy);
                break;
            case AI_STATE_SEEKING_RESOURCES:
                handleSeekingResourcesState(enemy);
                break;
            case AI_STATE_ENGAGING_ENEMY:
                handleEngagingEnemyState(enemy);
                break;
            case AI_STATE_FLEEING:
                handleFleeingState(enemy);
                break;
            default:
                console.warn(`Enemy ${enemy.id} has unknown state: ${enemy.state}`);
                // Optionally default to exploring or just log
                handleExploringState(enemy); // Default to exploring for now
                break;
        }

        // Check end conditions after each enemy acts (important if an enemy action ends the game)
        if (Game.checkEndConditions()) return;

    } // End loop through enemies

    // End AI turn only if game didn't end during loop
    if (!Game.isGameOver()) {
        Game.endAiTurn(); // Handles setting turn and redraw if needed
    }
    // If game ended, final redraw already handled by setGameOver or checks above

} // End executeAiTurns

// --- AI State Handlers ---

/**
 * Finds valid adjacent land cells for a unit to move into.
 * @param {object} unit - The unit (player or enemy) with {row, col}.
 * @returns {Array<object>} - An array of {row, col} objects for valid moves.
 */
function getValidMoves(unit) {
    const possibleMoves = [];
    const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

    for (const dir of directions) {
        const targetRow = unit.row + dir.dr;
        const targetCol = unit.col + dir.dc;

        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            if (typeof mapData !== 'undefined' && mapData[targetRow] && mapData[targetRow][targetCol] === TILE_LAND) {
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
                    possibleMoves.push({ row: targetRow, col: targetCol });
                }
            } else if (typeof mapData === 'undefined' || !mapData[targetRow]) {
                 console.error("getValidMoves: mapData error at row", targetRow);
            }
        }
    }
    return possibleMoves;
}

/**
 * Finds the nearest visible enemy (player or other AI) within detection range.
 * Uses simple distance and basic LOS check (canShootTarget).
 * @param {object} enemy - The searching enemy object.
 * @returns {object|null} - The nearest visible enemy object or null if none found.
 */
function findNearestVisibleEnemy(enemy) {
    let nearestEnemy = null;
    let minDistance = Infinity;
    const detectionRange = enemy.detectionRange || AI_RANGE_MAX; // Use specific or fallback

    // Check player first
    if (typeof player !== 'undefined' && player.hp > 0 && player.row !== null) {
        const dist = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);
        if (dist <= detectionRange && dist < minDistance) {
            // Basic LOS check - can be improved later if needed
            if (canShootTarget(enemy, player, detectionRange)) { // Using canShootTarget for LOS for now
                 minDistance = dist;
                 nearestEnemy = player;
            }
        }
    }

    // Check other enemies
    if (typeof enemies !== 'undefined') {
        for (const otherEnemy of enemies) {
            if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue;
            const dist = Math.abs(otherEnemy.row - enemy.row) + Math.abs(otherEnemy.col - enemy.col);
            if (dist <= detectionRange && dist < minDistance) {
                 if (canShootTarget(enemy, otherEnemy, detectionRange)) { // Using canShootTarget for LOS for now
                    minDistance = dist;
                    nearestEnemy = otherEnemy;
                 }
            }
        }
    }
    return nearestEnemy;
}

/**
 * Finds the nearest specified resource tile within a given range.
 * @param {object} enemy - The searching enemy object.
 * @param {number} range - The maximum search distance (Manhattan distance).
 * @param {number} resourceTileType - The TILE_* constant for the resource.
 * @returns {object|null} - The coordinates {row, col} of the nearest resource, or null.
 */
function findNearbyResource(enemy, range, resourceTileType) {
    let nearestResource = null;
    let minDistance = Infinity;

    // Simple square scan around the enemy
    for (let r = Math.max(0, enemy.row - range); r <= Math.min(GRID_HEIGHT - 1, enemy.row + range); r++) {
        for (let c = Math.max(0, enemy.col - range); c <= Math.min(GRID_WIDTH - 1, enemy.col + range); c++) {
            const dist = Math.abs(r - enemy.row) + Math.abs(c - enemy.col);
            if (dist <= range && dist < minDistance) {
                if (mapData && mapData[r] && mapData[r][c] === resourceTileType) {
                    minDistance = dist;
                    nearestResource = { row: r, col: c };
                }
            }
        }
    }
    return nearestResource;
}

/**
 * Calculates the approximate center of the current safe zone.
 * @returns {object} - Coordinates {row, col} of the center.
 */
function getSafeZoneCenter() {
    const zone = Game.getSafeZone();
    return {
        row: Math.floor((zone.minRow + zone.maxRow) / 2),
        col: Math.floor((zone.minCol + zone.maxCol) / 2)
    };
}

/**
 * Moves the enemy one step towards the target coordinates.
 * @param {object} enemy - The enemy object to move.
 * @param {number} targetRow - The target row.
 * @param {number} targetCol - The target column.
 * @param {string} logReason - A short string describing why the enemy is moving (e.g., "safety", "center").
 * @returns {boolean} - True if the enemy moved, false otherwise.
 */
function moveTowards(enemy, targetRow, targetCol, logReason) {
    const possibleMoves = getValidMoves(enemy);
    if (possibleMoves.length === 0) return false; // No valid moves

    let bestMove = null;
    let minDistance = Math.abs(targetRow - enemy.row) + Math.abs(targetCol - enemy.col);

    for (const move of possibleMoves) {
        const newDist = Math.abs(targetRow - move.row) + Math.abs(targetCol - move.col);
        if (newDist < minDistance) {
            minDistance = newDist;
            bestMove = move;
        }
    }

    // If no move gets closer, pick a random valid move (might happen if target is unreachable)
    // Or if already adjacent? For now, just move if a closer step exists.
    if (bestMove) {
        Game.logMessage(`Enemy ${enemy.id} moves towards ${logReason} to (${bestMove.row},${bestMove.col}).`, LOG_CLASS_ENEMY_EVENT);
        enemy.row = bestMove.row;
        enemy.col = bestMove.col;
        return true;
    }
    return false; // No move found that gets closer
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
        Game.logMessage(`Enemy ${enemy.id} moves randomly to (${chosenMove.row},${chosenMove.col}).`, LOG_CLASS_ENEMY_EVENT);
        enemy.row = chosenMove.row;
        enemy.col = chosenMove.col;
        return true;
    }
    return false; // No valid moves
}


/**
 * Handles AI logic when in the EXPLORING state.
 * Priority: Threats -> Critical Needs -> Storm Safety -> Proactive Needs -> Default Move/Wait.
 * @param {object} enemy - The enemy object.
 */
function handleExploringState(enemy) {
    let acted = false; // Track if an action/transition occurred this turn

    // 1. Threat Assessment
    const nearestEnemy = findNearestVisibleEnemy(enemy);
    if (nearestEnemy) {
        const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP); // Use player max HP as fallback if AI maxHp not set
        if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
            enemy.state = AI_STATE_FLEEING;
            enemy.targetEnemy = nearestEnemy; // Remember who to flee from
            Game.logMessage(`Enemy ${enemy.id} sees ${nearestEnemy.id || 'Player'} and decides to flee (low HP)!`, LOG_CLASS_ENEMY_EVENT);
            acted = true;
        } else {
            enemy.state = AI_STATE_ENGAGING_ENEMY;
            enemy.targetEnemy = nearestEnemy;
            Game.logMessage(`Enemy ${enemy.id} sees ${nearestEnemy.id || 'Player'} and decides to engage!`, LOG_CLASS_ENEMY_EVENT);
            acted = true;
        }
    }

    // 2. Critical Resource Check (Only if no threat detected)
    if (!acted) {
        const needsMedkit = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP) < AI_SEEK_HEALTH_THRESHOLD;
        const needsAmmo = enemy.resources.ammo <= 0; // Assuming resources.ammo exists

        if (needsMedkit || needsAmmo) {
            const resourceType = needsMedkit ? TILE_MEDKIT : TILE_AMMO;
            const resourceRange = enemy.detectionRange || AI_RANGE_MAX; // Use detection range for critical needs
            const nearbyResource = findNearbyResource(enemy, resourceRange, resourceType);

            if (nearbyResource) {
                enemy.state = AI_STATE_SEEKING_RESOURCES;
                enemy.targetResourceCoords = nearbyResource;
                const resourceName = resourceType === TILE_MEDKIT ? 'Medkit' : 'Ammo';
                Game.logMessage(`Enemy ${enemy.id} needs ${resourceName} and spots one nearby.`, LOG_CLASS_ENEMY_EVENT);
                acted = true;
            }
        }
    }

    // 3. Default Action (Only if no threat or critical need transition)
    if (!acted) {
        const zone = Game.getSafeZone();
        const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;

        // 3a. Storm Safety
        if (isOutside) {
            const center = getSafeZoneCenter();
            if (moveTowards(enemy, center.row, center.col, "safety")) {
                acted = true;
            } else {
                 // If couldn't move towards safety, try random move to maybe get unstuck
                 if (moveRandomly(enemy)) {
                     acted = true;
                 } else {
                     Game.logMessage(`Enemy ${enemy.id} waits (stuck in storm).`, LOG_CLASS_ENEMY_EVENT);
                     acted = true; // Counts as acting if stuck
                 }
            }
        }

        // 3b. Proactive Resource Scan (Only if safe from storm)
        if (!acted) {
            // Check for either medkits or ammo proactively
            let nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT);
            let resourceName = 'Medkit';
            if (!nearbyResource) {
                nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO);
                resourceName = 'Ammo';
            }

            if (nearbyResource) {
                enemy.state = AI_STATE_SEEKING_RESOURCES;
                enemy.targetResourceCoords = nearbyResource;
                Game.logMessage(`Enemy ${enemy.id} spots ${resourceName} nearby and moves to secure it.`, LOG_CLASS_ENEMY_EVENT);
                acted = true;
            }
        }

        // 3c. Probabilistic Movement/Wait (Only if safe & no proactive resource target)
        if (!acted) {
            const rand = Math.random();
            let moveSuccessful = false;

            if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE) {
                // Try Move towards center
                const center = getSafeZoneCenter();
                moveSuccessful = moveTowards(enemy, center.row, center.col, "center");
                if (!moveSuccessful) {
                    // If moving towards center failed, try random move as fallback
                    moveSuccessful = moveRandomly(enemy);
                    // Optional: Log fallback differently?
                    // if (moveSuccessful) { Game.logMessage(`Enemy ${enemy.id} moves randomly (fallback after center).`, LOG_CLASS_ENEMY_EVENT); }
                }
            } else if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE + AI_EXPLORE_MOVE_RANDOM_CHANCE) {
                // Try Move randomly
                moveSuccessful = moveRandomly(enemy);
                // No fallback needed if random move was the primary choice and failed
            } else {
                // Wait action chosen explicitly
                Game.logMessage(`Enemy ${enemy.id} waits.`, LOG_CLASS_ENEMY_EVENT);
                moveSuccessful = true; // Consider waiting as a "successful" action for this turn
            }

            // If no move was successful (and wait wasn't chosen), log waiting due to being blocked
            if (!moveSuccessful) {
                 Game.logMessage(`Enemy ${enemy.id} waits (no moves).`, LOG_CLASS_ENEMY_EVENT);
            }
            // In all cases within this block (3c), the enemy has taken its turn action (move or wait).
            acted = true; // Ensure acted is true if this block was reached.
        }
    }
    // If no action was taken (e.g., state transition happened), that's fine.
    // The executeAiTurns loop handles calling the next state's handler if needed.
}


/**
 * Handles AI logic when in the SEEKING_RESOURCES state.
 * Placeholder: Logs the state.
 * @param {object} enemy - The enemy object.
 */
function handleSeekingResourcesState(enemy) {
    // TODO: Implement movement towards targetResourceCoords, pickup logic, transitions
    Game.logMessage(`Enemy ${enemy.id} is SEEKING RESOURCES.`, LOG_CLASS_ENEMY_EVENT);
}

/**
 * Handles AI logic when in the ENGAGING_ENEMY state.
 * Placeholder: Logs the state.
 * @param {object} enemy - The enemy object.
 */
function handleEngagingEnemyState(enemy) {
    // TODO: Implement movement/attack towards targetEnemy, transitions
    Game.logMessage(`Enemy ${enemy.id} is ENGAGING ENEMY.`, LOG_CLASS_ENEMY_EVENT);
}

/**
 * Handles AI logic when in the FLEEING state.
 * Placeholder: Logs the state.
 * @param {object} enemy - The enemy object.
 */
function handleFleeingState(enemy) {
    // TODO: Implement movement away from threat, transitions
    Game.logMessage(`Enemy ${enemy.id} is FLEEING.`, LOG_CLASS_ENEMY_EVENT);
}
