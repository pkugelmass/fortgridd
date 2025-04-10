// AI Action Helpers (Using Items, etc.)
console.log("ai_actions.js loaded");

// --- AI Action Helpers ---

/**
 * Applies healing from a medkit to an enemy.
 * Decrements medkit count and increases HP, capped at max HP.
 * Assumes the decision to use the medkit has already been made.
 * @param {object} enemy - The enemy object using the medkit.
 */
function useMedkit(enemy) {
    // Check and decrement enemy.resources.medkits
    if (!enemy || !enemy.resources || enemy.resources.medkits <= 0) {
        console.error(`useMedkit called for enemy ${enemy?.id} with no medkits.`);
        return; // Cannot use if none available
    }

    enemy.resources.medkits--;
    const healAmount = HEAL_AMOUNT; // Use global constant
    const maxHp = enemy.maxHp || PLAYER_MAX_HP; // Use enemy's maxHp if defined, else fallback

    enemy.hp = Math.min(enemy.hp + healAmount, maxHp);

    // Logging is handled by the state handler that calls this
    // Game.logMessage(`Enemy ${enemy.id} used a medkit, HP: ${enemy.hp}/${maxHp}, Medkits left: ${enemy.resources.medkits}`, LOG_CLASS_ENEMY_EVENT);
}
