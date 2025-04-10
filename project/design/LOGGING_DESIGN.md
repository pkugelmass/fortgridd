# Logging System Design

This document outlines the design for the standardized logging system in the game.

## Goals

*   Centralize logging through a single function (`Game.logMessage`).
*   Differentiate between developer-focused logs (console) and player-facing logs (in-game UI).
*   Control console log verbosity.
*   Maintain consistent formatting and styling for player logs.

## Core Function: `Game.logMessage`

The primary logging function will be enhanced:

```javascript
/**
 * Logs a message to the appropriate target(s) with specified level and styling.
 * @param {string} message - The core message content.
 * @param {GameState} gameState - The current game state.
 * @param {object} options - Logging options.
 * @param {string} [options.level='INFO'] - Severity/type ('DEBUG', 'INFO', 'WARN', 'ERROR', 'PLAYER'). Controls console output method and filtering. 'PLAYER' is primarily for player log.
 * @param {string} [options.target='PLAYER'] - Destination ('CONSOLE', 'PLAYER', 'BOTH').
 * @param {string|null} [options.className=null] - CSS class for styling messages in the player log.
 */
Game.logMessage(message, gameState, { level = 'INFO', target = 'PLAYER', className = null })
```

## Log Levels (`level`)

Used primarily for console filtering and selecting the `console` method:

*   **`DEBUG`**: Detailed information for developers (e.g., variable states, function entry/exit, AI reasoning). Uses `console.debug()` or `console.log()`.
*   **`INFO`**: General information about game flow (e.g., turn start/end, non-critical system events, player/AI actions). Uses `console.log()`.
*   **`WARN`**: Potential issues or unexpected situations that don't break the game (e.g., minor configuration problems, non-critical failed actions). Uses `console.warn()`.
*   **`ERROR`**: Significant errors that might affect gameplay or indicate bugs (e.g., failed critical operations, invalid state). Uses `console.error()`.
*   **`PLAYER`**: A level primarily indicating the message is intended for the player log, often used when the console equivalent might be 'INFO' or 'DEBUG'. Can still be logged to console if `target` is 'CONSOLE' or 'BOTH'.

Console output will be filtered by `CONSOLE_LOG_LEVEL` in `config.js`. Only messages with a level equal to or higher than the configured level will appear (e.g., if set to 'INFO', 'INFO', 'WARN', and 'ERROR' messages appear).

## Log Targets (`target`)

Determines where the log message is sent:

*   **`CONSOLE`**: Only sent to the developer console (subject to `CONSOLE_LOG_LEVEL` filtering).
*   **`PLAYER`**: Only sent to the in-game log display (`gameState.logMessages`, rendered by `updateLogDisplay`).
*   **`BOTH`**: Sent to both the console (filtered) and the player log.

## Message Categories & Examples

Mapping user-defined categories to the system:

1.  **System Messages:** (Developer focus)
    *   *Examples:* "ui.js loaded", "Initializing game...", "AI state changed to Exploring", "Calculating path...", "Invalid move detected"
    *   *Typical Settings:* `target: 'CONSOLE'`, `level: 'DEBUG'` or `'INFO'` (or `'WARN'`/`'ERROR'` for issues).
2.  **Game Milestones:** (Player focus, potentially console too)
    *   *Examples:* "Game Started.", "All enemies eliminated! YOU WIN!", "Player eliminated! GAME OVER!", "Storm shrinks! Safe Zone: ..."
    *   *Typical Settings:* `target: 'PLAYER'` or `'BOTH'`, `level: 'INFO'` or `'PLAYER'`, `className: LOG_CLASS_SYSTEM`, `LOG_CLASS_PLAYER_GOOD/BAD`.
3.  **Player/AI Actions:** (Player focus, detailed reasoning to console)
    *   *Examples (Player Log):* "Player moves to (5,5).", "Player attacks Goblin for 3 damage.", "Enemy Goblin heals 5 HP.", "Player picks up Medkit."
    *   *Typical Settings (Player Log):* `target: 'PLAYER'`, `level: 'PLAYER'` or `'INFO'`, `className: LOG_CLASS_PLAYER_NEUTRAL/GOOD/BAD`, `LOG_CLASS_ENEMY_EVENT`.
    *   *Examples (Console Debug):* "Enemy Goblin evaluating targets: Player visible.", "Player move blocked by wall at (5,6)."
    *   *Typical Settings (Console Debug):* `target: 'CONSOLE'`, `level: 'DEBUG'`.
4.  **Critical Errors:** (Both player and console)
    *   *Examples:* "FATAL: Core game logic missing!", "Error loading map data."
    *   *Typical Settings:* `target: 'BOTH'`, `level: 'ERROR'`, `className: LOG_CLASS_CRITICAL_ERROR` (or similar).

## CSS Classes (`className`)

These remain unchanged and are passed through `Game.logMessage` to be used by `updateLogDisplay` for styling the player log. Examples:

*   `LOG_CLASS_SYSTEM`
*   `LOG_CLASS_PLAYER_GOOD`
*   `LOG_CLASS_PLAYER_BAD`
*   `LOG_CLASS_PLAYER_NEUTRAL`
*   `LOG_CLASS_ENEMY_EVENT`
*   *(Potentially add `LOG_CLASS_CRITICAL_ERROR`)*

## Implementation Steps

1.  Add `CONSOLE_LOG_LEVEL` to `js/config.js`.
2.  Modify `Game.logMessage` in `js/game.js` to implement the new signature and logic.
3.  Iterate through all existing `Game.logMessage` calls and update them with appropriate `level`, `target`, and `className`.
4.  Iterate through all direct `console.*` calls, converting them to `Game.logMessage` with `target: 'CONSOLE'` or removing them.
5.  Update `project/TASKS.md`.
