console.log("ai.js loaded");

// --- AI Configuration ---
// Detection range now stored per enemy

// Array to hold all enemy objects
let enemies = [];

// --- AI Line of Sight Helper ---
/** Checks cardinal LoS */
function canShootTarget(attacker, target, maxRange) {
    if (!attacker || !target || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined') { console.error("canShootTarget: Missing critical data."); return false; }
    if (target.row === null || target.col === null) return false;
    const dr = target.row - attacker.row; const dc = target.col - attacker.col; const dist = Math.abs(dr) + Math.abs(dc);
    if (dist === 0 || dist > maxRange) { return false; } if (dr !== 0 && dc !== 0) { return false; } // Not cardinal
    const stepR = Math.sign(dr); const stepC = Math.sign(dc);
    for (let i = 1; i < dist; i++) { // Check cells between
        const checkRow = attacker.row + stepR * i; const checkCol = attacker.col + stepC * i;
        if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { return false; }
        if (mapData && mapData[checkRow]){ const tileType = mapData[checkRow][checkCol]; if (tileType === TILE_WALL || tileType === TILE_TREE) { return false; } }
        else { console.error("mapData issue during LoS check"); return false; }
    }
    return true; // LoS is clear
}


// --- AI Turn Logic --- (Uses Game.checkEndConditions)

/**
 * Executes turns for all AI enemies.
 * Priority: 1. Move to safety. 2. Attack adjacent. 3. Shoot player.
 * 4. Move towards target. 5. Random move. Calls Game.checkEndConditions() after attacks.
 */
function executeAiTurns() {
    // Check Game object first
    if (typeof Game === 'undefined') { console.error("Game object not defined in executeAiTurns!"); return; }

    // Use Game manager for state checks
    if (Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') { if (!Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); } return; }

    let redrawNeeded = false;
    const currentEnemiesTurnOrder = [...enemies];

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        const enemy = enemies.find(e => e.id === currentEnemiesTurnOrder[i].id);
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;

        let actedThisTurn = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        const zone = Game.getSafeZone();

        // 1. Storm Avoidance
        const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;
        if (isOutside) {
            const possibleMoves = []; // Find valid moves
            for (const dir of directions) { const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc; if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) { if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol]; if (targetTileType === TILE_LAND) { let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol); let occupiedByOtherEnemy = false; if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } } if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } } } else { console.error("mapData error");} } }
            if (possibleMoves.length > 0) { const helpfulMoves = []; /* Find helpful moves */ for (const move of possibleMoves) { let isHelpful = false; if (enemy.row < zone.minRow && move.row > enemy.row) isHelpful = true; else if (enemy.row > zone.maxRow && move.row < enemy.row) isHelpful = true; else if (enemy.col < zone.minCol && move.col > enemy.col) isHelpful = true; else if (enemy.col > zone.maxCol && move.col < enemy.col) isHelpful = true; else if ((enemy.row >= zone.minRow && enemy.row <= zone.maxRow) && ((enemy.col < zone.minCol && move.col > enemy.col) || (enemy.col > zone.maxCol && move.col < enemy.col))) isHelpful = true; else if ((enemy.col >= zone.minCol && enemy.col <= zone.maxCol) && ((enemy.row < zone.minRow && move.row > enemy.row) || (enemy.row > zone.maxRow && move.row < enemy.row))) isHelpful = true; if (isHelpful) { helpfulMoves.push(move); } } let chosenMove = null; if (helpfulMoves.length > 0) { chosenMove = helpfulMoves[Math.floor(Math.random() * helpfulMoves.length)]; } else { chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; } enemy.row = chosenMove.row; enemy.col = chosenMove.col; actedThisTurn = true; redrawNeeded = true; console.log(`Enemy ${enemy.id || i} moved towards safety.`); } else { actedThisTurn = true; }
        }

        // 2. Melee Attack Adjacent Unit
        if (!actedThisTurn) {
             let adjacentTarget = null; let targetList = [];
             if (typeof player !== 'undefined' && player.hp > 0 && player.row !== null) { for (const dir of directions) { if (enemy.row + dir.dr === player.row && enemy.col + dir.dc === player.col) { targetList.push(player); break; } } }
             if (typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; for (const dir of directions) { if (enemy.row + dir.dr === otherEnemy.row && enemy.col + dir.dc === otherEnemy.col) { targetList.push(otherEnemy); break; } } } }
             if (targetList.length > 0) {
                adjacentTarget = targetList[0]; const isTargetPlayer = (adjacentTarget === player); const targetId = isTargetPlayer ? 'Player' : (adjacentTarget.id || '??');
                console.log(`Enemy ${enemy.id || i} MELEE attacks ${targetId}!`); adjacentTarget.hp -= AI_ATTACK_DAMAGE; console.log(`${targetId} HP: ${adjacentTarget.hp}/${adjacentTarget.maxHp}`); actedThisTurn = true; redrawNeeded = true;
                if (adjacentTarget.hp <= 0) { // Just check if target died
                    console.log(`${targetId} defeated!`);
                    if (!isTargetPlayer) { enemies = enemies.filter(e => e.id !== adjacentTarget.id); } // Remove enemy
                    // Call central end condition check
                    if (Game.checkEndConditions()) return; // Stop if game ended
                }
             }
        }

        // 3. Ranged Attack Player
        if (!actedThisTurn && typeof player !== 'undefined' && player.hp > 0 && player.row !== null && enemy.resources && enemy.resources.ammo > 0) {
            const distToPlayer = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);
            const enemyDetectionRange = enemy.detectionRange || 8; // Use specific or default
            // Check Range AND Line of Sight
            if (distToPlayer <= RANGED_ATTACK_RANGE && canShootTarget(enemy, player, RANGED_ATTACK_RANGE)) {
                console.log(`Enemy ${enemy.id || i} SHOOTS Player!`); enemy.resources.ammo--; player.hp -= AI_ATTACK_DAMAGE; console.log(`Player HP: ${player.hp}/${player.maxHp}. Enemy Ammo: ${enemy.resources.ammo}`);
                actedThisTurn = true; redrawNeeded = true;
                // Call central end condition check
                if (Game.checkEndConditions()) return; // Stop if game ended
            }
        }

        // 4. Move Towards Nearest Unit
        if (!actedThisTurn && typeof player !== 'undefined' && player.hp > 0 && player.row !== null) {
            let closestUnit = null; let minDistance = Infinity;
            let playerDist = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col); if (playerDist < minDistance) { minDistance = playerDist; closestUnit = player; }
            if (typeof enemies !== 'undefined') { for (const otherEnemy of enemies) { if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; const dist = Math.abs(otherEnemy.row - enemy.row) + Math.abs(otherEnemy.col - enemy.col); if (dist < minDistance) { minDistance = dist; closestUnit = otherEnemy; } } }
            const enemyDetectionRange = enemy.detectionRange || 8;
            if (closestUnit && minDistance <= enemyDetectionRange) {
                const hpPercent = enemy.hp / enemy.maxHp; let pursueTarget = (hpPercent > 0.3);
                if (pursueTarget) {
                    const possibleMoves = []; /* Find valid moves */ for (const dir of directions) { const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc; if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) { if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol]; if (targetTileType === TILE_LAND) { let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol); let occupiedByOtherEnemy = false; if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemyCheck = enemies[j]; if (!otherEnemyCheck || otherEnemyCheck.id === enemy.id || otherEnemyCheck.hp <= 0) continue; if (otherEnemyCheck.row === targetRow && otherEnemyCheck.col === targetCol) { occupiedByOtherEnemy = true; break; } } } if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } } } else { console.error("mapData error");} } }
                    if (possibleMoves.length > 0) { let bestMove = null; let minTargetDistance = minDistance; for (const move of possibleMoves) { const newDist = Math.abs(closestUnit.row - move.row) + Math.abs(closestUnit.col - move.col); if (newDist < minTargetDistance) { minTargetDistance = newDist; bestMove = move; } } if (bestMove) { enemy.row = bestMove.row; enemy.col = bestMove.col; actedThisTurn = true; redrawNeeded = true;} }
                } else { console.log(`Enemy ${enemy.id || i} low HP, not pursuing.`);}
             }
        }

        // 5. Random Movement (Fallback)
        if (!actedThisTurn) {
             const possibleMoves = []; /* Find valid moves */ for (const dir of directions) { const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc; if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) { if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol]; if (targetTileType === TILE_LAND) { let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol); let occupiedByOtherEnemy = false; if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } } if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } } } else { console.error("mapData error");} } }
             if (possibleMoves.length > 0) { const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; enemy.row = chosenMove.row; enemy.col = chosenMove.col; redrawNeeded = true; }
        }

    } // End enemy loop

    // End AI turn only if game didn't end during loop
    if (!Game.isGameOver()) { Game.endAiTurn(); }

} // End executeAiTurns