/**
 * Calculates the approximate center of the current safe zone from gameState.
 * @param {GameState} gameState - The current game state object.
 * @returns {{row: number, col: number}|null} - Coordinates {row, col} of the center, or null if safeZone is not defined.
 */
function getSafeZoneCenter(gameState) {
    if (!gameState || !gameState.safeZone) {
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage("getSafeZoneCenter: gameState or gameState.safeZone is missing.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return null;
    }
    const zone = gameState.safeZone;
    return {
        row: Math.floor((zone.minRow + zone.maxRow) / 2),
        col: Math.floor((zone.minCol + zone.maxCol) / 2)
    };
}

// Attach to global scope
window.getSafeZoneCenter = getSafeZoneCenter;