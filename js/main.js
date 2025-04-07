// --- Start of main.js ---
console.log("SCRIPT START: Loading main.js...");

// --- Configuration --- (Defined in config.js)
// --- Game State Variables --- (Managed by Game object)
let mapData = [];
let currentCellSize = 0;
// console.log("SCRIPT VARS: Game state managed by Game object.");
// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
// console.log("SCRIPT SETUP: Canvas context obtained.");


// --- Status Bar Update Function ---
/**
 * Updates the text content of the HTML status bar elements.
 */
function updateStatusBar() {
    // Check if crucial objects/functions exist first
    if (typeof Game === 'undefined' || typeof player === 'undefined' || typeof Game.getTurnNumber !== 'function' || typeof Game.isGameOver !== 'function') {
        console.warn("updateStatusBar skipped: Game or Player object/functions missing.");
        return;
    }

    // Get elements references
    const medkitEl = document.getElementById('medkitsValue');
    const ammoEl = document.getElementById('ammoValue');
    const hpEl = document.getElementById('hpValue');
    const shrinkEl = document.getElementById('shrinkValue');
    const enemiesEl = document.getElementById('enemiesValue'); // Assuming this exists from previous step

    try {
        // Update Medkits
        if (medkitEl && player.resources) { medkitEl.textContent = player.resources.medkits || 0; }
        else if (medkitEl) { medkitEl.textContent = '--'; }

        // Update Ammo
        if (ammoEl && player.resources) { ammoEl.textContent = player.resources.ammo || 0; }
        else if (ammoEl) { ammoEl.textContent = '--'; }

        // Update HP
        if (hpEl) { hpEl.textContent = `${player.hp ?? '--'} / ${player.maxHp || '--'}`; }
        else { console.warn("updateStatusBar: hpValue element missing."); }

        // Update Enemies Left
        if (enemiesEl && typeof enemies !== 'undefined') { enemiesEl.textContent = enemies.filter(e => e && e.hp > 0).length; }
        else if (enemiesEl) { enemiesEl.textContent = '--'; }
        else { console.warn("updateStatusBar: enemiesValue element missing."); }

        // --- Update Shrink Countdown ---
        if (shrinkEl) { // Check if the element itself exists first
            if (typeof SHRINK_INTERVAL !== 'undefined' && SHRINK_INTERVAL > 0) {
                if (Game.isGameOver()) {
                    shrinkEl.textContent = "N/A";
                } else {
                    const currentTurn = Game.getTurnNumber();
                    // Ensure currentTurn is a valid number before calculating
                    if (typeof currentTurn === 'number' && currentTurn > 0 && isFinite(currentTurn)) {
                        const turnsSinceLastShrink = (currentTurn - 1) % SHRINK_INTERVAL;
                        const turnsLeft = SHRINK_INTERVAL - turnsSinceLastShrink;
                        shrinkEl.textContent = turnsLeft; // Set the calculated value
                        // console.log(`DEBUG: Update Shrink - Turn: ${currentTurn}, Left: ${turnsLeft}`); // Keep commented unless needed
                    } else {
                         console.warn(`updateStatusBar: Invalid currentTurn number: ${currentTurn}`);
                         shrinkEl.textContent = "?"; // Indicate calculation issue
                    }
                }
            } else {
                 // SHRINK_INTERVAL constant might be missing or invalid
                 shrinkEl.textContent = "N/A";
                 console.warn("updateStatusBar: SHRINK_INTERVAL missing or invalid.");
            }
        } else {
             // Element with ID 'shrinkValue' was not found in HTML
             console.warn("updateStatusBar: Element with ID 'shrinkValue' not found.");
        }
        // --- End Update Shrink Countdown ---

    } catch (error) {
        console.error("Error updating status bar:", error);
    }
}

// --- Log Display Update Function --- (MODIFIED for Auto-Scroll)
/** Updates the HTML log container and scrolls to bottom. */
function updateLogDisplay() {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer || typeof Game === 'undefined' || typeof Game.getLog !== 'function') { return; }
    try {
        const messages = Game.getLog();
        logContainer.innerHTML = messages.map(msg => `<p>${msg}</p>`).join('');
        // Force scroll to bottom AFTER updating content
        logContainer.scrollTop = logContainer.scrollHeight; // <<< ADDED/ENSURED THIS LINE
    } catch (error) { console.error("Error updating log display:", error); }
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
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("ERROR: drawUI not defined!");
    updateStatusBar(); // Update HTML status bar
    // Log display updated by Game.logMessage now, not usually needed here
    // updateLogDisplay();
}

