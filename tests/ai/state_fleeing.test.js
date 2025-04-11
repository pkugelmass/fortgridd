// Tests for js/ai/state_fleeing.js

// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('AI State: Fleeing (handleFleeingState)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects to restore them later
    let originalValidateFleeState;
    let originalGetValidMoves;
    let originalHandleCorneredFleeingEnemy;
    let originalDetermineAndExecuteFleeMove;
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
        threatPlayer = createMockUnit(true, { id: 'player', row: 5, col: 8, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'fleeing1',
            state: AI_STATE_FLEEING, // Ensure correct state
            targetEnemy: threatPlayer, // Set threat
            hp: 3, maxHp: 10, // Low HP
            row: 5, col: 5,
            resources: { ammo: 5, medkits: 1 }
        });
        gameState = createMockGameState({ player: threatPlayer, enemies: [enemy] });

        // Store originals and mock dependencies/helpers
        originalValidateFleeState = window._validateFleeState;
        window._validateFleeState = (...args) => {
            trackMockCall('_validateFleeState', ...args);
            // Default mock: Validation passes, threat exists
            return { isValid: true, threatObject: threatPlayer, needsReevaluation: false, reason: null };
        };

        originalGetValidMoves = window.getValidMoves;
        window.getValidMoves = (...args) => {
            trackMockCall('getValidMoves', ...args);
            // Default mock: Has valid moves
            const e = args[0];
            return [{ row: e.row + 1, col: e.col }];
        };

        originalHandleCorneredFleeingEnemy = window._handleCorneredFleeingEnemy;
        window._handleCorneredFleeingEnemy = (...args) => {
            trackMockCall('_handleCorneredFleeingEnemy', ...args);
            return true; // Default mock: Cornered action succeeds
        };

        originalDetermineAndExecuteFleeMove = window._determineAndExecuteFleeMove;
        window._determineAndExecuteFleeMove = (...args) => {
            trackMockCall('_determineAndExecuteFleeMove', ...args);
            return true; // Default mock: Flee move succeeds
        };

        // Mock logger
        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        // Restore global functions/objects
        window._validateFleeState = originalValidateFleeState;
        window.getValidMoves = originalGetValidMoves;
        window._handleCorneredFleeingEnemy = originalHandleCorneredFleeingEnemy;
        window._determineAndExecuteFleeMove = originalDetermineAndExecuteFleeMove;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;

        cleanupTestConstants();
    });

    QUnit.test('Validation Fails -> Returns false (needs re-evaluation)', assert => {
        // Override mock: Validation fails
        window._validateFleeState = (...args) => {
            trackMockCall('_validateFleeState', ...args);
            return { isValid: false, threatObject: null, needsReevaluation: true, reason: 'test_reason' };
        };

        const result = handleFleeingState(enemy, gameState);

        assert.false(result, 'Should return false when validation fails');
        assert.equal(mockCalls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.notOk(mockCalls['getValidMoves'], 'getValidMoves should not be called');
        assert.notOk(mockCalls['_handleCorneredFleeingEnemy'], '_handleCorneredFleeingEnemy should not be called');
        assert.notOk(mockCalls['_determineAndExecuteFleeMove'], '_determineAndExecuteFleeMove should not be called');
    });

    QUnit.test('Validation OK -> Cornered (No Valid Moves) -> Calls _handleCorneredFleeingEnemy', assert => {
        // Override mock: No valid moves
        window.getValidMoves = (...args) => {
            trackMockCall('getValidMoves', ...args);
            return [];
        };
        // Ensure cornered handler returns true for this test
        window._handleCorneredFleeingEnemy = (...args) => {
            trackMockCall('_handleCorneredFleeingEnemy', ...args);
            return true;
        };

        const result = handleFleeingState(enemy, gameState);

        assert.true(result, 'Should return true (result of cornered handler)');
        assert.equal(mockCalls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.equal(mockCalls['getValidMoves']?.count, 1, 'getValidMoves called once');
        assert.equal(mockCalls['_handleCorneredFleeingEnemy']?.count, 1, '_handleCorneredFleeingEnemy called once');
        assert.deepEqual(mockCalls['_handleCorneredFleeingEnemy'].args[0], [enemy, threatPlayer, gameState], '_handleCorneredFleeingEnemy called with correct args');
        assert.notOk(mockCalls['_determineAndExecuteFleeMove'], '_determineAndExecuteFleeMove should not be called');
    });

     QUnit.test('Validation OK -> Cornered -> Cornered Handler Returns False (e.g., threat defeated)', assert => {
        // Override mock: No valid moves
        window.getValidMoves = (...args) => {
            trackMockCall('getValidMoves', ...args);
            return [];
        };
        // Override mock: Cornered handler returns false
        window._handleCorneredFleeingEnemy = (...args) => {
            trackMockCall('_handleCorneredFleeingEnemy', ...args);
            return false;
        };

        const result = handleFleeingState(enemy, gameState);

        assert.false(result, 'Should return false (result of cornered handler)');
        assert.equal(mockCalls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.equal(mockCalls['getValidMoves']?.count, 1, 'getValidMoves called once');
        assert.equal(mockCalls['_handleCorneredFleeingEnemy']?.count, 1, '_handleCorneredFleeingEnemy called once');
        assert.notOk(mockCalls['_determineAndExecuteFleeMove'], '_determineAndExecuteFleeMove should not be called');
    });

    QUnit.test('Validation OK -> Not Cornered (Has Valid Moves) -> Calls _determineAndExecuteFleeMove', assert => {
        const validMoves = [{ row: enemy.row + 1, col: enemy.col }];
        // Override mock: Has valid moves
        window.getValidMoves = (...args) => {
            trackMockCall('getValidMoves', ...args);
            return validMoves;
        };
         // Ensure flee move handler returns true for this test
         window._determineAndExecuteFleeMove = (...args) => {
             trackMockCall('_determineAndExecuteFleeMove', ...args);
             return true;
         };

        const result = handleFleeingState(enemy, gameState);

        assert.true(result, 'Should return true (result of flee move handler)');
        assert.equal(mockCalls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.equal(mockCalls['getValidMoves']?.count, 1, 'getValidMoves called once');
        assert.notOk(mockCalls['_handleCorneredFleeingEnemy'], '_handleCorneredFleeingEnemy should not be called');
        assert.equal(mockCalls['_determineAndExecuteFleeMove']?.count, 1, '_determineAndExecuteFleeMove called once');
        assert.deepEqual(mockCalls['_determineAndExecuteFleeMove'].args[0], [enemy, threatPlayer, validMoves, gameState], '_determineAndExecuteFleeMove called with correct args');
    });

});


QUnit.module('AI State: Fleeing (_validateFleeState)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    let otherEnemy;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects
    let originalHasClearLineOfSight;
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
        threatPlayer = createMockUnit(true, { id: 'player', row: 5, col: 8, hp: 10, detectionRange: 10 });
        otherEnemy = createMockUnit(false, { id: 'other1', row: 1, col: 1, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'fleeing1',
            state: AI_STATE_FLEEING,
            targetEnemy: threatPlayer, // Fleeing from player by default
            hp: 3, maxHp: 10,
            row: 5, col: 5,
            detectionRange: 10
        });
        gameState = createMockGameState({ player: threatPlayer, enemies: [enemy, otherEnemy] });

        // Store originals and mock dependencies
        originalHasClearLineOfSight = window.hasClearLineOfSight;
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // Default: Has LOS

        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        window.hasClearLineOfSight = originalHasClearLineOfSight;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;
        cleanupTestConstants();
    });

    QUnit.test('Target Valid: Player threat exists, has HP, has LOS', assert => {
        const result = _validateFleeState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.threatObject, threatPlayer, 'threatObject should be the player');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Enemy targetEnemy should remain player');
        assert.equal(mockCalls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });

    QUnit.test('Target Valid: Enemy threat exists, has HP, has LOS', assert => {
        enemy.targetEnemy = otherEnemy; // Flee from other enemy
        const result = _validateFleeState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.threatObject, otherEnemy, 'threatObject should be the other enemy');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.strictEqual(enemy.targetEnemy, otherEnemy, 'Enemy targetEnemy should remain other enemy');
        assert.equal(mockCalls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });

    QUnit.test('Target Invalid: Target is null', assert => {
        enemy.targetEnemy = null;
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should remain null');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

    QUnit.test('Target Invalid: Target player has 0 HP', assert => {
        threatPlayer.hp = 0;
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should be cleared');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

     QUnit.test('Target Invalid: Target enemy has 0 HP', assert => {
        enemy.targetEnemy = otherEnemy;
        otherEnemy.hp = 0;
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should be cleared');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

    QUnit.test('Escaped: Target valid but no LOS', assert => {
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return false; }; // Mock no LOS
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'escaped', 'Reason should be escaped');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should be cleared');
        assert.equal(mockCalls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });
});


QUnit.module('AI State: Fleeing (_determineAndExecuteFleeMove)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    let possibleMoves;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects
    let originalHasClearLineOfSight;
    let originalIsMoveSafe;
    let originalUpdateUnitPosition;
    let originalGameLogMessage;
    let originalMathRandom;

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
        threatPlayer = createMockUnit(true, { id: 'player', row: 5, col: 10, hp: 10, detectionRange: 10 });
        enemy = createMockUnit(false, {
            id: 'fleeing1',
            state: AI_STATE_FLEEING,
            targetEnemy: threatPlayer,
            hp: 3, maxHp: 10,
            row: 5, col: 5,
            detectionRange: 10
        });
        gameState = createMockGameState({ player: threatPlayer, enemies: [enemy] });
        // Default possible moves for tests
        possibleMoves = [ { row: 4, col: 5 }, { row: 6, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 6 } ];

        // Store originals and mock dependencies
        originalHasClearLineOfSight = window.hasClearLineOfSight;
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // Default: Threat has LOS to everything

        originalIsMoveSafe = window.isMoveSafe;
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // Default: All moves are safe

        originalUpdateUnitPosition = window.updateUnitPosition;
        window.updateUnitPosition = (...args) => { trackMockCall('updateUnitPosition', ...args); }; // Just track calls

        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        originalMathRandom = Math.random; // Store original Math.random

        resetMockCalls();
    });

    hooks.afterEach(() => {
        window.hasClearLineOfSight = originalHasClearLineOfSight;
        window.isMoveSafe = originalIsMoveSafe;
        window.updateUnitPosition = originalUpdateUnitPosition;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;
        Math.random = originalMathRandom; // Restore Math.random
        cleanupTestConstants();
    });

    QUnit.test('Priority 1: Chooses safe move that breaks LOS', assert => {
        const losBreakingMove = { row: 5, col: 4 }; // Assume this breaks LOS
        possibleMoves = [ { row: 6, col: 5 }, losBreakingMove ]; // Provide LOS breaking and non-breaking options
        window.hasClearLineOfSight = (viewer, target, range, gs) => {
            trackMockCall('hasClearLineOfSight', viewer, target, range, gs);
            // Threat (player) cannot see the losBreakingMove
            return !(viewer === threatPlayer && target.row === losBreakingMove.row && target.col === losBreakingMove.col);
        };
        window.isMoveSafe = (unit, r, c, gs) => { trackMockCall('isMoveSafe', unit, r, c, gs); return true; }; // All moves safe

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.ok(mockCalls['hasClearLineOfSight']?.count > 0, 'hasClearLineOfSight called');
        assert.ok(mockCalls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = mockCalls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], losBreakingMove.row, 'Chosen move row should be the LOS breaking one');
        assert.equal(chosenMoveArgs[2], losBreakingMove.col, 'Chosen move col should be the LOS breaking one');
    });

    QUnit.test('Priority 1: Chooses safest among multiple LOS-breaking moves (furthest)', assert => {
        const losBreakingMoveNear = { row: 5, col: 6 }; // Breaks LOS, dist 4 from (5,10)
        const losBreakingMoveFar = { row: 5, col: 4 }; // Breaks LOS, dist 6 from (5,10)
        possibleMoves = [ losBreakingMoveNear, losBreakingMoveFar ];
        window.hasClearLineOfSight = (viewer, target, range, gs) => {
            trackMockCall('hasClearLineOfSight', viewer, target, range, gs);
            // Threat cannot see either move
            return !(viewer === threatPlayer && (target === losBreakingMoveNear || target === losBreakingMoveFar));
        };
        window.isMoveSafe = (unit, r, c, gs) => { trackMockCall('isMoveSafe', unit, r, c, gs); return true; }; // All moves safe

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = mockCalls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], losBreakingMoveFar.row, 'Chosen move row should be the furthest LOS breaking one');
        assert.equal(chosenMoveArgs[2], losBreakingMoveFar.col, 'Chosen move col should be the furthest LOS breaking one');
    });

     QUnit.test('Priority 1: Falls back if only LOS-breaking move is unsafe', assert => {
        const losBreakingMove = { row: 5, col: 4 }; // Assume this breaks LOS
        const safeMoveAway = { row: 4, col: 5 }; // Does not break LOS, further away
        possibleMoves = [ losBreakingMove, safeMoveAway ];
        window.hasClearLineOfSight = (viewer, target, range, gs) => {
            trackMockCall('hasClearLineOfSight', viewer, target, range, gs);
            return !(viewer === threatPlayer && target === losBreakingMove); // Only losBreakingMove breaks LOS
        };
        window.isMoveSafe = (unit, r, c, gs) => {
            trackMockCall('isMoveSafe', unit, r, c, gs);
            return !(r === losBreakingMove.row && c === losBreakingMove.col); // Only losBreakingMove is unsafe
        };

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = mockCalls['updateUnitPosition'].args[0];
        // Should choose the safe move away, not the unsafe LOS breaking one
        assert.equal(chosenMoveArgs[1], safeMoveAway.row, 'Chosen move row should be the safe fallback');
        assert.equal(chosenMoveArgs[2], safeMoveAway.col, 'Chosen move col should be the safe fallback');
    });

    QUnit.test('Priority 2: Chooses safe move furthest from threat (no LOS break possible)', assert => {
        const moveNear = { row: 5, col: 6 }; // Dist 4 from (5,10)
        const moveFar = { row: 4, col: 5 }; // Dist 6 from (5,10)
        possibleMoves = [ moveNear, moveFar ];
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // Threat sees all moves
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // All moves safe

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = mockCalls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], moveFar.row, 'Chosen move row should be the furthest safe one');
        assert.equal(chosenMoveArgs[2], moveFar.col, 'Chosen move col should be the furthest safe one');
    });

    QUnit.test('Priority 2: Chooses randomly among equally distant safe moves', assert => {
        const moveFar1 = { row: 4, col: 5 }; // Dist 6
        const moveFar2 = { row: 6, col: 5 }; // Dist 6
        possibleMoves = [ moveFar1, moveFar2 ];
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // Threat sees all
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // All safe

        // Run multiple times to check randomness (though true randomness is hard to test)
        let choseMove1 = false;
        let choseMove2 = false;
        for (let i = 0; i < 10; i++) {
            resetMockCalls(); // Reset for each iteration
            _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);
            if (mockCalls['updateUnitPosition']) {
                const args = mockCalls['updateUnitPosition'].args[0];
                if (args[1] === moveFar1.row && args[2] === moveFar1.col) choseMove1 = true;
                if (args[1] === moveFar2.row && args[2] === moveFar2.col) choseMove2 = true;
            }
        }

        assert.ok(choseMove1 || choseMove2, "Should have chosen at least one of the moves over multiple runs");
        // Note: Cannot guarantee both were chosen due to randomness.
    });

    QUnit.test('Priority 2: Waits if only safe moves are closer/same distance (and no LOS break)', assert => {
        const moveCloser = { row: 5, col: 6 }; // Dist 4
        const moveSameDist = { row: 4, col: 6 }; // Dist 5
        possibleMoves = [ moveCloser, moveSameDist ];
        enemy.row = 5; enemy.col = 5; // Current dist 5
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // Threat sees all
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // All safe

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (move action, chooses same distance)');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition should be called once');
        const chosenMoveArgs = mockCalls['updateUnitPosition'].args[0];
        // It should choose the move that maintains distance (4, 6)
        assert.equal(chosenMoveArgs[1], 4, 'Chosen move row should be 4');
        assert.equal(chosenMoveArgs[2], 6, 'Chosen move col should be 6');
    });


    QUnit.test('Fallback: Waits if no safe moves away exist', assert => {
        const moveAway = { row: 4, col: 5 }; // Furthest move
        possibleMoves = [ moveAway ];
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // Threat sees all
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return false; }; // The only move away is unsafe

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.ok(mockCalls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        assert.notOk(mockCalls['updateUnitPosition'], 'updateUnitPosition should not be called');
    });
});


