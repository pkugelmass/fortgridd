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

        // Draw projectiles from overlays (new animation system)
        // Each projectile can have its own color and style as set by the effect.
        if (
            renderState.overlays &&
            Array.isArray(renderState.overlays.projectiles) &&
            renderState.overlays.projectiles.length > 0
        ) {
            for (const proj of renderState.overlays.projectiles) {
                const cx = proj.col * cellSize + cellSize / 2;
                const cy = proj.row * cellSize + cellSize / 2;
                ctx.save();
                ctx.fillStyle = proj.color || "#ffb300"; // Color is set per projectile
                ctx.beginPath();
                ctx.arc(cx, cy, cellSize * 0.18, 0, 2 * Math.PI);
                ctx.shadowColor = proj.shadowColor || "#fff";
                ctx.shadowBlur = typeof proj.shadowBlur === "number" ? proj.shadowBlur : 8;
                ctx.fill();
                ctx.restore();
            }
        }
    
        // Draw threat overlay if present in renderState
    if (renderState.threatMap && typeof drawThreatOverlay === 'function') {
        drawThreatOverlay(ctx, renderState.threatMap, cellSize);
    }

    if (typeof drawGrid === 'function') {
        drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, cellSize);
    }

    if (typeof drawEnemies === 'function') {
        // Always pass the player id as activeUnitId to prevent double-drawing
        drawEnemies(ctx, renderState.enemies, cellSize, renderState.player && renderState.player.id);
    }
    
    if (typeof drawPlayer === 'function') {
        // Check for active movement effect for the player
        let playerMoveEffect = null;
        if (Array.isArray(renderState.effects)) {
            playerMoveEffect = renderState.effects.find(
                e => e.type === "movement" && e.data && e.data.unitId === renderState.player.id
            );
        }
        // Robust guard: Only draw the player at the interpolated position if animating, otherwise at the static position.
        if (playerMoveEffect && playerMoveEffect.data) {
            // Only draw at the interpolated position, never at the static position
            drawPlayer(ctx, renderState.player, cellSize, {
                interpolatedRow: renderState.player.row,
                interpolatedCol: renderState.player.col
            });
        } else {
            // Only draw at the static position if not animating
            drawPlayer(ctx, renderState.player, cellSize, options.activeUnitId);
        }
    }

    if (typeof drawUI === 'function') {
        drawUI(ctx, renderState);
    }
}
