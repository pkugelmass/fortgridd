/**
 * Movement, pathfinding, and line-of-sight utilities for the core game logic.
 * All logic is now encapsulated in OOP classes or as global utilities.
 * No UI, rendering, or animation logic is included.
 * @file game/utils.movement.js
 */

/**
 * Traces a line between two points using Bresenham's line algorithm.
 * Returns an array of all integer coordinates along the line, including start and end.
 * @param {number} x0 - Starting x.
 * @param {number} y0 - Starting y.
 * @param {number} x1 - Ending x.
 * @param {number} y1 - Ending y.
 * @returns {Array<{x: number, y: number}>} Array of coordinates.
 */
function traceLine(x0, y0, x1, y1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const MAX_TRACE_STEPS = 200;
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let currentX = x0;
    let currentY = y0;
    let steps = 0;
    while (true) {
        points.push({ x: currentX, y: currentY });
        if (currentX === x1 && currentY === y1) break;
        steps++;
        if (steps > MAX_TRACE_STEPS) return points;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; currentX += sx; }
        if (e2 <= dx) { err += dx; currentY += sy; }
    }
    return points;
}
window.traceLine = traceLine;

// All other logic (knockback, valid moves, move safety, line of sight) is now encapsulated in Unit, Player, Enemy, or GameState classes.
// See those classes for methods such as:
// - Unit.getValidMoves(gameState)
// - Unit.isMoveSafe(targetX, targetY, gameState)
// - Unit.hasClearLineOfSight(targetUnit, maxRange, gameState)
// - Unit.applyKnockback(attacker, gameState)
// Utility functions are attached to the global namespace for global-scope compatibility.