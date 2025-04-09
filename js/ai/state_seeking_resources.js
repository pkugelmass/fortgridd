console.log("state_seeking_resources.js loaded");

/**
 * Handles AI logic when in the SEEKING_RESOURCES state.
 * Attempts to move towards the target resource. If the resource is gone upon arrival
 * or initially, re-evaluates the situation. If the AI reaches the resource, it picks it up.
 * @param {object} enemy - The enemy object.
 */
function handleSeekingResourcesState(enemy) {
    // --- 1. Validate Target Resource Existence ---
    if (!enemy.targetResourceCoords) {
        console.warn(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) in SEEKING state without targetResourceCoords. Re-evaluating.`);
        // --- Re-evaluation Logic ---
        performReevaluation(enemy);
        return; // End turn after re-evaluation attempt
    }

    const targetRow = enemy.targetResourceCoords.row;
    const targetCol = enemy.targetResourceCoords.col;

    // Check if target coordinates are valid map indices
    if (targetRow < 0 || targetRow >= GRID_HEIGHT || targetCol < 0 || targetCol >= GRID_WIDTH || !mapData || !mapData[targetRow]) {
        console.warn(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) target resource coords (${targetRow},${targetCol}) are invalid or mapData missing. Re-evaluating.`);
        enemy.targetResourceCoords = null;
        performReevaluation(enemy);
        return; // End turn
    }

    const currentTile = mapData[targetRow][targetCol];
    const isResourceTile = (currentTile === TILE_MEDKIT || currentTile === TILE_AMMO);

    // --- 2. Re-evaluation if Resource is Gone (Before Moving) ---
    if (!isResourceTile) {
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) finds target resource at (${targetRow},${targetCol}) is already gone. Re-evaluating...`, LOG_CLASS_ENEMY_EVENT);
        enemy.targetResourceCoords = null; // Clear the invalid target
        performReevaluation(enemy);
        return; // End turn
    }

    // --- 3. Attempt Movement Towards Resource ---
    // Only move if not already at the target
    let moved = false;
    if (enemy.row !== targetRow || enemy.col !== targetCol) {
        moved = moveTowards(enemy, targetRow, targetCol, "resource");
        // moveTowards handles its own logging for success/failure/random fallback
    } else {
        // Already at the target, no move needed this turn, proceed to pickup check
        moved = true; // Consider "not needing to move" as success for this step
    }

    // --- 4. Check if Arrived at Target (After Move Attempt) ---
    // This check MUST happen after the move attempt
    if (enemy.row === targetRow && enemy.col === targetCol) {
        // Verify resource still exists *after* moving (another AI might have grabbed it)
        const tileAtArrival = mapData[enemy.row][enemy.col]; // Check the tile the enemy is NOW on
        if (tileAtArrival === TILE_MEDKIT || tileAtArrival === TILE_AMMO) {
            // Pickup Logic
            let pickedUpItem = "Unknown Resource";
            if (tileAtArrival === TILE_MEDKIT) {
                enemy.resources.medkits = (enemy.resources.medkits || 0) + 1;
                pickedUpItem = "Medkit";
            } else if (tileAtArrival === TILE_AMMO) {
                enemy.resources.ammo = (enemy.resources.ammo || 0) + (AI_AMMO_PICKUP_AMOUNT || 1);
                pickedUpItem = "Ammo";
            }

            mapData[enemy.row][enemy.col] = TILE_LAND; // Remove resource from map
            Game.logMessage(`Enemy ${enemy.id} picked up ${pickedUpItem} at (${enemy.row},${enemy.col}). Transitioning to Exploring.`, LOG_CLASS_ENEMY_EVENT);

            enemy.targetResourceCoords = null; // Clear target
            enemy.state = AI_STATE_EXPLORING; // Transition back to exploring
            // End turn (pickup was the action)
        } else {
            // Resource disappeared between start of turn and arrival
            Game.logMessage(`Enemy ${enemy.id} arrived at (${enemy.row},${enemy.col}) but resource was gone. Re-evaluating...`, LOG_CLASS_ENEMY_EVENT);
            enemy.targetResourceCoords = null;
            performReevaluation(enemy);
            // End turn
        }
    }
    // If moved towards target but didn't arrive, or was blocked, the turn ends here.
    // moveTowards handled logging the move/block.
    return;
}
