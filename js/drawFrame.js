/**
 * drawFrame - Draws a single frame using the provided RenderState.
 * Mirrors the structure of redrawCanvas for compatibility.
 * @param {CanvasRenderingContext2D} ctx
 * @param {RenderState} renderState
 * @param {object} [options] - Optional, e.g. { activeUnitId }
 */
function drawFrame(ctx, renderState, options = {}) {
    if (!renderState) {
        console.error("drawFrame called without renderState!");
        return;
    }
    const cellSize = typeof currentCellSize !== "undefined" ? currentCellSize : 32;
    if (cellSize <= 0 || !isFinite(cellSize)) {
        console.error(`drawFrame called with invalid currentCellSize: ${cellSize}!`);
        return;
    }
    if (typeof canvas === 'undefined') {
        console.error("drawFrame ERROR: Global 'canvas' object not found!");
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (typeof drawMapCells === 'function') {
        drawMapCells(ctx, renderState.mapData, renderState.safeZone, GRID_WIDTH, GRID_HEIGHT, cellSize);
    }

    // Draw threat overlay if present in renderState
    if (renderState.threatMap && typeof drawThreatOverlay === 'function') {
        drawThreatOverlay(ctx, renderState.threatMap, cellSize);
    }

    if (typeof drawGrid === 'function') {
        drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, cellSize);
    }

    if (typeof drawEnemies === 'function') {
        drawEnemies(ctx, renderState.enemies, cellSize, options.activeUnitId);
    }

    if (typeof drawPlayer === 'function') {
        drawPlayer(ctx, renderState.player, cellSize, options.activeUnitId);
    }

    if (typeof drawUI === 'function') {
        drawUI(ctx, renderState);
    }
}
