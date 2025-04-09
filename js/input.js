console.log("input.js loaded");

/**
 * Handles keydown events for player actions: movement, attack, wait, heal, shoot.
 * Uses the global Game object to check/manage state and turns.
 * Logs actions via Game.logMessage. Calls Game.checkEndConditions().
 */
function handleKeyDown(event) {
    // console.log("handleKeyDown Fired! Key:", event.key); // Optional debug

    // Use Game object to check state first
    if (typeof Game === 'undefined') { console.error("Game object not loaded!"); return; }
    if (Game.isGameOver() || !Game.isPlayerTurn()) {
        // console.log(`Input ignored: GameOver=${Game.isGameOver()}, IsPlayerTurn=${Game.isPlayerTurn()}`);
        return; // Ignore input if game over or not player's turn
    }
    // Check if player is ready
    if (typeof player === 'undefined' || player.row === null || player.col === null) {
        console.warn("Player not ready, ignoring input.");
        return;
    }

    // Determine target coords or action type based on key press
    let targetRow = player.row; let targetCol = player.col;
    let actionKey = false; let actionType = null;
    let shootDirection = null;

    switch (event.key.toLowerCase()) {
        case 'arrowup': case 'w': targetRow--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowdown': case 's': targetRow++; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowleft': case 'a': targetCol--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowright': case 'd': targetCol++; actionKey = true; actionType = 'move_or_attack'; break;
        case ' ': actionKey = true; actionType = 'wait'; break; // Spacebar = Wait
        case 'h': actionKey = true; actionType = 'heal'; break; // 'h' key for Heal
        case 'i': actionKey = true; actionType = 'shoot'; shootDirection = { dr: -1, dc: 0 }; break; // Shoot Up
        case 'k': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 1, dc: 0 }; break;  // Shoot Down
        case 'j': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 0, dc: -1 }; break; // Shoot Left
        case 'l': actionKey = true; actionType = 'shoot'; shootDirection = { dr: 0, dc: 1 }; break;  // Shoot Right
        default: return; // Ignore other keys
    }

    // If a recognized action key was pressed, prevent default browser actions
    if (actionKey) event.preventDefault(); else return;

    // --- Define Log message classes ---
    // REMOVED - Using global constants from config.js now

    // --- Process Actions ---

    // WAIT Action
    if (actionType === 'wait') {
        Game.logMessage("Player waits.", LOG_CLASS_PLAYER_NEUTRAL);
        if (typeof redrawCanvas === 'function') redrawCanvas(); // Update UI immediately (turn indicator)
        Game.endPlayerTurn(); // End turn
        return; // Action complete
    }

    // HEAL Action
    if (actionType === 'heal') {
        if (typeof player.resources !== 'undefined' && typeof HEAL_COST !== 'undefined' && typeof HEAL_AMOUNT !== 'undefined' && typeof player.maxHp !== 'undefined') {
            if (player.resources.medkits >= HEAL_COST) {
                if (player.hp < player.maxHp) {
                    const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                    player.resources.medkits -= HEAL_COST; player.hp += healAmountActual;
                    Game.logMessage(`Player uses Medkit, heals ${healAmountActual} HP.`, LOG_CLASS_PLAYER_GOOD); // Log Heal success
                    if (typeof redrawCanvas === 'function') redrawCanvas(); // Show updated state
                    Game.endPlayerTurn(); // Healing takes a turn
                } else { Game.logMessage("Cannot heal: Full health.", LOG_CLASS_PLAYER_NEUTRAL); } // Log Fail reason
            } else { Game.logMessage(`Cannot heal: Need ${HEAL_COST} medkits (Have: ${player.resources.medkits || 0}).`, LOG_CLASS_PLAYER_NEUTRAL); } // Log Fail reason
        } else { console.error("Healing failed: Dependencies missing."); } // Keep console error for dev
        return; // Heal action attempt complete (success or fail)
    }

    // SHOOT Action
    if (actionType === 'shoot') {
        // Check dependencies first
        if (typeof player.resources === 'undefined' || typeof RANGED_ATTACK_RANGE === 'undefined' || typeof RANGED_ATTACK_DAMAGE === 'undefined' || typeof mapData === 'undefined' || typeof TILE_WALL === 'undefined' || typeof TILE_TREE === 'undefined') {
            console.error("Shooting failed: Required constants or game data missing."); return; // Don't end turn
        }
        // Check ammo
        if (player.resources.ammo > 0) {
            player.resources.ammo--; // Consume ammo immediately
            let shotHit = false; let hitTarget = null; let blocked = false; let blockedBy = ""; let hitCoord = null;

            // --- Trace Line of Sight ---
            for (let dist = 1; dist <= RANGED_ATTACK_RANGE; dist++) {
                const checkRow = player.row + shootDirection.dr * dist;
                const checkCol = player.col + shootDirection.dc * dist;
                // Check boundaries
                if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { blocked = true; blockedBy="Map Edge"; break; }
                // Check obstacles
                const tileType = mapData[checkRow][checkCol];
                if (tileType === TILE_WALL || tileType === TILE_TREE) { blocked = true; blockedBy=(tileType === TILE_WALL ? "Wall" : "Tree"); hitCoord = {row: checkRow, col: checkCol}; break; }
                // Check for living enemies
                if (typeof enemies !== 'undefined') { for (const enemy of enemies) { if (enemy.hp > 0 && enemy.row === checkRow && enemy.col === checkCol) { hitTarget = enemy; shotHit = true; hitCoord = {row: checkRow, col: checkCol}; break; } } }
                if (shotHit) break; // Stop trace if hit
            } // --- End Trace ---

            let logMsg = `Player shoots ${shootDirection.dr === -1 ? 'Up' : shootDirection.dr === 1 ? 'Down' : shootDirection.dc === -1 ? 'Left' : 'Right'}`;
            let targetDefeated = false;
            let msgClass = LOG_CLASS_PLAYER_NEUTRAL; // Default log style

            if (shotHit && hitTarget) { // Apply damage if hit
                const targetId = hitTarget.id || '??'; const damage = RANGED_ATTACK_DAMAGE;
                hitTarget.hp -= damage;
                logMsg += ` -> hits ${targetId} at (${hitTarget.row},${hitTarget.col}) for ${damage} damage! (HP: ${hitTarget.hp}/${hitTarget.maxHp})`;
                msgClass = LOG_CLASS_PLAYER_GOOD; // Style hit as positive for player
                if (hitTarget.hp <= 0) { targetDefeated = true; } // Mark for removal below
            } else if (blocked) { logMsg += ` -> blocked by ${blockedBy}` + (hitCoord ? ` at (${hitCoord.row},${hitCoord.col})` : '') + "."; msgClass = LOG_CLASS_PLAYER_NEUTRAL; } // Neutral style for block
              else { logMsg += " -> missed."; msgClass = LOG_CLASS_PLAYER_NEUTRAL; } // Neutral style for miss

            Game.logMessage(logMsg, msgClass); // Log the outcome

            if (targetDefeated) { // Handle defeat separately (message logged by checkEndConditions)
                 enemies = enemies.filter(e => e !== hitTarget); // Remove dead enemy
            }

            if (typeof redrawCanvas === 'function') redrawCanvas(); // Show results immediately
            if (!Game.checkEndConditions()) { Game.endPlayerTurn(); } // Check end conditions & end turn if game continues

        } else { Game.logMessage("Cannot shoot: Out of ammo!", LOG_CLASS_PLAYER_BAD); } // Log Fail with negative style
        return; // Shoot action attempt complete
    }


    // MOVE OR MELEE ATTACK Action
    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null; if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                const targetId = targetEnemy.id || '??'; const damage = PLAYER_ATTACK_DAMAGE;
                Game.logMessage(`Player attacks ${targetId} at (${targetRow},${targetCol}) for ${damage} damage.`, LOG_CLASS_PLAYER_GOOD); // Log Attack as positive
                targetEnemy.hp -= damage;
                let targetDefeated = false;
                if (targetEnemy.hp <= 0) { targetDefeated = true; }
                if (targetDefeated) { enemies = enemies.filter(enemy => enemy !== targetEnemy); /* Defeat msg handled by checkEndConditions */ }
                if (typeof redrawCanvas === 'function') redrawCanvas(); // Show attack results
                if (!Game.checkEndConditions()) { Game.endPlayerTurn(); } // Check end conditions & end turn

            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];
                // Walkable Check (includes TILE_AMMO and TILE_MEDKIT)
                if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) {
                    const oldRow = player.row; const oldCol = player.col; // Store for logging if needed
                    player.row = targetRow; player.col = targetCol; // Move player
                    let resourceCollected = false; // Initialize flag HERE
                    let resourceType = "";
                    let resourceLoc = `(${targetRow},${targetCol})`;
                    // Check for resource collection
                    // REMOVED duplicate declaration: let resourceCollected = false;
                    if (targetTileType === TILE_MEDKIT) { if (player.resources) { player.resources.medkits++; resourceType = "Medkit"; } mapData[player.row][player.col] = TILE_LAND; resourceCollected = true; }
                    else if (targetTileType === TILE_AMMO) { if (player.resources) { player.resources.ammo++; resourceType = "Ammo"; } mapData[player.row][player.col] = TILE_LAND; resourceCollected = true; }

                    if (resourceCollected) { Game.logMessage(`Player moves to ${resourceLoc} & collects ${resourceType}.`, LOG_CLASS_PLAYER_NEUTRAL); } // Log collection
                    // else { Game.logMessage(`Player moves to (${targetRow},${targetCol}).`, LOG_CLASS_PLAYER_NEUTRAL); } // Optional move log

                    if (typeof redrawCanvas === 'function') redrawCanvas(); // Show move results
                    Game.endPlayerTurn(); // End turn after move
                } else {
                    // Log blocked move by terrain
                    console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) type ${targetTileType} is not walkable.`);
                    Game.logMessage(`Player move blocked by terrain at (${targetRow},${targetCol}).`, LOG_CLASS_PLAYER_NEUTRAL); // Add to game log too
                }
            } // End Movement Logic
        } else {
            // Log blocked move by boundary
            console.log(`Move blocked: Target (${targetRow}, ${targetCol}) is outside grid boundaries.`);
            Game.logMessage(`Player move blocked by map edge at (${targetRow},${targetCol}).`, LOG_CLASS_PLAYER_NEUTRAL); // Add to game log too
        }
    } // End Move or Attack block
} // End handleKeyDown
