// Tests for js/ai/state_seeking_resources.js

// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('AI State: Seeking Resources (handleSeekingResourcesState)', hooks => {
    let gameState;
    let enemy;
    let targetCoords;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects to restore them later
    let originalValidateSeekingState;
    let originalMoveOrHandleArrivalSeeking;
    let originalGameLogMessage;

    // Simple call tracking for mocks
    let mockCalls = {};
    const resetMockCalls = () => { mockCalls = {}; };
    const trackMockCall = (name, ...args) => {
        if (!mockCalls[name]) mockCalls[name] = { count: 0, args: [] };
        mockCalls[name].count++;
        mockCalls[name].args.push(args);
    };

    hooks.beforeEach(() => {
        setupTestConstants();
        targetCoords = { row: 1, col: 1 };
        enemy = createMockUnit(false, {
            id: 'seeker1',
            state: AI_STATE_SEEKING_RESOURCES, // Ensure correct state
            targetResourceCoords: targetCoords, // Set target
            hp: 10, maxHp: 10,
            row: 5, col: 5,
            resources: { ammo: 1, medkits: 0 }
        });
        gameState = createMockGameState({ enemies: [enemy] });
        // Ensure target resource exists in mock map
        if (gameState.mapData[targetCoords.row]) {
            gameState.mapData[targetCoords.row][targetCoords.col] = TILE_AMMO;
        }

        // Store originals and mock dependencies/helpers
        originalValidateSeekingState = window._validateSeekingState;
        window._validateSeekingState = (...args) => {
            trackMockCall('_validateSeekingState', ...args);
            // Default mock: Validation passes
            return { isValid: true, targetCoords: targetCoords, needsReevaluation: false, reason: null };
        };

        originalMoveOrHandleArrivalSeeking = window._moveOrHandleArrivalSeeking;
        window._moveOrHandleArrivalSeeking = (...args) => {
            trackMockCall('_moveOrHandleArrivalSeeking', ...args);
            return true; // Default mock: Move/Arrival succeeds
        };

        // Mock logger
        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        // Restore global functions/objects
        window._validateSeekingState = originalValidateSeekingState;
        window._moveOrHandleArrivalSeeking = originalMoveOrHandleArrivalSeeking;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;

        cleanupTestConstants();
    });

    QUnit.test('Validation Fails -> Returns false (needs re-evaluation)', assert => {
        // Override mock: Validation fails
        window._validateSeekingState = (...args) => {
            trackMockCall('_validateSeekingState', ...args);
            return { isValid: false, targetCoords: null, needsReevaluation: true, reason: 'test_reason' };
        };

        const result = handleSeekingResourcesState(enemy, gameState);

        assert.false(result, 'Should return false when validation fails');
        assert.equal(mockCalls['_validateSeekingState']?.count, 1, '_validateSeekingState called once');
        assert.notOk(mockCalls['_moveOrHandleArrivalSeeking'], '_moveOrHandleArrivalSeeking should not be called');
    });

    QUnit.test('Validation OK -> Calls _moveOrHandleArrivalSeeking', assert => {
        // Ensure move handler returns true for this test
        window._moveOrHandleArrivalSeeking = (...args) => {
            trackMockCall('_moveOrHandleArrivalSeeking', ...args);
            return true;
        };

        const result = handleSeekingResourcesState(enemy, gameState);

        assert.true(result, 'Should return true (result of move/arrival handler)');
        assert.equal(mockCalls['_validateSeekingState']?.count, 1, '_validateSeekingState called once');
        assert.equal(mockCalls['_moveOrHandleArrivalSeeking']?.count, 1, '_moveOrHandleArrivalSeeking called once');
        assert.deepEqual(mockCalls['_moveOrHandleArrivalSeeking'].args[0], [enemy, targetCoords, gameState], '_moveOrHandleArrivalSeeking called with correct args');
    });

     QUnit.test('Validation OK -> Move/Arrival Handler Returns False', assert => {
        // Ensure move handler returns false for this test (though currently it always returns true)
        window._moveOrHandleArrivalSeeking = (...args) => {
            trackMockCall('_moveOrHandleArrivalSeeking', ...args);
            return false;
        };

        const result = handleSeekingResourcesState(enemy, gameState);

        // The main handler just returns the result of the helper
        assert.false(result, 'Should return false (result of move/arrival handler)');
        assert.equal(mockCalls['_validateSeekingState']?.count, 1, '_validateSeekingState called once');
        assert.equal(mockCalls['_moveOrHandleArrivalSeeking']?.count, 1, '_moveOrHandleArrivalSeeking called once');
    });

});


