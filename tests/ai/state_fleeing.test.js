// Tests for js/ai/state_fleeing.js

// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('AI State: Fleeing (handleFleeingState)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    let globalMocks;
    let logMock;

    hooks.beforeEach(() => {
        setupTestConstants();
        threatPlayer = createMockUnit(true, { id: 'player', row: 5, col: 8, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'fleeing1',
            state: AI_STATE_FLEEING,
            targetEnemy: threatPlayer,
            hp: 3, maxHp: 10,
            row: 5, col: 5,
            resources: { ammo: 5, medkits: 1 }
        });
        gameState = createMockGameState({ player: threatPlayer, enemies: [enemy] });

        // Use setupGlobalMocks for all relevant global dependencies
        globalMocks = setupGlobalMocks({
            _validateFleeState: (...args) => {
                // Default: Validation passes, threat exists
                return { isValid: true, threatObject: threatPlayer, needsReevaluation: false, reason: null };
            },
            getValidMoves: (...args) => {
                // Default: Has valid moves
                const e = args[0];
                return [{ row: e.row + 1, col: e.col }];
            },
            _handleCorneredFleeingEnemy: () => true,
            _determineAndExecuteFleeMove: () => true
        });

        // Use setupLogMock for Game.logMessage
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        logMock.restore();
        cleanupTestConstants();
    });

    QUnit.test('Validation Fails -> Returns false (needs re-evaluation)', assert => {
        // Override mock: Validation fails
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateFleeState: () => ({
                isValid: false, threatObject: null, needsReevaluation: true, reason: 'test_reason'
            }),
            getValidMoves: true,
            _handleCorneredFleeingEnemy: true,
            _determineAndExecuteFleeMove: true
        });

        const result = handleFleeingState(enemy, gameState);

        assert.false(result, 'Should return false when validation fails');
        assert.equal(globalMocks.calls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.notOk(globalMocks.calls['getValidMoves'], 'getValidMoves should not be called');
        assert.notOk(globalMocks.calls['_handleCorneredFleeingEnemy'], '_handleCorneredFleeingEnemy should not be called');
        assert.notOk(globalMocks.calls['_determineAndExecuteFleeMove'], '_determineAndExecuteFleeMove should not be called');
    });

    QUnit.test('Validation OK -> Cornered (No Valid Moves) -> Calls _handleCorneredFleeingEnemy', assert => {
        // Override mock: No valid moves, cornered handler returns true
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateFleeState: (...args) => ({
                isValid: true, threatObject: threatPlayer, needsReevaluation: false, reason: null
            }),
            getValidMoves: () => [],
            _handleCorneredFleeingEnemy: (...args) => true,
            _determineAndExecuteFleeMove: true
        });

        const result = handleFleeingState(enemy, gameState);

        assert.true(result, 'Should return true (result of cornered handler)');
        assert.equal(globalMocks.calls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.equal(globalMocks.calls['getValidMoves']?.count, 1, 'getValidMoves called once');
        assert.equal(globalMocks.calls['_handleCorneredFleeingEnemy']?.count, 1, '_handleCorneredFleeingEnemy called once');
        assert.deepEqual(globalMocks.calls['_handleCorneredFleeingEnemy'].args[0], [enemy, threatPlayer, gameState], '_handleCorneredFleeingEnemy called with correct args');
        assert.notOk(globalMocks.calls['_determineAndExecuteFleeMove'], '_determineAndExecuteFleeMove should not be called');
    });

    QUnit.test('Validation OK -> Cornered -> Cornered Handler Returns False (e.g., threat defeated)', assert => {
        // Override mock: No valid moves, cornered handler returns false
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateFleeState: (...args) => ({
                isValid: true, threatObject: threatPlayer, needsReevaluation: false, reason: null
            }),
            getValidMoves: () => [],
            _handleCorneredFleeingEnemy: () => false,
            _determineAndExecuteFleeMove: true
        });

        const result = handleFleeingState(enemy, gameState);

        assert.false(result, 'Should return false (result of cornered handler)');
        assert.equal(globalMocks.calls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.equal(globalMocks.calls['getValidMoves']?.count, 1, 'getValidMoves called once');
        assert.equal(globalMocks.calls['_handleCorneredFleeingEnemy']?.count, 1, '_handleCorneredFleeingEnemy called once');
        assert.notOk(globalMocks.calls['_determineAndExecuteFleeMove'], '_determineAndExecuteFleeMove should not be called');
    });

    QUnit.test('Validation OK -> Not Cornered (Has Valid Moves) -> Calls _determineAndExecuteFleeMove', assert => {
        const validMoves = [{ row: enemy.row + 1, col: enemy.col }];
        // Override mock: Has valid moves, flee move handler returns true
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateFleeState: (...args) => ({
                isValid: true, threatObject: threatPlayer, needsReevaluation: false, reason: null
            }),
            getValidMoves: () => validMoves,
            _handleCorneredFleeingEnemy: true,
            _determineAndExecuteFleeMove: (...args) => true
        });

        const result = handleFleeingState(enemy, gameState);

        assert.true(result, 'Should return true (result of flee move handler)');
        assert.equal(globalMocks.calls['_validateFleeState']?.count, 1, '_validateFleeState called once');
        assert.equal(globalMocks.calls['getValidMoves']?.count, 1, 'getValidMoves called once');
        assert.notOk(globalMocks.calls['_handleCorneredFleeingEnemy'], '_handleCorneredFleeingEnemy should not be called');
        assert.equal(globalMocks.calls['_determineAndExecuteFleeMove']?.count, 1, '_determineAndExecuteFleeMove called once');
        assert.deepEqual(globalMocks.calls['_determineAndExecuteFleeMove'].args[0], [enemy, threatPlayer, validMoves, gameState], '_determineAndExecuteFleeMove called with correct args');
    });
});


