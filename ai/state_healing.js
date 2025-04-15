/**
 * Handles the AI's turn when in the HEALING state, using gameState.
 * Attempts to use a medkit and transitions back to EXPLORING.
 * @param {Enemy} enemy - The enemy instance.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True, as attempting to heal (or deciding not to) counts as the turn's action.
 */
function handleHealingState(enemy, gameState) {
    if (
        !enemy ||
        !gameState ||
        typeof window.useMedkit !== 'function'
    ) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("handleHealingState: Invalid enemy, gameState, or missing useMedkit function.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        if (enemy) enemy.state = window.AI_STATE_EXPLORING;
        return true;
    }

    const enemyId = enemy.id || 'Unknown Enemy';

    // Attempt to use the medkit (useMedkit now handles checks and logging)
    const healSuccess = window.useMedkit(enemy, gameState);

    // Always transition back to EXPLORING after attempting to heal
    if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
        Game.logMessage(`Enemy ${enemyId} transitioning from HEALING to EXPLORING.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
    }
    enemy.state = window.AI_STATE_EXPLORING;

    return true;
}

// Attach to global scope for Enemy FSM
window.handleHealingState = handleHealingState;