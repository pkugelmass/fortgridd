console.log("input.js loaded");

/**
 * Handles keydown events for player actions: movement, attack, wait, heal, shoot.
 * Uses the global Game object to check/manage state and turns.
 * Logs actions via Game.logMessage. Calls Game.checkEndConditions().
 */
function handleKeyDown(event) {
    if (typeof Game === 'undefined' || Game.isGameOver() || !Game.isPlayerTurn()) { return; }
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
        Game.logMessage("Player waits."); // <<< LOG
        if (typeof redrawCanvas === 'function') redrawCanvas();
        Game.endPlayerTurn(); return;
    }

    if (actionType === 'heal') {
        if (typeof player.resources !== 'undefined' && typeof HEAL_COST !== 'undefined' && typeof HEAL_AMOUNT !== 'undefined' && typeof player.maxHp !== 'undefined') {
            if (player.resources.medkits >= HEAL_COST) {
                if (player.hp < player.maxHp) {
                    const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                    player.resources.medkits -= HEAL_COST; player.hp += healAmountActual;
                    Game.logMessage(`Player uses Medkit, heals ${healAmountActual} HP.`); // <<< LOG
                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn();
                } else { Game.logMessage("Player tries to heal: Already at full health."); } // <<< LOG
            } else { Game.logMessage(`Player tries to heal: Needs ${HEAL_COST} medkits (has ${player.resources.medkits || 0}).`); } // <<< LOG
        } else { console.error("Healing failed: Dependencies missing."); }
        return;
    }

    if (actionType === 'shoot') {
        if (typeof player.resources === 'undefined' || typeof RANGED_ATTACK_RANGE === 'undefined' || typeof RANGED_ATTACK_DAMAGE === 'undefined' || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined') { console.error("Shooting failed: Dependencies missing."); return; }
        if (player.resources.ammo > 0) {
            player.resources.ammo--;
            let shotHit = false; let hitTarget = null; let blocked = false; let blockedBy = ""; let hitCoord = null;
            // Trace LoS
            for (let dist = 1; dist <= RANGED_ATTACK_RANGE; dist++) { const checkRow = player.row + shootDirection.dr * dist; const checkCol = player.col + shootDirection.dc * dist; if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { blocked = true; blockedBy="Map Edge"; break; } const tileType = mapData[checkRow][checkCol]; if (tileType === TILE_WALL || tileType === TILE_TREE) { blocked = true; blockedBy=(tileType === TILE_WALL ? "Wall" : "Tree"); hitCoord = {row: checkRow, col: checkCol}; break; } if (typeof enemies !== 'undefined') { for (const enemy of enemies) { if (enemy.hp > 0 && enemy.row === checkRow && enemy.col === checkCol) { hitTarget = enemy; shotHit = true; hitCoord = {row: checkRow, col: checkCol}; break; } } } if (shotHit) break; }

            let logMsg = `Player shoots ${shootDirection.dr === -1 ? 'Up' : shootDirection.dr === 1 ? 'Down' : shootDirection.dc === -1 ? 'Left' : 'Right'}`;
            let targetDefeated = false;

            if (shotHit && hitTarget) { // Hit
                const targetId = hitTarget.id || '??'; const damage = RANGED_ATTACK_DAMAGE; hitTarget.hp -= damage;
                logMsg += ` -> hits ${targetId} at (${hitTarget.row},${hitTarget.col}) for ${damage} damage! (HP: ${hitTarget.hp}/${hitTarget.maxHp})`;
                if (hitTarget.hp <= 0) { targetDefeated = true; }
            } else if (blocked) { logMsg += ` -> blocked by ${blockedBy}` + (hitCoord ? ` at (${hitCoord.row},${hitCoord.col})` : '') + "."; }
              else { logMsg += " -> missed."; }
            Game.logMessage(logMsg); // <<< LOG Shot Result

            if(targetDefeated){ // Remove AFTER logging hit
                 enemies = enemies.filter(e => e !== hitTarget);
                 // Defeat message logged by checkEndConditions
            }

            if (typeof redrawCanvas === 'function') redrawCanvas();
            if (!Game.checkEndConditions()) { Game.endPlayerTurn(); } // Check end conditions & end turn

        } else { Game.logMessage("Cannot shoot: Out of ammo!"); } // <<< LOG Fail
        return;
    }


    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null; if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                const targetId = targetEnemy.id || '??'; const damage = PLAYER_ATTACK_DAMAGE;
                Game.logMessage(`Player attacks ${targetId} at (${targetRow},${targetCol}) for ${damage} damage.`); // <<< LOG Attack
                targetEnemy.hp -= damage;
                let targetDefeated = false;
                if (targetEnemy.hp <= 0) { targetDefeated = true; }
                if (targetDefeated) { enemies = enemies.filter(enemy => enemy !== targetEnemy); /* Defeat message logged by checkEndConditions */ }
                if (typeof redrawCanvas === 'function') redrawCanvas();
                if (!Game.checkEndConditions()) { Game.endPlayerTurn(); } // Check end conditions

            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];
                if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) { // Walkable Check
                    const oldRow = player.row; const oldCol = player.col;
                    player.row = targetRow; player.col = targetCol; // Move player
                    let resourceCollected = false; let resourceType = ""; let resourceLoc = `(${targetRow},${targetCol})`;
                    if (targetTileType === TILE_MEDKIT) { if (player.resources) { player.resources.medkits++; resourceType = "Medkit"; } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }
                    else if (targetTileType === TILE_AMMO) { if (player.resources) { player.resources.ammo++; resourceType = "Ammo"; } mapData[player.row][player.col] = TILE_LAND; collectedResource = true; }

                    if (resourceCollected) { Game.logMessage(`Player moves to ${resourceLoc} & collects ${resourceType}.`); } // <<< LOG Move+Collect
                    // else { Game.logMessage(`Player moves from (${oldRow},${oldCol}) to (${targetRow},${targetCol}).`); } // Optional: Log every move?

                    if (typeof redrawCanvas === 'function') redrawCanvas();
                    Game.endPlayerTurn(); // End turn after move
                } else { console.log(`Move blocked: Target tile...`); } // Keep console log for debug
            } // End Movement Logic
        } else { console.log(`Move blocked: Target ... outside boundaries.`); } // Keep console log
    } // End Move or Attack block
} // End handleKeyDown