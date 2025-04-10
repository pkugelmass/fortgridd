// AI Perception Helpers (Line of Sight, Finding Targets/Resources)
console.log("ai_perception.js loaded");

// --- AI Line of Sight Helper ---
/**
 * Checks if an attacker has a clear cardinal (non-diagonal) line of sight to a target, using gameState.
 * @param {object} attacker - The enemy object shooting ({row, col}).
 * @param {object} target - The target object ({row, col}).
 * @param {number} maxRange - The maximum range to check (Manhattan distance).
 * @param {GameState} gameState - The current game state (for mapData).
 * @returns {boolean} - True if cardinal line of sight is clear, false otherwise.
 */
function hasClearCardinalLineOfSight(attacker, target, maxRange, gameState) {
    // Check dependencies, including gameState and mapData
    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null || !gameState || !gameState.mapData || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof GRID_WIDTH === 'undefined') {
        console.error("hasClearCardinalLineOfSight: Missing critical data or invalid unit positions."); return false;
    }
    const { mapData } = gameState; // Destructure mapData

    const dr = target.row - attacker.row; const dc = target.col - attacker.col; const dist = Math.abs(dr) + Math.abs(dc);
    if (dist === 0 || dist > maxRange) { return false; } if (dr !== 0 && dc !== 0) { return false; } // Not cardinal
    const stepR = Math.sign(dr); const stepC = Math.sign(dc);
    for (let i = 1; i < dist; i++) { // Check cells between
        const checkRow = attacker.row + stepR * i; const checkCol = attacker.col + stepC * i;
        if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { return false; } // Out of bounds
        if (mapData[checkRow]){ // Check row exists
            const tileType = mapData[checkRow][checkCol];
            if (tileType === TILE_WALL || tileType === TILE_TREE) { return false; } // Blocked
        } else {
            console.error("mapData issue during LoS check at row", checkRow); return false; // Map data error
        }
    }
    return true; // LoS is clear
}


/**
 * Checks if unitA has a clear line of sight to unitB using Bresenham's algorithm, using gameState.
 * Checks for blocking tiles (WALL, TREE) along the line.
 * @param {object} unitA - The starting unit ({row, col}).
 * @param {object} unitB - The target unit ({row, col}).
 * @param {number} maxRange - The maximum range (Euclidean distance) to check.
 * @param {GameState} gameState - The current game state (for mapData).
 * @returns {boolean} - True if line of sight is clear and within range, false otherwise.
 */
function hasClearLineOfSight(unitA, unitB, maxRange, gameState) {
    // Check dependencies, including gameState and mapData
    // Assume GRID_HEIGHT, GRID_WIDTH, TILE_WALL, TILE_TREE are global for now
    if (!unitA || !unitB || unitA.row === null || unitA.col === null || unitB.row === null || unitB.col === null || !gameState || !gameState.mapData || typeof traceLine !== 'function') {
        console.error("hasClearLineOfSight: Missing critical data, gameState, mapData, or traceLine function.");
        return false;
    }
    const { mapData } = gameState;

    // 1. Check Distance
    const dxDist = unitB.col - unitA.col;
    const dyDist = unitB.row - unitA.row;
    const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

    if (distance === 0 || distance > maxRange) {
        return false; // Target is self or out of range
    }

    // 2. Trace the line using the utility function
    const linePoints = traceLine(unitA.col, unitA.row, unitB.col, unitB.row);

    // 3. Check points along the line for obstacles
    // Skip the first point (unitA's own location)
    for (let i = 1; i < linePoints.length; i++) {
        const point = linePoints[i];
        const checkRow = point.row;
        const checkCol = point.col;

        // Check boundaries (using global constants for now)
        if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) {
            console.error("hasClearLineOfSight: traceLine went out of bounds."); // Should ideally not happen
            return false; // Out of bounds is blocked
        }

        // Check for blocking tiles using mapData from gameState
        if (mapData[checkRow]) {
            const tileType = mapData[checkRow][checkCol];
            if (tileType === TILE_WALL || tileType === TILE_TREE) {
                return false; // Blocked by obstacle
            }
        } else {
            console.error(`hasClearLineOfSight: mapData error at row ${checkRow}`);
            return false; // Missing map data is considered blocked
        }
    }

    // If the loop completed without returning false, the line is clear
    return true;
}

