/**
 * Factory for a ranged attack effect compatible with AnimationSystem.
 * @param {Object} params
 * @param {Array<{row:number, col:number}>} params.linePoints - Path of the projectile.
 * @param {{row:number, col:number}} params.hitCell - Cell where the projectile hits.
 * @param {string} [params.color] - Projectile color.
 * @returns {Object} effect - Effect object for AnimationSystem.
 */
function createRangedAttackEffect({ linePoints, hitCell, color }) {
    const stepTime = 80; // ms per tile
    const totalSteps = linePoints.length;
    const duration = stepTime * totalSteps;
    let _internalResolveEffectPromise;
    let _promiseResolved = false;
    const effectPromise = new Promise(resolve => { _internalResolveEffectPromise = resolve; });

    // Find the index of the hit cell in the linePoints array
    let hitCellIdx = -1;
    if (hitCell) {
        hitCellIdx = linePoints.findIndex(pt => pt.row === hitCell.row && pt.col === hitCell.col);
        if (hitCellIdx === -1) hitCellIdx = linePoints.length - 1;
    }

    if (!linePoints || linePoints.length === 0) {
        if (_internalResolveEffectPromise) _internalResolveEffectPromise();
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
                this._resolvePromiseAndMark?.();
                return;
            }
            const pt = this.data.linePoints[idx];
            if (!pt) return;
            if (!renderState.overlays) renderState.overlays = {};
            if (!renderState.overlays.projectiles) renderState.overlays.projectiles = [];
            renderState.overlays.projectiles.push({
                row: pt.row,
                col: pt.col,
                color: this.data.color
            });
            if (
                typeof this.data.hitCellIdx === "number" &&
                this.data.hitCellIdx >= 0 &&
                idx === this.data.hitCellIdx
            ) {
                this._resolvePromiseAndMark?.();
            }
        },
        isExpired(now) {
            if (typeof now !== "number") now = performance.now();
            return (now - this.startTime) >= this.duration;
        },
        _internalResolve: _internalResolveEffectPromise,
        _isResolved: () => _promiseResolved,
        _resolvePromiseAndMark: function() {
            if (!_promiseResolved) {
                _promiseResolved = true;
                this._internalResolve();
            }
        },
        promise: effectPromise
    };
    return effect;
}

/**
 * Factory for a movement effect compatible with AnimationSystem.
 * @param {Object} params
 * @param {Unit} params.unit - The unit being moved.
 * @param {{row:number, col:number}} params.from - Start position.
 * @param {{row:number, col:number}} params.to - End position.
 * @param {string} [params.color] - Color for the movement effect.
 * @param {number} [params.duration] - Duration in ms.
 * @param {string} [params.easing] - Easing function name.
 * @returns {Object} effect - Effect object for AnimationSystem.
 */
function createMovementEffect({ unit, from, to, color, duration, easing }) {
    const moveDuration = typeof duration === "number"
        ? duration
        : (typeof MOVEMENT_ANIMATION_DURATION !== "undefined" ? MOVEMENT_ANIMATION_DURATION : 180);
    const moveEasing = typeof easing === "string"
        ? easing
        : (typeof ANIMATION_EASING !== "undefined" ? ANIMATION_EASING : "easeInOut");

    // Easing functions
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
            const easedT = easeFn(t);
            const interpRow = this.data.from.row + (this.data.to.row - this.data.from.row) * easedT;
            const interpCol = this.data.from.col + (this.data.to.col - this.data.from.col) * easedT;

            // Update the unit's position in renderState
            if (renderState.player && renderState.player.id === this.data.unitId) {
                renderState.player = { ...renderState.player, row: interpRow, col: interpCol };
            } else if (Array.isArray(renderState.enemies)) {
                const idx = renderState.enemies.findIndex(e => e.id === this.data.unitId);
                if (idx !== -1) {
                    renderState.enemies[idx] = { ...renderState.enemies[idx], row: interpRow, col: interpCol };
                }
            }
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
}

// Expose globally
window.createRangedAttackEffect = createRangedAttackEffect;
window.createMovementEffect = createMovementEffect;