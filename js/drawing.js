console.log("drawing.js loaded");

// --- Drawing Functions ---

/** Draws grid lines */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    const canvasWidth = gridWidth * cellSize; const canvasHeight = gridHeight * cellSize;
    for (let x = 0; x <= gridWidth; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= gridHeight; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasWidth, y * cellSize); ctx.stroke(); }
}

/** Draws map cell contents, including storm visual */
function drawMapCells(ctx, gridWidth, gridHeight, cellSize) {
    if (!mapData || mapData.length === 0 || typeof Game === 'undefined' || typeof Game.getSafeZone !== 'function') { return; }
    const fontSize = cellSize * 0.7; ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const safeZone = Game.getSafeZone();
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * cellSize; const cellY = row * cellSize;
            const color = TILE_COLORS[tileType]; ctx.fillStyle = color || '#FFFFFF';
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + cellSize / 2; const centerY = cellY + cellSize / 2; ctx.fillText(emoji, centerX, centerY); }
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                 ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; ctx.fillRect(cellX, cellY, cellSize, cellSize);
            }
        }
    }
}

// --- NEW: Health Bar Helper Function ---
/**
 * Draws a health bar at a specified location, anchored by its bottom-center.
 * @param {CanvasRenderingContext2D} ctx - The drawing context.
 * @param {number} centerX - Center X coordinate to position the bar relative to.
 * @param {number} bottomY - The Y coordinate for the BOTTOM of the bar.
 * @param {number} width - The total width of the health bar.
 * @param {number} height - The height of the health bar.
 * @param {number} currentHp - Current HP of the unit.
 * @param {number} maxHp - Maximum HP of the unit.
 */
function drawHealthBar(ctx, centerX, bottomY, width, height, currentHp, maxHp) {
    // Calculate position (centered horizontally, positioned vertically by bottomY)
    const barX = centerX - width / 2;
    const barY = bottomY - height; // Calculate top Y based on desired bottom Y

    // Calculate health percentage (clamped 0-1)
    const currentMaxHp = maxHp || 1; // Avoid division by zero if maxHp is missing or 0
    const healthPercent = Math.max(0, Math.min(1, currentHp / currentMaxHp));
    const fillWidth = width * healthPercent;

    // Draw background bar (e.g., dark grey)
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, width, height);

    // Determine fill color based on health percentage
    let barColor = '#dc3545'; // Red (low HP) default
    if (healthPercent > 0.6) { barColor = '#28a745'; } // Green (high HP)
    else if (healthPercent > 0.3) { barColor = '#ffc107'; } // Yellow (medium HP)

    // Draw foreground health bar only if HP > 0
    if (fillWidth > 0 && currentHp > 0) { // Also ensure currentHp > 0 before drawing fill
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, fillWidth, height);
    }
    // Optional: Draw border
    // ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, width, height);
}


/** Draws the player WITH HP BAR (using helper) */
function drawPlayer(ctx, cellSize) {
    if (typeof player === 'undefined' || player.row === null || player.col === null || typeof player.hp === 'undefined' || player.hp <= 0) return; // Skip if invalid or dead

    const centerX = player.col * cellSize + cellSize / 2;
    const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8;

    // --- Draw Player Circle ---
    ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();

    // --- Draw Player HP Bar --- (Using helper)
    const barWidth = cellSize * 0.8;
    const barHeight = 5;
    const barBottomY = centerY + radius + barHeight + 3; // Position bottom of bar relative to circle center Y + radius + desired gap

    // Call helper function
    // Ensure player.maxHp exists or provide a default
    drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, player.hp, player.maxHp || 10);
}


/** Draws all enemies WITH HP BARS (using helper) */
function drawEnemies(ctx, cellSize) {
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const baseRadius = (cellSize / 2) * 0.7;
    const defaultColor = '#ff0000';
    const barWidth = cellSize * 0.8; // Use same width as player bar
    const barHeight = 5;        // Use same height
    const barYOffset = 3;       // Use same offset from bottom of circle visual

    for (const enemy of enemies) {
        // Skip drawing dead or invalid enemies
        if (!enemy || enemy.row === null || enemy.col === null || typeof enemy.hp === 'undefined' || enemy.hp <= 0) continue;

        const centerX = enemy.col * cellSize + cellSize / 2;
        const centerY = enemy.row * cellSize + cellSize / 2;
        const radiusMultiplier = enemy.radiusMultiplier || 1.0;
        const radius = baseRadius * radiusMultiplier; // Use final radius for positioning

        // --- Draw Enemy Circle ---
        ctx.fillStyle = enemy.color || defaultColor;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();

        // --- Draw Enemy HP Bar --- (Using helper)
        const barBottomY = centerY + radius + barHeight + barYOffset; // Position based on final radius
        const maxHp = enemy.maxHp || 5; // Use maxHp or fallback

        // Call helper function
        drawHealthBar(ctx, centerX, barBottomY, barWidth, barHeight, enemy.hp, maxHp);
    }
}


/** Draws UI */
function drawUI(ctx) {
    // console.log("DRAW: drawUI START"); // Removed log
    if (typeof Game === 'undefined') { console.error("Game object not defined in drawUI!"); return; }

    // <<< REMOVED text drawing for Medkits, Ammo, HP, Turn >>>

    // Display game over/win messages - Use Game object
    if (Game.isGameOver()) {
        // console.log("DRAW: Drawing win/loss overlay because Game.isGameOver() is true."); // Removed log
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60); // Ensure canvas ref is ok, maybe pass width/height? Or use global.
        ctx.font = '30px Arial'; ctx.fillStyle = 'red';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        // Check player state directly for message content
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2); }
        else { ctx.fillStyle = 'lime'; ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2); }
        // Note: Shadow was reset outside this block before, should be okay. If text looks bad, reset shadowBlur here too.
        // ctx.shadowBlur = 0;
    }
    // console.log("DRAW: drawUI END"); // Removed log
}