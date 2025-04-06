console.log("ai.js loaded");

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic ---

/**
 * Executes turns for all AI enemies.
 * AI will attack if player is adjacent, otherwise move randomly.
 */
function executeAiTurns() {
    // Check Game object first
    if (typeof Game === 'undefined') { console.error("Game object not defined in executeAiTurns!"); return; }

    // Use Game manager for state checks
    if (Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        if (!Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); } return;
    }

    // console.log("Executing AI Turns..."); // Quieter log
    let redrawNeeded = false;
    const currentEnemies = [...enemies]; // Iterate over a copy

    for (let i = 0; i < currentEnemies.length; i++) {
        const enemy = enemies.find(e => e === currentEnemies[i]);
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;

        let attackedPlayer = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        let checkedPlayer = false; // Flag for player existence warning

        // Check for Adjacent Player (Attack Logic)
        for (const dir of directions) {
            const targetRow = enemy.row + dir.dr;
            const targetCol = enemy.col + dir.dc;

            if (typeof player !== 'undefined' && player.row !== null && player.col !== null) {
                checkedPlayer = true;
                // AI DEBUG Log removed
                // console.log(`AI DEBUG: Enemy ${enemy.id || i} checking target (${targetRow}, ${targetCol}) against player at (${player.row}, ${player.col})`);

                if (player.row === targetRow && player.col === targetCol) {
                    // AI DEBUG Log removed
                    // console.log(`AI DEBUG: Player FOUND at (${targetRow}, ${targetCol})! Enemy attacks.`);
                    console.log(`Enemy ${enemy.id || i} attacks Player!`); // Keep this essential log
                    player.hp -= AI_ATTACK_DAMAGE;
                    console.log(`Player HP: ${player.hp}/${player.maxHp}`); // Keep this essential log
                    attackedPlayer = true;
                    redrawNeeded = true;

                    if (player.hp <= 0) { // Check Game Over
                        console.log("Player defeated! GAME OVER!");
                        Game.setGameOver();
                        alert("GAME OVER!");
                        return; // Exit AI turns immediately
                    }
                    break; // Enemy attacked, action done
                }
            } else if (!checkedPlayer) {
                console.warn("AI WARNING: Player object missing or position null during adjacent check."); // Keep warning
                checkedPlayer = true;
            }
        } // End adjacent check loop

        if (Game.isGameOver()) return; // Exit if player was defeated this turn

        // Random Movement Logic (Only if player was NOT attacked)
        if (!attackedPlayer) {
            // AI DEBUG Log removed
            // console.log(`AI DEBUG: Enemy ${enemy.id} did not attack, attempting random move.`);
            const possibleMoves = [];
            for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                    if (typeof mapData !== 'undefined') {
                         const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) {
                             let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                             let occupiedByOtherEnemy = false;
                             if (enemies && enemies.length > 0) {
                                 for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } }
                             }
                             if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                         }
                    } else { console.error("mapData not defined for AI move check!");}
                 }
             }
             if (possibleMoves.length > 0) {
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
             } // else { // AI DEBUG Log removed }
        } // End random movement block
    } // End loop through enemies

    // End AI turn only if game is still active
    if (!Game.isGameOver()) {
        Game.endAiTurn(); // Handles setting turn and redraw if needed
    } else {
        // Ensure final state drawn if game ended during AI turn
        if (typeof redrawCanvas === 'function') redrawCanvas();
        console.log("Game Over - Input Disabled.");
    }
} // End executeAiTurns