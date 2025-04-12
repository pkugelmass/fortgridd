// UI Module: Handles DOM updates, event listeners, and drawing orchestration related to UI.
// console.log("ui.js loaded"); // Removed module loaded log

// --- Status Bar Update Function --- (Moved from main.js)
/**
 * Updates the text content of the HTML status bar elements based on gameState.
 * @param {GameState} gameState - The current game state object.
 */
function updateStatusBar(gameState) {
    // Check if crucial objects/functions exist first
    if (!gameState || typeof Game === 'undefined' || !gameState.player || typeof Game.getTurnNumber !== 'function' || typeof Game.isGameOver !== 'function') {
        Game.logMessage("updateStatusBar skipped: gameState, Game object, player, or required functions missing.", gameState, { level: 'WARN', target: 'CONSOLE' });
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
        else { Game.logMessage("updateStatusBar: hpValue element missing.", gameState, { level: 'WARN', target: 'CONSOLE' }); }

        // Update Enemies Left (from gameState.enemies)
        if (enemiesEl && gameState.enemies) { enemiesEl.textContent = gameState.enemies.filter(e => e && e.hp > 0).length; }
        else if (enemiesEl) { enemiesEl.textContent = '--'; }
        else { Game.logMessage("updateStatusBar: enemiesValue element missing.", gameState, { level: 'WARN', target: 'CONSOLE' }); }

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
                         Game.logMessage(`updateStatusBar: Invalid currentTurn number from gameState: ${currentTurn}`, gameState, { level: 'WARN', target: 'CONSOLE' });
                         shrinkEl.textContent = "?";
                    }
                }
            } else {
                 shrinkEl.textContent = "N/A";
                 Game.logMessage("updateStatusBar: SHRINK_INTERVAL missing or invalid.", gameState, { level: 'WARN', target: 'CONSOLE' });
            }
        } else {
             Game.logMessage("updateStatusBar: Element with ID 'shrinkValue' not found.", gameState, { level: 'WARN', target: 'CONSOLE' });
        }
        // --- End Update Shrink Countdown ---

    } catch (error) {
        Game.logMessage(`Error updating status bar: ${error}`, gameState, { level: 'ERROR', target: 'CONSOLE' });
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
    } catch (error) { Game.logMessage(`Error updating log display: ${error}`, gameState, { level: 'ERROR', target: 'CONSOLE' }); }
}

// --- Resize Logic --- (Moved from main.js)
/**
 * Calculates optimal cell size, resizes canvas AND log container, and redraws.
 * Relies on global `canvas`, `ctx`, `GRID_WIDTH`, `GRID_HEIGHT`, `CANVAS_PADDING`, `MIN_CELL_SIZE`.
 * Also relies on global `redrawCanvas` function (currently in main.js).
 * Needs access to global `currentCellSize` (now in drawing.js).
 * @param {GameState} gameState - The current game state object.
 */
