// --- Start of main.js ---
console.log("SCRIPT START: Loading main.js...");

// --- Configuration ---
// Defined in config.js

// --- Game State Variables ---
// Managed by Game object in game.js
let mapData = []; // Populated here during init
let currentCellSize = 0; // Holds the dynamically calculated cell size
console.log("SCRIPT VARS: Game state managed by Game object.");
// Player object defined in player.js
// Enemies array defined in ai.js
// Tile constants, colors, emojis defined in map.js


// --- Canvas Setup ---
console.log("SCRIPT SETUP: Getting canvas element...");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // ctx used globally by drawing functions
console.log("SCRIPT SETUP: Canvas context obtained.");
// Canvas dimensions are now set dynamically in resizeAndDraw function


// --- Drawing Orchestration --- (Calls functions defined in drawing.js)
/** Main drawing function */
function redrawCanvas() {
    if (!ctx) { console.error("FATAL: ctx missing in redrawCanvas!"); return; }
    if (currentCellSize <= 0) { console.warn("redrawCanvas WARNING: currentCellSize invalid!", currentCellSize); return;}

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (typeof drawMapCells === 'function') drawMapCells(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawMapCells not defined!");
    if (typeof drawGrid === 'function') drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawGrid not defined!");
    if (typeof drawEnemies === 'function') drawEnemies(ctx, currentCellSize); else console.error("ERROR: drawEnemies not defined!");
    if (typeof drawPlayer === 'function') drawPlayer(ctx, currentCellSize); else console.error("ERROR: drawPlayer not defined!");
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("ERROR: drawUI not defined!");
}

// --- Resize Logic ---
/** Calculates optimal cell size, resizes canvas, and redraws. */
function resizeAndDraw() {
    console.log("Resizing canvas...");
    const availableWidth = window.innerWidth - (CANVAS_PADDING * 2);
    const availableHeight = window.innerHeight - (CANVAS_PADDING * 2);
    const cellWidthBasedOnWindow = availableWidth / GRID_WIDTH;
    const cellHeightBasedOnWindow = availableHeight / GRID_HEIGHT;
    let newCellSize = Math.floor(Math.min(cellWidthBasedOnWindow, cellHeightBasedOnWindow));
    currentCellSize = Math.max(newCellSize, MIN_CELL_SIZE);

    if (currentCellSize <= 0 || !isFinite(currentCellSize) || GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) {
        console.error(`Resize failed: Invalid calculated dimensions. Cell: ${currentCellSize}, Grid: ${GRID_WIDTH}x${GRID_HEIGHT}. Using minimum.`);
        currentCellSize = MIN_CELL_SIZE;
        if(GRID_WIDTH <= 0 || GRID_HEIGHT <= 0) return;
    }

    canvas.width = GRID_WIDTH * currentCellSize;
    canvas.height = GRID_HEIGHT * currentCellSize;
    console.log(`Resized: CellSize=${currentCellSize}px, Canvas=${canvas.width}x${canvas.height}`);

    if (typeof Game !== 'undefined' && !Game.isGameOver()) {
        if (typeof redrawCanvas === 'function') { redrawCanvas(); }
        else { console.error("resizeAndDraw ERROR: redrawCanvas function not defined!"); }
    } else {
        console.log("Resize skipped redraw (Game not active or Game object missing).");
         if (canvas.width > 0 && canvas.height > 0 && typeof Game !== 'undefined' && Game.isGameOver() && typeof drawUI === 'function'){
             ctx.clearRect(0, 0, canvas.width, canvas.height); drawUI(ctx);
         }
    }
}


// --- AI Turn Logic --- (Function defined in ai.js)
// --- Input Handling --- (Function defined in input.js)
if (typeof handleKeyDown === 'function') { window.addEventListener('keydown', handleKeyDown); console.log("Input handler attached."); }
else { console.error("handleKeyDown function not found!"); }


// --- Initialization ---
console.log("Initializing game...");
if (typeof Game === 'undefined') {
    console.error("FATAL: Game object not defined! Is game.js loaded?");
     if(ctx){ ctx.fillStyle = 'black'; ctx.fillRect(0, 0, 300, 150); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center'; ctx.fillText('FATAL ERROR: Game object missing.', 150, 75); }
} else {
    // 1. Create Map
    if (!Game.isGameOver() && typeof createMapData === 'function') { mapData = createMapData(); }
    else if (!Game.isGameOver()) { console.error("INIT ERROR: createMapData function not found!"); Game.setGameOver(); }

    // 2. Place Player
    const occupiedCoords = [];
    if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); if (!player.resources) player.resources = { medkits: 0, ammo: 3 }; /* Give player ammo too */ player.hp = player.maxHp; console.log("INIT: Player placed."); } // Initialized player resources here fully
        else { console.error("INIT ERROR: Player starting position could not be set."); Game.setGameOver(); }
    } else if (!Game.isGameOver()) { console.error("INIT ERROR: Player object/findStartPosition missing!"); Game.setGameOver(); }

    // 3. Place Enemies (MODIFIED with Ammo)
    console.log("INIT: Attempting enemy placement with variations...");
    if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
        console.log(`INIT: Placing ${NUM_ENEMIES} enemies...`);
        enemies.length = 0; // Clear enemies array before placing new ones
        for (let i = 0; i < NUM_ENEMIES; i++) {
            const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
            if (enemyStartPos) {
                // Add Variations
                const maxHpVariation = Math.floor(Math.random() * 3) + 4; // 4-6 HP
                const detectionRangeVariation = Math.floor(Math.random() * 5) + 6; // 6-10 Range
                const startingAmmo = Math.floor(Math.random() * 2) + 1; // Start with 1 or 2 ammo

                const newEnemy = {
                    id: `enemy_${i}`,
                    row: enemyStartPos.row,
                    col: enemyStartPos.col,
                    color: '#ff0000',
                    hp: maxHpVariation,
                    maxHp: maxHpVariation,
                    detectionRange: detectionRangeVariation,
                    resources: { ammo: startingAmmo } // *** ADDED STARTING AMMO ***
                    // radiusMultiplier: 1.0 + (maxHpVariation - 5) * 0.05 // Optional size variation
                };
                enemies.push(newEnemy);
                occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col });
                console.log(`INIT: Placed enemy ${i + 1} (HP:${newEnemy.hp}, Range:${newEnemy.detectionRange}, Ammo:${newEnemy.resources.ammo})`);
            } else { console.error(`INIT ERROR: Could not find valid position for enemy ${i + 1}.`); }
        }
        console.log(`INIT: Finished placing enemies. Total placed: ${enemies.length}`);
    } else if (!Game.isGameOver()) { console.error("INIT ERROR: Enemies array/findStartPosition missing!"); Game.setGameOver(); }

    // 4. Initial Size Calculation & Draw
    if (!Game.isGameOver()) {
        if (typeof resizeAndDraw === 'function') { resizeAndDraw(); console.log("INIT: Initial resize and draw complete."); }
        else { console.error("INIT ERROR: resizeAndDraw missing!"); Game.setGameOver(); }
    } else {
        console.error("INIT: Game initialization failed.");
         if(ctx) { /* Draw init failure message */ }
    }

    // 5. Add Resize Listener
     if (typeof resizeAndDraw === 'function') { window.addEventListener('resize', resizeAndDraw); console.log("INIT: Resize listener attached."); }
     else { console.error("INIT ERROR: Cannot attach resize listener.") }

    console.log("INIT: Initialization sequence complete.");
    // Final status logs...
    if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); }
    if(typeof enemies !== 'undefined') console.log(`Placed ${enemies.length} enemies.`); else console.log("Enemies array not defined.");
    if(typeof Game !== 'undefined') console.log(`Initial Turn: ${Game.getCurrentTurn()}`); else console.log("Game object not defined.");

} // End Game object check