/**
 * Finds the nearest visible enemy (player or other AI) within detection range, using gameState.
 * @param {object} enemy - The searching enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {object|null} - The nearest visible enemy object or null if none found.
 */
function findNearestVisibleEnemy(enemy, gameState) {
    if (!enemy || !gameState || !gameState.player || !gameState.enemies) {
        console.error("findNearestVisibleEnemy: Missing enemy or required gameState properties.");
        return null;
    }
    const { player, enemies } = gameState; // Destructure

    let nearestEnemy = null;
    let minDistance = Infinity;
    const detectionRange = enemy.detectionRange || AI_RANGE_MAX; // Use specific or fallback

    // Check player first
    if (player.hp > 0 && player.row !== null) {
        const dxDist = player.col - enemy.col;
        const dyDist = player.row - enemy.row;
        const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

        if (distance <= detectionRange && distance < minDistance) {
            // Pass gameState to LOS check
            if (hasClearLineOfSight(enemy, player, detectionRange, gameState)) {
                 minDistance = distance;
                 nearestEnemy = player;
            }
        }
    }

    // Check other enemies
    for (const otherEnemy of enemies) {
        if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue;
        const dxDist = otherEnemy.col - enemy.col;
        const dyDist = otherEnemy.row - enemy.row;
        const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

        if (distance <= detectionRange && distance < minDistance) {
             // Pass gameState to LOS check
             if (hasClearLineOfSight(enemy, otherEnemy, detectionRange, gameState)) {
                minDistance = distance;
                nearestEnemy = otherEnemy;
             }
        }
    }
    return nearestEnemy;
}

/**
 * Finds the nearest specified resource tile within a given range, using gameState.
 * @param {object} enemy - The searching enemy object.
 * @param {number} range - The maximum search distance (Manhattan distance).
 * @param {number} resourceTileType - The TILE_* constant for the resource.
 * @param {GameState} gameState - The current game state.
 * @returns {object|null} - The coordinates {row, col} of the nearest resource inside the safe zone, or null.
 */
function findNearbyResource(enemy, range, resourceTileType, gameState) {
    if (!enemy || !gameState || !gameState.mapData || !gameState.safeZone) {
        console.error("findNearbyResource: Missing enemy or required gameState properties.");
        return null;
    }
    const { mapData, safeZone } = gameState; // Destructure

    let nearestResource = null;
    let minDistance = Infinity;
    // Assume config constants GRID_HEIGHT, GRID_WIDTH are globally available for now

    for (let r = Math.max(0, enemy.row - range); r <= Math.min(GRID_HEIGHT - 1, enemy.row + range); r++) {
        for (let c = Math.max(0, enemy.col - range); c <= Math.min(GRID_WIDTH - 1, enemy.col + range); c++) {
            // 1. Check Safe Zone
            if (r >= safeZone.minRow && r <= safeZone.maxRow && c >= safeZone.minCol && c <= safeZone.maxCol) {
                const dist = Math.abs(r - enemy.row) + Math.abs(c - enemy.col);
                // 2. Check Range & Distance
                if (dist <= range && dist < minDistance) {
                    // 3. Check Resource Type (using mapData from gameState)
                    if (mapData[r] && mapData[r][c] === resourceTileType) {
                        // 4. Check Line of Sight (pass gameState)
                        const resourceCoords = { row: r, col: c };
                        // Use Euclidean distance for LOS check range
                        // const losRange = Math.sqrt(Math.pow(r - enemy.row, 2) + Math.pow(c - enemy.col, 2));
                        // Use the provided 'range' for LOS check consistency? Or detectionRange? Let's use 'range' for now.
                        if (hasClearLineOfSight(enemy, resourceCoords, range, gameState)) {
                            minDistance = dist;
                            nearestResource = resourceCoords;
                        }
                    }
                }
            } // End safe zone check
        }
    }
    return nearestResource;
}
