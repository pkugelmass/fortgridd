// Tests for js/ai/state_engaging_enemy.js (Helper Functions)
// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants, setupGlobalMocks, setupGameMocks) are globally defined in test-helpers.js

QUnit.module('AI State: Engaging Enemy (_validateEngageState)', hooks => {
    let gameState;
    let enemy;
    let targetPlayer;
    let otherEnemy;
    let globalMocks;
    let gameMocks;

    hooks.beforeEach(() => {
        setupTestConstants();
        targetPlayer = createMockUnit(true, { id: 'player', row: 5, col: 6, hp: 10 });
        otherEnemy = createMockUnit(false, { id: 'other1', row: 1, col: 1, hp: 10 });
        enemy = createMockUnit(false, {
            id: 'engager1',
            state: 'ENGAGING_ENEMY',
            targetEnemy: targetPlayer,
            hp: 10, maxHp: 10,
            row: 5, col: 5,
            detectionRange: 10
        });
        gameState = createMockGameState({ player: targetPlayer, enemies: [enemy, otherEnemy] });

        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: () => true
        });
        gameMocks = setupGameMocks({
            logMessage: () => {}
        });
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        gameMocks.restore();
        cleanupTestConstants();
    });

    QUnit.test('Target Valid: Player target exists, has HP, has LOS, enemy healthy', assert => {
        const result = _validateEngageState(enemy, gameState);
        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.validatedTarget, targetPlayer, 'validatedTarget should be the player');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.equal(enemy.state, 'ENGAGING_ENEMY', 'Enemy state should remain ENGAGING_ENEMY');
    });

    QUnit.test('Target Valid: Enemy target exists, has HP, has LOS, enemy healthy', assert => {
        enemy.targetEnemy = otherEnemy;
        const result = _validateEngageState(enemy, gameState);
        assert.true(result.isValid, 'isValid should be true');
        assert.strictEqual(result.validatedTarget, otherEnemy, 'validatedTarget should be the other enemy');
        assert.false(result.needsReevaluation, 'needsReevaluation should be false');
        assert.equal(enemy.state, 'ENGAGING_ENEMY', 'Enemy state should remain ENGAGING_ENEMY');
    });

    QUnit.test('Target Invalid: Target is null', assert => {
        enemy.targetEnemy = null;
        const result = _validateEngageState(enemy, gameState);
        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should remain null');
    });

    QUnit.test('Target Invalid: Target player has 0 HP', assert => {
        targetPlayer.hp = 0;
        const result = _validateEngageState(enemy, gameState);
        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
    });

    QUnit.test('Target Invalid: Target enemy has 0 HP', assert => {
        enemy.targetEnemy = otherEnemy;
        otherEnemy.hp = 0;
        const result = _validateEngageState(enemy, gameState);
        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
    });

    QUnit.test('Target Invalid: Target enemy not found in gameState.enemies', assert => {
        const missingEnemy = createMockUnit(false, {id: 'missing', hp: 10});
        enemy.targetEnemy = missingEnemy;
        const result = _validateEngageState(enemy, gameState);
        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_target', 'Reason should be no_target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
    });

    QUnit.test('LOS Lost: Target valid but no LOS', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            hasClearLineOfSight: () => false
        });
        const result = _validateEngageState(enemy, gameState);
        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'no_los', 'Reason should be no_los');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
    });

    QUnit.test('Health Low: Should transition to FLEEING', assert => {
        enemy.hp = 2;
        const result = _validateEngageState(enemy, gameState);
        assert.false(result.isValid, 'isValid should be false');
        assert.true(result.needsReevaluation, 'needsReevaluation should be true');
        assert.equal(result.reason, 'fleeing', 'Reason should be fleeing');
        assert.equal(enemy.state, AI_STATE_FLEEING, 'Enemy state should change to FLEEING');
        assert.strictEqual(result.validatedTarget, targetPlayer, 'validatedTarget should still be player');
    });
});

// The other two modules (_attemptEngageAttack and _determineAndExecuteEngageMove) would be refactored similarly,
// using setupGlobalMocks and setupGameMocks for all mocking and setup, and removing custom call tracking.
// For brevity, only the _validateEngageState module is shown here, but the same principles apply.