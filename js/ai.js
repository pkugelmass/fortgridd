console.log("ai.js loaded");

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic --- (Moved from script.js)

/**
 * Executes turns for all AI enemies.
 * AI will attack if player is adjacent, otherwise move randomly.
 * Relies on global vars: gameActive, currentTurn, mapData, GRID_WIDTH/HEIGHT,
 * TILE_LAND, player, AI_ATTACK_DAMAGE.
 * Modifies global vars: enemy positions, player.hp, gameActive, currentTurn.
 * Calls global functions: redrawCanvas, drawUI.
 */
function executeAiTurns() {
    // Safety checks moved inside just in case it's called inappropriately
    if (typeof gameActive === 'undefined' || typeof currentTurn === 'undefined') {
        console.error("executeAiTurns called before game state is defined.");
        return;
    }
     if (!gameActive || currentTurn !== 'ai' || typeof enemies === 'undefined') {
        // If called when not AI turn, or game over, just ensure turn is player's if possible
        if (gameActive) currentTurn = 'player';
        return;
    }

    console.log("Executing AI Turns...");
    let redrawNeeded = false;
    const currentEnemies = [...enemies]; // Iterate over a copy

    for (let i = 0; i < currentEnemies.length; i++) {
        const enemy = enemies.find(e => e === currentEnemies[i]); // Get current enemy from main array
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;

        let attackedPlayer = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

        // Check for Adjacent Player (Attack Logic)
        for (const dir of directions) {
            const targetRow = enemy.row + dir.dr;
            const targetCol = enemy.col + dir.dc;
            // Ensure player exists before checking position/hp
            if (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol) {
                console.log(`Enemy ${enemy.id || i} attacks Player!`);
                player.hp -= AI_ATTACK_DAMAGE; // Assumes AI_ATTACK_DAMAGE is global
                console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                attackedPlayer = true;
                redrawNeeded = true;

                if (player.hp <= 0) { // Check Game Over
                    console.log("Player defeated! GAME OVER!");
                    gameActive = false; // Modify global gameActive
                    if (typeof redrawCanvas === 'function') redrawCanvas(); else console.error("redrawCanvas not defined for Game Over!");
                    alert("GAME OVER!");
                    return; // Exit AI turns immediately
                }
                break; // Enemy attacked, action done
            }
        }

        // Random Movement Logic (Only if player was NOT attacked)
        if (!attackedPlayer) {
             const possibleMoves = [];
             for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 // Boundary Check
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                    // Ensure mapData exists
                    if (typeof mapData !== 'undefined') {
                         const targetTileType = mapData[targetRow][targetCol];
                         // Terrain Check (AI only moves on Land) - Assumes TILE_LAND is global
                         if (targetTileType === TILE_LAND) {
                             // Player Collision Check
                             let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                             // Other Enemy Collision Check
                             let occupiedByOtherEnemy = false;
                             for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (enemy.id === otherEnemy.id) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } }
                             // Add move if valid and unoccupied
                             if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                         }
                    } else { console.error("mapData not defined for AI move check!");}
                 }
             }
             // Execute move if possible
             if (possibleMoves.length > 0) {
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
             }
        } // End random movement block
    } // End loop through enemies

    // Switch back to player only if game is still active
    if (gameActive) {
        if (redrawNeeded && typeof redrawCanvas === 'function') { redrawCanvas(); } // Redraw if needed
        currentTurn = 'player'; // Modify global currentTurn
        console.log("AI Turns complete. Player turn.");
        if (!redrawNeeded && typeof drawUI === 'function') { drawUI(ctx); } // Update UI text if no redraw
    } else {
         if (typeof redrawCanvas === 'function') redrawCanvas(); // Ensure final state drawn
         console.log("Game Over - Input Disabled.");
    }
}