// Player Actions Module: Handles the execution logic for specific player actions.
console.log("playerActions.js loaded");

const PlayerActions = {
    /**
     * Handles player movement or melee attack intent.
     * Checks boundaries, terrain, and enemies. Executes move or attack.
     * Assumes necessary functions (Game.logMessage, applyKnockback, updateUnitPosition)
     * and constants (TILE_*, PLAYER_ATTACK_DAMAGE, LOG_CLASS_*) are globally accessible.
     * @param {object} player - The player object from gameState.
     * @param {number} targetRow - The intended destination row.
     * @param {number} targetCol - The intended destination column.
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} - True if the action consumed the player's turn, false otherwise.
     */
    handleMoveOrAttack: async function(player, targetRow, targetCol, gameState) {
        // Only handle animation/effects here; delegate action logic to Player/Unit
        // Optionally, you can await animation before calling moveOrAttack if needed
        // (Assume player is a Player instance)
        // Animation logic (if any) can go here before/after the action
        return player.moveOrAttack(targetRow, targetCol, gameState);
    },

    /**
     * Handles player healing action.
     * Checks for medkits and current health. Applies healing if possible.
     * Assumes necessary functions (Game.logMessage) and constants (HEAL_COST, HEAL_AMOUNT, LOG_CLASS_*)
     * are globally accessible.
     * @param {object} player - The player object from gameState.
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} - True if the action consumed the player's turn, false otherwise.
     */
    handleHeal: function(player, gameState) {
        // Delegate to Player/Unit heal method
        return player.heal(gameState);
    },

    /**
     * Handles player shooting action.
     * Checks ammo, performs line trace, checks for hits/blocks, applies damage/knockback.
     * Assumes necessary functions (Game.logMessage, traceLine, applyKnockback)
     * and constants (RANGED_*, TILE_*, LOG_CLASS_*) are globally accessible.
     * @param {object} player - The player object from gameState.
     * @param {{dr: number, dc: number}} shootDirection - Object with delta row/col for direction.
     * @param {string} dirString - Human-readable direction string for logging ("Up", "Down", etc.).
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} - True if the action consumed the player's turn, false otherwise.
     */
    handleShoot: async function(player, shootDirection, dirString, gameState) {
        // Only handle animation/effects here; delegate action logic to Player/Unit
        // (Assume player is a Player instance)
        return player.shoot(shootDirection, dirString, gameState);
    },
};
