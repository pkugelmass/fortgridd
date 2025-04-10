// UI Module: Handles DOM updates, event listeners, and drawing orchestration related to UI.
console.log("ui.js loaded");

// --- Status Bar Update Function --- (Moved from main.js)
/**
 * Updates the text content of the HTML status bar elements based on gameState.
 * @param {GameState} gameState - The current game state object.
 */
function updateStatusBar(gameState) {
    // Check if crucial objects/functions exist first
    if (!gameState || typeof Game === 'undefined' || !gameState.player || typeof Game.getTurnNumber !== 'function' || typeof Game.isGameOver !== 'function') {
        console.warn("updateStatusBar skipped: gameState, Game object, player, or required functions missing.");
        return;
    }

    // Get elements references
    const medkitEl = document.getElementById('medkitsValue');
    const ammoEl = document.getElementById('ammoValue');
    const hpEl = document.getElementById('hpValue');
    const shrinkEl = document.getElementById('shrinkValue');
    const enemiesEl = document.getElementById('enemiesValue');

    try {
        // Update Medkits (from gameState.player)
        if (medkitEl && gameState.player.resources) { medkitEl.textContent = gameState.player.resources.medkits || 0; }
        else if (medkitEl) { medkitEl.textContent = '--'; }

        // Update Ammo (from gameState.player)
        if (ammoEl && gameState.player.resources) { ammoEl.textContent = gameState.player.resources.ammo || 0; }
        else if (ammoEl) { ammoEl.textContent = '--'; }

        // Update HP (from gameState.player)
        if (hpEl) { hpEl.textContent = `${gameState.player.hp ?? '--'} / ${gameState.player.maxHp || '--'}`; }
        else { console.warn("updateStatusBar: hpValue element missing."); }

        // Update Enemies Left (from gameState.enemies)
        if (enemiesEl && gameState.enemies) { enemiesEl.textContent = gameState.enemies.filter(e => e && e.hp > 0).length; }
        else if (enemiesEl) { enemiesEl.textContent = '--'; }
        else { console.warn("updateStatusBar: enemiesValue element missing."); }

        // --- Update Shrink Countdown ---
        if (shrinkEl) {
            if (typeof SHRINK_INTERVAL !== 'undefined' && SHRINK_INTERVAL > 0) {
                if (Game.isGameOver(gameState)) { // Use Game method with gameState
                    shrinkEl.textContent = "N/A";
                } else {
                    const currentTurn = Game.getTurnNumber(gameState); // Use Game method with gameState
                    if (typeof currentTurn === 'number' && currentTurn > 0 && isFinite(currentTurn)) {
                        const turnsSinceLastShrink = (currentTurn - 1) % SHRINK_INTERVAL;
                        const turnsLeft = SHRINK_INTERVAL - turnsSinceLastShrink;
                        shrinkEl.textContent = turnsLeft;
                    } else {
                         console.warn(`updateStatusBar: Invalid currentTurn number from gameState: ${currentTurn}`);
                         shrinkEl.textContent = "?";
                    }
                }
            } else {
                 shrinkEl.textContent = "N/A";
                 console.warn("updateStatusBar: SHRINK_INTERVAL missing or invalid.");
            }
        } else {
             console.warn("updateStatusBar: Element with ID 'shrinkValue' not found.");
        }
        // --- End Update Shrink Countdown ---

    } catch (error) {
        console.error("Error updating status bar:", error);
    }
}

// --- Log Display Update Function --- (Moved from main.js)
/**
 * Updates the HTML log container based on gameState and scrolls to bottom.
 * @param {GameState} gameState - The current game state object.
 */
function updateLogDisplay(gameState) {
    const logContainer = document.getElementById('logContainer');
    if (!logContainer || !gameState || typeof Game === 'undefined' || typeof Game.getLog !== 'function') { return; }
    try {
        const logEntries = Game.getLog(gameState); // Get log from gameState via Game method
        logContainer.innerHTML = logEntries.map(entry =>
             `<p class="${entry.cssClass || ''}">${entry.message}</p>`
        ).join('');
        logContainer.scrollTop = logContainer.scrollHeight;
    } catch (error) { console.error("Error updating log display:", error); }
}

// --- Resize Logic --- (Moved from main.js)
/**
 * Calculates optimal cell size, resizes canvas AND log container, and redraws.
 * Relies on global `canvas`, `ctx`, `GRID_WIDTH`, `GRID_HEIGHT`, `CANVAS_PADDING`, `MIN_CELL_SIZE`.
 * Also relies on global `redrawCanvas` function (currently in main.js).
 * Needs access to global `currentCellSize` (currently in main.js) - consider passing or managing differently.
 * @param {GameState} gameState - The current game state object.
 */
