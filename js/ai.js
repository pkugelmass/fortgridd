console.log("ai.js loaded");

// --- AI Configuration ---
// Detection range now stored per enemy in the 'enemies' array objects

// --- AI Turn Logic --- (Uses Game.logMessage with classes)
// Global 'enemies' array removed; enemies are now accessed via gameState.enemies

/**
 * Helper function to re-evaluate the situation when a target is invalid or gone.
 * Priority: Threats -> Critical Needs -> Proactive Needs -> Default Explore.
 * Modifies the enemy's state based on current conditions and priorities.
 * Does NOT modify targets directly; state handlers are responsible for finding targets if needed.
 * @param {object} enemy - The enemy object.
 * @param {GameState} gameState - The current game state.
 */
function performReevaluation(enemy, gameState) {
    const originalState = enemy.state; // Keep track for logging changes

    // 1. Threat Assessment (Highest Priority)
    // Pass gameState to perception helpers
    const nearestEnemy = findNearestVisibleEnemy(enemy, gameState);
    if (nearestEnemy) {
        const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP); // Use maxHp if available
        if (hpPercent < AI_FLEE_HEALTH_THRESHOLD) {
            enemy.state = AI_STATE_FLEEING;
            enemy.targetEnemy = nearestEnemy; // Fleeing needs to know who to flee from
            enemy.targetResourceCoords = null;
        } else {
            enemy.state = AI_STATE_ENGAGING_ENEMY;
            enemy.targetEnemy = nearestEnemy; // Engaging needs a target
            enemy.targetResourceCoords = null;
        }
        // Log state change if different from original
        if (enemy.state !== originalState) {
            // Pass gameState to logMessage
            Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Sees ${nearestEnemy.id || 'Player'} -> ${enemy.state}`, gameState, LOG_CLASS_ENEMY_EVENT);
        }
        return; // Decision made based on threat
    }
    // Clear enemy target if no threat found
    enemy.targetEnemy = null;

    // 2. Self-Preservation (If No Immediate Threat)
    const hpPercent = enemy.hp / (enemy.maxHp || PLAYER_MAX_HP);
    // Use the single HEAL_PRIORITY threshold to decide if healing is needed *and* possible
    // Check enemy.resources.medkits
    if (hpPercent < AI_HEAL_PRIORITY_THRESHOLD && enemy.resources && enemy.resources.medkits > 0) {
        enemy.state = AI_STATE_HEALING;
        enemy.targetResourceCoords = null; // Healing doesn't need a resource target
        if (enemy.state !== originalState) {
            // Pass gameState to logMessage
            Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Low HP & has medkit -> ${enemy.state}`, gameState, LOG_CLASS_ENEMY_EVENT);
        }
        return; // Decision made to heal
    }

    // 3. Resource Acquisition (If No Threat & Not Healing)
    // Check Medkit need first (using the consolidated threshold)
    if (hpPercent < AI_HEAL_PRIORITY_THRESHOLD) { // Use the consolidated threshold
        // Pass gameState to resource finding helper
        const nearbyMedkit = findNearbyResource(enemy, enemy.detectionRange, TILE_MEDKIT, gameState);
        if (nearbyMedkit) {
            enemy.state = AI_STATE_SEEKING_RESOURCES;
            enemy.targetResourceCoords = nearbyMedkit; // Seeking needs a target
            if (enemy.state !== originalState || enemy.targetResourceCoords !== nearbyMedkit) { // Log if state or target changed
                 // Pass gameState to logMessage
                 Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Needs Medkit -> ${enemy.state} (${nearbyMedkit.row},${nearbyMedkit.col})`, gameState, LOG_CLASS_ENEMY_EVENT);
            }
            return; // Decision made to seek medkit
        }
    }
    // Check Ammo need if medkit wasn't needed/found (using the new threshold)
    // Check enemy.resources.ammo
    if (enemy.resources && enemy.resources.ammo < AI_SEEK_AMMO_THRESHOLD) { // Use the new threshold and check resources object
        // Pass gameState to resource finding helper
        const nearbyAmmo = findNearbyResource(enemy, enemy.detectionRange, TILE_AMMO, gameState);
        if (nearbyAmmo) {
            enemy.state = AI_STATE_SEEKING_RESOURCES;
            enemy.targetResourceCoords = nearbyAmmo;
            if (enemy.state !== originalState || enemy.targetResourceCoords !== nearbyAmmo) {
                 // Pass gameState to logMessage
                 Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Needs Ammo -> ${enemy.state} (${nearbyAmmo.row},${nearbyAmmo.col})`, gameState, LOG_CLASS_ENEMY_EVENT);
            }
            return; // Decision made to seek ammo
        }
    }

    // 4. Proactive Resource Acquisition (If No Threat, Not Healing, No Critical Need)
    // Check medkits first proactively
    // Pass gameState to resource finding helper
    let nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT, gameState);
    let resourceName = 'Medkit';
    if (!nearbyResource) {
        // Then check ammo proactively
        // Pass gameState to resource finding helper
        nearbyResource = findNearbyResource(enemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO, gameState);
        resourceName = 'Ammo';
    }
    if (nearbyResource) {
        enemy.state = AI_STATE_SEEKING_RESOURCES;
        enemy.targetResourceCoords = nearbyResource;
        if (enemy.state !== originalState || enemy.targetResourceCoords !== nearbyResource) {
            // Pass gameState to logMessage
            Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: Proactively seeks ${resourceName} -> ${enemy.state} (${nearbyResource.row},${nearbyResource.col})`, gameState, LOG_CLASS_ENEMY_EVENT);
        }
        return; // Decision made to seek proactively
    }


    // 5. Default Behavior (If None of the Above)
    enemy.state = AI_STATE_EXPLORING;
    enemy.targetResourceCoords = null; // Exploring doesn't need a target initially
    if (enemy.state !== originalState) {
        // Pass gameState to logMessage
        Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) re-evaluates: No priority actions -> ${enemy.state}`, gameState, LOG_CLASS_ENEMY_EVENT);
    }
    // No return needed, default state set
}

