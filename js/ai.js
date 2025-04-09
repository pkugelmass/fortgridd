console.log("ai.js loaded");

// --- AI Configuration ---
// Detection range now stored per enemy in the 'enemies' array objects

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic --- (Uses Game.logMessage with classes)

/**
 * Executes turns for all AI enemies. Logs actions with CSS classes.
 * Executes turns for all AI enemies based on their current state.
 * Calls the appropriate state handler function for each enemy.
 */
function executeAiTurns() {
    if (typeof Game === 'undefined' || Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        if (typeof Game !== 'undefined' && !Game.isGameOver() && Game.getCurrentTurn() === 'ai') {
            Game.endAiTurn(); // Ensure turn ends even if AI logic is skipped
        }
        return;
    }

    const currentEnemiesTurnOrder = [...enemies]; // Iterate over a snapshot

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        const enemy = enemies.find(e => e.id === currentEnemiesTurnOrder[i].id); // Find current enemy in main array
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip if invalid/dead

        // --- FSM Logic ---
        // Call the handler function corresponding to the enemy's current state
        switch (enemy.state) {
            case AI_STATE_EXPLORING:
                handleExploringState(enemy);
                break;
            case AI_STATE_SEEKING_RESOURCES:
                handleSeekingResourcesState(enemy);
                break;
            case AI_STATE_ENGAGING_ENEMY:
                handleEngagingEnemyState(enemy);
                break;
            case AI_STATE_FLEEING:
                handleFleeingState(enemy);
                break;
            default:
                console.warn(`Enemy ${enemy.id} has unknown state: ${enemy.state}`);
                // Optionally default to exploring or just log
                handleExploringState(enemy); // Default to exploring for now
                break;
        }

        // Check end conditions after each enemy acts (important if an enemy action ends the game)
        if (Game.checkEndConditions()) return;

    } // End loop through enemies

    // End AI turn only if game didn't end during loop
    if (!Game.isGameOver()) {
        Game.endAiTurn(); // Handles setting turn and redraw if needed
    }
    // If game ended, final redraw already handled by setGameOver or checks above

} // End executeAiTurns
