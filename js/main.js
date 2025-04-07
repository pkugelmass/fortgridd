// --- Start of main.js ---
console.log("SCRIPT START: Loading main.js...");

// --- Configuration --- (Defined in config.js)
// --- Game State Variables --- (Managed by Game object)
let mapData = [];
let currentCellSize = 0;
// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
// Canvas dimensions set by resizeAndDraw

// --- Status Bar Update Function ---
/** Updates the HTML status bar */
function updateStatusBar() {
    if (typeof Game === 'undefined' || typeof player === 'undefined') { return; }
    const medkitEl = document.getElementById('medkitsValue'); const ammoEl = document.getElementById('ammoValue'); const hpEl = document.getElementById('hpValue'); const shrinkEl = document.getElementById('shrinkValue');
    try {
        if (medkitEl && player.resources) { medkitEl.textContent = player.resources.medkits || 0; }
        if (ammoEl && player.resources) { ammoEl.textContent = player.resources.ammo || 0; }
        if (hpEl) { hpEl.textContent = `${player.hp ?? '--'} / ${player.maxHp || '--'}`; }
        if (shrinkEl && typeof SHRINK_INTERVAL !== 'undefined' && SHRINK_INTERVAL > 0) { if(Game.isGameOver()){ shrinkEl.textContent = "N/A"; } else { const currentTurn = Game.getTurnNumber(); const turnsSinceLastShrink = (currentTurn - 1) % SHRINK_INTERVAL; const turnsLeft = SHRINK_INTERVAL - turnsSinceLastShrink; shrinkEl.textContent = turnsLeft; } } else if (shrinkEl) { shrinkEl.textContent = "N/A"; }
    } catch (error) { console.error("Error updating status bar:", error); }
}

// --- Log Display Update Function --- (NEW)
/** Updates the HTML log container with messages from Game.gameLog. */
function updateLogDisplay() {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer || typeof Game === 'undefined' || typeof Game.getLog !== 'function') { return; }
    try {
        const messages = Game.getLog();
        // Newest messages are at the start of gameLog array
        // HTML is built top-down, CSS flex-direction: column-reverse shows newest at bottom.
        logContainer.innerHTML = messages.map(msg => `<p>${msg}</p>`).join('');
    } catch (error) { console.error("Error updating log display:", error); }
}

// --- Drawing Orchestration ---
/** Main drawing function - calls updateStatusBar and updateLogDisplay */
function redrawCanvas() {
    if (!ctx || currentCellSize <= 0) { return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typeof drawMapCells === 'function') drawMapCells(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawMapCells not defined!");
    if (typeof drawGrid === 'function') drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize); else console.error("ERROR: drawGrid not defined!");
    if (typeof drawEnemies === 'function') drawEnemies(ctx, currentCellSize); else console.error("ERROR: drawEnemies not defined!");
    if (typeof drawPlayer === 'function') drawPlayer(ctx, currentCellSize); else console.error("ERROR: drawPlayer not defined!");
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("ERROR: drawUI not defined!");
    updateStatusBar();
    updateLogDisplay(); // <<< CALL ADDED HERE
}

// --- Resize Logic ---
/** Calculates optimal cell size, resizes canvas, and redraws. */
function resizeAndDraw() {
    const availableWidth = window.innerWidth - (CANVAS_PADDING * 2); const availableHeight = window.innerHeight - (CANVAS_PADDING * 2);
    const cellWidthBasedOnWindow = availableWidth / GRID_WIDTH; const cellHeightBasedOnWindow = availableHeight / GRID_HEIGHT;
    let newCellSize = Math.floor(Math.min(cellWidthBasedOnWindow, cellHeightBasedOnWindow));
    currentCellSize = Math.max(newCellSize, MIN_CELL_SIZE);
    if (currentCellSize <= 0 || !isFinite(currentCellSize) || GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) { console.error(`Resize failed.`); currentCellSize = MIN_CELL_SIZE; if(GRID_WIDTH <= 0 || GRID_HEIGHT <= 0) return; }
    canvas.width = GRID_WIDTH * currentCellSize; canvas.height = GRID_HEIGHT * currentCellSize;
    if (typeof Game !== 'undefined') { if (typeof redrawCanvas === 'function') { redrawCanvas(); } else { console.error("redrawCanvas missing!"); } }
    else { if (canvas.width > 0 && canvas.height > 0 && typeof Game !== 'undefined' && Game.isGameOver() && typeof drawUI === 'function'){ ctx.clearRect(0, 0, canvas.width, canvas.height); drawUI(ctx); } }
}

