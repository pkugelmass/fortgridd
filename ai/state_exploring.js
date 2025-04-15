/**
 * Handles AI logic when in the EXPLORING state, using gameState.
 * Focuses on movement: Storm Safety -> Probabilistic Move/Wait.
 * @param {Enemy} enemy - The enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - True if an action was taken (move, wait), false if blocked and unable to act.
 */
async function handleExploringState(enemy, gameState) {
    if (
        !enemy ||
        !gameState ||
        !gameState.safeZone ||
        typeof Game === 'undefined' ||
        typeof Game.logMessage !== 'function' ||
        typeof window.getSafeZoneCenter !== 'function' ||
        typeof window.moveTowards !== 'function' ||
        typeof window.moveRandomly !== 'function'
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("handleExploringState: Missing enemy, gameState, or required functions.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }

    const enemyId = enemy.id || 'Unknown Enemy';
    const { safeZone } = gameState;

    // 1. Storm Safety Check
    const isOutside =
        enemy.row < safeZone.minRow ||
        enemy.row > safeZone.maxRow ||
        enemy.col < safeZone.minCol ||
        enemy.col > safeZone.maxCol;

    if (isOutside) {
        const center = window.getSafeZoneCenter(gameState);
        if (center) {
            Game.logMessage(`[DEBUG] handleExploringState: Attempting moveTowards for enemy ${enemyId} to safety`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            const moved = await window.moveTowards(enemy, center.row, center.col, "safety", gameState);
            Game.logMessage(`[DEBUG] handleExploringState: moveTowards result for enemy ${enemyId}: ${moved}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            if (moved) {
                return true;
            }
        }
        Game.logMessage(`[DEBUG] handleExploringState: Attempting moveRandomly for enemy ${enemyId}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        const movedRandom = await window.moveRandomly(enemy, gameState);
        Game.logMessage(`[DEBUG] handleExploringState: moveRandomly result for enemy ${enemyId}: ${movedRandom}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        if (movedRandom) {
            return true;
        } else {
            Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) waits (stuck in storm).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
            return true;
        }
    }

    // 2. Probabilistic Movement/Wait (If inside safe zone)
    const rand = Math.random();
    let actionTaken = false;

    if (rand < window.AI_EXPLORE_MOVE_AGGRESSION_CHANCE) {
        const center = window.getSafeZoneCenter(gameState);
        if (center) {
            Game.logMessage(`[DEBUG] handleExploringState: Attempting moveTowards for enemy ${enemyId} to center`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            const moved = await window.moveTowards(enemy, center.row, center.col, "center", gameState);
            Game.logMessage(`[DEBUG] handleExploringState: moveTowards result for enemy ${enemyId}: ${moved}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            if (moved) {
                actionTaken = true;
            } else {
                Game.logMessage(`Enemy ${enemyId} waits (blocked from center).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
                return true;
            }
        }
    } else if (rand < window.AI_EXPLORE_MOVE_AGGRESSION_CHANCE + window.AI_EXPLORE_MOVE_RANDOM_CHANCE) {
        Game.logMessage(`[DEBUG] handleExploringState: Attempting moveRandomly for enemy ${enemyId}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        const movedRandom = await window.moveRandomly(enemy, gameState);
        Game.logMessage(`[DEBUG] handleExploringState: moveRandomly result for enemy ${enemyId}: ${movedRandom}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        if (movedRandom) {
            actionTaken = true;
        }
    } else {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) waits.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        actionTaken = true;
    }

    if (!actionTaken) {
        Game.logMessage(`Enemy ${enemyId} at (${enemy.row},${enemy.col}) waits (exploring, blocked).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        actionTaken = true;
    }

    return actionTaken;
}

// Attach to global scope for Enemy FSM
window.handleExploringState = handleExploringState;