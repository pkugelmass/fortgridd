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

    // --- Logging --- (MODIFIED: Accepts optional className)
    /** Adds a message object {message, cssClass} to the game log */
    logMessage: function(message, className = null) { // Default class is null
        console.log("LOG:", message);
        const messageWithTurn = `T${this.turnNumber}: ${message}`;
        // Store as an object
        this.gameLog.push({ message: messageWithTurn, cssClass: className }); // Use push
        if (this.gameLog.length > MAX_LOG_MESSAGES) { // Use constant directly
            this.gameLog.shift(); // Use shift
        }
        if (typeof updateLogDisplay === 'function') { updateLogDisplay(); }
        else { console.warn("updateLogDisplay function not found!"); }
    },

    // --- End Condition Check --- (MODIFIED: Pass class to logMessage)
    /** Checks end conditions and logs/calls setGameOver if met */
    checkEndConditions: function() {
        if (this.isGameOver()) return true;
        if (typeof player !== 'undefined' && player.hp <= 0) {
            this.logMessage("Player eliminated! GAME OVER!", LOG_CLASS_PLAYER_BAD); // Use constant
            this.setGameOver(); return true;
        }
        if (typeof enemies !== 'undefined' && enemies.filter(e => e && e.hp > 0).length === 0) {
            this.logMessage("All enemies eliminated! YOU WIN!", LOG_CLASS_PLAYER_GOOD); // Use constant
            this.setGameOver(); return true;
        }
        return false;
    },

    // --- Shrink Logic ---
    /**
     * Shrinks the safe zone boundaries based on SHRINK_AMOUNT.
     * Includes checks to prevent zone inversion.
     * Called from endAiTurn.
     * @returns {boolean} - True if the zone boundaries actually changed.
     */
    shrinkSafeZone: function() {
        // Check if it's time to shrink (uses SHRINK_INTERVAL from config.js)
        // Compare (turnNumber - 1) to shrink *after* the interval turn completes
        if (this.turnNumber <= 1 || (this.turnNumber - 1) % SHRINK_INTERVAL !== 0) {
             return false; // Not time to shrink
        }

        console.log("SHRINKING SAFE ZONE!");
        // console.log("Before Shrink:", JSON.stringify(this.safeZone)); // Optional debug
        const oldZoneJSON = JSON.stringify(this.safeZone); // For accurate change detection

        // --- Ensure these definitions exist ---
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; // Uses SHRINK_AMOUNT from config.js
        const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT;
        const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        // --- End definitions ---

        let shrunk = false; // Flag if dimensions actually changed

        // Apply changes with checks to prevent inversion (min crossing max)
        // Check newMin <= newMax to prevent crossing
        if (newMinRow <= newMaxRow) {
            this.safeZone.minRow = newMinRow;
            this.safeZone.maxRow = newMaxRow;
            // Note: shrunk flag will be set below based on actual change
        } else {
            // Min/Max have met or crossed, stop shrinking rows
            console.log("Shrink prevented rows: Min/max met or crossed.");
        }

        if (newMinCol <= newMaxCol) {
            this.safeZone.minCol = newMinCol;
            this.safeZone.maxCol = newMaxCol;
        } else {
            // Min/Max have met or crossed, stop shrinking cols
            console.log("Shrink prevented cols: Col min/max met or crossed.");
        }

        // Check if the zone actually changed compared to before
        if (JSON.stringify(this.safeZone) !== oldZoneJSON){
            shrunk = true;
            const zone = this.safeZone; // Use local var for log clarity
            this.logMessage(`Storm shrinks! Safe Zone: R[${zone.minRow}-${zone.maxRow}], C[${zone.minCol}-${zone.maxCol}]`, LOG_CLASS_SYSTEM); // Use constant
            console.log("After Shrink:", JSON.stringify(this.safeZone)); // Keep console log for debug
        } else {
            // console.log("Shrink calculated but resulted in no change."); // Optional log
        }

        return shrunk; // Indicate if shrink happened
    },

    // --- Storm Damage Logic --- (MODIFIED: Pass class to logMessage)
    /** Applies storm damage and checks end conditions */
    applyStormDamage: function() {
        if (this.isGameOver()) return false;
        const zone = this.safeZone; let stateChanged = false; let gameEnded = false;
        // Check Player
        if (typeof player !== 'undefined' && player.hp > 0) {
             if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) {
                  const damage = STORM_DAMAGE;
                  this.logMessage(`Player at (${player.row},${player.col}) takes ${damage} storm damage!`, LOG_CLASS_PLAYER_BAD); // Use constant
                  player.hp -= damage; stateChanged = true;
                  if (this.checkEndConditions()) { gameEnded = true; }
             }
        }
        // Check Enemies
        if (!gameEnded && typeof enemies !== 'undefined') {
            let enemiesKilledByStorm = 0;
            enemies = enemies.filter(enemy => {
                if (!enemy || enemy.hp <= 0) return false;
                if (enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol) {
                     const damage = STORM_DAMAGE;
                     this.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) takes ${damage} storm damage!`, LOG_CLASS_ENEMY_EVENT); // Use constant
                     enemy.hp -= damage; stateChanged = true;
                     if (enemy.hp <= 0) { this.logMessage(`Enemy ${enemy.id} eliminated by storm!`, LOG_CLASS_ENEMY_EVENT); enemiesKilledByStorm++; return false; } // Use constant
                }
                return true;
            });
             if (enemiesKilledByStorm > 0) { stateChanged = true; if (this.checkEndConditions()) { gameEnded = true; } }
        }
         return stateChanged;
    },


    // --- Turn Management ---
    /** Ends player turn, switches to AI */
    endPlayerTurn: function() {
        if (this.isGameOver()) return;
        this.currentTurn = 'ai';
        // console.log("Switching to AI turn"); // Quieter log
        if (typeof executeAiTurns === 'function') { setTimeout(executeAiTurns, AI_TURN_DELAY); } // Use constant
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