QUnit.module('AI State: Fleeing (_validateFleeState)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    let otherEnemy;
    let globalMocks;
    let logMock;

    hooks.beforeEach(() => {
        setupTestConstants();
        threatPlayer = createMockUnit(true, { id: 'player', row: 5, col: 8, hp: 10, detectionRange: 10 });
        otherEnemy = createMockUnit(false, { id: 'other1', row: 1, col: 1, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'fleeing1',
            state: AI_STATE_FLEEING,
            targetEnemy: threatPlayer,
            hp: 3, maxHp: 10,
            row: 5, col: 5,
            detectionRange: 10
        });
        gameState = createMockGameState({ player: threatPlayer, enemies: [enemy, otherEnemy] });

        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (...args) => true
        });
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        logMock.restore();
        cleanupTestConstants();
    });

    QUnit.test('Target Valid: Player threat exists, has HP, has LOS', assert => {
        const result = _validateFleeState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.threatObject, threatPlayer, 'threatObject should be the player');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Enemy targetEnemy should remain player');
        assert.equal(globalMocks.calls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });

    QUnit.test('Target Valid: Enemy threat exists, has HP, has LOS', assert => {
        enemy.targetEnemy = otherEnemy;
        const result = _validateFleeState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.threatObject, otherEnemy, 'threatObject should be the other enemy');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.strictEqual(enemy.targetEnemy, otherEnemy, 'Enemy targetEnemy should remain other enemy');
        assert.equal(globalMocks.calls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });

    QUnit.test('Target Invalid: Target is null', assert => {
        enemy.targetEnemy = null;
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should remain null');
        assert.notOk(globalMocks.calls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

    QUnit.test('Target Invalid: Target player has 0 HP', assert => {
        threatPlayer.hp = 0;
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should be cleared');
        assert.notOk(globalMocks.calls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

    QUnit.test('Target Invalid: Target enemy has 0 HP', assert => {
        enemy.targetEnemy = otherEnemy;
        otherEnemy.hp = 0;
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should be cleared');
        assert.notOk(globalMocks.calls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

    QUnit.test('Escaped: Target valid but no LOS', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (...args) => false
        });
        const result = _validateFleeState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'escaped', 'Reason should be escaped');
        assert.strictEqual(enemy.targetEnemy, null, 'Enemy targetEnemy should be cleared');
        assert.equal(globalMocks.calls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });
});


QUnit.module('AI State: Fleeing (_determineAndExecuteFleeMove)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    let possibleMoves;
    let globalMocks;
    let logMock;

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
        possibleMoves = [ { row: 4, col: 5 }, { row: 6, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 6 } ];

        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (...args) => true,
            isMoveSafe: (...args) => true,
            updateUnitPosition: (...args) => {}
        });
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        logMock.restore();
        cleanupTestConstants();
    });

    QUnit.test('Priority 1: Chooses safe move that breaks LOS', assert => {
        const losBreakingMove = { row: 5, col: 4 };
        possibleMoves = [ { row: 6, col: 5 }, losBreakingMove ];
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (viewer, target, range, gs) => {
                return !(viewer === threatPlayer && target.row === losBreakingMove.row && target.col === losBreakingMove.col);
            },
            isMoveSafe: (unit, r, c, gs) => true,
            updateUnitPosition: (...args) => {}
        });

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.ok(globalMocks.calls['hasClearLineOfSight']?.count > 0, 'hasClearLineOfSight called');
        assert.ok(globalMocks.calls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        assert.equal(globalMocks.calls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = globalMocks.calls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], losBreakingMove.row, 'Chosen move row should be the LOS breaking one');
        assert.equal(chosenMoveArgs[2], losBreakingMove.col, 'Chosen move col should be the LOS breaking one');
    });

    QUnit.test('Priority 1: Chooses safest among multiple LOS-breaking moves (furthest)', assert => {
        const losBreakingMoveNear = { row: 5, col: 6 };
        const losBreakingMoveFar = { row: 5, col: 4 };
        possibleMoves = [ losBreakingMoveNear, losBreakingMoveFar ];
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (viewer, target, range, gs) => {
                return !(viewer === threatPlayer && (target === losBreakingMoveNear || target === losBreakingMoveFar));
            },
            isMoveSafe: (unit, r, c, gs) => true,
            updateUnitPosition: (...args) => {}
        });

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.equal(globalMocks.calls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = globalMocks.calls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], losBreakingMoveFar.row, 'Chosen move row should be the furthest LOS breaking one');
        assert.equal(chosenMoveArgs[2], losBreakingMoveFar.col, 'Chosen move col should be the furthest LOS breaking one');
    });

    QUnit.test('Priority 1: Falls back if only LOS-breaking move is unsafe', assert => {
        const losBreakingMove = { row: 5, col: 4 };
        const safeMoveAway = { row: 4, col: 5 };
        possibleMoves = [ losBreakingMove, safeMoveAway ];
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (viewer, target, range, gs) => {
                return !(viewer === threatPlayer && target === losBreakingMove);
            },
            isMoveSafe: (unit, r, c, gs) => !(r === losBreakingMove.row && c === losBreakingMove.col),
            updateUnitPosition: (...args) => {}
        });

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.equal(globalMocks.calls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = globalMocks.calls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], safeMoveAway.row, 'Chosen move row should be the safe fallback');
        assert.equal(chosenMoveArgs[2], safeMoveAway.col, 'Chosen move col should be the safe fallback');
    });

    QUnit.test('Priority 2: Chooses safe move furthest from threat (no LOS break possible)', assert => {
        const moveNear = { row: 5, col: 6 };
        const moveFar = { row: 4, col: 5 };
        possibleMoves = [ moveNear, moveFar ];
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (...args) => true,
            isMoveSafe: (...args) => true,
            updateUnitPosition: (...args) => {}
        });

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (action taken)');
        assert.equal(globalMocks.calls['updateUnitPosition']?.count, 1, 'updateUnitPosition called once');
        const chosenMoveArgs = globalMocks.calls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], moveFar.row, 'Chosen move row should be the furthest safe one');
        assert.equal(chosenMoveArgs[2], moveFar.col, 'Chosen move col should be the furthest safe one');
    });

    QUnit.test('Priority 2: Chooses randomly among equally distant safe moves', assert => {
        const moveFar1 = { row: 4, col: 5 };
        const moveFar2 = { row: 6, col: 5 };
        possibleMoves = [ moveFar1, moveFar2 ];
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (...args) => true,
            isMoveSafe: (...args) => true,
            updateUnitPosition: (...args) => {}
        });

        // Run multiple times to check randomness (though true randomness is hard to test)
        let choseMove1 = false;
        let choseMove2 = false;
        for (let i = 0; i < 10; i++) {
            globalMocks.calls['updateUnitPosition'] = undefined;
            _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);
            if (globalMocks.calls['updateUnitPosition']) {
                const args = globalMocks.calls['updateUnitPosition'].args[0];
                if (args[1] === moveFar1.row && args[2] === moveFar1.col) choseMove1 = true;
                if (args[1] === moveFar2.row && args[2] === moveFar2.col) choseMove2 = true;
            }
        }

        assert.ok(choseMove1 || choseMove2, "Should have chosen at least one of the moves over multiple runs");
        // Note: Cannot guarantee both were chosen due to randomness.
    });

    QUnit.test('Priority 2: Waits if only safe moves are closer/same distance (and no LOS break)', assert => {
        const moveCloser = { row: 5, col: 6 };
        const moveSameDist = { row: 4, col: 6 };
        possibleMoves = [ moveCloser, moveSameDist ];
        enemy.row = 5; enemy.col = 5;
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (...args) => true,
            isMoveSafe: (...args) => true,
            updateUnitPosition: (...args) => {}
        });

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (move action, chooses same distance)');
        assert.equal(globalMocks.calls['updateUnitPosition']?.count, 1, 'updateUnitPosition should be called once');
        const chosenMoveArgs = globalMocks.calls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], 4, 'Chosen move row should be 4');
        assert.equal(chosenMoveArgs[2], 6, 'Chosen move col should be 6');
    });

    QUnit.test('Fallback: Waits if no safe moves away exist', assert => {
        const moveAway = { row: 4, col: 5 };
        possibleMoves = [ moveAway ];
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: (...args) => true,
            isMoveSafe: (...args) => false,
            updateUnitPosition: (...args) => {}
        });

        const result = _determineAndExecuteFleeMove(enemy, threatPlayer, possibleMoves, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.ok(globalMocks.calls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        assert.notOk(globalMocks.calls['updateUnitPosition'], 'updateUnitPosition should not be called');
    });
});


