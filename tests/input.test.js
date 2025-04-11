// Tests for js/input.js

// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('Input Handling (input.js) > handleKeyDown', hooks => {
    let gameState;
    let player;
    // Constants are setup globally by setupTestConstants()

    // Store original Game methods
    let originalGameIsGameOver;
    let originalGameIsPlayerTurn;
    let originalGameLogMessage;

    // Simple call tracking for mocks
    let mockCalls = {};
    const resetMockCalls = () => { mockCalls = {}; };
    const trackMockCall = (name, ...args) => {
        if (!mockCalls[name]) mockCalls[name] = { count: 0, args: [] };
        mockCalls[name].count++;
        mockCalls[name].args.push(args);
    };

    // Helper to create a mock event object
    const createMockEvent = (key) => {
        let defaultPrevented = false;
        return {
            key: key,
            preventDefault: () => {
                trackMockCall('preventDefault');
                defaultPrevented = true;
            },
            isDefaultPrevented: () => defaultPrevented // Helper to check if preventDefault was called
        };
    };

    hooks.beforeEach(() => {
        setupTestConstants();
        player = createMockUnit(true, { id: 'player', row: 5, col: 5 });
        gameState = createMockGameState({ player: player });
        gameState.gameActive = true;
        gameState.currentTurn = 'player';

        // Store originals and mock dependencies
        originalGameIsGameOver = Game.isGameOver;
        Game.isGameOver = (gs) => { trackMockCall('isGameOver', gs); return !gs.gameActive; };

        originalGameIsPlayerTurn = Game.isPlayerTurn;
        Game.isPlayerTurn = (gs) => { trackMockCall('isPlayerTurn', gs); return gs.currentTurn === 'player'; };

        originalGameLogMessage = Game.logMessage;
        Game.logMessage = (...args) => { trackMockCall('logMessage', ...args); }; // Mock logger

        resetMockCalls();
    });

    hooks.afterEach(() => {
        Game.isGameOver = originalGameIsGameOver;
        Game.isPlayerTurn = originalGameIsPlayerTurn;
        Game.logMessage = originalGameLogMessage;
        cleanupTestConstants();
    });

    QUnit.test('Input ignored if game is over', assert => {
        gameState.gameActive = false;
        const event = createMockEvent('w');
        const result = handleKeyDown(event, gameState);
        assert.strictEqual(result, null, 'Should return null');
        assert.equal(mockCalls['isGameOver']?.count, 1, 'isGameOver checked');
        assert.notOk(event.isDefaultPrevented(), 'preventDefault should not be called');
    });

    QUnit.test('Input ignored if not player turn', assert => {
        gameState.currentTurn = 'ai';
        const event = createMockEvent('w');
        const result = handleKeyDown(event, gameState);
        assert.strictEqual(result, null, 'Should return null');
        assert.equal(mockCalls['isPlayerTurn']?.count, 1, 'isPlayerTurn checked');
        assert.notOk(event.isDefaultPrevented(), 'preventDefault should not be called');
    });

     QUnit.test('Input ignored if player is null', assert => {
        gameState.player = null;
        const event = createMockEvent('w');
        const result = handleKeyDown(event, gameState);
        assert.strictEqual(result, null, 'Should return null');
        assert.notOk(event.isDefaultPrevented(), 'preventDefault should not be called');
    });

    // --- Movement Keys ---
    const movementKeys = {
        'ArrowUp': 'MOVE_UP', 'w': 'MOVE_UP',
        'ArrowDown': 'MOVE_DOWN', 's': 'MOVE_DOWN',
        'ArrowLeft': 'MOVE_LEFT', 'a': 'MOVE_LEFT',
        'ArrowRight': 'MOVE_RIGHT', 'd': 'MOVE_RIGHT'
    };
    Object.keys(movementKeys).forEach(key => {
        QUnit.test(`Movement Key: "${key}" returns "${movementKeys[key]}" and prevents default`, assert => {
            const event = createMockEvent(key);
            const result = handleKeyDown(event, gameState);
            assert.equal(result, movementKeys[key], `Intent should be ${movementKeys[key]}`);
            assert.ok(event.isDefaultPrevented(), 'preventDefault should be called');
        });
    });

    // --- Shoot Keys ---
     const shootKeys = {
        'i': 'SHOOT_UP',
        'k': 'SHOOT_DOWN',
        'j': 'SHOOT_LEFT',
        'l': 'SHOOT_RIGHT'
    };
    Object.keys(shootKeys).forEach(key => {
        QUnit.test(`Shoot Key: "${key}" returns "${shootKeys[key]}" and prevents default`, assert => {
            const event = createMockEvent(key);
            const result = handleKeyDown(event, gameState);
            assert.equal(result, shootKeys[key], `Intent should be ${shootKeys[key]}`);
            assert.ok(event.isDefaultPrevented(), 'preventDefault should be called');
        });
    });

    // --- Other Action Keys ---
     QUnit.test('Wait Key: Spacebar (" ") returns "WAIT" and prevents default', assert => {
        const event = createMockEvent(' ');
        const result = handleKeyDown(event, gameState);
        assert.equal(result, 'WAIT', 'Intent should be WAIT');
        assert.ok(event.isDefaultPrevented(), 'preventDefault should be called');
    });

     QUnit.test('Heal Key: "h" returns "HEAL" and prevents default', assert => {
        const event = createMockEvent('h');
        const result = handleKeyDown(event, gameState);
        assert.equal(result, 'HEAL', 'Intent should be HEAL');
        assert.ok(event.isDefaultPrevented(), 'preventDefault should be called');
    });

    // --- Unrecognized Keys ---
    const unrecognizedKeys = ['q', 'Enter', 'Shift', '1', 'Tab'];
    unrecognizedKeys.forEach(key => {
         QUnit.test(`Unrecognized Key: "${key}" returns null and does not prevent default`, assert => {
            const event = createMockEvent(key);
            const result = handleKeyDown(event, gameState);
            assert.strictEqual(result, null, 'Should return null');
            assert.notOk(event.isDefaultPrevented(), 'preventDefault should not be called');
        });
    });

});
