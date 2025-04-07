console.log("ai.js loaded");

// --- AI Configuration ---
// Detection range now stored per enemy in the 'enemies' array objects

// Array to hold all enemy objects
let enemies = [];

// --- AI Line of Sight Helper ---
/**
 * Checks if an attacker has a clear cardinal (non-diagonal) line of sight to a target.
 * @param {object} attacker - The enemy object shooting ({row, col}).
 * @param {object} target - The target object ({row, col}).
 * @param {number} maxRange - The maximum range to check (from config.js).
 * @returns {boolean} - True if line of sight is clear, false otherwise.
 */
function canShootTarget(attacker, target, maxRange) {
    // Check if essential data is available
    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null ||
        typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined' ||
        typeof GRID_HEIGHT === 'undefined' || typeof GRID_WIDTH === 'undefined') {
        console.error("canShootTarget: Missing critical data or invalid unit positions.");
        return false;
    }

    const dr = target.row - attacker.row;
    const dc = target.col - attacker.col;
    const dist = Math.abs(dr) + Math.abs(dc); // Manhattan distance

    // Basic checks
    if (dist === 0 || dist > maxRange) { return false; } // Out of range or self
    if (dr !== 0 && dc !== 0) { return false; } // Not a cardinal direction

    const stepR = Math.sign(dr); // Direction increment for row (-1, 0, or 1)
    const stepC = Math.sign(dc); // Direction increment for col (-1, 0, or 1)

    // Trace the line for obstacles, checking cells *between* attacker and target
    for (let i = 1; i < dist; i++) {
        const checkRow = attacker.row + stepR * i;
        const checkCol = attacker.col + stepC * i;

        // Although boundary checks *should* be handled by range, double-check is safe
        if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) {
             console.warn("LoS trace went out of bounds unexpectedly."); // Should not happen if target is in bounds and range check passed
             return false; // Blocked by edge
        }

        // Check mapData only if it's defined and the row exists
        if (mapData && mapData[checkRow]){
            const tileType = mapData[checkRow][checkCol];
            // Check for blocking tiles
            if (tileType === TILE_WALL || tileType === TILE_TREE) {
                // console.log(`LoS blocked by obstacle at (${checkRow}, ${checkCol})`); // Optional debug
                return false; // Blocked
            }
        } else {
            console.error("mapData issue during LoS check at row", checkRow); // Should not happen
            return false; // Block if map data is invalid somehow
        }
    }

    // If loop completes without returning false, LoS is clear
    return true;
}


// --- AI Turn Logic --- (Uses Game.logMessage)

/**
 * Executes turns for all AI enemies.
 * Priority: 1. Move to safety. 2. Attack adjacent. 3. Shoot player.
 * 4. Move towards target. 5. Random move. Logs actions.
 */
