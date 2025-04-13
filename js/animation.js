/**
 * AnimationSystem for FortGridd - manages the unified animation loop and frame rendering.
 * Follows the architecture in project/design/ANIMATION_SYSTEM_REWRITE.md.
 */

class RenderState {
    /**
     * Constructs a render state for a single frame.
     * @param {object} params
     * @param {object} params.gameState - The current game state (injected).
     * @param {Array<Array<number>>} params.threatMap - The threat map for overlays.
     * @param {Array<object>} [params.effects] - Active effects for this frame.
     * @param {object} [params.overlays] - Additional overlays (optional).
     * @param {object} [params.ui] - UI state (optional).
     */
    constructor({ gameState, threatMap, effects = [], overlays = {}, ui = {} }) {
        // Core game state (shallow copy for safety)
        this.mapData = gameState.mapData;
        this.player = gameState.player;
        this.enemies = gameState.enemies;
        this.safeZone = gameState.safeZone;
        this.turnNumber = gameState.turnNumber;
        this.gameActive = gameState.gameActive;
        this.logMessages = gameState.logMessages;

        // Animation/overlay state
        this.threatMap = threatMap;
        this.effects = effects;
        this.overlays = overlays;
        this.ui = ui;
    }
}

class AnimationSystem {
    /**
     * @param {object} params
     * @param {object} params.gameState - The main game state object (dependency injection).
     * @param {function} params.createThreatMap - Function to generate the threat map from gameState.
     * @param {function} params.drawFrame - Function to draw a frame given a RenderState.
     */
    constructor({ gameState, createThreatMap, drawFrame }) {
        this.gameState = gameState;
        this.createThreatMap = createThreatMap;
        this.drawFrame = drawFrame;
        this.effects = [];
        this.running = false;
    }

    start() {
        this.running = true;
        requestAnimationFrame(this._animationFrame.bind(this));
    }

    stop() {
        this.running = false;
    }

    // Main animation loop
    _animationFrame(now) {
        // 1. Remove expired effects
        this.effects = this.effects.filter(e => !e.isExpired || !e.isExpired(now));

        // 2. Compose threatMap for this frame
        const threatMap = this.createThreatMap(this.gameState);

        // 3. Compose RenderState for this frame
        const renderState = new RenderState({
            gameState: this.gameState,
            threatMap: threatMap,
            effects: this.effects
            // overlays and ui can be added as needed
        });

        // 4. Draw the frame
        this.drawFrame(renderState);

        // 5. Request next frame if running
        if (this.running) {
            requestAnimationFrame(this._animationFrame.bind(this));
        }
    }

    // Add an effect to the animation system
    addEffect(effect) {
        this.effects.push(effect);
    }
}