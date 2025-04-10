// AI Map Utility Helpers (Safe Zone Center, etc.)
console.log("ai_map_utils.js loaded");

/**
 * Calculates the approximate center of the current safe zone from gameState.
 * @param {GameState} gameState - The current game state object.
 * @returns {object|null} - Coordinates {row, col} of the center, or null if safeZone is not defined.
 */
function getSafeZoneCenter(gameState) {
    if (!gameState || !gameState.safeZone) {
        console.error("getSafeZoneCenter: gameState or gameState.safeZone is missing.");
        return null; // Return null or a default if safeZone isn't ready
    }
    const zone = gameState.safeZone; // Get safeZone from gameState
    return {
        row: Math.floor((zone.minRow + zone.maxRow) / 2),
        col: Math.floor((zone.minCol + zone.maxCol) / 2)
    };
}
