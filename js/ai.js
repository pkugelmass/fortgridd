console.log("ai.js loaded");

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic ---

/**
 * Executes turns for all AI enemies.
 * AI will attack if player is adjacent, otherwise move randomly.
 * Relies on global vars/funcs from other scripts.
 */
function executeAiTurns() {
    if (typeof gameActive === 'undefined' || typeof currentTurn === 'undefined') {
        console.error("executeAiTurns called before game state is defined."); return;
    }
    if (!gameActive || currentTurn !== 'ai' || typeof enemies === 'undefined') {
        if (gameActive) currentTurn = 'player'; return;
    }

    console.log("Executing AI Turns...");
    let redrawNeeded = false; // Track if visual state changed
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
                player.hp -= AI_ATTACK_DAMAGE; console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                attackedPlayer = true; redrawNeeded = true;
                if (player.hp <= 0) { console.log("Player defeated! GAME OVER!"); gameActive = false; redrawCanvas(); alert("GAME OVER!"); return; }
                break;
            }
        }

        // Random Movement Logic (Only if player was NOT attacked)
        if (!attackedPlayer) {
             const possibleMoves = [];
             for (const dir of directions) { /* ... find valid moves ... */
                const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                     if (typeof mapData !== 'undefined') {
                         const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) {
                             let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                             let occupiedByOtherEnemy = false;
                             for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (enemy.id === otherEnemy.id) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } }
                             if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                         }
                    } else { console.error("mapData not defined for AI move check!");}
                 }
             }
             if (possibleMoves.length > 0) { const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]; enemy.row = chosenMove.row; enemy.col = chosenMove.col; redrawNeeded = true; }
        }
    } // End loop through enemies

    // --- Finish AI Turn ---
    if (gameActive) {
        // Set turn back to player *BEFORE* final redraw/UI update
        currentTurn = 'player';
        console.log("AI Turns complete. Player turn.");

        // Redraw the whole canvas if needed (AI moved/attacked),
        // otherwise, just update UI text (e.g., if all AI were blocked)
        if (redrawNeeded) {
             if (typeof redrawCanvas === 'function') redrawCanvas(); else console.error("redrawCanvas not defined!");
        } else {
             if (typeof drawUI === 'function') drawUI(ctx); else console.error("drawUI not defined!");
        }
    } else {
        // Game ended during AI turn, ensure final state drawn
        if (typeof redrawCanvas === 'function') redrawCanvas(); else console.error("redrawCanvas not defined!");
        console.log("Game Over - Input Disabled.");
    }
} // End executeAiTurns