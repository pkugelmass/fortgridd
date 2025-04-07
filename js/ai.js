console.log("ai.js loaded");

// --- AI Configuration ---
// Detection range stored per enemy

// --- AI State ---
let enemies = []; // Array holds all enemy objects

// --- AI Helper Functions ---

/**
 * Finds valid adjacent landing spots (walkable, unoccupied land) for an enemy.
 * @param {object} enemy - The enemy object ({row, col, id}).
 * @returns {Array<{row: number, col: number}>} - An array of valid move coordinates.
 */
function getValidMoves(enemy) {
    const possibleMoves = [];
    const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

    if (enemy.row === null || enemy.col === null) return []; // Cannot move if position invalid

    for (const dir of directions) {
        const targetRow = enemy.row + dir.dr;
        const targetCol = enemy.col + dir.dc;

        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            // Terrain Check (AI only considers Land walkable for general moves)
            if (typeof mapData !== 'undefined' && mapData[targetRow] && mapData[targetRow][targetCol] === TILE_LAND) {
                // Player Collision Check
                let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol);
                // Other Enemy Collision Check
                let occupiedByOtherEnemy = false;
                if (typeof enemies !== 'undefined' && enemies.length > 0) {
                    for (const otherEnemy of enemies) {
                        // Check only other *living* enemies
                        if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue;
                        if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) {
                            occupiedByOtherEnemy = true;
                            break;
                        }
                    }
                }
                // Add move if valid and unoccupied
                if (!occupiedByPlayer && !occupiedByOtherEnemy) {
                    possibleMoves.push({ row: targetRow, col: targetCol });
                }
            }
        }
    }
    return possibleMoves;
}


/** Checks cardinal Line of Sight */
function canShootTarget(attacker, target, maxRange) {
    if (!attacker || !target || attacker.row === null || attacker.col === null || target.row === null || target.col === null || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof GRID_WIDTH === 'undefined') { return false; }
    const dr = target.row - attacker.row; const dc = target.col - attacker.col; const dist = Math.abs(dr) + Math.abs(dc);
    if (dist === 0 || dist > maxRange) { return false; } if (dr !== 0 && dc !== 0) { return false; } // Not cardinal
    const stepR = Math.sign(dr); const stepC = Math.sign(dc);
    for (let i = 1; i < dist; i++) { const checkRow = attacker.row + stepR * i; const checkCol = attacker.col + stepC * i; if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { return false; } if (mapData && mapData[checkRow]){ const tileType = mapData[checkRow][checkCol]; if (tileType === TILE_WALL || tileType === TILE_TREE) { return false; } } else { return false; } }
    return true; // LoS is clear
}

// --- AI Action Functions ---
// Each function attempts an action and returns true if successful (action taken), false otherwise.

/** Attempts to move the enemy towards the safe zone if outside. */
function tryMoveToSafety(enemy, zone) {
    const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;
    if (!isOutside) return false; // Not outside, no action needed here

    const possibleMoves = getValidMoves(enemy);
    if (possibleMoves.length === 0) {
        Game.logMessage(`Enemy ${enemy.id || '?'} waits (stuck in storm).`, 'log-enemy-event');
        return true; // Counts as acting (waiting because stuck)
    }

    const helpfulMoves = [];
    for (const move of possibleMoves) { /* Find helpful moves logic */
        let isHelpful = false; if (enemy.row < zone.minRow && move.row > enemy.row) isHelpful = true; else if (enemy.row > zone.maxRow && move.row < enemy.row) isHelpful = true; else if (enemy.col < zone.minCol && move.col > enemy.col) isHelpful = true; else if (enemy.col > zone.maxCol && move.col < enemy.col) isHelpful = true; else if ((enemy.row >= zone.minRow && enemy.row <= zone.maxRow) && ((enemy.col < zone.minCol && move.col > enemy.col) || (enemy.col > zone.maxCol && move.col < enemy.col))) isHelpful = true; else if ((enemy.col >= zone.minCol && enemy.col <= zone.maxCol) && ((enemy.row < zone.minRow && move.row > enemy.row) || (enemy.row > zone.maxRow && move.row < enemy.row))) isHelpful = true;
        if (isHelpful) { helpfulMoves.push(move); }
    }

    let chosenMove = null;
    if (helpfulMoves.length > 0) { chosenMove = helpfulMoves[Math.floor(Math.random() * helpfulMoves.length)]; }
    else { chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; } // Move randomly if no helpful move

    Game.logMessage(`Enemy ${enemy.id || '?'} moves towards safety to (${chosenMove.row},${chosenMove.col}).`, 'log-enemy-event');
    enemy.row = chosenMove.row; enemy.col = chosenMove.col;
    return true; // Action taken
}

