// console.log("drawing.js loaded"); // Removed module loaded log
// Global toggle for threat overlay
window.showThreatOverlay = true;

let currentCellSize = 0; // Moved from main.js - Represents the calculated size for drawing

// --- Drawing Orchestration --- (Moved from main.js)
/**
 * Main drawing function - orchestrates drawing layers.
 * Assumes ctx is valid and currentCellSize is calculated and accessible.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {GameState} gameState - The current game state object.
 */
// --- Threat Overlay Drawing Helper ---
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
                // Set overlay style: semi-transparent red, more opaque for higher threat
                const baseAlpha = 0.25;
                const maxAlpha = 0.5;
                const alpha = Math.min(baseAlpha + 0.12 * (threat - 1), maxAlpha);
                ctx.strokeStyle = `rgba(220, 40, 40, ${alpha})`;
                ctx.lineWidth = 2;
                // Draw diagonal lines, denser for higher threat
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

// Accepts optional activeUnitId for skipping
function redrawCanvas(ctx, gameState, activeUnitId) {
    if (!gameState) {
        console.error("redrawCanvas called without gameState!");
        return;
    }
    const cellSize = currentCellSize;
    if (cellSize <= 0 || !isFinite(cellSize)) {
        console.error(`redrawCanvas called with invalid currentCellSize: ${cellSize}!`);
        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
            Game.logMessage(`redrawCanvas ERROR: Invalid currentCellSize: ${cellSize}`, gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        return;
    }
    if (typeof canvas === 'undefined') {
        console.error("redrawCanvas ERROR: Global 'canvas' object not found!");
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (typeof drawMapCells === 'function') {
        drawMapCells(ctx, gameState.mapData, gameState.safeZone, GRID_WIDTH, GRID_HEIGHT, cellSize);
    } else if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
        Game.logMessage("ERROR: drawMapCells not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }

    // --- Draw Threat Overlay (after base map, before units) ---
    if (window.showThreatOverlay && typeof Game !== 'undefined' && typeof Game.calculateThreatMap === 'function') {
        const threatMap = Game.calculateThreatMap(gameState);
        drawThreatOverlay(ctx, threatMap, cellSize);
    }

    if (typeof drawGrid === 'function') {
        drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, cellSize);
    } else if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
        Game.logMessage("ERROR: drawGrid not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
    if (typeof drawEnemies === 'function') {
        drawEnemies(ctx, gameState.enemies, cellSize, activeUnitId);
    } else if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
        Game.logMessage("ERROR: drawEnemies not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
    if (typeof drawPlayer === 'function') {
        drawPlayer(ctx, gameState.player, cellSize, activeUnitId);
    } else if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
        Game.logMessage("ERROR: drawPlayer not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
    if (typeof drawUI === 'function') {
        drawUI(ctx, gameState);
    } else if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
        Game.logMessage("ERROR: drawUI not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
}


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

            // Draw simple icon/pattern for special tiles
            // Medkit: white cross
            if (tileType === TILE_MEDKIT) {
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
            else if (tileType === TILE_AMMO) {
                ctx.save();
                ctx.fillStyle = '#234a7d';
                const cx = cellX + cellSize / 2, cy = cellY + cellSize / 2, r = cellSize * 0.18;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            }
            // Tree: green triangle
            else if (tileType === TILE_TREE) {
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
/**
 * Draws the player at either its grid or interpolated position.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player
 * @param {number} cellSize
 * @param {object|number} optsOrActiveUnitId - options object or activeUnitId for backward compatibility
 */
function drawPlayer(ctx, player, cellSize, optsOrActiveUnitId) {
    let opts = {};
    if (typeof optsOrActiveUnitId === "object" && optsOrActiveUnitId !== null) {
        opts = optsOrActiveUnitId;
    } else if (typeof optsOrActiveUnitId !== "undefined") {
        opts.activeUnitId = optsOrActiveUnitId;
    }
    // Use passed player object
    if (!player || player.row === null || player.col === null || typeof player.hp === 'undefined' || player.hp <= 0) return;
    if (opts.activeUnitId && player.id === opts.activeUnitId) return; // Skip drawing if this is the active unit

    const row = typeof opts.interpolatedRow === "number" ? opts.interpolatedRow : player.row;
    const col = typeof opts.interpolatedCol === "number" ? opts.interpolatedCol : player.col;
    if (typeof window !== "undefined" && window.DEBUG_DRAW_PLAYER) {
        console.log(`[drawPlayer] Drawing player id=${player.id} at row=${row}, col=${col}, opts=`, opts);
    }
    const centerX = col * cellSize + cellSize / 2;
    const centerY = row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * PLAYER_RADIUS_RATIO;

    // // Apply shadow
    // ctx.shadowColor = UNIT_SHADOW_COLOR;
    // ctx.shadowBlur = UNIT_SHADOW_BLUR;
    // ctx.shadowOffsetX = UNIT_SHADOW_OFFSET_X;
    // ctx.shadowOffsetY = UNIT_SHADOW_OFFSET_Y;

    // Draw player circle (using passed player object)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // // Reset shadow before drawing outline and health bar
    // ctx.shadowColor = 'transparent';
    // ctx.shadowBlur = 0;
    // ctx.shadowOffsetX = 0;
    // ctx.shadowOffsetY = 0;

    // Draw outline
    ctx.strokeStyle = PLAYER_OUTLINE_COLOR;
    ctx.lineWidth = PLAYER_OUTLINE_WIDTH;
    ctx.stroke();

    // Draw health bar (using passed player object)
    const barWidth = cellSize * PLAYER_HEALTH_BAR_WIDTH_RATIO;
    const barHeight = HEALTH_BAR_HEIGHT;
    const barBottomY = centerY + radius + barHeight + PLAYER_HEALTH_BAR_OFFSET;
    drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, player.hp, player.maxHp || 10);
}

/**
 * Draws all enemies WITH HP BARS based on enemies array from gameState.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Array<object>} enemies - The enemies array from gameState.
 * @param {number} cellSize - Current cell size.
 */
/**
 * Draws all enemies, optionally at interpolated positions.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<object>} enemies
 * @param {number} cellSize
 * @param {object|number} optsOrActiveUnitId - options object or activeUnitId for backward compatibility
 */
function drawEnemies(ctx, enemies, cellSize, optsOrActiveUnitId) {
    let opts = {};
    if (typeof optsOrActiveUnitId === "object" && optsOrActiveUnitId !== null) {
        opts = optsOrActiveUnitId;
    } else if (typeof optsOrActiveUnitId !== "undefined") {
        opts.activeUnitId = optsOrActiveUnitId;
    }
    // Use passed enemies array
    if (!enemies || enemies.length === 0) return;
    const baseRadius = (cellSize / 2) * ENEMY_BASE_RADIUS_RATIO;
    const barWidth = cellSize * ENEMY_HEALTH_BAR_WIDTH_RATIO;
    const barHeight = HEALTH_BAR_HEIGHT;
    const barYOffset = ENEMY_HEALTH_BAR_OFFSET;
    for (const enemy of enemies) { // Iterate over passed enemies array
        if (!enemy || enemy.row === null || enemy.col === null || typeof enemy.hp === 'undefined' || enemy.hp <= 0) continue;
        if (opts.activeUnitId && enemy.id === opts.activeUnitId) continue; // Skip drawing if this is the active unit

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

        // // Apply shadow
        // ctx.shadowColor = UNIT_SHADOW_COLOR;
        // ctx.shadowBlur = UNIT_SHADOW_BLUR;
        // ctx.shadowOffsetX = UNIT_SHADOW_OFFSET_X;
        // ctx.shadowOffsetY = UNIT_SHADOW_OFFSET_Y;

        // Draw enemy circle
        ctx.fillStyle = enemy.color || ENEMY_DEFAULT_COLOR;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // // Reset shadow before drawing health bar and ID
        // ctx.shadowColor = 'transparent';
        // ctx.shadowBlur = 0;
        // ctx.shadowOffsetX = 0;
        // ctx.shadowOffsetY = 0;

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
