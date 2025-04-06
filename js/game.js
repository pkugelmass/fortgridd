console.log("game.js loaded");

const Game = {
    // --- State Variables --- (Moved from script.js)
    currentTurn: 'player',
    gameActive: true,

    // --- State Accessors ---
    getCurrentTurn: function() {
        return this.currentTurn;
    },

    isPlayerTurn: function() {
        return this.gameActive && this.currentTurn === 'player';
    },

    isGameOver: function() {
        return !this.gameActive;
    },

    // --- State Modifiers ---
    setGameOver: function() {
        console.log("GAME STATE: Setting gameActive = false");
        this.gameActive = false;
        // Potentially trigger final UI update or cleanup here if needed
        if (typeof redrawCanvas === 'function') {
             redrawCanvas(); // Redraw to show final game over/win state via UI
        }
    },

    // --- Turn Management ---
    endPlayerTurn: function() {
        if (!this.gameActive) return; // Don't switch if game already over

        console.log("GAME STATE: Ending player turn, switching to AI.");
        this.currentTurn = 'ai';

        // Trigger AI turns after a short delay
        // Assumes executeAiTurns is globally available (from ai.js)
        if (typeof executeAiTurns === 'function') {
            setTimeout(executeAiTurns, 100);
        } else {
            console.error("executeAiTurns function not found when trying to end player turn!");
            // Fallback: Immediately switch back if AI can't run? Or just stop?
            this.currentTurn = 'player'; // Switch back immediately if AI func missing
        }
    },

    endAiTurn: function() {
        if (!this.gameActive) return; // Don't switch if game already over

        console.log("GAME STATE: Ending AI turn, switching to Player.");
        this.currentTurn = 'player';

        // Redraw or UI update might be needed here if AI did nothing
        // But typically redraw happens within executeAiTurns or when player input occurs
         if (typeof redrawCanvas === 'function') {
             redrawCanvas(); // Ensure UI reflects player's turn
         }
    },

    // --- Initialization --- (Could potentially move init sequence here later)
    // init: function() { ... }

    // --- Win/Loss Check --- (Could centralize this)
    // checkWinCondition: function() { ... }
    // checkLossCondition: function() { ... }
};

// Make Game object globally accessible (implicit via script tag)
console.log("Game object created:", Game);