console.log("game.js loaded");

const Game = {
    // --- State Variables ---
    currentTurn: 'player',
    gameActive: true,
    turnNumber: 1,
    safeZone: { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 },
    gameLog: ["Game Initialized."], // Newest messages added to END
    MAX_LOG_MESSAGES: 15, // Increased max slightly

    // --- State Accessors ---
    getCurrentTurn: function() { return this.currentTurn; },
    isPlayerTurn: function() { return this.gameActive && this.currentTurn === 'player'; },
    isGameOver: function() { return !this.gameActive; },
    getTurnNumber: function() { return this.turnNumber; },
    getSafeZone: function() { return { ...this.safeZone }; },
    getLog: function() { return [...this.gameLog]; }, // Return a copy

    // --- State Modifiers ---
    setGameOver: function() {
        if (!this.gameActive) return;
        console.log("GAME STATE: Setting gameActive = false.");
        this.gameActive = false;
        if (typeof redrawCanvas === 'function') { redrawCanvas(); } else { console.error("redrawCanvas not found!"); }
    },

    // --- Logging --- (MODIFIED: push/shift)
    /** Adds a message to the END of the game log, trims old messages from the START */
    logMessage: function(message) {
        console.log("LOG:", message); // Keep console log
        const messageWithTurn = `T${this.turnNumber}: ${message}`;
        this.gameLog.push(messageWithTurn); // Add to end
        if (this.gameLog.length > this.MAX_LOG_MESSAGES) {
            this.gameLog.shift(); // Remove from beginning (oldest)
        }
        if (typeof updateLogDisplay === 'function') { updateLogDisplay(); }
        else { console.warn("updateLogDisplay function not found when logging message."); }
    },

    // --- End Condition Check ---
    /** Checks end conditions and calls setGameOver if met */
    checkEndConditions: function() {
        if (this.isGameOver()) return true;
        if (typeof player !== 'undefined' && player.hp <= 0) {
             this.logMessage("Player eliminated! GAME OVER!"); this.setGameOver(); return true; }
        if (typeof enemies !== 'undefined' && enemies.length === 0) {
             this.logMessage("All enemies eliminated! YOU WIN!"); this.setGameOver(); return true; }
        return false;
    },

    // --- Shrink Logic ---
    /** Shrinks the safe zone boundaries */
    shrinkSafeZone: function() {
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) { return false; }
        const oldZoneJSON = JSON.stringify(this.safeZone); // Store for comparison
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT; const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        let shrunk = false;
        if (newMinRow <= newMaxRow) { this.safeZone.minRow = newMinRow; this.safeZone.maxRow = newMaxRow; }
        if (newMinCol <= newMaxCol) { this.safeZone.minCol = newMinCol; this.safeZone.maxCol = newMaxCol; }
        if (JSON.stringify(this.safeZone) !== oldZoneJSON) { // Check if actually changed
            shrunk = true;
            const zone = this.safeZone;
            this.logMessage(`Storm shrinks! Safe: R[${zone.minRow}-${zone.maxRow}], C[${zone.minCol}-${zone.maxCol}]`);
            console.log("After Shrink:", JSON.stringify(this.safeZone));
        }
        return shrunk;
    },

    // --- Storm Damage Logic ---
    /** Applies storm damage and checks end conditions */
    applyStormDamage: function() {
        if (this.isGameOver()) return false;
        const zone = this.safeZone;
        let stateChanged = false; let gameEnded = false;
        if (typeof player !== 'undefined' && player.hp > 0) { if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) { const damage = STORM_DAMAGE; this.logMessage(`Player takes ${damage} storm damage!`); player.hp -= damage; stateChanged = true; if (this.checkEndConditions()) { gameEnded = true; } } }
        if (!gameEnded && typeof enemies !== 'undefined') { const originalLength = enemies.length; let enemiesKilledByStorm = 0; enemies = enemies.filter(enemy => { if (!enemy || enemy.hp <= 0) return false; if (enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol) { const damage = STORM_DAMAGE; this.logMessage(`Enemy ${enemy.id} takes ${damage} storm damage!`); enemy.hp -= damage; stateChanged = true; if (enemy.hp <= 0) { this.logMessage(`Enemy ${enemy.id} eliminated by storm!`); enemiesKilledByStorm++; return false; } } return true; }); if (enemiesKilledByStorm > 0) { stateChanged = true; if (this.checkEndConditions()) { gameEnded = true; } } }
         return stateChanged;
    },

    // --- Turn Management ---
    endPlayerTurn: function() {
        if (this.isGameOver()) return;
        this.currentTurn = 'ai';
        if (typeof executeAiTurns === 'function') { setTimeout(executeAiTurns, 100); }
        else { console.error("executeAiTurns function not found!"); this.currentTurn = 'player'; }
    },

    endAiTurn: function() {
        if (this.isGameOver()) return;
        this.turnNumber++; // Increment turn first
        // Log message removed from here
        const didShrink = this.shrinkSafeZone(); // Logs internally
        const damageApplied = this.applyStormDamage(); // Logs internally, calls checkEndConditions

        if (this.isGameOver()) return; // Stop if game ended during checks

        this.currentTurn = 'player';
        // console.log("AI Turns complete. Player turn."); // Quieter
        if (didShrink || damageApplied) { if (typeof redrawCanvas === 'function') { redrawCanvas(); } } // Redraw if state affecting visuals changed
        else { if (typeof drawUI === 'function') { drawUI(ctx); } } // Otherwise just update UI text
    },
};