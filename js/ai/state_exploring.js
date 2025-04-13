// console.log("state_exploring.js loaded"); // Removed module loaded log

/**
 * Handles AI logic when in the EXPLORING state, using gameState.
 * Focuses on movement: Storm Safety -> Probabilistic Move/Wait.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if an action was taken (move, wait), false if blocked and unable to act.
 */
async function handleExploringState(enemy, gameState) {
    // Check dependencies
    if (!enemy || !gameState || !gameState.safeZone || typeof Game === 'undefined' || typeof Game.logMessage !== 'function' || typeof getSafeZoneCenter !== 'function' || typeof moveTowards !== 'function' || typeof moveRandomly !== 'function') {
        Game.logMessage("handleExploringState: Missing enemy, gameState, or required functions.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return false; // Cannot act without dependencies
    }

    const enemyId = enemy.id || 'Unknown Enemy';
    const { safeZone } = gameState; // Destructure safeZone

    // 1. Storm Safety Check
    const isOutside = enemy.row < safeZone.minRow || enemy.row > safeZone.maxRow || enemy.col < safeZone.minCol || enemy.col > safeZone.maxCol;

    if (isOutside) {
        // Pass gameState to helper
        const center = getSafeZoneCenter(gameState);
        if (center) {
            Game.logMessage(`[DEBUG] handleExploringState: Attempting moveTowards for enemy ${enemyId} to safety`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            const moved = await moveTowards(enemy, center.row, center.col, "safety", gameState);
            Game.logMessage(`[DEBUG] handleExploringState: moveTowards result for enemy ${enemyId}: ${moved}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            if (moved) {
                return true; // Moved towards safety
            }
        }
        // If couldn't move towards safety (or center is null), try random move
        Game.logMessage(`[DEBUG] handleExploringState: Attempting moveRandomly for enemy ${enemyId}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        const movedRandom = await moveRandomly(enemy, gameState);
        Game.logMessage(`[DEBUG] handleExploringState: moveRandomly result for enemy ${enemyId}: ${movedRandom}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        if (movedRandom) {
            return true; // Moved randomly
        } else {
            // Log using gameState
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) waits (stuck in storm).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
            return true; // Counts as acting (waiting) if stuck
        }
    }

    // 2. Probabilistic Movement/Wait (If inside safe zone)
    // Assume config constants AI_EXPLORE_* are globally available for now
    const rand = Math.random();
    let actionTaken = false;

    if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE) {
        // Try Move towards center
        const center = getSafeZoneCenter(gameState); // Pass gameState
        if (center) {
            Game.logMessage(`[DEBUG] handleExploringState: Attempting moveTowards for enemy ${enemyId} to center`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            const moved = await moveTowards(enemy, center.row, center.col, "center", gameState);
            Game.logMessage(`[DEBUG] handleExploringState: moveTowards result for enemy ${enemyId}: ${moved}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            if (moved) {
                actionTaken = true;
            } else {
                // If moving towards center failed or center is null, wait
                Game.logMessage(`Enemy ${enemyId} waits (blocked from center).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
                return true; // Exit after waiting due to block
            }
        }
    } else if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE + AI_EXPLORE_MOVE_RANDOM_CHANCE) {
        // Try Move randomly
        Game.logMessage(`[DEBUG] handleExploringState: Attempting moveRandomly for enemy ${enemyId}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        const movedRandom = await moveRandomly(enemy, gameState);
        Game.logMessage(`[DEBUG] handleExploringState: moveRandomly result for enemy ${enemyId}: ${movedRandom}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        if (movedRandom) {
            actionTaken = true;
        }
        // If moveRandomly returns false (blocked), actionTaken remains false, handled below
    } else {
        // Wait action chosen explicitly
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        actionTaken = true; // Waiting counts as an action
    }

    // If no move was successfully made (moveTowards/moveRandomly returned false because blocked)
    if (!actionTaken) {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) waits (exploring, blocked).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
        actionTaken = true; // Waiting because blocked counts as an action
    }

    return actionTaken; // Return true if moved or waited
}
