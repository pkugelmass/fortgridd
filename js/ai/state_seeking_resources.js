console.log("state_seeking_resources.js loaded");

/**
 * Handles AI logic when in the SEEKING_RESOURCES state.
 * Attempts to move towards the target resource. If the resource is gone upon arrival
 * or initially, re-evaluates the situation. If the AI reaches the resource, it picks it up.
 * @param {object} enemy - The enemy object.
 * @returns {boolean} - True if an action was taken (move, pickup, wait), false if re-evaluation is needed.
 */
function handleSeekingResourcesState(enemy) {
    // --- 1. Validate Target Resource Existence ---
    if (!enemy.targetResourceCoords) {
        console.warn(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) in SEEKING state without targetResourceCoords. Re-evaluating.`);
        performReevaluation(enemy);
        return false; // Needs re-evaluation
    }

    const targetRow = enemy.targetResourceCoords.row;
    const targetCol = enemy.targetResourceCoords.col;

    // Check if target coordinates are valid map indices
    if (targetRow < 0 || targetRow >= GRID_HEIGHT || targetCol < 0 || targetCol >= GRID_WIDTH || !mapData || !mapData[targetRow]) {
        console.warn(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) target resource coords (${targetRow},${targetCol}) are invalid or mapData missing. Re-evaluating.`);
        enemy.targetResourceCoords = null;
        performReevaluation(enemy);
        return false; // Needs re-evaluation
    }

    const currentTile = mapData[targetRow][targetCol];
    const isResourceTile = (currentTile === TILE_MEDKIT || currentTile === TILE_AMMO);

    // --- 2. Re-evaluation if Resource is Gone (Before Moving) ---
    if (!isResourceTile) {
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) finds target resource at (${targetRow},${targetCol}) is already gone. Re-evaluating...`, LOG_CLASS_ENEMY_EVENT);
        enemy.targetResourceCoords = null; // Clear the invalid target
        performReevaluation(enemy);
        return false; // Needs re-evaluation
    }

    // --- 3. Attempt Movement Towards Resource ---
    let actionTaken = false;
    if (enemy.row !== targetRow || enemy.col !== targetCol) {
        // moveTowards returns true if it moved (or attempted random fallback), false if truly blocked
        actionTaken = moveTowards(enemy, targetRow, targetCol, "resource");
        // If moveTowards returned true, the action (move or wait due to block) is complete for this turn.
        // If moveTowards returned false (truly blocked), we might consider it a 'wait' action.
        if (!actionTaken) {
             Game.logMessage(`Enemy ${enemy.id} waits (blocked from resource).`, LOG_CLASS_ENEMY_EVENT);
             actionTaken = true; // Treat being blocked as a 'wait' action for turn completion.
        }
    } else {
        // Already at the target, proceed to pickup check. No move action needed.
        // We don't set actionTaken=true yet, pickup is the action.
    }

    // --- 4. Check if Arrived at Target AND Pickup (Only if at target coords) ---
    if (enemy.row === targetRow && enemy.col === targetCol) {
        // Verify resource still exists *now*
        const tileAtArrival = mapData[enemy.row][enemy.col];
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
            actionTaken = true; // Pickup counts as the action
            // Return true below
        } else {
            // Resource disappeared between start of turn/move and arrival/pickup attempt
            Game.logMessage(`Enemy ${enemy.id} arrived at (${enemy.row},${enemy.col}) but resource was gone. Re-evaluating...`, LOG_CLASS_ENEMY_EVENT);
            enemy.targetResourceCoords = null;
            performReevaluation(enemy);
            return false; // Needs re-evaluation
        }
    }

    // If we moved towards the target but didn't arrive, actionTaken is true (from moveTowards).
    // If we were already at the target and picked it up, actionTaken is true.
    // If we were already at the target but it was gone, we returned false above.
    // If we tried to move but were blocked, actionTaken is true (treated as wait).
    return actionTaken;
}
