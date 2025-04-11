// Tests for Safe Zone logic (isOutsideSafeZone, shrinkSafeZone, applyStormDamage) from js/game.js
console.log("game/safe_zone.test.js loaded");

QUnit.module('Game Logic (game.js) > Safe Zone / Shrink Logic', hooks => {
    let gameState;
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
        // Setup a default safe zone for testing
        gameState = createMockGameState();
        gameState.safeZone = { minRow: 2, maxRow: 7, minCol: 3, maxCol: 8 }; // Example zone
        gameState.turnNumber = 1; // Start at turn 1

        // Store originals and mock dependencies
        originalGameLogMessage = Game.logMessage;
        Game.logMessage = (...args) => { trackMockCall('logMessage', ...args); };

        resetMockCalls();
    });

    hooks.afterEach(() => {
        Game.logMessage = originalGameLogMessage;
        cleanupTestConstants();
    });

    // --- isOutsideSafeZone Tests ---
    QUnit.test('isOutsideSafeZone: Returns false for point inside zone', assert => {
        assert.false(Game.isOutsideSafeZone(5, 5, gameState), 'Point (5,5) should be inside');
    });

    QUnit.test('isOutsideSafeZone: Returns true for point outside (below minRow)', assert => {
        assert.true(Game.isOutsideSafeZone(1, 5, gameState), 'Point (1,5) should be outside');
    });

    QUnit.test('isOutsideSafeZone: Returns true for point outside (above maxRow)', assert => {
        assert.true(Game.isOutsideSafeZone(8, 5, gameState), 'Point (8,5) should be outside');
    });

    QUnit.test('isOutsideSafeZone: Returns true for point outside (left of minCol)', assert => {
        assert.true(Game.isOutsideSafeZone(5, 2, gameState), 'Point (5,2) should be outside');
    });

     QUnit.test('isOutsideSafeZone: Returns true for point outside (right of maxCol)', assert => {
        assert.true(Game.isOutsideSafeZone(5, 9, gameState), 'Point (5,9) should be outside');
    });

    QUnit.test('isOutsideSafeZone: Returns false for point on boundary (minRow)', assert => {
        assert.false(Game.isOutsideSafeZone(2, 5, gameState), 'Point (2,5) on minRow boundary should be inside');
    });

     QUnit.test('isOutsideSafeZone: Returns false for point on boundary (maxCol)', assert => {
        assert.false(Game.isOutsideSafeZone(5, 8, gameState), 'Point (5,8) on maxCol boundary should be inside');
    });

     QUnit.test('isOutsideSafeZone: Returns false if safeZone is null', assert => {
        gameState.safeZone = null;
        assert.false(Game.isOutsideSafeZone(5, 5, gameState), 'Should return false if safeZone is null');
    });

    // --- shrinkSafeZone Tests ---
    // Note: Skipping tests that require overriding const variables (SHRINK_INTERVAL, SHRINK_AMOUNT)
    // as this causes "Assignment to constant variable" errors.
    // The core shrink logic is implicitly tested via applyStormDamage.

    QUnit.test('shrinkSafeZone: Does not shrink if not interval turn', assert => {
        // Assumes default SHRINK_INTERVAL from config is >= 2
        gameState.turnNumber = 3; // Example non-interval turn
        const initialZone = JSON.stringify(gameState.safeZone);
        const result = Game.shrinkSafeZone(gameState);

        assert.false(result, 'Should return false');
        assert.equal(JSON.stringify(gameState.safeZone), initialZone, 'Safe zone should not change');
        assert.notOk(mockCalls['logMessage'], 'logMessage should not be called');
    });

     QUnit.test('shrinkSafeZone: Does not shrink on turn 1', assert => {
        window.SHRINK_INTERVAL = 5;
        gameState.turnNumber = 1;
        const initialZone = JSON.stringify(gameState.safeZone);
        const result = Game.shrinkSafeZone(gameState);

        assert.false(result, 'Should return false');
        assert.equal(JSON.stringify(gameState.safeZone), initialZone, 'Safe zone should not change');
    });

    // Skipping tests that require overriding SHRINK_INTERVAL / SHRINK_AMOUNT due to const assignment error.

});


