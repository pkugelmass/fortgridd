console.log("state_exploring.js loaded");

/**
 * Handles AI logic when in the EXPLORING state.
 * Priority: Threats -> Critical Needs -> Storm Safety -> Proactive Needs -> Default Move/Wait.
 * @param {object} enemy - The enemy object.
 * @returns {boolean} - True if an action was taken (move, wait), false if a state transition occurred needing re-evaluation.
 */
function handleExploringState(enemy) {
    // Note: This function assumes that if it changes state, it should return false
    // to allow the main loop in executeAiTurns to process the new state immediately.
    // If it performs a move or wait action, it returns true.

    // 1. Threat Assessment
    const nearestEnemy = findNearestVisibleEnemy(enemy);
    if (nearestEnemy) {
        const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP); // Use player max HP as fallback if AI maxHp not set
        if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
            enemy.state = AI_STATE_FLEEING;
            enemy.targetEnemy = nearestEnemy; // Remember who to flee from
            Game.logMessage(`Enemy ${enemy.id} sees ${nearestEnemy.id || 'Player'} at (${enemy.row},${enemy.col}) and decides to flee (low HP)!`, LOG_CLASS_ENEMY_EVENT);
            return false; // State changed, re-evaluate in Fleeing state
        } else {
            enemy.state = AI_STATE_ENGAGING_ENEMY;
            enemy.targetEnemy = nearestEnemy;
            Game.logMessage(`Enemy ${enemy.id} sees ${nearestEnemy.id || 'Player'} at (${enemy.row},${enemy.col}) and decides to engage!`, LOG_CLASS_ENEMY_EVENT);
            return false; // State changed, re-evaluate in Engaging state
        }
    }

    // 2. Critical Resource Check (Only if no threat detected)
    // If we reach here, no threat was found.
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
            return false; // State changed, re-evaluate in Seeking state
        }
    }

    // 3. Default Action (Only if no threat or critical need transition)
    // If we reach here, no threat and no critical need found/transitioned.
    const zone = Game.getSafeZone();
    const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;

    // 3a. Storm Safety
    if (isOutside) {
        const center = getSafeZoneCenter();
        if (moveTowards(enemy, center.row, center.col, "safety")) {
            return true; // Moved towards safety
        } else {
             // If couldn't move towards safety, try random move to maybe get unstuck
             if (moveRandomly(enemy)) {
                  return true; // Moved randomly
              } else {
                  Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits (stuck in storm).`, LOG_CLASS_ENEMY_EVENT);
                  return true; // Counts as acting (waiting) if stuck
              }
         }
    }

    // 3b. Proactive Resource Scan (Only if safe from storm)
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
         return false; // State changed, re-evaluate in Seeking state
     }

    // 3c. Probabilistic Movement/Wait (Only if safe & no proactive resource target)
    const rand = Math.random();
    let moveSuccessful = false;

    if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE) {
        // Try Move towards center
        const center = getSafeZoneCenter();
        moveSuccessful = moveTowards(enemy, center.row, center.col, "center");
        if (!moveSuccessful) {
            // If moving towards center failed, try random move as fallback
            moveSuccessful = moveRandomly(enemy);
        }
    } else if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE + AI_EXPLORE_MOVE_RANDOM_CHANCE) {
        // Try Move randomly
        moveSuccessful = moveRandomly(enemy);
     } else {
         // Wait action chosen explicitly
         Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits.`, LOG_CLASS_ENEMY_EVENT);
         moveSuccessful = true; // Consider waiting as a "successful" action for this turn
     }

     // moveTowards/moveRandomly return true if they moved/waited, false if truly blocked.
     // If they were blocked, they log their own wait message.
     // If wait was explicitly chosen, moveSuccessful is true.
     // Therefore, the final return value reflects whether *any* action (move/wait) occurred.
    return moveSuccessful;


    /* --- Old Logic ---
    // 2. Critical Resource Check (Only if no threat detected)
    if (!acted) {
        const needsMedkit = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP) < AI_SEEK_HEALTH_THRESHOLD;
        const needsAmmo = enemy.resources.ammo <= 0; // Assuming resources.ammo exists

        if (needsMedkit || needsAmmo) {
            const resourceType = needsMedkit ? TILE_MEDKIT : TILE_AMMO;
            const resourceRange = enemy.detectionRange || AI_RANGE_MAX; // Use detection range for critical needs
            const nearbyResource = findNearbyResource(enemy, resourceRange, resourceType);

            if (nearbyResource) {
            }
        }
    }
    */
}
