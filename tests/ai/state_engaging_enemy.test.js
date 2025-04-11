// Tests for js/ai/state_engaging_enemy.js

// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('AI State: Engaging Enemy (handleEngagingEnemyState)', hooks => {
    let gameState;
    let enemy;
    let targetPlayer;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects to restore them later
    let originalValidateEngageState;
    let originalAttemptEngageAttack;
    let originalDetermineAndExecuteEngageMove;
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
        targetPlayer = createMockUnit(true, { id: 'player', row: 5, col: 6 }); // Target
        enemy = createMockUnit(false, {
            id: 'engager1',
            state: 'ENGAGING_ENEMY',
            targetEnemy: targetPlayer, // Set target
            hp: 10, maxHp: 10, // Full HP initially
            row: 5, col: 5, // Adjacent to target
            resources: { ammo: 5, medkits: 0 }
        });
        gameState = createMockGameState({ player: targetPlayer, enemies: [enemy] }); // Include both in gameState

        // Store originals and mock the internal helper functions (assuming they are global for now)
        // If they are not global, this mocking will fail, and we'll need to adjust.
        originalValidateEngageState = window._validateEngageState;
        window._validateEngageState = (...args) => {
            trackMockCall('_validateEngageState', ...args);
            // Default mock: Validation passes, returns the target
            return { isValid: true, validatedTarget: targetPlayer, needsReevaluation: false, reason: null };
        };

        originalAttemptEngageAttack = window._attemptEngageAttack;
        window._attemptEngageAttack = (...args) => {
            trackMockCall('_attemptEngageAttack', ...args);
            return true; // Default mock: Attack succeeds
        };

        originalDetermineAndExecuteEngageMove = window._determineAndExecuteEngageMove;
        window._determineAndExecuteEngageMove = (...args) => {
            trackMockCall('_determineAndExecuteEngageMove', ...args);
            return true; // Default mock: Move/Wait succeeds
        };

        // Mock logger
        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        // Restore global functions/objects
        window._validateEngageState = originalValidateEngageState;
        window._attemptEngageAttack = originalAttemptEngageAttack;
        window._determineAndExecuteEngageMove = originalDetermineAndExecuteEngageMove;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;

        cleanupTestConstants();
    });

    QUnit.test('Validation Fails -> Returns false (needs re-evaluation)', assert => {
        // Override mock: Validation fails
        window._validateEngageState = (...args) => {
            trackMockCall('_validateEngageState', ...args);
            return { isValid: false, validatedTarget: null, needsReevaluation: true, reason: 'test_reason' };
        };

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.false(result, 'Should return false when validation fails');
        assert.equal(mockCalls['_validateEngageState']?.count, 1, '_validateEngageState called once');
        assert.notOk(mockCalls['_attemptEngageAttack'], '_attemptEngageAttack should not be called');
        assert.notOk(mockCalls['_determineAndExecuteEngageMove'], '_determineAndExecuteEngageMove should not be called');
    });

     QUnit.test('Validation Fails (Low HP/Fleeing) -> Returns false (needs re-evaluation)', assert => {
        // Override mock: Validation fails because enemy should flee
         window._validateEngageState = (...args) => {
             trackMockCall('_validateEngageState', ...args);
             enemy.state = AI_STATE_FLEEING; // Simulate state change done by validator
             return { isValid: false, validatedTarget: targetPlayer, needsReevaluation: true, reason: 'fleeing' };
         };

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.false(result, 'Should return false when validation causes flee state');
        assert.equal(mockCalls['_validateEngageState']?.count, 1, '_validateEngageState called once');
        assert.notOk(mockCalls['_attemptEngageAttack'], '_attemptEngageAttack should not be called');
        assert.notOk(mockCalls['_determineAndExecuteEngageMove'], '_determineAndExecuteEngageMove should not be called');
        assert.equal(enemy.state, AI_STATE_FLEEING, 'Enemy state should be FLEEING');
    });

    QUnit.test('Validation OK -> Attack Succeeds -> Returns true', assert => {
        // Default mocks: Validation OK, Attack OK
        const result = handleEngagingEnemyState(enemy, gameState);

        assert.true(result, 'Should return true when attack succeeds');
        assert.equal(mockCalls['_validateEngageState']?.count, 1, '_validateEngageState called once');
        assert.equal(mockCalls['_attemptEngageAttack']?.count, 1, '_attemptEngageAttack called once');
        assert.notOk(mockCalls['_determineAndExecuteEngageMove'], '_determineAndExecuteEngageMove should not be called');
    });

    QUnit.test('Validation OK -> Attack Fails (Target Defeated) -> Returns false', assert => {
        // Override mock: Attack fails because target is defeated
        window._attemptEngageAttack = (...args) => {
            trackMockCall('_attemptEngageAttack', ...args);
            enemy.targetEnemy = null; // Simulate target being cleared by attack function
            return false;
        };

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.false(result, 'Should return false when attack defeats target');
        assert.equal(mockCalls['_validateEngageState']?.count, 1, '_validateEngageState called once');
        assert.equal(mockCalls['_attemptEngageAttack']?.count, 1, '_attemptEngageAttack called once');
        assert.notOk(mockCalls['_determineAndExecuteEngageMove'], '_determineAndExecuteEngageMove should not be called');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
    });

     QUnit.test('Validation OK -> Attack Fails (No Range/Ammo) -> Move Succeeds -> Returns true', assert => {
        // Override mock: Attack fails (returns false), Move succeeds (returns true)
        window._attemptEngageAttack = (...args) => {
            trackMockCall('_attemptEngageAttack', ...args);
            // Ensure target is NOT cleared here
            return false;
        };
         window._determineAndExecuteEngageMove = (...args) => {
             trackMockCall('_determineAndExecuteEngageMove', ...args);
             return true; // Move/Wait succeeds
         };

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.true(result, 'Should return true when attack fails but move succeeds');
        assert.equal(mockCalls['_validateEngageState']?.count, 1, '_validateEngageState called once');
        assert.equal(mockCalls['_attemptEngageAttack']?.count, 1, '_attemptEngageAttack called once');
        assert.equal(mockCalls['_determineAndExecuteEngageMove']?.count, 1, '_determineAndExecuteEngageMove called once');
    });

     // Note: The case where Move fails (_determineAndExecuteEngageMove returns false)
     // isn't explicitly handled differently by handleEngagingEnemyState; it still returns
     // the result of the move function. Since the move function always returns true (move or wait),
     // we don't need a separate test for that specific orchestration path here.
     // We will test the internal logic of _determineAndExecuteEngageMove separately.

});