/** Attempts to perform a melee attack on an adjacent unit. */
function tryMeleeAttack(enemy) {
    const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    let adjacentTarget = null;
    // Check Player first
    if (typeof player !== 'undefined' && player.hp > 0 && player.row !== null) { for (const dir of directions) { if (enemy.row + dir.dr === player.row && enemy.col + dir.dc === player.col) { adjacentTarget = player; break; } } }
    // Then check other Enemies if player not adjacent
    if (!adjacentTarget && typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; for (const dir of directions) { if (enemy.row + dir.dr === otherEnemy.row && enemy.col + dir.dc === otherEnemy.col) { adjacentTarget = otherEnemy; break; } } if(adjacentTarget) break; } }

    if (adjacentTarget) {
        const isTargetPlayer = (adjacentTarget === player);
        const targetId = isTargetPlayer ? 'Player' : (adjacentTarget.id || '??');
        const damage = AI_ATTACK_DAMAGE; // From config.js
        Game.logMessage(`Enemy ${enemy.id || '?'} attacks ${targetId} at (${adjacentTarget.row},${adjacentTarget.col}) for ${damage} damage.`, isTargetPlayer ? 'log-player-event log-negative' : 'log-enemy-event');
        adjacentTarget.hp -= damage;
        if (adjacentTarget.hp <= 0) { if (!isTargetPlayer) { enemies = enemies.filter(e => e.id !== adjacentTarget.id); Game.logMessage(`Enemy ${adjacentTarget.id} defeated by Enemy ${enemy.id}!`, 'log-enemy-event');} } // Defeat msg handled by checkEndConditions for player/win
        if (Game.checkEndConditions()) return true; // Let checkEndConditions handle game over state, return true as action occurred
        return true; // Action taken
    }
    return false; // No adjacent target found
}

/** Attempts to shoot the player if conditions are met. */
function tryRangedAttackPlayer(enemy) {
    if (typeof player === 'undefined' || player.hp <= 0 || player.row === null || // Player not valid target
        !enemy.resources || enemy.resources.ammo <= 0 || // AI has no ammo
        typeof RANGED_ATTACK_RANGE === 'undefined') { // Config missing
        return false;
    }

    const distToPlayer = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);

    if (distToPlayer <= RANGED_ATTACK_RANGE && canShootTarget(enemy, player, RANGED_ATTACK_RANGE)) {
         enemy.resources.ammo--; const damage = AI_ATTACK_DAMAGE; player.hp -= damage;
         Game.logMessage(`Enemy ${enemy.id || '?'} shoots Player for ${damage} damage! (Ammo: ${enemy.resources.ammo})`, 'log-player-event log-negative');
         if (Game.checkEndConditions()) return true; // Check if player defeated, return true as action occurred
         return true; // Action taken
    }
    return false; // Conditions not met
}

