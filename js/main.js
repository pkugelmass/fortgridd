// --- Start of main.js ---
// console.log("SCRIPT START: Loading main.js..."); // Replaced by Game.logMessage in initializeGame

// --- Configuration --- (Defined in config.js)
// --- Game State Variable --- (Replaces individual globals like mapData, player, enemies)
let gameState; // Will be initialized by initializeGame()
// currentCellSize moved to drawing.js

// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
window.canvas = canvas;
window.ctx = ctx;
if (typeof redrawCanvas === "function") {
    window.redrawCanvas = redrawCanvas;
}

// UI Update functions (updateStatusBar, updateLogDisplay) moved to ui.js
// Resize/Draw function (resizeAndDraw) moved to ui.js

// --- Drawing Orchestration --- (Moved to drawing.js)
// function redrawCanvas(gameState) { ... }

// --- Enemy Creation Helper --- (Moved to game.js as Game.createAndPlaceEnemy)
// function createAndPlaceEnemy(...) { ... }

// --- Reset Game Logic --- (Moved to game.js as Game.resetGame)
// function resetGame(...) { ... }

// --- Player Turn Processing ---
/**
 * Processes the player's intended action based on the intent string.
 * Modifies gameState, calls relevant game logic, logs actions, and ends the player's turn.
 * @param {string|null} actionIntent - The intent string from handleKeyDown.
 * @param {GameState} gameState - The current game state object.
 */
function processPlayerTurn(actionIntent, gameState) {
    if (!actionIntent || !gameState || !gameState.player || !gameState.mapData || !gameState.enemies || typeof Game === 'undefined') {
        Game.logMessage("processPlayerTurn: Invalid actionIntent or missing gameState/required properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return; // Cannot process turn
    }

    // Ensure it's still the player's turn and game is active before processing
    if (Game.isGameOver(gameState) || !Game.isPlayerTurn(gameState)) {
        return; // Ignore if not player's turn or game over
    }

    const player = gameState.player;
    const mapData = gameState.mapData;
    const enemies = gameState.enemies;
    const gridHeight = mapData.length;
    const gridWidth = mapData[0] ? mapData[0].length : 0;
    let turnEnded = false; // Flag to track if the action consumed the turn

    // --- Process Action Intent ---
    // Call appropriate handler from PlayerActions module
    // Assumes PlayerActions object is globally accessible
    if (typeof PlayerActions === 'undefined') {
        Game.logMessage("processPlayerTurn: PlayerActions module not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return; // Cannot proceed
    }

    switch (actionIntent) {
        case 'MOVE_UP':
        case 'MOVE_DOWN':
        case 'MOVE_LEFT':
        case 'MOVE_RIGHT': {
            let dx = 0, dy = 0;
            if (actionIntent === 'MOVE_UP') dy = -1;
            else if (actionIntent === 'MOVE_DOWN') dy = 1;
            else if (actionIntent === 'MOVE_LEFT') dx = -1;
            else if (actionIntent === 'MOVE_RIGHT') dx = 1;

            const targetRow = player.row + dy;
            const targetCol = player.col + dx;

            // Call the handler from PlayerActions
            if (typeof PlayerActions.handleMoveOrAttack === 'function') {
                turnEnded = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);
            } else {
                 Game.logMessage("processPlayerTurn: PlayerActions.handleMoveOrAttack not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
            }
        }
        break;

    case 'WAIT':
        Game.logMessage("Player waits.", gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
        turnEnded = true;
        break;

    case 'HEAL':
        // Call the handler from PlayerActions
        if (typeof PlayerActions.handleHeal === 'function') {
            turnEnded = PlayerActions.handleHeal(player, gameState);
        } else {
             Game.logMessage("processPlayerTurn: PlayerActions.handleHeal not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
        break;

    case 'SHOOT_UP':
    case 'SHOOT_DOWN':
    case 'SHOOT_LEFT':
    case 'SHOOT_RIGHT': {
        let shootDirection = { dr: 0, dc: 0 };
        let dirString = "";
        if (actionIntent === 'SHOOT_UP') { shootDirection.dr = -1; dirString = "Up"; }
        else if (actionIntent === 'SHOOT_DOWN') { shootDirection.dr = 1; dirString = "Down"; }
        else if (actionIntent === 'SHOOT_LEFT') { shootDirection.dc = -1; dirString = "Left"; }
        else if (actionIntent === 'SHOOT_RIGHT') { shootDirection.dc = 1; dirString = "Right"; }

        // Call the handler from PlayerActions
        if (typeof PlayerActions.handleShoot === 'function') {
            turnEnded = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);
        } else {
             Game.logMessage("processPlayerTurn: PlayerActions.handleShoot not found!", gameState, { level: 'ERROR', target: 'CONSOLE' });
        }
    }
    break;

    default:
        Game.logMessage(`processPlayerTurn: Unknown actionIntent: ${actionIntent}`, gameState, { level: 'WARN', target: 'CONSOLE' });
        break;
    }

    // --- Post-Action Processing ---
    if (turnEnded) {
        const gameOver = Game.checkEndConditions(gameState);
        if (!gameOver) {
            Game.endPlayerTurn(gameState);
            runAiTurns(gameState); // Trigger AI turns
        }
    }

    // Always redraw after processing player input
    // updateLogDisplay is handled by Game.logMessage
    // Call redrawCanvas from drawing.js (requires ctx)
    if (typeof redrawCanvas === 'function') redrawCanvas(ctx, gameState);
    if (typeof updateStatusBar === 'function') updateStatusBar(gameState); // Ensure status bar updates after action
    if (typeof updateLogDisplay === 'function') updateLogDisplay(gameState); // Ensure log updates after action
}

// --- Initialization --- (Moved to game.js as Game.initializeGame)
// function initializeGame() { ... }

// --- Start Game ---
// Call Game.initializeGame() from game.js and assign the result to the global gameState
if (typeof Game !== 'undefined' && typeof Game.initializeGame === 'function') {
    gameState = Game.initializeGame(); // Assign the returned state
    if (!gameState || !gameState.gameActive) {
        console.error("Game initialization failed. Check logs.");
        // Optionally display a user-facing error message here
    }
} else {
    console.error("FATAL: Game object or Game.initializeGame function not found! Cannot start game.");
    // Display a user-facing error message
    if (typeof ctx !== 'undefined') {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 300, 150);
        ctx.font = '20px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('FATAL ERROR: Cannot start game.', 150, 75);
    }
}
