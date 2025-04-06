// --- Start of script.js ---
console.log("SCRIPT START: Loading script.js...");

// --- Configuration ---
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;
const NUM_ENEMIES = 3;
const PLAYER_ATTACK_DAMAGE = 2;
const AI_ATTACK_DAMAGE = 1; // AI damage defined here, used in ai.js (global)

// --- Game State Variables ---
let mapData = []; // Populated by createMapData() from map.js
let currentTurn = 'player'; // Managed here, read/modified by input.js and ai.js
let gameActive = true; // Managed here, read/modified by input.js and ai.js
console.log("SCRIPT VARS: Initial gameActive =", gameActive);
// Player object defined in player.js
// Enemies array defined in ai.js
// Tile constants, colors, emojis defined in map.js


// --- Canvas Setup ---
console.log("SCRIPT SETUP: Getting canvas element...");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // ctx used globally by drawing functions
console.log("SCRIPT SETUP: Setting canvas dimensions...");
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;
console.log(`SCRIPT SETUP: Canvas dimensions set to ${canvas.width}x${canvas.height}`);


// --- Drawing Orchestration --- (Calls functions defined in drawing.js)
/**
 * Main drawing function (clears canvas and calls individual draw functions).
 */
function redrawCanvas() {
    // console.log("--- REDRAW CANVAS START ---");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Call functions defined in drawing.js
    if (typeof drawMapCells === 'function') drawMapCells(); else console.error("drawMapCells not defined!");
    if (typeof drawGrid === 'function') drawGrid(); else console.error("drawGrid not defined!");
    if (typeof drawEnemies === 'function') drawEnemies(ctx, CELL_SIZE); else console.error("drawEnemies not defined!");
    if (typeof drawPlayer === 'function') drawPlayer(ctx, CELL_SIZE); else console.error("drawPlayer not defined!");
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("drawUI not defined!");
    // console.log("--- REDRAW CANVAS END ---");
}

// --- AI Turn Logic --- (Function definition MOVED to ai.js)


// --- Input Handling --- (Function definition MOVED to input.js)
// Add the event listener using the function defined in input.js
if (typeof handleKeyDown === 'function') {
    window.addEventListener('keydown', handleKeyDown);
    console.log("Input handler attached.");
} else {
    console.error("handleKeyDown function not found! Is input.js loaded correctly BEFORE script.js?");
}


// --- Initialization ---
console.log("Initializing game...");
// 1. Create Map
if (typeof createMapData === 'function') { mapData = createMapData(); console.log("INIT: Map creation function called.");}
else { console.error("INIT ERROR: createMapData function not found!"); mapData = []; gameActive = false; }
// 2. Place Player
const occupiedCoords = [];
if (gameActive && typeof player !== 'undefined' && typeof findStartPosition === 'function') { const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); if (!player.resources) player.resources = { scrap: 0 }; player.hp = player.maxHp; console.log("INIT: Player placed successfully."); } else { console.error("INIT ERROR: Player starting position could not be set."); gameActive = false; } } else if (gameActive) { console.error("INIT ERROR: Player object or findStartPosition function not found!"); gameActive = false; }
// 3. Place Enemies
console.log("INIT: Attempting enemy placement...");
if (gameActive && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') { console.log(`INIT: Placing ${NUM_ENEMIES} enemies...`); for (let i = 0; i < NUM_ENEMIES; i++) { const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: 5, maxHp: 5 }; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); console.log(`INIT: Placed enemy ${i + 1}.`); } else { console.error(`INIT ERROR: Could not find valid position for enemy ${i + 1}.`); } } console.log(`INIT: Finished placing enemies. Total placed: ${enemies.length}`); } else if (gameActive) { console.error("INIT ERROR: Enemies array or findStartPosition function not found!"); gameActive = false; }
// 4. Initial Draw
console.log(`INIT: Checking gameActive status before initial draw: ${gameActive}`);
if (gameActive) { console.log("INIT: Calling initial redrawCanvas()..."); redrawCanvas(); console.log("INIT: Initial redrawCanvas() called."); } else { console.error("INIT: Game initialization failed."); /* Draw error message */ ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center'; ctx.fillText('Game Initialization Failed. Check Console.', canvas.width / 2, canvas.height / 2); }
console.log("INIT: Initialization sequence complete.");
// Final status logs
if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); }
console.log(`Placed ${enemies.length} enemies:`, enemies);