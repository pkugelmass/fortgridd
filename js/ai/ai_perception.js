// AI Perception Helpers (Line of Sight, Finding Targets/Resources)
console.log("ai_perception.js loaded");

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
 * @returns {object|null} - The coordinates {row, col} of the nearest resource inside the safe zone, or null.
 */
function findNearbyResource(enemy, range, resourceTileType) {
    let nearestResource = null;
    let minDistance = Infinity;
    const safeZone = Game.getSafeZone(); // Get current safe zone

    // Simple square scan around the enemy
    for (let r = Math.max(0, enemy.row - range); r <= Math.min(GRID_HEIGHT - 1, enemy.row + range); r++) {
        for (let c = Math.max(0, enemy.col - range); c <= Math.min(GRID_WIDTH - 1, enemy.col + range); c++) {
            // 1. Check if the coordinate is within the safe zone
            if (r >= safeZone.minRow && r <= safeZone.maxRow && c >= safeZone.minCol && c <= safeZone.maxCol) {
                const dist = Math.abs(r - enemy.row) + Math.abs(c - enemy.col); // Manhattan distance for range check simplicity
                // 2. Check if within range and closer than previous finds
                if (dist <= range && dist < minDistance) {
                    // 3. Check if it's the correct resource type
                    if (mapData && mapData[r] && mapData[r][c] === resourceTileType) {
                        // 4. Check Line of Sight
                        const resourceCoords = { row: r, col: c };
                        // Use Euclidean distance for LOS check range, matching hasClearLineOfSight
                        const losRange = Math.sqrt(Math.pow(r - enemy.row, 2) + Math.pow(c - enemy.col, 2));
                        if (hasClearLineOfSight(enemy, resourceCoords, range)) { // Use 'range' as max distance for LOS check too
                            minDistance = dist; // Store Manhattan distance for comparison
                            nearestResource = resourceCoords;
                        }
                    }
                }
            } // End safe zone check
        }
    }
    return nearestResource;
}