function resizeAndDraw(gameState) {
    // console.log("Resizing canvas...");
    const availableWidth = window.innerWidth - (CANVAS_PADDING * 2); const availableHeight = window.innerHeight - (CANVAS_PADDING * 2);
    const cellWidthBasedOnWindow = availableWidth / GRID_WIDTH; const cellHeightBasedOnWindow = availableHeight / GRID_HEIGHT;
    let newCellSize = Math.floor(Math.min(cellWidthBasedOnWindow, cellHeightBasedOnWindow));
    // TODO: currentCellSize is still global in main.js - this needs fixing later
    currentCellSize = Math.max(newCellSize, MIN_CELL_SIZE);
    if (currentCellSize <= 0 || !isFinite(currentCellSize) || GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) { console.error(`Resize failed: Invalid dimensions.`); currentCellSize = MIN_CELL_SIZE; if(GRID_WIDTH <= 0 || GRID_HEIGHT <= 0) return; }

    // Assumes global `canvas` exists
    canvas.width = GRID_WIDTH * currentCellSize; canvas.height = GRID_HEIGHT * currentCellSize;

    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        logContainer.style.height = `${canvas.height}px`;
    }

    // Redraw canvas using the provided gameState
    // Assumes global `redrawCanvas` exists
    if (gameState && typeof redrawCanvas === 'function') {
        redrawCanvas(gameState);
    } else {
        console.error("resizeAndDraw ERROR: gameState missing or redrawCanvas function not defined!");
    }
}

// --- UI Initialization --- (Handles listener setup)
/**
 * Sets up UI event listeners and performs initial draw.
 * Relies on global functions: handleKeyDown, processPlayerTurn, resetGame, resizeAndDraw, updateLogDisplay.
 * @param {GameState} gameState - The current game state object.
 */
function initializeUI(gameState) {
    // Attach Listeners (Only ONCE)
    if (!window.initListenersAttached) {
        console.log("UI INIT: Attaching listeners...");
        // Resize Listener (pass gameState via closure)
        // Assumes global resizeAndDraw exists
        window.addEventListener('resize', () => resizeAndDraw(gameState));
        console.log("UI INIT: Resize listener attached.");

        // Input Listener (Calls handleKeyDown then processPlayerTurn)
        // Assumes global handleKeyDown and processPlayerTurn exist
        if (typeof handleKeyDown === 'function' && typeof processPlayerTurn === 'function') {
            window.addEventListener('keydown', (event) => {
                const actionIntent = handleKeyDown(event, gameState); // Get intent
                if (actionIntent) {
                    processPlayerTurn(actionIntent, gameState); // Process the intent
                }
            });
            console.log("UI INIT: Input handler attached (calls processPlayerTurn).");
        } else { console.error("handleKeyDown or processPlayerTurn function not found!"); }

        // Restart Button Listener (pass gameState via closure)
        // Assumes global resetGame exists
        const restartBtn = document.getElementById('restartButton');
        if (restartBtn && typeof resetGame === 'function') {
            restartBtn.addEventListener('click', () => resetGame(gameState)); // Pass gameState
            console.log("UI INIT: Restart button listener attached.");
        } else { console.error("UI INIT ERROR: Restart button or resetGame function missing!"); }

        // Toggle Log Button Listener (Doesn't need gameState)
        const toggleLogBtn = document.getElementById('toggleLogButton');
        const logContainer = document.getElementById('logContainer');
        console.log("UI INIT: Toggle Log Button Found:", toggleLogBtn);
        console.log("UI INIT: Log Container Found:", logContainer);
        if (toggleLogBtn && logContainer) {
            toggleLogBtn.addEventListener('click', () => {
                console.log('--- Toggle Log Button CLICKED! ---');
                logContainer.classList.toggle('hidden');
                console.log(`Handler: Log visibility toggled. Currently hidden: ${logContainer.classList.contains('hidden')}`);
            });
            console.log("UI INIT: Toggle Log button listener attached successfully.");
        } else {
             if (!toggleLogBtn) console.error("UI INIT ERROR: Toggle Log button not found!");
             if (!logContainer) console.error("UI INIT ERROR: Log container not found!");
        }
        // --- End Toggle Log Button Listener ---

        window.initListenersAttached = true; // Set flag
    } else {
         console.log("UI INIT: Listeners already attached.");
    }

    // Initial Size & Draw (pass gameState) - Moved from main.js initializeGame
    // Assumes global resizeAndDraw exists
    resizeAndDraw(gameState);
    console.log("UI INIT: Initial resize and draw completed.");

    // Update log display explicitly after initialization messages - Moved from main.js initializeGame
    // Assumes global updateLogDisplay exists
    if (typeof updateLogDisplay === 'function') {
        updateLogDisplay(gameState);
    }
}
