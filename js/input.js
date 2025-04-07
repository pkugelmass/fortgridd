console.log("input.js loaded");

/**
 * Handles keydown events for player movement, attack, wait, OR heal ('h').
 * Uses the global Game object to check/manage state and turns.
 */
function handleKeyDown(event) {
    // console.log("handleKeyDown Fired! Key:", event.key); // Optional debug

    // Use Game object to check state
    if (typeof Game === 'undefined') { console.error("Game object not loaded!"); return; }
    if (Game.isGameOver() || !Game.isPlayerTurn()) { return; } // Ignore input if game over or not player turn
    if (typeof player === 'undefined' || player.row === null || player.col === null) { return; }

    let targetRow = player.row; let targetCol = player.col;
    let actionKey = false; let actionType = null;

    switch (event.key.toLowerCase()) {
        case 'arrowup': case 'w': targetRow--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowdown': case 's': targetRow++; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowleft': case 'a': targetCol--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowright': case 'd': targetCol++; actionKey = true; actionType = 'move_or_attack'; break;
        case ' ': actionKey = true; actionType = 'wait'; break; // Spacebar = Wait
        case 'h': actionKey = true; actionType = 'heal'; break; // 'h' key for Heal
        default: return; // Ignore other keys
    }

    if (actionKey) event.preventDefault(); else return;

    // --- Process Actions ---

    if (actionType === 'wait') {
        console.log("Player waits.");
        if (typeof redrawCanvas === 'function') redrawCanvas();
        Game.endPlayerTurn();
        return;
    }

    if (actionType === 'heal') {
        console.log("Player attempts to heal...");
        if (typeof player.resources !== 'undefined' && typeof HEAL_COST !== 'undefined' && typeof HEAL_AMOUNT !== 'undefined' && typeof player.maxHp !== 'undefined') {
            if (player.resources.medkits >= HEAL_COST) {
                if (player.hp < player.maxHp) {
                    const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                    player.resources.medkits -= HEAL_COST;
                    player.hp += healAmountActual;
                    console.log(`Player healed for ${healAmountActual} HP using ${HEAL_COST} medkits. Current HP: ${player.hp}/${player.maxHp}, Medkits: ${player.resources.medkits}`);
                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn();
                } else { console.log("Cannot heal: Already at full health."); }
            } else { console.log(`Cannot heal: Need ${HEAL_COST} medkits, have ${player.resources.medkits || 0}.`); }
        } else { console.error("Healing failed: Dependencies missing."); }
        return;
    }

    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null;
            if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                console.log(`Player attacks Enemy ${targetEnemy.id || '??'}!`);
                targetEnemy.hp -= PLAYER_ATTACK_DAMAGE; console.log(`Enemy HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);
                if (targetEnemy.hp <= 0) { console.log(`Enemy ${targetEnemy.id || '??'} defeated!`); enemies = enemies.filter(enemy => enemy !== targetEnemy); if (enemies.length === 0) { console.log("All enemies defeated! YOU WIN!"); Game.setGameOver(); alert("YOU WIN!"); return; } }
                if (typeof redrawCanvas === 'function') redrawCanvas();
                Game.endPlayerTurn();
            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];

                // *** UPDATED Walkable Check: Now includes TILE_AMMO ***
                if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) {
                    player.row = targetRow; player.col = targetCol; // Move player

                    let collectedResource = false; // Flag to only collect one type per move

                    // Check for Medkit collection
                    if (targetTileType === TILE_MEDKIT) {
                        if (player.resources) { player.resources.medkits++; console.log(`Collected Medkit! Total: ${player.resources.medkits}`); }
                        mapData[player.row][player.col] = TILE_LAND; // Change tile back to land
                        collectedResource = true;
                    }
                    // *** NEW: Check for Ammo collection (only if not a medkit) ***
                    else if (targetTileType === TILE_AMMO) {
                         if (player.resources) { player.resources.ammo++; console.log(`Collected Ammo! Total: ${player.resources.ammo}`); }
                         mapData[player.row][player.col] = TILE_LAND; // Change tile back to land
                         collectedResource = true;
                    }

                    // Always redraw after valid move (shows movement & potential UI/map change)
                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // End turn after move

                } else {
                    // Log blocked move by terrain/obstacle
                    console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) type ${targetTileType} is not walkable.`);
                }
            } // End Movement Logic
        } else {
             // Log blocked move by boundary
            console.log(`Move blocked: Target (${targetRow}, ${targetCol}) is outside grid boundaries.`);
        }
    } // End Move or Attack block
}