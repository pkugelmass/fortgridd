console.log("test-helpers.js loaded");

/**
 * Creates a mock unit object (player or enemy) with default values,
 * allowing specific properties to be overridden.
 * @param {boolean} isPlayer - True if the unit should be mock player, false for enemy.
 * @param {object} overrides - An object containing properties to override the defaults.
 * @returns {object} A mock unit object.
 */
function createMockUnit(isPlayer = false, overrides = {}) {
    const defaults = {
        row: 1,
        col: 1,
        hp: isPlayer ? (window.PLAYER_MAX_HP || 15) : (window.AI_MAX_HP || 10), // Use globals if available, else defaults
        maxHp: isPlayer ? (window.PLAYER_MAX_HP || 15) : (window.AI_MAX_HP || 10),
        resources: {
            medkits: isPlayer ? (window.PLAYER_START_MEDKITS || 0) : 0,
            ammo: isPlayer ? (window.PLAYER_START_AMMO || 3) : (window.AI_START_AMMO || 1)
        },
        id: isPlayer ? 'player' : `enemy_${Math.floor(Math.random() * 1000)}`,
        // Add other common properties as needed, e.g., state for AI
        ...(isPlayer ? {} : { state: 'IDLE', target: null }) // Example AI-specific props
    };

    // Deep merge resources, shallow merge others
    const finalUnit = { ...defaults, ...overrides };
    if (overrides.resources) {
        finalUnit.resources = { ...defaults.resources, ...overrides.resources };
    }

    return finalUnit;
}

/**
 * Creates a basic mock gameState object with essential properties,
 * allowing specific properties to be overridden.
 * @param {object} overrides - An object containing properties to override the defaults.
 *                               Can include mapData, player, enemies array.
 *                               Set player to null or enemies to [] to explicitly exclude defaults.
 * @returns {object} A mock gameState object.
 */
function createMockGameState(overrides = {}) {
    // Default simple 5x5 map with land and a wall
    const defaultMapData = [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0], // Wall at (2,2)
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
    ];

    // Use helper to create default player/enemies only if not explicitly overridden (even with null/empty)
    const defaultPlayer = overrides.player === undefined ? createMockUnit(true, { row: 1, col: 1 }) : overrides.player;
    const defaultEnemies = overrides.enemies === undefined ? [createMockUnit(false, { row: 3, col: 3, id: 'enemy_1' })] : overrides.enemies;

    const defaults = {
        mapData: defaultMapData,
        player: defaultPlayer, // Will be null if overrides.player was null
        enemies: defaultEnemies, // Will be [] if overrides.enemies was []
        gridWidth: defaultMapData[0] ? defaultMapData[0].length : 0,
        gridHeight: defaultMapData.length,
        currentTurn: 0,
        logMessages: [], // For potential log checking
        safeZone: { // Example safe zone
            centerX: Math.floor((defaultMapData[0] ? defaultMapData[0].length : 0) / 2),
            centerY: Math.floor(defaultMapData.length / 2),
            radius: 100 // Large enough to cover default map initially
        }
        // Add other gameState properties as needed for tests
    };

    // Simple merge for top-level properties
    const finalGameState = { ...defaults, ...overrides };

    // Ensure grid dimensions match mapData if mapData was overridden
    if (overrides.mapData) {
        finalGameState.gridHeight = finalGameState.mapData.length;
        finalGameState.gridWidth = finalGameState.mapData[0] ? finalGameState.mapData[0].length : 0;
         // Optionally recalculate safeZone center if mapData changes significantly
         finalGameState.safeZone.centerX = Math.floor(finalGameState.gridWidth / 2);
         finalGameState.safeZone.centerY = Math.floor(finalGameState.gridHeight / 2);
    }


    return finalGameState;
}

/**
 * Sets up a mock for the global Game.logMessage function.
 * Stores the original function and replaces it with a spy that records calls.
 * Returns an object with the recorded calls array and a function to restore the original.
 *
 * Usage:
 * let logMock;
 * hooks.beforeEach(function() { logMock = setupLogMock(); });
 * hooks.afterEach(function() { logMock.restore(); });
 * // In test: assert.equal(logMock.calls.length, 1);
 *
 * @returns {{calls: Array<{message: string, gameState: object, options: object}>, restore: function}}
 */
function setupLogMock() {
    let loggedMessages = [];
    // Ensure the global Game object exists (it should since game.js is loaded)
    if (typeof Game === 'undefined' || typeof Game.logMessage !== 'function') {
        console.error("Cannot setup log mock: Global Game object or Game.logMessage not found!");
        // Return a dummy object to avoid errors in tests calling restore()
        return { calls: [], restore: () => {} };
    }

    // Store the original function directly from the Game object
    let originalGameLog = Game.logMessage;

    // Replace the logMessage function on the actual Game object
    Game.logMessage = function(message, gameState, options) {
        loggedMessages.push({ message, gameState, options });
    };

    function restore() {
        // Restore the original function to the Game object
        if (typeof Game !== 'undefined') {
             Game.logMessage = originalGameLog;
        }
    }

    return {
        calls: loggedMessages,
        restore: restore
    };
}


// --- Constant Mocking Helpers ---

const MOCKED_CONSTANTS = {
    TILE_LAND: 0,
    TILE_WALL: 1,
    TILE_TREE: 2,
    TILE_MEDKIT: 3,
    TILE_AMMO: 4,
    PLAYER_MAX_HP: 15,
    PLAYER_START_AMMO: 3,
    PLAYER_START_MEDKITS: 0,
    PLAYER_AMMO_PICKUP_AMOUNT: 5,
    AI_MAX_HP: 10,
    AI_START_AMMO: 1,
    AI_AMMO_PICKUP_AMOUNT: 2,
    LOG_CLASS_PLAYER_GOOD: 'log-player-good',
    LOG_CLASS_ENEMY_EVENT: 'log-enemy-event',
    LOG_CLASS_COMBAT: 'log-combat',
    LOG_CLASS_RESOURCE: 'log-resource',
    LOG_CLASS_STATE: 'log-state',
    LOG_CLASS_ERROR: 'log-error',
    LOG_CLASS_WARN: 'log-warn',
    LOG_CLASS_INFO: 'log-info',
    // Add other constants from config.js as needed for tests
};

let originalConstants = {};

/**
 * Sets up mock global constants needed for tests.
 * Stores original values if they exist.
 */
function setupTestConstants() {
    originalConstants = {}; // Reset before setting up
    for (const key in MOCKED_CONSTANTS) {
        if (window.hasOwnProperty(key)) {
            originalConstants[key] = window[key];
        }
        window[key] = MOCKED_CONSTANTS[key];
    }
}

/**
 * Restores original global constants or removes mocked ones.
 */
function cleanupTestConstants() {
    for (const key in MOCKED_CONSTANTS) {
        if (originalConstants.hasOwnProperty(key)) {
            window[key] = originalConstants[key]; // Restore original
        } else {
            delete window[key]; // Remove if it didn't exist before
        }
    }
    originalConstants = {}; // Clear stored originals
}


// Add more helper functions as needed, e.g., for creating specific map layouts
