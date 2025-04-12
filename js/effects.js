// effects.js - Modular Effect System for FortGridd

// Array to store active effects
const effects = [];

// Base Effect class
class Effect {
    constructor({ type, startTime, duration, position, data, draw }) {
        this.type = type;
        this.startTime = startTime || performance.now();
        this.duration = duration || 500; // ms
        this.position = position || null;
        this.data = data || {};
        this.draw = draw || function(ctx, now) {};
    }
    isExpired(now) {
        return now - this.startTime > this.duration;
    }
}

// Add a new effect to the queue
function addEffect(effectConfig) {
    effects.push(new Effect(effectConfig));
}

// Update and remove expired effects
function updateEffects(now) {
    for (let i = effects.length - 1; i >= 0; i--) {
        if (effects[i].isExpired(now)) {
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(
                    `[Effects] Removed expired effect: type=${effects[i].type}`,
                    null,
                    { level: 'DEBUG', target: 'CONSOLE' }
                );
            }
            // Resolve the effect's Promise if present
            if (typeof effects[i]._resolvePromise === "function") {
                effects[i]._resolvePromise();
                effects[i]._resolvePromise = null;
            }
            effects.splice(i, 1);
        }
    }
}

// Draw all active effects
function drawEffects(ctx, now) {
    if (!effects || effects.length === 0) {
        return;
    }
    for (const effect of effects) {
        effect.draw(ctx, now);
    }
}

// Utility: Trigger a ranged attack projectile effect
function triggerRangedAttackEffect({ linePoints, hitCell, color }) {
    if (!Array.isArray(linePoints) || linePoints.length < 2) {
        if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
            Game.logMessage(
                "[Effects] triggerRangedAttackEffect: invalid linePoints (length < 2)",
                null,
                { level: 'WARN', target: 'CONSOLE' }
            );
        }
        return Promise.resolve();
    }
    const stepTime = 80; // ms per tile
    const totalSteps = linePoints.length;
    const duration = stepTime * totalSteps;

    let resolveEffectPromise;
    const effectPromise = new Promise(resolve => {
        resolveEffectPromise = resolve;
    });

    // Find the index of the hit cell in the linePoints array
    let hitCellIdx = -1;
    if (hitCell) {
        hitCellIdx = linePoints.findIndex(pt => pt.row === hitCell.row && pt.col === hitCell.col);
        if (hitCellIdx === -1) {
            hitCellIdx = linePoints.length - 1; // fallback: last cell
        }
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
        draw: function(ctx, now) {
            const elapsed = now - this.startTime;
            let idx = Math.floor(elapsed / this.data.stepTime);
            // Clamp idx to valid range
            if (idx < 0) idx = 0;

            // If we've passed the hit cell, remove the effect and do not draw
            if (
                typeof this.data.hitCellIdx === "number" &&
                this.data.hitCellIdx >= 0 &&
                idx > this.data.hitCellIdx
            ) {
                if (window.Effects && Array.isArray(window.Effects.effects)) {
                    const i = window.Effects.effects.indexOf(this);
                    if (i !== -1) window.Effects.effects.splice(i, 1);
                }
                if (typeof this._resolvePromise === "function") {
                    this._resolvePromise();
                    this._resolvePromise = null;
                }
                return;
            }

            // Only draw the projectile at the current position (including the hit cell)
            const pt = this.data.linePoints[idx];
            if (!pt) return;

            const cellSize = typeof currentCellSize !== 'undefined' ? currentCellSize : 16;
            const cx = pt.col * cellSize + cellSize / 2;
            const cy = pt.row * cellSize + cellSize / 2;
            ctx.save();
            ctx.fillStyle = this.data.color;
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.18, 0, 2 * Math.PI);
            ctx.shadowColor = "#fff";
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();

            // If we're at the hit cell, remove the effect after drawing
            if (
                typeof this.data.hitCellIdx === "number" &&
                this.data.hitCellIdx >= 0 &&
                idx === this.data.hitCellIdx
            ) {
                if (window.Effects && Array.isArray(window.Effects.effects)) {
                    const i = window.Effects.effects.indexOf(this);
                    if (i !== -1) window.Effects.effects.splice(i, 1);
                }
                if (typeof this._resolvePromise === "function") {
                    this._resolvePromise();
                    this._resolvePromise = null;
                }
                return;
            }
        },
        isExpired: function(now) {
            // Expired if duration has elapsed
            if (typeof now !== "number") now = performance.now();
            return (now - this.startTime) >= this.duration;
        },
        _resolvePromise: resolveEffectPromise
    };
    if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
        Game.logMessage(
            `[Effects] Added effect: type=${effect.type}, duration=${duration}ms`,
            null,
            { level: 'DEBUG', target: 'CONSOLE' }
        );
    }
    window.Effects.addEffect(effect);
    // Return a Promise that resolves when the effect is actually removed
    return effectPromise;
}

// Animation loop
let running = false;
function animationLoop(ctx) {
    if (!running) return;
    const now = performance.now();
    updateEffects(now);
    // Redraw the main game board before drawing effects
    if (typeof redrawCanvas === 'function' && typeof window.gameState !== 'undefined') {
        redrawCanvas(ctx, window.gameState);
    }
    drawEffects(ctx, now);
    // If there are still effects, keep animating; otherwise, stop
    if (window.Effects.effects && window.Effects.effects.length > 0) {
        requestAnimationFrame(() => animationLoop(ctx));
    } else {
        // One final redraw to clear any lingering effect artifacts
        if (typeof redrawCanvas === 'function' && typeof window.gameState !== 'undefined') {
            redrawCanvas(ctx, window.gameState);
        }
        running = false;
    }
}

// Start the animation loop
function startEffectsAnimation(ctx) {
    running = true;
    animationLoop(ctx);
}

// Stop the animation loop
function stopEffectsAnimation() {
    running = false;
}

// Exported API
let effectsCtx = null;
window.Effects = {
    addEffect: function(effect) {
        // Always use window.ctx for effects
        if (typeof window !== "undefined" && window.ctx) effectsCtx = window.ctx;
        // Add effect to the queue
        if (!window.Effects.effects) window.Effects.effects = [];
        window.Effects.effects.push(effect);
        // Start animation loop if not running and we have a context
        if (!running && effectsCtx) {
            startEffectsAnimation(effectsCtx);
        }
    },
    updateEffects,
    drawEffects,
    triggerRangedAttackEffect,
    startEffectsAnimation,
    stopEffectsAnimation,
    effects // for debugging/testing
};

// TODO: Extend Effect subclasses/types for specific effects (ranged attack, movement, etc.)
// TODO: Integrate with main game loop and UI
// TODO: Add sprite support in the future