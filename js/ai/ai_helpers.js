console.log("ai_helpers.js loaded");

// --- AI Line of Sight Helper ---
/**
 * Checks if an attacker has a clear cardinal (non-diagonal) line of sight to a target.
 * @param {object} attacker - The enemy object shooting ({row, col}).
 * @param {object} target - The target object ({row, col}).
 * @param {number} maxRange - The maximum range to check (Manhattan distance).
 * @returns {boolean} - True if cardinal line of sight is clear, false otherwise.
 */
function hasClearCardinalLineOfSight(attacker, target, maxRange) {
    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof GRID_WIDTH === 'undefined') {
        console.error("hasClearCardinalLineOfSight: Missing critical data or invalid unit positions."); return false;
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


/**
 * Checks if unitA has a clear line of sight to unitB using Bresenham's algorithm.
 * Checks for blocking tiles (WALL, TREE) along the line.
 * @param {object} unitA - The starting unit ({row, col}).
 * @param {object} unitB - The target unit ({row, col}).
 * @param {number} maxRange - The maximum range (Euclidean distance) to check.
 * @returns {boolean} - True if line of sight is clear and within range, false otherwise.
 */
function hasClearLineOfSight(unitA, unitB, maxRange) {
    if (!unitA || !unitB || unitA.row === null || unitA.col === null || unitB.row === null || unitB.col === null || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof GRID_WIDTH === 'undefined') {
        console.error("hasClearLineOfSight: Missing critical data or invalid unit positions.");
        return false;
    }

    let x0 = unitA.col;
    let y0 = unitA.row;
    const x1 = unitB.col;
    const y1 = unitB.row;

    // Check distance first using Euclidean distance (more accurate for diagonals)
    const dxDist = x1 - x0;
    const dyDist = y1 - y0;
    const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

    if (distance === 0 || distance > maxRange) {
        // console.log(`LOS Check Fail: Dist ${distance.toFixed(2)} > maxRange ${maxRange}`); // Debug
        return false;
    }

    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy; // error value e_xy

    while (true) {
        // Check the current cell (x0, y0) for obstacles, *except* for the starting cell itself.
        if (x0 !== unitA.col || y0 !== unitA.row) {
             // Check boundaries
            if (y0 < 0 || y0 >= GRID_HEIGHT || x0 < 0 || x0 >= GRID_WIDTH) {
                 console.error("hasClearLineOfSight: Bresenham went out of bounds."); // Should ideally not happen if distance check is correct
                 return false; // Out of bounds is blocked
            }
            // Check for blocking tiles
            if (mapData && mapData[y0]) {
                const tileType = mapData[y0][x0];
                if (tileType === TILE_WALL || tileType === TILE_TREE) {
                    // console.log(`LOS Check Fail: Obstacle ${tileType} at (${y0},${x0})`); // Debug
                    return false; // Blocked by obstacle
                }
            } else {
                 console.error(`hasClearLineOfSight: mapData error at row ${y0}`);
                 return false; // Missing map data is considered blocked
            }
        }

        // Check if we reached the target
        if (x0 === x1 && y0 === y1) {
            break; // Reached target, line is clear so far
        }

        // Bresenham's algorithm step
        const e2 = 2 * err;
        if (e2 >= dy) { // e_xy+e_x > 0
            err += dy;
            x0 += sx;
        }
        if (e2 <= dx) { // e_xy+e_y < 0
            err += dx;
            y0 += sy;
        }
    }

    // If the loop completed, we reached the target without hitting obstacles
    // console.log(`LOS Check Success: Clear path to (${y1},${x1})`); // Debug
    return true;
}


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
            // Allow movement onto LAND, MEDKIT, or AMMO tiles
            if (typeof mapData !== 'undefined' && mapData[targetRow]) {
                const tileType = mapData[targetRow][targetCol];
                if (tileType === TILE_LAND || tileType === TILE_MEDKIT || tileType === TILE_AMMO) {
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
                } // End check for valid tile types
            } else if (typeof mapData === 'undefined' || !mapData[targetRow]) {
                 console.error("getValidMoves: mapData error at row", targetRow);
            } // End check for valid map data row
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
        // Use Euclidean distance for range check with hasClearLineOfSight
        const dxDist = player.col - enemy.col;
        const dyDist = player.row - enemy.row;
        const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

        if (distance <= detectionRange && distance < minDistance) {
            // Use new LOS check
            if (hasClearLineOfSight(enemy, player, detectionRange)) {
                 minDistance = distance; // Store Euclidean distance
                 nearestEnemy = player;
            }
        }
    }

    // Check other enemies
    if (typeof enemies !== 'undefined') {
        for (const otherEnemy of enemies) {
            if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue;
            // Use Euclidean distance for range check
            const dxDist = otherEnemy.col - enemy.col;
            const dyDist = otherEnemy.row - enemy.row;
            const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

            if (distance <= detectionRange && distance < minDistance) {
                 if (hasClearLineOfSight(enemy, otherEnemy, detectionRange)) {
                    minDistance = distance; // Store Euclidean distance
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
        enemy.row = chosenMove.row;
        enemy.col = chosenMove.col;
        return true;
    }

    // 4. Fallback: No closer or sideways move possible, try random move
    // Game.logMessage(`Enemy ${enemy.id} blocked towards ${logReason}, attempting random move.`, LOG_CLASS_DEBUG); // Debug log
    // Note: moveRandomly already logs its own success/failure message
    return moveRandomly(enemy); // Return true if random move succeeded, false otherwise
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
        enemy.row = chosenMove.row;
        enemy.col = chosenMove.col;
        return true;
    }
    // Log failure to move randomly only if it was attempted as a fallback (e.g., from moveTowards)
    // Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) cannot move randomly (no valid moves).`, LOG_CLASS_ENEMY_EVENT);
    return false; // No valid moves
}

/**
 * Helper function to re-evaluate the situation when a target is invalid or gone.
 * Priority: Threats -> Critical Needs -> Proactive Needs -> Default Explore.
 * Modifies the enemy's state and potentially target directly.
 * @param {object} enemy - The enemy object.
 */
function performReevaluation(enemy) {
    // (a) Check Threats
    const nearestEnemy = findNearestVisibleEnemy(enemy);
    if (nearestEnemy) {
        const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP);
        if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
            enemy.state = AI_STATE_FLEEING;
            enemy.targetEnemy = nearestEnemy;
            Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Sees ${nearestEnemy.id || 'Player'} and flees!`, LOG_CLASS_ENEMY_EVENT);
        } else {
            enemy.state = AI_STATE_ENGAGING_ENEMY;
            enemy.targetEnemy = nearestEnemy;
            Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Sees ${nearestEnemy.id || 'Player'} and engages!`, LOG_CLASS_ENEMY_EVENT);
        }
        return; // State changed
    }

    // (b) Check Critical Needs
    const needsMedkit = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP) < AI_SEEK_HEALTH_THRESHOLD;
    const needsAmmo = enemy.resources.ammo <= 0;

    if (needsMedkit) {
        const nearbyMedkit = findNearbyResource(enemy, enemy.detectionRange, TILE_MEDKIT);
        if (nearbyMedkit) {
            enemy.targetResourceCoords = nearbyMedkit;
            enemy.state = AI_STATE_SEEKING_RESOURCES; // Stay (or re-enter) seeking
            Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Critically needs Medkit, found another nearby at (${nearbyMedkit.row},${nearbyMedkit.col}).`, LOG_CLASS_ENEMY_EVENT);
            return; // Target updated, state confirmed
        }
    }
    if (needsAmmo) { // Check ammo only if medkit wasn't critically needed or found
        const nearbyAmmo = findNearbyResource(enemy, enemy.detectionRange, TILE_AMMO);
        if (nearbyAmmo) {
            enemy.targetResourceCoords = nearbyAmmo;
            enemy.state = AI_STATE_SEEKING_RESOURCES; // Stay (or re-enter) seeking
            Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Critically needs Ammo, found some nearby at (${nearbyAmmo.row},${nearbyAmmo.col}).`, LOG_CLASS_ENEMY_EVENT);
            return; // Target updated, state confirmed
        }
    }

    // (c) Check Proactive Needs
    let nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT);
    let resourceName = 'Medkit';
    if (!nearbyResource) {
        nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO);
        resourceName = 'Ammo';
    }
    if (nearbyResource) {
        enemy.targetResourceCoords = nearbyResource;
        enemy.state = AI_STATE_SEEKING_RESOURCES; // Stay (or re-enter) seeking
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Proactively seeks ${resourceName} nearby at (${nearbyResource.row},${nearbyResource.col}).`, LOG_CLASS_ENEMY_EVENT);
        return; // Target updated, state confirmed
    }

    // (d) Default to Exploring
    Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Found no threats or other resources, switching to Exploring.`, LOG_CLASS_ENEMY_EVENT);
    enemy.state = AI_STATE_EXPLORING;
    // No return needed, state changed
}
