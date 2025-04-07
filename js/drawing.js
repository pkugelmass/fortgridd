console.log("drawing.js loaded");

// --- Drawing Functions ---
// Relies on global variables/objects: ctx, mapData, player, enemies, TILE_COLORS, TILE_EMOJIS,
// CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, Game object etc.

/** Draws grid lines */
function drawGrid(ctx, gridWidth, gridHeight, cellSize) {
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    const canvasWidth = gridWidth * cellSize;
    const canvasHeight = gridHeight * cellSize;
    for (let x = 0; x <= gridWidth; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, canvasHeight); ctx.stroke(); }
    for (let y = 0; y <= gridHeight; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(canvasWidth, y * cellSize); ctx.stroke(); }
}

/** Draws map cell contents, including storm visual */
function drawMapCells(ctx, gridWidth, gridHeight, cellSize) {
    if (!mapData || mapData.length === 0) { console.warn("drawMapCells skipped: mapData empty or undefined."); return; }
    if (typeof Game === 'undefined' || typeof Game.getSafeZone !== 'function') { console.error("Game object or getSafeZone function not defined in drawMapCells!"); return; }

    const fontSize = cellSize * 0.7; ctx.font = `${fontSize}px Arial`;
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

            // 2. Draw emoji if applicable (Uses TILE_EMOJIS from map.js)
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + cellSize / 2; const centerY = cellY + cellSize / 2; ctx.fillText(emoji, centerX, centerY); }

            // 3. Draw Storm Overlay if outside safe zone
            if (row < safeZone.minRow || row > safeZone.maxRow || col < safeZone.minCol || col > safeZone.maxCol) {
                 ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red
                 ctx.fillRect(cellX, cellY, cellSize, cellSize);
            }
        }
    }
}

/** Draws the player */
function drawPlayer(ctx, cellSize) {
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8; ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
}

/** Draws all enemies */
function drawEnemies(ctx, cellSize) {
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const baseRadius = (cellSize / 2) * 0.7; // Base size for radius calculation
    const defaultColor = '#ff0000';

    for (const enemy of enemies) {
        if (enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Also check HP > 0
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2;
        const radiusMultiplier = enemy.radiusMultiplier || 1.0; // Use stored multiplier or default to 1
        const finalRadius = baseRadius * radiusMultiplier;
        ctx.fillStyle = enemy.color || defaultColor;
        ctx.beginPath(); ctx.arc(centerX, centerY, finalRadius, 0, Math.PI * 2); ctx.fill();
        // We will add HP bars here later if desired
    }
}

/** Draws UI - Added Ammo display */
function drawUI(ctx) {
    if (typeof Game === 'undefined') { console.error("Game object not defined in drawUI!"); return; }
    ctx.fillStyle = 'white'; ctx.font = '16px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    let yOffset = 10;

    // Display Medkits
    if (typeof player !== 'undefined' && player.resources) {
        ctx.fillText(`Medkits: ${player.resources.medkits || 0}`, 10, yOffset);
    } else { ctx.fillText("Medkits: N/A", 10, yOffset); }
    yOffset += 20;

    // Display Ammo (NEW)
    if (typeof player !== 'undefined' && player.resources) {
        ctx.fillText(`Ammo: ${player.resources.ammo || 0}`, 10, yOffset); // Display ammo count
    } else { ctx.fillText("Ammo: N/A", 10, yOffset); }
    yOffset += 20;

    // Display Player HP
    if (typeof player !== 'undefined') { ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 10, yOffset); } else { ctx.fillText("HP: N/A", 10, yOffset); }
    yOffset += 20;

    // Display Turn
    ctx.fillText(`Turn: ${Game.getCurrentTurn()}`, 10, yOffset);

    // Display game over/win messages
    if (Game.isGameOver()) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.font = '30px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2); }
        else { ctx.fillStyle = 'lime'; ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2); }
    }
    ctx.shadowBlur = 0; // Reset shadow
}