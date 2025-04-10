console.log("input.js loaded");

/**
 * Handles keydown events for player actions.
 * Determines the player's *intended* action based on the key pressed and returns
 * a string representing that intent (e.g., 'MOVE_UP', 'SHOOT_LEFT', 'HEAL', 'WAIT').
 * Does NOT directly modify game state or call game logic/drawing functions.
 * @param {Event} event - The keydown event object.
 * @param {GameState} gameState - The current game state object.
 * @returns {string|null} The action intent string, or null if input is ignored or invalid.
 */
function handleKeyDown(event, gameState) {
    // console.log("handleKeyDown Fired! Key:", event.key);

    // Check prerequisites
    if (typeof Game === 'undefined') { console.error("Game object not loaded!"); return null; }
    if (!gameState) { console.error("handleKeyDown: gameState is missing!"); return null; }
    if (Game.isGameOver(gameState) || !Game.isPlayerTurn(gameState)) {
        // console.log(`Input ignored: GameOver=${Game.isGameOver(gameState)}, IsPlayerTurn=${Game.isPlayerTurn(gameState)}`);
        return null; // Ignore input if game over or not player's turn
    }
    if (!gameState.player || gameState.player.row === null || gameState.player.col === null) {
        console.warn("Player in gameState not ready, ignoring input.");
        return null;
    }

    let actionIntent = null;
    let actionKey = false; // Flag to track if a recognized action key was pressed

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

    // Return the determined action intent (or null if no action key was pressed)
    // The actual execution of the action (checking validity, changing state, ending turn)
    // will be handled by the main game loop based on this returned intent.
    console.log("Input Intent:", actionIntent); // Log the intent for debugging
    return actionIntent;

} // End handleKeyDown
