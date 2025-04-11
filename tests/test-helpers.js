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
    // Determine grid size: Use overrides, or default to 5x5
    const targetGridHeight = overrides.gridHeight || 5;
    const targetGridWidth = overrides.gridWidth || 5;

    // Generate default mapData *if not provided* and dimensions differ from default 5x5, or if explicitly requested size
    let useDefaultMapData;
    if (overrides.mapData) {
        useDefaultMapData = overrides.mapData; // Use provided mapData
    } else if (targetGridHeight !== 5 || targetGridWidth !== 5 || overrides.gridHeight || overrides.gridWidth) {
        // Generate a simple land map of the target size
        useDefaultMapData = Array.from({ length: targetGridHeight }, () => Array(targetGridWidth).fill(TILE_LAND || 0));
        // Do NOT add a default central wall for generated maps, keep them clear unless specified by test
    } else {
        // Use the hardcoded 5x5 default (which includes a wall) only if no size/map override is given
        useDefaultMapData = [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0], // Wall at (2,2)
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0]
        ];
    }


    // Use helper to create default player/enemies only if not explicitly overridden (even with null/empty)
    const defaultPlayer = overrides.player === undefined ? createMockUnit(true, { row: 1, col: 1 }) : overrides.player;
    const defaultEnemies = overrides.enemies === undefined ? [createMockUnit(false, { row: 3, col: 3, id: 'enemy_1' })] : overrides.enemies;

    const defaults = {
        mapData: useDefaultMapData, // Use the determined/generated mapData
        player: defaultPlayer, // Will be null if overrides.player was null
        enemies: defaultEnemies, // Will be [] if overrides.enemies was []
        // Set dimensions based on the *actual* mapData being used
        gridWidth: useDefaultMapData[0] ? useDefaultMapData[0].length : 0,
        gridHeight: useDefaultMapData.length,
        currentTurn: 0,
        logMessages: [], // For potential log checking
        safeZone: { // Example safe zone, calculated from actual dimensions
            centerX: Math.floor((useDefaultMapData[0] ? useDefaultMapData[0].length : 0) / 2),
            centerY: Math.floor(useDefaultMapData.length / 2),
            radius: Math.max(useDefaultMapData.length, (useDefaultMapData[0] ? useDefaultMapData[0].length : 0)), // Ensure radius covers map
            // Add min/max bounds needed by findNearbyResource (Added 2025-04-10)
            minRow: 0, // Default to full map initially
            maxRow: useDefaultMapData.length - 1,
            minCol: 0,
            maxCol: (useDefaultMapData[0] ? useDefaultMapData[0].length : 0) - 1
        }
        // Add other gameState properties as needed for tests
    };
    // Note: Actual safe zone shrinking logic is in game.js, not replicated here.
    // Tests needing specific safe zone bounds should override the safeZone object.

    // Simple merge for top-level properties, allowing overrides to take precedence
    const finalGameState = { ...defaults, ...overrides };

    // If mapData was explicitly provided in overrides, ensure dimensions match it
    if (overrides.mapData) {
        finalGameState.gridHeight = finalGameState.mapData.length;
        finalGameState.gridWidth = finalGameState.mapData[0] ? finalGameState.mapData[0].length : 0;
        // Recalculate safeZone based on provided mapData dimensions
        finalGameState.safeZone.centerX = Math.floor(finalGameState.gridWidth / 2);
        finalGameState.safeZone.centerY = Math.floor(finalGameState.gridHeight / 2);
        finalGameState.safeZone.radius = Math.max(finalGameState.gridHeight, finalGameState.gridWidth);
        // Also update min/max bounds if mapData was overridden (Added 2025-04-10)
        finalGameState.safeZone.minRow = 0;
        finalGameState.safeZone.maxRow = finalGameState.gridHeight - 1;
        finalGameState.safeZone.minCol = 0;
        finalGameState.safeZone.maxCol = finalGameState.gridWidth - 1;
    }
    // If only dimensions were provided, mapData and dimensions should already match from the logic above,
    // and the default safeZone bounds calculated initially will be correct.


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
    TILE_BOUNDARY: 5, // Added
    PLAYER_MAX_HP: 15,
    PLAYER_START_AMMO: 3,
    PLAYER_START_MEDKITS: 0,
    PLAYER_AMMO_PICKUP_AMOUNT: 5,
    AI_MAX_HP: 10,
    AI_START_AMMO: 1,
    AI_AMMO_PICKUP_AMOUNT: 2,
    PLAYER_ATTACK_DAMAGE: 2, // Added
    RANGED_ATTACK_RANGE: 5, // Added
    RANGED_ATTACK_DAMAGE: 2, // Added
    HEAL_COST: 1, // Added
    HEAL_AMOUNT: 1, // Added
    // Knockback constants are not directly used by playerActions, handled by applyKnockback
    LOG_CLASS_PLAYER_GOOD: 'log-player-good',
    LOG_CLASS_ENEMY_EVENT: 'log-enemy-event',
    LOG_CLASS_COMBAT: 'log-combat',
    LOG_CLASS_RESOURCE: 'log-resource',
    LOG_CLASS_STATE: 'log-state',
    LOG_CLASS_ERROR: 'log-error',
    LOG_CLASS_WARN: 'log-warn',
    LOG_CLASS_INFO: 'log-info',
    // AI Specific Thresholds/Ranges (Added 2025-04-10)
    AI_FLEE_HEALTH_THRESHOLD: 0.3, // Flee below 30% HP
    AI_HEAL_PRIORITY_THRESHOLD: 0.6, // Consider healing or seeking medkit below 60% HP
    AI_SEEK_AMMO_THRESHOLD: 3, // Seek ammo if below 3
    AI_PROACTIVE_SCAN_RANGE: 8, // Look further for proactive resources
    AI_ENGAGE_RISK_AVERSION_CHANCE: 0.3, // 30% chance to hesitate if move is risky
    AI_RANGE_MAX: 10, // Default max range if detectionRange not set on enemy
    AI_STATE_EXPLORING: 'EXPLORING', // Define AI states for tests
    AI_STATE_SEEKING_RESOURCES: 'SEEKING_RESOURCES',
    AI_STATE_ENGAGING_ENEMY: 'ENGAGING_ENEMY',
    AI_STATE_FLEEING: 'FLEEING',
    AI_STATE_HEALING: 'HEALING',
    AI_ATTACK_DAMAGE: 1, // Default AI damage for tests
    MAX_EVALUATIONS_PER_TURN: 3, // From ai.js
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
