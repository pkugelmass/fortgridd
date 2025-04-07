// --- Start of main.js ---
console.log("SCRIPT START: Loading main.js...");

// --- Configuration ---
// Defined in config.js

// --- Game State Variables ---
// Managed by Game object in game.js
let mapData = []; // Populated here during init/reset
let currentCellSize = 0; // Holds the dynamically calculated cell size
// console.log("SCRIPT VARS: Game state managed by Game object."); // Quieter
// Player object defined in player.js
// Enemies array defined in ai.js
// Tile constants, colors, emojis defined in map.js


// --- Canvas Setup ---
// console.log("SCRIPT SETUP: Getting canvas element..."); // Quieter
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // ctx used globally by drawing functions
// console.log("SCRIPT SETUP: Canvas context obtained."); // Quieter
// Canvas dimensions are now set dynamically in resizeAndDraw function


// --- Status Bar Update Function ---
/** Updates the text content of the HTML status bar elements. */
function updateStatusBar() {
    // Check if Game object and player object are ready
    if (typeof Game === 'undefined' || typeof player === 'undefined') { return; }

    const medkitEl = document.getElementById('medkitsValue');
    const ammoEl = document.getElementById('ammoValue');
    const hpEl = document.getElementById('hpValue');
    const shrinkEl = document.getElementById('shrinkValue');

    try {
        if (medkitEl && player.resources) { medkitEl.textContent = player.resources.medkits || 0; }
        if (ammoEl && player.resources) { ammoEl.textContent = player.resources.ammo || 0; }
        if (hpEl) { hpEl.textContent = `${player.hp ?? '--'} / ${player.maxHp || '--'}`; }
        // Removed turnEl update

        // Calculate and display turns until shrink
        if (shrinkEl && typeof SHRINK_INTERVAL !== 'undefined' && SHRINK_INTERVAL > 0) {
             if(Game.isGameOver()){ shrinkEl.textContent = "N/A"; }
             else { const currentTurn = Game.getTurnNumber(); const turnsSinceLastShrink = (currentTurn - 1) % SHRINK_INTERVAL; const turnsLeft = SHRINK_INTERVAL - turnsSinceLastShrink; shrinkEl.textContent = turnsLeft; }
        } else if (shrinkEl) { shrinkEl.textContent = "N/A"; }

    } catch (error) { console.error("Error updating status bar:", error); }
    // console.log("DEBUG: updateStatusBar finished."); // Removed log
}


// --- Drawing Orchestration ---
/** Main drawing function - calls updateStatusBar */
function redrawCanvas() {
    if (!ctx || currentCellSize <= 0) { return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typeof drawMapCells === 'function') drawMapCells(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawMapCells not defined!");
    if (typeof drawGrid === 'function') drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawGrid not defined!");
    if (typeof drawEnemies === 'function') drawEnemies(ctx, currentCellSize); else console.error("ERROR: drawEnemies not defined!");
    if (typeof drawPlayer === 'function') drawPlayer(ctx, currentCellSize); else console.error("ERROR: drawPlayer not defined!");
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("ERROR: drawUI not defined!"); // Still call for Game Over overlay
    updateStatusBar(); // Ensure status bar updates after every redraw
}

// --- Resize Logic ---
/** Calculates optimal cell size, resizes canvas, and redraws. */
function resizeAndDraw() {
    // console.log("Resizing canvas..."); // Quieter
    const availableWidth = window.innerWidth - (CANVAS_PADDING * 2); const availableHeight = window.innerHeight - (CANVAS_PADDING * 2);
    const cellWidthBasedOnWindow = availableWidth / GRID_WIDTH; const cellHeightBasedOnWindow = availableHeight / GRID_HEIGHT;
    let newCellSize = Math.floor(Math.min(cellWidthBasedOnWindow, cellHeightBasedOnWindow));
    currentCellSize = Math.max(newCellSize, MIN_CELL_SIZE);
    if (currentCellSize <= 0 || !isFinite(currentCellSize) || GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) { console.error(`Resize failed: Invalid dimensions.`); currentCellSize = MIN_CELL_SIZE; if(GRID_WIDTH <= 0 || GRID_HEIGHT <= 0) return; }
    canvas.width = GRID_WIDTH * currentCellSize; canvas.height = GRID_HEIGHT * currentCellSize;
    // console.log(`Resized: CellSize=${currentCellSize}px, Canvas=${canvas.width}x${canvas.height}`); // Quieter
    if (typeof Game !== 'undefined') { if (typeof redrawCanvas === 'function') { redrawCanvas(); } else { console.error("resizeAndDraw ERROR: redrawCanvas function not defined!"); } }
    else { /* console.log("Resize skipped redraw..."); */ if (canvas.width > 0 && canvas.height > 0 && typeof Game !== 'undefined' && Game.isGameOver() && typeof drawUI === 'function'){ ctx.clearRect(0, 0, canvas.width, canvas.height); drawUI(ctx); } }
}

// --- AI Turn Logic --- (Defined in ai.js)
// --- Input Handling --- (Defined in input.js)
// Listener attached in Initialization


// --- Reset Game Logic ---
/** Resets the entire game state */
function resetGame() {
    console.log("--- GAME RESETTING ---"); // Keep reset log
    // 1. Reset Game Manager State
    if (typeof Game !== 'undefined') { Game.currentTurn = 'player'; Game.gameActive = true; Game.turnNumber = 1; Game.safeZone = { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 }; } else { console.error("RESET ERROR: Game object missing!"); return; }
    // 2. Regenerate Map
    if (typeof createMapData === 'function') { mapData = createMapData(); } else { console.error("RESET ERROR: createMapData function missing!"); Game.setGameOver(); return; }
    // 3. Reset Player
    const occupiedCoords = [];
    if (typeof player !== 'undefined' && typeof findStartPosition === 'function') { player.hp = player.maxHp || 10; player.resources = { medkits: 0, ammo: 3 }; const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); } else { console.error("RESET ERROR: Player start pos not found!"); Game.setGameOver(); return; } } else { console.error("RESET ERROR: Player object or findStartPosition missing!"); Game.setGameOver(); return; }
    // 4. Reset and Replace Enemies
    if (typeof enemies !== 'undefined' && typeof findStartPosition === 'function') { enemies.length = 0; for (let i = 0; i < NUM_ENEMIES; i++) { const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const maxHpVariation = Math.floor(Math.random() * 3) + 4; const detectionRangeVariation = Math.floor(Math.random() * 5) + 6; const startingAmmo = Math.floor(Math.random() * 2) + 1; const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: maxHpVariation, maxHp: maxHpVariation, detectionRange: detectionRangeVariation, resources: { ammo: startingAmmo }}; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); } else { console.error(`RESET ERROR: Could not find pos for enemy ${i + 1}.`); } } console.log(`INIT (Reset): Placed ${enemies.length} enemies.`); } else { console.error("RESET ERROR: Enemies array/findStartPos missing!"); Game.setGameOver(); return; }
    // 5. Perform Initial Size/Draw
    if (typeof resizeAndDraw === 'function') { resizeAndDraw(); } else { console.error("RESET ERROR: resizeAndDraw missing!"); Game.setGameOver(); }
    console.log("--- GAME RESET COMPLETE ---"); // Keep reset log
}


