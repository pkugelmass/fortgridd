/**
 * UIManager class for managing UI logic and event listeners for the grid-based, turn-based battle royale game.
 * All logic operates on OOP class instances (GameState, Player, etc.).
 * No import/export statements; compatible with global-scope loading via index.html.
 * No rendering or animation logic included.
 */
class UIManager {
    /**
     * Updates the text content of the HTML status bar elements based on gameState.
     * @param {GameState} gameState - The current game state object.
     */
    static updateStatusBar(gameState) {
        if (!gameState || !gameState.player) return;

        const medkitEl = document.getElementById('medkitsValue');
        const ammoEl = document.getElementById('ammoValue');
        const hpEl = document.getElementById('hpValue');
        const shrinkEl = document.getElementById('shrinkValue');
        const enemiesEl = document.getElementById('enemiesValue');

        try {
            // Medkits
            if (medkitEl && gameState.player.resources) {
                medkitEl.textContent = gameState.player.resources.medkits || 0;
            } else if (medkitEl) {
                medkitEl.textContent = '--';
            }

            // Ammo
            if (ammoEl && gameState.player.resources) {
                ammoEl.textContent = gameState.player.resources.ammo || 0;
            } else if (ammoEl) {
                ammoEl.textContent = '--';
            }

            // HP
            if (hpEl) {
                hpEl.textContent = `${gameState.player.hp ?? '--'} / ${gameState.player.maxHp || '--'}`;
            }

            // Enemies Left
            if (enemiesEl && Array.isArray(gameState.enemies)) {
                enemiesEl.textContent = gameState.enemies.filter(e => e && e.hp > 0).length;
            } else if (enemiesEl) {
                enemiesEl.textContent = '--';
            }

            // Shrink Countdown (requires SHRINK_INTERVAL and turn number)
            if (shrinkEl && typeof window.SHRINK_INTERVAL !== 'undefined' && window.SHRINK_INTERVAL > 0) {
                let currentTurn = (typeof gameState.getTurnNumber === 'function')
                    ? gameState.getTurnNumber()
                    : (window.Game && typeof window.Game.getTurnNumber === 'function')
                        ? window.Game.getTurnNumber(gameState)
                        : null;
                if (typeof currentTurn === 'number' && currentTurn > 0 && isFinite(currentTurn)) {
                    const turnsSinceLastShrink = (currentTurn - 1) % window.SHRINK_INTERVAL;
                    const turnsLeft = window.SHRINK_INTERVAL - turnsSinceLastShrink;
                    shrinkEl.textContent = turnsLeft;
                } else {
                    shrinkEl.textContent = "?";
                }
            } else if (shrinkEl) {
                shrinkEl.textContent = "N/A";
            }
        } catch (error) {
            if (gameState && typeof gameState.logMessage === 'function') {
                gameState.logMessage(`Error updating status bar: ${error}`, { level: 'ERROR', target: 'CONSOLE' });
            }
        }
    }

    /**
     * Updates the HTML log container based on gameState and scrolls to bottom.
     * @param {GameState} gameState - The current game state object.
     */
    static updateLogDisplay(gameState) {
        const logContainer = document.getElementById('logContainer');
        if (!logContainer || !gameState) return;
        try {
            let logEntries = [];
            if (typeof gameState.getLog === 'function') {
                logEntries = gameState.getLog();
            } else if (window.Game && typeof window.Game.getLog === 'function') {
                logEntries = window.Game.getLog(gameState);
            }
            logContainer.innerHTML = logEntries.map(entry =>
                `<p class="${entry.cssClass || ''}">${entry.message}</p>`
            ).join('');
            logContainer.scrollTop = logContainer.scrollHeight;
        } catch (error) {
            if (gameState && typeof gameState.logMessage === 'function') {
                gameState.logMessage(`Error updating log display: ${error}`, { level: 'ERROR', target: 'CONSOLE' });
            }
        }
    }

    /**
     * Sets up UI event listeners (resize, input, restart, log toggle).
     * Does not include rendering/animation logic.
     * @param {GameState} gameState - The current game state object.
     * @param {function} processPlayerTurn - Function to process player actions (intent, gameState).
     */
    static initializeUI(gameState, processPlayerTurn) {
        if (!window.initListenersAttached) {
            // Resize Listener (UI only, no rendering)
            window.addEventListener('resize', () => {
                // UIManager.updateStatusBar(gameState); // Optionally update UI on resize
            });

            // Input Listener (calls InputHandler.handleKeyDown, then processPlayerTurn)
            if (typeof window.InputHandler !== 'undefined' && typeof processPlayerTurn === 'function') {
                window.addEventListener('keydown', (event) => {
                    if (event.key && event.key.toLowerCase() === 't') {
                        window.showThreatOverlay = !window.showThreatOverlay;
                        return;
                    }
                    const actionIntent = window.InputHandler.handleKeyDown(event, gameState);
                    if (actionIntent) {
                        processPlayerTurn(actionIntent, gameState);
                    }
                });
            }

            // Restart Button Listener
            const restartBtn = document.getElementById('restartButton');
            if (restartBtn && window.Game && typeof window.Game.resetGame === 'function') {
                restartBtn.addEventListener('click', () => window.Game.resetGame(gameState));
            }

            // Toggle Log Button Listener
            const toggleLogBtn = document.getElementById('toggleLogButton');
            const logContainer = document.getElementById('logContainer');
            if (toggleLogBtn && logContainer) {
                toggleLogBtn.addEventListener('click', () => {
                    logContainer.classList.toggle('hidden');
                });
            }

            window.initListenersAttached = true;
        }
    }
}

// Expose UIManager globally for use in index.html/main.js
window.UIManager = UIManager;