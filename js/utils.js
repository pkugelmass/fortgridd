console.log("utils.js loaded");

/**
 * Checks for a resource at the given coordinates and handles pickup if found.
 * Updates the unit's resources, modifies the map tile, and logs the event via Game.logMessage.
 * Assumes global access to mapData, TILE_*, player, Game, config constants (e.g., AI_AMMO_PICKUP_AMOUNT).
 * @param {object} unit - The unit (player or enemy) potentially picking up the resource.
 * @param {number} row - The row coordinate to check.
 * @param {number} col - The column coordinate to check.
 * @returns {boolean} - True if a resource was picked up, false otherwise.
 */
function checkAndPickupResourceAt(unit, row, col) {
    // Basic validation
    if (!unit || !unit.resources || typeof mapData === 'undefined' || !mapData[row] || row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH) {
        console.error(`checkAndPickupResourceAt: Invalid unit or coordinates (${row},${col}).`);
        return false;
    }

    const tileType = mapData[row][col];
    let resourceCollected = false;
    let resourceType = "";
    const unitId = unit === player ? "Player" : `Enemy ${unit.id}`; // Identify unit type

    if (tileType === TILE_MEDKIT) {
        unit.resources.medkits = (unit.resources.medkits || 0) + 1;
        resourceType = "Medkit";
        resourceCollected = true;
    } else if (tileType === TILE_AMMO) {
        // Use AI_AMMO_PICKUP_AMOUNT for enemies, default to 1 for player (or use a specific PLAYER_AMMO_PICKUP if defined)
        const pickupAmount = (unit === player) ? (typeof PLAYER_AMMO_PICKUP_AMOUNT !== 'undefined' ? PLAYER_AMMO_PICKUP_AMOUNT : 1) : (AI_AMMO_PICKUP_AMOUNT || 1);
        unit.resources.ammo = (unit.resources.ammo || 0) + pickupAmount;
        resourceType = "Ammo";
        resourceCollected = true;
    }

    if (resourceCollected) {
        mapData[row][col] = TILE_LAND; // Change tile to land AFTER pickup
        // Use Game.logMessage for consistency
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
             Game.logMessage(`${unitId} collects ${resourceType} at (${row},${col}).`, unit === player ? LOG_CLASS_PLAYER_GOOD : LOG_CLASS_ENEMY_EVENT);
        } else {
             console.error("Game.logMessage not available in checkAndPickupResourceAt");
        }
        // Note: redrawCanvas will happen at the end of the turn (player or AI)
    }

    return resourceCollected;
}

/**
 * Updates a unit's position and immediately checks for resource pickup at the new location.
 * This should be the ONLY way unit positions are changed in the game logic.
 * Assumes global access to GRID_HEIGHT, GRID_WIDTH. Calls checkAndPickupResourceAt.
 * @param {object} unit - The unit (player or enemy) to move.
 * @param {number} newRow - The destination row.
 * @param {number} newCol - The destination column.
 */
function updateUnitPosition(unit, newRow, newCol) {
    // Basic validation
    if (!unit || newRow === null || newCol === null || newRow < 0 || newRow >= GRID_HEIGHT || newCol < 0 || newCol >= GRID_WIDTH) {
         console.error(`updateUnitPosition: Invalid unit or destination (${newRow},${newCol}).`);
         return;
    }
    // Update position
    unit.row = newRow;
    unit.col = newCol;

    // Check for pickup at the new location using the standalone function
    checkAndPickupResourceAt(unit, newRow, newCol);

    // Note: Logging of the *move itself* should happen *before* calling this function,
    // as the context (e.g., "moves towards target", "knocked back") is known there.
    // Redrawing the canvas also happens later, typically at the end of a turn.
}
