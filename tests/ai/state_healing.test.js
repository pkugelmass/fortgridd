// Tests for js/ai/state_healing.js (handleHealingState function)
//
// QUnit assertions are available globally via 'assert'
// Helper functions (createMockGameState, createMockUnit, setupTestConstants, cleanupTestConstants) are globally defined in test-helpers.js

QUnit.module('AI State: Healing (handleHealingState)', hooks => {
    let gameState;
    let enemy;
    let globalMocks;
    let logMock;

    hooks.beforeEach(() => {
        setupTestConstants();
        gameState = createMockGameState();
        enemy = createMockUnit(false, {
            id: 'healer1',
            state: 'HEALING',
            hp: 5,
            maxHp: 10,
            resources: { medkits: 1, ammo: 1 }
        });
        gameState.enemies = [enemy];
        gameState.aiUnits = { [enemy.id]: enemy };

        globalMocks = setupGlobalMocks({
            useMedkit: () => true
        });
        logMock = setupLogMock();
    });

    hooks.afterEach(() => {
        globalMocks.restore();
        logMock.restore();
        cleanupTestConstants();
    });

    QUnit.test('Should attempt to use medkit', assert => {
        let callCount = 0;
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            useMedkit: (...args) => {
                callCount++;
                return true;
            }
        });

        const result = handleHealingState(enemy, gameState);

        assert.ok(result, 'Should return true');
        assert.equal(callCount, 1, 'useMedkit called once');
    });

    QUnit.test('Should transition to EXPLORING state after attempting heal (success)', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            useMedkit: () => true
        });

        handleHealingState(enemy, gameState);

        assert.equal(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be EXPLORING');
    });

    QUnit.test('Should transition to EXPLORING state after attempting heal (failure)', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            useMedkit: () => false
        });

        handleHealingState(enemy, gameState);

        assert.equal(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be EXPLORING');
    });

    QUnit.test('Should return true even if useMedkit fails', assert => {
        let callCount = 0;
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            useMedkit: (...args) => {
                callCount++;
                return false;
            }
        });

        const result = handleHealingState(enemy, gameState);

        assert.ok(result, 'Should return true');
        assert.equal(callCount, 1, 'useMedkit called once');
    });

    QUnit.test('Dependency Check: Should handle missing enemy gracefully', assert => {
        const result = handleHealingState(null, gameState);
        assert.ok(result, "Should return true on dependency failure");
    });

    // Skipped: Should handle missing gameState gracefully (see original comment)

    QUnit.test('Dependency Check: Should handle missing useMedkit gracefully', assert => {
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            useMedkit: undefined
        });
        const originalState = enemy.state;

        const result = handleHealingState(enemy, gameState);

        assert.ok(result, "Should return true on dependency failure");
        assert.equal(enemy.state, AI_STATE_EXPLORING, 'Enemy state should transition to EXPLORING on useMedkit failure');
    });
});
