/**
 * Draws a single frame using the provided renderState.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} renderState - Output of createRenderState (OOP-based).
 * @param {Object} [options] - Optional, e.g. { activeUnitId }
 */
function drawFrame(ctx, renderState, options = {}) {
    if (!renderState) {
        console.error("drawFrame called without renderState!");
        return;
    }
    const cellSize = typeof window.currentCellSize !== "undefined" ? window.currentCellSize : 32;
    if (cellSize <= 0 || !isFinite(cellSize)) {
        console.error(`drawFrame called with invalid cellSize: ${cellSize}!`);
        return;
    }
    if (typeof window.canvas === 'undefined') {
        console.error("drawFrame ERROR: Global 'canvas' object not found!");
        return;
    }
    ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);

    drawMapCells(ctx, renderState.mapData, renderState.safeZone, window.GRID_WIDTH, window.GRID_HEIGHT, cellSize);

    // Draw projectiles from overlays (animation system)
    if (
        renderState.overlays &&
        Array.isArray(renderState.overlays.projectiles) &&
        renderState.overlays.projectiles.length > 0
    ) {
        for (const proj of renderState.overlays.projectiles) {
            const cx = proj.col * cellSize + cellSize / 2;
            const cy = proj.row * cellSize + cellSize / 2;
            ctx.save();
            ctx.fillStyle = proj.color || "#ffb300";
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.18, 0, 2 * Math.PI);
            ctx.shadowColor = proj.shadowColor || "#fff";
            ctx.shadowBlur = typeof proj.shadowBlur === "number" ? proj.shadowBlur : 8;
            ctx.fill();
            ctx.restore();
        }
    }

    // Draw threat overlay if present
    if (renderState.threatMap) {
        drawThreatOverlay(ctx, renderState.threatMap, cellSize);
    }

    drawGrid(ctx, window.GRID_WIDTH, window.GRID_HEIGHT, cellSize);

    drawEnemies(ctx, renderState.enemies, cellSize, renderState.player && renderState.player.id);

    // Draw player, interpolated if animating
    let playerMoveEffect = null;
    if (Array.isArray(renderState.effects)) {
        playerMoveEffect = renderState.effects.find(
            e => e.type === "movement" && e.data && e.data.unitId === renderState.player.id
        );
    }
    if (playerMoveEffect && playerMoveEffect.data) {
        drawPlayer(ctx, renderState.player, cellSize, {
            interpolatedRow: renderState.player.row,
            interpolatedCol: renderState.player.col
        });
    } else {
        drawPlayer(ctx, renderState.player, cellSize, options.activeUnitId);
    }

    drawUI(ctx, renderState);
}

/**
 * Draws the map cells, including storm overlay and special tiles.
 */
function drawMapCells(ctx, mapData, safeZone, gridWidth, gridHeight, cellSize) {
    if (!mapData || mapData.length === 0 || !safeZone || typeof window.TILE_COLORS === 'undefined') {
        console.warn("drawMapCells skipped: Critical data missing (mapData, safeZone, TILE_COLORS).");
        return;
    }
    const fontSize = cellSize * (window.MAP_CELL_FONT_SIZE_RATIO || 0.38);
    ctx.font = `${fontSize}px ${window.DEFAULT_FONT_FAMILY || "Arial"}`;
    ctx.textAlign = window.DEFAULT_TEXT_ALIGN || "center";
    ctx.textBaseline = window.DEFAULT_TEXT_BASELINE || "middle";

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * cellSize, cellY = row * cellSize;

            // Base terrain color
            const color = window.TILE_COLORS[tileType];
            ctx.fillStyle = color || window.DEFAULT_TILE_COLOR || "#ccc";
            ctx.fillRect(cellX, cellY, cellSize, cellSize);

            // Medkit: white cross
            if (tileType === window.TILE_MEDKIT) {
                ctx.save();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = Math.max(2, cellSize * 0.18);
                const cx = cellX + cellSize / 2, cy = cellY + cellSize / 2, len = cellSize * 0.25;
                ctx.beginPath();
                ctx.moveTo(cx - len, cy);
                ctx.lineTo(cx + len, cy);
                ctx.moveTo(cx, cy - len);
                ctx.lineTo(cx, cy + len);
                ctx.stroke();
                ctx.restore();
            }
            // Ammo: dark blue dot
            else if (tileType === window.TILE_AMMO) {
                ctx.save();
                ctx.fillStyle = '#234a7d';
                const cx = cellX + cellSize / 2, cy = cellY + cellSize / 2, r = cellSize * 0.18;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            }
            // Tree: green triangle
            else if (tileType === window.TILE_TREE) {
                ctx.save();
                ctx.fillStyle = '#357a38';
                const cx = cellX + cellSize / 2, cy = cellY + cellSize / 2, h = cellSize * 0.38;
                ctx.beginPath();
                ctx.moveTo(cx, cy - h);
                ctx.lineTo(cx - h * 0.9, cy + h * 0.8);
                ctx.lineTo(cx + h * 0.9, cy + h * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Storm overlay if outside safe zone
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                ctx.fillStyle = window.STORM_FILL_COLOR || "rgba(80,80,180,0.18)";
                ctx.fillRect(cellX, cellY, cellSize, cellSize);
                ctx.strokeStyle = window.STORM_STROKE_COLOR || "#4a90e2";
                ctx.lineWidth = window.STORM_LINE_WIDTH || 2;
                ctx.beginPath();
                for (let i = -cellSize; i < cellSize * 2; i += (window.STORM_LINE_SPACING || 8)) {
                    ctx.moveTo(cellX + i, cellY);
                    ctx.lineTo(cellX + i + cellSize, cellY + cellSize);
                }
                ctx.save();
                ctx.beginPath();
                ctx.rect(cellX, cellY, cellSize, cellSize);
                ctx.clip();
                ctx.stroke();
                ctx.restore();
            }
        }
    }
}

