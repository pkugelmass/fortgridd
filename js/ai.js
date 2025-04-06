console.log("ai.js loaded");

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic --- (Now uses Game object)

/**
 * Executes turns for all AI enemies.
 * AI will attack if player is adjacent, otherwise move randomly.
 * Uses Game object for state checking and turn management.
 * Relies on global vars/funcs: mapData, GRID_WIDTH/HEIGHT, TILE_LAND, player, AI_ATTACK_DAMAGE, redrawCanvas.
 */
function executeAiTurns() {
    // Check Game object first
    if (typeof Game === 'undefined') { console.error("Game object not defined in executeAiTurns!"); return; }

    // Use Game manager for state checks
    if (Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        // If called inappropriately, ensure turn state is corrected if game isn't over
        if (!Game.isGameOver() && Game.getCurrentTurn() === 'ai') {
             console.warn("executeAiTurns called inappropriately, resetting turn to player.");
             Game.endAiTurn(); // Use game manager function to switch back
        }
        return;
    }

    console.log("Executing AI Turns...");
    let redrawNeeded = false;
    const currentEnemies = [...enemies];

    for (let i = 0; i < currentEnemies.length; i++) {
        const enemy = enemies.find(e => e === currentEnemies[i]);
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;

        let attackedPlayer = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

        // Check for Adjacent Player (Attack Logic)
        for (const dir of directions) {
            const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
            if (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol) {
                console.log(`Enemy ${enemy.id || i} attacks Player!`);
                player.hp -= AI_ATTACK_DAMAGE; // Modify global player state
                console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                attackedPlayer = true;
                redrawNeeded = true;

                if (player.hp <= 0) { // Check Game Over
                    console.log("Player defeated! GAME OVER!");
                    Game.setGameOver(); // Use Game manager to set state
                    alert("GAME OVER!"); // Keep alert for now
                    return; // Exit AI turns immediately
                }
                break; // Enemy attacked, action done
            }
        }

        // Random Movement Logic (Only if player was NOT attacked)
        if (!attackedPlayer) {
             const possibleMoves = [];
             for (const dir of directions) { /* ... find valid moves logic (no changes needed here)... */
                const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                    if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) {
                            let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                            let occupiedByOtherEnemy = false;
                            for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (enemy.id === otherEnemy.id) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } }
                            if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } }
                    } else { console.error("mapData not defined for AI move check!");} }
            }
             if (possibleMoves.length > 0) { const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; enemy.row = chosenMove.row; enemy.col = chosenMove.col; redrawNeeded = true; }
        }
    } // End loop through enemies

    // End AI turn only if game didn't end during the loop
    if (!Game.isGameOver()) {
        // Tell the Game Manager the AI turn is over
        // This will handle setting currentTurn = 'player' and calling redrawCanvas if needed
        Game.endAiTurn();
    } else {
        // If game ended, redrawCanvas was already called by setGameOver or the attack logic
        console.log("Game Over during AI turn - Input Disabled.");
    }
} // End executeAiTurns