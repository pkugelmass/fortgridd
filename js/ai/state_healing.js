console.log("state_healing.js loaded");

/**
 * Handles the AI's turn when in the HEALING state, using gameState.
 * Attempts to use a medkit and transitions back to EXPLORING.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True, as attempting to heal (or deciding not to) counts as the turn's action.
 */
function handleHealingState(enemy, gameState) {
    // Check dependencies
    if (!enemy || !gameState || typeof useMedkit !== 'function') {
        console.error("handleHealingState: Invalid enemy, gameState, or missing useMedkit function.");
        // Even if dependencies fail, we should probably transition out of HEALING
        if (enemy) enemy.state = AI_STATE_EXPLORING; // Default transition
        return true; // Count as an action (attempting to heal/recover from error)
    }

    const enemyId = enemy.id || 'Unknown Enemy';

    // Attempt to use the medkit (useMedkit now handles checks and logging)
    const healSuccess = useMedkit(enemy, gameState); // Pass gameState

    if (!healSuccess) {
        // Log failure only if needed (useMedkit might log internally, or we log here)
        // console.warn(`Enemy ${enemyId} failed to use medkit in HEALING state.`);
        // Game.logMessage(`Enemy ${enemyId} fails to use medkit.`, gameState, LOG_CLASS_ENEMY_EVENT);
    }

    // Always transition back to EXPLORING after attempting to heal
    // The reevaluation logic should prevent entering HEALING if conditions aren't met.
    // console.log(`Enemy ${enemyId} transitioning from HEALING to EXPLORING.`); // Debug log
    enemy.state = AI_STATE_EXPLORING;

    return true; // Attempting to heal (successful or not) consumes the turn.
}
