console.log("state_seeking_resources.js loaded");

/**
 * Handles AI logic when in the SEEKING_RESOURCES state, using gameState.
 * Attempts to move towards the target resource. Re-evaluates if the resource is gone.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action was taken (move, wait), false if re-evaluation is needed or target invalid.
 */
function handleSeekingResourcesState(enemy, gameState) {
    // Check dependencies
    if (!enemy || !gameState || !gameState.mapData || typeof Game === 'undefined' || typeof Game.logMessage !== 'function' || typeof performReevaluation !== 'function' || typeof moveTowards !== 'function') {
        console.error("handleSeekingResourcesState: Missing enemy, gameState, or required functions.");
        return false; // Cannot act without dependencies
    }
    const enemyId = enemy.id || 'Unknown Enemy';
    const { mapData } = gameState; // Destructure mapData

    // --- 1. Validate Target Resource Existence ---
    if (!enemy.targetResourceCoords) {
        console.warn(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) in SEEKING state without targetResourceCoords. Re-evaluating.`);
        performReevaluation(enemy, gameState); // Pass gameState
        return false; // Needs re-evaluation
    }

    const targetRow = enemy.targetResourceCoords.row;
    const targetCol = enemy.targetResourceCoords.col;

    // Check if target coordinates are valid map indices
    // Assume GRID_HEIGHT, GRID_WIDTH are globally available for now
    if (targetRow < 0 || targetRow >= GRID_HEIGHT || targetCol < 0 || targetCol >= GRID_WIDTH || !mapData[targetRow]) {
        console.warn(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) target resource coords (${targetRow},${targetCol}) are invalid or mapData missing. Re-evaluating.`);
        enemy.targetResourceCoords = null;
        performReevaluation(enemy, gameState); // Pass gameState
        return false; // Needs re-evaluation
    }

    // Check if the resource is still there using gameState.mapData
    // Assume TILE_MEDKIT, TILE_AMMO are globally available for now
    const currentTile = mapData[targetRow][targetCol];
    const isResourceTile = (currentTile === TILE_MEDKIT || currentTile === TILE_AMMO);

    // --- 2. Re-evaluation if Resource is Gone (Before Moving) ---
    if (!isResourceTile) {
        // Pass gameState to logMessage
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) finds target resource at (${targetRow},${targetCol}) is already gone. Re-evaluating...`, gameState, LOG_CLASS_ENEMY_EVENT);
        enemy.targetResourceCoords = null; // Clear the invalid target
        performReevaluation(enemy, gameState); // Pass gameState
        return false; // Needs re-evaluation
    }

    // --- 3. Attempt Movement Towards Resource ---
    let actionTaken = false;
    if (enemy.row !== targetRow || enemy.col !== targetCol) {
        // Pass gameState to moveTowards
        actionTaken = moveTowards(enemy, targetRow, targetCol, "resource", gameState);
        if (!actionTaken) {
             // If moveTowards returned false (blocked), treat as wait
             Game.logMessage(`Enemy ${enemyId} waits (blocked from resource).`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
             actionTaken = true;
        }
    } else {
        // Already at the target location. The pickup logic is implicitly handled
        // by updateUnitPosition which should have been called by moveTowards
        // on the *previous* turn's successful move *onto* the resource tile.
        // If we are here, it means we are *already* on the tile.
        // The resource should have been picked up, and the tile changed.
        // The check at the start of this function (!isResourceTile) should catch
        // if the resource was picked up by someone else *before* this turn started.
        // If we are on the tile and it *is* still a resource tile (somehow pickup failed?),
        // we should probably re-evaluate or attempt pickup again explicitly.
        // For now, assume arrival means pickup happened implicitly via moveTowards->updateUnitPosition->checkAndPickup.
        // Log arrival and transition.
        Game.logMessage(`Enemy ${enemyId} arrived at resource location (${enemy.row},${enemy.col}). Transitioning to Exploring.`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
        enemy.targetResourceCoords = null; // Clear target
        enemy.state = AI_STATE_EXPLORING; // Transition back
        actionTaken = true; // Reaching/being at destination counts as action
    }

    // --- 4. Check if Arrived (Handled within step 3 logic now) ---
    // The logic above now handles the arrival case. If the enemy moved this turn
    // but didn't arrive, actionTaken is true from moveTowards. If the enemy
    // was already at the location, actionTaken is set to true in the 'else' block.

    return actionTaken;
}
