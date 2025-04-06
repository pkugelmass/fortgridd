console.log("game.js loaded");

const Game = {
    // --- State Variables ---
    currentTurn: 'player',
    gameActive: true,

    // --- State Accessors ---
    getCurrentTurn: function() {
        return this.currentTurn;
    },

    isPlayerTurn: function() {
        // Check gameActive first for consistency
        return this.gameActive && this.currentTurn === 'player';
    },

    isGameOver: function() {
        return !this.gameActive;
    },

    // --- State Modifiers ---
    setGameOver: function() {
        // console.log("GAME STATE: Setting gameActive = false"); // Removed Log
        this.gameActive = false;
        // Redraw needed to show final state via UI
        if (typeof redrawCanvas === 'function') {
             redrawCanvas();
        } else {
            console.error("redrawCanvas not found when setting game over!");
        }
    },

    // --- Turn Management ---
    endPlayerTurn: function() {
        if (!this.gameActive) return;

        // console.log("GAME STATE: Ending player turn, switching to AI."); // Removed Log
        this.currentTurn = 'ai';

        if (typeof executeAiTurns === 'function') {
            setTimeout(executeAiTurns, 100);
        } else {
            console.error("executeAiTurns function not found when trying to end player turn!");
            this.currentTurn = 'player'; // Switch back if AI func missing
        }
    },

    endAiTurn: function() {
        if (!this.gameActive) return;

        // console.log("GAME STATE: Ending AI turn, switching to Player."); // Removed Log
        this.currentTurn = 'player';

        // Redraw needed to update UI (e.g., turn indicator)
        if (typeof redrawCanvas === 'function') {
            redrawCanvas();
        } else {
             console.error("redrawCanvas not found when ending AI turn!");
        }
    },

};

// Make Game object globally accessible (implicit via script tag)
// console.log("Game object created:", Game); // Quieter log