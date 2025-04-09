console.log("drawing.js loaded");

// --- Drawing Functions ---
// Relies on global variables/objects: ctx, mapData, player, enemies, TILE_COLORS,
// CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, Game object etc.

/** Draws grid lines */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
    ctx.strokeStyle = GRID_LINE_COLOR; ctx.lineWidth = GRID_LINE_WIDTH;
    const canvasWidth = gridWidth * cellSize; const canvasHeight = gridHeight * cellSize;
    for (let x = 0; x <= gridWidth; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= gridHeight; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasWidth, y * cellSize); ctx.stroke(); }
}

/** Draws map cell contents, including storm visual */
function drawMapCells(ctx, gridWidth, gridHeight, cellSize) {
    // Added safety checks for required globals
    if (!mapData || mapData.length === 0 || typeof Game === 'undefined' || typeof Game.getSafeZone !== 'function' || typeof TILE_COLORS === 'undefined') {
        console.warn("drawMapCells skipped: Critical data missing (mapData, Game, TILE_COLORS).");
        return;
    }

    const fontSize = cellSize * MAP_CELL_FONT_SIZE_RATIO; ctx.font = `${fontSize}px ${DEFAULT_FONT_FAMILY}`; // Still set font in case we add text later
    ctx.textAlign = DEFAULT_TEXT_ALIGN; ctx.textBaseline = DEFAULT_TEXT_BASELINE;
    const safeZone = Game.getSafeZone();

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * cellSize; const cellY = row * cellSize;

            // 1. Draw base terrain color (Uses TILE_COLORS from config.js)
            const color = TILE_COLORS[tileType];
            ctx.fillStyle = color || DEFAULT_TILE_COLOR; // Default white if color undefined
            ctx.fillRect(cellX, cellY, cellSize, cellSize);

            // 2. --- REMOVED Emoji Logic ---
            // const emoji = TILE_EMOJIS[tileType]; // TILE_EMOJIS no longer exists
            // if (emoji) { ... }

            // 3. Draw Storm Overlay if outside safe zone
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                 ctx.fillStyle = STORM_FILL_COLOR;
                 ctx.fillRect(cellX, cellY, cellSize, cellSize);
                 // Keep optional line pattern if desired
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
    const barX = centerX - width / 2; const barY = bottomY - height;
    const currentMaxHp = maxHp || 1; const healthPercent = Math.max(0, Math.min(1, currentHp / currentMaxHp));
    const fillWidth = width * healthPercent;
    ctx.fillStyle = HEALTH_BAR_BG_COLOR; ctx.fillRect(barX, barY, width, height);
    let barColor = HEALTH_BAR_LOW_COLOR;
    if (healthPercent > HEALTH_BAR_MID_THRESHOLD) { barColor = HEALTH_BAR_HIGH_COLOR; }
    else if (healthPercent > HEALTH_BAR_LOW_THRESHOLD) { barColor = HEALTH_BAR_MID_COLOR; }
    if (fillWidth > 0 && currentHp > 0) { ctx.fillStyle = barColor; ctx.fillRect(barX, barY, fillWidth, height); }
}

/** Draws the player WITH HP BAR and Outline */
function drawPlayer(ctx, cellSize) {
    if (typeof player === 'undefined' || player.row === null || player.col === null || typeof player.hp === 'undefined' || player.hp <= 0) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2; const radius = (cellSize / 2) * PLAYER_RADIUS_RATIO;

    // Apply shadow
    ctx.shadowColor = UNIT_SHADOW_COLOR;
    ctx.shadowBlur = UNIT_SHADOW_BLUR;
    ctx.shadowOffsetX = UNIT_SHADOW_OFFSET_X;
    ctx.shadowOffsetY = UNIT_SHADOW_OFFSET_Y;

    // Draw player circle
    ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();

    // Reset shadow before drawing outline and health bar
    ctx.shadowColor = 'transparent'; // Or set all shadow props to 0/null
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw outline
    ctx.strokeStyle = PLAYER_OUTLINE_COLOR; ctx.lineWidth = PLAYER_OUTLINE_WIDTH; ctx.stroke();

    // Draw health bar
    const barWidth = cellSize * PLAYER_HEALTH_BAR_WIDTH_RATIO; const barHeight = HEALTH_BAR_HEIGHT; const barBottomY = centerY + radius + barHeight + PLAYER_HEALTH_BAR_OFFSET;
    drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, player.hp, player.maxHp || 10); // Keep default maxHp fallback for now
}