// --- AI Turn Logic --- (Defined in ai.js)
// --- Input Handling --- (Defined in input.js)
// --- Reset Game Logic ---
/** Resets the entire game state */
function resetGame() {
    console.log("--- GAME RESETTING ---");
    if (typeof Game !== 'undefined') { Game.currentTurn = 'player'; Game.gameActive = true; Game.turnNumber = 1; Game.safeZone = { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 }; Game.gameLog = [`Turn 1 begins.`]; console.log("INIT (Reset): Game object state reset."); } else { return; } // Reset Log
    if (typeof createMapData === 'function') { mapData = createMapData(); } else { console.error("RESET ERROR: createMapData missing!"); Game.setGameOver(); return; }
    const occupiedCoords = [];
    if (typeof player !== 'undefined' && typeof findStartPosition === 'function') { player.hp = player.maxHp || 10; player.resources = { medkits: 0, ammo: 3 }; const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); } else { console.error("RESET ERROR: Player start pos not found!"); Game.setGameOver(); return; } } else { console.error("RESET ERROR: Player/findStartPos missing!"); Game.setGameOver(); return; }
    if (typeof enemies !== 'undefined' && typeof findStartPosition === 'function') { enemies.length = 0; for (let i = 0; i < NUM_ENEMIES; i++) { const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const maxHpVariation = Math.floor(Math.random() * 3) + 4; const detectionRangeVariation = Math.floor(Math.random() * 5) + 6; const startingAmmo = Math.floor(Math.random() * 2) + 1; const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: maxHpVariation, maxHp: maxHpVariation, detectionRange: detectionRangeVariation, resources: { ammo: startingAmmo }}; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); } else { console.error(`RESET ERROR: Could not find pos for enemy ${i + 1}.`); } } console.log(`INIT (Reset): Placed ${enemies.length} enemies.`); } else { console.error("RESET ERROR: Enemies/findStartPos missing!"); Game.setGameOver(); return; }
    if (typeof resizeAndDraw === 'function') { resizeAndDraw(); } else { console.error("RESET ERROR: resizeAndDraw missing!"); Game.setGameOver(); }
    console.log("--- GAME RESET COMPLETE ---");
}

// --- Initialization ---
/** Runs the initial game setup */
function initializeGame() {
    console.log("Initializing game..."); // Keep essential logs
    if (typeof Game === 'undefined' || typeof redrawCanvas !== 'function' || typeof resizeAndDraw !== 'function') { console.error("FATAL: Core objects/functions missing!"); return false; }
    // 1. Create Map, 2. Place Player, 3. Place Enemies (Assume full logic inside)
    if (!Game.isGameOver() && typeof createMapData === 'function') { mapData = createMapData(); } else if (!Game.isGameOver()) { console.error("INIT ERROR: createMapData missing!"); Game.setGameOver(); return false; } const occupiedCoords = []; if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') { const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); if (!player.resources) player.resources = { medkits: 0, ammo: 3 }; player.hp = player.maxHp || 10; } else { console.error("INIT ERROR: Player start pos not found!"); Game.setGameOver(); return false; } } else if (!Game.isGameOver()) { console.error("INIT ERROR: Player/findStartPos missing!"); Game.setGameOver(); return false; } if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') { enemies.length = 0; for (let i = 0; i < NUM_ENEMIES; i++) { const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const maxHpVariation = Math.floor(Math.random() * 3) + 4; const detectionRangeVariation = Math.floor(Math.random() * 5) + 6; const startingAmmo = Math.floor(Math.random() * 2) + 1; const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: maxHpVariation, maxHp: maxHpVariation, detectionRange: detectionRangeVariation, resources: { ammo: startingAmmo }}; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); } else { console.error(`INIT ERROR: No valid position for enemy ${i + 1}.`); } } console.log(`INIT: Placed ${enemies.length} enemies.`); } else if (!Game.isGameOver()) { console.error("INIT ERROR: Enemies/findStartPos missing!"); Game.setGameOver(); return false; }
    // 4. Initial Size & Draw
    if (!Game.isGameOver()) { resizeAndDraw(); } else { console.error("INIT: Game initialization failed."); redrawCanvas(); return false; }
    // 5. Attach Listeners (Once)
    if (!window.initListenersAttached) { window.addEventListener('resize', resizeAndDraw); console.log("INIT: Resize listener attached."); if (typeof handleKeyDown === 'function') { window.addEventListener('keydown', handleKeyDown); console.log("INIT: Input handler attached."); } else { console.error("handleKeyDown function not found!"); } const restartBtn = document.getElementById('restartButton'); if (restartBtn && typeof resetGame === 'function') { restartBtn.addEventListener('click', resetGame); console.log("INIT: Restart button listener attached."); } else { console.error("INIT ERROR: Restart button or resetGame function missing!"); } window.initListenersAttached = true; }
    console.log("INIT: Initialization sequence complete."); // Keep this
    // Final status logs (Keep these)
    if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); } if(typeof enemies !== 'undefined') console.log(`Placed ${enemies.length} enemies.`); else console.log("Enemies array not defined."); if(typeof Game !== 'undefined') { Game.logMessage("Game Started."); console.log(`Initial Turn: ${Game.getCurrentTurn()}`); } else { console.log("Game object not defined."); }
    return true;
}

// --- Start Game ---
initializeGame();