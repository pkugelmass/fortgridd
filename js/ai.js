console.log("ai.js loaded");

// --- AI Configuration ---
const AI_DETECTION_RANGE = 8; // How close player needs to be for AI to move towards (Manhattan distance)

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic ---

/**
 * Executes turns for all AI enemies.
 * Priority: 1. Move to safety if outside zone. 2. Attack adjacent player.
 * 3. Move towards nearby player. 4. Random valid move.
 */
function executeAiTurns() {
    // Check Game object first
    if (typeof Game === 'undefined') { console.error("Game object not defined in executeAiTurns!"); return; }

    // Use Game manager for state checks
    if (Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        if (typeof Game !== 'undefined' && !Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); } // Correctly handle if called wrong turn
        return;
    }

    // console.log("Executing AI Turns..."); // Quieter log
    let redrawNeeded = false; // Track if visual state changed
    const currentEnemies = [...enemies]; // Iterate over a copy

    for (let i = 0; i < currentEnemies.length; i++) {
        const enemy = enemies.find(e => e === currentEnemies[i]); // Get current enemy from main array
        // Ensure enemy exists, has position, and is alive before processing
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;

        let actedThisTurn = false; // Flag to ensure only one action (move/attack) per turn
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        const zone = Game.getSafeZone(); // Get safe zone boundaries

        // --- 1. Check if Outside Safe Zone (Storm Avoidance Logic) ---
        const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;

        if (isOutside) {
            // console.log(`Enemy ${enemy.id || i} at (${enemy.row}, ${enemy.col}) is outside safe zone (${JSON.stringify(zone)}), seeking safety.`);
            const possibleMoves = []; // Find all valid adjacent moves first
            for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 // Boundary Check
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                    // Terrain Check & Collision Check
                    if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) { // Can only move onto land
                            let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                            let occupiedByOtherEnemy = false;
                            if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || enemy.id === otherEnemy.id) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } }
                            if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } }
                    } else { console.error("mapData not defined for AI safety move check!");} }
            }

            if (possibleMoves.length > 0) {
                const helpfulMoves = [];
                // Find moves that get closer to the safe zone boundaries
                for (const move of possibleMoves) {
                    let isHelpful = false;
                    // Check if move improves row position relative to zone
                    if (enemy.row < zone.minRow && move.row > enemy.row) isHelpful = true;
                    else if (enemy.row > zone.maxRow && move.row < enemy.row) isHelpful = true;
                    // Check if move improves col position relative to zone
                    else if (enemy.col < zone.minCol && move.col > enemy.col) isHelpful = true;
                    else if (enemy.col > zone.maxCol && move.col < enemy.col) isHelpful = true;
                    // Consider helpful if it moves correctly along one axis, even if the other is already safe
                    else if ((enemy.row >= zone.minRow && enemy.row <= zone.maxRow) && // if row is safe...
                             ((enemy.col < zone.minCol && move.col > enemy.col) || (enemy.col > zone.maxCol && move.col < enemy.col)) // ... check if col move helps
                         ) isHelpful = true;
                    else if ((enemy.col >= zone.minCol && enemy.col <= zone.maxCol) && // if col is safe...
                             ((enemy.row < zone.minRow && move.row > enemy.row) || (enemy.row > zone.maxRow && move.row < enemy.row)) // ... check if row move helps
                         ) isHelpful = true;

                    if (isHelpful) { helpfulMoves.push(move); }
                }

                if (helpfulMoves.length > 0) {
                    // Choose randomly among the helpful moves
                    const chosenMove = helpfulMoves[Math.floor(Math.random() * helpfulMoves.length)];
                    console.log(`Enemy ${enemy.id || i} moving towards safety to (${chosenMove.row}, ${chosenMove.col})`);
                    enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                    actedThisTurn = true; redrawNeeded = true;
                } else {
                     // No helpful moves found among valid moves, try *any* valid move (prevents getting stuck on convex corners temporarily)
                     const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                     console.log(`Enemy ${enemy.id || i} making random valid move while outside zone to (${chosenMove.row}, ${chosenMove.col})`);
                     enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                     actedThisTurn = true; redrawNeeded = true;
                }
            } else {
                 console.log(`Enemy ${enemy.id || i} is outside zone but has no valid moves.`);
                 actedThisTurn = true; // No move possible, counts as action for turn structure
            }
        } // End if(isOutside)


        // --- 2. Check for Adjacent Player (Attack Logic) ---
        // Only run if AI didn't already move towards safety
        if (!actedThisTurn) {
            for (const dir of directions) {
                const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                if (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol) {
                    console.log(`Enemy ${enemy.id || i} attacks Player!`);
                    player.hp -= AI_ATTACK_DAMAGE; console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                    actedThisTurn = true; redrawNeeded = true;
                    if (player.hp <= 0) { console.log("Player defeated! GAME OVER!"); Game.setGameOver(); alert("GAME OVER!"); return; }
                    break; // Enemy attacked, action done
                }
            }
        }

        // If game ended due to player defeat by attack, stop processing AI
        if (Game.isGameOver()) return;

        // --- 3. Check if Player is Nearby (Targeted Movement) ---
        // Only run if AI didn't move towards safety OR attack
        if (!actedThisTurn && typeof player !== 'undefined' && player.row !== null && player.col !== null) {
            const distanceToPlayer = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);
            if (distanceToPlayer <= AI_DETECTION_RANGE) {
                // Find all valid moves first
                 const possibleMoves = [];
                 for (const dir of directions) {
                     const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                     if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                        if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol];
                             if (targetTileType === TILE_LAND) {
                                let occupiedByPlayer = (player.row === targetRow && player.col === targetCol);
                                let occupiedByOtherEnemy = false;
                                if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || enemy.id === otherEnemy.id) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } }
                                if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } }
                        } else { console.error("mapData not defined for AI move check!");} }
                 }

                 // Evaluate possible moves to find the one closest to the player
                 if (possibleMoves.length > 0) {
                     let bestMove = null;
                     let minDistance = distanceToPlayer; // Initialize with current distance

                     for (const move of possibleMoves) {
                         const newDist = Math.abs(player.row - move.row) + Math.abs(player.col - move.col);
                         if (newDist < minDistance) {
                             minDistance = newDist;
                             bestMove = move;
                         }
                         // Optional: if distances are equal, maybe prefer non-diagonal or random? Keep simple: first best.
                     }

                     // If a move closer to the player was found, execute it
                     if (bestMove) {
                         // console.log(`Enemy ${enemy.id || i} moving towards player to (${bestMove.row}, ${bestMove.col})`);
                         enemy.row = bestMove.row; enemy.col = bestMove.col;
                         actedThisTurn = true; redrawNeeded = true;
                     }
                     // If no move gets closer, proceed to random move below
                 } // else no possible moves at all
            } // End if player within range
        } // End check player exists

        // --- 4. Random Movement Logic (Fallback) ---
        // Only if AI didn't move towards safety, attack, or move towards player
        if (!actedThisTurn) {
             // console.log(`AI DEBUG: Enemy ${enemy.id} moving randomly.`);
             const possibleMoves = []; // Find valid moves again
             for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                     if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) {
                             let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                             let occupiedByOtherEnemy = false;
                             if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || enemy.id === otherEnemy.id) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } }
                             if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                         } } else { console.error("mapData not defined for AI move check!");}
                 }
             }
             if (possibleMoves.length > 0) {
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 // console.log(`Enemy ${enemy.id || i} moving randomly to (${chosenMove.row}, ${chosenMove.col})`);
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
             } // else { // Enemy stays put }
        } // End random movement block

    } // End loop through enemies

    // End AI turn only if game is still active
    if (!Game.isGameOver()) {
        Game.endAiTurn(); // Handles setting turn and redraw if needed
    } else {
        // If game ended during AI turn (player defeat), ensure final state is drawn
        if (typeof redrawCanvas === 'function') redrawCanvas();
        console.log("Game Over - Input Disabled.");
    }
} // End executeAiTurns