QUnit.module('AI State: Fleeing (_handleCorneredFleeingEnemy)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects
    let originalHasClearCardinalLineOfSight;
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
        threatPlayer = createMockUnit(true, { id: 'player', row: 5, col: 8, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'cornered1',
            state: AI_STATE_FLEEING,
            targetEnemy: threatPlayer,
            hp: 3, maxHp: 10,
            row: 5, col: 5, // Positioned for potential attack
            resources: { ammo: 5, medkits: 0 }
        });
        gameState = createMockGameState({ player: threatPlayer, enemies: [enemy] });

        // Store originals and mock dependencies
        originalHasClearCardinalLineOfSight = window.hasClearCardinalLineOfSight;
        window.hasClearCardinalLineOfSight = (...args) => { trackMockCall('hasClearCardinalLineOfSight', ...args); return true; }; // Default: Can shoot

        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        window.hasClearCardinalLineOfSight = originalHasClearCardinalLineOfSight;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;
        cleanupTestConstants();
    });

    QUnit.test('Can Ranged Attack: Attacks threat, returns true', assert => {
        const initialThreatHp = threatPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.true(result, 'Should return true (attack action)');
        assert.equal(mockCalls['hasClearCardinalLineOfSight']?.count, 1, 'hasClearCardinalLineOfSight called once');
        assert.equal(threatPlayer.hp, initialThreatHp - AI_ATTACK_DAMAGE, 'Threat HP should decrease');
        assert.equal(enemy.resources.ammo, initialAmmo - 1, 'Enemy ammo should decrease');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Target should remain');
    });

    QUnit.test('Can Melee Attack: Attacks threat, returns true', assert => {
        enemy.row = 5; enemy.col = 7; // Move adjacent
        enemy.resources.ammo = 0; // Ensure ranged isn't possible
        const initialThreatHp = threatPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.true(result, 'Should return true (attack action)');
        assert.notOk(mockCalls['hasClearCardinalLineOfSight'], 'hasClearCardinalLineOfSight should not be called for melee');
        assert.equal(threatPlayer.hp, initialThreatHp - AI_ATTACK_DAMAGE, 'Threat HP should decrease');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change for melee');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Target should remain');
    });

    QUnit.test('Cannot Attack (Out of Range/LOS/Ammo): Waits, returns true', assert => {
        enemy.row = 1; enemy.col = 1; // Move far away
        enemy.resources.ammo = 0; // No ammo
        const initialThreatHp = threatPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.notOk(mockCalls['hasClearCardinalLineOfSight'], 'hasClearCardinalLineOfSight should not be called');
        assert.equal(threatPlayer.hp, initialThreatHp, 'Threat HP should not change');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Target should remain');
    });

    QUnit.test('Attack Defeats Threat: Attacks, clears target, returns false', assert => {
        threatPlayer.hp = 1; // Low HP
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.false(result, 'Should return false (needs re-evaluation)');
        assert.equal(mockCalls['hasClearCardinalLineOfSight']?.count, 1, 'hasClearCardinalLineOfSight called once');
        assert.ok(threatPlayer.hp <= 0, 'Threat HP should be 0 or less');
        assert.equal(enemy.resources.ammo, initialAmmo - 1, 'Enemy ammo should decrease');
        assert.strictEqual(enemy.targetEnemy, null, 'Target should be cleared');
    });
});
