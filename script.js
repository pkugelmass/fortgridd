console.log("Game script loaded!");

// --- Configuration ---
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;

// --- Map Data ---
let mapData = []; // This will hold our 2D array for the map state

// Define tile types
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;
const TILE_SCRAP = 3; // Scrap tile type

// Emojis for tiles (Keep this empty if using colors)
const TILE_EMOJIS = {};

// Colors for tiles
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F', // DarkSeaGreen
    [TILE_WALL]: '#A9A9A9', // DarkGray
    [TILE_TREE]: '#556B2F', // DarkOliveGreen
    [TILE_SCRAP]: '#B8860B', // DarkGoldenrod - Color for Scrap nodes
};

/**
 * Creates the initial map data structure (a 2D array).
 * Generates land, walls, trees, and scrap.
 */
function createMapData() {
    console.log("Creating map data...");
    mapData = []; // Reset map data
    for (let row = 0; row < GRID_HEIGHT; row++) {
        mapData[row] = []; // Create a new row array
        for (let col = 0; col < GRID_WIDTH; col++) {
            let tile = TILE_LAND; // Default to land

            // Only place features if NOT on the edge border
            if (row > 0 && row < GRID_HEIGHT - 1 && col > 0 && col < GRID_WIDTH - 1) {
                // *** IMPORTANT: Define randomValue HERE, inside the edge check, once per cell ***
                const randomValue = Math.random();

                // Place walls (Example: 5% chance) - Adjust percentages as you like
                if (randomValue < 0.05) {
                    tile = TILE_WALL;
                }
                // Place trees (Example: 8% chance, cumulative check)
                else if (randomValue < 0.13) { // 0.05 + 0.08
                    tile = TILE_TREE;
                }
                // Place scrap (Example: 5% chance, cumulative check)
                else if (randomValue < 0.18) { // 0.13 + 0.05
                    // Ensure scrap only replaces LAND (implicit here because of else-if chain)
                    tile = TILE_SCRAP;
                }
                // Add other features here later using 'else if (randomValue < ...)'
            }

            mapData[row][col] = tile; // Assign the chosen tile type for this cell
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
    const fontSize = CELL_SIZE * 0.7; // Keep font settings even if not using emojis now
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE;
            const cellY = row * CELL_SIZE;

            // 1. Draw background color first
            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF'; // Default white if undefined
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

            // 2. Draw emoji on top (if one is defined)
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
    if (typeof player === 'undefined' || player.row === null || player.col === null) {
        return; // Don't draw if position is not set
    }
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

    // Check if player and resources exist before drawing
    if (typeof player !== 'undefined' && player.resources) {
        const scrapText = `Scrap: ${player.resources.scrap}`;
        ctx.fillText(scrapText, 10, 10);
    } else {
        ctx.fillText("Scrap: N/A", 10, 10); // Show placeholder if player/resources not ready
    }

    ctx.shadowBlur = 0; // Reset shadow
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
    // Check if player object is ready before processing input
     if (typeof player === 'undefined' || player.row === null || player.col === null) {
        console.warn("Player not ready, ignoring input.");
        return;
    }

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

    // --- Validate the move ---
    if (targetRow >= 0 && targetRow < GRID_HEIGHT &&
        targetCol >= 0 && targetCol < GRID_WIDTH) {

        const targetTileType = mapData[targetRow][targetCol];

        // --- Walkable Tile Check --- (Land and Scrap are walkable)
        if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) {

            // --- Actual Movement ---
            player.row = targetRow;
            player.col = targetCol;

            // --- Resource Collection Check (AFTER moving) ---
            if (targetTileType === TILE_SCRAP) {
                if (player.resources) { // Check if resources object exists
                     player.resources.scrap++;
                     console.log(`Collected Scrap! Total: ${player.resources.scrap}`);
                } else {
                    console.error("Player.resources not defined!"); // Should not happen if player.js is correct
                }
                mapData[player.row][player.col] = TILE_LAND; // Change tile back to land
            }

            redrawCanvas(); // Redraw after potential move and collection

        } // else: move blocked by non-walkable tile
    } // else: move blocked by boundary
}

// Add the event listener AFTER the function is defined
window.addEventListener('keydown', handleKeyDown);


// --- Initialization ---
console.log("Initializing game...");

createMapData(); // Create the map data structure

// Find starting position for the player AFTER map is created
const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND);

// Ensure player object exists (from player.js) before using it
if (typeof player !== 'undefined') {
    if (startPos) {
        player.row = startPos.row;
        player.col = startPos.col;
        // Ensure resources are initialized if findStartPosition succeeded
        if (!player.resources) {
            player.resources = { scrap: 0 }; // Safety initialization
             console.warn("player.resources was undefined, initialized.");
        }
    } else {
        console.error("Player starting position could not be set.");
    }
} else {
     console.error("Player object not found. Is player.js loaded correctly BEFORE script.js?");
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