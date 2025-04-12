// Tests for js/ai/state_engaging_enemy.js (Core Orchestration)
// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants, setupGlobalMocks, setupGameMocks) are globally defined in test-helpers.js

QUnit.module('AI State: Engaging Enemy (handleEngagingEnemyState)', hooks => {
    let gameState;
    let enemy;
    let targetPlayer;
    let globalMocks;
    let gameMocks;

    hooks.beforeEach(() => {
        setupTestConstants();
        targetPlayer = createMockUnit(true, { id: 'player', row: 5, col: 6 });
        enemy = createMockUnit(false, {
            id: 'engager1',
            state: 'ENGAGING_ENEMY',
            targetEnemy: targetPlayer,
            hp: 10, maxHp: 10,
            row: 5, col: 5,
            resources: { ammo: 5, medkits: 0 }
        });
        gameState = createMockGameState({ player: targetPlayer, enemies: [enemy] });

        // Mock internal helpers and logger using central helpers
        globalMocks = setupGlobalMocks({
            _validateEngageState: (...args) => ({
                isValid: true,
                validatedTarget: targetPlayer,
                needsReevaluation: false,
                reason: null
            }),
            _attemptEngageAttack: () => true,
            _determineAndExecuteEngageMove: () => true
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

    QUnit.test('Validation Fails -> Returns false (needs re-evaluation)', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateEngageState: () => ({
                isValid: false,
                validatedTarget: null,
                needsReevaluation: true,
                reason: 'test_reason'
            }),
            _attemptEngageAttack: () => { throw new Error('Should not be called'); },
            _determineAndExecuteEngageMove: () => { throw new Error('Should not be called'); }
        });

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.false(result, 'Should return false when validation fails');
        // No need to check call counts; focus on behavior
    });

    QUnit.test('Validation Fails (Low HP/Fleeing) -> Returns false (needs re-evaluation)', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateEngageState: () => {
                enemy.state = AI_STATE_FLEEING;
                return {
                    isValid: false,
                    validatedTarget: targetPlayer,
                    needsReevaluation: true,
                    reason: 'fleeing'
                };
            },
            _attemptEngageAttack: () => { throw new Error('Should not be called'); },
            _determineAndExecuteEngageMove: () => { throw new Error('Should not be called'); }
        });

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.false(result, 'Should return false when validation causes flee state');
        assert.equal(enemy.state, AI_STATE_FLEEING, 'Enemy state should be FLEEING');
    });

    QUnit.test('Validation OK -> Attack Succeeds -> Returns true', assert => {
        // Default mocks: Validation OK, Attack OK
        const result = handleEngagingEnemyState(enemy, gameState);

        assert.true(result, 'Should return true when attack succeeds');
    });

    QUnit.test('Validation OK -> Attack Fails (Target Defeated) -> Returns false', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateEngageState: () => ({
                isValid: true,
                validatedTarget: targetPlayer,
                needsReevaluation: false,
                reason: null
            }),
            _attemptEngageAttack: () => {
                enemy.targetEnemy = null;
                return false;
            },
            _determineAndExecuteEngageMove: () => { throw new Error('Should not be called'); }
        });

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.false(result, 'Should return false when attack defeats target');
        assert.equal(enemy.targetEnemy, null, 'Enemy target should be cleared');
    });

    QUnit.test('Validation OK -> Attack Fails (No Range/Ammo) -> Move Succeeds -> Returns true', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            _validateEngageState: () => ({
                isValid: true,
                validatedTarget: targetPlayer,
                needsReevaluation: false,
                reason: null
            }),
            _attemptEngageAttack: () => false,
            _determineAndExecuteEngageMove: () => true
        });

        const result = handleEngagingEnemyState(enemy, gameState);

        assert.true(result, 'Should return true when attack fails but move succeeds');
    });

    // Note: The case where Move fails (_determineAndExecuteEngageMove returns false)
    // isn't explicitly handled differently by handleEngagingEnemyState; it still returns
    // the result of the move function. Since the move function always returns true (move or wait),
    // we don't need a separate test for that specific orchestration path here.
    // We will test the internal logic of _determineAndExecuteEngageMove separately.
});