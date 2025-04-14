/**
 * sleep - Pauses execution for a given number of milliseconds.
 *
 * The sleep function below returns a Promise that resolves after the specified time.
 *
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} - A Promise that resolves after the delay.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

 /**
 * Checks for a resource at the given coordinates and handles pickup if found, using gameState.
 * Updates the unit's resources, modifies gameState.mapData, and logs the event via Game.logMessage.
 * @param {object} unit - The unit (player or enemy) potentially picking up the resource.
 * @param {number} row - The row coordinate to check.
 * @param {number} col - The column coordinate to check.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if a resource was picked up, false otherwise.
 */
function checkAndPickupResourceAt(unit, row, col, gameState) {
    // Validate inputs first, handle null gameState before logging with it
    if (!unit || !unit.resources || typeof Game === 'undefined' || typeof Game.logMessage !== 'function') {
        // Log error without gameState if unit is invalid or logMessage is missing
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`checkAndPickupResourceAt: Invalid unit.`, null, { level: 'ERROR', target: 'CONSOLE' });
        } else {
            console.error(`checkAndPickupResourceAt: Invalid unit or Game.logMessage missing.`);
        }
        return false;
    }
     if (!gameState || !gameState.mapData || !gameState.player) {
        Game.logMessage(`checkAndPickupResourceAt: Invalid gameState.`, null, { level: 'ERROR', target: 'CONSOLE' });
        return false;
     }
     // Now safe to access gameState properties for further checks
     if (!gameState.mapData[row]) {
         Game.logMessage(`checkAndPickupResourceAt: Invalid coordinates (row ${row} doesn't exist).`, gameState, { level: 'ERROR', target: 'CONSOLE' });
         return false;
     }

    // Get grid dimensions from mapData for bounds checking
    const gridHeight = gameState.mapData.length;
    const gridWidth = gameState.mapData[0] ? gameState.mapData[0].length : 0;
    if (row < 0 || row >= gridHeight || col < 0 || col >= gridWidth) {
         Game.logMessage(`checkAndPickupResourceAt: Coordinates (${row},${col}) out of bounds.`, gameState, { level: 'ERROR', target: 'CONSOLE' });
         return false;
    }

    const { mapData, player } = gameState; // Destructure
    // Assume TILE_*, LOG_CLASS_*, *_PICKUP_AMOUNT constants are global for now

    const tileType = mapData[row][col];
    let resourceCollected = false;
    let resourceType = "";
    // Identify unit type by comparing with gameState.player
    const isPlayerUnit = (unit === player);
    const unitId = isPlayerUnit ? "Player" : `Enemy ${unit.id || '?'}`;

    if (tileType === TILE_MEDKIT) {
        unit.resources.medkits = (unit.resources.medkits || 0) + 1;
        resourceType = "Medkit";
        resourceCollected = true;
    } else if (tileType === TILE_AMMO) {
        const pickupAmount = isPlayerUnit ? (PLAYER_AMMO_PICKUP_AMOUNT || 1) : (AI_AMMO_PICKUP_AMOUNT || 1);
        unit.resources.ammo = (unit.resources.ammo || 0) + pickupAmount;
        resourceType = "Ammo";
        resourceCollected = true;
    }

    if (resourceCollected) {
        // Modify mapData within gameState
        mapData[row][col] = TILE_LAND;
        // Pass gameState to logMessage
        Game.logMessage(
            `${unitId} collects ${resourceType} at (${row},${col}).`,
            gameState,
            { level: 'PLAYER', target: 'PLAYER', className: isPlayerUnit ? LOG_CLASS_PLAYER_GOOD : LOG_CLASS_ENEMY_EVENT }
        );
    }

    return resourceCollected;
}

/**
 * Updates a unit's position and immediately checks for resource pickup, using gameState.
 * This should be the ONLY way unit positions are changed in the game logic.
 * @param {object} unit - The unit (player or enemy) to move.
 * @param {number} newRow - The destination row.
 * @param {number} newCol - The destination column.
 * @param {GameState} gameState - The current game state.
 */
function updateUnitPosition(unit, newRow, newCol, gameState) {
    // Validate inputs first, handle null gameState before logging with it
    if (!unit || newRow === null || newCol === null) {
         // Log error without gameState if unit/coords invalid
         if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`updateUnitPosition: Invalid unit or destination.`, null, { level: 'ERROR', target: 'CONSOLE' });
         } else {
             console.error(`updateUnitPosition: Invalid unit or destination.`);
         }
         return;
    }
     if (!gameState || !gameState.mapData) {
         // Log error without gameState if gameState invalid
         Game.logMessage(`updateUnitPosition: Invalid gameState.`, null, { level: 'ERROR', target: 'CONSOLE' });
         return;
     }

    // Get grid dimensions from mapData for bounds checking
    const gridHeight = gameState.mapData.length;
    const gridWidth = gameState.mapData[0] ? gameState.mapData[0].length : 0;
    if (newRow < 0 || newRow >= gridHeight || newCol < 0 || newCol >= gridWidth) {
         Game.logMessage(`updateUnitPosition: Invalid destination (${newRow},${newCol}) out of bounds.`, gameState, { level: 'ERROR', target: 'CONSOLE' });
         return;
    }

    // Update position
    unit.row = newRow;
    unit.col = newCol;

    // Check for pickup at the new location, passing gameState
    checkAndPickupResourceAt(unit, newRow, newCol, gameState);

    // Note: Logging of the move itself happens before calling this.
    // Redrawing happens later in the main loop or turn management.
}

