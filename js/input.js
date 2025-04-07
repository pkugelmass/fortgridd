console.log("input.js loaded");

/**
 * Handles keydown events for player actions: movement, attack, wait, heal, shoot.
 * Uses the global Game object to check/manage state and turns.
 * Calls Game.checkEndConditions() after actions that could end the game.
 */
function handleKeyDown(event) {
    // console.log("handleKeyDown Fired! Key:", event.key);

    // Use Game object to check state
    if (typeof Game === 'undefined') { console.error("Game object not loaded!"); return; }
    if (Game.isGameOver() || !Game.isPlayerTurn()) { return; }
    if (typeof player === 'undefined' || player.row === null || player.col === null) { return; }

    let targetRow = player.row; let targetCol = player.col;
    let actionKey = false; let actionType = null;
    let shootDirection = null;

    switch (event.key.toLowerCase()) {
        case 'arrowup': case 'w': targetRow--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowdown': case 's': targetRow++; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowleft': case 'a': targetCol--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowright': case 'd': targetCol++; actionKey = true; actionType = 'move_or_attack'; break;
        case ' ': actionKey = true; actionType = 'wait'; break;
        case 'h': actionKey = true; actionType = 'heal'; break;
        case 'i': actionKey = true; actionType = 'shoot'; shootDirection = { dr: -1, dc: 0 }; break;
        case 'k': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 1, dc: 0 }; break;
        case 'j': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 0, dc: -1 }; break;
        case 'l': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 0, dc: 1 }; break;
        default: return;
    }

    if (actionKey) event.preventDefault(); else return;

    // --- Process Actions ---

    if (actionType === 'wait') {
        console.log("Player waits.");
        if (typeof redrawCanvas === 'function') redrawCanvas();
        Game.endPlayerTurn(); // End turn
        return;
    }

    if (actionType === 'heal') {
        // console.log("Player attempts to heal..."); // Quieter
        if (typeof player.resources !== 'undefined' && typeof HEAL_COST !== 'undefined' && typeof HEAL_AMOUNT !== 'undefined' && typeof player.maxHp !== 'undefined') {
            if (player.resources.medkits >= HEAL_COST) {
                if (player.hp < player.maxHp) {
                    const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                    player.resources.medkits -= HEAL_COST; player.hp += healAmountActual;
                    console.log(`Player healed for ${healAmountActual} HP. HP: ${player.hp}/${player.maxHp}, Medkits: ${player.resources.medkits}`); // Simplified log
                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // Healing takes a turn
                } else { console.log("Cannot heal: Full health."); }
            } else { console.log(`Cannot heal: Need ${HEAL_COST} medkits.`); }
        } else { console.error("Healing failed: Dependencies missing."); }
        return; // Heal action attempt complete
    }

    if (actionType === 'shoot') {
        // console.log(`Player attempts to shoot [${shootDirection.dr}, ${shootDirection.dc}]...`); // Quieter
        if (typeof player.resources === 'undefined' || typeof RANGED_ATTACK_RANGE === 'undefined' || typeof RANGED_ATTACK_DAMAGE === 'undefined' || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined') {
            console.error("Shooting failed: Dependencies missing."); return;
        }

        if (player.resources.ammo > 0) {
            player.resources.ammo--; console.log(`Ammo remaining: ${player.resources.ammo}`);
            let shotHit = false; let hitTarget = null; let blocked = false;
            // Trace LoS
            for (let dist = 1; dist <= RANGED_ATTACK_RANGE; dist++) { const checkRow = player.row + shootDirection.dr * dist; const checkCol = player.col + shootDirection.dc * dist; if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { blocked = true; break; } const tileType = mapData[checkRow][checkCol]; if (tileType === TILE_WALL || tileType === TILE_TREE) { blocked = true; break; } if (typeof enemies !== 'undefined') { for (const enemy of enemies) { if (enemy.hp > 0 && enemy.row === checkRow && enemy.col === checkCol) { hitTarget = enemy; shotHit = true; break; } } } if (shotHit) break; }

            if (shotHit && hitTarget) { // Apply damage
                hitTarget.hp -= RANGED_ATTACK_DAMAGE; console.log(`Enemy ${hitTarget.id || '??'} hit! HP: ${hitTarget.hp}/${hitTarget.maxHp}`);
                if (hitTarget.hp <= 0) { console.log(`Enemy ${hitTarget.id || '??'} defeated!`); enemies = enemies.filter(e => e !== hitTarget); } // Remove dead enemy
            } else if (!blocked) { console.log("Shot missed."); } else { console.log("Shot blocked.");}

            if (typeof redrawCanvas === 'function') redrawCanvas(); // Show results
            // *** Check end conditions AFTER potential enemy removal ***
            if (!Game.checkEndConditions()) { // If game didn't end...
                 Game.endPlayerTurn(); // ...end the player's turn
            } // If game DID end, checkEndConditions handled it

        } else { console.log("Cannot shoot: Out of ammo!"); }
        return; // Shoot action attempt complete
    }


    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null; if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                console.log(`Player attacks Enemy ${targetEnemy.id || '??'}!`);
                targetEnemy.hp -= PLAYER_ATTACK_DAMAGE; console.log(`Enemy HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);
                if (targetEnemy.hp <= 0) { console.log(`Enemy ${targetEnemy.id || '??'} defeated!`); enemies = enemies.filter(enemy => enemy !== targetEnemy); } // Remove dead enemy
                if (typeof redrawCanvas === 'function') redrawCanvas(); // Show attack results
                // *** Check end conditions AFTER potential enemy removal ***
                if (!Game.checkEndConditions()) { // If game didn't end...
                     Game.endPlayerTurn(); // ...end the player's turn
                } // If game DID end, checkEndConditions handled it

            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];
                if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) { // Walkable Check
                    player.row = targetRow; player.col = targetCol; // Move player
                    let collectedResource = false;
                    if (targetTileType === TILE_MEDKIT) { if (player.resources) { player.resources.medkits++; console.log(`Collected Medkit! Total: ${player.resources.medkits}`); } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }
                    else if (targetTileType === TILE_AMMO) { if (player.resources) { player.resources.ammo++; console.log(`Collected Ammo! Total: ${player.resources.ammo}`); } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }
                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // End turn after move
                } else { console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) type ${targetTileType} is not walkable.`); }
            } // End Movement Logic
        } else { console.log(`Move blocked: Target (${targetRow}, ${targetCol}) is outside grid boundaries.`); }
    } // End Move or Attack block
}