/**
 * Draws the threat overlay.
 */
function drawThreatOverlay(ctx, threatMap, cellSize) {
    if (!threatMap) return;
    for (let row = 0; row < threatMap.length; row++) {
        for (let col = 0; col < threatMap[row].length; col++) {
            const threat = threatMap[row][col];
            if (threat > 0) {
                const cellX = col * cellSize;
                const cellY = row * cellSize;
                ctx.save();
                ctx.beginPath();
                ctx.rect(cellX, cellY, cellSize, cellSize);
                ctx.clip();
                const baseAlpha = 0.25;
                const maxAlpha = 0.5;
                const alpha = Math.min(baseAlpha + 0.12 * (threat - 1), maxAlpha);
                ctx.strokeStyle = `rgba(220, 40, 40, ${alpha})`;
                ctx.lineWidth = 2;
                const spacing = Math.max(6, 16 - 2 * threat);
                for (let i = -cellSize; i < cellSize * 2; i += spacing) {
                    ctx.beginPath();
                    ctx.moveTo(cellX + i, cellY);
                    ctx.lineTo(cellX + i + cellSize, cellY + cellSize);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
    }
}

/**
 * Draws grid lines.
 */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
    ctx.strokeStyle = window.GRID_LINE_COLOR || "#888";
    ctx.lineWidth = window.GRID_LINE_WIDTH || 1;
    const canvasWidth = gridWidth * cellSize;
    const canvasHeight = gridHeight * cellSize;
    for (let x = 0; x <= gridWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, canvasHeight);
        ctx.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(canvasWidth, y * cellSize);
        ctx.stroke();
    }
}

/**
 * Draws the player at either its grid or interpolated position.
 */
function drawPlayer(ctx, player, cellSize, optsOrActiveUnitId) {
    let opts = {};
    if (typeof optsOrActiveUnitId === "object" && optsOrActiveUnitId !== null) {
        opts = optsOrActiveUnitId;
    } else if (typeof optsOrActiveUnitId !== "undefined") {
        opts.activeUnitId = optsOrActiveUnitId;
    }
    if (!player || player.row == null || player.col == null || typeof player.hp === 'undefined' || player.hp <= 0) return;
    if (opts.activeUnitId && player.id === opts.activeUnitId) return;

    const row = typeof opts.interpolatedRow === "number" ? opts.interpolatedRow : player.row;
    const col = typeof opts.interpolatedCol === "number" ? opts.interpolatedCol : player.col;
    const centerX = col * cellSize + cellSize / 2;
    const centerY = row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * (window.PLAYER_RADIUS_RATIO || 0.7);

    ctx.fillStyle = player.color || "#2196f3";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = window.PLAYER_OUTLINE_COLOR || "#fff";
    ctx.lineWidth = window.PLAYER_OUTLINE_WIDTH || 2;
    ctx.stroke();

    // Health bar
    const barWidth = cellSize * (window.PLAYER_HEALTH_BAR_WIDTH_RATIO || 0.7);
    const barHeight = window.HEALTH_BAR_HEIGHT || 6;
    const barBottomY = centerY + radius + barHeight + (window.PLAYER_HEALTH_BAR_OFFSET || 2);
    drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, player.hp, player.maxHp || 10);
}

/**
 * Draws all enemies, optionally at interpolated positions.
 */
