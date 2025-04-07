console.log("game.js loaded");

const Game = {
    // --- State Variables ---
    currentTurn: 'player',
    gameActive: true,
    turnNumber: 1,
    safeZone: { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 },
    gameLog: [], // NEW: Array to store log messages
    MAX_LOG_MESSAGES: 10, // NEW: Max number of messages to keep

    // --- State Accessors ---
    getCurrentTurn: function() { return this.currentTurn; },
    isPlayerTurn: function() { return this.gameActive && this.currentTurn === 'player'; },
    isGameOver: function() { return !this.gameActive; },
    getTurnNumber: function() { return this.turnNumber; },
    getSafeZone: function() { return { ...this.safeZone }; },
    getLog: function() { return [...this.gameLog]; }, // NEW: Return a copy of the log

    // --- State Modifiers ---
    setGameOver: function() {
        if (!this.gameActive) return;
        console.log("GAME STATE: Setting gameActive = false."); // Keep this essential log
        this.gameActive = false;
        if (typeof redrawCanvas === 'function') { redrawCanvas(); } // Redraw to show final state
        else { console.error("redrawCanvas not found when setting game over!"); }
    },

    // --- NEW: Logging ---
    /** Adds a message to the front of the game log, trims old messages */
    logMessage: function(message) {
        console.log("LOG:", message); // Also log to console
        this.gameLog.unshift(`T${this.turnNumber}: ${message}`); // Add turn number and message to front
        if (this.gameLog.length > this.MAX_LOG_MESSAGES) {
            this.gameLog.pop(); // Remove the oldest message
        }
        // Trigger display update - relies on updateLogDisplay being globally available
        if (typeof updateLogDisplay === 'function') {
             updateLogDisplay();
        } else {
             console.warn("updateLogDisplay function not found when logging message.");
        }
    },

    // --- End Condition Check ---
    /** Checks end conditions and calls setGameOver if met */
    checkEndConditions: function() {
        if (this.isGameOver()) return true;
        if (typeof player !== 'undefined' && player.hp <= 0) { this.logMessage("Player eliminated!"); this.setGameOver(); return true; }
        if (typeof enemies !== 'undefined' && enemies.length === 0) { this.logMessage("All enemies eliminated! Player wins!"); this.setGameOver(); return true; }
        return false;
    },

    // --- Shrink Logic ---
    /** Shrinks the safe zone boundaries */
    shrinkSafeZone: function() {
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) { return false; }
        console.log("SHRINKING SAFE ZONE!");
        // console.log("Before Shrink:", JSON.stringify(this.safeZone));
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT; const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        let shrunk = false;
        if (newMinRow <= newMaxRow) { if(this.safeZone.minRow !== newMinRow || this.safeZone.maxRow !== newMaxRow){ this.safeZone.minRow = newMinRow; this.safeZone.maxRow = newMaxRow; shrunk = true; } }
        if (newMinCol <= newMaxCol) { if(this.safeZone.minCol !== newMinCol || this.safeZone.maxCol !== newMaxCol){ this.safeZone.minCol = newMinCol; this.safeZone.maxCol = newMaxCol; shrunk = true; } }
        if (shrunk) {
             const zone = this.safeZone; // Use local variable for clarity
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
        let stateChanged = false;
        let gameEnded = false; // Flag to prevent further checks if game ends mid-function

        // Check Player
        if (typeof player !== 'undefined' && player.hp > 0) {
             if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) {
                  const damage = STORM_DAMAGE; // Use constant
                  this.logMessage(`Player takes ${damage} storm damage!`); player.hp -= damage; stateChanged = true; console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                  if (this.checkEndConditions()) { gameEnded = true; /* Game ended */ }
             }
        }
        // Check Enemies only if game didn't just end
        if (!gameEnded && typeof enemies !== 'undefined') {
            const originalLength = enemies.length;
            let enemiesKilledByStorm = 0;
            enemies = enemies.filter(enemy => { // Use filter for safe removal
                if (!enemy || enemy.hp <= 0) return false;
                if (enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol) {
                     const damage = STORM_DAMAGE;
                     this.logMessage(`Enemy ${enemy.id} takes ${damage} storm damage!`); enemy.hp -= damage; stateChanged = true;
                     if (enemy.hp <= 0) { this.logMessage(`Enemy ${enemy.id} eliminated by storm!`); enemiesKilledByStorm++; return false; } // Remove dead enemy
                }
                return true; // Keep enemy
            });
             if (enemiesKilledByStorm > 0) { // If any enemy died this turn
                 stateChanged = true; // Ensure redraw if only change was enemy death
                 if (this.checkEndConditions()) { gameEnded = true; /* Game ended */ }
             }
        }
         return stateChanged; // Return true if any HP changed or enemies died
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
        this.turnNumber++;
        this.logMessage(`Turn ${this.turnNumber} begins.`); // Log turn *before* actions potentially end game

        const didShrink = this.shrinkSafeZone();
        const damageApplied = this.applyStormDamage(); // This now calls checkEndConditions internally

        if (this.isGameOver()) return; // Stop if storm damage ended the game

        this.currentTurn = 'player';
        // console.log("AI Turns complete. Player turn."); // Replaced by logMessage
        if (didShrink || damageApplied) { if (typeof redrawCanvas === 'function') { redrawCanvas(); } }
        else { if (typeof drawUI === 'function') { drawUI(ctx); } } // Just update UI text if nothing else changed state visually
    },
};