// --- Resize Logic --- (MODIFIED to set log height)
/** Calculates optimal cell size, resizes canvas AND log container, and redraws. */
function resizeAndDraw() {
    // console.log("Resizing canvas...");
    const availableWidth = window.innerWidth - (CANVAS_PADDING * 2); const availableHeight = window.innerHeight - (CANVAS_PADDING * 2);
    const cellWidthBasedOnWindow = availableWidth / GRID_WIDTH; const cellHeightBasedOnWindow = availableHeight / GRID_HEIGHT;
    let newCellSize = Math.floor(Math.min(cellWidthBasedOnWindow, cellHeightBasedOnWindow));
    currentCellSize = Math.max(newCellSize, MIN_CELL_SIZE);
    if (currentCellSize <= 0 || !isFinite(currentCellSize) || GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) { console.error(`Resize failed: Invalid dimensions.`); currentCellSize = MIN_CELL_SIZE; if(GRID_WIDTH <= 0 || GRID_HEIGHT <= 0) return; }

    // Set Canvas dimensions
    canvas.width = GRID_WIDTH * currentCellSize; canvas.height = GRID_HEIGHT * currentCellSize;
    // console.log(`Resized: CellSize=${currentCellSize}px, Canvas=${canvas.width}x${canvas.height}`);

    // --- NEW: Set Log Container Height ---
    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        logContainer.style.height = `${canvas.height}px`; // Match canvas height
        // console.log(`Set log container height to: ${canvas.height}px`); // Optional log
    }
    // --- End New Section ---

    // Redraw canvas and update UI (which now includes log via logMessage -> updateLogDisplay)
    if (typeof Game !== 'undefined') { if (typeof redrawCanvas === 'function') { redrawCanvas(); } else { console.error("resizeAndDraw ERROR: redrawCanvas function not defined!"); } }
    else { /* ... Handle missing Game object ... */ }
}


// --- AI Turn Logic --- (Defined in ai.js)
// --- Input Handling --- (Defined in input.js)

// --- Reset Game Logic --- (MODIFIED to use config constants)
/** Resets the entire game state */
function resetGame() {
    console.log("--- GAME RESETTING ---");
    // 1. Reset Game Manager State (uses config constants implicitly)
    if (typeof Game !== 'undefined') { Game.currentTurn = 'player'; Game.gameActive = true; Game.turnNumber = 1; Game.safeZone = { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 }; Game.gameLog = ["Game Reset."]; } else { return; }
    // 2. Regenerate Map (uses config constants implicitly)
    if (typeof createMapData === 'function') { mapData = createMapData(); } else { Game.setGameOver(); return; }
    // 3. Reset Player (Uses config constants)
    const occupiedCoords = [];
    if (typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        player.maxHp = PLAYER_MAX_HP || 10; // Set maxHP from config
        player.hp = player.maxHp;           // Reset HP to new max
        player.resources = {
            medkits: PLAYER_START_MEDKITS || 0, // Use config
            ammo: PLAYER_START_AMMO || 3        // Use config
        };
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); }
        else { console.error("RESET ERROR: Player start pos not found!"); Game.setGameOver(); return; }
    } else { console.error("RESET ERROR: Player/findStartPos missing!"); Game.setGameOver(); return; }
    // 4. Reset and Replace Enemies (Uses config constants)
    if (typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
        enemies.length = 0;
        for (let i = 0; i < NUM_ENEMIES; i++) { // Use NUM_ENEMIES from config
            const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
            if (enemyStartPos) {
                // Use constants from config.js for variation ranges
                const enemyMaxHp = Math.floor(Math.random() * (AI_HP_MAX - AI_HP_MIN + 1)) + AI_HP_MIN;
                const enemyDetectionRange = Math.floor(Math.random() * (AI_RANGE_MAX - AI_RANGE_MIN + 1)) + AI_RANGE_MIN;
                const enemyStartingAmmo = Math.floor(Math.random() * (AI_AMMO_MAX - AI_AMMO_MIN + 1)) + AI_AMMO_MIN;
                const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: enemyMaxHp, maxHp: enemyMaxHp, detectionRange: enemyDetectionRange, resources: { ammo: enemyStartingAmmo }};
                enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col });
            } else { /*...*/ }
        }
        console.log(`INIT (Reset): Placed ${enemies.length} enemies.`);
    } else { /*...*/ return; }
    // 5. Perform Initial Size/Draw
    if (typeof resizeAndDraw === 'function') { resizeAndDraw(); } else { /*...*/ return; }
    if (typeof updateLogDisplay === 'function') { updateLogDisplay(); }
    console.log("--- GAME RESET COMPLETE ---");
}

