console.log("Game script loaded!");

// --- Configuration ---
// (GRID_WIDTH, GRID_HEIGHT, CELL_SIZE remain here for now,
// could move to config.js later)
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;

// --- Game State Variables ---
let mapData = []; // Will be populated by createMapData() from map.js


// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;


// --- Drawing Functions ---

/**
 * Draws the grid lines on the canvas.
 */
function drawGrid() {
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(canvas.width, y * CELL_SIZE);
        ctx.stroke();
    }
}

/**
 * Draws the contents of each cell based on the global mapData.
 * (Relies on TILE_COLORS and TILE_EMOJIS defined in map.js)
 */
function drawMapCells() {
    // Check if mapData is initialized
    if (!mapData || mapData.length === 0) {
         console.warn("drawMapCells called before mapData is initialized.");
         return;
    }

    const fontSize = CELL_SIZE * 0.7;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            // Check if the row exists before accessing column
            if (!mapData[row]) continue;

            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE;
            const cellY = row * CELL_SIZE;

            // Use TILE_COLORS (defined in map.js, available globally via script order)
            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF';
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

            // Use TILE_EMOJIS (defined in map.js)
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) {
                const centerX = cellX + CELL_SIZE / 2;
                const centerY = cellY + CELL_SIZE / 2;
                ctx.fillText(emoji, centerX, centerY);
            }
        }
    }
}

/**
 * Draws the player on the canvas as a circle.
 * (Relies on the global 'player' object from player.js)
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {number} cellSize - The size of each grid cell.
 */
function drawPlayer(ctx, cellSize) {
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2;
    const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8;
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draws basic UI elements, like resource counts.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 */
function drawUI(ctx) {
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;

    if (typeof player !== 'undefined' && player.resources) {
        const scrapText = `Scrap: ${player.resources.scrap}`;
        ctx.fillText(scrapText, 10, 10);
    } else {
        ctx.fillText("Scrap: N/A", 10, 10);
    }
    ctx.shadowBlur = 0;
}


/**
 * Main drawing function (clears canvas and draws all elements).
 */
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMapCells(); // Draw terrain first
    drawGrid();     // Draw grid lines next
    drawPlayer(ctx, CELL_SIZE); // Draw player
    drawUI(ctx);    // Draw UI text on top
}

// --- Input Handling ---

/**
 * Handles keydown events for player movement using Arrow Keys and WASD.
 * Includes resource collection logic.
 * @param {KeyboardEvent} event - The keyboard event object.
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

    if (moved) event.preventDefault();
    else return;

    if (targetRow >= 0 && targetRow < GRID_HEIGHT &&
        targetCol >= 0 && targetCol < GRID_WIDTH) {

        const targetTileType = mapData[targetRow][targetCol]; // mapData is global

        // Use TILE_LAND, TILE_SCRAP constants (defined in map.js, global)
        if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) {
            player.row = targetRow;
            player.col = targetCol;

            if (targetTileType === TILE_SCRAP) {
                if (player.resources) {
                     player.resources.scrap++;
                     console.log(`Collected Scrap! Total: ${player.resources.scrap}`);
                }
                mapData[player.row][player.col] = TILE_LAND; // Use TILE_LAND constant
            }
            redrawCanvas();
        }
    }
}

window.addEventListener('keydown', handleKeyDown);


// --- Initialization ---
console.log("Initializing game...");

// Assign map data by calling function from map.js
// Ensure createMapData is defined (map.js loaded first)
if (typeof createMapData === 'function') {
     mapData = createMapData();
} else {
    console.error("createMapData function not found! Is map.js loaded correctly BEFORE script.js?");
    mapData = []; // Avoid errors later by ensuring mapData is an array
}


// Find starting position for the player AFTER map is created
// Ensure findStartPosition is defined (player.js loaded first)
if (typeof player !== 'undefined' && typeof findStartPosition === 'function') {
    // Pass TILE_LAND constant (defined in map.js, global)
    const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND);
    if (startPos) {
        player.row = startPos.row;
        player.col = startPos.col;
        if (!player.resources) player.resources = { scrap: 0 };
    } else {
        console.error("Player starting position could not be set.");
    }
} else {
     console.error("Player object or findStartPosition function not found! Check script load order.");
}


redrawCanvas(); // Initial draw

console.log(`Canvas initialized: ${canvas.width}x${canvas.height}`);
console.log(`Grid: ${GRID_WIDTH}x${GRID_HEIGHT}, Cell Size: ${CELL_SIZE}px`);
if(typeof player !== 'undefined' && player.row !== null) {
    console.log(`Player starting at: ${player.row}, ${player.col}`);
    console.log(`Initial resources:`, player.resources);
} else {
     console.log("Player position not set.");
}