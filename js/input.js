console.log("input.js loaded");

/**
 * Handles keydown events for player movement, attack, wait, OR heal ('h').
 * Uses the global Game object to check/manage state and turns.
 * Relies on global vars: player, enemies, mapData, GRID_WIDTH/HEIGHT, TILE_LAND/MEDKIT, PLAYER_ATTACK_DAMAGE, HEAL_COST, HEAL_AMOUNT.
 * Relies on global functions: redrawCanvas.
 * Calls Game.endPlayerTurn(), Game.setGameOver(), Game.isPlayerTurn(), Game.isGameOver().
 * @param {KeyboardEvent} event - The keyboard event object.
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
        if (typeof redrawCanvas === 'function') redrawCanvas(); // Update UI immediately
        Game.endPlayerTurn(); // End turn
        return; // Action complete
    }

    if (actionType === 'heal') {
        console.log("Player attempts to heal...");
        // Use constants from config.js and resources from player.js
        if (typeof player.resources !== 'undefined' && typeof HEAL_COST !== 'undefined' && typeof HEAL_AMOUNT !== 'undefined' && typeof player.maxHp !== 'undefined') {
            if (player.resources.medkits >= HEAL_COST) {
                if (player.hp < player.maxHp) {
                    const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp); // Heal only up to max HP
                    player.resources.medkits -= HEAL_COST;
                    player.hp += healAmountActual;
                    console.log(`Player healed for ${healAmountActual} HP using ${HEAL_COST} medkits. Current HP: ${player.hp}/${player.maxHp}, Medkits: ${player.resources.medkits}`);
                    if (typeof redrawCanvas === 'function') redrawCanvas(); // Show updated state
                    Game.endPlayerTurn(); // Healing takes a turn
                } else {
                    console.log("Cannot heal: Already at full health.");
                    // Do not end turn if action fails
                }
            } else {
                console.log(`Cannot heal: Need ${HEAL_COST} medkits, have ${player.resources.medkits || 0}.`);
                // Do not end turn if action fails
            }
        } else {
            console.error("Healing failed: Player resources, cost/amount constants, or maxHP missing.");
        }
        return; // Heal action attempt complete (success or fail)
    }

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
                    enemies = enemies.filter(enemy => enemy !== targetEnemy); // Remove enemy
                    if (enemies.length === 0) { // Check Win
                        console.log("All enemies defeated! YOU WIN!"); Game.setGameOver(); alert("YOU WIN!"); return;
                    }
                }
                if (typeof redrawCanvas === 'function') redrawCanvas(); // Redraw after attack results
                Game.endPlayerTurn(); // End turn after attack
            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol]; // Assumes mapData is global
                // Use TILE_MEDKIT constant from map.js
                if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT) { // Walkable Check
                    player.row = targetRow; player.col = targetCol; // Move player

                    // Use TILE_MEDKIT and player.resources.medkits
                    if (targetTileType === TILE_MEDKIT) { // Resource Check
                        if (player.resources) { player.resources.medkits++; console.log(`Collected Medkit! Total: ${player.resources.medkits}`); }
                        mapData[player.row][player.col] = TILE_LAND; // Change tile back to land
                    }
                    if (typeof redrawCanvas === 'function') redrawCanvas(); // Show move results
                    Game.endPlayerTurn(); // End turn after move

                } else { console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) type ${targetTileType} is not walkable.`); }
            } // End Movement Logic
        } else { console.log(`Move blocked: Target (${targetRow}, ${targetCol}) is outside grid boundaries.`); }
    } // End Move or Attack block
}