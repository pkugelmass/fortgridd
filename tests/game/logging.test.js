// Tests for Game.logMessage from js/game.js
console.log("game/logging.test.js loaded");

QUnit.module('Game Logic (game.js) > logMessage', hooks => {
    let gameState;
    // Constants are setup globally by setupTestConstants()

    // Store original console methods
    let originalConsoleLog;
    let originalConsoleWarn;
    let originalConsoleError;

    hooks.beforeEach(() => {
        setupTestConstants();
        gameState = createMockGameState(); // Use helper for basic state
        gameState.logMessages = []; // Ensure log is empty
        gameState.turnNumber = 5; // Set a turn number for context

        // Store originals (though we won't assert on console calls)
        originalConsoleLog = console.log;
        originalConsoleWarn = console.warn;
        originalConsoleError = console.error;
        // Temporarily disable console output during tests to avoid clutter
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
    });

    hooks.afterEach(() => {
        // Restore console methods
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        cleanupTestConstants();
    });

    QUnit.test('Target PLAYER: Adds message to gameState.logMessages with class', assert => {
        const message = "Player message";
        const cssClass = "test-class";
        Game.logMessage(message, gameState, { target: 'PLAYER', className: cssClass });

        assert.equal(gameState.logMessages.length, 1, 'One message should be added');
        assert.deepEqual(gameState.logMessages[0], { message: `T5: ${message}`, cssClass: cssClass }, 'Message object should have correct content and class');
    });

    QUnit.test('Target BOTH: Adds message to gameState.logMessages with class', assert => {
        const message = "Both message";
        const cssClass = "another-class";
        Game.logMessage(message, gameState, { target: 'BOTH', className: cssClass });

        assert.equal(gameState.logMessages.length, 1, 'One message should be added');
        assert.deepEqual(gameState.logMessages[0], { message: `T5: ${message}`, cssClass: cssClass }, 'Message object should have correct content and class');
    });

     QUnit.test('Target CONSOLE: Does NOT add message to gameState.logMessages', assert => {
        const message = "Console only";
        Game.logMessage(message, gameState, { target: 'CONSOLE' });

        assert.equal(gameState.logMessages.length, 0, 'No messages should be added to player log');
    });

    QUnit.test('Default Target (PLAYER): Adds message to gameState.logMessages', assert => {
        const message = "Default target";
        Game.logMessage(message, gameState); // No options specified

        assert.equal(gameState.logMessages.length, 1, 'One message should be added');
        assert.deepEqual(gameState.logMessages[0], { message: `T5: ${message}`, cssClass: null }, 'Message object should have correct content and null class');
    });

    // Skipping Log Capping test per guidelines/feedback

     QUnit.test('Message Formatting: Includes turn number', assert => {
        const message = "Test format";
        gameState.turnNumber = 123;
        Game.logMessage(message, gameState, { target: 'PLAYER' });

        assert.equal(gameState.logMessages.length, 1, 'One message should be added');
        assert.equal(gameState.logMessages[0].message, `T123: ${message}`, 'Message should be prefixed with correct turn number');
    });

});