function drawEnemies(ctx, enemies, cellSize, optsOrActiveUnitId) {
    let opts = {};
    if (typeof optsOrActiveUnitId === "object" && optsOrActiveUnitId !== null) {
        opts = optsOrActiveUnitId;
    } else if (typeof optsOrActiveUnitId !== "undefined") {
        opts.activeUnitId = optsOrActiveUnitId;
    }
    if (!enemies || enemies.length === 0) return;
    const baseRadius = (cellSize / 2) * (window.ENEMY_BASE_RADIUS_RATIO || 0.6);
    const barWidth = cellSize * (window.ENEMY_HEALTH_BAR_WIDTH_RATIO || 0.6);
    const barHeight = window.HEALTH_BAR_HEIGHT || 6;
    const barYOffset = window.ENEMY_HEALTH_BAR_OFFSET || 2;
    for (const enemy of enemies) {
        if (!enemy || enemy.row == null || enemy.col == null || typeof enemy.hp === 'undefined' || enemy.hp <= 0) continue;
        if (opts.activeUnitId && enemy.id === opts.activeUnitId) continue;

        const row = (opts.interpolatedEnemies && opts.interpolatedEnemies[enemy.id]?.row !== undefined)
            ? opts.interpolatedEnemies[enemy.id].row
            : enemy.row;
        const col = (opts.interpolatedEnemies && opts.interpolatedEnemies[enemy.id]?.col !== undefined)
            ? opts.interpolatedEnemies[enemy.id].col
            : enemy.col;

        const centerX = col * cellSize + cellSize / 2;
        const centerY = row * cellSize + cellSize / 2;
        const radiusMultiplier = enemy.radiusMultiplier || 1.0;
        const radius = baseRadius * radiusMultiplier;

        ctx.fillStyle = enemy.color || window.ENEMY_DEFAULT_COLOR || "#e53935";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barBottomY = centerY + radius + barHeight + barYOffset;
        const maxHp = enemy.maxHp || 5;
        drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, enemy.hp, maxHp);

        // Enemy ID label
        if (typeof enemy.id !== 'undefined') {
            const fontSize = radius * (window.ENEMY_ID_FONT_SIZE_RATIO_OF_RADIUS || 0.7);
            const finalFontSize = Math.max(fontSize, (window.MIN_CELL_SIZE || 16) * 0.5);
            ctx.font = `${window.ENEMY_ID_FONT_WEIGHT || "bold"} ${finalFontSize}px ${window.DEFAULT_FONT_FAMILY || "Arial"}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const idParts = String(enemy.id).split('_');
            const idNumber = idParts.length > 1 ? idParts[idParts.length - 1] : enemy.id;

            ctx.strokeStyle = window.ENEMY_ID_TEXT_OUTLINE_COLOR || "#000";
            ctx.lineWidth = window.ENEMY_ID_TEXT_OUTLINE_WIDTH || 2;
            ctx.strokeText(idNumber, centerX, centerY);

            ctx.fillStyle = window.ENEMY_ID_FONT_COLOR || "#fff";
            ctx.fillText(idNumber, centerX, centerY);
        }
    }
}

/**
 * Draws a health bar.
 */
function drawHealthBar(ctx, centerX, bottomY, width, height, currentHp, maxHp) {
    const barX = centerX - width / 2;
    const barY = bottomY - height;
    const currentMaxHp = maxHp || 1;
    const healthPercent = Math.max(0, Math.min(1, currentHp / currentMaxHp));
    const fillWidth = width * healthPercent;
    ctx.fillStyle = window.HEALTH_BAR_BG_COLOR || "#222";
    ctx.fillRect(barX, barY, width, height);
    let barColor = window.HEALTH_BAR_LOW_COLOR || "#e53935";
    if (healthPercent > (window.HEALTH_BAR_MID_THRESHOLD || 0.5)) {
        barColor = window.HEALTH_BAR_HIGH_COLOR || "#43a047";
    } else if (healthPercent > (window.HEALTH_BAR_LOW_THRESHOLD || 0.2)) {
        barColor = window.HEALTH_BAR_MID_COLOR || "#fbc02d";
    }
    if (fillWidth > 0 && currentHp > 0) {
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, fillWidth, height);
    }
}

/**
 * Draws UI overlays (Game Over/Win).
 */
function drawUI(ctx, renderState) {
    if (!renderState || renderState.gameActive) {
        return;
    }
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const overlayY = canvasHeight / 2 - (window.UI_OVERLAY_HEIGHT || 60) / 2;
    ctx.fillStyle = window.UI_OVERLAY_BG_COLOR || "rgba(0,0,0,0.7)";
    ctx.fillRect(0, overlayY, canvasWidth, window.UI_OVERLAY_HEIGHT || 60);
    ctx.font = `${window.UI_OVERLAY_FONT_SIZE || 36}px ${window.DEFAULT_FONT_FAMILY || "Arial"}`;
    ctx.textAlign = window.DEFAULT_TEXT_ALIGN || "center";
    ctx.textBaseline = window.DEFAULT_TEXT_BASELINE || "middle";

    if (renderState.player && renderState.player.hp <= 0) {
        ctx.fillStyle = window.UI_GAME_OVER_COLOR || "#e53935";
        ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2);
    } else {
        ctx.fillStyle = window.UI_WIN_COLOR || "#43a047";
        ctx.fillText('YOU WIN!', canvasWidth / 2, canvasHeight / 2);
    }
}

// Expose globally
window.drawFrame = drawFrame;