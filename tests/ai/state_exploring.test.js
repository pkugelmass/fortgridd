// Tests for js/ai/state_exploring.js (handleExploringState function)

// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('AI State: Exploring (handleExploringState)', hooks => {
    let gameState;
    let enemy;
    // Constants are setup globally by setupTestConstants()
    let originalMathRandom;

    // Store original global functions to restore them later
    let originalGetSafeZoneCenter;
    let originalMoveTowards;
    let originalMoveRandomly;
    let originalGameLogMessage; // Store original Game.logMessage

    hooks.beforeEach(() => {
        // Setup constants and basic game state/unit
        setupTestConstants(); // Sets up globals like AI_EXPLORE_*
        gameState = createMockGameState({ gridWidth: 10, gridHeight: 10 }); // Use a defined size
        enemy = createMockUnit(false, { id: 'explorer1', row: 5, col: 5 }); // Start inside by default
        gameState.enemies = [enemy]; // Add enemy to gameState
        gameState.aiUnits = { [enemy.id]: enemy }; // Ensure aiUnits object is populated

        // Mock global functions used by handleExploringState - Store originals
        originalGetSafeZoneCenter = window.getSafeZoneCenter;
        originalMoveTowards = window.moveTowards;
        originalMoveRandomly = window.moveRandomly;
        originalGameLogMessage = window.Game?.logMessage; // Store original log function

        // Assign simple mocks (overridden in tests if needed)
        window.getSafeZoneCenter = () => ({ row: Math.floor(gameState.gridHeight / 2), col: Math.floor(gameState.gridWidth / 2) });
        window.moveTowards = () => true;
        window.moveRandomly = () => true;
        // Use a simple no-op mock for logger to avoid test failures if called unexpectedly
        if (window.Game) window.Game.logMessage = () => {};

        // Store original Math.random
        originalMathRandom = Math.random;
    });

    hooks.afterEach(() => {
        // Restore global functions
        window.getSafeZoneCenter = originalGetSafeZoneCenter;
        window.moveTowards = originalMoveTowards;
        window.moveRandomly = originalMoveRandomly;
        if (window.Game) window.Game.logMessage = originalGameLogMessage; // Restore original logger

        // Restore constants
        cleanupTestConstants();

        // Restore Math.random
        Math.random = originalMathRandom;
    });

    // Simple call tracking for mocks - Reset before each test
    let mockCalls = {};
    const resetMockCalls = () => { mockCalls = {}; };
    const trackMockCall = (name, ...args) => {
        if (!mockCalls[name]) mockCalls[name] = { count: 0, args: [] };
        mockCalls[name].count++;
        mockCalls[name].args.push(args);
    };

    QUnit.module('Behavior Outside Safe Zone', hooks => {
        hooks.beforeEach(() => {
            resetMockCalls();
            // Place enemy outside safe zone (e.g., row 0)
            enemy.row = 0;
            enemy.col = 0;
            // Ensure safe zone is smaller than enemy position for clarity
            gameState.safeZone = { minRow: 1, maxRow: 8, minCol: 1, maxCol: 8, centerX: 5, centerY: 5, radius: 10 };

             // Re-apply mocks with tracking for this module's tests
             window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return true; };
             window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return true; };
             window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return { row: 5, col: 5 }; };
        });

        QUnit.test('Moves Towards Safety', assert => {
            // Mock specific behavior for this test
            window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return true; };
            window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return true; }; // Should not be called
            window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return { row: 5, col: 5 }; };
            const startRow = enemy.row; // Position check removed as mock doesn't change it
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (action taken)');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called once');
            assert.equal(mockCalls['moveTowards']?.count, 1, 'moveTowards called once');
            assert.notOk(mockCalls['moveRandomly'], 'moveRandomly should not be called');
        });

        QUnit.test('Blocked Towards Safety -> Moves Randomly', assert => {
            // Mock specific behavior for this test
            window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return false; }; // Mock failure
            window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return true; };
            window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return { row: 5, col: 5 }; };
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (action taken)');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called once');
            assert.equal(mockCalls['moveTowards']?.count, 1, 'moveTowards called once');
            assert.equal(mockCalls['moveRandomly']?.count, 1, 'moveRandomly called once');
        });

        QUnit.test('Blocked Towards Safety -> Blocked Randomly -> Waits (Stuck)', assert => {
            // Mock specific behavior for this test
            window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return false; }; // Mock failure
            window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return false; }; // Mock failure
            window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return { row: 5, col: 5 }; };
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (waiting counts as action)');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called once');
            assert.equal(mockCalls['moveTowards']?.count, 1, 'moveTowards called once');
            assert.equal(mockCalls['moveRandomly']?.count, 1, 'moveRandomly called once');
            assert.deepEqual({row: enemy.row, col: enemy.col}, {row: startRow, col: startCol}, 'Position should NOT change');
        });

         QUnit.test('Cannot Find Center -> Moves Randomly', assert => {
            // Mock specific behavior for this test
            window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return true; }; // Should not be called
            window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return true; };
            window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return null; }; // Mock no center
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (action taken)');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called once');
            assert.notOk(mockCalls['moveTowards'], 'moveTowards should not be called');
            assert.equal(mockCalls['moveRandomly']?.count, 1, 'moveRandomly called once');
        });

         QUnit.test('Cannot Find Center -> Blocked Randomly -> Waits (Stuck)', assert => {
            // Mock specific behavior for this test
            window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return true; }; // Should not be called
            window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return false; }; // Mock failure
            window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return null; }; // Mock no center
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (waiting counts as action)');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called once');
            assert.notOk(mockCalls['moveTowards'], 'moveTowards should not be called');
            assert.equal(mockCalls['moveRandomly']?.count, 1, 'moveRandomly called once');
            assert.deepEqual({row: enemy.row, col: enemy.col}, {row: startRow, col: startCol}, 'Position should NOT change');
        });
    });

    QUnit.module('Behavior Inside Safe Zone', hooks => {
        hooks.beforeEach(() => {
            resetMockCalls();
            // Ensure enemy starts inside the default safe zone (5,5 in 10x10 grid)
            enemy.row = 5;
            enemy.col = 5;
            gameState.safeZone = { minRow: 0, maxRow: 9, minCol: 0, maxCol: 9, centerX: 5, centerY: 5, radius: 10 };

             // Re-apply mocks with tracking for this module's tests
             window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return true; };
             window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return true; };
             window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return { row: 5, col: 5 }; };
        });

        QUnit.test('General Action Check (No Random Mocking)', assert => {
            const startRow = enemy.row;
            const startCol = enemy.col;
            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (action taken)');
            // Check that *one* of the expected primary actions (move attempt or explicit wait) occurred
            const movedTowards = mockCalls['moveTowards']?.count > 0;
            const movedRandomly = mockCalls['moveRandomly']?.count > 0;
            const waitedExplicitly = !movedTowards && !movedRandomly; // If no move attempted, must have waited

            assert.ok(movedTowards || movedRandomly || waitedExplicitly, 'Expected moveTowards, moveRandomly, or explicit wait');

             // Check only one path taken
             const attemptedMove = movedTowards || movedRandomly;
             assert.ok(attemptedMove || waitedExplicitly, "Either a move was attempted OR an explicit wait occurred");
             assert.notOk(attemptedMove && waitedExplicitly, "Cannot attempt move AND explicitly wait in the same turn");
        });

        // --- Path: Move Towards Center ---
        QUnit.test('Path: Move Towards Center - Success', assert => {
            Math.random = () => AI_EXPLORE_MOVE_AGGRESSION_CHANCE - 0.1; // Use global constant
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called');
            assert.equal(mockCalls['moveTowards']?.count, 1, 'moveTowards called');
            assert.notOk(mockCalls['moveRandomly'], 'moveRandomly not called');
        });

        QUnit.test('Path: Move Towards Center - Blocked', assert => {
            Math.random = () => AI_EXPLORE_MOVE_AGGRESSION_CHANCE - 0.1; // Use global constant
            window.moveTowards = (...args) => { trackMockCall('moveTowards', ...args); return false; }; // Mock failure
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (waits on block)');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called');
            assert.equal(mockCalls['moveTowards']?.count, 1, 'moveTowards called');
            assert.notOk(mockCalls['moveRandomly'], 'moveRandomly not called');
            assert.deepEqual({row: enemy.row, col: enemy.col}, {row: startRow, col: startCol}, 'Position should NOT change');
        });

         QUnit.test('Path: Move Towards Center - No Center Found', assert => {
            Math.random = () => AI_EXPLORE_MOVE_AGGRESSION_CHANCE - 0.1; // Use global constant
            window.getSafeZoneCenter = (...args) => { trackMockCall('getSafeZoneCenter', ...args); return null; }; // Mock no center
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (waits on block)');
            assert.equal(mockCalls['getSafeZoneCenter']?.count, 1, 'getSafeZoneCenter called');
            assert.notOk(mockCalls['moveTowards'], 'moveTowards should not be called');
            assert.notOk(mockCalls['moveRandomly'], 'moveRandomly not called');
            assert.deepEqual({row: enemy.row, col: enemy.col}, {row: startRow, col: startCol}, 'Position should NOT change');
        });


        // --- Path: Move Randomly ---
        QUnit.test('Path: Move Randomly - Success', assert => {
            Math.random = () => AI_EXPLORE_MOVE_AGGRESSION_CHANCE + 0.05; // Use global constant
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true');
            assert.notOk(mockCalls['getSafeZoneCenter'], 'getSafeZoneCenter not called');
            assert.notOk(mockCalls['moveTowards'], 'moveTowards not called');
            assert.equal(mockCalls['moveRandomly']?.count, 1, 'moveRandomly called');
        });

        QUnit.test('Path: Move Randomly - Blocked', assert => {
            Math.random = () => AI_EXPLORE_MOVE_AGGRESSION_CHANCE + 0.05; // Use global constant
            window.moveRandomly = (...args) => { trackMockCall('moveRandomly', ...args); return false; }; // Mock failure
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true (waits on block)');
            assert.notOk(mockCalls['getSafeZoneCenter'], 'getSafeZoneCenter not called');
            assert.notOk(mockCalls['moveTowards'], 'moveTowards not called');
            assert.equal(mockCalls['moveRandomly']?.count, 1, 'moveRandomly called');
            assert.deepEqual({row: enemy.row, col: enemy.col}, {row: startRow, col: startCol}, 'Position should NOT change');
        });

        // --- Path: Wait Explicitly ---
        QUnit.test('Path: Wait Explicitly', assert => {
            // Force this path (ensure value is >= sum of other chances)
            Math.random = () => AI_EXPLORE_MOVE_AGGRESSION_CHANCE + AI_EXPLORE_MOVE_RANDOM_CHANCE + 0.1; // Use global constants
            const startRow = enemy.row;
            const startCol = enemy.col;

            const result = handleExploringState(enemy, gameState);

            assert.ok(result, 'Should return true');
            assert.notOk(mockCalls['getSafeZoneCenter'], 'getSafeZoneCenter not called');
            assert.notOk(mockCalls['moveTowards'], 'moveTowards not called');
            assert.notOk(mockCalls['moveRandomly'], 'moveRandomly not called');
            assert.deepEqual({row: enemy.row, col: enemy.col}, {row: startRow, col: startCol}, 'Position should NOT change');
        });
    });
});
