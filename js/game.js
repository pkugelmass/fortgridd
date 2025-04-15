/**
 * Global Game facade for compatibility with UI and main logic.
 * Delegates to the new class-based architecture (GameState, etc.).
 * This file is required after the refactor to maintain global access.
 */

// Assumes GameState is loaded globally (via script tag or inclusion order)
window.Game = {
    /**
     * Initializes and returns a new GameState instance.
     * Sets up initial state as needed.
     */
    initializeGame: function () {
        if (typeof GameState !== "function") {
            console.error("GameState class not found. Ensure game_objects/GameState.js is loaded first.");
            return null;
        }
        const gs = new GameState();
        // Set up initial state as needed (map, player, enemies, etc.)
        // This can be expanded as needed for your game.
        gs.gameActive = true;
        gs.turnNumber = 1;
        // Optionally, initialize map, player, enemies here or elsewhere.
        return gs;
    },

    /**
     * Returns true if the game is over.
     * @param {GameState} gameState
     */
    isGameOver: function (gameState) {
        if (!gameState || typeof gameState.isGameOver !== "function") return true;
        return gameState.isGameOver();
    },

    /**
     * Returns true if it is currently the player's turn.
     * @param {GameState} gameState
     */
    isPlayerTurn: function (gameState) {
        if (!gameState || typeof gameState.isPlayerTurn !== "function") return false;
        return gameState.isPlayerTurn();
    },

    /**
     * Returns the current turn number.
     * @param {GameState} gameState
     */
    getTurnNumber: function (gameState) {
        if (!gameState || typeof gameState.getTurnNumber !== "function") return 0;
        return gameState.getTurnNumber();
    },

    /**
     * Returns the game log.
     * @param {GameState} gameState
     */
    getLog: function (gameState) {
        if (!gameState || typeof gameState.getLog !== "function") return [];
        return gameState.getLog();
    },

    /**
     * Logs a message using the game state's logger.
     * @param {string} message
     * @param {GameState} gameState
     * @param {object} options
     */
    logMessage: function (message, gameState, options = {}) {
        if (!gameState || typeof gameState.logMessage !== "function") {
            console.warn("logMessage: No valid gameState or logMessage method.");
            return;
        }
        gameState.logMessage(message, options);
    },

    /**
     * Resets the game state (re-initializes).
     * @param {GameState} gameState
     */
    resetGame: function (gameState) {
        // Optionally, you can re-initialize the game state here.
        // For now, just call initializeGame and replace properties.
        const newState = this.initializeGame();
        if (!newState) return;
        Object.keys(newState).forEach(key => {
            gameState[key] = newState[key];
        });
        // Optionally, trigger UI updates or re-rendering here.
    },

    /**
     * Checks end conditions and updates game state.
     * @param {GameState} gameState
     */
    checkEndConditions: function (gameState) {
        if (!gameState || typeof gameState.checkEndConditions !== "function") return false;
        return gameState.checkEndConditions();
    },

    /**
     * Ends the player's turn and advances the game.
     * @param {GameState} gameState
     */
    endPlayerTurn: function (gameState) {
        if (!gameState) return;
        // Advance turn logic here as needed.
        // For now, just increment turnNumber and set currentTurn to 'enemy' or similar.
        if (typeof gameState.turnNumber === "number") {
            gameState.turnNumber += 1;
        }
        // You may want to set gameState.currentTurn = 'enemy' or similar here.
    }
    // Add more methods as needed for compatibility.
};