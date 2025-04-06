console.log("ai.js loaded");

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic ---

/**
 * Executes turns for all AI enemies.
 * AI will attack if player is adjacent, otherwise move randomly.
 */
function executeAiTurns() {
    if (typeof Game === 'undefined') { console.error("Game object not defined in executeAiTurns!"); return; }
    if (Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        if (!Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); } return;
    }

    // console.log("Executing AI Turns..."); // Keep this one? Optional.
    let redrawNeeded = false;
    const currentEnemies = [...enemies]; // Iterate over a copy

    for (let i = 0; i < currentEnemies.length; i++) {
        const enemy = enemies.find(e => e === currentEnemies[i]);
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;

        let attackedPlayer = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

        // Check for Adjacent Player (Attack Logic)
        for (const dir of directions) { /* ... attack logic ... */ } // Assume no error here

        // If game ended due to player defeat, stop processing AI
        if (Game.isGameOver()) return;

        // Random Movement Logic (Only if player was NOT attacked)
        if (!attackedPlayer) {
             const possibleMoves = [];
             for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                     if (typeof mapData !== 'undefined') {
                         const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) {
                             let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                             let occupiedByOtherEnemy = false;
                             // >>> ADD SAFETY CHECK for collision loop <<<
                             if (enemies && enemies.length > 0) { // Check if enemies exist before looping
                                 for (let j = 0; j < enemies.length; j++) {
                                     const otherEnemy = enemies[j];
                                     // Check if otherEnemy is valid before accessing properties
                                     if (!otherEnemy || otherEnemy.id === enemy.id) continue; // Don't check self
                                     if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; }
                                 }
                             }
                             if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                         }
                    } else { console.error("mapData not defined for AI move check!");}
                 }
             }
             if (possibleMoves.length > 0) { const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; enemy.row = chosenMove.row; enemy.col = chosenMove.col; redrawNeeded = true; }
        } // End random movement block
    } // End loop through enemies

    // End AI turn only if game is still active
    if (!Game.isGameOver()) { Game.endAiTurn(); }
    // No need for separate redraw call here, Game.endAiTurn handles it
}