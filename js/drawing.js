console.log("drawing.js loaded");

// --- Drawing Functions ---
// Relies on global variables/objects: ctx, mapData, player, enemies, TILE_COLORS,
// CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, Game object etc.

/** Draws grid lines */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
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

    const fontSize = cellSize * 0.7; ctx.font = `${fontSize}px Arial`; // Still set font in case we add text later
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const safeZone = Game.getSafeZone();

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * cellSize; const cellY = row * cellSize;

            // 1. Draw base terrain color (Uses TILE_COLORS from map.js)
            const color = TILE_COLORS[tileType];
            ctx.fillStyle = color || '#FFFFFF'; // Default white if color undefined
            ctx.fillRect(cellX, cellY, cellSize, cellSize);

            // 2. --- REMOVED Emoji Logic ---
            // const emoji = TILE_EMOJIS[tileType]; // TILE_EMOJIS no longer exists
            // if (emoji) { ... }

            // 3. Draw Storm Overlay if outside safe zone
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                 ctx.fillStyle = 'rgba(98, 13, 114, 0.35)'; // Use the non-red color if preferred 'rgba(138, 43, 226, 0.30)'
                 ctx.fillRect(cellX, cellY, cellSize, cellSize);
                 // Keep optional line pattern if desired
                 ctx.strokeStyle = 'rgba(100, 0, 0, 0.35)'; // Match base color 'rgba(75, 0, 130, 0.35)'
                 ctx.lineWidth = 1; ctx.beginPath();
                 for (let i = -cellSize; i < cellSize * 2; i += 4) { ctx.moveTo(cellX + i, cellY); ctx.lineTo(cellX + i + cellSize, cellY + cellSize); }
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
    ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, width, height);
    let barColor = '#dc3545'; if (healthPercent > 0.6) { barColor = '#28a745'; } else if (healthPercent > 0.3) { barColor = '#ffc107'; }
    if (fillWidth > 0 && currentHp > 0) { ctx.fillStyle = barColor; ctx.fillRect(barX, barY, fillWidth, height); }
}

/** Draws the player WITH HP BAR and Outline */
function drawPlayer(ctx, cellSize) {
    if (typeof player === 'undefined' || player.row === null || player.col === null || typeof player.hp === 'undefined' || player.hp <= 0) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2; const radius = (cellSize / 2) * 0.8;
    ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke(); // Outline
    const barWidth = cellSize * 0.8; const barHeight = 5; const barBottomY = centerY + radius + barHeight + 3;
    drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, player.hp, player.maxHp || 10);
}

/** Draws all enemies WITH HP BARS */
function drawEnemies(ctx, cellSize) {
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const baseRadius = (cellSize / 2) * 0.7; const defaultColor = '#ff0000';
    const barWidth = cellSize * 0.8; const barHeight = 5; const barYOffset = 3;
    for (const enemy of enemies) {
        if (!enemy || enemy.row === null || enemy.col === null || typeof enemy.hp === 'undefined' || enemy.hp <= 0) continue;
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2; const radiusMultiplier = enemy.radiusMultiplier || 1.0; const radius = baseRadius * radiusMultiplier;
        ctx.fillStyle = enemy.color || defaultColor; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
        const barBottomY = centerY + radius + barHeight + barYOffset; const maxHp = enemy.maxHp || 5;
        drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, enemy.hp, maxHp);
    }
}

/** Draws UI - ONLY Game Over/Win Overlay now */
function drawUI(ctx) {
    if (typeof Game === 'undefined') { console.error("Game object not defined in drawUI!"); return; }
    if (Game.isGameOver()) {
        const canvasWidth = ctx.canvas.width; const canvasHeight = ctx.canvas.height;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, canvasHeight / 2 - 30, canvasWidth, 60);
        ctx.font = '30px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2); }
        else { ctx.fillStyle = 'lime'; ctx.fillText('YOU WIN!', canvasWidth / 2, canvasHeight / 2); }
    }
}