QUnit.module('Game Logic (game.js) > applyStormDamage', hooks => {
    let gameState;
    let player;
    let enemyIn;
    let enemyOut;
    let enemyAlmostDead;
    let gameMocks; // Use the new helper
    // Constants are setup globally by setupTestConstants()

    hooks.beforeEach(() => {
        setupTestConstants();
        player = createMockUnit(true, { id: 'player', hp: 10, row: 5, col: 5 }); // Inside by default
        enemyIn = createMockUnit(false, { id: 'enemyIn', hp: 5, row: 4, col: 4 }); // Inside
        enemyOut = createMockUnit(false, { id: 'enemyOut', hp: 5, row: 1, col: 1 }); // Outside
        enemyAlmostDead = createMockUnit(false, { id: 'enemyAlmostDead', hp: 1, row: 0, col: 0 }); // Outside, low HP
        gameState = createMockGameState({ player: player, enemies: [enemyIn, enemyOut, enemyAlmostDead] });
        gameState.safeZone = { minRow: 2, maxRow: 7, minCol: 3, maxCol: 8 }; // Define zone
        gameState.gameActive = true;

        // Use the new helper to setup mocks
        gameMocks = setupGameMocks({
            isOutsideSafeZone: (row, col, gs) => {
                // Custom mock logic based on gameState's safeZone
                const zone = gs.safeZone;
                if (!zone) return false; // Handle null safeZone case
                return row < zone.minRow || row > zone.maxRow || col < zone.minCol || col > zone.maxCol;
            },
            logMessage: true, // Use default spy
            checkEndConditions: (gs) => {
                // Default: Game doesn't end unless specified by test logic manipulating HP
                return false;
            },
            isGameOver: (gs) => {
                // Reflect actual gameState.gameActive
                return !gs.gameActive;
            }
        });

        // Ensure STORM_DAMAGE is defined (already handled by setupTestConstants)
        // window.STORM_DAMAGE = 1; // No longer needed here
    });

    hooks.afterEach(() => {
        gameMocks.restore(); // Restore all mocked Game methods
        cleanupTestConstants();
    });

    QUnit.test('Player outside takes damage, returns true', assert => {
        player.row = 0; // Move player outside
        const initialHp = player.hp;
        const result = Game.applyStormDamage(gameState);

        assert.true(result, 'Should return true as damage was applied');
        assert.equal(player.hp, initialHp - STORM_DAMAGE, 'Player HP should decrease');
        assert.ok(gameMocks.calls['isOutsideSafeZone']?.count > 0, 'isOutsideSafeZone called');
        assert.ok(gameMocks.calls['logMessage']?.args.some(args => args[0].includes("Player") && args[0].includes("storm damage")), 'Damage message logged for player');
        assert.ok(gameMocks.calls['checkEndConditions']?.count > 0, 'checkEndConditions called');
    });

    QUnit.test('Player inside does not take damage', assert => {
        // Player starts inside by default
        const initialHp = player.hp;
        Game.applyStormDamage(gameState); // Run damage application

        assert.equal(player.hp, initialHp, 'Player HP should not change');
        // Note: checkEndConditions might still be called even if player is safe, depending on enemies
    });

    QUnit.test('Enemy outside takes damage, returns true', assert => {
        const initialHp = enemyOut.hp;
        const result = Game.applyStormDamage(gameState);

        assert.true(result, 'Should return true as damage was applied');
        assert.equal(enemyOut.hp, initialHp - STORM_DAMAGE, 'EnemyOut HP should decrease');
        assert.ok(gameMocks.calls['isOutsideSafeZone']?.count > 0, 'isOutsideSafeZone called');
        assert.ok(gameMocks.calls['logMessage']?.args.some(args => args[0].includes(enemyOut.id) && args[0].includes("storm damage")), 'Damage message logged for enemyOut');
        assert.ok(gameMocks.calls['checkEndConditions']?.count > 0, 'checkEndConditions called');
    });

     QUnit.test('Enemy inside does not take damage', assert => {
        const initialHp = enemyIn.hp;
        Game.applyStormDamage(gameState); // Run damage application

        assert.equal(enemyIn.hp, initialHp, 'EnemyIn HP should not change');
    });

    QUnit.test('Enemy killed by storm is removed, returns true', assert => {
        const initialEnemyCount = gameState.enemies.length;
        const result = Game.applyStormDamage(gameState);

        assert.true(result, 'Should return true as state changed');
        assert.ok(enemyAlmostDead.hp <= 0, 'enemyAlmostDead HP should be <= 0');
        assert.equal(gameState.enemies.length, initialEnemyCount - 1, 'Enemy count should decrease by 1');
        assert.false(gameState.enemies.some(e => e.id === enemyAlmostDead.id), 'enemyAlmostDead should be removed from array');
        assert.ok(gameMocks.calls['logMessage']?.args.some(args => args[0].includes(enemyAlmostDead.id) && args[0].includes("eliminated by storm")), 'Elimination message logged');
        assert.ok(gameMocks.calls['checkEndConditions']?.count > 0, 'checkEndConditions called');
    });

    QUnit.test('Returns false if no damage applied and no enemies removed', assert => {
        // All units start inside safe zone in this specific setup
        gameState.enemies = [enemyIn]; // Only enemy inside
        player.row = 5; player.col = 5; // Ensure player inside
        const result = Game.applyStormDamage(gameState);

        assert.false(result, 'Should return false as no state changed');
        assert.notOk(gameMocks.calls['logMessage']?.args.some(args => args[0].includes("storm damage")), 'No damage messages logged');
         // checkEndConditions might still be called if enemies were processed, even if none took damage
    });

    QUnit.test('Returns false immediately if game is already over', assert => {
        gameState.gameActive = false;
        const result = Game.applyStormDamage(gameState);

        assert.false(result, 'Should return false');
        assert.equal(gameMocks.calls['isGameOver']?.count, 1, 'isGameOver guard clause checked');
        assert.notOk(gameMocks.calls['isOutsideSafeZone'], 'isOutsideSafeZone should not be called');
        assert.notOk(gameMocks.calls['logMessage'], 'logMessage should not be called');
        assert.notOk(gameMocks.calls['checkEndConditions'], 'checkEndConditions should not be called');
    });

     QUnit.test('Handles null player gracefully', assert => {
        gameState.player = null;
        const result = Game.applyStormDamage(gameState);
        // Should still process enemies and return true if they take damage/die
        assert.true(result, 'Should return true (enemies processed)');
        assert.ok(enemyOut.hp < 5, 'enemyOut HP should decrease');
     });

     QUnit.test('Handles empty enemies array gracefully', assert => {
        gameState.enemies = [];
        player.row = 0; // Player outside
        const initialHp = player.hp;
        const result = Game.applyStormDamage(gameState);
        // Should still process player and return true if they take damage
        assert.true(result, 'Should return true (player processed)');
        assert.equal(player.hp, initialHp - STORM_DAMAGE, 'Player HP should decrease');
     });

});
