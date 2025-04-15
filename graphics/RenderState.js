/**
 * Creates a render state object for a single frame.
 * Pure function: does not mutate input, returns a new object.
 * @param {GameState} gameState - The current game state (OOP instance).
 * @param {Array<Array<number>>} threatMap - The threat map for overlays.
 * @param {Array<Object>} [effects] - Active effects for this frame.
 * @param {Object} [overlays] - Additional overlays (optional).
 * @param {Object} [ui] - UI state (optional).
 * @returns {Object} renderState - Object with all properties needed for rendering.
 */
function createRenderState(gameState, threatMap, effects = [], overlays = {}, ui = {}) {
    return {
        // Core game state (shallow copy for safety)
        mapData: gameState.mapData,
        player: gameState.player,
        enemies: gameState.enemies,
        safeZone: gameState.safeZone,
        turnNumber: gameState.turnNumber,
        gameActive: gameState.gameActive,
        logMessages: gameState.logMessages,

        // Animation/overlay state
        threatMap: threatMap,
        effects: effects,
        overlays: overlays,
        ui: ui
    };
}

// Expose globally
window.createRenderState = createRenderState;