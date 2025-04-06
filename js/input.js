console.log("input.js loaded");

/**
 * Handles keydown events for player movement, bump-attack, OR skipping turn (' ').
 * Uses the global Game object to check/manage state and turns.
 * Relies on global vars: player, enemies, mapData, GRID_WIDTH/HEIGHT, TILE_LAND/SCRAP, PLAYER_ATTACK_DAMAGE.
 * Relies on global functions: redrawCanvas.
 * Calls Game.endPlayerTurn(), Game.setGameOver(), Game.isPlayerTurn(), Game.isGameOver().
 * @param {KeyboardEvent} event - The keyboard event object.
 */
function handleKeyDown(event) {
    // console.log("handleKeyDown Fired! Key:", event.key);

    // Use Game object to check state
    if (typeof Game === 'undefined') { console.error("Game object not loaded!"); return; }
    if (Game.isGameOver() || !Game.isPlayerTurn()) {
        // console.log("Ignoring input: Game over or not player's turn.");
        return;
    }
    if (typeof player === 'undefined' || player.row === null || player.col === null) {
        console.warn("Player not ready, ignoring input.");
        return;
    }

    let targetRow = player.row; let targetCol = player.col;
    let actionKey = false; let actionType = null;

    switch (event.key.toLowerCase()) {
        case 'arrowup': case 'w': targetRow--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowdown': case 's': targetRow++; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowleft': case 'a': targetCol--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowright': case 'd': targetCol++; actionKey = true; actionType = 'move_or_attack'; break;
        case ' ': actionKey = true; actionType = 'wait'; break; // Spacebar = Wait
        default: return;
    }

    if (actionKey) event.preventDefault(); else return;

    // Process "Wait" Action
    if (actionType === 'wait') {
        console.log("Player waits.");
        // Tell the Game manager the player's turn ended
        Game.endPlayerTurn();
        // No need to call redrawCanvas or setTimeout here, Game.endPlayerTurn handles triggering AI (via setTimeout)
        // and the subsequent AI turn or redraw will update the display.
        // Let's call redrawCanvas *once* here just to update the UI turn indicator immediately.
        if (typeof redrawCanvas === 'function') redrawCanvas(); else console.error("redrawCanvas not defined!");
        return; // Action complete
    }

    // Process "Move or Attack" Action
    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null;
            if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                console.log(`Player attacks Enemy ${targetEnemy.id || '??'}!`);
                targetEnemy.hp -= PLAYER_ATTACK_DAMAGE; // Assumes PLAYER_ATTACK_DAMAGE is global
                console.log(`Enemy HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);

                if (targetEnemy.hp <= 0) { // Check defeat
                    console.log(`Enemy ${targetEnemy.id || '??'} defeated!`);
                    enemies = enemies.filter(enemy => enemy !== targetEnemy); // Remove enemy (modifies global enemies)

                    // Check Win Condition by asking Game object state
                    if (enemies.length === 0) {
                        console.log("All enemies defeated! YOU WIN!");
                        Game.setGameOver(); // Use Game manager to set state
                        alert("YOU WIN!"); // Keep alert for now
                        // redrawCanvas will be called by setGameOver via drawUI update or explicitly if needed
                        return; // Stop processing this turn
                    }
                }
                // End player turn after attack by notifying Game manager
                if (typeof redrawCanvas === 'function') redrawCanvas(); // Redraw to show attack results
                Game.endPlayerTurn();

            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol]; // Assumes mapData is global
                // Walkable Check - Assumes TILE_LAND, TILE_SCRAP are global
                if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) {
                    player.row = targetRow; player.col = targetCol; // Move player (modifies global player)

                    if (targetTileType === TILE_SCRAP) { // Resource Check
                        if (player.resources) { player.resources.scrap++; console.log(`Collected Scrap! Total: ${player.resources.scrap}`); }
                        mapData[player.row][player.col] = TILE_LAND; // Modify global mapData
                    }
                    // End player turn after move by notifying Game manager
                     if (typeof redrawCanvas === 'function') redrawCanvas(); // Redraw to show move results
                    Game.endPlayerTurn();

                } // else: move blocked by terrain
            } // End Movement Logic
        } // else: move blocked by boundary
    } // End Move or Attack block
}