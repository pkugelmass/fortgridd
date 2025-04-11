// Tests for Turn Management logic (endPlayerTurn, endAiTurn) from js/game.js
console.log("game/turn_management.test.js loaded");

QUnit.module('Game Logic (game.js) > Turn Management', hooks => {
    let gameState;
    let gameMocks; // Use the helper
    // Constants are setup globally by setupTestConstants()

    hooks.beforeEach(() => {
        setupTestConstants();
        gameState = createMockGameState();
        gameState.gameActive = true;
        gameState.turnNumber = 5;
        gameState.currentTurn = 'player'; // Start as player turn

        // Use the helper to setup mocks
        gameMocks = setupGameMocks({
            shrinkSafeZone: (gs) => { return false; }, // Default: no shrink, just track call
            applyStormDamage: (gs) => { return false; }, // Default: no damage/change, just track call
            isGameOver: (gs) => { return !gs.gameActive; }, // Reflect actual state
            checkEndConditions: (gs) => { return false; } // Default: game doesn't end
        });
    });

    hooks.afterEach(() => {
        gameMocks.restore(); // Restore mocks
        cleanupTestConstants();
    });

    // --- endPlayerTurn Tests ---
    QUnit.test('endPlayerTurn: Switches currentTurn to "ai"', assert => {
        Game.endPlayerTurn(gameState);
        assert.equal(gameState.currentTurn, 'ai', 'currentTurn should be "ai"');
    });

    QUnit.test('endPlayerTurn: Does nothing if game is over', assert => {
        gameState.gameActive = false;
        gameState.currentTurn = 'player';
        Game.endPlayerTurn(gameState);
        assert.equal(gameState.currentTurn, 'player', 'currentTurn should remain "player"');
    });

    // --- endAiTurn Tests ---
    QUnit.test('endAiTurn: Increments turnNumber', assert => {
        const initialTurn = gameState.turnNumber;
        Game.endAiTurn(gameState);
        assert.equal(gameState.turnNumber, initialTurn + 1, 'turnNumber should increment');
    });

    QUnit.test('endAiTurn: Calls shrinkSafeZone', assert => {
        Game.endAiTurn(gameState);
        assert.equal(gameMocks.calls['shrinkSafeZone']?.count, 1, 'shrinkSafeZone should be called once');
        assert.deepEqual(gameMocks.calls['shrinkSafeZone'].args[0], [gameState], 'shrinkSafeZone called with gameState');
    });

    QUnit.test('endAiTurn: Calls applyStormDamage', assert => {
        Game.endAiTurn(gameState);
        assert.equal(gameMocks.calls['applyStormDamage']?.count, 1, 'applyStormDamage should be called once');
        assert.deepEqual(gameMocks.calls['applyStormDamage'].args[0], [gameState], 'applyStormDamage called with gameState');
    });

    QUnit.test('endAiTurn: Switches currentTurn to "player" if game not over', assert => {
        Game.endAiTurn(gameState);
        assert.equal(gameState.currentTurn, 'player', 'currentTurn should switch to "player"');
    });

    QUnit.test('endAiTurn: Does NOT switch turn if game becomes inactive during checks', assert => {
        // Restore original mocks first to redefine applyStormDamage for this specific test
        gameMocks.restore();
        gameMocks = setupGameMocks({
            shrinkSafeZone: (gs) => { return false; },
            applyStormDamage: (gs) => {
                // Custom mock for this test: make game inactive
                gs.gameActive = false;
                return true; // Indicate state changed
            },
            isGameOver: (gs) => { return !gs.gameActive; },
            checkEndConditions: (gs) => { return false; } // checkEndConditions itself doesn't end the game here
        });

        gameState.currentTurn = 'ai'; // Ensure it starts as AI turn
        Game.endAiTurn(gameState);
        assert.equal(gameState.currentTurn, 'ai', 'currentTurn should remain "ai"');
    });

    QUnit.test('endAiTurn: Does nothing if game is already over', assert => {
        gameState.gameActive = false;
        gameState.currentTurn = 'ai';
        const initialTurnNumber = gameState.turnNumber;
        Game.endAiTurn(gameState);

        assert.equal(gameMocks.calls['isGameOver']?.count, 1, 'isGameOver guard clause checked');
        assert.equal(gameState.turnNumber, initialTurnNumber, 'turnNumber should not change');
        assert.equal(gameState.currentTurn, 'ai', 'currentTurn should not change');
        assert.notOk(gameMocks.calls['shrinkSafeZone'], 'shrinkSafeZone should not be called');
        assert.notOk(gameMocks.calls['applyStormDamage'], 'applyStormDamage should not be called');
    });

});
