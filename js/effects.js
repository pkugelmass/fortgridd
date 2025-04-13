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
    const activeEffects = (window.Effects && Array.isArray(window.Effects.effects)) ? window.Effects.effects : [];
    if (!activeEffects || activeEffects.length === 0) {
        return;
    }
    for (const effect of activeEffects) {
        effect.draw(ctx, now);
    }
}

// Utility: Trigger a ranged attack projectile effect
/**
 * [DISABLED] triggerRangedAttackEffect is now handled by the new AnimationSystem.
 * Calls to this function will log a warning and resolve immediately.
 */
function triggerRangedAttackEffect({ linePoints, hitCell, color }) {
    if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
        Game.logMessage(
            "[Effects] triggerRangedAttackEffect is disabled. Use the new AnimationSystem instead.",
            null,
            { level: 'WARN', target: 'CONSOLE' }
        );
    }
    return Promise.resolve();
}

// Animation loop
let running = false;
let lastFrameTime = 0;
const EFFECTS_ANIMATION_FPS = 30; // Target FPS for effects animation
const EFFECTS_ANIMATION_FRAME_DURATION = 1000 / EFFECTS_ANIMATION_FPS;

function animationLoop(ctx) {
    if (!running) return;
    const now = performance.now();

    // Frame rate limiting
    if (now - lastFrameTime < EFFECTS_ANIMATION_FRAME_DURATION) {
        requestAnimationFrame(() => animationLoop(ctx));
        return;
    }
    lastFrameTime = now;

    updateEffects(now);
    // Redraw the main game board before drawing effects
    if (typeof redrawCanvas === 'function' && typeof window.gameState !== 'undefined') {
        // Check for active movement effect and skip drawing that unit
        let activeUnitId = null;
        if (window.Effects && Array.isArray(window.Effects.effects)) {
            const movementEffect = window.Effects.effects.find(e => e.type === "movement" && e.data && e.data.unit && e.data.unit.id !== undefined);
            if (movementEffect) {
                activeUnitId = movementEffect.data.unit.id;
            }
        }
        redrawCanvas(ctx, window.gameState, activeUnitId);
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
    triggerMovementEffect,
    startEffectsAnimation,
    stopEffectsAnimation,
    effects // for debugging/testing
};

/**
 * Utility: Trigger a movement animation effect (sliding with optional easing)
 * @param {Object} params - { unit, from: {row, col}, to: {row, col}, color, options }
 * @returns {Promise} Resolves when the animation completes
 */
function triggerMovementEffect({ unit, from, to, color, options = {} }) {
    // Import config values
    const duration = typeof options.duration === "number" ? options.duration : (typeof MOVEMENT_ANIMATION_DURATION !== "undefined" ? MOVEMENT_ANIMATION_DURATION : 180);
    const easing = typeof options.easing === "string" ? options.easing : (typeof ANIMATION_EASING !== "undefined" ? ANIMATION_EASING : "easeInOut");

    // Easing functions
    const EASING = {
        linear: t => t,
        easeIn: t => t * t,
        easeOut: t => t * (2 - t),
        easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    };
    const easeFn = EASING[easing] || EASING.easeInOut;

    let resolveEffectPromise;
    const effectPromise = new Promise(resolve => {
        resolveEffectPromise = resolve;
    });

    const effect = {
        type: "movement",
        startTime: performance.now(),
        duration,
        data: {
            from: { row: from.row, col: from.col },
            to: { row: to.row, col: to.col },
            color: color || (unit && unit.isPlayer ? "#007bff" : "#ff0000"),
            unit,
            easeFn
        },
        draw: function(ctx, now) {
            const elapsed = now - this.startTime;
            let t = Math.min(1, Math.max(0, elapsed / this.duration));
            t = this.data.easeFn(t);
        
            // Interpolate position
            const row = this.data.from.row + (this.data.to.row - this.data.from.row) * t;
            const col = this.data.from.col + (this.data.to.col - this.data.from.col) * t;
        
            // Draw the unit at the interpolated position using the main draw functions
            const cellSize = typeof currentCellSize !== 'undefined' ? currentCellSize : 16;
            if (this.data.unit && this.data.unit.isPlayer) {
                if (typeof drawPlayer === "function") {
                    drawPlayer(ctx, this.data.unit, cellSize, { interpolatedRow: row, interpolatedCol: col });
                }
            } else {
                if (typeof drawEnemies === "function") {
                    // We need to pass a single enemy in an array, and provide interpolated position for that enemy id
                    const enemy = this.data.unit;
                    const opts = {
                        interpolatedEnemies: {
                            [enemy.id]: { row, col }
                        }
                    };
                    drawEnemies(ctx, [enemy], cellSize, opts);
                }
            }
        
            // If animation is complete, remove effect and resolve
            if (elapsed >= this.duration) {
                if (window.Effects && Array.isArray(window.Effects.effects)) {
                    const i = window.Effects.effects.indexOf(this);
                    if (i !== -1) window.Effects.effects.splice(i, 1);
                }
                if (typeof this._resolvePromise === "function") {
                    this._resolvePromise();
                    this._resolvePromise = null;
                }
            }
        },
        isExpired: function(now) {
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
    return effectPromise;
}

// TODO: Extend Effect subclasses/types for specific effects (ranged attack, movement, etc.)
// TODO: Integrate with main game loop and UI
// TODO: Add sprite support in the future