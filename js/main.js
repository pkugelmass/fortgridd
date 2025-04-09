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

// --- Log Display Update Function --- (MODIFIED to use cssClass)
/** Updates the HTML log container and scrolls to bottom. */
function updateLogDisplay() {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer || typeof Game === 'undefined' || typeof Game.getLog !== 'function') { return; }
    try {
        const logEntries = Game.getLog(); // Get array of {message, cssClass} objects
        // Map entries to HTML paragraphs with optional class
        logContainer.innerHTML = logEntries.map(entry =>
             `<p class="${entry.cssClass || ''}">${entry.message}</p>`
        ).join('');
        // Force scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;
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


// --- Enemy Creation Helper ---
/**
 * Creates a single enemy with randomized stats, finds a valid starting position,
 * adds the position to occupiedCoords, and returns the enemy object.
 * Includes the initial FSM state.
 * @param {number} enemyIndex - The index for generating the enemy ID.
 * @param {Array<object>} occupiedCoords - Array of {row, col} objects to avoid placing on.
 * @returns {object|null} The created enemy object or null if placement fails.
 */
function createAndPlaceEnemy(enemyIndex, occupiedCoords) {
    if (typeof findStartPosition !== 'function' || typeof mapData === 'undefined' || typeof GRID_WIDTH === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof TILE_LAND === 'undefined') {
        console.error("createAndPlaceEnemy: Missing required functions or globals.");
        return null;
    }

    let enemyStartPos = null;
    let placementAttempts = 0;
    const maxPlacementAttempts = 50; // Limit attempts to find an accessible spot

    while (!enemyStartPos && placementAttempts < maxPlacementAttempts) {
        placementAttempts++;
        const potentialPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);

        if (potentialPos) {
            // Check if the potential position has valid moves
            const dummyEnemy = { row: potentialPos.row, col: potentialPos.col, id: `test_${enemyIndex}` }; // Need ID for getValidMoves check
            if (typeof getValidMoves === 'function') {
                const validMoves = getValidMoves(dummyEnemy);
                if (validMoves.length > 0) {
                    enemyStartPos = potentialPos; // Found an accessible spot
                    // console.log(`DEBUG: Found accessible spawn for enemy ${enemyIndex} at (${enemyStartPos.row},${enemyStartPos.col}) after ${placementAttempts} attempts.`);
                } else {
                    // console.log(`DEBUG: Spawn pos (${potentialPos.row},${potentialPos.col}) rejected, no valid moves.`);
                    // Add this inaccessible spot to occupiedCoords temporarily for the *next* findStartPosition attempt
                    // to avoid repeatedly picking the same bad spot within this loop.
                    // Note: This temporary addition doesn't persist outside this function call.
                    occupiedCoords.push({ row: potentialPos.row, col: potentialPos.col });
                }
            } else {
                console.error("createAndPlaceEnemy: getValidMoves function not found! Cannot check spawn accessibility.");
                enemyStartPos = potentialPos; // Fallback: Place anyway if check fails
            }
        } else {
            // findStartPosition failed, break the loop early
            break;
        }
    } // End while loop for finding accessible position

    if (enemyStartPos) {
        // Use constants from config.js for variation ranges (with fallbacks)
        const hpMin = AI_HP_MIN || 4; const hpMax = AI_HP_MAX || 6;
        const rangeMin = AI_RANGE_MIN || 6; const rangeMax = AI_RANGE_MAX || 10;
        const ammoMin = AI_AMMO_MIN || 1; const ammoMax = AI_AMMO_MAX || 2;

        const enemyMaxHp = Math.floor(Math.random() * (hpMax - hpMin + 1)) + hpMin;
        const enemyDetectionRange = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
        const enemyStartingAmmo = Math.floor(Math.random() * (ammoMax - ammoMin + 1)) + ammoMin;

        const newEnemy = {
            id: `enemy_${enemyIndex}`, row: enemyStartPos.row, col: enemyStartPos.col, color: ENEMY_DEFAULT_COLOR, // Use constant
            hp: enemyMaxHp, maxHp: enemyMaxHp,
            detectionRange: enemyDetectionRange,
            resources: {
                ammo: enemyStartingAmmo,
                medkits: AI_START_MEDKITS // Add starting medkits from config
            },
            state: AI_STATE_EXPLORING, // <<< Added initial state here
            targetEnemy: null, // Initialize targetEnemy property
            targetResourceCoords: null // Initialize targetResourceCoords property
        };
        occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); // Update occupied list
        return newEnemy;
    } else {
        console.error(`createAndPlaceEnemy: Could not find valid position for enemy ${enemyIndex + 1}.`);
        return null; // Indicate failure
    }
}