/**
 * Finds a random, unoccupied, walkable starting position on the map.
 * @param {Array<Array<number>>} mapData - The 2D array representing the map.
 * @param {number} gridWidth - The width of the grid.
 * @param {number} gridHeight - The height of the grid.
 * @param {number} walkableTileType - The tile type value considered walkable (e.g., TILE_LAND).
 * @param {Array<object>} occupiedCoords - Array of {row, col} objects already occupied.
 * @returns {{row: number, col: number}|null} The coordinates {row, col} or null if no position found.
 */
function findStartPosition(mapData, gridWidth, gridHeight, walkableTileType, occupiedCoords = []) {
    // Function body unchanged from player.js
    let attempts = 0; const maxAttempts = gridWidth * gridHeight * 2; // Increased attempts slightly
    while (attempts < maxAttempts) {
        // Ensure we don't pick edge cells (assuming edges might be unwalkable or reserved)
        const randomRow = Math.floor(Math.random() * (gridHeight - 2)) + 1;
        const randomCol = Math.floor(Math.random() * (gridWidth - 2)) + 1;

        // Check if mapData exists and the chosen tile is walkable
        if (mapData && mapData[randomRow] && mapData[randomRow][randomCol] === walkableTileType) {
            let isOccupied = false;
            // Check against the occupied coordinates list
            for (const pos of occupiedCoords) {
                if (pos.row === randomRow && pos.col === randomCol) {
                    isOccupied = true;
                    break;
                }
            }
            // If not occupied, return the position
            if (!isOccupied) {
                return { row: randomRow, col: randomCol };
            }
        }
        attempts++;
    }
    // Log error, but cannot pass gameState as it's not available in this function's scope
    Game.logMessage("Could not find a valid *unoccupied* starting position after max attempts!", null, { level: 'ERROR', target: 'CONSOLE' });
    return null; // Return null if no suitable position is found
}

/**
 * Calculates the potential destination tile for knockback based on attacker/target positions.
 * Pushes 1 tile directly away from the attacker.
 * @param {object} attacker - The unit initiating the attack ({row, col}).
 * @param {object} target - The unit being hit ({row, col}).
 * @returns {object|null} - Coordinates {row, col} of the tile the target would be pushed to, or null if input is invalid.
 */
function calculateKnockbackDestination(attacker, target, gameState) { // Added gameState for logging context
    // Moved from ai_movement.js
    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null) {
        Game.logMessage("calculateKnockbackDestination: Invalid attacker or target position.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return null;
    }
    const dr = target.row - attacker.row;
    const dc = target.col - attacker.col;
    let pushDr = Math.sign(dr);
    let pushDc = Math.sign(dc);
    if (pushDr === 0 && pushDc === 0) {
         Game.logMessage("calculateKnockbackDestination: Attacker and target at same position? Defaulting push direction.", gameState, { level: 'WARN', target: 'CONSOLE' });
         pushDr = 1; // Default push down
    }
    const destinationRow = target.row + pushDr;
    const destinationCol = target.col + pushDc;
    return { row: destinationRow, col: destinationCol };
}

/**
 * Attempts to apply knockback to a target unit based on attacker position.
 * Calculates destination, checks validity (bounds, terrain, occupancy), and updates position if valid.
 * @param {object} attacker - The unit initiating the attack ({row, col}).
 * @param {object} target - The unit being hit ({row, col, id}).
 * @param {GameState} gameState - The current game state.
 * @returns {{success: boolean, dest: {row: number, col: number}|null, reason: string|null}} - Result object.
 */
