// console.log("state_seeking_resources.js loaded"); // Removed module loaded log


/**
 * Validates if the enemy should continue seeking its current target resource.
 * Checks if target coordinates are set, valid, and if the resource tile still exists.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {{isValid: boolean, targetCoords: {row: number, col: number}|null, needsReevaluation: boolean, reason: string|null}}
 */
function _validateSeekingState(enemy, gameState) {
    const { mapData } = gameState;
    const enemyId = enemy.id || 'Unknown Enemy';

    if (!enemy.targetResourceCoords) {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) in SEEKING state without targetResourceCoords. Re-evaluating.`, gameState, { level: 'WARN', target: 'CONSOLE' });
        // performReevaluation called by main loop
        return { isValid: false, targetCoords: null, needsReevaluation: true, reason: 'no_target' };
    }

    const targetRow = enemy.targetResourceCoords.row;
    const targetCol = enemy.targetResourceCoords.col;

    // Check if target coordinates are valid map indices
    if (targetRow < 0 || targetRow >= GRID_HEIGHT || targetCol < 0 || targetCol >= GRID_WIDTH || !mapData[targetRow]) {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) target resource coords (${targetRow},${targetCol}) are invalid or mapData missing. Re-evaluating.`, gameState, { level: 'WARN', target: 'CONSOLE' });
        enemy.targetResourceCoords = null;
        // performReevaluation called by main loop
        return { isValid: false, targetCoords: null, needsReevaluation: true, reason: 'invalid_coords' };
    }

    // Check if the resource is still there
    const currentTile = mapData[targetRow][targetCol];
    const isResourceTile = (currentTile === TILE_MEDKIT || currentTile === TILE_AMMO);

    if (!isResourceTile) {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) finds target resource at (${targetRow},${targetCol}) is already gone. Re-evaluating...`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        enemy.targetResourceCoords = null; // Clear the invalid target
        // performReevaluation called by main loop
        return { isValid: false, targetCoords: null, needsReevaluation: true, reason: 'resource_gone' };
    }

    // If all checks pass
    return { isValid: true, targetCoords: { row: targetRow, col: targetCol }, needsReevaluation: false, reason: null };
}


/**
 * Attempts to move the enemy towards the target coordinates or handles arrival logic.
 * Assumes pickup happens implicitly via moveTowards -> updateUnitPosition -> checkAndPickup.
 * @param {object} enemy - The enemy object.
 * @param {{row: number, col: number}} targetCoords - The coordinates of the target resource.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action (move/wait/arrival transition) was taken.
 */
async function _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState) {
    const enemyId = enemy.id || 'Unknown Enemy';
    const targetRow = targetCoords.row;
    const targetCol = targetCoords.col;

    if (enemy.row !== targetRow || enemy.col !== targetCol) {
        // Attempt to move towards the resource
        // Replicate the animation logic from state_fleeing.js
        const from = { row: enemy.row, col: enemy.col };
        const to = { row: targetRow, col: targetCol };
        let moved = false;

        // Check if the move is valid (reuse getValidMoves if needed)
        // For now, assume move is valid if not already at target
        if (typeof animationSystem !== "undefined" && typeof AnimationSystem.createMovementEffect === "function") {
            const moveEffect = AnimationSystem.createMovementEffect({
                unit: enemy,
                from,
                to,
                color: enemy.color || "#e53935",
                duration: typeof MOVEMENT_ANIMATION_DURATION !== "undefined" ? MOVEMENT_ANIMATION_DURATION : 180,
                easing: typeof ANIMATION_EASING !== "undefined" ? ANIMATION_EASING : "easeInOut"
            });
            animationSystem.addEffect(moveEffect);
            if (moveEffect.promise) {
                await moveEffect.promise;
            }
        }
        // Actually update the position after animation
        updateUnitPosition(enemy, targetRow, targetCol, gameState);
        moved = true;

        if (!moved) {
             // If moveTowards returned false (blocked), treat as wait
             Game.logMessage(`Enemy ${enemyId} waits (blocked from resource).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
             return true; // Wait is an action
        }
        return true; // Move is an action
    } else {
        // Already at the target location. Pickup is assumed to have happened implicitly
        // on the previous turn's move *onto* the resource tile via moveTowards->updateUnitPosition->checkAndPickup.
        // If we are here, it means we are *already* on the tile this turn.
        // The validation check (_validateSeekingState) should have already confirmed the resource tile *still exists*,
        // implying either pickup failed or hasn't been processed yet by map update.
        // For simplicity now, we assume arrival means success and transition.
        // A more robust system might explicitly check inventory or re-attempt pickup here.
        Game.logMessage(`Enemy ${enemyId} arrived at resource location (${enemy.row},${enemy.col}). Transitioning to Exploring.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        enemy.targetResourceCoords = null; // Clear target
        enemy.state = AI_STATE_EXPLORING; // Transition back
        return true; // Reaching/being at destination counts as action
    }
}


/**
 * Handles AI logic when in the SEEKING_RESOURCES state. Orchestrates validation and movement/arrival.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action was taken (move, wait), false if re-evaluation is needed or target invalid.
 */
async function handleSeekingResourcesState(enemy, gameState) {
    // Check dependencies (Simplified)
     if (!enemy || !gameState || !gameState.mapData || typeof Game === 'undefined' || typeof Game.logMessage !== 'function' || typeof moveTowards !== 'function') {
          Game.logMessage("handleSeekingResourcesState: Missing critical data.", gameState, { level: 'ERROR', target: 'CONSOLE' });
          return false; // Cannot act
     }
    const enemyId = enemy.id || 'Unknown Enemy';
    // const { mapData } = gameState; // No longer needed directly here

    // --- 1. Validate State ---
    const validationResult = _validateSeekingState(enemy, gameState);
    if (!validationResult.isValid) {
        // Reason logged in helper. Re-evaluation needed if target invalid/gone.
        return false; // Signal to main loop to re-evaluate
    }
    const targetCoords = validationResult.targetCoords;

    // --- 2. Attempt Movement Towards Resource or Handle Arrival ---
    return await _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);
}
