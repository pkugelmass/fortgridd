console.log("drawing.js loaded");

// --- Drawing Functions ---
// Now accept cellSize as a parameter

/** Draws grid lines */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) { // Added params
    // console.log("DRAW: drawGrid START");
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    const canvasWidth = gridWidth * cellSize; // Calculate based on passed size
    const canvasHeight = gridHeight * cellSize;
    for (let x = 0; x <= gridWidth; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= gridHeight; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasWidth, y * cellSize); ctx.stroke(); }
    // console.log("DRAW: drawGrid END");
}

/** Draws map cell contents */
function drawMapCells(ctx, gridWidth, gridHeight, cellSize) { // Added params
    // console.log("DRAW: drawMapCells START");
    if (!mapData || mapData.length === 0) { return; }
    if (typeof Game === 'undefined' || typeof Game.getSafeZone !== 'function') { return; }

    const fontSize = cellSize * 0.7; ctx.font = `${fontSize}px Arial`; // Use dynamic size
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const safeZone = Game.getSafeZone();

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * cellSize; const cellY = row * cellSize; // Use dynamic size

            // 1. Draw base terrain color
            const color = TILE_COLORS[tileType];
            ctx.fillStyle = color || '#FFFFFF';
            ctx.fillRect(cellX, cellY, cellSize, cellSize); // Use dynamic size

            // 2. Draw emoji if applicable
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + cellSize / 2; const centerY = cellY + cellSize / 2; ctx.fillText(emoji, centerX, centerY); }

            // 3. Draw Storm Overlay
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                 ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                 ctx.fillRect(cellX, cellY, cellSize, cellSize); // Use dynamic size
            }
        }
    }
    // console.log("DRAW: drawMapCells END");
}

/** Draws the player */
function drawPlayer(ctx, cellSize) { // Already accepts cellSize
    // console.log("DRAW: drawPlayer START");
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8; ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    // console.log("DRAW: drawPlayer END");
}

/** Draws all enemies */
function drawEnemies(ctx, cellSize) { // Already accepts cellSize
    // console.log("DRAW: drawEnemies START");
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const radius = (cellSize / 2) * 0.7; const defaultColor = '#ff0000';
    for (const enemy of enemies) {
        if (enemy.row === null || enemy.col === null) continue;
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2;
        ctx.fillStyle = enemy.color || defaultColor;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    }
    // console.log("DRAW: drawEnemies END");
}

/** Draws UI */
function drawUI(ctx) { // Doesn't directly depend on cell size
    // console.log("DRAW: drawUI START");
    if (typeof Game === 'undefined') { console.error("Game object not defined in drawUI!"); return; }
    /* ... same UI drawing logic as before ... */
    ctx.fillStyle = 'white'; ctx.font = '16px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4; let yOffset = 10;
    if (typeof player !== 'undefined' && player.resources) { ctx.fillText(`Scrap: ${player.resources.scrap}`, 10, yOffset); } else { ctx.fillText("Scrap: N/A", 10, yOffset); } yOffset += 20;
    if (typeof player !== 'undefined') { ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 10, yOffset); } else { ctx.fillText("HP: N/A", 10, yOffset); } yOffset += 20;
    ctx.fillText(`Turn: ${Game.getCurrentTurn()}`, 10, yOffset);
    if (Game.isGameOver()) { /* ... draw win/loss overlay ... */ } ctx.shadowBlur = 0;
    // console.log("DRAW: drawUI END");
}