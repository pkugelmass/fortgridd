/**
 * Attempts to use a medkit for the given enemy.
 * Checks if the enemy has medkits and is not at full health.
 * If successful, decrements medkit count, increases HP (capped at max HP),
 * logs the action using Game.logMessage, and returns true.
 * Otherwise, logs a failure message (optional) and returns false.
 * @param {Enemy} enemy - The enemy instance attempting to use the medkit.
 * @param {GameState} gameState - The current game state (for logging).
 * @returns {boolean} - True if the medkit was successfully used, false otherwise.
 */
function useMedkit(enemy, gameState) {
    if (
        !enemy ||
        !enemy.resources ||
        !gameState ||
        typeof Game === 'undefined' ||
        typeof Game.logMessage !== 'function'
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`useMedkit: Invalid enemy, gameState, or Game object.`, gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }

    const enemyId = enemy.id || 'Unknown Enemy';
    const maxHp = enemy.maxHp || window.PLAYER_MAX_HP;

    if (enemy.resources.medkits <= 0) {
        return false;
    }
    if (enemy.hp >= maxHp) {
        return false;
    }

    enemy.resources.medkits--;
    const healAmount = window.HEAL_AMOUNT || 1;
    const actualHeal = Math.min(healAmount, maxHp - enemy.hp);

    enemy.hp += actualHeal;

    Game.logMessage(
        `${enemyId} uses Medkit, heals ${actualHeal} HP (${enemy.hp}/${maxHp}). Medkits left: ${enemy.resources.medkits}`,
        gameState,
        { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT }
    );

    return true;
}

// Attach to global scope
window.useMedkit = useMedkit;