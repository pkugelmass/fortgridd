console.log("state_exploring.js loaded");

/**
 * Handles AI logic when in the EXPLORING state.
 * Priority: Threats -> Critical Needs -> Storm Safety -> Proactive Needs -> Default Move/Wait.
 * @param {object} enemy - The enemy object.
 */
function handleExploringState(enemy) {
    let acted = false; // Track if an action/transition occurred this turn

    // 1. Threat Assessment
    const nearestEnemy = findNearestVisibleEnemy(enemy);
    if (nearestEnemy) {
        const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP); // Use player max HP as fallback if AI maxHp not set
        if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
            enemy.state = AI_STATE_FLEEING;
            enemy.targetEnemy = nearestEnemy; // Remember who to flee from
            Game.logMessage(`Enemy ${enemy.id} sees ${nearestEnemy.id || 'Player'} at (${enemy.row},${enemy.col}) and decides to flee (low HP)!`, LOG_CLASS_ENEMY_EVENT);
            acted = true;
        } else {
            enemy.state = AI_STATE_ENGAGING_ENEMY;
            enemy.targetEnemy = nearestEnemy;
            Game.logMessage(`Enemy ${enemy.id} sees ${nearestEnemy.id || 'Player'} at (${enemy.row},${enemy.col}) and decides to engage!`, LOG_CLASS_ENEMY_EVENT);
            acted = true;
        }
    }

    // 2. Critical Resource Check (Only if no threat detected)
    if (!acted) {
        const needsMedkit = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP) < AI_SEEK_HEALTH_THRESHOLD;
        const needsAmmo = enemy.resources.ammo <= 0; // Assuming resources.ammo exists

        if (needsMedkit || needsAmmo) {
            const resourceType = needsMedkit ? TILE_MEDKIT : TILE_AMMO;
            const resourceRange = enemy.detectionRange || AI_RANGE_MAX; // Use detection range for critical needs
            const nearbyResource = findNearbyResource(enemy, resourceRange, resourceType);

            if (nearbyResource) {
                enemy.state = AI_STATE_SEEKING_RESOURCES;
                enemy.targetResourceCoords = nearbyResource;
                const resourceName = resourceType === TILE_MEDKIT ? 'Medkit' : 'Ammo';
                Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) needs ${resourceName} and spots one nearby. Transitioning to Seeking.`, LOG_CLASS_ENEMY_EVENT);
                acted = true;
            }
        }
    }

    // 3. Default Action (Only if no threat or critical need transition)
    if (!acted) {
        const zone = Game.getSafeZone();
        const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;

        // 3a. Storm Safety
        if (isOutside) {
            const center = getSafeZoneCenter();
            if (moveTowards(enemy, center.row, center.col, "safety")) {
                acted = true;
            } else {
                 // If couldn't move towards safety, try random move to maybe get unstuck
                 if (moveRandomly(enemy)) {
                      acted = true;
                  } else {
                      Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits (stuck in storm).`, LOG_CLASS_ENEMY_EVENT);
                      acted = true; // Counts as acting if stuck
                  }
             }
        }

        // 3b. Proactive Resource Scan (Only if safe from storm)
        if (!acted) {
            // Check for either medkits or ammo proactively
            let nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT);
            let resourceName = 'Medkit';
            if (!nearbyResource) {
                nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO);
                resourceName = 'Ammo';
            }

             if (nearbyResource) {
                 enemy.state = AI_STATE_SEEKING_RESOURCES;
                 enemy.targetResourceCoords = nearbyResource;
                 Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) spots ${resourceName} nearby. Transitioning to Seeking.`, LOG_CLASS_ENEMY_EVENT);
                 acted = true;
             }
         }

        // 3c. Probabilistic Movement/Wait (Only if safe & no proactive resource target)
        if (!acted) {
            const rand = Math.random();
            let moveSuccessful = false;

            if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE) {
                // Try Move towards center
                const center = getSafeZoneCenter();
                moveSuccessful = moveTowards(enemy, center.row, center.col, "center");
                if (!moveSuccessful) {
                    // If moving towards center failed, try random move as fallback
                    moveSuccessful = moveRandomly(enemy);
                    // Optional: Log fallback differently?
                    // if (moveSuccessful) { Game.logMessage(`Enemy ${enemy.id} moves randomly (fallback after center).`, LOG_CLASS_ENEMY_EVENT); }
                }
            } else if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE + AI_EXPLORE_MOVE_RANDOM_CHANCE) {
                // Try Move randomly
                moveSuccessful = moveRandomly(enemy);
                 // No fallback needed if random move was the primary choice and failed
             } else {
                 // Wait action chosen explicitly
                 Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits.`, LOG_CLASS_ENEMY_EVENT);
                 moveSuccessful = true; // Consider waiting as a "successful" action for this turn
             }

             // If no move was successful (and wait wasn't chosen), log waiting due to being blocked
             // Note: moveTowards/moveRandomly now log their own failures/waits if applicable
             // if (!moveSuccessful) {
             //      Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits (no moves).`, LOG_CLASS_ENEMY_EVENT);
             // }
             // In all cases within this block (3c), the enemy has taken its turn action (move or wait).
            acted = true; // Ensure acted is true if this block was reached.
        }
    }
    // If no action was taken (e.g., state transition happened), that's fine.
    // The executeAiTurns loop handles calling the next state's handler if needed.
}
