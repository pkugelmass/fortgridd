/**
 * Validates if the enemy should continue seeking its current target resource.
 * Checks if target coordinates are set, valid, and if the resource tile still exists.
 * @param {Enemy} enemy - The enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {{isValid: boolean, targetCoords: {row: number, col: number}|null, needsReevaluation: boolean, reason: string|null}}
 */
function _validateSeekingState(enemy, gameState) {
    const { mapData } = gameState;
    const enemyId = enemy.id || 'Unknown Enemy';

    if (!enemy.targetResourceCoords) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) in SEEKING state without targetResourceCoords. Re-evaluating.`, gameState, { level: 'WARN', target: 'CONSOLE' });
        }
        return { isValid: false, targetCoords: null, needsReevaluation: true, reason: 'no_target' };
    }

    const targetRow = enemy.targetResourceCoords.row;
    const targetCol = enemy.targetResourceCoords.col;

    // Check if target coordinates are valid map indices
    if (
        targetRow < 0 ||
        targetRow >= window.GRID_HEIGHT ||
        targetCol < 0 ||
        targetCol >= window.GRID_WIDTH ||
        !mapData[targetRow]
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) target resource coords (${targetRow},${targetCol}) are invalid or mapData missing. Re-evaluating.`, gameState, { level: 'WARN', target: 'CONSOLE' });
        }
        enemy.targetResourceCoords = null;
        return { isValid: false, targetCoords: null, needsReevaluation: true, reason: 'invalid_coords' };
    }

    // Check if the resource is still there
    const currentTile = mapData[targetRow][targetCol];
    const isResourceTile = (currentTile === window.TILE_MEDKIT || currentTile === window.TILE_AMMO);

    if (!isResourceTile) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) finds target resource at (${targetRow},${targetCol}) is already gone. Re-evaluating...`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        enemy.targetResourceCoords = null;
        return { isValid: false, targetCoords: null, needsReevaluation: true, reason: 'resource_gone' };
    }

    // If all checks pass
    return { isValid: true, targetCoords: { row: targetRow, col: targetCol }, needsReevaluation: false, reason: null };
}

/**
 * Attempts to move the enemy towards the target coordinates or handles arrival logic.
 * Assumes pickup happens implicitly via moveTowards -> updateUnitPosition -> checkAndPickup.
 * @param {Enemy} enemy - The enemy instance.
 * @param {{row: number, col: number}} targetCoords - The coordinates of the target resource.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - True if an action (move/wait/arrival transition) was taken.
 */
async function _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const targetRow = targetCoords.row;
    const targetCol = targetCoords.col;

    if (enemy.row !== targetRow || enemy.col !== targetCol) {
        // Attempt to move towards the resource
        // For now, assume move is valid if not already at target
        if (typeof updateUnitPosition === 'function') {
            updateUnitPosition(enemy, targetRow, targetCol, gameState);
        }
        return true;
    } else {
        // Already at the target location. Pickup is assumed to have happened implicitly
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemyId} arrived at resource location (${enemy.row},${enemy.col}). Transitioning to Exploring.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        enemy.targetResourceCoords = null;
        enemy.state = window.AI_STATE_EXPLORING;
        return true;
    }
}

/**
 * Handles AI logic when in the SEEKING_RESOURCES state. Orchestrates validation and movement/arrival.
 * @param {Enemy} enemy - The enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - True if an action was taken (move, wait), false if re-evaluation is needed or target invalid.
 */
async function handleSeekingResourcesState(enemy, gameState) {
    if (
        !enemy ||
        !gameState ||
        !gameState.mapData ||
        typeof Game === 'undefined' ||
        typeof Game.logMessage !== 'function' ||
        typeof window.moveTowards !== 'function'
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("handleSeekingResourcesState: Missing critical data.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }
    const enemyId = enemy.id || 'Unknown Enemy';

    // 1. Validate State
    const validationResult = _validateSeekingState(enemy, gameState);
    if (!validationResult.isValid) {
        return false;
    }
    const targetCoords = validationResult.targetCoords;

    // 2. Attempt Movement Towards Resource or Handle Arrival
    return await _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);
}

// Attach to global scope for Enemy FSM
window.handleSeekingResourcesState = handleSeekingResourcesState;