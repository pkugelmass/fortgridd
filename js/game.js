console.log("game.js loaded");

const Game = {
    // State Variables...
    currentTurn: 'player', gameActive: true, turnNumber: 1,
    safeZone: { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 },
    gameLog: ["Game Initialized."], // Start with init message
    MAX_LOG_MESSAGES: 10,

    // Accessors...
    getCurrentTurn: function() { return this.currentTurn; },
    isPlayerTurn: function() { return this.gameActive && this.currentTurn === 'player'; },
    isGameOver: function() { return !this.gameActive; },
    getTurnNumber: function() { return this.turnNumber; },
    getSafeZone: function() { return { ...this.safeZone }; },
    getLog: function() { return [...this.gameLog]; },

    // State Modifiers...
    setGameOver: function() {
        if (!this.gameActive) return;
        console.log("GAME STATE: Setting gameActive = false.");
        this.gameActive = false;
        // Log message handled by checkEndConditions before calling this
        if (typeof redrawCanvas === 'function') { redrawCanvas(); }
        else { console.error("redrawCanvas not found when setting game over!"); }
    },

    // Logging...
    /** Adds a message to the game log */
    logMessage: function(message) {
        console.log("LOG:", message); // Keep console log for debug if needed
        this.gameLog.unshift(`T${this.turnNumber}: ${message}`); // Add with Turn number
        if (this.gameLog.length > this.MAX_LOG_MESSAGES) { this.gameLog.pop(); }
        if (typeof updateLogDisplay === 'function') { updateLogDisplay(); } // Trigger HTML update
        else { console.warn("updateLogDisplay function not found when logging message."); }
    },

    // End Condition Check...
    /** Checks end conditions and calls setGameOver if met */
    checkEndConditions: function() {
        if (this.isGameOver()) return true;
        if (typeof player !== 'undefined' && player.hp <= 0) {
            this.logMessage("Player eliminated! GAME OVER!"); // Log game end
            this.setGameOver(); return true;
        }
        if (typeof enemies !== 'undefined' && enemies.length === 0) {
            this.logMessage("All enemies defeated! YOU WIN!"); // Log game end
            this.setGameOver(); return true;
        }
        return false;
    },

    // Shrink Logic...
    /** Shrinks the safe zone boundaries */
    shrinkSafeZone: function() {
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) { return false; }
        // console.log("SHRINKING SAFE ZONE!"); // Logged by logMessage now
        const oldZone = JSON.stringify(this.safeZone); // Store for comparison log
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT; const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        let shrunk = false;
        if (newMinRow <= newMaxRow) { if(this.safeZone.minRow !== newMinRow || this.safeZone.maxRow !== newMaxRow){ this.safeZone.minRow = newMinRow; this.safeZone.maxRow = newMaxRow; shrunk = true; } }
        if (newMinCol <= newMaxCol) { if(this.safeZone.minCol !== newMinCol || this.safeZone.maxCol !== newMaxCol){ this.safeZone.minCol = newMinCol; this.safeZone.maxCol = newMaxCol; shrunk = true; } }
        if (shrunk) {
             const zone = this.safeZone;
             this.logMessage(`Storm shrinks! Safe: R[${zone.minRow}-${zone.maxRow}], C[${zone.minCol}-${zone.maxCol}]`); // Log shrink event
             // console.log("After Shrink:", JSON.stringify(this.safeZone)); // Keep internal log if needed
        }
        return shrunk;
    },

    // Storm Damage Logic...
    /** Applies storm damage and checks end conditions */
    applyStormDamage: function() {
        if (this.isGameOver()) return false;
        const zone = this.safeZone;
        let stateChanged = false; let gameEnded = false;

        // Check Player
        if (typeof player !== 'undefined' && player.hp > 0) {
             if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) {
                  const damage = STORM_DAMAGE;
                  this.logMessage(`Player takes ${damage} storm damage!`); // Log storm damage
                  player.hp -= damage; stateChanged = true; // console.log(`Player HP: ${player.hp}/${player.maxHp}`); // Logged by UI update
                  if (this.checkEndConditions()) { gameEnded = true; } // Check if player died
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
                     this.logMessage(`Enemy ${enemy.id} takes ${damage} storm damage!`); // Log storm damage
                     enemy.hp -= damage; stateChanged = true;
                     if (enemy.hp <= 0) { this.logMessage(`Enemy ${enemy.id} eliminated by storm!`); enemiesKilledByStorm++; return false; } // Log defeat & remove
                }
                return true; // Keep enemy
            });
             if (enemiesKilledByStorm > 0) { // If any enemy died this turn
                 stateChanged = true; // Ensure redraw if only change was enemy death
                 if (this.checkEndConditions()) { gameEnded = true; } // Check if player won
             }
        }
         return stateChanged;
    },

    // Turn Management...
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
        this.turnNumber++;
        // *** REMOVED Turn Begins Log ***
        // this.logMessage(`Turn ${this.turnNumber} begins.`);

        const didShrink = this.shrinkSafeZone(); // Logs internally if shrink happens
        const damageApplied = this.applyStormDamage(); // Logs internally if damage/defeat happens

        if (this.isGameOver()) return; // Stop if storm damage ended the game

        this.currentTurn = 'player';
        // console.log("AI Turns complete. Player turn."); // Quieter log
        if (didShrink || damageApplied) { if (typeof redrawCanvas === 'function') { redrawCanvas(); } } // Redraw if state changed
        else { if (typeof drawUI === 'function') { drawUI(ctx); } } // Otherwise just update UI text
    },
};