console.log("Game script loaded!");

// --- Configuration ---
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;

// --- Map Data ---
let mapData = []; // This will hold our 2D array for the map state

// Define tile types (These need to be accessible BEFORE player.js runs if IT needs them,
// OR they need to be passed as arguments, or duplicated. Passing is often cleaner.)
// Consider moving these to a config.js file later if they grow.
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;

// Emojis for tiles (Keep this empty if using colors)
const TILE_EMOJIS = {
    // Example: [TILE_WALL]: '🧱',
};

// Colors for tiles
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F', // DarkSeaGreen
    [TILE_WALL]: '#A9A9A9', // DarkGray
    [TILE_TREE]: '#556B2F', // DarkOliveGreen
};

/**
 * Creates the initial map data structure (a 2D array).
 */
function createMapData() {
    mapData = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
        mapData[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            let tile = TILE_LAND;
            if (row > 0 && row < GRID_HEIGHT - 1 && col > 0 && col < GRID_WIDTH - 1) {
                const randomValue = Math.random();
                if (randomValue < 0.05) { // Adjust density as needed
                    tile = TILE_WALL;
                } else if (randomValue < 0.13) { // Adjust density as needed
                    tile = TILE_TREE;
                }
            }
            mapData[row][col] = tile;
        }
    }
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

            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF';
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

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
    // Check if player object exists and position is valid
    if (typeof player === 'undefined' || player.row === null || player.col === null) {
        return; // Don't draw if position is not set
    }

    // Calculate the center coordinates of the player's cell
    const centerX = player.col * cellSize + cellSize / 2;
    const centerY = player.row * cellSize + cellSize / 2;

    // Calculate the radius - make it slightly smaller than half the cell size
    // so the underlying tile corners are visible. e.g., 80% of half the cell size.
    const radius = (cellSize / 2) * 0.8;

    // Set the fill color
    ctx.fillStyle = player.color; // Use color defined in player.js

    // Draw the circle
    ctx.beginPath(); // Start drawing path
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); // Define the circle path (x, y, radius, startAngle, endAngle)
    ctx.fill(); // Fill the circle path
}


/**
 * Main drawing function (clears canvas and draws all elements).
 */
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawMapCells(); // Draw terrain first
    drawGrid();     // Draw grid lines next
    drawPlayer(ctx, CELL_SIZE); // Draw player on top
}

// --- Input Handling ---

/**
 * Handles keydown events for player movement.
 * @param {KeyboardEvent} event - The keyboard event object.
 */
function handleKeyDown(event) {
    // console.log("Key pressed:", event.key); // Optional: Log key presses

    let targetRow = player.row;
    let targetCol = player.col;
    let moved = false; // Flag to track if player position changed

    // Determine target cell based on arrow key or WASD
    // Convert key to lowercase to handle both 'w' and 'W', etc.
    switch (event.key.toLowerCase()) {
        // --- Arrow Keys ---
        case 'arrowup':
        case 'w': // Add 'w' for Up
            targetRow--;
            moved = true;
            break;
        case 'arrowdown':
        case 's': // Add 's' for Down
            targetRow++;
            moved = true;
            break;
        case 'arrowleft':
        case 'a': // Add 'a' for Left
            targetCol--;
            moved = true;
            break;
        case 'arrowright':
        case 'd': // Add 'd' for Right
            targetCol++;
            moved = true;
            break;
        default:
            // Ignore other keys
            return;
    }

    // Prevent default browser behavior ONLY if a movement key was pressed
    if (moved) {
        event.preventDefault(); // Stop arrow keys scrolling, potentially block default WASD actions if any
    } else {
        return; // Exit if no relevant key was pressed
    }

    // --- Validate the move ---

    // 1. Boundary Check: Is the target within the grid?
    if (targetRow >= 0 && targetRow < GRID_HEIGHT &&
        targetCol >= 0 && targetCol < GRID_WIDTH) {

        // 2. Walkable Tile Check: Is the target tile land?
        if (mapData[targetRow][targetCol] === TILE_LAND) {
            // Move is valid! Update player position
            player.row = targetRow;
            player.col = targetCol;

            // Redraw the canvas to show the move
            redrawCanvas();

            // console.log(`Player moved to: ${player.row}, ${player.col}`); // Optional debug log
        } else {
            console.log(`Move blocked: Target tile (${targetRow}, ${targetCol}) is not TILE_LAND.`); // Optional debug log
        }
    } else {
        console.log(`Move blocked: Target (${targetRow}, ${targetCol}) is outside grid boundaries.`); // Optional debug log
    }
}

// Add the event listener AFTER the function is defined
window.addEventListener('keydown', handleKeyDown);


// --- Initialization ---
console.log("Initializing game...");

createMapData(); // Create the map data structure

// Find starting position for the player AFTER map is created
const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND);

if (typeof player !== 'undefined') {
    if (startPos) {
        player.row = startPos.row;
        player.col = startPos.col;
    } else {
        console.error("Player starting position could not be set.");
    }
} else {
     console.error("Player object not found. Is player.js loaded correctly BEFORE script.js?");
}


redrawCanvas(); // Initial draw AFTER finding player start pos

console.log(`Canvas initialized: ${canvas.width}x${canvas.height}`);
console.log(`Grid: ${GRID_WIDTH}x${GRID_HEIGHT}, Cell Size: ${CELL_SIZE}px`);
if(typeof player !== 'undefined' && player.row !== null) {
    console.log(`Player starting at: ${player.row}, ${player.col}`);
} else {
     console.log("Player position not set.");
}
