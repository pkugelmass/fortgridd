// --- Start of main.js ---
// ...existing code above...

// --- Imports for Animation System ---
/* Removed ES6 imports; using global AnimationSystem and drawFrame loaded via script tags */

// --- Game State Variable ---
let gameState; // Will be initialized by initializeGame()

// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
window.canvas = canvas;
window.ctx = ctx;

// --- Threat Map Generator ---
function generateThreatMap(gs) {
    if (typeof Game !== 'undefined' && typeof Game.calculateThreatMap === 'function') {
        return Game.calculateThreatMap(gs);
    }
    return null;
}

// --- Initialize Animation System ---
let animationSystem;
function startAnimationSystem() {
    animationSystem = new AnimationSystem({
        gameState: gameState,
        createThreatMap: generateThreatMap,
        drawFrame: (renderState) => drawFrame(ctx, renderState),
        getGameState: () => gameState
    });
    // animationSystem.maxFPS = 30; // FPS cap removed for smoothest animation
    animationSystem.start();
}

/**
 * Initialize the game and start the animation system.
 * This ensures the animation loop only starts after gameState is ready.
 */
gameState = Game.initializeGame();
if (gameState) {
    startAnimationSystem();
} else {
    console.error("Failed to initialize gameState. Animation system not started.");
}

/**
 * Handles player action intents and turn processing.
 * @param {string} actionIntent - The player's intended action.
 * @param {object} gameState - The current game state.
 */
function processPlayerTurn(actionIntent, gameState) {
    if (
        !actionIntent ||
        !gameState ||
        !gameState.player ||
        !gameState.mapData ||
        !gameState.enemies ||
        typeof Game === 'undefined'
    ) {
        Game.logMessage(
            "processPlayerTurn: Invalid actionIntent or missing gameState/required properties.",
            gameState,
            { level: 'ERROR', target: 'CONSOLE' }
        );
        return;
    }

    // Set activeUnitId to the player for the duration of the player's turn
    if (gameState.player?.id) {
        gameState.activeUnitId = gameState.player.id;
    }

    // Only process if it's the player's turn and the game is active
    if (Game.isGameOver(gameState) || !Game.isPlayerTurn(gameState)) return;

    const player = gameState.player;
    let turnEnded = false;

    if (typeof PlayerActions === 'undefined') {
        Game.logMessage(
            "processPlayerTurn: PlayerActions module not found!",
            gameState,
            { level: 'ERROR', target: 'CONSOLE' }
        );
        return;
    }

    switch (actionIntent) {
        case 'MOVE_UP':
        case 'MOVE_DOWN':
        case 'MOVE_LEFT':
        case 'MOVE_RIGHT': {
            const [dx, dy] = (() => {
                switch (actionIntent) {
                    case 'MOVE_UP': return [0, -1];
                    case 'MOVE_DOWN': return [0, 1];
                    case 'MOVE_LEFT': return [-1, 0];
                    case 'MOVE_RIGHT': return [1, 0];
                }
            })();
            const targetRow = player.row + dy;
            const targetCol = player.col + dx;
            if (typeof PlayerActions.handleMoveOrAttack === 'function') {
                turnEnded = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);
            } else {
                Game.logMessage(
                    "processPlayerTurn: PlayerActions.handleMoveOrAttack not found!",
                    gameState,
                    { level: 'ERROR', target: 'CONSOLE' }
                );
            }
            break;
        }

        case 'WAIT':
            Game.logMessage(
                "Player waits.",
                gameState,
                { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL }
            );
            turnEnded = true;
            break;

        case 'HEAL':
            if (typeof PlayerActions.handleHeal === 'function') {
                turnEnded = PlayerActions.handleHeal(player, gameState);
            } else {
                Game.logMessage(
                    "processPlayerTurn: PlayerActions.handleHeal not found!",
                    gameState,
                    { level: 'ERROR', target: 'CONSOLE' }
                );
            }
            break;

        case 'SHOOT_UP':
        case 'SHOOT_DOWN':
        case 'SHOOT_LEFT':
        case 'SHOOT_RIGHT': {
            const { dr, dc, dirString } = (() => {
                switch (actionIntent) {
                    case 'SHOOT_UP': return { dr: -1, dc: 0, dirString: "Up" };
                    case 'SHOOT_DOWN': return { dr: 1, dc: 0, dirString: "Down" };
                    case 'SHOOT_LEFT': return { dr: 0, dc: -1, dirString: "Left" };
                    case 'SHOOT_RIGHT': return { dr: 0, dc: 1, dirString: "Right" };
                }
            })();
            if (typeof PlayerActions.handleShoot === 'function') {
                turnEnded = PlayerActions.handleShoot(player, { dr, dc }, dirString, gameState);
            } else {
                Game.logMessage(
                    "processPlayerTurn: PlayerActions.handleShoot not found!",
                    gameState,
                    { level: 'ERROR', target: 'CONSOLE' }
                );
            }
            break;
        }

        default:
            Game.logMessage(
                `processPlayerTurn: Unknown actionIntent: ${actionIntent}`,
                gameState,
                { level: 'WARN', target: 'CONSOLE' }
            );
            break;
    }

    // Post-action processing
    if (turnEnded) {
        const gameOver = Game.checkEndConditions(gameState);
        if (!gameOver) {
            Game.endPlayerTurn(gameState);
            runAiTurns(gameState);
        }
    }

    // Redraw and update UI/logs
    if (typeof redrawCanvas === 'function') redrawCanvas(ctx, gameState);
    if (typeof updateStatusBar === 'function') updateStatusBar(gameState);
    if (typeof updateLogDisplay === 'function') updateLogDisplay(gameState);

    // Clear activeUnitId after the player's turn is complete
    gameState.activeUnitId = null;
}
if (gameState) {
    startAnimationSystem();
} else {
    console.error("Failed to initialize gameState. Animation system not started.");
}

// ...rest of main.js unchanged...
