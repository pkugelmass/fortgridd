console.log("game.js loaded");

const Game = {
    // --- State Variables ---
    currentTurn: 'player',
    gameActive: true,
    turnNumber: 1,
    safeZone: { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 }, // Uses globals from config.js
    gameLog: ["Game Initialized."], // Newest messages added to END
    // MAX_LOG_MESSAGES defined in config.js

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

    // --- Logging --- (MODIFIED: push/shift confirmed)
    /** Adds a message to the END of the game log, trims old messages from the START */
    logMessage: function(message) {
        console.log("LOG:", message); // Keep console log
        const messageWithTurn = `T${this.turnNumber}: ${message}`;
        this.gameLog.push(messageWithTurn); // *** Add to end ***
        if (this.gameLog.length > (MAX_LOG_MESSAGES || 15)) { // Use constant or fallback
            this.gameLog.shift(); // *** Remove from beginning (oldest) ***
        }
        if (typeof updateLogDisplay === 'function') { updateLogDisplay(); } // Trigger HTML update
        else { console.warn("updateLogDisplay function not found!"); }
    },

    // --- End Condition Check ---
    /** Checks end conditions and calls setGameOver if met */
    checkEndConditions: function() {
        if (this.isGameOver()) return true;
        // Use player global, check hp
        if (typeof player !== 'undefined' && player.hp <= 0) { this.logMessage("Player eliminated! GAME OVER!"); this.setGameOver(); return true; }
        // Use enemies global, check length of LIVING enemies
        if (typeof enemies !== 'undefined' && enemies.filter(e => e && e.hp > 0).length === 0) { this.logMessage("All enemies eliminated! YOU WIN!"); this.setGameOver(); return true; }
        return false;
    },

    // --- Shrink Logic ---
    /** Shrinks the safe zone boundaries */
    shrinkSafeZone: function() {
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) { return false; }
        const oldZoneJSON = JSON.stringify(this.safeZone);
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT; const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT; const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        let shrunk = false;
        if (newMinRow <= newMaxRow) { if(this.safeZone.minRow !== newMinRow || this.safeZone.maxRow !== newMaxRow){ this.safeZone.minRow = newMinRow; this.safeZone.maxRow = newMaxRow; shrunk = true; } }
        if (newMinCol <= newMaxCol) { if(this.safeZone.minCol !== newMinCol || this.safeZone.maxCol !== newMaxCol){ this.safeZone.minCol = newMinCol; this.safeZone.maxCol = newMaxCol; shrunk = true; } }
        if (shrunk) { const zone = this.safeZone; this.logMessage(`Storm shrinks! Safe: R[${zone.minRow}-${zone.maxRow}], C[${zone.minCol}-${zone.maxCol}]`); console.log("After Shrink:", JSON.stringify(this.safeZone)); }
        return shrunk;
    },

    // --- Storm Damage Logic ---
    /** Applies storm damage and checks end conditions */
    applyStormDamage: function() {
        if (this.isGameOver()) return false;
        const zone = this.safeZone; let stateChanged = false; let gameEnded = false;
        if (typeof player !== 'undefined' && player.hp > 0) { if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) { const damage = STORM_DAMAGE; this.logMessage(`Player takes ${damage} storm damage!`); player.hp -= damage; stateChanged = true; if (this.checkEndConditions()) { gameEnded = true; } } }
        if (!gameEnded && typeof enemies !== 'undefined') { let enemiesKilledByStorm = 0; enemies = enemies.filter(enemy => { if (!enemy || enemy.hp <= 0) return false; if (enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol) { const damage = STORM_DAMAGE; this.logMessage(`Enemy ${enemy.id} takes ${damage} storm damage!`); enemy.hp -= damage; stateChanged = true; if (enemy.hp <= 0) { this.logMessage(`Enemy ${enemy.id} eliminated by storm!`); enemiesKilledByStorm++; return false; } } return true; }); if (enemiesKilledByStorm > 0) { stateChanged = true; if (this.checkEndConditions()) { gameEnded = true; } } }
         return stateChanged;
    },

    // --- Turn Management ---
    /** Ends player turn, switches to AI */
    endPlayerTurn: function() {
        if (this.isGameOver()) return;
        this.currentTurn = 'ai';
        if (typeof executeAiTurns === 'function') { setTimeout(executeAiTurns, 100); }
        else { console.error("executeAiTurns function not found!"); this.currentTurn = 'player'; }
    },

    /** Ends AI turn, increments turn counter, runs checks, switches to Player */
    endAiTurn: function() {
        if (this.isGameOver()) return;
        this.turnNumber++; // Increment turn first
        const didShrink = this.shrinkSafeZone();
        const damageApplied = this.applyStormDamage(); // Calls checkEndConditions internally now
        if (this.isGameOver()) return; // Stop if game ended
        this.currentTurn = 'player';
        if (didShrink || damageApplied) { if (typeof redrawCanvas === 'function') { redrawCanvas(); } }
        else { if (typeof drawUI === 'function') { drawUI(ctx); } } // Just update UI text
    },
};