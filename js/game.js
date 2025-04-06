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
    getCurrentTurn: function() { return this.currentTurn; },
    isPlayerTurn: function() { return this.gameActive && this.currentTurn === 'player'; },
    isGameOver: function() { return !this.gameActive; },
    getTurnNumber: function() { return this.turnNumber; },
    getSafeZone: function() { return { ...this.safeZone }; }, // Return a copy

    // --- State Modifiers ---
    setGameOver: function() {
        if (!this.gameActive) return; // Don't run multiple times
        console.log("GAME STATE: Setting gameActive = false");
        this.gameActive = false;
        // Redraw needed to show final state via UI
        if (typeof redrawCanvas === 'function') { redrawCanvas(); }
        else { console.error("redrawCanvas not found when setting game over!"); }
    },

    // --- Shrink Logic ---
    /** Shrinks the safe zone boundaries based on SHRINK_AMOUNT. */
    shrinkSafeZone: function() {
        // console.log(`TURN ${this.turnNumber}: Checking for shrink (Interval: ${SHRINK_INTERVAL})`); // Quieter log
        // Use SHRINK_INTERVAL from config.js. Shrink happens AFTER turn N completes.
        if (this.turnNumber <= 1 || (this.turnNumber -1) % SHRINK_INTERVAL !== 0) {
             return false; // Indicate no shrink happened
        }

        console.log("SHRINKING SAFE ZONE!");
        console.log("Before Shrink:", JSON.stringify(this.safeZone));
        const newMinRow = this.safeZone.minRow + SHRINK_AMOUNT; // SHRINK_AMOUNT from config.js
        const newMaxRow = this.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = this.safeZone.minCol + SHRINK_AMOUNT;
        const newMaxCol = this.safeZone.maxCol - SHRINK_AMOUNT;
        let shrunk = false;

        if (newMinRow <= newMaxRow) {
            if(this.safeZone.minRow !== newMinRow || this.safeZone.maxRow !== newMaxRow){
                this.safeZone.minRow = newMinRow; this.safeZone.maxRow = newMaxRow; shrunk = true;
            }
        } else { console.log("Shrink prevented rows: Min/max crossed."); }

        if (newMinCol <= newMaxCol) {
             if(this.safeZone.minCol !== newMinCol || this.safeZone.maxCol !== newMaxCol){
                this.safeZone.minCol = newMinCol; this.safeZone.maxCol = newMaxCol; shrunk = true;
            }
        } else { console.log("Shrink prevented cols: Col min/max crossed."); }

        if (shrunk) { console.log("After Shrink:", JSON.stringify(this.safeZone)); }
        return shrunk; // Indicate if shrink happened
    },

    // --- NEW: Storm Damage Logic ---
    /**
     * Checks player and enemies, applies STORM_DAMAGE if they are outside the safe zone.
     * Handles defeat/win conditions triggered by storm damage.
     * @returns {boolean} - True if any damage was applied or units were defeated, false otherwise.
     */
    applyStormDamage: function() {
        if (this.isGameOver()) return false; // Don't apply if already over

        const zone = this.safeZone;
        let stateChanged = false; // Track if HP changed or units died

        // Check Player (ensure player exists and is alive)
        if (typeof player !== 'undefined' && player.hp > 0) {
             if (player.row < zone.minRow || player.row > zone.maxRow || player.col < zone.minCol || player.col > zone.maxCol) {
                  console.log(`Player at (${player.row}, ${player.col}) takes ${STORM_DAMAGE} storm damage! Zone: r[${zone.minRow}-${zone.maxRow}], c[${zone.minCol}-${zone.maxCol}]`);
                  player.hp -= STORM_DAMAGE; // STORM_DAMAGE from config.js
                  stateChanged = true;
                  console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                  if (player.hp <= 0) {
                       console.log("Player eliminated by storm! GAME OVER!");
                       this.setGameOver(); // setGameOver handles redraw and stops further processing
                       alert("GAME OVER!"); // Keep alert for immediate feedback
                       return true; // Indicate state changed significantly (game ended)
                  }
             }
        }

        // Check Enemies (use filter for safe removal during iteration)
        if (typeof enemies !== 'undefined') {
            const originalLength = enemies.length;
            // Filter keeps enemies that return true
            enemies = enemies.filter(enemy => {
                if (!enemy || enemy.hp <= 0) return false; // Remove if already dead or invalid

                // Check if enemy is outside safe zone
                if (enemy.row < zone.minRow || enemy.row > zone.maxRow || enemy.col < zone.minCol || enemy.col > zone.maxCol) {
                     console.log(`Enemy ${enemy.id} at (${enemy.row}, ${enemy.col}) takes ${STORM_DAMAGE} storm damage!`);
                     enemy.hp -= STORM_DAMAGE;
                     stateChanged = true;
                     if (enemy.hp <= 0) {
                          console.log(`Enemy ${enemy.id} eliminated by storm!`);
                          return false; // Remove dead enemy from array
                     }
                }
                return true; // Keep enemy if inside zone OR damaged but still alive
            });

             // Check Win Condition (if any enemies were removed by the storm AND none are left)
             if (enemies.length < originalLength && enemies.length === 0 && !this.isGameOver()) {
                 console.log("Last enemy eliminated by storm! YOU WIN!");
                 this.setGameOver();
                 alert("YOU WIN!");
                 return true; // Indicate state changed significantly (game ended)
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

        // Increment turn number FIRST
        this.turnNumber++;
        console.log(`Turn ${this.turnNumber} begins.`);

        // Shrink Zone (check happens inside function)
        const didShrink = this.shrinkSafeZone();

        // Apply Storm Damage (check happens inside function)
        // This function returns true if damage/defeat occurred, and handles game over internally
        const damageApplied = this.applyStormDamage();

        // If game ended during damage phase, stop here
        if (this.isGameOver()) return;

        // Switch back to player
        this.currentTurn = 'player';
        console.log("AI Turns complete. Player turn.");

        // Redraw if the zone shrunk OR if damage was applied
        // Otherwise, just update UI text for turn indicator
        if (didShrink || damageApplied) {
             if (typeof redrawCanvas === 'function') { redrawCanvas(); }
             else { console.error("redrawCanvas not found when ending AI turn!"); }
        } else {
             if (typeof drawUI === 'function') { drawUI(ctx); } // Only update UI if no other visual change
             else { console.error("drawUI not found when ending AI turn!"); }
        }
    },
};

// console.log("Game object created:", Game);