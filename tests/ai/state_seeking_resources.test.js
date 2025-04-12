// Tests for js/ai/state_seeking_resources.js
//
// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('AI State: Seeking Resources (handleSeekingResourcesState)', hooks => {
    let gameState;
    let enemy;
    let targetCoords;
    let globalMocks;
    let logMock;

    hooks.beforeEach(() => {
        setupTestConstants();
        targetCoords = { row: 1, col: 1 };
        enemy = createMockUnit(false, {
            id: 'seeker1',
            state: AI_STATE_SEEKING_RESOURCES,
            targetResourceCoords: targetCoords,
            hp: 10, maxHp: 10,
            row: 5, col: 5,
            resources: { ammo: 1, medkits: 0 }
        });
        gameState = createMockGameState({ enemies: [enemy] });
        if (gameState.mapData[targetCoords.row]) {
            gameState.mapData[targetCoords.row][targetCoords.col] = TILE_AMMO;
        }

        globalMocks = setupGlobalMocks({
            _validateSeekingState: (...args) => ({
                isValid: true, targetCoords: targetCoords, needsReevaluation: false, reason: null
            }),
            _moveOrHandleArrivalSeeking: (...args) => true
        });
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        logMock.restore();
        cleanupTestConstants();
    });

    QUnit.test('Validation Fails -> Returns false (needs re-evaluation)', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateSeekingState: (...args) => ({
                isValid: false, targetCoords: null, needsReevaluation: true, reason: 'test_reason'
            }),
            _moveOrHandleArrivalSeeking: (...args) => true
        });

        const result = handleSeekingResourcesState(enemy, gameState);

        assert.false(result, 'Should return false when validation fails');
        assert.equal(globalMocks.calls['_validateSeekingState']?.count, 1, '_validateSeekingState called once');
        assert.notOk(globalMocks.calls['_moveOrHandleArrivalSeeking'], '_moveOrHandleArrivalSeeking should not be called');
    });

    QUnit.test('Validation OK -> Calls _moveOrHandleArrivalSeeking', assert => {
        let callArgs = null;
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateSeekingState: (...args) => ({
                isValid: true, targetCoords: targetCoords, needsReevaluation: false, reason: null
            }),
            _moveOrHandleArrivalSeeking: (...args) => {
                callArgs = args;
                return true;
            }
        });

        const result = handleSeekingResourcesState(enemy, gameState);

        assert.true(result, 'Should return true (result of move/arrival handler)');
        assert.equal(globalMocks.calls['_validateSeekingState']?.count, 1, '_validateSeekingState called once');
        assert.equal(globalMocks.calls['_moveOrHandleArrivalSeeking']?.count, 1, '_moveOrHandleArrivalSeeking called once');
        assert.deepEqual(callArgs, [enemy, targetCoords, gameState], '_moveOrHandleArrivalSeeking called with correct args');
    });

    QUnit.test('Validation OK -> Move/Arrival Handler Returns False', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateSeekingState: (...args) => ({
                isValid: true, targetCoords: targetCoords, needsReevaluation: false, reason: null
            }),
            _moveOrHandleArrivalSeeking: (...args) => false
        });

        const result = handleSeekingResourcesState(enemy, gameState);

        assert.false(result, 'Should return false (result of move/arrival handler)');
        assert.equal(globalMocks.calls['_validateSeekingState']?.count, 1, '_validateSeekingState called once');
        assert.equal(globalMocks.calls['_moveOrHandleArrivalSeeking']?.count, 1, '_moveOrHandleArrivalSeeking called once');
    });
});


QUnit.module('AI State: Seeking Resources (_validateSeekingState)', hooks => {
    let gameState;
    let enemy;
    let logMock;

    hooks.beforeEach(() => {
        setupTestConstants();
        enemy = createMockUnit(false, {
            id: 'seeker1',
            state: AI_STATE_SEEKING_RESOURCES,
            targetResourceCoords: { row: 1, col: 1 },
            row: 5, col: 5
        });
        gameState = createMockGameState({ enemies: [enemy] });
        gameState.mapData[1][1] = TILE_AMMO;
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        logMock.restore();
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
        gameState.mapData[2][2] = TILE_MEDKIT;
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
        enemy.targetResourceCoords = { row: 1, col: GRID_WIDTH };
        const result = _validateSeekingState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'invalid_coords', 'Reason should be invalid_coords');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });

    QUnit.test('Target Invalid: Resource no longer present (is land)', assert => {
        gameState.mapData[1][1] = TILE_LAND;
        const result = _validateSeekingState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'resource_gone', 'Reason should be resource_gone');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });

    QUnit.test('Target Invalid: Resource no longer present (is wall)', assert => {
        gameState.mapData[1][1] = TILE_WALL;
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
    let globalMocks;
    let logMock;

    hooks.beforeEach(() => {
        setupTestConstants();
        targetCoords = { row: 1, col: 1 };
        enemy = createMockUnit(false, {
            id: 'seeker1',
            state: AI_STATE_SEEKING_RESOURCES,
            targetResourceCoords: targetCoords,
            hp: 10, maxHp: 10,
            row: 5, col: 5
        });
        gameState = createMockGameState({ enemies: [enemy] });
        gameState.mapData[targetCoords.row][targetCoords.col] = TILE_AMMO;

        globalMocks = setupGlobalMocks({
            moveTowards: (...args) => {
                // Simulate successful move by default
                const mover = args[0];
                mover.row--; // Move closer for testing arrival later
                mover.col--;
                return true;
            }
        });
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        logMock.restore();
        cleanupTestConstants();
    });

    QUnit.test('Not at Target: Calls moveTowards, returns true', assert => {
        let callArgs = null;
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            moveTowards: (...args) => {
                callArgs = args;
                const mover = args[0];
                mover.row--;
                mover.col--;
                return true;
            }
        });

        const result = _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);

        assert.true(result, 'Should return true (move action)');
        assert.equal(globalMocks.calls['moveTowards']?.count, 1, 'moveTowards called once');
        assert.deepEqual(callArgs, [enemy, targetCoords.row, targetCoords.col, "resource", gameState], 'moveTowards called with correct args');
        assert.notEqual(enemy.row, targetCoords.row, 'Enemy row should have changed (moved)');
    });

    QUnit.test('Not at Target: moveTowards fails (blocked) -> Waits, returns true', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            moveTowards: (...args) => false
        });
        const initialRow = enemy.row;
        const initialCol = enemy.col;
        const result = _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.equal(globalMocks.calls['moveTowards']?.count, 1, 'moveTowards called once');
        assert.equal(enemy.row, initialRow, 'Enemy row should not change');
        assert.equal(enemy.col, initialCol, 'Enemy col should not change');
    });

    QUnit.test('At Target: Transitions to EXPLORING, clears target, returns true', assert => {
        enemy.row = targetCoords.row;
        enemy.col = targetCoords.col;
        const result = _moveOrHandleArrivalSeeking(enemy, targetCoords, gameState);

        assert.true(result, 'Should return true (arrival action)');
        assert.notOk(globalMocks.calls['moveTowards'], 'moveTowards should not be called');
        assert.equal(enemy.state, AI_STATE_EXPLORING, 'Enemy state should transition to EXPLORING');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Enemy targetResourceCoords should be cleared');
    });
});
