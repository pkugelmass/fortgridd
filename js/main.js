// --- Start of main.js ---
console.log("SCRIPT START: Loading main.js...");

// --- Configuration ---
// Defined in config.js (GRID_WIDTH, GRID_HEIGHT, CELL_SIZE placeholder, MIN_CELL_SIZE, CANVAS_PADDING, etc.)

// --- Game State Variables ---
// Managed by Game object in game.js
let mapData = []; // Populated here during init
let currentCellSize = 0; // NEW: Holds the dynamically calculated cell size

// --- Canvas Setup ---
console.log("SCRIPT SETUP: Getting canvas element...");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // ctx used globally by drawing functions
console.log("SCRIPT SETUP: Canvas context obtained.");
// Canvas dimensions are now set dynamically in resizeAndDraw function


// --- Drawing Orchestration ---
/**
 * Main drawing function (clears canvas and calls individual draw functions).
 * Relies on global draw... functions defined in drawing.js
 */
function redrawCanvas() {
    // Verify context exists and cell size is valid
    if (!ctx) { console.error("FATAL: ctx missing in redrawCanvas!"); return; }
    if (currentCellSize <= 0) { console.warn("redrawCanvas WARNING: currentCellSize invalid!", currentCellSize); return;} // Changed to Warn

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pass the dynamically calculated cell size to drawing functions
    if (typeof drawMapCells === 'function') drawMapCells(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawMapCells not defined!");
    if (typeof drawGrid === 'function') drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawGrid not defined!");
    if (typeof drawEnemies === 'function') drawEnemies(ctx, currentCellSize); else console.error("ERROR: drawEnemies not defined!");
    if (typeof drawPlayer === 'function') drawPlayer(ctx, currentCellSize); else console.error("ERROR: drawPlayer not defined!");
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("ERROR: drawUI not defined!");
}

// --- Resize Logic ---
/**
 * Calculates optimal cell size, resizes canvas, and redraws.
 */
function resizeAndDraw() {
    console.log("Resizing canvas...");
    // Get available window space, considering padding (constants from config.js)
    const availableWidth = window.innerWidth - (CANVAS_PADDING * 2);
    const availableHeight = window.innerHeight - (CANVAS_PADDING * 2);

    // Calculate cell size based on fitting the grid in available space
    const cellWidthBasedOnWindow = availableWidth / GRID_WIDTH;
    const cellHeightBasedOnWindow = availableHeight / GRID_HEIGHT;

    // Use the smaller of the two to maintain aspect ratio and fit
    let newCellSize = Math.floor(Math.min(cellWidthBasedOnWindow, cellHeightBasedOnWindow));

    // Enforce minimum cell size (constant from config.js)
    currentCellSize = Math.max(newCellSize, MIN_CELL_SIZE); // Update global variable

    // Check if calculated size is valid before setting canvas dimensions
    if (currentCellSize <= 0 || !isFinite(currentCellSize)) {
        console.error(`Resize failed: Invalid calculated cellSize ${currentCellSize}. Using minimum.`);
        currentCellSize = MIN_CELL_SIZE; // Fallback to minimum
    }
     if (GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) {
        console.error(`Resize failed: Invalid GRID_WIDTH/HEIGHT ${GRID_WIDTH}x${GRID_HEIGHT}.`);
        return; // Cannot resize canvas
    }


    // Set the actual canvas dimensions
    canvas.width = GRID_WIDTH * currentCellSize;
    canvas.height = GRID_HEIGHT * currentCellSize;

    console.log(`Resized: CellSize=${currentCellSize}px, Canvas=${canvas.width}x${canvas.height}`);

    // Ensure game is active before redrawing (prevents drawing during failed init)
    if (typeof Game !== 'undefined' && !Game.isGameOver()) {
        if (typeof redrawCanvas === 'function') {
             redrawCanvas();
        } else {
             console.error("resizeAndDraw ERROR: redrawCanvas function not defined!");
        }
    } else {
        console.log("Resize skipped redraw (Game not active or Game object missing).");
         // Optional: Draw an initial error or loading screen if needed here too
         // Example: Draw "Game Over" if applicable and canvas is valid
         if (canvas.width > 0 && canvas.height > 0 && typeof Game !== 'undefined' && Game.isGameOver() && typeof drawUI === 'function'){
             ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear first
             drawUI(ctx); // Attempt to draw final UI state
         }
    }
}


// --- AI Turn Logic --- (Function defined in ai.js)
// --- Input Handling --- (Function defined in input.js)
// Add the event listener
if (typeof handleKeyDown === 'function') {
    window.addEventListener('keydown', handleKeyDown);
    console.log("Input handler attached.");
} else {
    console.error("handleKeyDown function not found! Is input.js loaded correctly?");
}


// --- Initialization ---
console.log("Initializing game...");
// Check if Game object exists before starting
if (typeof Game === 'undefined') {
     console.error("FATAL: Game object not defined! Is game.js loaded?");
     // Draw critical error message if ctx is available
     if (ctx) {
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width || 300, canvas.height || 150); // Use default size if canvas failed
        ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
        ctx.fillText('FATAL ERROR: Game object missing. Check Console.', (canvas.width || 300) / 2, (canvas.height || 150) / 2);
     }
} else {
    // Proceed with initialization only if Game exists

    // 1. Create Map
    console.log("INIT: Attempting map creation...");
    // Use Game.isGameOver() which checks !Game.gameActive
    if (!Game.isGameOver() && typeof createMapData === 'function') {
         mapData = createMapData(); // createMapData is in map.js
         console.log("INIT: Map creation successful.");
    } else if (!Game.isGameOver()) { // Only log error if game was supposed to be active
        console.error("INIT ERROR: createMapData function not found!"); mapData = []; Game.setGameOver(); // Use Game manager
    } else { console.log("INIT: Skipping map creation as game is already over.");}


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
            player.hp = player.maxHp; // Reset HP
            console.log("INIT: Player placed successfully.");
        } else {
            console.error("INIT ERROR: Player starting position could not be set."); Game.setGameOver(); // Use Game manager
        }
    } else if (!Game.isGameOver()) {
         console.error("INIT ERROR: Player object or findStartPosition function not found!"); Game.setGameOver(); // Use Game manager
    } else { console.log("INIT: Skipping player placement as game is already over or dependencies missing.");}

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
                // console.log(`INIT: Placed enemy ${i + 1}.`); // Quieter log
            } else { console.error(`INIT ERROR: Could not find valid position for enemy ${i + 1}.`); }
        }
        console.log(`INIT: Finished placing enemies. Total placed: ${enemies.length}`);
    } else if (!Game.isGameOver()) {
         console.error("INIT ERROR: Enemies array or findStartPosition function not found!"); Game.setGameOver(); // Use Game manager
    } else { console.log("INIT: Skipping enemy placement as game is already over or dependencies missing."); }

    // 4. Initial Size Calculation & Draw
    console.log(`INIT: Checking gameActive status via !Game.isGameOver() before initial draw: ${!Game.isGameOver()}`);
    if (!Game.isGameOver()) {
        console.log("INIT: Calling initial resizeAndDraw()...");
        if (typeof resizeAndDraw === 'function') {
             resizeAndDraw(); // Perform initial sizing and drawing
             console.log("INIT: Initial resize and draw complete.");
        } else {
             console.error("INIT ERROR: resizeAndDraw function not defined!");
             // Draw critical error
             ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width || 300, canvas.height || 150); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
             ctx.fillText('FATAL ERROR: Resize function missing.', (canvas.width || 300) / 2, (canvas.height || 150) / 2);
             Game.setGameOver(); // Prevent further actions
        }
    } else {
        console.error("INIT: Game initialization failed. Attempting to draw final state.");
        // Attempt to draw final state even if init failed (e.g., Game Over screen)
        if (typeof redrawCanvas === 'function') redrawCanvas();
        else { // Fallback if redrawCanvas itself is missing
             ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width || 300, canvas.height || 150); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center';
             ctx.fillText('Game Initialization Failed. Check Console.', (canvas.width || 300) / 2, (canvas.height || 150) / 2);
        }
    }

    // 5. Add Resize Listener for dynamic changes AFTER initial setup
     if (typeof resizeAndDraw === 'function') {
         window.addEventListener('resize', resizeAndDraw);
         console.log("INIT: Resize listener attached.");
     } else {
         console.error("INIT ERROR: Cannot attach resize listener, resizeAndDraw is missing.")
     }


    console.log("INIT: Initialization sequence complete.");
    // Final status logs
    if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); }
    if(typeof enemies !== 'undefined') console.log(`Placed ${enemies.length} enemies.`); else console.log("Enemies array not defined.");
    if(typeof Game !== 'undefined') console.log(`Initial Turn: ${Game.getCurrentTurn()}`); else console.log("Game object not defined.");

} // End Game object check