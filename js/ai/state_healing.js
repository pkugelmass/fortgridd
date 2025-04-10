// console.log("state_healing.js loaded"); // Removed module loaded log

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
        Game.logMessage("handleHealingState: Invalid enemy, gameState, or missing useMedkit function.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        // Even if dependencies fail, we should probably transition out of HEALING
        if (enemy) enemy.state = AI_STATE_EXPLORING; // Default transition
        return true; // Count as an action (attempting to heal/recover from error)
    }

    const enemyId = enemy.id || 'Unknown Enemy';

    // Attempt to use the medkit (useMedkit now handles checks and logging)
    const healSuccess = useMedkit(enemy, gameState); // Pass gameState

    if (!healSuccess) {
        // Log failure only if needed (useMedkit now handles logging)
        // Game.logMessage(`Enemy ${enemyId} failed to use medkit.`, gameState, { level: 'WARN', target: 'CONSOLE' }); // Example if useMedkit didn't log
    }

    // Always transition back to EXPLORING after attempting to heal
    // The reevaluation logic should prevent entering HEALING if conditions aren't met.
    Game.logMessage(`Enemy ${enemyId} transitioning from HEALING to EXPLORING.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
    enemy.state = AI_STATE_EXPLORING;

    return true; // Attempting to heal (successful or not) consumes the turn.
}