QUnit.module('AI State: Seeking Resources (_validateSeekingState)', hooks => {
    let gameState;
    let enemy;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects
    let originalGameLogMessage;

    // Simple call tracking for mocks
    let mockCalls = {};
    const resetMockCalls = () => { mockCalls = {}; };
    const trackMockCall = (name, ...args) => {
        if (!mockCalls[name]) mockCalls[name] = { count: 0, args: [] };
        mockCalls[name].count++;
        mockCalls[name].args.push(args);
    };

    hooks.beforeEach(() => {
        setupTestConstants();
        enemy = createMockUnit(false, {
            id: 'seeker1',
            state: AI_STATE_SEEKING_RESOURCES,
            targetResourceCoords: { row: 1, col: 1 }, // Default valid target
            row: 5, col: 5
        });
        // Create a basic mock gameState with mapData
        gameState = createMockGameState({ enemies: [enemy] });
        // Ensure the target resource exists
        gameState.mapData[1][1] = TILE_AMMO;

        // Mock logger
        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        if (window.Game) window.Game.logMessage = originalGameLogMessage;
        cleanupTestConstants();
    });

    QUnit.test('Target Valid: Coords exist, in bounds, resource present (Ammo)', assert => {
        const result = _validateSeekingState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.deepEqual(result.targetCoords, { row: 1, col: 1 }, 'targetCoords should match');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.deepEqual(enemy.targetResourceCoords, { row: 1, col: 1 }, 'Enemy targetResourceCoords should remain');
    });

    QUnit.test('Target Valid: Coords exist, in bounds, resource present (Medkit)', assert => {
        enemy.targetResourceCoords = { row: 2, col: 2 };
        gameState.mapData[2][2] = TILE_MEDKIT; // Place medkit
        const result = _validateSeekingState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.deepEqual(result.targetCoords, { row: 2, col: 2 }, 'targetCoords should match');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.deepEqual(enemy.targetResourceCoords, { row: 2, col: 2 }, 'Enemy targetResourceCoords should remain');
    });

    QUnit.test('Target Invalid: targetResourceCoords is null', assert => {
        enemy.targetResourceCoords = null;
        const result = _validateSeekingState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should remain null');
    });

    QUnit.test('Target Invalid: Coords out of bounds (negative row)', assert => {
        enemy.targetResourceCoords = { row: -1, col: 1 };
        const result = _validateSeekingState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'invalid_coords', 'Reason should be invalid_coords');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });

     QUnit.test('Target Invalid: Coords out of bounds (high col)', assert => {
        enemy.targetResourceCoords = { row: 1, col: GRID_WIDTH }; // Use constant
        const result = _validateSeekingState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'invalid_coords', 'Reason should be invalid_coords');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });

    QUnit.test('Target Invalid: Resource no longer present (is land)', assert => {
        gameState.mapData[1][1] = TILE_LAND; // Resource was picked up
        const result = _validateSeekingState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'resource_gone', 'Reason should be resource_gone');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });

     QUnit.test('Target Invalid: Resource no longer present (is wall)', assert => {
        gameState.mapData[1][1] = TILE_WALL; // Tile changed to wall
        const result = _validateSeekingState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'resource_gone', 'Reason should be resource_gone');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });

});


QUnit.module('AI State: Seeking Resources (_moveOrHandleArrivalSeeking)', hooks => {
    let gameState;
    let enemy;
    let targetCoords;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects
    let originalMoveTowards;
    let originalGameLogMessage;

    // Simple call tracking for mocks
    let mockCalls = {};
    const resetMockCalls = () => { mockCalls = {}; };
    const trackMockCall = (name, ...args) => {
        if (!mockCalls[name]) mockCalls[name] = { count: 0, args: [] };
        mockCalls[name].count++;
        mockCalls[name].args.push(args);
    };

    hooks.beforeEach(() => {
        setupTestConstants();
        targetCoords = { row: 1, col: 1 };
        enemy = createMockUnit(false, {
            id: 'seeker1',
            state: AI_STATE_SEEKING_RESOURCES,
            targetResourceCoords: targetCoords,
            hp: 10, maxHp: 10,
            row: 5, col: 5 // Start away from target
        });
        gameState = createMockGameState({ enemies: [enemy] });
        gameState.mapData[targetCoords.row][targetCoords.col] = TILE_AMMO; // Ensure resource exists

        // Store originals and mock dependencies
        originalMoveTowards = window.moveTowards;
        window.moveTowards = (...args) => {
            trackMockCall('moveTowards', ...args);
            // Simulate successful move by default
            const mover = args[0];
            mover.row--; // Move closer for testing arrival later
            mover.col--;
            return true;
        };

        // Mock logger
        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        window.moveTowards = originalMoveTowards;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;
        cleanupTestConstants();
    });

    QUnit.test('Not at Target: Calls moveTowards, returns true', assert => {
        const result = _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);

        assert.true(result, 'Should return true (move action)');
        assert.equal(mockCalls['moveTowards']?.count, 1, 'moveTowards called once');
        assert.deepEqual(mockCalls['moveTowards'].args[0], [enemy, targetCoords.row, targetCoords.col, "resource", gameState], 'moveTowards called with correct args');
        assert.notEqual(enemy.row, targetCoords.row, 'Enemy row should have changed (moved)');
    });

    QUnit.test('Not at Target: moveTowards fails (blocked) -> Waits, returns true', assert => {
        window.moveTowards = (...args) => {
            trackMockCall('moveTowards', ...args);
            return false; // Simulate blocked move
        };
        const initialRow = enemy.row;
        const initialCol = enemy.col;
        const result = _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.equal(mockCalls['moveTowards']?.count, 1, 'moveTowards called once');
        assert.equal(enemy.row, initialRow, 'Enemy row should not change');
        assert.equal(enemy.col, initialCol, 'Enemy col should not change');
    });

    QUnit.test('At Target: Transitions to EXPLORING, clears target, returns true', assert => {
        enemy.row = targetCoords.row; // Place enemy at target
        enemy.col = targetCoords.col;
        const result = _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);

        assert.true(result, 'Should return true (arrival action)');
        assert.notOk(mockCalls['moveTowards'], 'moveTowards should not be called');
        assert.equal(enemy.state, AI_STATE_EXPLORING, 'Enemy state should transition to EXPLORING');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });
});