const MAX_EVALUATIONS_PER_TURN = 3; // Limit state changes/re-evaluations per AI per turn

/**
 * Executes turns for all AI enemies. Logs actions with CSS classes.
 * Executes turns for all AI enemies based on their current state.
 * Allows for state re-evaluation and action within the same turn, up to a limit.
 * @param {GameState} gameState - The current game state object.
 */
function runAiTurns(gameState) { // Renamed from executeAiTurns and accepts gameState
    // Check dependencies and game state using gameState
    if (typeof Game === 'undefined' || !gameState || Game.isGameOver(gameState) || Game.getCurrentTurn(gameState) !== 'ai' || !gameState.enemies) {
        if (typeof Game !== 'undefined' && gameState && !Game.isGameOver(gameState) && Game.getCurrentTurn(gameState) === 'ai') {
            Game.endAiTurn(gameState); // Ensure turn ends even if AI logic is skipped, pass gameState
        }
        return;
    }

    // Get active enemies from gameState
    const activeEnemies = gameState.enemies.filter(e => e && e.hp > 0);
    const currentEnemiesTurnOrder = [...activeEnemies]; // Iterate over a snapshot of active enemies

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        // Find the current enemy in the main gameState.enemies array to ensure modifications persist
        const enemy = gameState.enemies.find(e => e.id === currentEnemiesTurnOrder[i].id);
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip if invalid/dead (redundant check but safe)

        // --- FSM Logic with Re-evaluation Loop ---
        let actionTaken = false;
        let evaluationCount = 0;

        while (!actionTaken && evaluationCount < MAX_EVALUATIONS_PER_TURN) {
            evaluationCount++;
            performReevaluation(enemy, gameState); // Re-evaluate state *before* acting, pass gameState

            let currentHandlerResult = false; // Assume handler returns false (needs re-eval) unless it returns true

            // Call the handler function corresponding to the enemy's *current* (potentially updated) state
            // Pass gameState to all state handlers
            switch (enemy.state) {
                case AI_STATE_EXPLORING:
                    currentHandlerResult = handleExploringState(enemy, gameState);
                    break;
                case AI_STATE_SEEKING_RESOURCES:
                    currentHandlerResult = handleSeekingResourcesState(enemy, gameState);
                    break;
                case AI_STATE_ENGAGING_ENEMY:
                    currentHandlerResult = handleEngagingEnemyState(enemy, gameState);
                    break;
                case AI_STATE_FLEEING:
                    currentHandlerResult = handleFleeingState(enemy, gameState);
                    break;
                case AI_STATE_HEALING: // Added 2025-04-09
                    currentHandlerResult = handleHealingState(enemy, gameState);
                    break;
                default:
                    console.warn(`Enemy ${enemy.id} has unknown state: ${enemy.state}. Defaulting to Exploring.`);
                    enemy.state = AI_STATE_EXPLORING; // Force explore state
                    // Let the loop re-evaluate and run the Exploring handler next iteration
                    currentHandlerResult = false;
                    break;
            }

            if (currentHandlerResult) {
                actionTaken = true; // Handler took a final action, break the while loop
            }
            // If handler returned false, the loop continues (up to the limit),
            // performReevaluation will run again with the current state.
        } // End while loop for single enemy turn

        if (!actionTaken) {
            // Loop limit reached without a handler returning true
            console.warn(`Enemy ${enemy.id} reached max evaluations (${MAX_EVALUATIONS_PER_TURN}) without completing an action. Forcing wait.`);
            // Pass gameState to logMessage
            Game.logMessage(`Enemy ${enemy.id} waits (evaluation limit).`, gameState, LOG_CLASS_ENEMY_EVENT);
            // Consider this a completed turn action to prevent infinite game loops if AI gets stuck
        }

        // Check end conditions after each enemy finishes its turn, pass gameState
        if (Game.checkEndConditions(gameState)) return;

    } // End loop through enemies

    // End AI turn only if game didn't end during loop, pass gameState
    if (!Game.isGameOver(gameState)) {
        Game.endAiTurn(gameState); // Handles setting turn and redraw if needed
    }
    // If game ended, final redraw already handled by setGameOver or checks above

} // End runAiTurns
