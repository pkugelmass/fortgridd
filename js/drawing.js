console.log("drawing.js loaded");

// --- Drawing Functions ---
// Relies on global variables/objects: ctx, mapData, player, enemies, TILE_COLORS, TILE_EMOJIS,
// CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, Game object etc.

/** Draws grid lines */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
    // console.log("DRAW: drawGrid START");
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    const canvasWidth = gridWidth * cellSize; // Calculate based on passed size
    const canvasHeight = gridHeight * cellSize;
    for (let x = 0; x <= gridWidth; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= gridHeight; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasWidth, y * cellSize); ctx.stroke(); }
    // console.log("DRAW: drawGrid END");
}

/** Draws map cell contents, now adding storm visual */
function drawMapCells(ctx, gridWidth, gridHeight, cellSize) {
    // console.log("DRAW: drawMapCells START");
    if (!mapData || mapData.length === 0) { console.warn("drawMapCells skipped: mapData empty or undefined."); return; }
    if (typeof Game === 'undefined' || typeof Game.getSafeZone !== 'function') { console.error("Game object or getSafeZone function not defined in drawMapCells!"); return; }

    const fontSize = cellSize * 0.7; ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const safeZone = Game.getSafeZone(); // Get current safe zone boundaries

    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * cellSize; const cellY = row * cellSize;

            // 1. Draw base terrain color
            const color = TILE_COLORS[tileType]; // TILE_COLORS defined in map.js
            ctx.fillStyle = color || '#FFFFFF';
            ctx.fillRect(cellX, cellY, cellSize, cellSize);

            // 2. Draw emoji if applicable
            const emoji = TILE_EMOJIS[tileType]; // TILE_EMOJIS defined in map.js
            if (emoji) { const centerX = cellX + cellSize / 2; const centerY = cellY + cellSize / 2; ctx.fillText(emoji, centerX, centerY); }

            // 3. Draw Storm Overlay if outside safe zone
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                 ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red
                 ctx.fillRect(cellX, cellY, cellSize, cellSize);
            }
        }
    }
     // console.log("DRAW: drawMapCells END");
}

/** Draws the player */
function drawPlayer(ctx, cellSize) {
    // console.log("DRAW: drawPlayer START");
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8; ctx.fillStyle = player.color; // player defined in player.js
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    // console.log("DRAW: drawPlayer END");
}

/** Draws all enemies */
function drawEnemies(ctx, cellSize) {
    // console.log("DRAW: drawEnemies START");
    if (typeof enemies === 'undefined' || enemies.length === 0) return; // enemies defined in ai.js
    const radius = (cellSize / 2) * 0.7; const defaultColor = '#ff0000';
    for (const enemy of enemies) {
        if (enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Also check HP
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2;
        const radiusMultiplier = enemy.radiusMultiplier || 1.0; // Use multiplier if defined
        const finalRadius = radius * radiusMultiplier;
        ctx.fillStyle = enemy.color || defaultColor;
        ctx.beginPath(); ctx.arc(centerX, centerY, finalRadius, 0, Math.PI * 2); ctx.fill();
    }
    // console.log("DRAW: drawEnemies END");
}

/** Draws UI - Updated for Medkits */
function drawUI(ctx) {
    // console.log("DRAW: drawUI START");
    if (typeof Game === 'undefined') { console.error("Game object not defined in drawUI!"); return; }
    ctx.fillStyle = 'white'; ctx.font = '16px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    let yOffset = 10;

    // Display Medkits (Renamed from Scrap)
    if (typeof player !== 'undefined' && player.resources) {
        ctx.fillText(`Medkits: ${player.resources.medkits || 0}`, 10, yOffset); // *** Use medkits ***
    } else {
        ctx.fillText("Medkits: N/A", 10, yOffset);
    }
    yOffset += 20;

    // Display Player HP
    if (typeof player !== 'undefined') { ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 10, yOffset); } else { ctx.fillText("HP: N/A", 10, yOffset); }
    yOffset += 20;

    // Display Turn - Use Game object
    ctx.fillText(`Turn: ${Game.getCurrentTurn()}`, 10, yOffset);

    // Display game over/win messages - Use Game object
    if (Game.isGameOver()) {
        // console.log("DRAW: Drawing win/loss overlay because Game.isGameOver() is true.");
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.font = '30px Arial'; ctx.fillStyle = 'red';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2); }
        else { ctx.fillStyle = 'lime'; ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2); }
    }
    ctx.shadowBlur = 0; // Reset shadow
    // console.log("DRAW: drawUI END");
}