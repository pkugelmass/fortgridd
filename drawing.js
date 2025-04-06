console.log("drawing.js loaded");

// --- Drawing Functions ---
// These functions rely on global variables like ctx, mapData, player, enemies,
// TILE_COLORS, CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, currentTurn, gameActive etc.
// being available due to the script load order defined in index.html.

/** Draws grid lines */
function drawGrid() {
    // console.log("DRAW: drawGrid START");
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= GRID_HEIGHT; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(canvas.width, y * CELL_SIZE); ctx.stroke(); }
    // console.log("DRAW: drawGrid END");
}

/** Draws map cell contents */
function drawMapCells() {
    // console.log("DRAW: drawMapCells START");
    if (!mapData || mapData.length === 0) { /*console.warn("drawMapCells skipped: mapData empty.");*/ return; }
    const fontSize = CELL_SIZE * 0.7; ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE; const cellY = row * CELL_SIZE;
            // Use TILE_COLORS (defined in map.js, global)
            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF';
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            // Use TILE_EMOJIS (defined in map.js)
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + CELL_SIZE / 2; const centerY = cellY + CELL_SIZE / 2; ctx.fillText(emoji, centerX, centerY); }
        }
    }
    // console.log("DRAW: drawMapCells END");
}

/** Draws the player */
function drawPlayer(ctx, cellSize) { // Keep ctx and cellSize parameters for clarity
    // console.log("DRAW: drawPlayer START");
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8; ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    // console.log("DRAW: drawPlayer END");
}

/** Draws all enemies */
function drawEnemies(ctx, cellSize) { // Keep ctx and cellSize parameters for clarity
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
function drawUI(ctx) { // Keep ctx parameter for clarity
    // console.log("DRAW: drawUI START");
    ctx.fillStyle = 'white'; ctx.font = '16px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    let yOffset = 10;
    if (typeof player !== 'undefined' && player.resources) { ctx.fillText(`Scrap: ${player.resources.scrap}`, 10, yOffset); } else { ctx.fillText("Scrap: N/A", 10, yOffset); }
    yOffset += 20;
    if (typeof player !== 'undefined') { ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 10, yOffset); } else { ctx.fillText("HP: N/A", 10, yOffset); }
    yOffset += 20;
    ctx.fillText(`Turn: ${currentTurn}`, 10, yOffset); // Uses global currentTurn
    if (!gameActive) { // Uses global gameActive
        // console.log("DRAW: Drawing win/loss overlay because gameActive is false.");
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.font = '30px Arial'; ctx.fillStyle = 'red';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2); }
        else { ctx.fillStyle = 'lime'; ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2); }
    }
    ctx.shadowBlur = 0;
    // console.log("DRAW: drawUI END");
}