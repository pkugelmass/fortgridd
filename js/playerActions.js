// Player Actions Module: Handles the execution logic for specific player actions.
console.log("playerActions.js loaded");

const PlayerActions = {
    /**
     * Handles player movement or melee attack intent.
     * Checks boundaries, terrain, and enemies. Executes move or attack.
     * Assumes necessary functions (Game.logMessage, applyKnockback, updateUnitPosition)
     * and constants (TILE_*, PLAYER_ATTACK_DAMAGE, LOG_CLASS_*) are globally accessible.
     * @param {object} player - The player object from gameState.
     * @param {number} targetRow - The intended destination row.
     * @param {number} targetCol - The intended destination column.
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} - True if the action consumed the player's turn, false otherwise.
     */
    handleMoveOrAttack: function(player, targetRow, targetCol, gameState) {
        const mapData = gameState.mapData;
        const enemies = gameState.enemies;
        const gridHeight = mapData.length;
        const gridWidth = mapData[0] ? mapData[0].length : 0;

        // 1. Boundary Check
        if (targetRow < 0 || targetRow >= gridHeight || targetCol < 0 || targetCol >= gridWidth) {
            Game.logMessage(`Player move blocked by map edge at (${targetRow},${targetCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
            return false; // Turn not consumed
        }

        // 2. Check for Enemy (Melee Attack)
        const targetEnemy = enemies.find(enemy => enemy.hp > 0 && enemy.row === targetRow && enemy.col === targetCol);
        if (targetEnemy) {
            const targetId = targetEnemy.id || '??';
            const damage = PLAYER_ATTACK_DAMAGE || 1;
            Game.logMessage(`Player attacks ${targetId} at (${targetRow},${targetCol}) for ${damage} damage.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_GOOD });
            targetEnemy.hp -= damage;
            let knockbackMsg = "";
            if (targetEnemy.hp > 0 && typeof applyKnockback === 'function') { // Check if knockback exists
                const knockbackResult = applyKnockback(player, targetEnemy, gameState);
                if (knockbackResult.success) {
                    knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
                } else if (knockbackResult.reason !== 'calc_error') {
                    knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
                }
            } else if (targetEnemy.hp > 0) {
                 Game.logMessage("handleMoveOrAttack: applyKnockback function not found!", gameState, { level: 'WARN', target: 'CONSOLE' });
            }
            if (knockbackMsg) {
                Game.logMessage(knockbackMsg.trim(), gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
            }
            return true; // Turn consumed by attack
        }

        // 3. Check Terrain (Movement)
        const targetTileType = mapData[targetRow][targetCol];
        if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) {
            Game.logMessage(`Player moves to (${targetRow},${targetCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
            if (typeof updateUnitPosition === 'function') {
                updateUnitPosition(player, targetRow, targetCol, gameState); // Assumes global function
            } else {
                 Game.logMessage("handleMoveOrAttack: updateUnitPosition function not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
                 return false; // Cannot complete move, don't consume turn
            }
            return true; // Turn consumed by move
        } else {
            Game.logMessage(`Player move blocked by terrain at (${targetRow},${targetCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
            return false; // Turn not consumed
        }
    },

    /**
     * Handles player healing action.
     * Checks for medkits and current health. Applies healing if possible.
     * Assumes necessary functions (Game.logMessage) and constants (HEAL_COST, HEAL_AMOUNT, LOG_CLASS_*)
     * are globally accessible.
     * @param {object} player - The player object from gameState.
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} - True if the action consumed the player's turn, false otherwise.
     */
    handleHeal: function(player, gameState) {
        if (player.resources.medkits >= HEAL_COST) {
            if (player.hp < player.maxHp) {
                const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                player.resources.medkits -= HEAL_COST;
                player.hp += healAmountActual;
                Game.logMessage(`Player uses Medkit, heals ${healAmountActual} HP.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_GOOD });
                return true; // Turn consumed
            } else {
                Game.logMessage("Cannot heal: Full health.", gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
                return false; // Turn not consumed
            }
        } else {
            Game.logMessage(`Cannot heal: Need ${HEAL_COST} medkits (Have: ${player.resources.medkits || 0}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
            return false; // Turn not consumed
        }
    },

    /**
     * Handles player shooting action.
     * Checks ammo, performs line trace, checks for hits/blocks, applies damage/knockback.
     * Assumes necessary functions (Game.logMessage, traceLine, applyKnockback)
     * and constants (RANGED_*, TILE_*, LOG_CLASS_*) are globally accessible.
     * @param {object} player - The player object from gameState.
     * @param {{dr: number, dc: number}} shootDirection - Object with delta row/col for direction.
     * @param {string} dirString - Human-readable direction string for logging ("Up", "Down", etc.).
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} - True if the action consumed the player's turn, false otherwise.
     */
    handleShoot: function(player, shootDirection, dirString, gameState) {
        if (player.resources.ammo > 0) {
            player.resources.ammo--;

            let shotHit = false;
            let hitTarget = null;
            let blocked = false;
            let blockedBy = "";
            let hitCoord = null;

            const mapData = gameState.mapData;
            const enemies = gameState.enemies;
            const gridHeight = mapData.length;
            const gridWidth = mapData[0] ? mapData[0].length : 0;

            // Assumes traceLine function is available globally
            if (typeof traceLine !== 'function') {
                 Game.logMessage("handleShoot: traceLine function not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
                 return false; // Cannot perform action, don't consume turn
            }

            const traceEndX = player.col + shootDirection.dc * (RANGED_ATTACK_RANGE + 1);
            const traceEndY = player.row + shootDirection.dr * (RANGED_ATTACK_RANGE + 1);
            const linePoints = traceLine(player.col, player.row, traceEndX, traceEndY);

            for (let i = 1; i < linePoints.length; i++) {
                const point = linePoints[i];
                const checkRow = point.row;
                const checkCol = point.col;
                const dist = Math.abs(checkRow - player.row) + Math.abs(checkCol - player.col); // Simple Manhattan distance for range check

                if (dist > RANGED_ATTACK_RANGE) break;
                if (checkRow < 0 || checkRow >= gridHeight || checkCol < 0 || checkCol >= gridWidth) {
                    blocked = true; blockedBy = "Map Edge"; hitCoord = { row: checkRow, col: checkCol }; break;
                }
                const tileType = mapData[checkRow][checkCol];
                if (tileType === TILE_WALL || tileType === TILE_TREE) {
                    blocked = true; blockedBy = (tileType === TILE_WALL ? "Wall" : "Tree"); hitCoord = { row: checkRow, col: checkCol }; break;
                }
                hitTarget = enemies.find(enemy => enemy.hp > 0 && enemy.row === checkRow && enemy.col === checkCol);
                if (hitTarget) {
                    shotHit = true; hitCoord = { row: checkRow, col: checkCol }; break;
                }
            }

            let logMsg = `Player shoots ${dirString}`;
            let knockbackMsg = "";
            let msgClass = LOG_CLASS_PLAYER_NEUTRAL;

            if (shotHit && hitTarget) {
                const targetId = hitTarget.id || '??';
                const damage = RANGED_ATTACK_DAMAGE || 1;
                hitTarget.hp -= damage;
                logMsg += ` -> hits ${targetId} at (${hitTarget.row},${hitTarget.col}) for ${damage} damage! (HP: ${hitTarget.hp}/${hitTarget.maxHp})`;
                msgClass = LOG_CLASS_PLAYER_GOOD;

                if (hitTarget.hp > 0 && typeof applyKnockback === 'function') { // Check if knockback exists
                    const knockbackResult = applyKnockback(player, hitTarget, gameState);
                    if (knockbackResult.success) {
                        knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
                    } else if (knockbackResult.reason !== 'calc_error') {
                        knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
                    }
                } else if (hitTarget.hp > 0) {
                     Game.logMessage("handleShoot: applyKnockback function not found!", gameState, { level: 'WARN', target: 'CONSOLE' });
                }
            } else if (blocked) {
                logMsg += ` -> blocked by ${blockedBy}` + (hitCoord ? ` at (${hitCoord.row},${hitCoord.col})` : '') + ".";
            } else {
                logMsg += " -> missed.";
            }

            Game.logMessage(logMsg + knockbackMsg, gameState, { level: 'PLAYER', target: 'PLAYER', className: msgClass });
            return true; // Turn consumed

        } else {
            Game.logMessage("Cannot shoot: Out of ammo!", gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_BAD });
            return false; // Turn not consumed
        }
    },
};