// --- Initialization --- (Wrapped in function, listeners only added once)
/** Runs the initial game setup */
function initializeGame() {
    console.log("Initializing game..."); // Keep init log
    if (typeof Game === 'undefined') { console.error("FATAL: Game object missing!"); if(ctx){ /* Draw fatal error */ } return false; }
    if (typeof redrawCanvas !== 'function') { console.error("FATAL: redrawCanvas missing!"); return false; }
    if (typeof resizeAndDraw !== 'function') { console.error("FATAL: resizeAndDraw missing!"); return false; }

    // 1. Create Map
    if (!Game.isGameOver() && typeof createMapData === 'function') { mapData = createMapData(); } else if (!Game.isGameOver()) { console.error("INIT ERROR: createMapData missing!"); Game.setGameOver(); return false; }
    // 2. Place Player
    const occupiedCoords = [];
    if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') { const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); if (!player.resources) player.resources = { medkits: 0, ammo: 3 }; player.hp = player.maxHp || 10; } else { console.error("INIT ERROR: Player start pos not found!"); Game.setGameOver(); return false; } } else if (!Game.isGameOver()) { console.error("INIT ERROR: Player/findStartPos missing!"); Game.setGameOver(); return false; }
    // 3. Place Enemies
    if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') { enemies.length = 0; for (let i = 0; i < NUM_ENEMIES; i++) { const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const maxHpVariation = Math.floor(Math.random() * 3) + 4; const detectionRangeVariation = Math.floor(Math.random() * 5) + 6; const startingAmmo = Math.floor(Math.random() * 2) + 1; const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: maxHpVariation, maxHp: maxHpVariation, detectionRange: detectionRangeVariation, resources: { ammo: startingAmmo }}; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); } else { console.error(`INIT ERROR: No valid position for enemy ${i + 1}.`); } } /* console.log(`INIT: Placed ${enemies.length} enemies.`); */ } else if (!Game.isGameOver()) { console.error("INIT ERROR: Enemies/findStartPos missing!"); Game.setGameOver(); return false; }
    // 4. Initial Size Calculation & Draw
    if (!Game.isGameOver()) { resizeAndDraw(); /* console.log("INIT: Initial resize and draw complete."); */ } else { console.error("INIT: Game initialization failed."); redrawCanvas(); return false; }

    // --- Attach Listeners (Only ONCE) ---
    if (!window.initListenersAttached) {
        window.addEventListener('resize', resizeAndDraw); console.log("INIT: Resize listener attached."); // Keep listener logs
        if (typeof handleKeyDown === 'function') { window.addEventListener('keydown', handleKeyDown); console.log("INIT: Input handler attached."); } else { console.error("handleKeyDown function not found!"); }
        const restartBtn = document.getElementById('restartButton'); if (restartBtn && typeof resetGame === 'function') { restartBtn.addEventListener('click', resetGame); console.log("INIT: Restart button listener attached."); } else { console.error("INIT ERROR: Restart button or resetGame function missing!"); }
        window.initListenersAttached = true;
    }

    console.log("INIT: Initialization sequence complete."); // Keep this
    // Final status logs (Keep these)
    if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); } if(typeof enemies !== 'undefined') console.log(`Placed ${enemies.length} enemies.`); else console.log("Enemies array not defined."); if(typeof Game !== 'undefined') console.log(`Initial Turn: ${Game.getCurrentTurn()}`); else console.log("Game object not defined.");
    return true;
}

// --- Start Game ---
initializeGame(); // Run the initialization sequence once on page load