function executeAiTurns() {
    // Check Game object first
    if (typeof Game === 'undefined') { console.error("Game object not defined in executeAiTurns!"); return; }

    // Use Game manager for state checks
    if (Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        if (!Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); } // Ensure turn resets if called incorrectly
        return;
    }

    // console.log("Executing AI Turns..."); // Can be noisy
    let redrawNeeded = false; // Track if visual state changed
    const currentEnemiesTurnOrder = [...enemies]; // Iterate over a snapshot in case array changes mid-turn (enemy defeats enemy)

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        // Get current enemy from the main 'enemies' array, ensure it still exists and is alive
        const enemy = enemies.find(e => e.id === currentEnemiesTurnOrder[i].id);
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip if invalid/dead/doesn't exist

        let actedThisTurn = false; // Flag to ensure only one action (move/attack/shoot) per turn
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        const zone = Game.getSafeZone(); // Get safe zone boundaries

        // --- 1. Check if Outside Safe Zone (Storm Avoidance Logic) ---
        const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;
        if (isOutside) {
            // console.log(`Enemy ${enemy.id || i} at (${enemy.row}, ${enemy.col}) is outside safe zone, seeking safety.`); // Can be noisy
            const possibleMoves = []; // Find all valid adjacent moves first
            for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 // Boundary Check
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                    // Terrain Check & Collision Check
                    if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) { // Can only move onto land
                            let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol);
                            let occupiedByOtherEnemy = false;
                            if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } }
                            if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } }
                    } else { console.error("mapData not defined for AI safety move check!");} }
            }

            if (possibleMoves.length > 0) {
                const helpfulMoves = []; // Find moves that get closer to the safe zone boundaries
                for (const move of possibleMoves) {
                    let isHelpful = false;
                    if (enemy.row < zone.minRow && move.row > enemy.row) isHelpful = true;
                    else if (enemy.row > zone.maxRow && move.row < enemy.row) isHelpful = true;
                    else if (enemy.col < zone.minCol && move.col > enemy.col) isHelpful = true;
                    else if (enemy.col > zone.maxCol && move.col < enemy.col) isHelpful = true;
                    else if ((enemy.row >= zone.minRow && enemy.row <= zone.maxRow) && ((enemy.col < zone.minCol && move.col > enemy.col) || (enemy.col > zone.maxCol && move.col < enemy.col))) isHelpful = true;
                    else if ((enemy.col >= zone.minCol && enemy.col <= zone.maxCol) && ((enemy.row < zone.minRow && move.row > enemy.row) || (enemy.row > zone.maxRow && move.row < enemy.row))) isHelpful = true;
                    if (isHelpful) { helpfulMoves.push(move); }
                }

                let chosenMove = null;
                if (helpfulMoves.length > 0) { // Prioritize helpful moves
                    chosenMove = helpfulMoves[Math.floor(Math.random() * helpfulMoves.length)];
                } else { // Otherwise take any valid move
                     chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                }
                // Execute move
                Game.logMessage(`Enemy ${enemy.id || i} moves towards safety.`);
                enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                actedThisTurn = true; redrawNeeded = true;
            } else {
                 Game.logMessage(`Enemy ${enemy.id || i} waits (stuck in storm).`);
                 actedThisTurn = true; // No move possible, still counts as acting
            }
        } // End if(isOutside)


        // --- 2. Melee Attack Adjacent Unit (Player OR Enemy) ---
        // Only run if AI didn't already move towards safety
        if (!actedThisTurn) {
             let adjacentTarget = null; let targetList = [];
             // Check adjacent Player
             if (typeof player !== 'undefined' && player.hp > 0 && player.row !== null) { for (const dir of directions) { if (enemy.row + dir.dr === player.row && enemy.col + dir.dc === player.col) { targetList.push(player); break; } } }
             // Check adjacent Enemies
             if (typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; for (const dir of directions) { if (enemy.row + dir.dr === otherEnemy.row && enemy.col + dir.dc === otherEnemy.col) { targetList.push(otherEnemy); break; } } } }

             if (targetList.length > 0) {
                adjacentTarget = targetList[0]; // Attack first found target
                const isTargetPlayer = (adjacentTarget === player);
                const targetId = isTargetPlayer ? 'Player' : (adjacentTarget.id || '??');
                const damage = AI_ATTACK_DAMAGE; // From config.js

                Game.logMessage(`Enemy ${enemy.id || i} attacks ${targetId} for ${damage} damage.`); // Log Attack
                adjacentTarget.hp -= damage;
                actedThisTurn = true; redrawNeeded = true;

                if (adjacentTarget.hp <= 0) {
                    // Defeat message handled by checkEndConditions
                    if (!isTargetPlayer) {
                         enemies = enemies.filter(e => e.id !== adjacentTarget.id); // Remove enemy from main array
                         Game.logMessage(`Enemy ${adjacentTarget.id} defeated by Enemy ${enemy.id}!`); // Log AIvAI kill
                    } else {
                        // Player defeat message handled by checkEndConditions
                    }
                    // Check end conditions AFTER potential target removal
                     if (Game.checkEndConditions()) return; // Stop if game ended
                }
             }
        }

        // If game ended due to melee attack, stop processing AI
        if (Game.isGameOver()) return;


        // --- 3. Ranged Attack Player ---
        // Only run if AI didn't flee storm OR melee attack
        // Add checks for necessary globals/state
        if (!actedThisTurn &&
            typeof player !== 'undefined' && player.hp > 0 && player.row !== null &&
            enemy.resources && enemy.resources.ammo > 0 &&
            typeof RANGED_ATTACK_RANGE !== 'undefined' && typeof AI_ATTACK_DAMAGE !== 'undefined')
        {
            const distToPlayer = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);

            // Check Range and Line of Sight using helper function
            if (distToPlayer <= RANGED_ATTACK_RANGE && canShootTarget(enemy, player, RANGED_ATTACK_RANGE)) {
                enemy.resources.ammo--; // Consume ammo
                const damage = AI_ATTACK_DAMAGE; // Use melee damage for now, could add AI_RANGED_DAMAGE later
                player.hp -= damage;
                Game.logMessage(`Enemy ${enemy.id || i} shoots Player for ${damage} damage! (Ammo: ${enemy.resources.ammo})`); // Log Shot
                actedThisTurn = true; redrawNeeded = true;

                // Check end conditions AFTER player takes damage
                if (Game.checkEndConditions()) return; // Stop if game ended
            }
        } // End Ranged Attack check


        // --- 4. Move Towards Nearest Unit (influenced by HP state) ---
        // Only run if AI didn't flee, melee attack, OR shoot
        if (!actedThisTurn && typeof player !== 'undefined' && player.hp > 0 && player.row !== null) {
            let closestUnit = null; let minDistance = Infinity;

            // Find closest valid target (player or other living enemy)
            let playerDist = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);
            if (player.hp > 0) { // Only consider alive player
                 if (playerDist < minDistance) { minDistance = playerDist; closestUnit = player; }
            }
            if (typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; const dist = Math.abs(otherEnemy.row - enemy.row) + Math.abs(otherEnemy.col - enemy.col); if (dist < minDistance) { minDistance = dist; closestUnit = otherEnemy; } } }

            // Check if target is within enemy's detection range
            const enemyDetectionRange = enemy.detectionRange || 8; // Use specific or default
            if (closestUnit && minDistance <= enemyDetectionRange) {
                // Apply HP-based behavior
                const hpPercent = enemy.hp / (enemy.maxHp || 1); // Avoid division by zero
                let pursueTarget = (hpPercent > 0.3); // Pursue if HP > 30%

                if (pursueTarget) {
                    // Find all valid adjacent moves first
                    const possibleMoves = [];
                    for (const dir of directions) { const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc; if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) { if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol]; if (targetTileType === TILE_LAND) { let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol); let occupiedByOtherEnemy = false; if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemyCheck = enemies[j]; if (!otherEnemyCheck || otherEnemyCheck.id === enemy.id || otherEnemyCheck.hp <= 0) continue; if (otherEnemyCheck.row === targetRow && otherEnemyCheck.col === targetCol) { occupiedByOtherEnemy = true; break; } } } if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } } } else { console.error("mapData error");} } }

                    // Evaluate possible moves to find one that gets closer to the closestUnit
                    if (possibleMoves.length > 0) {
                        let bestMove = null; let minTargetDistance = minDistance;
                        for (const move of possibleMoves) { const newDist = Math.abs(closestUnit.row - move.row) + Math.abs(closestUnit.col - move.col); if (newDist < minTargetDistance) { minTargetDistance = newDist; bestMove = move; } }
                        // Execute move towards closest unit if found
                        if (bestMove) {
                             const targetId = (closestUnit === player) ? 'Player' : closestUnit.id;
                             // Game.logMessage(`Enemy ${enemy.id || i} moves towards ${targetId}.`); // Optional Log
                             enemy.row = bestMove.row; enemy.col = bestMove.col; actedThisTurn = true; redrawNeeded = true;
                         } // else no closer move found, fall through to random move below
                    } // else no possible moves at all
                } // else { Game.logMessage(`Enemy ${enemy.id || i} is cautious (low HP), moves randomly.`); } // Optional Log
            } // End if closest unit found within range
        } // End target seeking block


        // --- 5. Random Movement Logic (Fallback) ---
        // Only if AI took no other action
        if (!actedThisTurn) {
             const possibleMoves = []; // Find valid moves again
             for (const dir of directions) { const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc; if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) { if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol]; if (targetTileType === TILE_LAND) { let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol); let occupiedByOtherEnemy = false; if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } } if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } } } else { console.error("mapData error");} } }
             if (possibleMoves.length > 0) {
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 // Game.logMessage(`Enemy ${enemy.id || i} moves randomly.`); // Optional Log
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
                 // actedThisTurn = true; // No need to set flag here as it's the last possible action
             } // else { Game.logMessage(`Enemy ${enemy.id || i} waits (no random moves).`); } // Optional Log
        } // End random movement block

    } // End loop through enemies

    // End AI turn only if game is still active
    if (!Game.isGameOver()) {
        Game.endAiTurn(); // Handles setting turn and redraw if needed
    } else {
        // If game ended during AI turn, ensure final state is drawn (setGameOver should have done this)
        if (typeof redrawCanvas === 'function') redrawCanvas();
        // console.log("Game Over during AI turn - Input Disabled."); // Logged by setGameOver
    }

} // End executeAiTurns