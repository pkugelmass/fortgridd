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
    constructor({ gameState, createThreatMap, drawFrame, getGameState }) {
        this.gameState = gameState;
        this.createThreatMap = createThreatMap;
        // Dependency-injected getter for latest gameState
        this.getGameState = typeof getGameState === "function" ? getGameState : () => this.gameState;
        this.drawFrame = drawFrame;
        this.effects = [];
        this.running = false;
    }

    start() {
        if (this.running) return; // Prevent multiple loops
        this.running = true;
        this._lastFrameTime = undefined;
        requestAnimationFrame(this._animationFrame.bind(this));
    }

    stop() {
        this.running = false;
    }

    // Main animation loop
    _animationFrame(now) {
        try {
            // Frame rate cap (optional, set this.maxFPS to e.g. 60)
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

            // 1. Remove expired effects
            // 1. Update effects and filter expired ones, ensuring promises are resolved
            const remainingEffects = [];
            for (const effect of this.effects) {
                let expired = false;
                if (typeof effect.isExpired === "function") {
                    expired = effect.isExpired(now); // Note: isExpired for movement effects resolves its own promise
                }

                if (expired) {
                    // Check specifically for ranged attacks that haven't resolved yet
                    if (effect.type === "ranged-attack" && typeof effect._isResolved === 'function' && !effect._isResolved()) {
                        if (typeof effect._resolvePromiseAndMark === 'function') {
                            // console.log("Resolving ranged attack promise due to expiration");
                            effect._resolvePromiseAndMark(); // Resolve it before discarding
                        } else {
                            // This case should ideally not happen if created by the factory
                            console.warn("Expired ranged attack effect missing _resolvePromiseAndMark method.");
                        }
                    }
                    // Do not add expired effect to the next frame's list
                } else {
                    remainingEffects.push(effect); // Keep non-expired effects
                }
            }
            this.effects = remainingEffects;

            // 2. Compose threatMap for this frame
            const currentGameState = this.getGameState();
            const threatMap = this.createThreatMap(currentGameState);

            // 3. Compose RenderState for this frame
            const renderState = new RenderState({
                gameState: currentGameState,
                threatMap: threatMap,
                effects: this.effects
                // overlays and ui can be added as needed
            });

            // 3b. Let each effect mutate/interpolate the render state for this frame
            for (const effect of this.effects) {
                if (typeof effect.update === "function") {
                    effect.update(now, renderState);
                }
            }

            // 4. Draw the frame
            this.drawFrame(renderState);

        } catch (err) {
            // Log error to console and game log if possible
            console.error("AnimationSystem _animationFrame error:", err);
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`[ERROR] AnimationSystem _animationFrame: ${err && err.stack ? err.stack : err}`, this.gameState, { level: "ERROR", target: "CONSOLE" });
            }
        } finally {
            // Always continue the animation loop
            if (this.running) {
                requestAnimationFrame(this._animationFrame.bind(this));
            }
        }
    }

    // Add an effect to the animation system
    addEffect(effect) {
        this.effects.push(effect);
    }
}

/**
 * Factory for a ranged attack effect compatible with AnimationSystem.
 * Usage: animationSystem.addEffect(AnimationSystem.createRangedAttackEffect({ linePoints, hitCell, color }))
 */
