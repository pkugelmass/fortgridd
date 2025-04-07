// --- Start of main.js ---
console.log("SCRIPT START: Loading main.js...");

// --- Configuration ---
// Defined in config.js

// --- Game State Variables ---
// Managed by Game object in game.js
let mapData = []; // Populated during init/reset
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

    if (currentCellSize <= 0 || !isFinite(currentCellSize) || GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) { console.error(`Resize failed: Invalid dimensions.`); currentCellSize = MIN_CELL_SIZE; if(GRID_WIDTH <= 0 || GRID_HEIGHT <= 0) return; }

    canvas.width = GRID_WIDTH * currentCellSize; canvas.height = GRID_HEIGHT * currentCellSize;
    console.log(`Resized: CellSize=${currentCellSize}px, Canvas=${canvas.width}x${canvas.height}`);

    // Redraw if game is active OR if Game object exists (to draw potential end screens)
    if (typeof Game !== 'undefined') {
        if (typeof redrawCanvas === 'function') { redrawCanvas(); }
        else { console.error("resizeAndDraw ERROR: redrawCanvas function not defined!"); }
    } else { console.log("Resize skipped redraw (Game object missing)."); }
}


// --- AI Turn Logic --- (Defined in ai.js)
// --- Input Handling --- (Defined in input.js)
// Listener attached in Initialization


// --- NEW: Reset Game Logic ---
/**
 * Resets the entire game state back to initial conditions.
 */
function resetGame() {
    console.log("--- GAME RESETTING ---");

    // 1. Reset Game Manager State
    if (typeof Game !== 'undefined') {
        Game.currentTurn = 'player'; Game.gameActive = true; Game.turnNumber = 1;
        Game.safeZone = { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 };
        console.log("INIT (Reset): Game object state reset.");
    } else { console.error("RESET ERROR: Game object missing!"); return; }

    // 2. Regenerate Map
    if (typeof createMapData === 'function') { mapData = createMapData(); console.log("INIT (Reset): Map regenerated."); }
    else { console.error("RESET ERROR: createMapData function missing!"); Game.setGameOver(); return; }

    // 3. Reset Player
    const occupiedCoords = []; // Start fresh list for this reset
    if (typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        player.hp = player.maxHp || 10; // Reset HP to max (use maxHp or default)
        player.resources = { medkits: 0, ammo: 3 }; // Reset resources
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) {
            player.row = startPos.row; player.col = startPos.col;
            occupiedCoords.push({ row: player.row, col: player.col });
            console.log("INIT (Reset): Player state reset and placed.");
        } else { console.error("RESET ERROR: Player start position not found on new map!"); Game.setGameOver(); return; }
    } else { console.error("RESET ERROR: Player object or findStartPosition missing!"); Game.setGameOver(); return; }

    // 4. Reset and Replace Enemies
    if (typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
        enemies.length = 0; // Clear the existing enemies array
        console.log(`INIT (Reset): Placing ${NUM_ENEMIES} enemies...`);
        for (let i = 0; i < NUM_ENEMIES; i++) {
            const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
            if (enemyStartPos) {
                const maxHpVariation = Math.floor(Math.random() * 3) + 4;
                const detectionRangeVariation = Math.floor(Math.random() * 5) + 6;
                const startingAmmo = Math.floor(Math.random() * 2) + 1;
                const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: maxHpVariation, maxHp: maxHpVariation, detectionRange: detectionRangeVariation, resources: { ammo: startingAmmo }};
                enemies.push(newEnemy);
                occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col });
            } else { console.error(`RESET ERROR: Could not find position for enemy ${i + 1}.`); }
        }
        console.log(`INIT (Reset): Finished placing ${enemies.length} enemies.`);
    } else { console.error("RESET ERROR: Enemies array or findStartPosition missing!"); Game.setGameOver(); return; }

    // 5. Perform Initial Size/Draw for the new game state
    if (typeof resizeAndDraw === 'function') { resizeAndDraw(); console.log("INIT (Reset): resizeAndDraw complete."); }
    else { console.error("RESET ERROR: resizeAndDraw missing!"); Game.setGameOver(); }

    console.log("--- GAME RESET COMPLETE ---");
}


// --- Initialization --- (Wrapped in a function, listeners moved inside)
function initializeGame() {
    console.log("Initializing game for the first time...");
    // Check essential dependencies early
    if (typeof Game === 'undefined') { console.error("FATAL: Game object missing!"); /* Draw error */ return false; }
    if (typeof redrawCanvas !== 'function') { console.error("FATAL: redrawCanvas missing!"); /* Draw error */ return false; }
    if (typeof resizeAndDraw !== 'function') { console.error("FATAL: resizeAndDraw missing!"); /* Draw error */ return false; }

    // 1. Create Map
    if (!Game.isGameOver() && typeof createMapData === 'function') { mapData = createMapData(); }
    else if (!Game.isGameOver()) { console.error("INIT ERROR: createMapData missing!"); Game.setGameOver(); return false; }

    // 2. Place Player
    const occupiedCoords = [];
    if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); if (!player.resources) player.resources = { medkits: 0, ammo: 3 }; player.hp = player.maxHp || 10; }
        else { console.error("INIT ERROR: Player start pos not found!"); Game.setGameOver(); return false; }
    } else if (!Game.isGameOver()) { console.error("INIT ERROR: Player/findStartPos missing!"); Game.setGameOver(); return false; }

    // 3. Place Enemies
    if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
        enemies.length = 0; // Ensure clear before placing
        for (let i = 0; i < NUM_ENEMIES; i++) {
             const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
             if (enemyStartPos) { /* ... Create and push enemy ... */ const maxHpVariation = Math.floor(Math.random() * 3) + 4; const detectionRangeVariation = Math.floor(Math.random() * 5) + 6; const startingAmmo = Math.floor(Math.random() * 2) + 1; const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: maxHpVariation, maxHp: maxHpVariation, detectionRange: detectionRangeVariation, resources: { ammo: startingAmmo }}; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); }
             else { console.error(`INIT ERROR: No valid position for enemy ${i + 1}.`); }
        }
         console.log(`INIT: Placed ${enemies.length} enemies.`);
    } else if (!Game.isGameOver()) { console.error("INIT ERROR: Enemies/findStartPos missing!"); Game.setGameOver(); return false; }

    // 4. Initial Size Calculation & Draw
    if (!Game.isGameOver()) { resizeAndDraw(); console.log("INIT: Initial resize and draw complete."); }
    else { console.error("INIT: Game initialization failed."); redrawCanvas(); /* Attempt to draw error UI */ return false; }

    // --- Attach Listeners (Do this only ONCE during initial load) ---
    // Resize Listener
    window.addEventListener('resize', resizeAndDraw);
    console.log("INIT: Resize listener attached.");
    // Input Listener
    if (typeof handleKeyDown === 'function') { window.addEventListener('keydown', handleKeyDown); console.log("INIT: Input handler attached."); }
    else { console.error("handleKeyDown function not found!"); }
    // Restart Button Listener
    const restartBtn = document.getElementById('restartButton');
    if (restartBtn && typeof resetGame === 'function') { restartBtn.addEventListener('click', resetGame); console.log("INIT: Restart button listener attached."); }
    else { console.error("INIT ERROR: Restart button or resetGame function missing!"); }

    console.log("INIT: Initialization sequence complete.");
    // Final status logs...
    return true; // Indicate success
}

// --- Start Game ---
initializeGame(); // Run the initialization sequence once on page load