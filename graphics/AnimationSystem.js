/**
 * AnimationSystem for FortGridd - manages the unified animation loop and frame rendering.
 * Refactored for OOP and global-scope compatibility.
 * @class
 */
class AnimationSystem {
    /**
     * @param {Object} params
     * @param {GameState} params.gameState - The main game state object (OOP instance).
     * @param {function(GameState): Array<Array<number>>} params.createThreatMap - Function to generate the threat map from gameState.
     * @param {function(RenderState): void} params.drawFrame - Function to draw a frame given a renderState object.
     * @param {function(): GameState} [params.getGameState] - Optional getter for latest gameState.
     */
    constructor({ gameState, createThreatMap, drawFrame, getGameState }) {
        this.gameState = gameState;
        this.createThreatMap = createThreatMap;
        this.getGameState = typeof getGameState === "function" ? getGameState : () => this.gameState;
        this.drawFrame = drawFrame;
        this.effects = [];
        this.running = false;
        this.maxFPS = undefined;
        this._lastFrameTime = undefined;
    }

    /**
     * Starts the animation loop.
     */
    start() {
        if (this.running) return;
        this.running = true;
        this._lastFrameTime = undefined;
        requestAnimationFrame(this._animationFrame.bind(this));
    }

    /**
     * Stops the animation loop.
     */
    stop() {
        this.running = false;
    }

    /**
     * Adds an effect to the animation system.
     * @param {Object} effect - Effect object with update and isExpired methods.
     */
    addEffect(effect) {
        this.effects.push(effect);
    }

    /**
     * Main animation frame handler (private).
     * @param {DOMHighResTimeStamp} now
     * @private
     */
    _animationFrame(now) {
        try {
            // Frame rate cap
            if (this.maxFPS) {
                if (this._lastFrameTime !== undefined) {
                    const minFrameTime = 1000 / this.maxFPS;
                    if (now - this._lastFrameTime < minFrameTime) {
                        if (this.running) {
                            requestAnimationFrame(this._animationFrame.bind(this));
                        }
                        return;
                    }
                }
                this._lastFrameTime = now;
            }

            // Remove expired effects
            const remainingEffects = [];
            for (const effect of this.effects) {
                let expired = false;
                if (typeof effect.isExpired === "function") {
                    expired = effect.isExpired(now);
                }
                if (!expired) {
                    remainingEffects.push(effect);
                }
            }
            this.effects = remainingEffects;

            // Compose threatMap for this frame
            const currentGameState = this.getGameState();
            const threatMap = this.createThreatMap(currentGameState);

            // Compose renderState for this frame
            const renderState = createRenderState(currentGameState, threatMap, this.effects);

            // Let each effect mutate/interpolate the render state for this frame
            for (const effect of this.effects) {
                if (typeof effect.update === "function") {
                    effect.update(now, renderState);
                }
            }

            // Draw the frame
            this.drawFrame(renderState);

        } catch (err) {
            // Log error to console and game log if possible
            console.error("AnimationSystem _animationFrame error:", err);
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`[ERROR] AnimationSystem _animationFrame: ${err && err.stack ? err.stack : err}`, this.gameState, { level: "ERROR", target: "CONSOLE" });
            }
        } finally {
            // Continue the animation loop
            if (this.running) {
                requestAnimationFrame(this._animationFrame.bind(this));
            }
        }
    }
}

// Expose AnimationSystem globally
window.AnimationSystem = AnimationSystem;