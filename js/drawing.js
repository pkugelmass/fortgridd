console.log("drawing.js loaded");

// --- Drawing Functions ---
// Relies on global variables/objects: ctx, mapData, player, enemies, TILE_COLORS, TILE_EMOJIS,
// CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, Game object etc.

/** Draws grid lines */
function drawGrid() {
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= GRID_HEIGHT; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(canvas.width, y * CELL_SIZE); ctx.stroke(); }
}

/** Draws map cell contents */
function drawMapCells() {
    if (!mapData || mapData.length === 0) { return; }
    const fontSize = CELL_SIZE * 0.7; ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE; const cellY = row * CELL_SIZE;
            // Use TILE_COLORS (defined in map.js, global)
            const color = TILE_COLORS[tileType];
            if (!color) { console.warn(`No color defined for tileType ${tileType} at ${row},${col}`); }
            ctx.fillStyle = color || '#FFFFFF'; // Use fetched color or default white
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            // Use TILE_EMOJIS (defined in map.js)
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + CELL_SIZE / 2; const centerY = cellY + CELL_SIZE / 2; ctx.fillText(emoji, centerX, centerY); }
        }
    }
}

/** Draws the player */
function drawPlayer(ctx, cellSize) {
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8; ctx.fillStyle = player.color; // Use player's color
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
}

/** Draws all enemies */
function drawEnemies(ctx, cellSize) {
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const radius = (cellSize / 2) * 0.7; const defaultColor = '#ff0000';
    for (const enemy of enemies) {
        if (enemy.row === null || enemy.col === null) continue;
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2;
        ctx.fillStyle = enemy.color || defaultColor; // Use enemy's color or default
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    }
}

/** Draws UI */
function drawUI(ctx) {
    if (typeof Game === 'undefined') { console.error("Game object not defined in drawUI!"); return; }
    ctx.fillStyle = 'white'; ctx.font = '16px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    let yOffset = 10;
    // Display Scrap
    if (typeof player !== 'undefined' && player.resources) { ctx.fillText(`Scrap: ${player.resources.scrap}`, 10, yOffset); } else { ctx.fillText("Scrap: N/A", 10, yOffset); }
    yOffset += 20;
    // Display Player HP
    if (typeof player !== 'undefined') { ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 10, yOffset); } else { ctx.fillText("HP: N/A", 10, yOffset); }
    yOffset += 20;
    // Display Turn - Use Game object
    ctx.fillText(`Turn: ${Game.getCurrentTurn()}`, 10, yOffset);
    // Display game over/win messages - Use Game object
    if (Game.isGameOver()) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.font = '30px Arial'; ctx.fillStyle = 'red';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        // Check player state directly for message content
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2); }
        else { ctx.fillStyle = 'lime'; ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2); }
    }
    ctx.shadowBlur = 0; // Reset shadow
}