/** Attempts to move towards the nearest detected unit based on HP state. */
function trySeekTarget(enemy) {
    if (typeof player === 'undefined' || player.row === null) return false; // Need player reference

    let closestUnit = null; let minDistance = Infinity;
    // Find closest valid target (player or other living enemy)
    if (player.hp > 0) { let playerDist = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col); if (playerDist < minDistance) { minDistance = playerDist; closestUnit = player; } }
    if (typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; const dist = Math.abs(otherEnemy.row - enemy.row) + Math.abs(otherEnemy.col - enemy.col); if (dist < minDistance) { minDistance = dist; closestUnit = otherEnemy; } } }

    // Check if target is within enemy's detection range
    const enemyDetectionRange = enemy.detectionRange || 8; // Use specific or default
    if (closestUnit && minDistance <= enemyDetectionRange) {
        const hpPercent = enemy.hp / (enemy.maxHp || 1);
        let pursueTarget = (hpPercent > 0.3); // Pursue if HP > 30%

        if (pursueTarget) {
            const possibleMoves = getValidMoves(enemy); // Use helper
            if (possibleMoves.length > 0) {
                let bestMove = null; let minTargetDistance = minDistance;
                for (const move of possibleMoves) { const newDist = Math.abs(closestUnit.row - move.row) + Math.abs(closestUnit.col - move.col); if (newDist < minTargetDistance) { minTargetDistance = newDist; bestMove = move; } }
                if (bestMove) { // Execute move towards closest unit
                     const targetId = (closestUnit === player) ? 'Player' : closestUnit.id;
                     Game.logMessage(`Enemy ${enemy.id || '?'} moves towards ${targetId} at (${bestMove.row},${bestMove.col}).`, 'log-enemy-event');
                     enemy.row = bestMove.row; enemy.col = bestMove.col;
                     return true; // Action taken
                 }
                 // If no move gets closer, fall through to random move by returning false here
                 return false; // Or potentially true if just seeking is enough action? Let's say false to allow random move if needed.
            } // else no possible moves
        } else { Game.logMessage(`Enemy ${enemy.id || '?'} is cautious (low HP).`, 'log-enemy-event'); return false; } // Cautious, allow random move
    }
    return false; // No target in range or doesn't pursue
}

/** Attempts to make a random valid move. */
function tryRandomMove(enemy) {
    const possibleMoves = getValidMoves(enemy); // Use helper
     if (possibleMoves.length > 0) {
         const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
         Game.logMessage(`Enemy ${enemy.id || '?'} moves randomly to (${chosenMove.row},${chosenMove.col}).`, 'log-enemy-event');
         enemy.row = chosenMove.row; enemy.col = chosenMove.col;
         return true; // Action taken
     } else {
         Game.logMessage(`Enemy ${enemy.id || '?'} waits (no moves).`, 'log-enemy-event');
         return true; // Counts as acting if stuck
     }
}


// --- Main AI Turn Execution --- (MODIFIED Dispatcher)

/** Executes turns for all AI enemies using a priority list */
function executeAiTurns() {
    if (typeof Game === 'undefined' || Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') { if (typeof Game !== 'undefined' && !Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); } return; }

    let redrawNeeded = false; // Track if any AI action requires redraw
    const currentEnemiesTurnOrder = [...enemies]; // Use snapshot

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        const enemy = enemies.find(e => e.id === currentEnemiesTurnOrder[i].id); // Get current enemy from live array
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip invalid/dead

        let acted = false; // Did this enemy take an action?
        const zone = Game.getSafeZone(); // Get current zone

        // --- Action Priority Cascade ---
        if (!acted) { acted = tryMoveToSafety(enemy, zone); }
        if (!acted) { acted = tryMeleeAttack(enemy); }
        if (Game.isGameOver()) return; // Stop if game ended mid-turn
        if (!acted) { acted = tryRangedAttackPlayer(enemy); }
        if (Game.isGameOver()) return; // Stop if game ended mid-turn
        if (!acted) { acted = trySeekTarget(enemy); }
        if (!acted) { acted = tryRandomMove(enemy); }

        if (acted) { redrawNeeded = true; } // If any action happened, flag for redraw

    } // End loop through enemies

    // End AI turn only if game is still active
    if (!Game.isGameOver()) {
        // Game.endAiTurn handles redraw logic based on internal state changes now
        // We just need to call it. The redrawNeeded flag here isn't strictly necessary
        // if endAiTurn always calls redraw, but keeping it doesn't hurt.
        Game.endAiTurn();
    }
    // If game ended, the checkEndConditions call already handled setGameOver and final redraw.
} // End executeAiTurns