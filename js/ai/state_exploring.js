console.log("state_exploring.js loaded");

/**
 * Handles AI logic when in the EXPLORING state.
 * Assumes the decision to be in this state was made by performReevaluation.
 * Focuses on movement: Storm Safety -> Probabilistic Move/Wait.
 * @param {object} enemy - The enemy object.
 * @returns {boolean} - True if an action was taken (move, wait), false if blocked and unable to act.
 */
function handleExploringState(enemy) {
    // performReevaluation has already determined EXPLORING is the correct state.
    // This handler just executes the exploring actions.

    // 1. Storm Safety Check
    const zone = Game.getSafeZone();
    const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;

    if (isOutside) {
        const center = getSafeZoneCenter();
        if (moveTowards(enemy, center.row, center.col, "safety")) {
            return true; // Moved towards safety
        } else {
             // If couldn't move towards safety, try random move to maybe get unstuck
             if (moveRandomly(enemy)) {
                  return true; // Moved randomly
              } else {
                  Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits (stuck in storm).`, LOG_CLASS_ENEMY_EVENT);
                  return true; // Counts as acting (waiting) if stuck
              }
         }
    }

    // 2. Probabilistic Movement/Wait (If inside safe zone)
    const rand = Math.random();
    let moveSuccessful = false;

    if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE) {
        // Try Move towards center
        const center = getSafeZoneCenter();
        moveSuccessful = moveTowards(enemy, center.row, center.col, "center");
        if (!moveSuccessful) {
            // If moving towards center failed, just wait instead of moving randomly
            Game.logMessage(`Enemy ${enemy.id} waits (blocked from center).`, LOG_CLASS_ENEMY_EVENT);
            moveSuccessful = true; // Treat waiting as a successful action for the turn
        }
    } else if (rand < AI_EXPLORE_MOVE_AGGRESSION_CHANCE + AI_EXPLORE_MOVE_RANDOM_CHANCE) {
        // Try Move randomly
        moveSuccessful = moveRandomly(enemy);
     } else {
         // Wait action chosen explicitly
         Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits.`, LOG_CLASS_ENEMY_EVENT);
         moveSuccessful = true; // Consider waiting as a "successful" action for this turn
     }

     // moveTowards/moveRandomly return true if they moved, false if truly blocked.
     // If they were blocked, they don't log anything here; waiting is handled below.
     // If wait was explicitly chosen, moveSuccessful is true.
     if (!moveSuccessful) {
         // If both moveTowards and moveRandomly failed (were blocked), then wait.
         Game.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) waits (exploring, blocked).`, LOG_CLASS_ENEMY_EVENT);
         moveSuccessful = true; // Waiting counts as an action
     }

    return moveSuccessful; // Return true if moved or waited, false only if error/unexpected issue
}