// --- Reset Game Logic ---
/** Resets the entire game state */
function resetGame() {
    console.log("--- GAME RESETTING ---");
    // 1. Reset Game Manager State (uses config constants implicitly via init state)
    if (typeof Game !== 'undefined') {
        Game.currentTurn = 'player'; Game.gameActive = true; Game.turnNumber = 1;
        // Use constants for grid size if needed, though likely set already
        Game.safeZone = { minRow: 0, maxRow: (GRID_HEIGHT || 25) - 1, minCol: 0, maxCol: (GRID_WIDTH || 25) - 1 };
        Game.gameLog = []; // Clear log array first
        Game.logMessage("Game Reset.", LOG_CLASS_SYSTEM); // Use logMessage with constant
    } else { console.error("RESET ERROR: Game object missing!"); return; } // Cannot proceed

    // 2. Regenerate Map (uses config constants implicitly via createMapData)
    if (typeof createMapData === 'function') {
        mapData = createMapData();
        console.log("INIT (Reset): Map regenerated.");
    } else { console.error("RESET ERROR: createMapData missing!"); Game.setGameOver(); return; }

    // 3. Reset Player (Uses config constants for starting resources/HP)
    const occupiedCoords = []; // Reset occupied list for this reset run
    if (typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        player.maxHp = PLAYER_MAX_HP || 10; // Set maxHP from config (provide fallback)
        player.hp = player.maxHp;           // Reset HP to new max
        player.resources = {
            medkits: PLAYER_START_MEDKITS || 0, // Use config
            ammo: PLAYER_START_AMMO || 3        // Use config
        };
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) {
            player.row = startPos.row; player.col = startPos.col;
            occupiedCoords.push({ row: player.row, col: player.col });
            console.log("INIT (Reset): Player state reset and placed.");
        } else {
            console.error("RESET ERROR: Player start pos not found on new map!"); Game.setGameOver(); return;
        }
    } else { console.error("RESET ERROR: Player object or findStartPosition missing!"); Game.setGameOver(); return; }

    // 4. Reset and Replace Enemies (Uses helper function)
    if (typeof enemies !== 'undefined' && typeof createAndPlaceEnemy === 'function') {
        enemies.length = 0; // Clear the existing enemies array
        const numEnemiesToPlace = NUM_ENEMIES || 3; // Use config or fallback
        console.log(`INIT (Reset): Placing ${numEnemiesToPlace} enemies...`);
        for (let i = 0; i < numEnemiesToPlace; i++) {
            const newEnemy = createAndPlaceEnemy(i, occupiedCoords); // Call helper
            if (newEnemy) {
                enemies.push(newEnemy);
            } // Error logged within helper if placement failed
        }
        console.log(`INIT (Reset): Finished placing ${enemies.length} enemies.`);
    } else { console.error("RESET ERROR: Enemies array or createAndPlaceEnemy missing!"); Game.setGameOver(); return; }

    // 5. Perform Initial Size/Draw for the new game state
    if (typeof resizeAndDraw === 'function') {
        resizeAndDraw(); // Resizes canvas and triggers redraw
        console.log("INIT (Reset): resizeAndDraw complete.");
    } else {
        console.error("RESET ERROR: resizeAndDraw missing!"); Game.setGameOver(); return;
    }

    // Update log display to show the "Game Reset" message
    if (typeof updateLogDisplay === 'function') {
        updateLogDisplay();
    }

    console.log("--- GAME RESET COMPLETE ---");
}