function resizeAndDraw(gameState) {
    // Game.logMessage("Resizing canvas...", gameState, { level: 'DEBUG', target: 'CONSOLE' });
    const availableWidth = window.innerWidth - (CANVAS_PADDING * 2); const availableHeight = window.innerHeight - (CANVAS_PADDING * 2);
    const cellWidthBasedOnWindow = availableWidth / GRID_WIDTH; const cellHeightBasedOnWindow = availableHeight / GRID_HEIGHT;
    let newCellSize = Math.floor(Math.min(cellWidthBasedOnWindow, cellHeightBasedOnWindow));
    // Update the global currentCellSize in drawing.js
    // Ensure drawing.js is loaded before ui.js in index.html
    if (typeof currentCellSize !== 'undefined') {
        currentCellSize = Math.max(newCellSize, MIN_CELL_SIZE);
    } else {
        Game.logMessage("resizeAndDraw ERROR: currentCellSize (from drawing.js) not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
        // Fallback or handle error appropriately
        return;
    }

    if (currentCellSize <= 0 || !isFinite(currentCellSize) || GRID_WIDTH <= 0 || GRID_HEIGHT <= 0 || !isFinite(GRID_WIDTH) || !isFinite(GRID_HEIGHT)) { Game.logMessage(`Resize failed: Invalid dimensions.`, gameState, { level: 'ERROR', target: 'CONSOLE' }); currentCellSize = MIN_CELL_SIZE; if(GRID_WIDTH <= 0 || GRID_HEIGHT <= 0) return; }

    // Assumes global `canvas` exists
    canvas.width = GRID_WIDTH * currentCellSize; canvas.height = GRID_HEIGHT * currentCellSize;

    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        logContainer.style.height = `${canvas.height}px`;
    }

    // Redraw canvas using the provided gameState
    // Assumes global `redrawCanvas` exists (now in drawing.js) and `ctx` exists
    if (gameState && typeof redrawCanvas === 'function' && typeof ctx !== 'undefined') {
        redrawCanvas(ctx, gameState); // Pass ctx and gameState
        // Also update status bar after redraw
        if (typeof updateStatusBar === 'function') {
            updateStatusBar(gameState);
        }
    } else {
        let errorMsg = "resizeAndDraw ERROR: ";
        if (!gameState) errorMsg += "gameState missing. ";
        if (typeof redrawCanvas !== 'function') errorMsg += "redrawCanvas function not defined. ";
        if (typeof ctx === 'undefined') errorMsg += "ctx not defined. ";
        Game.logMessage(errorMsg.trim(), gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
}

// --- UI Initialization --- (Handles listener setup)
/**
 * Sets up UI event listeners and performs initial draw.
 * Relies on global functions: handleKeyDown, processPlayerTurn, resetGame, resizeAndDraw, updateLogDisplay, redrawCanvas (via resizeAndDraw).
 * @param {GameState} gameState - The current game state object.
 */
function initializeUI(gameState) {
    // Attach Listeners (Only ONCE)
    if (!window.initListenersAttached) {
        Game.logMessage("UI INIT: Attaching listeners...", gameState, { level: 'INFO', target: 'CONSOLE' });
        // Resize Listener (pass gameState via closure)
        // Assumes global resizeAndDraw exists
        window.addEventListener('resize', () => resizeAndDraw(gameState));
        Game.logMessage("UI INIT: Resize listener attached.", gameState, { level: 'DEBUG', target: 'CONSOLE' });

        // Input Listener (Calls handleKeyDown then processPlayerTurn)
        // Assumes global handleKeyDown and processPlayerTurn exist
        if (typeof handleKeyDown === 'function' && typeof processPlayerTurn === 'function') {
            window.addEventListener('keydown', (event) => {
                if (event.key && event.key.toLowerCase() === 't') {
                    window.showThreatOverlay = !window.showThreatOverlay;
                    if (typeof redrawCanvas === 'function') {
                        redrawCanvas(ctx, gameState);
                    }
                    return; // Do not process as a game action
                }
                const actionIntent = handleKeyDown(event, gameState); // Get intent
                if (actionIntent) {
                    processPlayerTurn(actionIntent, gameState); // Process the intent
                }
            });
            Game.logMessage("UI INIT: Input handler attached (calls processPlayerTurn).", gameState, { level: 'DEBUG', target: 'CONSOLE' });
        } else { Game.logMessage("handleKeyDown or processPlayerTurn function not found!", gameState, { level: 'ERROR', target: 'CONSOLE' }); }

        // Restart Button Listener (pass gameState via closure)
        // Assumes Game.resetGame exists (moved from main.js)
        const restartBtn = document.getElementById('restartButton');
        // Check for Game object and its resetGame method
        if (restartBtn && typeof Game !== 'undefined' && typeof Game.resetGame === 'function') {
            restartBtn.addEventListener('click', () => Game.resetGame(gameState)); // Call Game.resetGame
            Game.logMessage("UI INIT: Restart button listener attached.", gameState, { level: 'DEBUG', target: 'CONSOLE' });
        } else {
             let errorMsg = "UI INIT ERROR: ";
             if (!restartBtn) errorMsg += "Restart button not found. ";
             if (typeof Game === 'undefined' || typeof Game.resetGame !== 'function') errorMsg += "Game.resetGame function missing. ";
             Game.logMessage(errorMsg.trim(), gameState, { level: 'ERROR', target: 'CONSOLE' });
        }

        // Toggle Log Button Listener (Doesn't need gameState)
        const toggleLogBtn = document.getElementById('toggleLogButton');
        const logContainer = document.getElementById('logContainer');
        Game.logMessage(`UI INIT: Toggle Log Button Found: ${!!toggleLogBtn}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        Game.logMessage(`UI INIT: Log Container Found: ${!!logContainer}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        if (toggleLogBtn && logContainer) {
            toggleLogBtn.addEventListener('click', () => {
                Game.logMessage('--- Toggle Log Button CLICKED! ---', gameState, { level: 'DEBUG', target: 'CONSOLE' });
                logContainer.classList.toggle('hidden');
                Game.logMessage(`Handler: Log visibility toggled. Currently hidden: ${logContainer.classList.contains('hidden')}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
            });
            Game.logMessage("UI INIT: Toggle Log button listener attached successfully.", gameState, { level: 'DEBUG', target: 'CONSOLE' });
        } else {
             if (!toggleLogBtn) Game.logMessage("UI INIT ERROR: Toggle Log button not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
             if (!logContainer) Game.logMessage("UI INIT ERROR: Log container not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        // --- End Toggle Log Button Listener ---

        window.initListenersAttached = true; // Set flag
    } else {
         Game.logMessage("UI INIT: Listeners already attached.", gameState, { level: 'DEBUG', target: 'CONSOLE' });
    }

    // Initial Size & Draw (pass gameState) - Moved from main.js initializeGame
    // Assumes global resizeAndDraw exists
    resizeAndDraw(gameState);
    Game.logMessage("UI INIT: Initial resize and draw completed.", gameState, { level: 'INFO', target: 'CONSOLE' });

    // Update log display explicitly after initialization messages - Moved from main.js initializeGame
    // Assumes global updateLogDisplay exists
    if (typeof updateLogDisplay === 'function') {
        updateLogDisplay(gameState);
    }
    // Start the effects animation loop (draws effects on top of the game board)
    if (window.Effects && typeof window.Effects.startEffectsAnimation === 'function' && typeof ctx !== 'undefined') {
        window.Effects.startEffectsAnimation(ctx);
    }
}
