console.log("state_healing.js loaded");

/**
 * Handles the AI's turn when in the HEALING state.
 * The primary action is to use a medkit.
 * Assumes the decision to enter this state (low health, safe, has medkit) was made by performReevaluation.
 * @param {object} enemy - The enemy object.
 * @returns {boolean} - True if an action (healing) was taken, false otherwise (should not happen in this state).
 */
function handleHealingState(enemy) {
    if (!enemy) {
        console.error("handleHealingState: Invalid enemy object.");
        return false; // Indicate no action taken due to error
    }

    // Check enemy.resources.medkits
    if (enemy.resources && enemy.resources.medkits > 0) {
        const hpBefore = enemy.hp;
        try {
            useMedkit(enemy); // Call the helper function to apply healing
        } catch (error) {
            console.error(`Error during useMedkit for enemy ${enemy.id}:`, error);
            return false; // Indicate action failed due to error
        }
        const maxHp = enemy.maxHp || PLAYER_MAX_HP; // Use enemy's maxHp if defined, else fallback
        // Log using enemy.resources.medkits
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) uses a medkit (HP: ${hpBefore} -> ${enemy.hp}/${maxHp}, Medkits: ${enemy.resources.medkits}).`, LOG_CLASS_ENEMY_EVENT);
        return true; // Healing action consumes the turn
    } else {
        // This case should ideally not be reached if performReevaluation is correct,
        // but handle it defensively.
        console.warn(`Enemy ${enemy.id} entered HEALING state but has no medkits (in resources).`);
        // No action taken, trigger re-evaluation in the main loop by returning false.
        // No need to call performReevaluation directly here.
        return false;
    }
}
