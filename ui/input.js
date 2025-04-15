/**
 * InputHandler class for managing user input in the grid-based, turn-based battle royale game.
 * All logic operates on OOP class instances (GameState, Player, etc.).
 * No import/export statements; compatible with global-scope loading via index.html.
 * No rendering or animation logic included.
 */
class InputHandler {
    /**
     * Handles keydown events for player actions.
     * Determines the player's intended action based on the key pressed and returns
     * a string representing that intent (e.g., 'MOVE_UP', 'SHOOT_LEFT', 'HEAL', 'WAIT').
     * Does NOT directly modify game state or call game logic/drawing functions.
     * @param {KeyboardEvent} event - The keydown event object.
     * @param {GameState} gameState - The current game state object.
     * @returns {string|null} The action intent string, or null if input is ignored or invalid.
     */
    static handleKeyDown(event, gameState) {
        // Check prerequisites
        if (!gameState) {
            if (gameState && typeof gameState.logMessage === 'function') {
                gameState.logMessage("InputHandler: gameState is missing!", { level: 'ERROR', target: 'CONSOLE' });
            }
            return null;
        }
        if (typeof gameState.isGameOver === 'function' ? gameState.isGameOver() : (window.Game && typeof window.Game.isGameOver === 'function' && window.Game.isGameOver(gameState))) {
            return null;
        }
        if (typeof gameState.isPlayerTurn === 'function' ? !gameState.isPlayerTurn() : (window.Game && typeof window.Game.isPlayerTurn === 'function' && !window.Game.isPlayerTurn(gameState))) {
            return null;
        }
        if (!gameState.player || gameState.player.row === null || gameState.player.col === null) {
            if (gameState && typeof gameState.logMessage === 'function') {
                gameState.logMessage("InputHandler: Player in gameState not ready, ignoring input.", { level: 'WARN', target: 'CONSOLE' });
            }
            return null;
        }

        let actionIntent = null;
        let actionKey = false;

        // Determine action intent based on key press
        switch (event.key.toLowerCase()) {
            // Movement / Melee Attack Intents (Directional)
            case 'arrowup': case 'w': actionIntent = 'MOVE_UP'; actionKey = true; break;
            case 'arrowdown': case 's': actionIntent = 'MOVE_DOWN'; actionKey = true; break;
            case 'arrowleft': case 'a': actionIntent = 'MOVE_LEFT'; actionKey = true; break;
            case 'arrowright': case 'd': actionIntent = 'MOVE_RIGHT'; actionKey = true; break;

            // Wait Intent
            case ' ': actionIntent = 'WAIT'; actionKey = true; break;

            // Heal Intent
            case 'h': actionIntent = 'HEAL'; actionKey = true; break;

            // Shoot Intents (Directional)
            case 'i': actionIntent = 'SHOOT_UP'; actionKey = true; break;
            case 'k': actionIntent = 'SHOOT_DOWN'; actionKey = true; break;
            case 'j': actionIntent = 'SHOOT_LEFT'; actionKey = true; break;
            case 'l': actionIntent = 'SHOOT_RIGHT'; actionKey = true; break;

            default:
                // Ignore other keys, don't prevent default
                return null;
        }

        // If a recognized action key was pressed, prevent default browser actions (like scrolling)
        if (actionKey) {
            event.preventDefault();
        }

        // Log input intent if logging is available
        if (gameState && typeof gameState.logMessage === 'function') {
            gameState.logMessage(`Input Intent: ${actionIntent}`, { level: 'DEBUG', target: 'CONSOLE' });
        }

        return actionIntent;
    }
}

// Expose InputHandler globally for use in index.html/main.js
window.InputHandler = InputHandler;