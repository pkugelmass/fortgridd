console.log("Game script loaded!");

// --- Configuration ---
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;
const NUM_ENEMIES = 3;

// --- Game State Variables ---
let mapData = [];
// Player object is defined in player.js
// Enemies array is defined in ai.js


// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;


// --- Drawing Functions ---

/** Draws grid lines */
function drawGrid() {
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= GRID_HEIGHT; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(canvas.width, y * CELL_SIZE); ctx.stroke(); }
}

/** Draws map cell contents */
function drawMapCells() {
    if (!mapData || mapData.length === 0) return;
    const fontSize = CELL_SIZE * 0.7; ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE; const cellY = row * CELL_SIZE;
            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF';
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + CELL_SIZE / 2; const centerY = cellY + CELL_SIZE / 2; ctx.fillText(emoji, centerX, centerY); }
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
    const radius = (cellSize / 2) * 0.7; const defaultColor = '#ff0000';
    for (const enemy of enemies) {
        if (enemy.row === null || enemy.col === null) continue;
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2;
        ctx.fillStyle = enemy.color || defaultColor;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    }
}

/** Draws UI */
function drawUI(ctx) {
    ctx.fillStyle = 'white'; ctx.font = '16px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    if (typeof player !== 'undefined' && player.resources) { ctx.fillText(`Scrap: ${player.resources.scrap}`, 10, 10); }
    else { ctx.fillText("Scrap: N/A", 10, 10); }
    ctx.shadowBlur = 0;
}


/** Main drawing function */
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMapCells();
    drawGrid();
    drawEnemies(ctx, CELL_SIZE);
    drawPlayer(ctx, CELL_SIZE);
    drawUI(ctx);
}

// --- Input Handling ---

/**
 * Handles keydown events for player movement.
 * Now includes check for enemy collision.
 */
function handleKeyDown(event) {
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;

    let targetRow = player.row;
    let targetCol = player.col;
    let moved = false;

    switch (event.key.toLowerCase()) {
        case 'arrowup': case 'w': targetRow--; moved = true; break;
        case 'arrowdown': case 's': targetRow++; moved = true; break;
        case 'arrowleft': case 'a': targetCol--; moved = true; break;
        case 'arrowright': case 'd': targetCol++; moved = true; break;
        default: return;
    }

    if (moved) event.preventDefault(); else return;

    // --- Validate the move ---
    // 1. Boundary Check
    if (targetRow >= 0 && targetRow < GRID_HEIGHT &&
        targetCol >= 0 && targetCol < GRID_WIDTH) {

        const targetTileType = mapData[targetRow][targetCol];

        // 2. Walkable Tile Check (Land or Scrap)
        if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) {

            // 3. Enemy Collision Check (NEW!)
            let isOccupiedByEnemy = false;
            if (typeof enemies !== 'undefined') { // Make sure enemies array exists
                for (const enemy of enemies) {
                    if (enemy.row === targetRow && enemy.col === targetCol) {
                        isOccupiedByEnemy = true;
                        break; // Found an enemy at the target location
                    }
                }
            }

            // --- Proceed only if target tile is walkable AND not occupied by an enemy ---
            if (!isOccupiedByEnemy) {
                // --- Actual Movement ---
                player.row = targetRow;
                player.col = targetCol;

                // --- Resource Collection Check ---
                if (targetTileType === TILE_SCRAP) {
                    if (player.resources) {
                        player.resources.scrap++;
                        console.log(`Collected Scrap! Total: ${player.resources.scrap}`);
                    }
                    mapData[player.row][player.col] = TILE_LAND;
                }
                redrawCanvas(); // Redraw only after a successful move

            } else {
                 console.log(`Move blocked: Target (${targetRow}, ${targetCol}) occupied by enemy.`); // Log enemy collision
            }
        } else {
            // console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) is not walkable.`); // Log terrain collision
        }
    } // else: move blocked by boundary
}

window.addEventListener('keydown', handleKeyDown);


// --- Initialization --- (No changes from previous version needed here)
console.log("Initializing game...");
if (typeof createMapData === 'function') { mapData = createMapData(); }
else { console.error("createMapData function not found!"); mapData = []; }

const occupiedCoords = [];
if (typeof player !== 'undefined' && typeof findStartPosition === 'function') {
    const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
    if (startPos) {
        player.row = startPos.row; player.col = startPos.col;
        occupiedCoords.push({ row: player.row, col: player.col });
        if (!player.resources) player.resources = { scrap: 0 };
    } else { console.error("Player starting position could not be set."); }
} else { console.error("Player object or findStartPosition function not found!"); }

console.log(`Attempting to place ${NUM_ENEMIES} enemies...`);
if (typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
    for (let i = 0; i < NUM_ENEMIES; i++) {
        const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (enemyStartPos) {
            const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000' };
            enemies.push(newEnemy);
            occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col });
            console.log(`Placed enemy ${i + 1} at ${newEnemy.row}, ${newEnemy.col}`);
        } else { console.error(`Could not find valid position for enemy ${i + 1}`); }
    }
} else { console.error("Enemies array or findStartPosition function not found!"); }

redrawCanvas();
console.log(`Canvas initialized: ${canvas.width}x${canvas.height}`);
console.log(`Grid: ${GRID_WIDTH}x${GRID_HEIGHT}, Cell Size: ${CELL_SIZE}px`);
if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); }
else { console.log("Player position not set."); }
console.log(`Placed ${enemies.length} enemies:`, enemies);