console.log("input.js loaded");

/**
 * Handles keydown events for player actions: movement, attack, wait, heal, shoot.
 * Uses the global Game object to check/manage state and turns.
 * Logs actions via Game.logMessage.
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
        Game.logMessage("Player waits."); // Log Wait
        if (typeof redrawCanvas === 'function') redrawCanvas();
        Game.endPlayerTurn();
        return;
    }

    if (actionType === 'heal') {
        // console.log("Player attempts to heal..."); // Quieter
        if (typeof player.resources !== 'undefined' && typeof HEAL_COST !== 'undefined' && typeof HEAL_AMOUNT !== 'undefined' && typeof player.maxHp !== 'undefined') {
            if (player.resources.medkits >= HEAL_COST) {
                if (player.hp < player.maxHp) {
                    const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                    player.resources.medkits -= HEAL_COST; player.hp += healAmountActual;
                    Game.logMessage(`Player heals for ${healAmountActual} HP (Cost: ${HEAL_COST} Medkits).`); // Log Heal
                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // Healing takes a turn
                } else { Game.logMessage("Cannot heal: Full health."); } // Log Fail
            } else { Game.logMessage(`Cannot heal: Need ${HEAL_COST} medkits (Have: ${player.resources.medkits || 0}).`); } // Log Fail
        } else { console.error("Healing failed: Dependencies missing."); }
        return; // Heal action attempt complete
    }

    if (actionType === 'shoot') {
        // console.log(`Player attempts to shoot...`); // Quieter
        if (typeof player.resources === 'undefined' || typeof RANGED_ATTACK_RANGE === 'undefined' || typeof RANGED_ATTACK_DAMAGE === 'undefined' || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined') { console.error("Shooting failed: Dependencies missing."); return; }

        if (player.resources.ammo > 0) {
            player.resources.ammo--; // Consume ammo first
            let shotHit = false; let hitTarget = null; let blocked = false;
            let blockedBy = "";

            // Trace LoS
            for (let dist = 1; dist <= RANGED_ATTACK_RANGE; dist++) {
                 const checkRow = player.row + shootDirection.dr * dist; const checkCol = player.col + shootDirection.dc * dist;
                 if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { blocked = true; blockedBy = "Map Edge"; break; }
                 const tileType = mapData[checkRow][checkCol];
                 if (tileType === TILE_WALL || tileType === TILE_TREE) { blocked = true; blockedBy = (tileType === TILE_WALL ? "Wall" : "Tree"); break; }
                 if (typeof enemies !== 'undefined') { for (const enemy of enemies) { if (enemy.hp > 0 && enemy.row === checkRow && enemy.col === checkCol) { hitTarget = enemy; shotHit = true; break; } } }
                 if (shotHit) break;
            }

            let logMsg = `Player shoots ${shootDirection.dr === -1 ? 'Up' : shootDirection.dr === 1 ? 'Down' : shootDirection.dc === -1 ? 'Left' : 'Right'}.`;

            if (shotHit && hitTarget) { // Hit
                const targetId = hitTarget.id || '??'; const damage = RANGED_ATTACK_DAMAGE;
                hitTarget.hp -= damage;
                logMsg += ` Hit ${targetId} for ${damage} damage! (HP: ${hitTarget.hp}/${hitTarget.maxHp})`;
                Game.logMessage(logMsg); // Log Hit first
                if (hitTarget.hp <= 0) { enemies = enemies.filter(e => e !== hitTarget); Game.logMessage(`${targetId} defeated!`); } // Log Defeat
            } else if (blocked) { logMsg += ` Blocked by ${blockedBy}.`; Game.logMessage(logMsg); } // Log Block
              else { logMsg += " Missed."; Game.logMessage(logMsg); } // Log Miss

            if (typeof redrawCanvas === 'function') redrawCanvas(); // Show results
            if (!Game.checkEndConditions()) { Game.endPlayerTurn(); } // Check end conditions & end turn

        } else { Game.logMessage("Cannot shoot: Out of ammo!"); } // Log Fail
        return; // Shoot action attempt complete
    }


    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null; if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                const targetId = targetEnemy.id || '??'; const damage = PLAYER_ATTACK_DAMAGE;
                Game.logMessage(`Player attacks ${targetId} for ${damage} damage.`); // Log Attack
                targetEnemy.hp -= damage; // console.log(`Enemy HP...`); // Quieter
                if (targetEnemy.hp <= 0) { enemies = enemies.filter(enemy => enemy !== targetEnemy); Game.logMessage(`${targetId} defeated!`); } // Log Defeat
                if (typeof redrawCanvas === 'function') redrawCanvas(); // Show attack results
                if (!Game.checkEndConditions()) { Game.endPlayerTurn(); } // Check end conditions & end turn

            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];
                if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) { // Walkable Check
                    player.row = targetRow; player.col = targetCol; // Move player
                    let resourceCollected = false; let resourceType = "";
                    if (targetTileType === TILE_MEDKIT) { if (player.resources) { player.resources.medkits++; resourceType = "Medkit"; } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }
                    else if (targetTileType === TILE_AMMO) { if (player.resources) { player.resources.ammo++; resourceType = "Ammo"; } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }

                    if (resourceCollected) { Game.logMessage(`Player collected ${resourceType}.`); } // Log collection
                    // Game.logMessage("Player moved."); // Decided against logging every move

                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // End turn after move
                } else { console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) type ${targetTileType} is not walkable.`); } // Keep console log
            } // End Movement Logic
        } else { console.log(`Move blocked: Target (${targetRow}, ${targetCol}) is outside grid boundaries.`); } // Keep console log
    } // End Move or Attack block
} // End handleKeyDown