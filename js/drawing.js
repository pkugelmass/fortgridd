// console.log("drawing.js loaded"); // Removed module loaded log

// --- Drawing Functions ---
// Refactored to accept gameState or specific state properties as parameters.

/** Draws grid lines */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
    // No changes needed, doesn't depend on gameState directly
    ctx.strokeStyle = GRID_LINE_COLOR; ctx.lineWidth = GRID_LINE_WIDTH;
    const canvasWidth = gridWidth * cellSize; const canvasHeight = gridHeight * cellSize;
    for (let x = 0; x <= gridWidth; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= gridHeight; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasWidth, y * cellSize); ctx.stroke(); }
}

/**
 * Draws map cell contents, including storm visual, based on gameState.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Array<Array<number>>} mapData - The map data from gameState.
 * @param {{ minRow: number, maxRow: number, minCol: number, maxCol: number }} safeZone - The safe zone from gameState.
 * @param {number} gridWidth - Grid width.
 * @param {number} gridHeight - Grid height.
 * @param {number} cellSize - Current cell size.
 */
function drawMapCells(ctx, mapData, safeZone, gridWidth, gridHeight, cellSize) {
    // Check required parameters
    if (!mapData || mapData.length === 0 || !safeZone || typeof TILE_COLORS === 'undefined') {
        // Cannot log here easily without gameState, keep console.warn for now or refactor to pass gameState
        console.warn("drawMapCells skipped: Critical data missing (mapData, safeZone, TILE_COLORS).");
        return;
    }

    const fontSize = cellSize * MAP_CELL_FONT_SIZE_RATIO; ctx.font = `${fontSize}px ${DEFAULT_FONT_FAMILY}`;
    ctx.textAlign = DEFAULT_TEXT_ALIGN; ctx.textBaseline = DEFAULT_TEXT_BASELINE;
    // safeZone is now passed as a parameter

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (!mapData[row]) continue; // Check if row exists
            const tileType = mapData[row][col];
            const cellX = col * cellSize; const cellY = row * cellSize;

            // 1. Draw base terrain color
            const color = TILE_COLORS[tileType];
            ctx.fillStyle = color || DEFAULT_TILE_COLOR;
            ctx.fillRect(cellX, cellY, cellSize, cellSize);

            // 2. --- REMOVED Emoji Logic ---

            // 3. Draw Storm Overlay if outside safe zone (using passed safeZone parameter)
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                 ctx.fillStyle = STORM_FILL_COLOR;
                 ctx.fillRect(cellX, cellY, cellSize, cellSize);
                 ctx.strokeStyle = STORM_STROKE_COLOR;
                 ctx.lineWidth = STORM_LINE_WIDTH; ctx.beginPath();
                 for (let i = -cellSize; i < cellSize * 2; i += STORM_LINE_SPACING) { ctx.moveTo(cellX + i, cellY); ctx.lineTo(cellX + i + cellSize, cellY + cellSize); }
                 ctx.save(); ctx.beginPath(); ctx.rect(cellX, cellY, cellSize, cellSize); ctx.clip(); ctx.stroke(); ctx.restore();
            }
        }
    }
}

/** Draws Health Bar Helper */
function drawHealthBar(ctx, centerX, bottomY, width, height, currentHp, maxHp) {
    // No changes needed, doesn't depend on gameState directly
    const barX = centerX - width / 2; const barY = bottomY - height;
    const currentMaxHp = maxHp || 1; const healthPercent = Math.max(0, Math.min(1, currentHp / currentMaxHp));
    const fillWidth = width * healthPercent;
    ctx.fillStyle = HEALTH_BAR_BG_COLOR; ctx.fillRect(barX, barY, width, height);
    let barColor = HEALTH_BAR_LOW_COLOR;
    if (healthPercent > HEALTH_BAR_MID_THRESHOLD) { barColor = HEALTH_BAR_HIGH_COLOR; }
    else if (healthPercent > HEALTH_BAR_LOW_THRESHOLD) { barColor = HEALTH_BAR_MID_COLOR; }
    if (fillWidth > 0 && currentHp > 0) { ctx.fillStyle = barColor; ctx.fillRect(barX, barY, fillWidth, height); }
}

/**
 * Draws the player WITH HP BAR and Outline based on player object from gameState.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {object} player - The player object from gameState.
 * @param {number} cellSize - Current cell size.
 */
