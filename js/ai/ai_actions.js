// AI Action Helpers (Using Items, etc.)
console.log("ai_actions.js loaded");

// --- AI Action Helpers ---

/**
 * Attempts to use a medkit for the given enemy.
 * Checks if the enemy has medkits and is not at full health.
 * If successful, decrements medkit count, increases HP (capped at max HP),
 * logs the action using Game.logMessage, and returns true.
 * Otherwise, logs a failure message (optional) and returns false.
 * @param {object} enemy - The enemy object attempting to use the medkit.
 * @param {GameState} gameState - The current game state (for logging).
 * @returns {boolean} - True if the medkit was successfully used, false otherwise.
 */
function useMedkit(enemy, gameState) {
    // Validate inputs
    if (!enemy || !enemy.resources || !gameState || typeof Game === 'undefined' || typeof Game.logMessage !== 'function') {
        console.error(`useMedkit: Invalid enemy, gameState, or Game object.`);
        return false;
    }

    const enemyId = enemy.id || 'Unknown Enemy';
    const maxHp = enemy.maxHp || PLAYER_MAX_HP; // Use enemy's maxHp or fallback

    // Check conditions for using medkit
    if (enemy.resources.medkits <= 0) {
        // Game.logMessage(`${enemyId} cannot heal: No medkits left.`, gameState, LOG_CLASS_ENEMY_EVENT); // Optional: Log failure?
        // console.log(`${enemyId} cannot heal: No medkits left.`);
        return false;
    }
    if (enemy.hp >= maxHp) {
        // Game.logMessage(`${enemyId} cannot heal: Already at full health.`, gameState, LOG_CLASS_ENEMY_EVENT); // Optional: Log failure?
        // console.log(`${enemyId} cannot heal: Already at full health.`);
        return false;
    }

    // Conditions met, proceed with healing
    enemy.resources.medkits--;
    const healAmount = HEAL_AMOUNT || 1; // Use global constant or fallback
    const actualHeal = Math.min(healAmount, maxHp - enemy.hp); // Heal only up to max HP

    enemy.hp += actualHeal;

    // Log the successful action
    Game.logMessage(
        `${enemyId} uses Medkit, heals ${actualHeal} HP (${enemy.hp}/${maxHp}). Medkits left: ${enemy.resources.medkits}`,
        gameState,
        LOG_CLASS_ENEMY_EVENT // Use appropriate log class
    );

    return true; // Indicate successful use
}
