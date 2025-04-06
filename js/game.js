console.log("game.js loaded");

const Game = {
    // --- State Variables ---
    currentTurn: 'player',
    gameActive: true,
    turnNumber: 1, // Track game turns
    safeZone: {    // Track safe zone boundaries
        minRow: 0,
        maxRow: GRID_HEIGHT - 1, // Use constants from config.js
        minCol: 0,
        maxCol: GRID_WIDTH - 1   // Use constants from config.js
    },


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

    getTurnNumber: function() {
         return this.turnNumber;
    }, // Added accessor

    getSafeZone: function() {
         // Return a copy to prevent direct modification from outside
         return { ...this.safeZone };
    }, // Added accessor


    // --- State Modifiers ---
    setGameOver: function() {
        console.log("GAME STATE: Setting gameActive = false");
        this.gameActive = false;
        // Redraw needed to show final state via UI
        if (typeof redrawCanvas === 'function') {
             redrawCanvas();
        } else {
            console.error("redrawCanvas not found when setting game over!");
        }
    },

    // --- NEW: Shrink Logic ---
    /**
     * Shrinks the safe zone boundaries based on SHRINK_AMOUNT.
     * Includes checks to prevent zone inversion.
     * Called from endAiTurn.
     */
    shrinkSafeZone: function() {
        console.log(`TURN ${this.turnNumber}: Checking for shrink (Interval: ${SHRINK_INTERVAL})`);
        // Use SHRINK_INTERVAL from config.js
        // Don't shrink on turn 1, only on multiples of interval
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) {
             // console.log("No shrink this turn."); // Optional log
             return false; // Indicate no shrink happened
        }

        console.log("SHRINKING SAFE ZONE!");
        console.log("Before Shrink:", JSON.stringify(this.safeZone));

        // Calculate potential new boundaries using SHRINK_AMOUNT from config.js
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT;
        const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT;
        const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;

        let shrunk = false; // Flag if dimensions actually changed

        // Apply changes with checks to prevent inversion (min crossing max)
        if (newMinRow <= newMaxRow) {
            if(this.safeZone.minRow !== newMinRow || this.safeZone.maxRow !== newMaxRow){
                this.safeZone.minRow = newMinRow;
                this.safeZone.maxRow = newMaxRow;
                shrunk = true;
            }
        } else {
            console.log("Shrink prevented rows: Row min/max would cross or meet.");
            // Optional: Could clamp to a minimum 1-row height if needed
        }

        if (newMinCol <= newMaxCol) {
             if(this.safeZone.minCol !== newMinCol || this.safeZone.maxCol !== newMaxCol){
                this.safeZone.minCol = newMinCol;
                this.safeZone.maxCol = newMaxCol;
                shrunk = true;
            }
        } else {
            console.log("Shrink prevented cols: Col min/max would cross or meet.");
            // Optional: Could clamp to a minimum 1-col width if needed
        }

        if (shrunk) {
             console.log("After Shrink:", JSON.stringify(this.safeZone));
             return true; // Indicate shrink happened
        } else {
             console.log("Shrink calculated but resulted in no change.");
             return false;
        }
    },


    // --- Turn Management ---
    endPlayerTurn: function() {
        if (!this.gameActive) return;
        // console.log("GAME STATE: Ending player turn, switching to AI.");
        this.currentTurn = 'ai';
        if (typeof executeAiTurns === 'function') {
            setTimeout(executeAiTurns, 100); // Trigger AI turns
        } else {
            console.error("executeAiTurns function not found!");
            this.currentTurn = 'player'; // Fail safe: switch back
        }
    },

    endAiTurn: function() {
        if (!this.gameActive) return;
        // console.log("GAME STATE: Ending AI turn, switching to Player.");

        // Increment turn number FIRST
        this.turnNumber++;
        console.log(`Turn ${this.turnNumber} begins.`); // Log new turn number

        // Call Shrink Logic (check happens inside shrinkSafeZone)
        const didShrink = this.shrinkSafeZone();

        // --- >>> Future: Add Storm Damage Logic Call Here <<< ---
        // const damageApplied = this.applyStormDamage();
        const damageApplied = false; // Placeholder

        // Check win/loss again after potential storm damage? (Could be handled in applyStormDamage)


        // Switch back to player if game still active
        if (!this.isGameOver()) {
            this.currentTurn = 'player';
            // Redraw if the zone shrunk OR if damage was applied (or always redraw)
            if (didShrink || damageApplied) {
                 if (typeof redrawCanvas === 'function') { redrawCanvas(); }
                 else { console.error("redrawCanvas not found when ending AI turn!"); }
            } else {
                 // If nothing visually changed, just update UI text for turn indicator
                 if (typeof drawUI === 'function') { drawUI(ctx); }
                 else { console.error("drawUI not found when ending AI turn!"); }
            }
        }
        // If game ended (e.g. storm damage killed player), setGameOver would handle final redraw
    },

};

// console.log("Game object created:", Game);