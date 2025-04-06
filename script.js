console.log("Game script loaded!");

// --- Configuration ---
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;

// --- Map Data ---
let mapData = [];

// Define tile types
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2; // Added Tree type

// Emojis for tiles - We are REMOVING wall emoji now
const TILE_EMOJIS = {
    // No emoji for wall, just use color
    // No emoji for tree, just use color
    // [TILE_WALL]: '🧱', // Removed or commented out
    // [TILE_TREE]: '🌳', // Removed or commented out
};

// Colors for tiles - Added Tree color
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F', // DarkSeaGreen
    [TILE_WALL]: '#A9A9A9', // DarkGray - This will be visible now
    [TILE_TREE]: '#556B2F', // DarkOliveGreen - Color for trees
};

/**
 * Creates the initial map data structure (a 2D array).
 * Reduced wall density, added trees.
 */
function createMapData() {
    mapData = []; // Reset map data
    for (let row = 0; row < GRID_HEIGHT; row++) {
        mapData[row] = []; // Create a new row array
        for (let col = 0; col < GRID_WIDTH; col++) {
            // Default to land
            let tile = TILE_LAND;

            // Only place features if NOT on the edge border
            if (row > 0 && row < GRID_HEIGHT - 1 && col > 0 && col < GRID_WIDTH - 1) {
                const randomValue = Math.random();

                // Place walls (Lower probability now)
                if (randomValue < 0.03) { // Reduced to 5% chance for a wall
                    tile = TILE_WALL;
                }
                // Place trees (if not a wall)
                else if (randomValue < 0.10) { // Additional 8% chance for trees (0.05 + 0.08 = 0.13 total check)
                    tile = TILE_TREE;
                }
                // Add other features here later using else if(randomValue < ...)
            }

            mapData[row][col] = tile; // Assign the chosen tile type
        }
    }
    // Log only the first row to avoid flooding console, check if it looks reasonable
    console.log("Map data created (first row sample):", mapData[0]);
}


// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;


// --- Drawing Functions ---

/**
 * Draws the grid lines on the canvas.
 * (No changes needed in this function)
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
 * Draws the contents of each cell based on the mapData.
 * (No changes needed in this function, relies on TILE_EMOJIS/TILE_COLORS)
 */
function drawMapCells() {
    const fontSize = CELL_SIZE * 0.7;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE;
            const cellY = row * CELL_SIZE;

            // 1. Draw background color first
            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF';
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

            // 2. Draw emoji on top (if one is defined)
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) {
                const centerX = cellX + CELL_SIZE / 2;
                const centerY = cellY + CELL_SIZE / 2;
                ctx.fillText(emoji, centerX, centerY);
            }
            // Since no emojis are defined for Wall or Tree now, this block won't run for them.
        }
    }
}

/**
 * Main drawing function.
 * (No changes needed in this function)
 */
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMapCells();
    drawGrid();
}

// --- Initialization ---
createMapData();
redrawCanvas();

console.log(`Canvas initialized: ${canvas.width}x${canvas.height}`);
console.log(`Grid: ${GRID_WIDTH}x${GRID_HEIGHT}, Cell Size: ${CELL_SIZE}px`);