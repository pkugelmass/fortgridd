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
    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof GRID_WIDTH === 'undefined') {
        console.error("canShootTarget: Missing critical data or invalid unit positions."); return false;
    }
    const dr = target.row - attacker.row; const dc = target.col - attacker.col; const dist = Math.abs(dr) + Math.abs(dc);
    if (dist === 0 || dist > maxRange) { return false; } if (dr !== 0 && dc !== 0) { return false; } // Not cardinal
    const stepR = Math.sign(dr); const stepC = Math.sign(dc);
    for (let i = 1; i < dist; i++) { // Check cells between
        const checkRow = attacker.row + stepR * i; const checkCol = attacker.col + stepC * i;
        if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { return false; }
        if (mapData && mapData[checkRow]){ const tileType = mapData[checkRow][checkCol]; if (tileType === TILE_WALL || tileType === TILE_TREE) { return false; } }
        else { console.error("mapData issue during LoS check at row", checkRow); return false; }
    }
    return true; // LoS is clear
}


// --- AI Turn Logic --- (Uses Game.logMessage with classes)

/**
 * Executes turns for all AI enemies. Logs actions with CSS classes.
 * Priority: 1. Move to safety. 2. Attack adjacent. 3. Shoot player.
 * 4. Move towards target. 5. Random move. Calls Game.checkEndConditions().
 */
