console.log("input.js loaded");

/**
 * Handles keydown events for player actions: movement, attack, wait, heal, shoot.
 * Uses the global Game object to check/manage state and turns.
 * Relies on global vars/consts from other files.
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
    let shootDirection = null; // To store shooting direction {dr, dc}

    switch (event.key.toLowerCase()) {
        // Movement / Melee Attack
        case 'arrowup': case 'w': targetRow--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowdown': case 's': targetRow++; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowleft': case 'a': targetCol--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowright': case 'd': targetCol++; actionKey = true; actionType = 'move_or_attack'; break;
        // Other Actions
        case ' ': actionKey = true; actionType = 'wait'; break; // Wait
        case 'h': actionKey = true; actionType = 'heal'; break; // Heal
        // Shooting Actions (NEW)
        case 'i': actionKey = true; actionType = 'shoot'; shootDirection = { dr: -1, dc: 0 }; break; // Shoot Up
        case 'k': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 1, dc: 0 }; break;  // Shoot Down
        case 'j': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 0, dc: -1 }; break; // Shoot Left
        case 'l': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 0, dc: 1 }; break;  // Shoot Right
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
                    const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                    player.resources.medkits -= HEAL_COST;
                    player.hp += healAmountActual;
                    console.log(`Player healed for ${healAmountActual} HP using ${HEAL_COST} medkits. Current HP: ${player.hp}/${player.maxHp}, Medkits: ${player.resources.medkits}`);
                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // Healing takes a turn
                } else { console.log("Cannot heal: Already at full health."); }
            } else { console.log(`Cannot heal: Need ${HEAL_COST} medkits, have ${player.resources.medkits || 0}.`); }
        } else { console.error("Healing failed: Dependencies missing."); }
        return; // Heal action attempt complete
    }

    if (actionType === 'shoot') {
        console.log(`Player attempts to shoot [${shootDirection.dr}, ${shootDirection.dc}]...`);
        // Check if required constants/objects exist
        if (typeof player.resources === 'undefined' || typeof RANGED_ATTACK_RANGE === 'undefined' || typeof RANGED_ATTACK_DAMAGE === 'undefined' || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined') {
            console.error("Shooting failed: Required constants or game data missing.");
            return; // Don't end turn if config/data missing
        }

        if (player.resources.ammo > 0) {
            player.resources.ammo--; // Consume ammo
            console.log(`Ammo remaining: ${player.resources.ammo}`);

            let shotHit = false;
            let hitTarget = null;
            let blocked = false;

            // Trace the shot cell by cell
            for (let dist = 1; dist <= RANGED_ATTACK_RANGE; dist++) {
                const checkRow = player.row + shootDirection.dr * dist;
                const checkCol = player.col + shootDirection.dc * dist;

                // 1. Check boundaries
                if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) {
                    console.log("Shot went off map.");
                    blocked = true; // Treat going off map as blocked
                    break; // Stop trace
                }

                // 2. Check for obstacle collision
                const tileType = mapData[checkRow][checkCol];
                if (tileType === TILE_WALL || tileType === TILE_TREE) {
                    console.log(`Shot blocked by obstacle (${tileType === TILE_WALL ? 'Wall' : 'Tree'}) at (${checkRow}, ${checkCol})`);
                    blocked = true;
                    break; // Stop trace
                }

                // 3. Check for unit hit (enemies first)
                 if (typeof enemies !== 'undefined') {
                    for (const enemy of enemies) {
                        // Check only living enemies at the target cell
                        if (enemy.hp > 0 && enemy.row === checkRow && enemy.col === checkCol) {
                             hitTarget = enemy;
                             shotHit = true;
                             console.log(`Player shot hit Enemy ${hitTarget.id || '??'} at (${checkRow}, ${checkCol})!`);
                             break; // Stop checking other enemies
                        }
                    }
                 }
                 // Can skip checking for hitting player as trace starts from dist=1

                if (shotHit) break; // Stop trace once any target is hit
                // If not blocked and no unit hit, continue to next cell in trace
            } // End trace loop

            // Apply damage if a target was hit
            if (shotHit && hitTarget) {
                const isTargetPlayer = false; // Cannot hit player in this trace logic
                const targetId = hitTarget.id || '??'; // Enemy ID

                hitTarget.hp -= RANGED_ATTACK_DAMAGE;
                console.log(`Enemy ${targetId} HP after shot: ${hitTarget.hp}/${hitTarget.maxHp}`);

                // Check defeat condition for the target enemy
                if (hitTarget.hp <= 0) {
                    console.log(`Enemy ${targetId} defeated by ranged attack!`);
                    enemies = enemies.filter(e => e !== hitTarget); // Remove enemy
                    // Check Win Condition
                    if (enemies.length === 0 && !Game.isGameOver()) { // Check game over just in case
                        console.log("Last enemy defeated! YOU WIN!");
                        Game.setGameOver();
                        alert("YOU WIN!");
                        // Return here prevents Game.endPlayerTurn() call below which is correct
                        return;
                    }
                }
            } else if (!blocked) {
                // Only log miss if it wasn't blocked and didn't hit anything
                console.log("Shot missed (max range or empty space).");
            }

            // Shooting always ends the turn, regardless of hit/miss/block
            if (typeof redrawCanvas === 'function') redrawCanvas(); // Show results
            Game.endPlayerTurn();

        } else {
            console.log("Cannot shoot: Out of ammo!");
            // Do not end turn if no ammo
        }
        return; // Shoot action attempt complete
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
                // Walkable Check: Includes TILE_AMMO
                if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) {
                    player.row = targetRow; player.col = targetCol; // Move player
                    let collectedResource = false;
                    // Check for Medkit collection
                    if (targetTileType === TILE_MEDKIT) { if (player.resources) { player.resources.medkits++; console.log(`Collected Medkit! Total: ${player.resources.medkits}`); } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }
                    // Check for Ammo collection
                    else if (targetTileType === TILE_AMMO) { if (player.resources) { player.resources.ammo++; console.log(`Collected Ammo! Total: ${player.resources.ammo}`); } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }

                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // End turn after move
                } else { console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) type ${targetTileType} is not walkable.`); }
            } // End Movement Logic
        } else { console.log(`Move blocked: Target (${targetRow}, ${targetCol}) is outside grid boundaries.`); }
    } // End Move or Attack block
}