AnimationSystem.createRangedAttackEffect = function({ linePoints, hitCell, color }) {
    const stepTime = 80; // ms per tile
    const totalSteps = linePoints.length;
    const duration = stepTime * totalSteps;
    let _internalResolveEffectPromise; // Renamed internal resolver
    let _promiseResolved = false;      // Flag to track resolution status
    const effectPromise = new Promise(resolve => { _internalResolveEffectPromise = resolve; });

    // Find the index of the hit cell in the linePoints array
    let hitCellIdx = -1;
    if (hitCell) {
        hitCellIdx = linePoints.findIndex(pt => pt.row === hitCell.row && pt.col === hitCell.col);
        if (hitCellIdx === -1) hitCellIdx = linePoints.length - 1;
    }

    // If linePoints is empty, resolve the promise immediately to avoid a hang
    if (!linePoints || linePoints.length === 0) {
        resolveEffectPromise();
    }

    const effect = {
        type: "ranged-attack",
        startTime: performance.now(),
        duration,
        data: {
            linePoints: linePoints.map(pt => ({ row: pt.row, col: pt.col })),
            color: color || "#ffb300",
            hitCell: hitCell ? { row: hitCell.row, col: hitCell.col } : null,
            stepTime,
            totalSteps,
            hitCellIdx
        },
        update(now, renderState) {
            const elapsed = now - this.startTime;
            let idx = Math.floor(elapsed / this.data.stepTime);
            if (idx < 0) idx = 0;
            if (
                typeof this.data.hitCellIdx === "number" &&
                this.data.hitCellIdx >= 0 &&
                idx > this.data.hitCellIdx
            ) {
                this._resolvePromiseAndMark?.(); // Call the wrapper
                return;
            }
            // Only show the projectile at the current position
            const pt = this.data.linePoints[idx];
            if (!pt) return;
            // Add projectile overlay for drawFrame to render
            if (!renderState.overlays) renderState.overlays = {};
            if (!renderState.overlays.projectiles) renderState.overlays.projectiles = [];
            renderState.overlays.projectiles.push({
                row: pt.row,
                col: pt.col,
                color: this.data.color
            });
            // If we're at the hit cell, resolve after this frame
            if (
                typeof this.data.hitCellIdx === "number" &&
                this.data.hitCellIdx >= 0 &&
                idx === this.data.hitCellIdx
            ) {
                this._resolvePromiseAndMark?.(); // Call the wrapper
            }
        },
        isExpired(now) {
            if (typeof now !== "number") now = performance.now();
            return (now - this.startTime) >= this.duration;
        },
        // Internal resolver reference - DO NOT CALL DIRECTLY FROM OUTSIDE THE EFFECT
        _internalResolve: _internalResolveEffectPromise,
        // Method to check if the promise has been resolved
        _isResolved: () => _promiseResolved,
        // Wrapper function to resolve the promise AND set the flag
        _resolvePromiseAndMark: function() {
            if (!_promiseResolved) {
                _promiseResolved = true; // Mark as resolved
                this._internalResolve(); // Call the actual Promise resolver
                // console.log("Ranged attack promise resolved."); // For debugging
            }
        },
        promise: effectPromise // The promise awaited by external logic
    };
    return effect;
}
/**
 * Factory for a movement effect compatible with AnimationSystem.
 * Usage: animationSystem.addEffect(AnimationSystem.createMovementEffect({ unit, from, to, color, duration }))
 **/
AnimationSystem.createMovementEffect = function({ unit, from, to, color, duration, easing }) {
    // Use config.js constants if available, otherwise fallback to defaults
    const moveDuration = typeof duration === "number"
        ? duration
        : (typeof MOVEMENT_ANIMATION_DURATION !== "undefined" ? MOVEMENT_ANIMATION_DURATION : 180);
    const moveEasing = typeof easing === "string"
        ? easing
        : (typeof ANIMATION_EASING !== "undefined" ? ANIMATION_EASING : "easeInOut");

    // Easing functions (duplicated from effects.js for consistency)
    const EASING = {
        linear: t => t,
        easeIn: t => t * t,
        easeOut: t => t * (2 - t),
        easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    };
    const easeFn = EASING[moveEasing] || EASING.easeInOut;

    let resolveEffectPromise;
    const effectPromise = new Promise(resolve => { resolveEffectPromise = resolve; });

    const effect = {
        type: "movement",
        startTime: performance.now(),
        duration: moveDuration,
        data: {
            unitId: unit.id,
            from: { row: from.row, col: from.col },
            to: { row: to.row, col: to.col },
            color: color || "#42a5f5"
        },
        update(now, renderState) {
            const elapsed = now - this.startTime;
            let t = Math.min(1, elapsed / this.duration);
            // Use easing function for interpolation
            const easedT = easeFn(t);
            const interpRow = this.data.from.row + (this.data.to.row - this.data.from.row) * easedT;
            const interpCol = this.data.from.col + (this.data.to.col - this.data.from.col) * easedT;
            if (typeof window !== "undefined" && window.DEBUG_MOVEMENT_ANIMATION) {
                console.log("[MovementEffect] t:", t, "easedT:", easedT, "elapsed:", elapsed, "interpRow:", interpRow, "interpCol:", interpCol);
            }

            // Find and update the unit's position in renderState
            if (renderState.player && renderState.player.id === this.data.unitId) {
                renderState.player = { ...renderState.player, row: interpRow, col: interpCol };
                if (typeof window !== "undefined" && window.DEBUG_MOVEMENT_ANIMATION) {
                    console.log("[MovementEffect] Player interpolated position:", interpRow, interpCol, "t=", t, "easedT=", easedT);
                }
            } else if (Array.isArray(renderState.enemies)) {
                const idx = renderState.enemies.findIndex(e => e.id === this.data.unitId);
                if (idx !== -1) {
                    renderState.enemies[idx] = { ...renderState.enemies[idx], row: interpRow, col: interpCol };
                    if (typeof window !== "undefined" && window.DEBUG_MOVEMENT_ANIMATION) {
                        console.log("[MovementEffect] Enemy interpolated position:", interpRow, interpCol, "t=", t, "easedT=", easedT);
                    }
                }
            }
            // Do not resolve the promise here; let isExpired handle it
        },
        isExpired(now) {
            const expired = (now - this.startTime) >= this.duration;
            if (expired) {
                this._resolvePromise?.();
            }
            return expired;
        },
        _resolvePromise: resolveEffectPromise,
        promise: effectPromise
    };
    return effect;
};