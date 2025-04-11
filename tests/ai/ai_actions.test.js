console.log("ai_actions.test.js loaded");

QUnit.module('AI Action Logic (ai_actions.js)', function(hooks) {

    // Use central helpers for constants
    hooks.before(function() {
        setupTestConstants();
        // Ensure HEAL_AMOUNT is defined if not in MOCKED_CONSTANTS
        if (typeof window.HEAL_AMOUNT === 'undefined') {
            window.HEAL_AMOUNT = 1; // Default fallback
        }
    });

    hooks.after(function() {
        cleanupTestConstants();
        delete window.HEAL_AMOUNT;
    });

    // --- Mocks & Setup ---
    let mockGameState;
    let mockEnemy;
    let logMock;

    hooks.beforeEach(function() {
        logMock = setupLogMock();

        // Basic setup, customize in each test
        mockEnemy = createMockUnit(false, {
            id: 'healer1',
            hp: 5, // Start below max HP
            maxHp: 10,
            resources: { medkits: 1, ammo: 0 } // Start with one medkit
        });
        mockGameState = createMockGameState({ enemies: [mockEnemy], player: null }); // No player needed for these tests
    });

    hooks.afterEach(function() {
        logMock.restore();
    });

    // --- Tests for useMedkit ---
    QUnit.module('useMedkit', function() {
        QUnit.test('Successfully uses medkit when conditions met', function(assert) {
            const initialHp = mockEnemy.hp;
            const initialMedkits = mockEnemy.resources.medkits;

            const result = useMedkit(mockEnemy, mockGameState);

            assert.ok(result, 'Should return true on success');
            assert.equal(mockEnemy.hp, initialHp + HEAL_AMOUNT, 'HP should increase by HEAL_AMOUNT');
            assert.equal(mockEnemy.resources.medkits, initialMedkits - 1, 'Medkit count should decrease by 1');
            assert.ok(logMock.calls.some(call => call.message.includes('uses Medkit')), 'Success message should be logged');
        });

        QUnit.test('Does not heal if no medkits left', function(assert) {
            mockEnemy.resources.medkits = 0; // No medkits
            const initialHp = mockEnemy.hp;

            const result = useMedkit(mockEnemy, mockGameState);

            assert.notOk(result, 'Should return false when no medkits');
            assert.equal(mockEnemy.hp, initialHp, 'HP should not change');
            assert.equal(mockEnemy.resources.medkits, 0, 'Medkit count should remain 0');
            assert.notOk(logMock.calls.some(call => call.message.includes('uses Medkit')), 'Success message should not be logged');
        });

        QUnit.test('Does not heal if already at max HP', function(assert) {
            mockEnemy.hp = mockEnemy.maxHp; // Already full HP
            const initialMedkits = mockEnemy.resources.medkits;

            const result = useMedkit(mockEnemy, mockGameState);

            assert.notOk(result, 'Should return false when at max HP');
            assert.equal(mockEnemy.hp, mockEnemy.maxHp, 'HP should remain at max');
            assert.equal(mockEnemy.resources.medkits, initialMedkits, 'Medkit count should not change');
             assert.notOk(logMock.calls.some(call => call.message.includes('uses Medkit')), 'Success message should not be logged');
        });

        QUnit.test('Heals only up to max HP', function(assert) {
            // Setup: Start 1 HP below max, assuming HEAL_AMOUNT >= 1
            mockEnemy.hp = mockEnemy.maxHp - 1;
            const initialMedkits = mockEnemy.resources.medkits;
            const expectedHealAmount = 1; // Since hp starts at maxHp - 1

            const result = useMedkit(mockEnemy, mockGameState);

            assert.ok(result, 'Should return true even when healing less than full HEAL_AMOUNT');
            assert.equal(mockEnemy.hp, mockEnemy.maxHp, 'HP should be capped at max HP');
            assert.equal(mockEnemy.resources.medkits, initialMedkits - 1, 'Medkit count should decrease by 1');
            // Check log message reflects the actual amount healed (1 in this case)
            assert.ok(logMock.calls.some(call => call.message.includes('uses Medkit') && call.message.includes(`heals ${expectedHealAmount} HP`)), 'Log message should reflect actual heal amount');
        });

        QUnit.test('Handles missing enemy maxHp by using fallback', function(assert) {
             // Setup without maxHp on enemy
             mockEnemy = createMockUnit(false, {
                 id: 'healer_no_maxhp',
                 hp: 5,
                 maxHp: undefined, // Explicitly undefined
                 resources: { medkits: 1, ammo: 0 }
             });
             mockGameState.enemies = [mockEnemy]; // Update gameState
             const initialMedkits = mockEnemy.resources.medkits;

             const result = useMedkit(mockEnemy, mockGameState);

             assert.ok(result, 'Should return true using fallback maxHp');
             assert.equal(mockEnemy.hp, 5 + HEAL_AMOUNT, `HP should increase based on fallback maxHp (${PLAYER_MAX_HP})`);
             assert.equal(mockEnemy.resources.medkits, initialMedkits - 1, 'Medkit count should decrease');
             assert.ok(logMock.calls.some(call => call.message.includes(`(${mockEnemy.hp}/${PLAYER_MAX_HP})`)), 'Log message should show fallback maxHp');
        });
    });

});
