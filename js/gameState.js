/**
 * Represents the complete state of the game at any given point.
 * This object centralizes all dynamic game data, reducing reliance on global variables.
 */
class GameState {
    /**
     * Creates an instance of the game state.
     * Initializes properties to default/empty values.
     */
    constructor() {
        /**
         * The 2D array representing the game map tiles.
         * @type {Array<Array<number>> | null}
         */
        this.mapData = null;

        /**
         * The player character object.
         * @type {object | null} // Define a more specific player type later if needed
         */
        this.player = null;

        /**
         * An array containing all enemy AI objects currently in the game.
         * @type {Array<object>} // Define a more specific enemy type later if needed
         */
        this.enemies = [];

        /**
         * The current turn number.
         * @type {number}
         */
        this.turnNumber = 0;

        /**
         * An object describing the current safe zone.
         * Expected properties: { centerRow: number, centerCol: number, radius: number }
         * @type {{ centerRow: number, centerCol: number, radius: number } | null}
         */
        this.safeZone = null;

        /**
         * Flag indicating whether the game is currently active (not game over).
         * @type {boolean}
         */
        this.gameActive = false;

        /**
         * An array storing log messages generated during the game.
         * @type {Array<string>}
         */
        this.logMessages = [];

        // Potential future additions:
        // this.config = null; // If we pass config explicitly
        // this.gameMode = 'survival'; // Example
    }

    // Methods to manipulate state could be added here later,
    // e.g., addEnemy(enemy), removeEnemy(enemyId), updatePlayer(playerData)
}

// Exporting the class if we decide to use modules later
// export default GameState;
// For now, assuming global scope or script inclusion order handles availability.
