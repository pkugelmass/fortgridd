/**
 * General utility functions for the core game logic.
 * All logic here is now encapsulated in OOP classes or as global utilities.
 * No UI, rendering, or animation logic is included.
 * @file game/utils.js
 */

/**
 * Pauses execution for a given number of milliseconds.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} A Promise that resolves after the delay.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
window.sleep = sleep;

/**
 * Ensures grid coordinates are integers.
 * Accepts (x, y) or an object with x/y or row/col properties.
 * @param {object|number} xOrObj - Object with x/y or row/col, or x number.
 * @param {number} [y] - y value if xOrObj is a number.
 * @returns {{x: number, y: number}}
 */
function toGridCoords(xOrObj, y) {
    if (typeof xOrObj === "object" && xOrObj !== null) {
        return {
            x: Math.round(xOrObj.x !== undefined ? xOrObj.x : xOrObj.col),
            y: Math.round(xOrObj.y !== undefined ? xOrObj.y : xOrObj.row)
        };
    } else {
        return {
            x: Math.round(xOrObj),
            y: Math.round(y)
        };
    }
}
window.toGridCoords = toGridCoords;

// All other logic (tile occupancy, resource pickup, position update, start position) is now encapsulated in GameState, Unit, Player, Enemy, or Map classes.
// See those classes for methods such as:
// - GameState.isTileOccupied(x, y, ignoreUnit)
// - Unit.moveTo(x, y, gameState)
// - Unit.pickupResourceAt(x, y, gameState)
// - Map.findStartPosition(walkableTileType, occupiedCoords)
// Utility functions are attached to the global namespace for global-scope compatibility.