// --- Initialization --- (MODIFIED to use logMessage)
/** Runs the initial game setup */
function initializeGame() {
    console.log("Initializing game...");
    // Check essential dependencies early
    if (typeof Game === 'undefined' || typeof redrawCanvas !== 'function' || typeof resizeAndDraw !== 'function') {
        console.error("FATAL: Core objects/functions missing! Check script load order.");
        // Attempt to draw fatal error if possible
        if(ctx){ ctx.fillStyle = 'black'; ctx.fillRect(0, 0, 300, 150); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center'; ctx.fillText('FATAL ERROR: Core setup failed.', 150, 75); }
        return false; // Stop initialization
    }

    // 1. Create Map (Uses map gen constants from config implicitly)
    if (!Game.isGameOver() && typeof createMapData === 'function') {
        mapData = createMapData();
    } else if (!Game.isGameOver()) {
        console.error("INIT ERROR: createMapData missing!"); Game.setGameOver(); return false;
    } else { console.log("INIT: Skipping map creation (Game Over state)."); return false; } // Should not happen on first init

    // 2. Place Player (Set initial resources/HP from config)
    const occupiedCoords = [];
    if (!Game.isGameOver() && typeof player !== 'undefined' && typeof findStartPosition === 'function') {
        const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) {
            player.row = startPos.row; player.col = startPos.col;
            occupiedCoords.push({ row: player.row, col: player.col });
            // Use constants from config.js (provide fallbacks just in case)
            player.maxHp = PLAYER_MAX_HP || 10;
            player.hp = player.maxHp; // Start at full health
            player.resources = {
                medkits: PLAYER_START_MEDKITS || 0,
                ammo: PLAYER_START_AMMO || 3
            };
            console.log("INIT: Player placed successfully.");
        } else {
            console.error("INIT ERROR: Player start pos not found!"); Game.setGameOver(); return false;
        }
    } else if (!Game.isGameOver()) {
        console.error("INIT ERROR: Player object or findStartPosition missing!"); Game.setGameOver(); return false;
    } else { console.log("INIT: Skipping player placement (Game Over state)."); return false; }

    // 3. Place Enemies (Uses helper function)
    if (!Game.isGameOver() && typeof enemies !== 'undefined' && typeof createAndPlaceEnemy === 'function') {
        enemies.length = 0; // Ensure array is empty before populating
        const numEnemiesToPlace = NUM_ENEMIES || 3; // Use config or fallback
        console.log(`INIT: Placing ${numEnemiesToPlace} enemies...`);
        for (let i = 0; i < numEnemiesToPlace; i++) {
            const newEnemy = createAndPlaceEnemy(i, occupiedCoords); // Call helper
            if (newEnemy) {
                enemies.push(newEnemy);
            } // Error logged within helper if placement failed
        }
        console.log(`INIT: Placed ${enemies.length} enemies.`);
    } else if (!Game.isGameOver()) {
        console.error("INIT ERROR: Enemies array or createAndPlaceEnemy missing!"); Game.setGameOver(); return false;
    } else { console.log("INIT: Skipping enemy placement (Game Over state)."); }

    // 4. Initial Size & Draw
    if (!Game.isGameOver()) {
        resizeAndDraw(); // Handles initial sizing and drawing
        console.log("INIT: Initial resize and draw completed.");
    } else {
        console.error("INIT: Game initialization failed before initial draw.");
        redrawCanvas(); // Attempt to draw error UI
        return false;
    }

// --- 5. Attach Listeners (Only ONCE) ---
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

    // --- Toggle Log Button Listener (WITH DEBUG LOGS) ---
    const toggleLogBtn = document.getElementById('toggleLogButton');
    const logContainer = document.getElementById('logContainer');
    // Log whether elements were found during setup
    console.log("INIT: Toggle Log Button Found:", toggleLogBtn);
    console.log("INIT: Log Container Found:", logContainer);

    if (toggleLogBtn && logContainer) {
        toggleLogBtn.addEventListener('click', () => {
            // Log when the button is actually clicked
            console.log('--- Toggle Log Button CLICKED! ---');
            // Log the container element again inside the handler
            console.log('Handler: Log container element:', logContainer);
            // Log classes BEFORE toggling
            console.log('Handler: Classes BEFORE toggle:', logContainer.className);
            // Perform the toggle
            logContainer.classList.toggle('hidden');
             // Log classes AFTER toggling
            console.log('Handler: Classes AFTER toggle:', logContainer.className);
            // Log the expected state
            console.log(`Handler: Log visibility toggled. Currently hidden: ${logContainer.classList.contains('hidden')}`);
        });
        console.log("INIT: Toggle Log button listener attached successfully.");
    } else {
         // Log if setup failed
         if (!toggleLogBtn) console.error("INIT ERROR: Toggle Log button not found! Check ID 'toggleLogButton' in HTML.");
         if (!logContainer) console.error("INIT ERROR: Log container not found! Check ID 'logContainer' in HTML.");
    }
    // --- End Toggle Log Button Listener ---

    window.initListenersAttached = true; // Set flag
} else {
     console.log("INIT: Listeners already attached.");
}

    console.log("INIT: Initialization sequence complete.");
    // Final status logs & Log Game Started
    if (typeof Game !== 'undefined') { Game.logMessage("Game Started.", LOG_CLASS_SYSTEM); console.log(`Initial Turn: ${Game.getCurrentTurn()}`); } // Use constant
    else { console.log("Game object not defined."); }
    if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); }
    if(typeof enemies !== 'undefined') console.log(`Placed ${enemies.length} enemies.`);

    return true; // Indicate success
}

// --- Start Game ---
initializeGame();