/** Draws all enemies WITH HP BARS */
function drawEnemies(ctx, cellSize) {
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const baseRadius = (cellSize / 2) * ENEMY_BASE_RADIUS_RATIO;
    const barWidth = cellSize * ENEMY_HEALTH_BAR_WIDTH_RATIO; const barHeight = HEALTH_BAR_HEIGHT; const barYOffset = ENEMY_HEALTH_BAR_OFFSET;
    for (const enemy of enemies) {
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
        const barBottomY = centerY + radius + barHeight + barYOffset; const maxHp = enemy.maxHp || 5; // Keep default maxHp fallback for now
        drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, enemy.hp, maxHp);

        // Draw Centered Enemy ID Label with Outline
        if (typeof enemy.id !== 'undefined') {
            const fontSize = radius * ENEMY_ID_FONT_SIZE_RATIO_OF_RADIUS;
            // Ensure minimum font size for readability if radius is very small
            const finalFontSize = Math.max(fontSize, MIN_CELL_SIZE * 0.5); // Example minimum based on cell size
            ctx.font = `${ENEMY_ID_FONT_WEIGHT} ${finalFontSize}px ${DEFAULT_FONT_FAMILY}`;
            ctx.font = `${ENEMY_ID_FONT_WEIGHT} ${finalFontSize}px ${DEFAULT_FONT_FAMILY}`;
            ctx.textAlign = 'center'; // Ensure centered alignment
            ctx.textBaseline = 'middle'; // Ensure vertical centering

            // Extract number from ID (assuming format "prefix_number")
            const idParts = String(enemy.id).split('_'); // Corrected separator to underscore
            const idNumber = idParts.length > 1 ? idParts[idParts.length - 1] : enemy.id; // Use last part or full ID if no underscore

            // Draw outline for the text
            ctx.strokeStyle = ENEMY_ID_TEXT_OUTLINE_COLOR;
            ctx.lineWidth = ENEMY_ID_TEXT_OUTLINE_WIDTH;
            ctx.strokeText(idNumber, centerX, centerY);

            // Draw the main text fill
            ctx.fillStyle = ENEMY_ID_FONT_COLOR;
            ctx.fillText(idNumber, centerX, centerY);
        }
    }
}

/** Draws UI - ONLY Game Over/Win Overlay now */
function drawUI(ctx) {
    if (typeof Game === 'undefined') { console.error("Game object not defined in drawUI!"); return; }
    if (Game.isGameOver()) {
        const canvasWidth = ctx.canvas.width; const canvasHeight = ctx.canvas.height;
        const overlayY = canvasHeight / 2 - UI_OVERLAY_HEIGHT / 2;
        ctx.fillStyle = UI_OVERLAY_BG_COLOR; ctx.fillRect(0, overlayY, canvasWidth, UI_OVERLAY_HEIGHT);
        ctx.font = `${UI_OVERLAY_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`; ctx.fillStyle = UI_GAME_OVER_COLOR; ctx.textAlign = DEFAULT_TEXT_ALIGN; ctx.textBaseline = DEFAULT_TEXT_BASELINE;
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2); }
        else { ctx.fillStyle = UI_WIN_COLOR; ctx.fillText('YOU WIN!', canvasWidth / 2, canvasHeight / 2); }
    }
}
