// AI Map Utility Helpers (Safe Zone Center, etc.)
console.log("ai_map_utils.js loaded");

/**
 * Calculates the approximate center of the current safe zone.
 * @returns {object} - Coordinates {row, col} of the center.
 */
function getSafeZoneCenter() {
    const zone = Game.getSafeZone();
    return {
        row: Math.floor((zone.minRow + zone.maxRow) / 2),
        col: Math.floor((zone.minCol + zone.maxCol) / 2)
    };
}
