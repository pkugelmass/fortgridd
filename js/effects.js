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
            effects.splice(i, 1);
        }
    }
}

// Draw all active effects
function drawEffects(ctx, now) {
    for (const effect of effects) {
        effect.draw(ctx, now);
    }
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
    requestAnimationFrame(() => animationLoop(ctx));
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
window.Effects = {
    addEffect,
    updateEffects,
    drawEffects,
    startEffectsAnimation,
    stopEffectsAnimation,
    effects // for debugging/testing
};

// TODO: Extend Effect subclasses/types for specific effects (ranged attack, movement, etc.)
// TODO: Integrate with main game loop and UI
// TODO: Add sprite support in the future