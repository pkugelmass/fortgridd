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
        this.effects = this.effects.filter(e => !e.isExpired || !e.isExpired(now));

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

/**
 * Factory for a ranged attack effect compatible with AnimationSystem.
 * Usage: animationSystem.addEffect(AnimationSystem.createRangedAttackEffect({ linePoints, hitCell, color }))
 */
AnimationSystem.createRangedAttackEffect = function({ linePoints, hitCell, color }) {
    const stepTime = 80; // ms per tile
    const totalSteps = linePoints.length;
    const duration = stepTime * totalSteps;
    let resolveEffectPromise;
    const effectPromise = new Promise(resolve => { resolveEffectPromise = resolve; });

    // Find the index of the hit cell in the linePoints array
    let hitCellIdx = -1;
    if (hitCell) {
        hitCellIdx = linePoints.findIndex(pt => pt.row === hitCell.row && pt.col === hitCell.col);
        if (hitCellIdx === -1) hitCellIdx = linePoints.length - 1;
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
                this._resolvePromise?.();
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
                this._resolvePromise?.();
            }
        },
        isExpired(now) {
            if (typeof now !== "number") now = performance.now();
            return (now - this.startTime) >= this.duration;
        },
        _resolvePromise: resolveEffectPromise,
        promise: effectPromise
    };
    return effect;
}
/**
 * Factory for a movement effect compatible with AnimationSystem.
 * Usage: animationSystem.addEffect(AnimationSystem.createMovementEffect({ unit, from, to, color, duration }))
 **/
AnimationSystem.createMovementEffect = function({ unit, from, to, color, duration }) {
    const moveDuration = duration || 200; // ms, configurable (increased for smoother animation)
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
            // Linear interpolation; can add easing if desired
            const interpRow = this.data.from.row + (this.data.to.row - this.data.from.row) * t;
            const interpCol = this.data.from.col + (this.data.to.col - this.data.from.col) * t;
            if (typeof window !== "undefined" && window.DEBUG_MOVEMENT_ANIMATION) {
                console.log("[MovementEffect] t:", t, "elapsed:", elapsed, "interpRow:", interpRow, "interpCol:", interpCol);
            }

            // Find and update the unit's position in renderState
            if (renderState.player && renderState.player.id === this.data.unitId) {
                renderState.player = { ...renderState.player, row: interpRow, col: interpCol };
                // Debug: Log interpolated player position
                if (typeof window !== "undefined" && window.DEBUG_MOVEMENT_ANIMATION) {
                    console.log("[MovementEffect] Player interpolated position:", interpRow, interpCol, "t=", t);
                }
            } else if (Array.isArray(renderState.enemies)) {
                const idx = renderState.enemies.findIndex(e => e.id === this.data.unitId);
                if (idx !== -1) {
                    renderState.enemies[idx] = { ...renderState.enemies[idx], row: interpRow, col: interpCol };
                    // Debug: Log interpolated enemy position
                    if (typeof window !== "undefined" && window.DEBUG_MOVEMENT_ANIMATION) {
                        console.log("[MovementEffect] Enemy interpolated position:", interpRow, interpCol, "t=", t);
                    }
                }
            }

            // Do not resolve the promise here; let isExpired handle it
            // This prevents a frame where both the interpolated and updated positions are shown
            // The promise will be resolved in isExpired
            // if (t >= 1) {
            //     this._resolvePromise?.();
            // }
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