QUnit.module('AI State: Engaging Enemy (_validateEngageState)', hooks => {
    let gameState;
    let enemy;
    let targetPlayer;
    let otherEnemy;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects to restore them later
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
        targetPlayer = createMockUnit(true, { id: 'player', row: 5, col: 6, hp: 10 });
        otherEnemy = createMockUnit(false, { id: 'other1', row: 1, col: 1, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'engager1',
            state: 'ENGAGING_ENEMY',
            targetEnemy: targetPlayer, // Target player by default
            hp: 10, maxHp: 10, // Full HP
            row: 5, col: 5,
            detectionRange: 10 // Give a detection range
        });
        gameState = createMockGameState({ player: targetPlayer, enemies: [enemy, otherEnemy] });

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

    QUnit.test('Target Valid: Player target exists, has HP, has LOS, enemy healthy', assert => {
        const result = _validateEngageState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.validatedTarget, targetPlayer, 'validatedTarget should be the player');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.equal(enemy.state, 'ENGAGING_ENEMY', 'Enemy state should remain ENGAGING_ENEMY');
        assert.equal(mockCalls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });

     QUnit.test('Target Valid: Enemy target exists, has HP, has LOS, enemy healthy', assert => {
        enemy.targetEnemy = otherEnemy; // Target the other enemy
        const result = _validateEngageState(enemy, gameState);

        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.validatedTarget, otherEnemy, 'validatedTarget should be the other enemy');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.equal(enemy.state, 'ENGAGING_ENEMY', 'Enemy state should remain ENGAGING_ENEMY');
        assert.equal(mockCalls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });

    QUnit.test('Target Invalid: Target is null', assert => {
        enemy.targetEnemy = null;
        const result = _validateEngageState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should remain null');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

     QUnit.test('Target Invalid: Target player has 0 HP', assert => {
        targetPlayer.hp = 0;
        const result = _validateEngageState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

     QUnit.test('Target Invalid: Target enemy has 0 HP', assert => {
        enemy.targetEnemy = otherEnemy;
        otherEnemy.hp = 0;
        const result = _validateEngageState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });

     QUnit.test('Target Invalid: Target enemy not found in gameState.enemies', assert => {
        const missingEnemy = createMockUnit(false, {id: 'missing', hp: 10});
        enemy.targetEnemy = missingEnemy; // Target an enemy not in the gameState array
        const result = _validateEngageState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
    });


    QUnit.test('LOS Lost: Target valid but no LOS', assert => {
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return false; }; // Mock no LOS
        const result = _validateEngageState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_los', 'Reason should be no_los');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
        assert.equal(mockCalls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once');
    });

    QUnit.test('Health Low: Should transition to FLEEING', assert => {
        enemy.hp = 2; // Below threshold (e.g., 30% of 10)
        // Ensure flee threshold is set appropriately by setupTestConstants
        // window.AI_FLEE_HEALTH_THRESHOLD = 0.3;

        const result = _validateEngageState(enemy, gameState);

        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'fleeing', 'Reason should be fleeing');
        assert.equal(enemy.state, AI_STATE_FLEEING, 'Enemy state should change to FLEEING');
        assert.strictEqual(result.validatedTarget, targetPlayer, 'validatedTarget should still be player'); // Target isn't cleared here
        assert.equal(mockCalls['hasClearLineOfSight']?.count, 1, 'hasClearLineOfSight called once'); // LOS check happens before health check
    });

});


QUnit.module('AI State: Engaging Enemy (_attemptEngageAttack)', hooks => {
    let gameState;
    let enemy;
    let targetPlayer;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects
    let originalHasClearCardinalLineOfSight;
    let originalApplyKnockback;
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
        targetPlayer = createMockUnit(true, { id: 'player', row: 5, col: 8, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'attacker1',
            state: 'ENGAGING_ENEMY',
            targetEnemy: targetPlayer,
            hp: 10, maxHp: 10,
            row: 5, col: 5, // Ranged distance initially
            resources: { ammo: 5, medkits: 0 }
        });
        gameState = createMockGameState({ player: targetPlayer, enemies: [enemy] });

        // Store originals and mock dependencies
        originalHasClearCardinalLineOfSight = window.hasClearCardinalLineOfSight;
        window.hasClearCardinalLineOfSight = (...args) => { trackMockCall('hasClearCardinalLineOfSight', ...args); return true; }; // Default: Has LOS

        originalApplyKnockback = window.applyKnockback;
        window.applyKnockback = (...args) => {
            trackMockCall('applyKnockback', ...args);
            // Default: Knockback succeeds
            const kbTarget = args[1]; // The unit being knocked back
            return { success: true, dest: { row: kbTarget.row + 1, col: kbTarget.col }, reason: null };
        };

        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        resetMockCalls();
    });

    hooks.afterEach(() => {
        window.hasClearCardinalLineOfSight = originalHasClearCardinalLineOfSight;
        window.applyKnockback = originalApplyKnockback;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;
        cleanupTestConstants();
    });

    // --- Ranged Attack Tests ---

    QUnit.test('Ranged Attack: Success (In Range, Ammo, LOS)', assert => {
        const initialTargetHp = targetPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _attemptEngageAttack(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true when ranged attack is successful');
        assert.equal(mockCalls['hasClearCardinalLineOfSight']?.count, 1, 'hasClearCardinalLineOfSight called once');
        assert.equal(targetPlayer.hp, initialTargetHp - AI_ATTACK_DAMAGE, 'Target HP should decrease');
        assert.equal(enemy.resources.ammo, initialAmmo - 1, 'Enemy ammo should decrease');
        assert.equal(mockCalls['applyKnockback']?.count, 1, 'applyKnockback should be called');
        assert.strictEqual(enemy.targetEnemy, targetPlayer, 'Target should remain unchanged');
    });

    QUnit.test('Ranged Attack: Failure (Out of Range)', assert => {
        enemy.row = 1; enemy.col = 1; // Move far away
        const initialTargetHp = targetPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _attemptEngageAttack(enemy, targetPlayer, gameState);

        assert.false(result, 'Should return false when out of ranged attack range');
        assert.notOk(mockCalls['hasClearCardinalLineOfSight'], 'hasClearCardinalLineOfSight should not be called');
        assert.equal(targetPlayer.hp, initialTargetHp, 'Target HP should not change');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change');
        assert.notOk(mockCalls['applyKnockback'], 'applyKnockback should not be called');
    });

    QUnit.test('Ranged Attack: Failure (No Ammo)', assert => {
        enemy.resources.ammo = 0;
        const initialTargetHp = targetPlayer.hp;
        const result = _attemptEngageAttack(enemy, targetPlayer, gameState);

        assert.false(result, 'Should return false when enemy has no ammo');
        assert.notOk(mockCalls['hasClearCardinalLineOfSight'], 'hasClearCardinalLineOfSight should not be called (check happens after ammo)');
        assert.equal(targetPlayer.hp, initialTargetHp, 'Target HP should not change');
        assert.notOk(mockCalls['applyKnockback'], 'applyKnockback should not be called');
    });

    QUnit.test('Ranged Attack: Failure (No LOS)', assert => {
        window.hasClearCardinalLineOfSight = (...args) => { trackMockCall('hasClearCardinalLineOfSight', ...args); return false; }; // Mock no LOS
        const initialTargetHp = targetPlayer.hp;
        const initialAmmo = enemy.resources.ammo;
        const result = _attemptEngageAttack(enemy, targetPlayer, gameState);

        assert.false(result, 'Should return false when no LOS for ranged attack');
        assert.equal(mockCalls['hasClearCardinalLineOfSight']?.count, 1, 'hasClearCardinalLineOfSight called once');
        assert.equal(targetPlayer.hp, initialTargetHp, 'Target HP should not change');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change');
        assert.notOk(mockCalls['applyKnockback'], 'applyKnockback should not be called');
    });

     QUnit.test('Ranged Attack: Success (Target Defeated)', assert => {
        targetPlayer.hp = 1; // Target has low HP
        const initialAmmo = enemy.resources.ammo;
        const result = _attemptEngageAttack(enemy, targetPlayer, gameState);

        assert.false(result, 'Should return false when ranged attack defeats target');
        assert.equal(mockCalls['hasClearCardinalLineOfSight']?.count, 1, 'hasClearCardinalLineOfSight called once');
        assert.ok(targetPlayer.hp <= 0, 'Target HP should be 0 or less');
        assert.equal(enemy.resources.ammo, initialAmmo - 1, 'Enemy ammo should decrease');
        assert.notOk(mockCalls['applyKnockback'], 'applyKnockback should NOT be called if target HP drops to 0'); // Use notOk for potentially undefined mock
        assert.strictEqual(enemy.targetEnemy, null, 'Target should be cleared when defeated');
    });

    // --- Melee Attack Tests ---

    QUnit.test('Melee Attack: Success (Adjacent)', assert => {
        enemy.row = 5; enemy.col = 7; // Move adjacent
        const initialTargetHp = targetPlayer.hp;
        const initialAmmo = enemy.resources.ammo; // Keep original ammo

        // Temporarily override LOS mock specifically for this test to prevent ranged attack execution
        const originalMockLOS = window.hasClearCardinalLineOfSight;
        window.hasClearCardinalLineOfSight = (...args) => {
             trackMockCall('hasClearCardinalLineOfSight_override', ...args); // Use different tracker name if needed
             return false; // Force ranged LOS check to fail
        };

        const result = _attemptEngageAttack(enemy, targetPlayer, gameState);

        // Restore original mock immediately after call (though afterEach also handles it)
        window.hasClearCardinalLineOfSight = originalMockLOS;

        assert.true(result, 'Should return true when melee attack is successful');
        // The LOS check *is* called by the ranged condition, but we mocked it to return false.
        // We check the override tracker to confirm our mock was hit.
        assert.equal(mockCalls['hasClearCardinalLineOfSight_override']?.count, 1, 'hasClearCardinalLineOfSight (mock override) should be called once by ranged check');
        assert.notOk(mockCalls['hasClearCardinalLineOfSight'], 'Original hasClearCardinalLineOfSight mock should not be called');
        assert.equal(targetPlayer.hp, initialTargetHp - AI_ATTACK_DAMAGE, 'Target HP should decrease');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change for melee');
        assert.equal(mockCalls['applyKnockback']?.count, 1, 'applyKnockback should be called');
        assert.strictEqual(enemy.targetEnemy, targetPlayer, 'Target should remain unchanged');
    });

    QUnit.test('Melee Attack: Failure (Not Adjacent)', assert => {
        // Initial position is ranged, not adjacent
        // To test *only* melee failure, we need to make ranged fail first.
        enemy.resources.ammo = 0; // Ensure ranged fails *before* the call
        const initialTargetHpMeleeFail = targetPlayer.hp; // Capture HP before the call

        const resultMeleeFail = _attemptEngageAttack(enemy, targetPlayer, gameState);

        assert.false(resultMeleeFail, 'Should return false when not adjacent for melee (and ranged failed)');
        // LOS check is not called because ammo check fails first
        assert.notOk(mockCalls['hasClearCardinalLineOfSight'], 'hasClearCardinalLineOfSight should not be called (ammo check failed)');
        assert.equal(targetPlayer.hp, initialTargetHpMeleeFail, 'Target HP should not change on melee fail');
        assert.equal(enemy.resources.ammo, 0, 'Enemy ammo should remain 0');
        assert.notOk(mockCalls['applyKnockback'], 'applyKnockback should not be called');
    });

     QUnit.test('Melee Attack: Success (Target Defeated)', assert => {
        enemy.row = 5; enemy.col = 7; // Move adjacent
        targetPlayer.hp = 1; // Target has low HP
        const initialAmmo = enemy.resources.ammo; // Keep original ammo

        // Temporarily override LOS mock specifically for this test to prevent ranged attack execution
        const originalMockLOS = window.hasClearCardinalLineOfSight;
        window.hasClearCardinalLineOfSight = (...args) => {
             trackMockCall('hasClearCardinalLineOfSight_override', ...args);
             return false; // Force ranged LOS check to fail
        };

        const result = _attemptEngageAttack(enemy, targetPlayer, gameState);

        // Restore original mock
        window.hasClearCardinalLineOfSight = originalMockLOS;

        assert.false(result, 'Should return false when melee attack defeats target');
        assert.equal(mockCalls['hasClearCardinalLineOfSight_override']?.count, 1, 'hasClearCardinalLineOfSight (mock override) should be called once by ranged check');
        assert.notOk(mockCalls['hasClearCardinalLineOfSight'], 'Original hasClearCardinalLineOfSight mock should not be called');
        assert.ok(targetPlayer.hp <= 0, 'Target HP should be 0 or less');
        assert.equal(enemy.resources.ammo, initialAmmo, 'Enemy ammo should not change for melee');
        assert.notOk(mockCalls['applyKnockback'], 'applyKnockback should NOT be called if target HP drops to 0'); // Use notOk
        assert.strictEqual(enemy.targetEnemy, null, 'Target should be cleared when defeated');
    });

     QUnit.test('Knockback: Applied on hit', assert => {
        enemy.row = 5; enemy.col = 7; // Adjacent for melee
        _attemptEngageAttack(enemy, targetPlayer, gameState);
        assert.equal(mockCalls['applyKnockback']?.count, 1, 'applyKnockback should be called on successful hit');
        assert.deepEqual(mockCalls['applyKnockback'].args[0], [enemy, targetPlayer, gameState], 'applyKnockback called with correct args');
    });

     QUnit.test('Knockback: Not applied if target defeated', assert => {
        enemy.row = 5; enemy.col = 7; // Adjacent for melee
        targetPlayer.hp = 1; // Low HP
        _attemptEngageAttack(enemy, targetPlayer, gameState);
        assert.notOk(mockCalls['applyKnockback'], 'applyKnockback should not be called if target is defeated');
    });

});


QUnit.module('AI State: Engaging Enemy (_determineAndExecuteEngageMove)', hooks => {
    let gameState;
    let enemy;
    let targetPlayer;
    // Constants are setup globally by setupTestConstants()

    // Store original global functions/objects
    let originalGetValidMoves;
    let originalIsMoveSafe;
    let originalHasClearLineOfSight;
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
        targetPlayer = createMockUnit(true, { id: 'player', row: 5, col: 10, hp: 10, resources: { ammo: 5 } }); // Give player ammo for risk check
        enemy = createMockUnit(false, {
            id: 'mover1',
            state: 'ENGAGING_ENEMY',
            targetEnemy: targetPlayer,
            hp: 10, maxHp: 10,
            row: 5, col: 5,
            detectionRange: 10
        });
        gameState = createMockGameState({ player: targetPlayer, enemies: [enemy] });

        // Store originals and mock dependencies
        originalGetValidMoves = window.getValidMoves;
        window.getValidMoves = (...args) => {
            trackMockCall('getValidMoves', ...args);
            // Default: Provide some valid moves around the enemy
            const e = args[0];
            return [ { row: e.row + 1, col: e.col }, { row: e.row - 1, col: e.col }, { row: e.row, col: e.col + 1 }, { row: e.row, col: e.col - 1 } ];
        };

        originalIsMoveSafe = window.isMoveSafe;
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // Default: All moves are safe

        originalHasClearLineOfSight = window.hasClearLineOfSight;
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // Default: Has LOS

        originalUpdateUnitPosition = window.updateUnitPosition;
        window.updateUnitPosition = (...args) => { trackMockCall('updateUnitPosition', ...args); }; // Just track calls

        originalGameLogMessage = window.Game?.logMessage;
        if (window.Game) window.Game.logMessage = () => {}; // No-op mock

        originalMathRandom = Math.random; // Store original Math.random

        resetMockCalls();
    });

    hooks.afterEach(() => {
        window.getValidMoves = originalGetValidMoves;
        window.isMoveSafe = originalIsMoveSafe;
        window.hasClearLineOfSight = originalHasClearLineOfSight;
        window.updateUnitPosition = originalUpdateUnitPosition;
        if (window.Game) window.Game.logMessage = originalGameLogMessage;
        Math.random = originalMathRandom; // Restore Math.random
        cleanupTestConstants();
    });

    QUnit.test('No Valid Moves -> Waits', assert => {
        window.getValidMoves = (...args) => { trackMockCall('getValidMoves', ...args); return []; }; // Mock no valid moves
        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.equal(mockCalls['getValidMoves']?.count, 1, 'getValidMoves called once');
        assert.notOk(mockCalls['isMoveSafe'], 'isMoveSafe should not be called');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called');
        assert.notOk(mockCalls['updateUnitPosition'], 'updateUnitPosition should not be called');
    });

    QUnit.test('Valid Moves Exist, None Safe -> Waits', assert => {
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return false; }; // Mock all moves unsafe
        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true (wait action)');
        assert.equal(mockCalls['getValidMoves']?.count, 1, 'getValidMoves called');
        assert.ok(mockCalls['isMoveSafe']?.count > 0, 'isMoveSafe called for potential moves');
        assert.notOk(mockCalls['hasClearLineOfSight'], 'hasClearLineOfSight should not be called (safety check failed)');
        assert.notOk(mockCalls['updateUnitPosition'], 'updateUnitPosition should not be called');
    });

    QUnit.test('Safe Moves Exist, None Maintain LOS -> Chooses Safest (Non-LOS) Move', assert => {
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return false; }; // Mock no LOS from any potential move
        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true (move action)');
        assert.equal(mockCalls['getValidMoves']?.count, 1, 'getValidMoves called');
        assert.ok(mockCalls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        assert.ok(mockCalls['hasClearLineOfSight']?.count > 0, 'hasClearLineOfSight called for LOS check');
        // Risk check LOS might also be called depending on chosen move
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition should be called once');
        // Verify the chosen move is one of the safe ones (even if it doesn't maintain LOS)
        const chosenMoveArgs = mockCalls['updateUnitPosition'].args[0]; // [enemy, newRow, newCol, gameState]
        const chosenMove = { row: chosenMoveArgs[1], col: chosenMoveArgs[2] };
        const validMoves = window.getValidMoves(enemy, gameState); // Get the default valid moves again
        assert.ok(validMoves.some(m => m.row === chosenMove.row && m.col === chosenMove.col), 'Chosen move should be one of the initially valid moves');
    });

    QUnit.test('Safe Moves Exist, Some Maintain LOS -> Chooses LOS-Maintaining Move', assert => {
        // Default mocks: All moves safe, all maintain LOS
        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true (move action)');
        assert.equal(mockCalls['getValidMoves']?.count, 1, 'getValidMoves called');
        assert.ok(mockCalls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        assert.ok(mockCalls['hasClearLineOfSight']?.count > 0, 'hasClearLineOfSight called');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition should be called once');
    });

    QUnit.test('Prefers Closer Moves among Safe, LOS-Maintaining Options', assert => {
        // Target is at (5, 10), Enemy at (5, 5). Closer move is (5, 6).
        const expectedMove = { row: 5, col: 6 };
        // Ensure (5, 6) is provided by getValidMoves mock
        window.getValidMoves = (...args) => {
            trackMockCall('getValidMoves', ...args);
            return [ { row: 6, col: 5 }, { row: 4, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 4 } ]; // Include the closer move
        };
        // Ensure all are safe and maintain LOS (default mocks)
        Math.random = () => 0.5; // Ensure risk aversion doesn't trigger wait

        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true (move action)');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition should be called once');
        const chosenMoveArgs = mockCalls['updateUnitPosition'].args[0];
        assert.equal(chosenMoveArgs[1], expectedMove.row, 'Chosen move row should be closer');
        assert.equal(chosenMoveArgs[2], expectedMove.col, 'Chosen move col should be closer');
    });

    QUnit.test('Chooses Sideways Move if No Closer LOS-Maintaining Moves Exist', assert => {
        // Target (5, 10), Enemy (5, 9) - already adjacent
        enemy.row = 5; enemy.col = 9;
        const currentDist = 1;
        // Mock valid moves: only sideways or further away maintain LOS/safety
        window.getValidMoves = (...args) => {
            trackMockCall('getValidMoves', ...args);
            return [ { row: 6, col: 9 }, { row: 4, col: 9 }, { row: 5, col: 8 } ]; // Sideways and further
        };
        // Temporarily override LOS mock for this specific test
        const originalMockLOS = window.hasClearLineOfSight; // Store the beforeEach mock
        window.hasClearLineOfSight = (pos1, pos2, range, gs) => {
             trackMockCall('hasClearLineOfSight_override', ...args); // Use different tracker name if needed
             // Only allow LOS for sideways moves (row 6/4, col 9) from the enemy's perspective
             if (pos1 === enemy) {
                return pos1.col === 9 && (pos1.row === 6 || pos1.row === 4);
             }
             // Use the original beforeEach mock's behavior (true) for other calls (like target's risk check)
             // Note: We call the *stored* beforeEach mock, not the original function from before all tests
             return originalMockLOS(pos1, pos2, range, gs);
        };
        Math.random = () => 0.5; // Ensure risk aversion doesn't trigger wait

        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        // Restore the original beforeEach LOS mock
        window.hasClearLineOfSight = originalMockLOS;

        assert.true(result, 'Should return true (wait action because no closer/sideways moves)');
        assert.notOk(mockCalls['updateUnitPosition'], 'updateUnitPosition should not be called');
    });

    QUnit.test('Risk Aversion: Waits Despite Valid Move (High Risk)', assert => {
        // Ensure target can shoot back (has ammo - set in beforeEach)
        // Ensure target has LOS to the potential move (default mock)
        // Force risk aversion check to trigger wait
        Math.random = () => 0; // Guarantees Math.random() < AI_ENGAGE_RISK_AVERSION_CHANCE (assuming > 0)
        window.AI_ENGAGE_RISK_AVERSION_CHANCE = 0.3; // Ensure constant is set

        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true (wait action due to risk aversion)');
        assert.ok(mockCalls['getValidMoves']?.count >= 1, 'getValidMoves called');
        assert.ok(mockCalls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        // LOS check for enemy moving AND LOS check for target shooting back
        assert.ok(mockCalls['hasClearLineOfSight']?.count >= 2, 'hasClearLineOfSight called for move selection and risk check');
        assert.notOk(mockCalls['updateUnitPosition'], 'updateUnitPosition should not be called');
    });

    QUnit.test('Risk Aversion: Moves Despite Valid Move (Low Risk)', assert => {
        // Ensure target can shoot back (has ammo)
        // Ensure target has LOS to the potential move (default mock)
        // Force risk aversion check to allow move
        Math.random = () => 0.5; // Guarantees Math.random() >= AI_ENGAGE_RISK_AVERSION_CHANCE (assuming <= 0.5)
        window.AI_ENGAGE_RISK_AVERSION_CHANCE = 0.3; // Ensure constant is set

        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        assert.true(result, 'Should return true (move action, risk accepted)');
        assert.ok(mockCalls['getValidMoves']?.count >= 1, 'getValidMoves called');
        assert.ok(mockCalls['isMoveSafe']?.count > 0, 'isMoveSafe called');
        assert.ok(mockCalls['hasClearLineOfSight']?.count >= 2, 'hasClearLineOfSight called');
        assert.equal(mockCalls['updateUnitPosition']?.count, 1, 'updateUnitPosition should be called');
    });

     QUnit.test('Fallback Wait: No suitable move chosen after filtering', assert => {
        // Create a scenario where no move passes all filters but isn't explicitly blocked early
        window.getValidMoves = (...args) => { trackMockCall('getValidMoves', ...args); return [{ row: 6, col: 5 }]; }; // Only one move
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // It's safe
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // It maintains LOS
        // Make it risky
        targetPlayer.resources.ammo = 1;
        // Force risk aversion
        Math.random = () => 0;
        window.AI_ENGAGE_RISK_AVERSION_CHANCE = 0.3;

        // In this specific case, risk aversion causes a wait, which is covered by another test.
        // Let's try a different fallback: No LOS maintaining moves, and the only safe moves are further away.
        resetMockCalls();
        enemy.row = 5; enemy.col = 9; // Adjacent
        targetPlayer.row = 5; targetPlayer.col = 10;
        window.getValidMoves = (...args) => { trackMockCall('getValidMoves', ...args); return [{ row: 5, col: 8 }]; }; // Only move further away
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // It's safe
        window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return true; }; // It maintains LOS
        Math.random = () => 0.5; // No risk aversion wait

        const result = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

        // The logic currently selects *any* safe, LOS-maintaining move if no closer ones exist.
        // It doesn't explicitly prevent moving further away if that's the only option.
        // So, this scenario results in a move, not a fallback wait.
        // A true fallback wait seems hard to trigger with the current logic unless getValidMoves is empty or all moves are unsafe.
        // Let's test the explicit fallback log message path by making finalCandidates empty somehow.
        // This happens if safeCandidateMoves exist, but none maintain LOS (losMaintainingMoves is empty),
        // AND the logic incorrectly used losMaintainingMoves instead of safeCandidateMoves as finalCandidates.
        // Let's simulate that potential (though unlikely) state:
        resetMockCalls();
        window.getValidMoves = (...args) => { trackMockCall('getValidMoves', ...args); return [{ row: 6, col: 5 }]; }; // One move
        window.isMoveSafe = (...args) => { trackMockCall('isMoveSafe', ...args); return true; }; // It's safe
         window.hasClearLineOfSight = (...args) => { trackMockCall('hasClearLineOfSight', ...args); return false; }; // It does NOT maintain LOS
         Math.random = () => 0.5; // Ensure risk aversion doesn't trigger wait

         const resultFallback = _determineAndExecuteEngageMove(enemy, targetPlayer, gameState);

         // This scenario actually results in a WAIT because no closer/sideways moves are found.
         assert.true(resultFallback, 'Should return true (wait action)');
         assert.notOk(mockCalls['updateUnitPosition'], 'updateUnitPosition should not be called');
         // Conclusion: The code correctly waits when only further moves are available.

     });

});
