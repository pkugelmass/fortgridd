console.log("ai.js loaded");

// --- AI Configuration ---
// Detection range now stored per enemy in the 'enemies' array objects

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic --- (Uses Game.logMessage with classes)

const MAX_EVALUATIONS_PER_TURN = 3; // Limit state changes/re-evaluations per AI per turn

/**
 * Executes turns for all AI enemies. Logs actions with CSS classes.
 * Executes turns for all AI enemies based on their current state.
 * Allows for state re-evaluation and action within the same turn, up to a limit.
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

        // --- FSM Logic with Re-evaluation Loop ---
        let actionTaken = false;
        let evaluationCount = 0;

        while (!actionTaken && evaluationCount < MAX_EVALUATIONS_PER_TURN) {
            evaluationCount++;
            let currentHandlerResult = false; // Assume handler returns false (needs re-eval) unless it returns true

            // Call the handler function corresponding to the enemy's *current* state
            switch (enemy.state) {
                case AI_STATE_EXPLORING:
                    currentHandlerResult = handleExploringState(enemy); // TODO: Update handler to return boolean
                    break;
                case AI_STATE_SEEKING_RESOURCES:
                    currentHandlerResult = handleSeekingResourcesState(enemy); // TODO: Update handler to return boolean
                    break;
                case AI_STATE_ENGAGING_ENEMY:
                    currentHandlerResult = handleEngagingEnemyState(enemy); // TODO: Update handler to return boolean
                    break;
                case AI_STATE_FLEEING:
                    // currentHandlerResult = handleFleeingState(enemy); // TODO: Update handler to return boolean
                    console.warn(`Enemy ${enemy.id} Fleeing state not fully implemented yet.`); // Placeholder
                    currentHandlerResult = true; // Assume fleeing always counts as an action for now
                    break;
                default:
                    console.warn(`Enemy ${enemy.id} has unknown state: ${enemy.state}. Defaulting to Exploring.`);
                    enemy.state = AI_STATE_EXPLORING; // Force explore state
                    currentHandlerResult = false; // Force re-evaluation via explore handler in next loop iteration (if limit not hit)
                    break;
            }

            if (currentHandlerResult) {
                actionTaken = true; // Handler took a final action, break the while loop
            } else {
                // Handler returned false, meaning it couldn't act and needs re-evaluation
                // (or it already called performReevaluation which changed the state)
                // The loop continues with the potentially new state set by performReevaluation
                // console.log(`DEBUG: Enemy ${enemy.id} state handler returned false, re-evaluating state: ${enemy.state}`); // Optional debug log
            }
        } // End while loop for single enemy turn

        if (!actionTaken) {
            // Loop limit reached without a handler returning true
            console.warn(`Enemy ${enemy.id} reached max evaluations (${MAX_EVALUATIONS_PER_TURN}) without completing an action. Forcing wait.`);
            Game.logMessage(`Enemy ${enemy.id} waits (evaluation limit).`, LOG_CLASS_ENEMY_EVENT);
            // Consider this a completed turn action to prevent infinite game loops if AI gets stuck
        }

        // Check end conditions after each enemy finishes its turn (potentially multiple evaluations)
        if (Game.checkEndConditions()) return;

    } // End loop through enemies

    // End AI turn only if game didn't end during loop
    if (!Game.isGameOver()) {
        Game.endAiTurn(); // Handles setting turn and redraw if needed
    }
    // If game ended, final redraw already handled by setGameOver or checks above

} // End executeAiTurns
