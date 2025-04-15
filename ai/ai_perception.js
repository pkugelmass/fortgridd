/**
 * Checks if an attacker has a clear cardinal (non-diagonal) line of sight to a target, using gameState.
 * @param {object} attacker - The enemy object shooting ({row, col}).
 * @param {object} target - The target object ({row, col}).
 * @param {number} maxRange - The maximum range to check (Manhattan distance).
 * @param {GameState} gameState - The current game state (for mapData).
 * @returns {boolean} - True if cardinal line of sight is clear, false otherwise.
 */
function hasClearCardinalLineOfSight(attacker, target, maxRange, gameState) {
    if (
        !attacker || !target ||
        attacker.row === null || attacker.col === null ||
        target.row === null || target.col === null ||
        !gameState || !gameState.mapData ||
        typeof window.TILE_WALL === 'undefined' ||
        typeof window.TILE_TREE === 'undefined' ||
        typeof window.GRID_HEIGHT === 'undefined' ||
        typeof window.GRID_WIDTH === 'undefined'
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("hasClearCardinalLineOfSight: Missing critical data or invalid unit positions.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }
    const { mapData } = gameState;
    const dr = target.row - attacker.row;
    const dc = target.col - attacker.col;
    const dist = Math.abs(dr) + Math.abs(dc);
    if (dist === 0 || dist > maxRange) return false;
    if (dr !== 0 && dc !== 0) return false; // Not cardinal
    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);
    for (let i = 1; i < dist; i++) {
        const checkRow = attacker.row + stepR * i;
        const checkCol = attacker.col + stepC * i;
        if (checkRow < 0 || checkRow >= window.GRID_HEIGHT || checkCol < 0 || checkCol >= window.GRID_WIDTH) return false;
        if (mapData[checkRow]) {
            const tileType = mapData[checkRow][checkCol];
            if (tileType === window.TILE_WALL || tileType === window.TILE_TREE) return false;
        } else {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage(`hasClearCardinalLineOfSight: mapData error at row ${checkRow}`, gameState, { level: 'ERROR', target: 'CONSOLE' });
            }
            return false;
        }
    }
    return true;
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
    if (
        !unitA || !unitB ||
        unitA.row === null || unitA.col === null ||
        unitB.row === null || unitB.col === null ||
        !gameState || !gameState.mapData ||
        typeof window.traceLine !== 'function'
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("hasClearLineOfSight: Missing critical data, gameState, mapData, or traceLine function.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }
    const { mapData } = gameState;
    const dxDist = unitB.col - unitA.col;
    const dyDist = unitB.row - unitA.row;
    const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

    if (distance === 0 || distance > maxRange) {
        return false;
    }

    const linePoints = window.traceLine(unitA.col, unitA.row, unitB.col, unitB.row);

    for (let i = 1; i < linePoints.length; i++) {
        const point = linePoints[i];
        const checkRow = point.row;
        const checkCol = point.col;
        if (checkRow < 0 || checkRow >= window.GRID_HEIGHT || checkCol < 0 || checkCol >= window.GRID_WIDTH) {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage("hasClearLineOfSight: traceLine went out of bounds.", gameState, { level: 'WARN', target: 'CONSOLE' });
            }
            return false;
        }
        if (mapData[checkRow]) {
            const tileType = mapData[checkRow][checkCol];
            if (tileType === window.TILE_WALL || tileType === window.TILE_TREE) {
                return false;
            }
        } else {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage(`hasClearLineOfSight: mapData error at row ${checkRow}`, gameState, { level: 'ERROR', target: 'CONSOLE' });
            }
            return false;
        }
    }
    return true;
}

/**
 * Finds the nearest visible enemy (player or other AI) within detection range, using gameState.
 * @param {Enemy} enemy - The searching enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {object|null} - The nearest visible enemy object or null if none found.
 */
function findNearestVisibleEnemy(enemy, gameState) {
    if (!enemy || !gameState || !gameState.player || !gameState.enemies) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("findNearestVisibleEnemy: Missing enemy or required gameState properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return null;
    }
    const { player, enemies } = gameState;
    let nearestEnemy = null;
    let minDistance = Infinity;
    const detectionRange = enemy.detectionRange || window.AI_RANGE_MAX;

    // Check player first
    if (player.hp > 0 && player.row !== null) {
        const dxDist = player.col - enemy.col;
        const dyDist = player.row - enemy.row;
        const distance = Math.sqrt(dxDist * dxDist + dyDist * dyDist);

        if (distance <= detectionRange && distance < minDistance) {
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
 * @param {Enemy} enemy - The searching enemy instance.
 * @param {number} range - The maximum search distance (Manhattan distance).
 * @param {number} resourceTileType - The TILE_* constant for the resource.
 * @param {GameState} gameState - The current game state.
 * @returns {object|null} - The coordinates {row, col} of the nearest resource inside the safe zone, or null.
 */
function findNearbyResource(enemy, range, resourceTileType, gameState) {
    if (!enemy || !gameState || !gameState.mapData || !gameState.safeZone) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("findNearbyResource: Missing enemy or required gameState properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return null;
    }
    const { mapData, safeZone } = gameState;
    let nearestResource = null;
    let minDistance = Infinity;

    for (let r = Math.max(0, enemy.row - range); r <= Math.min(window.GRID_HEIGHT - 1, enemy.row + range); r++) {
        for (let c = Math.max(0, enemy.col - range); c <= Math.min(window.GRID_WIDTH - 1, enemy.col + range); c++) {
            if (r >= safeZone.minRow && r <= safeZone.maxRow && c >= safeZone.minCol && c <= safeZone.maxCol) {
                const dist = Math.abs(r - enemy.row) + Math.abs(c - enemy.col);
                if (dist <= range && dist < minDistance) {
                    if (mapData[r] && mapData[r][c] === resourceTileType) {
                        const resourceCoords = { row: r, col: c };
                        if (hasClearLineOfSight(enemy, resourceCoords, range, gameState)) {
                            minDistance = dist;
                            nearestResource = resourceCoords;
                        }
                    }
                }
            }
        }
    }
    return nearestResource;
}

// Attach helpers to global scope
window.hasClearCardinalLineOfSight = hasClearCardinalLineOfSight;
window.hasClearLineOfSight = hasClearLineOfSight;
window.findNearestVisibleEnemy = findNearestVisibleEnemy;
window.findNearbyResource = findNearbyResource;