// --- Initialization ---
/** Runs the initial game setup */
function initializeGame() {
    console.log("Initializing game...");
    if (typeof Game === 'undefined' || typeof redrawCanvas !== 'function' || typeof resizeAndDraw !== 'function') { console.error("FATAL: Core objects/functions missing!"); return false; }

    // 1. Create Map, 2. Place Player, 3. Place Enemies (Full logic assumed here)
    if (!Game.isGameOver() && typeof createMapData === 'function') { mapData = createMapData(); } else if (!Game.isGameOver()) { console.error("INIT ERROR: createMapData missing!"); Game.setGameOver(); return false; } const occupiedCoords = []; if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') { const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); player.maxHp = PLAYER_MAX_HP || 10; player.hp = player.maxHp; player.resources = { medkits: PLAYER_START_MEDKITS || 0, ammo: PLAYER_START_AMMO || 3 }; console.log("INIT: Player placed."); } else { console.error("INIT ERROR: Player start pos not found!"); Game.setGameOver(); return false; } } else if (!Game.isGameOver()) { console.error("INIT ERROR: Player/findStartPos missing!"); Game.setGameOver(); return false; } if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') { enemies.length = 0; for (let i = 0; i < NUM_ENEMIES; i++) { const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const enemyMaxHp = Math.floor(Math.random() * (AI_HP_MAX - AI_HP_MIN + 1)) + AI_HP_MIN; const enemyDetectionRange = Math.floor(Math.random() * (AI_RANGE_MAX - AI_RANGE_MIN + 1)) + AI_RANGE_MIN; const enemyStartingAmmo = Math.floor(Math.random() * (AI_AMMO_MAX - AI_AMMO_MIN + 1)) + AI_AMMO_MIN; const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: enemyMaxHp, maxHp: enemyMaxHp, detectionRange: enemyDetectionRange, resources: { ammo: enemyStartingAmmo }}; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); } else { console.error(`INIT ERROR: No valid position for enemy ${i + 1}.`); } } console.log(`INIT: Placed ${enemies.length} enemies.`); } else if (!Game.isGameOver()) { console.error("INIT ERROR: Enemies/findStartPos missing!"); Game.setGameOver(); return false; }

    // 4. Initial Size & Draw
    if (!Game.isGameOver()) { resizeAndDraw(); }
    else { console.error("INIT: Game initialization failed."); redrawCanvas(); return false; }

    // --- Attach Listeners (Only ONCE) ---
    if (!window.initListenersAttached) {
        console.log("INIT: Attaching listeners...");
        // Resize Listener
        if (typeof resizeAndDraw === 'function') { window.addEventListener('resize', resizeAndDraw); console.log("INIT: Resize listener attached."); }
        else { console.error("INIT ERROR: Cannot attach resize listener.") }
        // Input Listener
        if (typeof handleKeyDown === 'function') { window.addEventListener('keydown', handleKeyDown); console.log("INIT: Input handler attached."); }
        else { console.error("handleKeyDown function not found!"); }
        // Restart Button Listener
        const restartBtn = document.getElementById('restartButton');
        if (restartBtn && typeof resetGame === 'function') { restartBtn.addEventListener('click', resetGame); console.log("INIT: Restart button listener attached."); }
        else { console.error("INIT ERROR: Restart button or resetGame function missing!"); }

        // --- NEW: Toggle Log Button Listener ---
        const toggleLogBtn = document.getElementById('toggleLogButton');
        const logContainer = document.getElementById('logContainer');
        if (toggleLogBtn && logContainer) {
            toggleLogBtn.addEventListener('click', () => {
                logContainer.classList.toggle('hidden'); // Add or remove the 'hidden' class
                console.log(`Log visibility toggled. Currently hidden: ${logContainer.classList.contains('hidden')}`);
            });
            console.log("INIT: Toggle Log button listener attached.");
        } else if (!toggleLogBtn) { console.error("INIT ERROR: Toggle Log button not found!"); }
          else { console.error("INIT ERROR: Log container not found for toggle!"); }
        // --- End New Section ---

        window.initListenersAttached = true; // Set flag
    } else {
         console.log("INIT: Listeners already attached.");
    }

    console.log("INIT: Initialization sequence complete.");
    // Final status logs...
    if (typeof Game !== 'undefined') Game.logMessage("Game Started.");
    return true;
}

// --- Start Game ---
initializeGame();