QUnit.module('AI State: Fleeing (_handleCorneredFleeingEnemy)', hooks => {
    let gameState;
    let enemy;
    let threatPlayer;
    let globalMocks;
    let logMock;

    hooks.beforeEach(() => {
        setupTestConstants();
        threatPlayer = createMockUnit(true, { id: 'player', row: 5, col: 8, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'cornered1',
            state: AI_STATE_FLEEING,
            targetEnemy: threatPlayer,
            hp: 3, maxHp: 10,
            row: 5, col: 5,
            resources: { ammo: 5, medkits: 0 }
        });
        gameState = createMockGameState({ player: threatPlayer, enemies: [enemy] });

        globalMocks = setupGlobalMocks({
            hasClearCardinalLineOfSight: (...args) => true
        });
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        logMock.restore();
        cleanupTestConstants();
    });

    QUnit.test('Can Ranged Attack: Attacks threat, returns true', assert => {
        const initialThreatHp = threatPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.true(result, 'Should return true (attack action)');
        assert.equal(globalMocks.calls['hasClearCardinalLineOfSight']?.count, 1, 'hasClearCardinalLineOfSight called once');
        assert.equal(threatPlayer.hp, initialThreatHp - AI_ATTACK_DAMAGE, 'Threat HP should decrease');
        assert.equal(enemy.resources.ammo, initialAmmo - 1, 'Enemy ammo should decrease');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Target should remain');
    });

    QUnit.test('Can Melee Attack: Attacks threat, returns true', assert => {
        enemy.row = 5; enemy.col = 7;
        enemy.resources.ammo = 0;
        const initialThreatHp = threatPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.true(result, 'Should return true (attack action)');
        assert.notOk(globalMocks.calls['hasClearCardinalLineOfSight'], 'hasClearCardinalLineOfSight should not be called for melee');
        assert.equal(threatPlayer.hp, initialThreatHp - AI_ATTACK_DAMAGE, 'Threat HP should decrease');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change for melee');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Target should remain');
    });

    QUnit.test('Cannot Attack (Out of Range/LOS/Ammo): Waits, returns true', assert => {
        enemy.row = 1; enemy.col = 1;
        enemy.resources.ammo = 0;
        const initialThreatHp = threatPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.notOk(globalMocks.calls['hasClearCardinalLineOfSight'], 'hasClearCardinalLineOfSight should not be called');
        assert.equal(threatPlayer.hp, initialThreatHp, 'Threat HP should not change');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change');
        assert.strictEqual(enemy.targetEnemy, threatPlayer, 'Target should remain');
    });

    QUnit.test('Attack Defeats Threat: Attacks, clears target, returns false', assert => {
        threatPlayer.hp = 1;
        const initialAmmo = enemy.resources.ammo;
        const result = _handleCorneredFleeingEnemy(enemy, threatPlayer, gameState);

        assert.false(result, 'Should return false (needs re-evaluation)');
        assert.equal(globalMocks.calls['hasClearCardinalLineOfSight']?.count, 1, 'hasClearCardinalLineOfSight called once');
        assert.ok(threatPlayer.hp <= 0, 'Threat HP should be 0 or less');
        assert.equal(enemy.resources.ammo, initialAmmo - 1, 'Enemy ammo should decrease');
        assert.strictEqual(enemy.targetEnemy, null, 'Target should be cleared');
    });
});
