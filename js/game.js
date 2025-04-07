console.log("game.js loaded");

const Game = {
    // --- State Variables ---
    currentTurn: 'player',
    gameActive: true,
    turnNumber: 1,
    safeZone: { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 }, // Uses globals from config.js
    gameLog: [], // Initial message added by main.js now
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
        if (!this.gameActive) return; // Don't run multiple times
        console.log("GAME STATE: Setting gameActive = false."); // Keep essential console log
        this.gameActive = false;
        // Win/Loss message logged by checkEndConditions before calling this
        if (typeof redrawCanvas === 'function') { redrawCanvas(); } // Redraw to show final state via UI
        else { console.error("redrawCanvas not found when setting game over!"); }
    },

    // --- Logging ---
    /** Adds a message to the END of the game log, trims old messages from the START */
    logMessage: function(message) {
        // console.log("LOG:", message); // Optional: Keep console log for debug
        const messageWithTurn = `T${this.turnNumber}: ${message}`;
        this.gameLog.push(messageWithTurn); // *** USE PUSH ***
        // Use MAX_LOG_MESSAGES from config.js (global)
        if (this.gameLog.length > (MAX_LOG_MESSAGES || 15)) { // Use constant or fallback
            this.gameLog.shift(); // *** USE SHIFT *** Remove oldest from beginning
        }
        // Trigger display update - relies on updateLogDisplay being globally available
        if (typeof updateLogDisplay === 'function') {
             updateLogDisplay();
        } else {
             // This might happen initially if game.js loads slightly before main.js defines it fully
             // console.warn("updateLogDisplay function not found when logging message.");
        }
    },

    // --- End Condition Check ---
    /** Checks end conditions and logs/calls setGameOver if met */
    checkEndConditions: function() {
        if (this.isGameOver()) return true; // Already over

        // Check Player Loss (ensure player object exists)
        if (typeof player !== 'undefined' && player.hp <= 0) {
            this.logMessage("Player eliminated! GAME OVER!"); // Log game end
            this.setGameOver();
            return true; // Game ended
        }
        // Check Player Win (ensure enemies array exists and check LIVING enemies)
        if (typeof enemies !== 'undefined' && enemies.filter(e => e && e.hp > 0).length === 0) {
            this.logMessage("All enemies eliminated! YOU WIN!"); // Log game end
            this.setGameOver();
            return true; // Game ended
        }
        return false; // Game continues
    },


    // --- Shrink Logic ---
    /** Shrinks the safe zone boundaries and logs if it happens */
    shrinkSafeZone: function() {
        // Use SHRINK_INTERVAL, SHRINK_AMOUNT from config.js
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) { return false; }
        const oldZoneJSON = JSON.stringify(this.safeZone); // Store for comparison
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT; const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        let shrunk = false;
        // Apply changes with checks to prevent inversion
        if (newMinRow <= newMaxRow) { this.safeZone.minRow = newMinRow; this.safeZone.maxRow = newMaxRow; }
        if (newMinCol <= newMaxCol) { this.safeZone.minCol = newMinCol; this.safeZone.maxCol = newMaxCol; }
        // Check if boundaries actually changed
        if (JSON.stringify(this.safeZone) !== oldZoneJSON) { shrunk = true; }

        if (shrunk) {
             const zone = this.safeZone;
             // *** Log shrink event ***
             this.logMessage(`Storm shrinks! Safe Zone: R[${zone.minRow}-${zone.maxRow}], C[${zone.minCol}-${zone.maxCol}]`);
             console.log("After Shrink:", JSON.stringify(this.safeZone)); // Keep console log for debug
        }
        return shrunk;
    },

    // --- Storm Damage Logic ---
    /** Applies storm damage and checks end conditions, logs damage/defeats */
    applyStormDamage: function() {
        if (this.isGameOver()) return false;
        const zone = this.safeZone;
        let stateChanged = false;
        let gameEnded = false; // Flag to prevent further checks if game ends mid-function

        // Check Player
        if (typeof player !== 'undefined' && player.hp > 0) {
             if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) {
                  const damage = STORM_DAMAGE; // Use constant
                  // *** Log Player storm damage ***
                  this.logMessage(`Player at (${player.row},${player.col}) takes ${damage} storm damage!`);
                  player.hp -= damage; stateChanged = true;
                  // console.log(`Player HP: ${player.hp}/${player.maxHp}`); // Logged by UI update
                  if (this.checkEndConditions()) { gameEnded = true; /* Game ended, message logged by checkEndConditions */ }
             }
        }
        // Check Enemies only if game didn't just end
        if (!gameEnded && typeof enemies !== 'undefined') {
            let enemiesKilledByStorm = 0;
            enemies = enemies.filter(enemy => { // Use filter for safe removal
                if (!enemy || enemy.hp <= 0) return false; // Skip already dead
                // Check if enemy is outside safe zone
                if (enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol) {
                     const damage = STORM_DAMAGE;
                     // *** Log Enemy storm damage ***
                     this.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) takes ${damage} storm damage!`);
                     enemy.hp -= damage; stateChanged = true;
                     if (enemy.hp <= 0) {
                          // *** Log defeat by storm ***
                          this.logMessage(`Enemy ${enemy.id} eliminated by storm!`);
                          enemiesKilledByStorm++;
                          return false; // Remove dead enemy from array
                     }
                }
                return true; // Keep enemy
            });

             // Check immediately if last enemy died from storm
             if (enemiesKilledByStorm > 0) {
                 stateChanged = true; // Ensure redraw if only change was enemy death
                 if (this.checkEndConditions()) { gameEnded = true; /* Game ended, message logged by checkEndConditions */ }
             }
        }
         return stateChanged; // Return true if any HP changed or enemies died (for redraw logic)
    },


    // --- Turn Management ---
    /** Ends player turn, switches to AI */
    endPlayerTurn: function() {
        if (this.isGameOver()) return;
        this.currentTurn = 'ai';
        // console.log("Switching to AI turn"); // Quieter log
        if (typeof executeAiTurns === 'function') { setTimeout(executeAiTurns, 100); }
        else { console.error("executeAiTurns function not found!"); this.currentTurn = 'player'; }
    },

    /** Ends AI turn, increments turn counter, runs checks, switches to Player */
    endAiTurn: function() {
        if (this.isGameOver()) return;
        this.turnNumber++;
        // Turn begins log removed as requested
        const didShrink = this.shrinkSafeZone(); // Logs internally
        const damageApplied = this.applyStormDamage(); // Logs internally, calls checkEndConditions

        if (this.isGameOver()) return; // Stop if game ended during checks

        this.currentTurn = 'player';
        // console.log("AI Turns complete. Player turn."); // Quieter log
        if (didShrink || damageApplied) { // Redraw if visual state changed
            if (typeof redrawCanvas === 'function') { redrawCanvas(); }
            else { console.error("redrawCanvas not found when ending AI turn!"); }
        } else { // Otherwise just update UI text which includes turn indicator
            if (typeof drawUI === 'function' && typeof ctx !== 'undefined') { drawUI(ctx); } // Check ctx too
            else { console.warn("drawUI or ctx not found when ending AI turn, UI text might not update."); }
        }
    },
};

// console.log("Game object created"); // Quieter log