function executeAiTurns() {
    if (typeof Game === 'undefined' || Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') { if (typeof Game !== 'undefined' && !Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); } return; }

    let redrawNeeded = false;
    const currentEnemiesTurnOrder = [...enemies]; // Iterate over a snapshot

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        const enemy = enemies.find(e => e.id === currentEnemiesTurnOrder[i].id); // Find current enemy in main array
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip if invalid/dead

        let actedThisTurn = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        const zone = Game.getSafeZone(); // Get safe zone boundaries
        const enemyEvent = LOG_CLASS_ENEMY_EVENT; // CSS class for general enemy logs (from config.js)
        const playerBad = LOG_CLASS_PLAYER_BAD; // CSS class when player is negatively affected (from config.js)

        // --- 1. Check if Outside Safe Zone (Storm Avoidance Logic) ---
        const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;
        if (isOutside) {
            const possibleMoves = []; // Find all valid adjacent moves first
            for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
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
                    if (enemy.row < zone.minRow && move.row > enemy.row) isHelpful = true; else if (enemy.row > zone.maxRow && move.row < enemy.row) isHelpful = true; else if (enemy.col < zone.minCol && move.col > enemy.col) isHelpful = true; else if (enemy.col > zone.maxCol && move.col < enemy.col) isHelpful = true; else if ((enemy.row >= zone.minRow && enemy.row <= zone.maxRow) && ((enemy.col < zone.minCol && move.col > enemy.col) || (enemy.col > zone.maxCol && move.col < enemy.col))) isHelpful = true; else if ((enemy.col >= zone.minCol && enemy.col <= zone.maxCol) && ((enemy.row < zone.minRow && move.row > enemy.row) || (enemy.row > zone.maxRow && move.row < enemy.row))) isHelpful = true;
                    if (isHelpful) { helpfulMoves.push(move); }
                }

                let chosenMove = null;
                if (helpfulMoves.length > 0) { chosenMove = helpfulMoves[Math.floor(Math.random() * helpfulMoves.length)]; }
                else { chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; }

                Game.logMessage(`Enemy ${enemy.id || i} moves towards safety to (${chosenMove.row},${chosenMove.col}).`, enemyEvent); // Log Move
                enemy.row = chosenMove.row; enemy.col = chosenMove.col; actedThisTurn = true; redrawNeeded = true;
            } else {
                 Game.logMessage(`Enemy ${enemy.id || i} waits (stuck in storm).`, enemyEvent); // Log Wait
                 actedThisTurn = true; // No move possible, still counts as acting
            }
        } // End if(isOutside)

        // --- 2. Melee Attack Adjacent Unit (Player OR Enemy) ---
        if (!actedThisTurn) {
             let adjacentTarget = null; let targetList = [];
             // Find adjacent targets (player or other living enemies)
             if (typeof player !== 'undefined' && player.hp > 0 && player.row !== null) { for (const dir of directions) { if (enemy.row + dir.dr === player.row && enemy.col + dir.dc === player.col) { targetList.push(player); break; } } }
             if (typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; for (const dir of directions) { if (enemy.row + dir.dr === otherEnemy.row && enemy.col + dir.dc === otherEnemy.col) { targetList.push(otherEnemy); break; } } } }

             if (targetList.length > 0) {
                adjacentTarget = targetList[0]; // Attack first found target
                const isTargetPlayer = (adjacentTarget === player);
                const targetId = isTargetPlayer ? 'Player' : (adjacentTarget.id || '??');
                const damage = AI_ATTACK_DAMAGE; // From config.js

                // Log attack with appropriate class based on target
                Game.logMessage(`Enemy ${enemy.id || i} attacks ${targetId} at (${adjacentTarget.row},${adjacentTarget.col}) for ${damage} damage.`, isTargetPlayer ? playerBad : enemyEvent);
                adjacentTarget.hp -= damage;
                actedThisTurn = true; redrawNeeded = true;

                if (adjacentTarget.hp <= 0) { // Check if target died
                    // Defeat message logged by checkEndConditions (which covers player defeat & win condition)
                    if (!isTargetPlayer) {
                         enemies = enemies.filter(e => e.id !== adjacentTarget.id); // Remove enemy from main array
                         Game.logMessage(`Enemy ${adjacentTarget.id} defeated by Enemy ${enemy.id}!`, enemyEvent); // Log AIvAI kill specifically
                    }
                }
                 // Check end conditions AFTER potential target removal & checkEndConditions logs win/loss
                 if (Game.checkEndConditions()) return; // Stop if game ended
            }
        }

        // If game ended due to melee attack, stop processing AI for this turn
        if (Game.isGameOver()) return;

        // --- 3. Ranged Attack Player ---
        // Only run if AI didn't flee storm OR melee attack
        if (!actedThisTurn &&
            typeof player !== 'undefined' && player.hp > 0 && player.row !== null && // Player valid target
            enemy.resources && enemy.resources.ammo > 0 && // AI has ammo
            typeof RANGED_ATTACK_RANGE !== 'undefined' && typeof AI_ATTACK_DAMAGE !== 'undefined') // Config ready
        {
            const distToPlayer = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);

            // Check Range and Line of Sight using helper function
            if (distToPlayer <= RANGED_ATTACK_RANGE && canShootTarget(enemy, player, RANGED_ATTACK_RANGE)) {
                 enemy.resources.ammo--; // Consume ammo
                 const damage = AI_ATTACK_DAMAGE; // Use general AI damage for now
                 player.hp -= damage;
                 Game.logMessage(`Enemy ${enemy.id || i} shoots Player for ${damage} damage! (Ammo: ${enemy.resources.ammo})`, playerBad); // Log Shot with player class
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
             let playerDist = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col); if (player.hp > 0 && playerDist < minDistance) { minDistance = playerDist; closestUnit = player; }
             if (typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; const dist = Math.abs(otherEnemy.row - enemy.row) + Math.abs(otherEnemy.col - enemy.col); if (dist < minDistance) { minDistance = dist; closestUnit = otherEnemy; } } }

             // Check if target is within enemy's detection range
             const enemyDetectionRange = enemy.detectionRange || AI_RANGE_MAX; // Use specific or fallback from config.js
             if (closestUnit && minDistance <= enemyDetectionRange) {
                // Apply HP-based behavior
                const hpPercent = enemy.hp / (enemy.maxHp || 1); // Ensure maxHp exists or default to avoid NaN
                let pursueTarget = (hpPercent > AI_PURSUE_HP_THRESHOLD); // Pursue if HP > threshold (from config.js)

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
                             Game.logMessage(`Enemy ${enemy.id || i} moves towards ${targetId} at (${bestMove.row},${bestMove.col}).`, enemyEvent); // <<< LOG
                             enemy.row = bestMove.row; enemy.col = bestMove.col; actedThisTurn = true; redrawNeeded = true;
                         } // else no closer move found, fall through to random move below
                    } // else no possible moves at all
                } else { Game.logMessage(`Enemy ${enemy.id || i} is cautious (low HP), moves randomly instead.`, enemyEvent); } // <<< LOG Caution
             } // End if closest unit found within range
        } // End target seeking block


        // --- 5. Random Movement Logic (Fallback) ---
        // Only if AI took no other action
        if (!actedThisTurn) {
             const possibleMoves = []; // Find valid moves again
             for (const dir of directions) { const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc; if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) { if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol]; if (targetTileType === TILE_LAND) { let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol); let occupiedByOtherEnemy = false; if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } } if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } } } else { console.error("mapData error");} } }
             if (possibleMoves.length > 0) {
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 Game.logMessage(`Enemy ${enemy.id || i} moves randomly to (${chosenMove.row},${chosenMove.col}).`, enemyEvent); // <<< LOG
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
                 actedThisTurn = true; // Mark as acted
             } else {
                 Game.logMessage(`Enemy ${enemy.id || i} waits (no moves).`, enemyEvent); // <<< LOG
                 actedThisTurn = true; // Counts as acting if stuck
            }
        } // End random movement block

    } // End loop through enemies

    // End AI turn only if game didn't end during loop
    if (!Game.isGameOver()) {
        Game.endAiTurn(); // Handles setting turn and redraw if needed
    }
    // If game ended, final redraw already handled by setGameOver or checks above

} // End executeAiTurns
