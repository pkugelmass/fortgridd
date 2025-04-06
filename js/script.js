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
// console.log(`SCRIPT SETUP: Canvas dimensions set to ${canvas.width}x${canvas.height}`); // Quieter


// --- Drawing Orchestration --- (Calls functions defined in drawing.js)
/**
 * Main drawing function (clears canvas and calls individual draw functions).
 */
function redrawCanvas() {
    // console.log("--- REDRAW CANVAS START ---"); // Quieter
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typeof drawMapCells === 'function') drawMapCells(); else console.error("drawMapCells not defined!");
    if (typeof drawGrid === 'function') drawGrid(); else console.error("drawGrid not defined!");
    if (typeof drawEnemies === 'function') drawEnemies(ctx, CELL_SIZE); else console.error("drawEnemies not defined!");
    if (typeof drawPlayer === 'function') drawPlayer(ctx, CELL_SIZE); else console.error("drawPlayer not defined!");
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("drawUI not defined!");
    // console.log("--- REDRAW CANVAS END ---"); // Quieter
}

// --- AI Turn Logic --- (Function defined in ai.js)
// executeAiTurns() is called indirectly via Game.endPlayerTurn()

// --- Input Handling --- (Function defined in input.js)
// Add the event listener
if (typeof handleKeyDown === 'function') {
    window.addEventListener('keydown', handleKeyDown);
    // console.log("Input handler attached."); // Quieter
} else {
    console.error("handleKeyDown function not found! Is input.js loaded correctly?");
}


// --- Initialization ---
console.log("Initializing game...");
// Check if Game object exists before starting
if (typeof Game === 'undefined') {
     console.error("FATAL: Game object not defined! Is game.js loaded?");
     ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
     ctx.fillText('FATAL ERROR: Game object missing. Check Console.', canvas.width / 2, canvas.height / 2);
} else {
    // 1. Create Map
    // console.log("INIT: Attempting map creation..."); // Quieter
    if (!Game.isGameOver() && typeof createMapData === 'function') {
         mapData = createMapData(); // createMapData is in map.js
         // console.log("INIT: Map creation function called."); // Quieter
    } else if (!Game.isGameOver()) {
        console.error("INIT ERROR: createMapData function not found!"); mapData = []; Game.setGameOver();
    }

    // 2. Place Player
    // console.log("INIT: Attempting player placement..."); // Quieter
    const occupiedCoords = [];
    if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); // findStartPosition is in player.js
        if (startPos) {
            player.row = startPos.row; player.col = startPos.col;
            occupiedCoords.push({ row: player.row, col: player.col });
            if (!player.resources) player.resources = { scrap: 0 };
            player.hp = player.maxHp; // Reset HP
            // console.log("INIT: Player placed successfully."); // Quieter
        } else {
            console.error("INIT ERROR: Player starting position could not be set."); Game.setGameOver();
        }
    } else if (!Game.isGameOver()) {
         console.error("INIT ERROR: Player object or findStartPosition function not found!"); Game.setGameOver();
    }

    // 3. Place Enemies
    // console.log("INIT: Attempting enemy placement..."); // Quieter
    if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
        // console.log(`INIT: Placing ${NUM_ENEMIES} enemies...`); // Quieter
        for (let i = 0; i < NUM_ENEMIES; i++) {
            const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
            if (enemyStartPos) {
                const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: 5, maxHp: 5 };
                enemies.push(newEnemy); // enemies array from ai.js
                occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col });
                // console.log(`INIT: Placed enemy ${i + 1}.`); // Quieter
            } else { console.error(`INIT ERROR: Could not find valid position for enemy ${i + 1}.`); }
        }
        // console.log(`INIT: Finished placing enemies. Total placed: ${enemies.length}`); // Quieter
    } else if (!Game.isGameOver()) {
         console.error("INIT ERROR: Enemies array or findStartPosition function not found!"); Game.setGameOver();
    }

    // 4. Initial Draw
    // console.log(`INIT: Checking gameActive status via !Game.isGameOver() before initial draw: ${!Game.isGameOver()}`); // Quieter
    if (!Game.isGameOver()) {
        // console.log("INIT: Calling initial redrawCanvas()..."); // Quieter
        if (typeof redrawCanvas === 'function') { redrawCanvas(); } else { console.error("INIT ERROR: redrawCanvas function not defined!"); }
        // console.log("INIT: Initial redrawCanvas() called successfully."); // Quieter
    } else {
        console.error("INIT: Game initialization failed.");
        // Draw error message
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
        ctx.fillText('Game Initialization Failed. Check Console.', canvas.width / 2, canvas.height / 2);
    }

    console.log("INIT: Initialization sequence complete."); // Keep this
    // Final status logs (Keep these)
    if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); }
    if(typeof enemies !== 'undefined') console.log(`Placed ${enemies.length} enemies.`); else console.log("Enemies array not defined.");
    if(typeof Game !== 'undefined') console.log(`Initial Turn: ${Game.getCurrentTurn()}`); else console.log("Game object not defined.");

} // End Game object check