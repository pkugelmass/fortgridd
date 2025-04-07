console.log("game.js loaded");

const Game = {
    // --- State Variables ---
    currentTurn: 'player',
    gameActive: true,
    turnNumber: 1,
    safeZone: { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 },
    // gameResult: null, // Optional state for win/loss reason

    // --- State Accessors ---
    getCurrentTurn: function() { return this.currentTurn; },
    isPlayerTurn: function() { return this.gameActive && this.currentTurn === 'player'; },
    isGameOver: function() { return !this.gameActive; },
    getTurnNumber: function() { return this.turnNumber; },
    getSafeZone: function() { return { ...this.safeZone }; },

    // --- State Modifiers ---
    setGameOver: function() { // Removed parameter, drawUI checks player HP
        if (!this.gameActive) return; // Don't run multiple times
        console.log("GAME STATE: Setting gameActive = false.");
        this.gameActive = false;
        // Redraw needed to show final state via UI
        if (typeof redrawCanvas === 'function') { redrawCanvas(); }
        else { console.error("redrawCanvas not found when setting game over!"); }
    },

    // --- NEW: End Condition Check ---
    /**
     * Checks if the game should end based on player HP or enemy count.
     * Calls setGameOver internally if end condition met.
     * @returns {boolean} - True if the game ended as a result of this check, false otherwise.
     */
    checkEndConditions: function() {
        if (this.isGameOver()) return true; // Already over

        // Check Player Loss (ensure player object exists)
        if (typeof player !== 'undefined' && player.hp <= 0) {
            console.log("Game End Check: Player HP <= 0. GAME OVER.");
            this.setGameOver();
            return true; // Game ended
        }
        // Check Player Win (ensure enemies array exists)
        if (typeof enemies !== 'undefined' && enemies.length === 0) {
            console.log("Game End Check: No enemies left. YOU WIN!");
            this.setGameOver();
            return true; // Game ended
        }
        return false; // Game continues
    },


    // --- Shrink Logic ---
    /** Shrinks the safe zone boundaries */
    shrinkSafeZone: function() {
        // console.log(`TURN ${this.turnNumber}: Checking for shrink...`);
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) { return false; }
        console.log("SHRINKING SAFE ZONE!"); // Keep this log
        // console.log("Before Shrink:", JSON.stringify(this.safeZone)); // Optional detailed log
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT; const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        let shrunk = false;
        if (newMinRow <= newMaxRow) { if(this.safeZone.minRow !== newMinRow || this.safeZone.maxRow !== newMaxRow){ this.safeZone.minRow = newMinRow; this.safeZone.maxRow = newMaxRow; shrunk = true; } } // else { console.log("Shrink prevented rows"); }
        if (newMinCol <= newMaxCol) { if(this.safeZone.minCol !== newMinCol || this.safeZone.maxCol !== newMaxCol){ this.safeZone.minCol = newMinCol; this.safeZone.maxCol = newMaxCol; shrunk = true; } } // else { console.log("Shrink prevented cols"); }
        if (shrunk) { console.log("After Shrink:", JSON.stringify(this.safeZone)); }
        return shrunk;
    },

    // --- Storm Damage Logic ---
    /** Applies storm damage and checks end conditions */
    applyStormDamage: function() {
        if (this.isGameOver()) return false;
        const zone = this.safeZone;
        let stateChanged = false;

        // Check Player
        if (typeof player !== 'undefined' && player.hp > 0) {
             if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) {
                  console.log(`Player takes ${STORM_DAMAGE} storm damage!`); player.hp -= STORM_DAMAGE; stateChanged = true; console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                  // Check immediately if player died from storm
                  if (this.checkEndConditions()) return true; // Game ended, flag state change
             }
        }
        // Check Enemies only if game didn't just end
        if (!this.isGameOver() && typeof enemies !== 'undefined') {
            const originalLength = enemies.length;
            enemies = enemies.filter(enemy => {
                if (!enemy || enemy.hp <= 0) return false;
                if (enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol) {
                     console.log(`Enemy ${enemy.id} takes ${STORM_DAMAGE} storm damage!`); enemy.hp -= STORM_DAMAGE; stateChanged = true;
                     if (enemy.hp <= 0) { console.log(`Enemy ${enemy.id} eliminated by storm!`); return false; } // Remove dead enemy
                }
                return true; // Keep enemy
            });
             // Check immediately if last enemy died from storm
             if (enemies.length < originalLength) {
                 stateChanged = true; // Mark state change for redraw
                 if (this.checkEndConditions()) return true; // Game ended
             }
        }
         return stateChanged; // Return true if any HP changed or enemies died (for redraw logic)
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

        this.turnNumber++; console.log(`Turn ${this.turnNumber} begins.`);
        const didShrink = this.shrinkSafeZone();
        // applyStormDamage calls checkEndConditions internally now
        const damageApplied = this.applyStormDamage();

        // If game ended during storm damage phase, stop here
        if (this.isGameOver()) return;

        // Switch back to player
        this.currentTurn = 'player';
        console.log("AI Turns complete. Player turn.");
        if (didShrink || damageApplied) { if (typeof redrawCanvas === 'function') { redrawCanvas(); } }
        else { if (typeof drawUI === 'function') { drawUI(ctx); } }
    },
};