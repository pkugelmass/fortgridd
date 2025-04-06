// --- Start of script.js ---
console.log("SCRIPT START: Loading script.js...");

// --- Configuration ---
// Defined in config.js

// --- Game State Variables ---
// Managed by Game object in game.js
let mapData = []; // Populated here during init
console.log("SCRIPT VARS: Game state managed by Game object.");
// Player object defined in player.js
// Enemies array defined in ai.js
// Tile constants, colors, emojis defined in map.js


// --- Canvas Setup ---
console.log("SCRIPT SETUP: Getting canvas element...");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // ctx used globally by drawing functions
console.log("SCRIPT SETUP: Setting canvas dimensions...");
// Use constants from config.js (available globally)
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;
console.log(`SCRIPT SETUP: Canvas dimensions set to ${canvas.width}x${canvas.height}`);


// --- Drawing Orchestration --- (Calls functions defined in drawing.js)
/**
 * Main drawing function (clears canvas and calls individual draw functions).
 */
function redrawCanvas() {
    console.log("--- REDRAW CANVAS START ---"); // <<< ADDED LOG
    // Verify context exists
    if (!ctx) { console.error("FATAL: Canvas context (ctx) is missing in redrawCanvas!"); return; }
    console.log("REDRAW: Context verified.");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("REDRAW: Canvas cleared.");

    // Call functions defined in drawing.js, check if they exist
    if (typeof drawMapCells === 'function') { drawMapCells(); } else { console.error("redrawCanvas ERROR: drawMapCells not defined!"); }
    if (typeof drawGrid === 'function') { drawGrid(); } else { console.error("redrawCanvas ERROR: drawGrid not defined!"); }
    if (typeof drawEnemies === 'function') { drawEnemies(ctx, CELL_SIZE); } else { console.error("redrawCanvas ERROR: drawEnemies not defined!"); }
    if (typeof drawPlayer === 'function') { drawPlayer(ctx, CELL_SIZE); } else { console.error("redrawCanvas ERROR: drawPlayer not defined!"); }
    if (typeof drawUI === 'function') { drawUI(ctx); } else { console.error("redrawCanvas ERROR: drawUI not defined!"); }

    console.log("--- REDRAW CANVAS END ---"); // <<< ADDED LOG
}

// --- AI Turn Logic --- (Function defined in ai.js)
// executeAiTurns() is called indirectly via Game.endPlayerTurn() in input.js

// --- Input Handling --- (Function defined in input.js)
// Add the event listener using the function defined in input.js
if (typeof handleKeyDown === 'function') {
    window.addEventListener('keydown', handleKeyDown);
    console.log("Input handler attached.");
} else {
    console.error("handleKeyDown function not found! Is input.js loaded correctly BEFORE script.js?");
}


// --- Initialization ---
console.log("Initializing game...");
// Check if Game object exists before starting
if (typeof Game === 'undefined') {
     console.error("FATAL: Game object not defined! Is game.js loaded?");
     // Draw critical error message
     ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
     ctx.fillText('FATAL ERROR: Game object missing. Check Console.', canvas.width / 2, canvas.height / 2);
} else {
    // Proceed with initialization only if Game exists

    // 1. Create Map
    console.log("INIT: Attempting map creation...");
    // Use Game.isGameOver() which checks !Game.gameActive
    if (!Game.isGameOver() && typeof createMapData === 'function') {
         mapData = createMapData(); // createMapData is in map.js
         console.log("INIT: Map creation function called.");
    } else if (!Game.isGameOver()) { // Only log error if game was supposed to be active
        console.error("INIT ERROR: createMapData function not found!"); mapData = []; Game.setGameOver(); // Use Game manager
    }

    // 2. Place Player
    console.log("INIT: Attempting player placement...");
    const occupiedCoords = [];
    // Use Game.isGameOver()
    if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); // findStartPosition is in player.js
        if (startPos) {
            player.row = startPos.row; player.col = startPos.col;
            occupiedCoords.push({ row: player.row, col: player.col });
            if (!player.resources) player.resources = { scrap: 0 };
            player.hp = player.maxHp; console.log("INIT: Player placed successfully.");
        } else {
            console.error("INIT ERROR: Player starting position could not be set."); Game.setGameOver(); // Use Game manager
        }
    } else if (!Game.isGameOver()) {
         console.error("INIT ERROR: Player object or findStartPosition function not found!"); Game.setGameOver(); // Use Game manager
    }

    // 3. Place Enemies
    console.log("INIT: Attempting enemy placement...");
    // Use Game.isGameOver()
    if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
        console.log(`INIT: Placing ${NUM_ENEMIES} enemies...`); // NUM_ENEMIES from config.js
        for (let i = 0; i < NUM_ENEMIES; i++) {
            const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
            if (enemyStartPos) {
                const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: 5, maxHp: 5 };
                enemies.push(newEnemy); // enemies array from ai.js
                occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col });
                console.log(`INIT: Placed enemy ${i + 1}.`);
            } else { console.error(`INIT ERROR: Could not find valid position for enemy ${i + 1}.`); }
        }
        console.log(`INIT: Finished placing enemies. Total placed: ${enemies.length}`);
    } else if (!Game.isGameOver()) {
         console.error("INIT ERROR: Enemies array or findStartPosition function not found!"); Game.setGameOver(); // Use Game manager
    }

    // 4. Initial Draw
    console.log(`INIT: Checking gameActive status via !Game.isGameOver() before initial draw: ${!Game.isGameOver()}`);
    // Use Game.isGameOver()
    if (!Game.isGameOver()) {
        console.log("INIT: Calling initial redrawCanvas()...");
        // Ensure redrawCanvas itself is defined before calling
        if (typeof redrawCanvas === 'function') {
             redrawCanvas();
             console.log("INIT: Initial redrawCanvas() called successfully.");
        } else {
             console.error("INIT ERROR: redrawCanvas function not defined!");
             // Draw error on canvas if redrawCanvas is missing? Less likely.
             ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
             ctx.fillText('FATAL ERROR: redrawCanvas missing.', canvas.width / 2, canvas.height / 2);
        }
    } else {
        console.error("INIT: Game initialization failed.");
        // Draw error message because gameActive became false during init
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
        ctx.fillText('Game Initialization Failed. Check Console.', canvas.width / 2, canvas.height / 2);
    }

    console.log("INIT: Initialization sequence complete.");
    // Final status logs
    if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); }
    if(typeof enemies !== 'undefined') console.log(`Placed ${enemies.length} enemies:`, enemies); else console.log("Enemies array not defined.");
    if(typeof Game !== 'undefined') console.log(`Initial Turn: ${Game.getCurrentTurn()}`); else console.log("Game object not defined.");

} // End Game object check