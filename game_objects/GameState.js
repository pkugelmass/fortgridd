/**
 * @class GameState
 * Holds the overall state of the game, including map, units, turn, and more.
 * Provides methods for tile occupancy and global game logic.
 */
class GameState {
    /**
     * Create a GameState.
     */
    /**
     * @param {Object} config - The merged GAME_CONFIG object.
     */
    constructor(config) {
        /** @type {Object} */
        this.config = config || {};

        // --- Map Initialization ---
        // Pass the config (or relevant part) to Map constructor.
        // Example: this.map = new Map(config.map);
        this.map = (typeof Map !== "undefined" && config)
            ? new Map(config)
            : null;

        // --- Player Initialization ---
        // Pass the config (or relevant part) to Player constructor.
        // Example: this.player = new Player(config.player);
        this.player = (typeof Player !== "undefined" && config)
            ? new Player(config)
            : null;

        // --- Enemies Initialization ---
        // Instantiate all enemies, using config for defaults and randomization as needed.
        // Example: this.enemies = [new Enemy(config.enemy), ...];
        if (typeof Enemy !== "undefined" && config && Array.isArray(config.enemies)) {
            this.enemies = config.enemies.map(enemyCfg => new Enemy({ ...config, ...enemyCfg }));
        } else {
            this.enemies = [];
        }

        /** @type {Player[]} */
        this.players = this.player ? [this.player] : [];
        /** @type {number} */
        this.turn = 0;
        /** @type {string} */
        this.phase = 'init'; // e.g., 'init', 'playing', 'gameover'
        /** @type {Object} */
        this.settings = {}; // Placeholder for game settings
    }

    /**
     * Checks if a tile is occupied by any living unit (player or enemy).
     * @param {number} x - The x coordinate to check.
     * @param {number} y - The y coordinate to check.
     * @param {Unit} [ignoreUnit] - Optional unit to ignore (e.g., self).
     * @returns {boolean} True if occupied, false otherwise.
     */
    isTileOccupied(x, y, ignoreUnit) {
        if (!this.map) return false;
        const tile = this.map.getTile(x, y);
        if (!tile) return false;
        if (tile.occupiedBy && tile.occupiedBy !== ignoreUnit && tile.occupiedBy.alive) {
            return true;
        }
        return false;
    }

    /**
     * Initializes the game state.
     * Stub for initialization logic.
     */
    initialize() {
        // TODO: Implement game state initialization
    }

    /**
     * Advances the game to the next turn.
     * Stub for turn progression logic.
     */
    nextTurn() {
        // TODO: Implement turn progression
    }

    /**
     * Checks for end-game conditions.
     * Stub for end-game logic.
     */
// --- End Condition Check ---
    /**
     * Checks end conditions based on gameState and logs/calls setGameOver if met.
     * @returns {boolean} True if game is over, false otherwise.
     */
    checkEndConditions() {
        if (this.isGameOver()) return true;
        // Check player state
        if (this.player && this.player.hp <= 0) {
            this.logMessage("Player eliminated! GAME OVER!", { level: 'PLAYER', target: 'BOTH', className: window.LOG_CLASS_PLAYER_BAD });
            this.setGameOver();
            return true;
        }
        // Check enemy state
        if (this.enemies && this.enemies.filter(e => e && e.hp > 0).length === 0) {
            this.logMessage("All enemies eliminated! YOU WIN!", { level: 'PLAYER', target: 'BOTH', className: window.LOG_CLASS_PLAYER_GOOD });
            this.setGameOver();
            return true;
        }
        return false;
    }

    // --- State Accessors/Modifiers ---
    getCurrentTurn() { return this.currentTurn; }
    isPlayerTurn() { return this.gameActive && this.currentTurn === 'player'; }
    isGameOver() { return !this.gameActive; }
    getTurnNumber() { return this.turnNumber; }
    getSafeZone() { return { ...this.safeZone }; }
    getLog() { return [...this.logMessages]; }

    setGameOver() {
        if (!this.gameActive) return;
        this.logMessage("Setting gameActive = false.", { level: 'INFO', target: 'CONSOLE' });
        this.gameActive = false;
    }

    // --- Safe Zone Helpers ---
    /**
     * Checks if a given coordinate is outside the current safe zone.
     * @param {number} row
     * @param {number} col
     * @returns {boolean}
     */
    isOutsideSafeZone(row, col) {
        const zone = this.safeZone;
        if (!zone) return false;
        return row < zone.minRow || row > zone.maxRow || col < zone.minCol || col > zone.maxCol;
    }

    // --- Logging ---
    /**
     * Logs a message to the appropriate target(s) with specified level and styling.
     * @param {string} message - The core message content.
     * @param {object} options - Logging options.
     * @param {string} [options.level='INFO'] - Severity/type.
     * @param {string} [options.target='PLAYER'] - Destination.
     * @param {string|null} [options.className=null] - CSS class for styling messages in the player log.
     */
    logMessage(message, options = {}) {
        const { level = 'INFO', target = 'PLAYER', className = null } = options;
        const turnStr = (typeof this.turnNumber !== "undefined") ? this.turnNumber : "?";
        const messageWithTurn = `T${turnStr}: ${message}`;
        const consoleLogLevelValue = GameState.LOG_LEVEL_VALUES[window.CONSOLE_LOG_LEVEL] || GameState.LOG_LEVEL_VALUES['INFO'];
        const messageLevelValue = GameState.LOG_LEVEL_VALUES[level.toUpperCase()] || GameState.LOG_LEVEL_VALUES['INFO'];

        // Console Logging
        if (target === 'CONSOLE' || target === 'BOTH') {
            if (messageLevelValue >= consoleLogLevelValue) {
                const consoleMessage = `[${level.toUpperCase()}] ${messageWithTurn}`;
                switch (level.toUpperCase()) {
                    case 'ERROR': console.error(consoleMessage); break;
                    case 'WARN': console.warn(consoleMessage); break;
                    case 'DEBUG': console.log(consoleMessage); break;
                    case 'INFO':
                    case 'PLAYER':
                    default: console.log(consoleMessage); break;
                }
            }
        }
        // Player Log (In-Game UI)
        if (target === 'PLAYER' || target === 'BOTH') {
            if (!this.logMessages) this.logMessages = [];
            this.logMessages.push({ message: messageWithTurn, cssClass: className });
            if (this.logMessages.length > window.MAX_LOG_MESSAGES) {
                this.logMessages.shift();
            }
        }
    }

    // --- Log Level Values ---
    static LOG_LEVEL_VALUES = {
        'DEBUG': 1,
        'INFO': 2,
        'PLAYER': 2,
        'WARN': 3,
        'ERROR': 4
    };
}

// No export statement for global-scope compatibility.
/* No export statement for global-scope compatibility. */