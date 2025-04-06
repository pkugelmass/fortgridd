console.log("ai.js loaded");

// --- AI Configuration ---
const AI_DETECTION_RANGE = 8; // How close player/enemy needs to be for AI to move towards (Manhattan distance)

// Array to hold all enemy objects
let enemies = [];

// --- AI Turn Logic ---

/**
 * Executes turns for all AI enemies.
 * Priority: 1. Move to safety if outside zone. 2. Attack adjacent unit (player or enemy).
 * 3. Move towards nearest unit (player or enemy). 4. Random valid move.
 */
function executeAiTurns() {
    // Check Game object first
    if (typeof Game === 'undefined') { console.error("Game object not defined in executeAiTurns!"); return; }

    // Use Game manager for state checks
    if (Game.isGameOver() || Game.getCurrentTurn() !== 'ai' || typeof enemies === 'undefined') {
        // If called inappropriately, ensure turn state is corrected if game isn't over
        if (typeof Game !== 'undefined' && !Game.isGameOver() && Game.getCurrentTurn() === 'ai') { Game.endAiTurn(); }
        return;
    }

    // console.log("Executing AI Turns..."); // Quieter log
    let redrawNeeded = false; // Track if visual state changed
    const currentEnemiesTurnOrder = [...enemies]; // Iterate over a snapshot in case array changes mid-turn

    for (let i = 0; i < currentEnemiesTurnOrder.length; i++) {
        // Get current enemy from the main 'enemies' array, ensure it still exists and is alive
        const enemy = enemies.find(e => e.id === currentEnemiesTurnOrder[i].id); // Find by ID for safety
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip if invalid/dead

        let actedThisTurn = false; // Flag to ensure only one action (move/attack) per turn
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        const zone = Game.getSafeZone(); // Get safe zone boundaries

        // --- 1. Check if Outside Safe Zone (Storm Avoidance Logic) ---
        const isOutside = enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol;
        if (isOutside) {
            // console.log(`Enemy ${enemy.id || i} at (${enemy.row}, ${enemy.col}) is outside safe zone, seeking safety.`);
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
                const helpfulMoves = [];
                for (const move of possibleMoves) { /* Find helpful moves logic */
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
                    // console.log(`Enemy ${enemy.id || i} moving towards safety to (${chosenMove.row}, ${chosenMove.col})`);
                } else { // Otherwise take any valid move
                     chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                     // console.log(`Enemy ${enemy.id || i} making random valid move while outside zone to (${chosenMove.row}, ${chosenMove.col})`);
                }
                enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                actedThisTurn = true; redrawNeeded = true;
            } else { /* No moves possible */ actedThisTurn = true; }
        } // End if(isOutside)

        // --- 2. Attack Adjacent Unit (Player OR Enemy) ---
        // Only run if AI didn't already move towards safety
        if (!actedThisTurn) {
            let adjacentTarget = null;
            let targetList = []; // Check all adjacent cells

            // Add player if adjacent and alive
             if (typeof player !== 'undefined' && player.hp > 0 && player.row !== null) {
                for (const dir of directions) {
                    if (enemy.row + dir.dr === player.row && enemy.col + dir.dc === player.col) {
                        targetList.push(player);
                        break; // Found player
                    }
                }
             }
             // Add other enemies if adjacent and alive
             if (typeof enemies !== 'undefined') {
                 for (const otherEnemy of enemies) {
                     if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue; // Skip self, dead, invalid
                     for (const dir of directions) {
                         if (enemy.row + dir.dr === otherEnemy.row && enemy.col + dir.dc === otherEnemy.col) {
                             targetList.push(otherEnemy);
                             break; // Found this enemy
                         }
                     }
                 }
             }

            // If any targets were found, pick one (first found for simplicity) and attack
            if (targetList.length > 0) {
                adjacentTarget = targetList[0]; // Attack the first target found

                const isTargetPlayer = (adjacentTarget === player);
                const targetId = isTargetPlayer ? 'Player' : (adjacentTarget.id || '??');
                console.log(`Enemy ${enemy.id || i} attacks ${targetId}!`);

                adjacentTarget.hp -= AI_ATTACK_DAMAGE; // Apply damage
                console.log(`${targetId} HP: ${adjacentTarget.hp}/${adjacentTarget.maxHp}`);
                actedThisTurn = true; redrawNeeded = true;

                // Check defeat condition for the target
                if (adjacentTarget.hp <= 0) {
                    console.log(`${targetId} defeated!`);
                    if (isTargetPlayer) {
                        Game.setGameOver(); alert("GAME OVER!"); return; // Stop AI turns immediately
                    } else {
                        // Remove defeated enemy from the main 'enemies' array
                        enemies = enemies.filter(e => e.id !== adjacentTarget.id);
                        // Check Win Condition for Player
                        if (enemies.length === 0) {
                            console.log("Last enemy defeated! YOU WIN!");
                            Game.setGameOver(); alert("YOU WIN!"); return; // Stop AI turns immediately
                        }
                    }
                }
            } // End if adjacent target found
        } // End Attack Check block

        // If game ended due to attack action, stop processing AI
        if (Game.isGameOver()) return;

        // --- 3. Move Towards Nearest Unit (Player OR Enemy) ---
        // Only run if AI didn't move towards safety OR attack
        if (!actedThisTurn) {
            let closestUnit = null;
            let minDistance = AI_DETECTION_RANGE + 1;

            // Check player distance
            if (typeof player !== 'undefined' && player.hp > 0 && player.row !== null) {
                 const dist = Math.abs(player.row - enemy.row) + Math.abs(player.col - enemy.col);
                 if (dist <= AI_DETECTION_RANGE && dist < minDistance) { minDistance = dist; closestUnit = player; }
            }
            // Check other enemies distance
            if (typeof enemies !== 'undefined') {
                 for (const otherEnemy of enemies) {
                     if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0 || otherEnemy.row === null) continue;
                     const dist = Math.abs(otherEnemy.row - enemy.row) + Math.abs(otherEnemy.col - enemy.col);
                     if (dist <= AI_DETECTION_RANGE && dist < minDistance) { minDistance = dist; closestUnit = otherEnemy; }
                 }
            }

            // If a closest unit was found within range
            if (closestUnit) {
                // Find all valid moves first
                const possibleMoves = [];
                 for (const dir of directions) {
                     const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                     if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                        if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol];
                             if (targetTileType === TILE_LAND) {
                                let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol);
                                let occupiedByOtherEnemy = false;
                                if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } }
                                if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); } }
                        } else { console.error("mapData not defined for AI move check!");} }
                 }

                 // Evaluate possible moves to find one that gets closer to the closestUnit
                 if (possibleMoves.length > 0) {
                     let bestMove = null;
                     let minTargetDistance = minDistance; // Start with current distance to target

                     for (const move of possibleMoves) {
                         const newDist = Math.abs(closestUnit.row - move.row) + Math.abs(closestUnit.col - move.col);
                         if (newDist < minTargetDistance) {
                             minTargetDistance = newDist;
                             bestMove = move;
                         }
                     }

                     // Execute move towards closest unit if found
                     if (bestMove) {
                         const targetId = (closestUnit === player) ? 'Player' : closestUnit.id;
                         // console.log(`Enemy ${enemy.id || i} moving towards ${targetId}`);
                         enemy.row = bestMove.row; enemy.col = bestMove.col;
                         actedThisTurn = true; redrawNeeded = true;
                     }
                     // If no move gets closer, fall through to random move below
                 }
            } // End if closest unit found
        } // End target seeking block


        // --- 4. Random Movement Logic (Fallback) ---
        // Only if AI took no other action (didn't flee storm, attack, or move towards target)
        if (!actedThisTurn) {
             // console.log(`AI DEBUG: Enemy ${enemy.id} moving randomly.`);
             const possibleMoves = []; // Find valid moves again
             for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                     if (typeof mapData !== 'undefined') { const targetTileType = mapData[targetRow][targetCol];
                         if (targetTileType === TILE_LAND) {
                             let occupiedByPlayer = (typeof player !== 'undefined' && player.hp > 0 && player.row === targetRow && player.col === targetCol);
                             let occupiedByOtherEnemy = false;
                             if (enemies && enemies.length > 0) { for (let j = 0; j < enemies.length; j++) { const otherEnemy = enemies[j]; if (!otherEnemy || otherEnemy.id === enemy.id || otherEnemy.hp <= 0) continue; if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; } } }
                             if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                         } } else { console.error("mapData not defined for AI move check!");}
                 }
             }
             if (possibleMoves.length > 0) {
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
                 // actedThisTurn = true; // Not strictly necessary to set here as it's the last action possibility
             } // else { // Enemy stays put, actedThisTurn remains false }
        } // End random movement block

    } // End loop through enemies

    // End AI turn only if game is still active
    if (!Game.isGameOver()) { Game.endAiTurn(); } // Handles setting turn and redraw if needed
    else { if (typeof redrawCanvas === 'function') redrawCanvas(); console.log("Game Over - Input Disabled."); }

} // End executeAiTurns