function applyKnockback(attacker, target, gameState) {
    if (!attacker || !target || !gameState || !gameState.mapData || !gameState.player || !gameState.enemies) {
        Game.logMessage("applyKnockback: Missing attacker, target, or required gameState properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return { success: false, dest: null, reason: 'internal_error' };
    }
    const { mapData, player, enemies } = gameState;
    // Assume GRID_HEIGHT, GRID_WIDTH, TILE_WALL, TILE_TREE are global for now

    const knockbackDest = calculateKnockbackDestination(attacker, target, gameState); // Pass gameState
    if (!knockbackDest) {
        return { success: false, dest: null, reason: 'calc_error' };
    }

    const { row: destRow, col: destCol } = knockbackDest;

    // 1. Check Bounds
    const gridHeight = mapData.length;
    const gridWidth = mapData[0] ? mapData[0].length : 0;
    const isInBounds = destRow >= 0 && destRow < gridHeight && destCol >= 0 && destCol < gridWidth;
    if (!isInBounds) {
        return { success: false, dest: knockbackDest, reason: 'out_of_bounds' };
    }

    // 2. Check Terrain
    let isTerrainValid = false;
    if (mapData[destRow]) {
        const tileType = mapData[destRow][destCol];
        isTerrainValid = tileType !== TILE_WALL && tileType !== TILE_TREE; // Cannot be pushed into obstacles
    }
    if (!isTerrainValid) {
        return { success: false, dest: knockbackDest, reason: 'blocked_terrain' };
    }

    // 3. Check Occupancy
    let isOccupied = false;
    // Check player
    if (player.hp > 0 && player.row === destRow && player.col === destCol) {
        isOccupied = true;
    }
    // Check other enemies
    if (!isOccupied) {
        for (const otherEnemy of enemies) {
            // Check if it's a different, living enemy at the destination
            if (otherEnemy && otherEnemy.hp > 0 && otherEnemy !== target && otherEnemy.row === destRow && otherEnemy.col === destCol) {
                isOccupied = true;
                break;
            }
        }
    }
    if (isOccupied) {
        return { success: false, dest: knockbackDest, reason: 'blocked_occupied' };
    }

    // All checks passed, apply knockback
    updateUnitPosition(target, destRow, destCol, gameState); // Use the refactored function
    return { success: true, dest: knockbackDest, reason: null };
}

/**
 * Traces a line between two points using Bresenham's line algorithm.
 * Returns an array of all integer coordinates along the line, including start and end.
 * @param {number} x0 - Starting column.
 * @param {number} y0 - Starting row.
 * @param {number} x1 - Ending column.
 * @param {number} y1 - Ending row.
 * @returns {Array<{row: number, col: number}>} - Array of coordinates.
 */
const MAX_TRACE_STEPS = 200;

/**
 * Traces a line between two points using Bresenham's line algorithm.
 * All input coordinates are rounded to the nearest integer to ensure robust grid-based behavior,
 * even if fractional/interpolated positions are passed in (e.g., from animation).
 * Returns an array of all integer coordinates along the line, including start and end.
 * @param {number} x0 - Starting column.
 * @param {number} y0 - Starting row.
 * @param {number} x1 - Ending column.
 * @param {number} y1 - Ending row.
 * @returns {Array<{row: number, col: number}>} - Array of coordinates.
 */
function traceLine(x0, y0, x1, y1) {
    // Round all inputs to the nearest integer for grid-based logic
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);

    if (
        typeof Game !== "undefined" &&
        (isNaN(x0) || isNaN(y0) || isNaN(x1) || isNaN(y1))
    ) {
        Game.logMessage(
            `[DEBUG] traceLine called with invalid coordinates: x0=${x0}, y0=${y0}, x1=${x1}, y1=${y1}`,
            undefined,
            { level: "ERROR", target: "CONSOLE" }
        );
    }
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy; // error value e_xy
    let currentX = x0;
    let currentY = y0;
    let steps = 0;

    while (true) {
        points.push({ row: currentY, col: currentX }); // Add current point

        if (currentX === x1 && currentY === y1) {
            break; // Reached the end
        }

        steps++;
        if (steps > MAX_TRACE_STEPS) {
            const msg = `[WARN] traceLine exceeded max steps (${MAX_TRACE_STEPS}) for input: x0=${x0}, y0=${y0}, x1=${x1}, y1=${y1}, points.length=${points.length}`;
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(msg, undefined, { level: "WARN", target: "CONSOLE" });
            } else {
                console.warn(msg);
            }
            return points;
        }

        const e2 = 2 * err;
        if (e2 >= dy) { // e_xy+e_x > 0
            err += dy;
            currentX += sx;
        }
        if (e2 <= dx) { // e_xy+e_y < 0
            err += dx;
            currentY += sy;
        }
    }
    return points;
}

/**
 * Ensures grid coordinates are integers.
 * Accepts (row, col) or an object with row/col properties.
 * Returns { row: int, col: int }
 */
function toGridCoords(rowOrObj, col) {
    if (typeof rowOrObj === "object" && rowOrObj !== null) {
        return {
            row: Math.round(rowOrObj.row),
            col: Math.round(rowOrObj.col)
        };
    } else {
        return {
            row: Math.round(rowOrObj),
            col: Math.round(col)
        };
    }
}
