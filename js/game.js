console.log("game.js loaded");

/**
 * The Game object now primarily contains functions that operate on a GameState object.
 * It no longer holds the state itself.
 */
const Game = {
    // --- State Accessors ---
    getCurrentTurn: function(gameState) { return gameState.currentTurn; },
    isPlayerTurn: function(gameState) { return gameState.gameActive && gameState.currentTurn === 'player'; },
    isGameOver: function(gameState) { return !gameState.gameActive; },
    getTurnNumber: function(gameState) { return gameState.turnNumber; },
    getSafeZone: function(gameState) { return { ...gameState.safeZone }; }, // Return a copy
    getLog: function(gameState) { return [...gameState.logMessages]; }, // Return a copy

    // --- State Modifiers ---
    /** Sets the game state to inactive (game over). */
    setGameOver: function(gameState) {
        if (!gameState.gameActive) return; // Don't run multiple times
        console.log("GAME STATE: Setting gameActive = false."); // Keep essential console log
        gameState.gameActive = false;
        // Win/Loss message should be logged by checkEndConditions before calling this
        // Redrawing is now handled by the main loop/renderer
    },

    // --- Logging ---
    /** Adds a message object {message, cssClass} to the gameState's logMessages array */
    logMessage: function(message, gameState, className = null) { // Default class is null
        console.log("LOG:", message); // Keep console log for debugging
        const messageWithTurn = `T${gameState.turnNumber}: ${message}`;
        // Store as an object in gameState
        gameState.logMessages.push({ message: messageWithTurn, cssClass: className });
        if (gameState.logMessages.length > MAX_LOG_MESSAGES) { // Use constant directly
            gameState.logMessages.shift();
        }
        // UI update (updateLogDisplay) is now handled by the main loop/UI module
    },

    // --- End Condition Check ---
    /** Checks end conditions based on gameState and logs/calls setGameOver if met */
    checkEndConditions: function(gameState) {
        if (this.isGameOver(gameState)) return true; // Use the accessor with gameState

        // Check player state from gameState
        if (gameState.player && gameState.player.hp <= 0) {
            this.logMessage("Player eliminated! GAME OVER!", gameState, LOG_CLASS_PLAYER_BAD); // Pass gameState
            this.setGameOver(gameState); // Pass gameState
            return true;
        }

        // Check enemy state from gameState
        if (gameState.enemies && gameState.enemies.filter(e => e && e.hp > 0).length === 0) {
            this.logMessage("All enemies eliminated! YOU WIN!", gameState, LOG_CLASS_PLAYER_GOOD); // Pass gameState
            this.setGameOver(gameState); // Pass gameState
            return true;
        }
        return false;
    },

    // --- Safe Zone Helpers ---
    /** Checks if a given coordinate is outside the current safe zone */
    isOutsideSafeZone: function(row, col, gameState) {
        const zone = gameState.safeZone;
        if (!zone) return false; // Or handle appropriately if zone might be null initially
        return row < zone.minRow || row > zone.maxRow || col < zone.minCol || col > zone.maxCol;
    },

    // --- Shrink Logic ---
    /**
     * Shrinks the safe zone boundaries in the gameState based on SHRINK_AMOUNT.
     * Includes checks to prevent zone inversion.
     * @param {GameState} gameState - The current game state.
     * @returns {boolean} - True if the zone boundaries actually changed.
     */
    shrinkSafeZone: function(gameState) {
        // Check if it's time to shrink based on gameState.turnNumber
        if (gameState.turnNumber <= 1 || (gameState.turnNumber - 1) % SHRINK_INTERVAL !== 0) {
             return false; // Not time to shrink
        }

        console.log("SHRINKING SAFE ZONE!");
        const oldZoneJSON = JSON.stringify(gameState.safeZone); // Use gameState

        // Calculate new boundaries based on gameState.safeZone
        const newMinRow = gameState.safeZone.minRow + SHRINK_AMOUNT;
        const newMaxRow = gameState.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = gameState.safeZone.minCol + SHRINK_AMOUNT;
        const newMaxCol = gameState.safeZone.maxCol - SHRINK_AMOUNT;

        let shrunk = false; // Flag if dimensions actually changed

        // Apply changes to gameState.safeZone with checks
        if (newMinRow <= newMaxRow) {
            gameState.safeZone.minRow = newMinRow;
            gameState.safeZone.maxRow = newMaxRow;
        } else {
            console.log("Shrink prevented rows: Min/max met or crossed.");
        }

        if (newMinCol <= newMaxCol) {
            gameState.safeZone.minCol = newMinCol;
            gameState.safeZone.maxCol = newMaxCol;
        } else {
            console.log("Shrink prevented cols: Col min/max met or crossed.");
        }

        // Check if gameState.safeZone actually changed
        if (JSON.stringify(gameState.safeZone) !== oldZoneJSON){
            shrunk = true;
            const zone = gameState.safeZone; // Use local var for log clarity
            this.logMessage(`Storm shrinks! Safe Zone: R[${zone.minRow}-${zone.maxRow}], C[${zone.minCol}-${zone.maxCol}]`, gameState, LOG_CLASS_SYSTEM); // Pass gameState
            console.log("After Shrink:", JSON.stringify(gameState.safeZone)); // Keep console log for debug
        }

        return shrunk; // Indicate if shrink happened
    },

    // --- Storm Damage Logic ---
    /** Applies storm damage to units outside the safe zone in gameState */
    applyStormDamage: function(gameState) {
        if (this.isGameOver(gameState)) return false; // Use accessor

        let stateChanged = false;
        let gameEnded = false;

        // Check Player
        if (gameState.player && gameState.player.hp > 0) {
             if (this.isOutsideSafeZone(gameState.player.row, gameState.player.col, gameState)) {
                  const damage = STORM_DAMAGE; // Use constant
                  this.logMessage(`Player at (${gameState.player.row},${gameState.player.col}) takes ${damage} storm damage!`, gameState, LOG_CLASS_PLAYER_BAD); // Pass gameState
                  gameState.player.hp -= damage;
                  stateChanged = true;
                  if (this.checkEndConditions(gameState)) { gameEnded = true; } // Pass gameState
             }
        }

        // Check Enemies (use filter directly on gameState.enemies)
        if (!gameEnded && gameState.enemies) {
            let enemiesKilledByStorm = 0;
            // Filter in place or create new array? Let's modify in place for now.
            const survivingEnemies = [];
            for (const enemy of gameState.enemies) {
                if (!enemy || enemy.hp <= 0) continue; // Skip dead/invalid enemies

                if (this.isOutsideSafeZone(enemy.row, enemy.col, gameState)) {
                     const damage = STORM_DAMAGE; // Use constant
                     this.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) takes ${damage} storm damage!`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
                     enemy.hp -= damage;
                     stateChanged = true;
                     if (enemy.hp <= 0) {
                         this.logMessage(`Enemy ${enemy.id} eliminated by storm!`, gameState, LOG_CLASS_ENEMY_EVENT); // Pass gameState
                         enemiesKilledByStorm++;
                         // Don't add to survivingEnemies
                     } else {
                         survivingEnemies.push(enemy); // Keep alive enemy
                     }
                } else {
                    survivingEnemies.push(enemy); // Keep safe enemy
                }
            }
            gameState.enemies = survivingEnemies; // Update the enemies array in gameState

            if (enemiesKilledByStorm > 0) {
                stateChanged = true;
                if (this.checkEndConditions(gameState)) { gameEnded = true; } // Pass gameState
            }
        }
         return stateChanged; // Indicate if any damage was applied or enemies removed
    },

    // --- Turn Management ---
    /** Ends player turn, switches currentTurn in gameState to 'ai' */
    endPlayerTurn: function(gameState) {
        if (this.isGameOver(gameState)) return;
        gameState.currentTurn = 'ai';
        // console.log("Switching to AI turn");
        // The actual execution of AI turns (executeAiTurns) is now handled by the main loop
    },

    /** Ends AI turn: increments turn counter, runs checks, switches currentTurn in gameState to 'player' */
    endAiTurn: function(gameState) {
        if (this.isGameOver(gameState)) return;

        gameState.turnNumber++;
        // console.log(`Turn ${gameState.turnNumber} begins.`);

        this.shrinkSafeZone(gameState); // Pass gameState, logs internally
        this.applyStormDamage(gameState); // Pass gameState, logs internally, calls checkEndConditions

        if (this.isGameOver(gameState)) return; // Stop if game ended during checks

        gameState.currentTurn = 'player';
        // console.log("AI Turns complete. Player turn.");

        // Redrawing the canvas is now handled by the main loop/renderer
    },

    // --- Unit Position & Pickup Helpers MOVED to js/utils.js (2025-04-09) ---
};

// console.log("Game object updated to operate on GameState");
