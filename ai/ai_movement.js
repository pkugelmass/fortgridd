/**
 * Finds valid adjacent cells for a unit to move into based on gameState.
 * @param {Unit} unit - The unit (player or enemy) with {row, col, id}.
 * @param {GameState} gameState - The current game state.
 * @returns {Array<object>} - An array of {row, col} objects for valid moves.
 */
function getValidMoves(unit, gameState) {
    const possibleMoves = [];
    if (!unit || !gameState || !gameState.mapData || !gameState.safeZone || !gameState.player || !gameState.enemies) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("getValidMoves: Missing unit or required gameState properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return possibleMoves;
    }

    const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    const { mapData, safeZone, player, enemies } = gameState;

    const { row: unitRow, col: unitCol } = window.toGridCoords(unit);

    for (const dir of directions) {
        const { row: targetRow, col: targetCol } = window.toGridCoords(unitRow + dir.dr, unitCol + dir.dc);

        if (
            targetRow >= 0 && targetRow < window.GRID_HEIGHT &&
            targetCol >= 0 && targetCol < window.GRID_WIDTH
        ) {
            if (
                targetRow >= safeZone.minRow && targetRow <= safeZone.maxRow &&
                targetCol >= safeZone.minCol && targetCol <= safeZone.maxCol
            ) {
                if (mapData[targetRow]) {
                    const tileType = mapData[targetRow][targetCol];
                    if (
                        tileType === window.TILE_LAND ||
                        tileType === window.TILE_MEDKIT ||
                        tileType === window.TILE_AMMO
                    ) {
                        if (typeof window.isTileOccupied !== "function" || !window.isTileOccupied(targetRow, targetCol, gameState, unit)) {
                            possibleMoves.push({ row: targetRow, col: targetCol });
                        }
                    }
                } else {
                    if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                        Game.logMessage(`getValidMoves: mapData error at row ${targetRow}`, gameState, { level: 'ERROR', target: 'CONSOLE' });
                    }
                }
            }
        }
    }
    return possibleMoves;
}

/**
 * Moves the enemy one step towards the target coordinates, using gameState.
 * @param {Enemy} enemy - The enemy instance to move.
 * @param {number} targetRow - The target row.
 * @param {number} targetCol - The target column.
 * @param {string} logReason - A short string describing why the enemy is moving.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - True if the enemy moved, false otherwise.
 */
async function moveTowards(enemy, targetRow, targetCol, logReason, gameState) {
    const { row: enemyRow, col: enemyCol } = window.toGridCoords(enemy);
    const { row: tgtRow, col: tgtCol } = window.toGridCoords(targetRow, targetCol);

    const possibleMoves = getValidMoves(enemy, gameState);
    if (possibleMoves.length === 0) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemy.id} cannot move towards ${logReason} (no valid moves).`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        return false;
    }

    const currentDistance = Math.abs(tgtRow - enemyRow) + Math.abs(tgtCol - enemyCol);
    let closerMoves = [];
    let sidewaysMoves = [];

    for (const move of possibleMoves) {
        const { row: moveRow, col: moveCol } = window.toGridCoords(move);
        const newDist = Math.abs(tgtRow - moveRow) + Math.abs(tgtCol - moveCol);
        if (newDist < currentDistance) {
            closerMoves.push({ move: move, distance: newDist });
        } else if (newDist === currentDistance) {
            sidewaysMoves.push(move);
        }
    }

    let chosenMove = null;

    if (closerMoves.length > 0) {
        closerMoves.sort((a, b) => a.distance - b.distance);
        chosenMove = closerMoves[0].move;
    } else if (sidewaysMoves.length > 0) {
        chosenMove = sidewaysMoves[Math.floor(Math.random() * sidewaysMoves.length)];
    }

    if (chosenMove) {
        const { row: chosenRow, col: chosenCol } = window.toGridCoords(chosenMove);
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemy.id} at (${enemyRow},${enemyCol}) moves towards ${logReason} to (${chosenRow},${chosenCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        if (typeof window.updateUnitPosition === 'function') {
            window.updateUnitPosition(enemy, chosenRow, chosenCol, gameState);
        }
        return true;
    }

    return false;
}

/**
 * Moves the enemy to a random valid adjacent cell.
 * @param {Enemy} enemy - The enemy instance to move.
 * @param {GameState} gameState - The current game state.
 * @returns {Promise<boolean>} - True if the enemy moved, false otherwise.
 */
async function moveRandomly(enemy, gameState) {
    const { row: enemyRow, col: enemyCol } = window.toGridCoords(enemy);
    const possibleMoves = getValidMoves(enemy, gameState);
    if (possibleMoves.length > 0) {
        const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        const { row: chosenRow, col: chosenCol } = window.toGridCoords(chosenMove);
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`Enemy ${enemy.id} at (${enemyRow},${enemyCol}) moves randomly to (${chosenRow},${chosenCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: window.LOG_CLASS_ENEMY_EVENT });
        }
        if (typeof window.updateUnitPosition === 'function') {
            window.updateUnitPosition(enemy, chosenRow, chosenCol, gameState);
        }
        return true;
    }
    return false;
}

/**
 * Checks if a move is safe (not adjacent to visible threats).
 * @param {Enemy} enemy - The enemy instance.
 * @param {number} targetRow - The target row.
 * @param {number} targetCol - The target column.
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} - True if the move is safe, false otherwise.
 */
function isMoveSafe(enemy, targetRow, targetCol, gameState) {
    if (!enemy || !gameState || !gameState.player || !gameState.enemies) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("isMoveSafe: Missing enemy or required gameState properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return false;
    }
    if (typeof window.isTileOccupied === "function" && window.isTileOccupied(targetRow, targetCol, gameState, enemy)) {
        return false;
    }
    const primaryTarget = enemy.targetEnemy;
    const { player, enemies } = gameState;

    const { row: safeRow, col: safeCol } = window.toGridCoords(targetRow, targetCol);

    const potentialThreats = [];
    if (player.hp > 0) {
        potentialThreats.push(player);
    }
    potentialThreats.push(...enemies);

    for (const threat of potentialThreats) {
        if (!threat || threat.hp <= 0 || threat === enemy || (primaryTarget && threat === primaryTarget)) {
            continue;
        }
        const { row: threatRow, col: threatCol } = window.toGridCoords(threat);

        if (typeof window.hasClearLineOfSight === 'function' && window.hasClearLineOfSight(enemy, threat, enemy.detectionRange || window.AI_RANGE_MAX, gameState)) {
            const adjacent = Math.abs(safeRow - threatRow) <= 1 && Math.abs(safeCol - threatCol) <= 1;
            if (adjacent) {
                if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                    Game.logMessage(`[isMoveSafe] Move to (${safeRow},${safeCol}) unsafe due to adjacent visible threat: ${threat.id || 'Player'} at (${threatRow},${threatCol})`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
                }
                return false;
            }
        }
    }

    return true;
}

// Attach helpers to global scope
window.getValidMoves = getValidMoves;
window.moveTowards = moveTowards;
window.moveRandomly = moveRandomly;
window.isMoveSafe = isMoveSafe;