function drawPlayer(ctx, player, cellSize) {
    // Use passed player object
    if (!player || player.row === null || player.col === null || typeof player.hp === 'undefined' || player.hp <= 0) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2; const radius = (cellSize / 2) * PLAYER_RADIUS_RATIO;

    // Apply shadow
    ctx.shadowColor = UNIT_SHADOW_COLOR;
    ctx.shadowBlur = UNIT_SHADOW_BLUR;
    ctx.shadowOffsetX = UNIT_SHADOW_OFFSET_X;
    ctx.shadowOffsetY = UNIT_SHADOW_OFFSET_Y;

    // Draw player circle (using passed player object)
    ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();

    // Reset shadow before drawing outline and health bar
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw outline
    ctx.strokeStyle = PLAYER_OUTLINE_COLOR; ctx.lineWidth = PLAYER_OUTLINE_WIDTH; ctx.stroke();

    // Draw health bar (using passed player object)
    const barWidth = cellSize * PLAYER_HEALTH_BAR_WIDTH_RATIO; const barHeight = HEALTH_BAR_HEIGHT; const barBottomY = centerY + radius + barHeight + PLAYER_HEALTH_BAR_OFFSET;
    drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, player.hp, player.maxHp || 10);
}

/**
 * Draws all enemies WITH HP BARS based on enemies array from gameState.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Array<object>} enemies - The enemies array from gameState.
 * @param {number} cellSize - Current cell size.
 */
function drawEnemies(ctx, enemies, cellSize) {
    // Use passed enemies array
    if (!enemies || enemies.length === 0) return;
    const baseRadius = (cellSize / 2) * ENEMY_BASE_RADIUS_RATIO;
    const barWidth = cellSize * ENEMY_HEALTH_BAR_WIDTH_RATIO; const barHeight = HEALTH_BAR_HEIGHT; const barYOffset = ENEMY_HEALTH_BAR_OFFSET;
    for (const enemy of enemies) { // Iterate over passed enemies array
        if (!enemy || enemy.row === null || enemy.col === null || typeof enemy.hp === 'undefined' || enemy.hp <= 0) continue;
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2; const radiusMultiplier = enemy.radiusMultiplier || 1.0; const radius = baseRadius * radiusMultiplier;

        // Apply shadow
        ctx.shadowColor = UNIT_SHADOW_COLOR;
        ctx.shadowBlur = UNIT_SHADOW_BLUR;
        ctx.shadowOffsetX = UNIT_SHADOW_OFFSET_X;
        ctx.shadowOffsetY = UNIT_SHADOW_OFFSET_Y;

        // Draw enemy circle
        ctx.fillStyle = enemy.color || ENEMY_DEFAULT_COLOR; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();

        // Reset shadow before drawing health bar and ID
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw health bar
        const barBottomY = centerY + radius + barHeight + barYOffset; const maxHp = enemy.maxHp || 5;
        drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, enemy.hp, maxHp);

        // Draw Centered Enemy ID Label with Outline
        if (typeof enemy.id !== 'undefined') {
            const fontSize = radius * ENEMY_ID_FONT_SIZE_RATIO_OF_RADIUS;
            const finalFontSize = Math.max(fontSize, MIN_CELL_SIZE * 0.5);
            ctx.font = `${ENEMY_ID_FONT_WEIGHT} ${finalFontSize}px ${DEFAULT_FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const idParts = String(enemy.id).split('_');
            const idNumber = idParts.length > 1 ? idParts[idParts.length - 1] : enemy.id;

            ctx.strokeStyle = ENEMY_ID_TEXT_OUTLINE_COLOR;
            ctx.lineWidth = ENEMY_ID_TEXT_OUTLINE_WIDTH;
            ctx.strokeText(idNumber, centerX, centerY);

            ctx.fillStyle = ENEMY_ID_FONT_COLOR;
            ctx.fillText(idNumber, centerX, centerY);
        }
    }
}

/**
 * Draws UI - ONLY Game Over/Win Overlay now, based on gameState.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {GameState} gameState - The current game state object.
 */
function drawUI(ctx, gameState) {
    // Use gameState.gameActive instead of Game.isGameOver()
    if (!gameState || gameState.gameActive) {
        return; // Don't draw overlay if game is active or gameState is missing
    }

    const canvasWidth = ctx.canvas.width; const canvasHeight = ctx.canvas.height;
    const overlayY = canvasHeight / 2 - UI_OVERLAY_HEIGHT / 2;
    ctx.fillStyle = UI_OVERLAY_BG_COLOR; ctx.fillRect(0, overlayY, canvasWidth, UI_OVERLAY_HEIGHT);
    ctx.font = `${UI_OVERLAY_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`; ctx.textAlign = DEFAULT_TEXT_ALIGN; ctx.textBaseline = DEFAULT_TEXT_BASELINE;

    // Determine win/loss based on gameState.player.hp
    if (gameState.player && gameState.player.hp <= 0) {
        ctx.fillStyle = UI_GAME_OVER_COLOR;
        ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2);
    } else {
        // Assume win if game is not active and player HP > 0
        ctx.fillStyle = UI_WIN_COLOR;
        ctx.fillText('YOU WIN!', canvasWidth / 2, canvasHeight / 2);
    }
}
