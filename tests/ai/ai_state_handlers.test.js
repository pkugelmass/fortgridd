console.log("ai_state_handlers.test.js loaded");

QUnit.module('AI State Handlers', function(hooks) {
    // Setup mock data before each test in this module
    hooks.beforeEach(function() {
        // Reset or mock global state needed for AI tests
        window.mapData = [ // Simple 5x5 map for testing
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1]
        ];
        window.GRID_WIDTH = 5;
        window.GRID_HEIGHT = 5;
        window.TILE_LAND = 0;
        window.TILE_WALL = 1;
        window.TILE_TREE = 2;
        window.TILE_MEDKIT = 3;
        window.TILE_AMMO = 4;

        window.player = { id: 'Player', row: 2, col: 2, hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, resources: { ammo: PLAYER_START_AMMO, medkits: PLAYER_START_MEDKITS } };
        window.enemies = []; // Reset enemies array

        // Mock relevant Game object methods used by AI
        window.Game = {
            logMessage: function(message, cssClass) { console.log(`Mock Game.logMessage: ${message} (${cssClass})`); },
            getSafeZone: function() { return { minRow: 0, maxRow: 4, minCol: 0, maxCol: 4 }; },
            checkEndConditions: function() { return false; },
            endAiTurn: function() { console.log("Mock Game.endAiTurn called"); }
        };

        // Mock config constants
        window.AI_STATE_EXPLORING = 'EXPLORING';
        window.AI_STATE_SEEKING_RESOURCES = 'SEEKING_RESOURCES';
        window.AI_STATE_ENGAGING_ENEMY = 'ENGAGING_ENEMY';
        window.AI_STATE_FLEEING = 'FLEEING';
        window.AI_STATE_HEALING = 'HEALING';
        window.AI_FLEE_HEALTH_THRESHOLD = 0.25;
        window.AI_HEAL_PRIORITY_THRESHOLD = 0.5;
        window.AI_SEEK_AMMO_THRESHOLD = 4;
        window.AI_RANGE_MAX = 8;
        window.AI_PROACTIVE_SCAN_RANGE = 3;
        window.AI_EXPLORE_MOVE_AGGRESSION_CHANCE = 0.6;
        window.AI_EXPLORE_MOVE_RANDOM_CHANCE = 0.3;
        window.AI_EXPLORE_WAIT_CHANCE = 0.1;
        window.LOG_CLASS_ENEMY_EVENT = 'log-enemy-event';
        window.PLAYER_MAX_HP = 15;
        window.PLAYER_START_AMMO = 10;
        window.PLAYER_START_MEDKITS = 1;
        window.HEAL_AMOUNT = 5;
        window.AI_AMMO_PICKUP_AMOUNT = 5; // Added for seeking tests

        // --- Mock AI Helper Functions ---
        window.findNearestVisibleEnemy = function(unit) { return null; };
        window.findNearbyResource = function(unit, range, type) { return null; };
        window.getSafeZoneCenter = function() { return { row: Math.floor(GRID_HEIGHT / 2), col: Math.floor(GRID_WIDTH / 2) }; };
        window.moveTowards = function(unit, targetRow, targetCol, reason) { return false; };
        window.moveRandomly = function(unit) { return false; };
        window.traceLine = function(startRow, startCol, endRow, endCol) { return true; };
        window.isCellOccupied = function(row, col, excludeUnitId = null) { return false; };
        window.hasClearLineOfSight = function(unit, target, range) { return true; };
        // Mock performReevaluation as it's called as a fallback in some handlers
        window.performReevaluation = function(unit) {
            console.log(`Mock performReevaluation called for unit ${unit.id}`);
            // Default mock behavior: switch to EXPLORING if no other state is determined
            unit.state = AI_STATE_EXPLORING;
        };
        // Mock useMedkit as it's called by handleHealingState
        window.useMedkit = function(unit) {
            console.log(`Mock useMedkit called for unit ${unit.id}`);
            if (unit.resources.medkits > 0) {
                unit.resources.medkits--;
                unit.hp = Math.min(unit.hp + HEAL_AMOUNT, unit.maxHp);
                return true; // Indicate medkit was used
            }
            return false; // Indicate no medkit used
        };
    });

    // --- handleExploringState Tests ---
    // Note: Transition tests were moved to ai_transitions.test.js (testing performReevaluation)

    QUnit.test('handleExploringState: Default action - Moves when no threats or resources nearby', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 2, col: 2, hp: 15, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);
        window.player.row = 4; window.player.col = 4; // Player out of range/hidden

        const originalRow = enemy.row;
        const originalCol = enemy.col;
        let moveAttempted = false;

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) { return null; };
        window.findNearbyResource = function(unit, range, type) { return null; };
        // Mock movement to succeed
        window.moveTowards = function(unit, targetRow, targetCol, reason) {
            moveAttempted = true;
            unit.row += 1; // Simulate a move
            return true;
        };
         window.moveRandomly = function(unit) {
            moveAttempted = true;
            unit.col += 1; // Simulate a move
            return true;
        };
         // Mock Game.logMessage to check for "waits" message
         const originalLog = Game.logMessage;
         let waitMessageLogged = false;
         Game.logMessage = function(message, cssClass) {
             if (message.includes("waits")) {
                 waitMessageLogged = true;
             }
         };

        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy should remain in EXPLORING state');
        assert.ok(moveAttempted, "A move function (moveTowards or moveRandomly) should have been attempted");
        assert.ok(enemy.row !== originalRow || enemy.col !== originalCol, 'Enemy should have moved from original position');
        assert.notOk(waitMessageLogged, "Wait message should not be logged if a move was successful");

        // Restore original log mock
        Game.logMessage = originalLog;
    });

     QUnit.test('handleExploringState: Default action - Waits when blocked', function(assert) {
        // Arrange
         window.mapData = [ // Map where enemy is blocked
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ];
        window.GRID_WIDTH = 3; window.GRID_HEIGHT = 3;
        const enemy = { id: 'E1', row: 1, col: 1, hp: 15, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);
        window.player.row = 0; window.player.col = 0; // Player out of the way

        const originalRow = enemy.row;
        const originalCol = enemy.col;

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) { return null; };
        window.findNearbyResource = function(unit, range, type) { return null; };
        // Mock movement functions to *fail*
        window.moveTowards = function(unit, targetRow, targetCol, reason) { return false; };
        window.moveRandomly = function(unit) { return false; };

        // Mock Game.logMessage to capture wait message
        const originalLog = Game.logMessage;
        let waitBlockedMessageLogged = false;
        Game.logMessage = function(message, cssClass) {
            if (message.includes("waits (no moves)")) {
                waitBlockedMessageLogged = true;
            }
        };

        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy should remain in EXPLORING state');
        assert.strictEqual(enemy.row, originalRow, 'Enemy row should not change when blocked');
        assert.strictEqual(enemy.col, originalCol, 'Enemy col should not change when blocked');
        // assert.ok(waitBlockedMessageLogged, 'Game.logMessage should have been called with "waits (no moves)"'); // Log removed

         // Restore original log mock
         Game.logMessage = originalLog;
    });

    // --- handleSeekingResourcesState Tests ---

    QUnit.test('handleSeekingResourcesState: Moves towards target resource', function(assert) {
        // Arrange
        const targetCoords = { row: 1, col: 3 }; // Target is 2 steps away
        window.mapData[targetCoords.row][targetCoords.col] = TILE_MEDKIT;
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_SEEKING_RESOURCES, targetResourceCoords: targetCoords, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);

        // Explicitly mock performReevaluation to prevent state change during this specific test
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) { reevaluationCalled = true; /* Do nothing */ };

        let moveTowardsCalled = false;
        window.moveTowards = function(unit, tRow, tCol, reason) {
            assert.strictEqual(unit.id, enemy.id, 'moveTowards called with correct enemy');
            assert.strictEqual(tRow, targetCoords.row, 'moveTowards called with correct target row');
            assert.strictEqual(tCol, targetCoords.col, 'moveTowards called with correct target col');
            assert.strictEqual(reason, 'resource', 'moveTowards called with correct reason');
            moveTowardsCalled = true;
            unit.col += 1; // Simulate move one step closer (to col 2)
            return true;
        };

        // Act
        handleSeekingResourcesState(enemy);

        // Assert
        assert.ok(moveTowardsCalled, 'moveTowards should have been called');
        assert.strictEqual(enemy.row, 1, 'Enemy row should be unchanged');
        assert.strictEqual(enemy.col, 2, 'Enemy col should be updated by mock moveTowards');
        assert.strictEqual(enemy.state, AI_STATE_SEEKING_RESOURCES, 'Enemy should remain in SEEKING_RESOURCES state');
        assert.notOk(reevaluationCalled, 'performReevaluation should NOT have been called');
    });

    QUnit.test('handleSeekingResourcesState: Picks up Medkit upon arrival', function(assert) {
        // Arrange
        const targetCoords = { row: 1, col: 2 };
        window.mapData[targetCoords.row][targetCoords.col] = TILE_MEDKIT;
        const enemy = { id: 'E1', row: 1, col: 2, hp: 10, maxHp: 15, state: AI_STATE_SEEKING_RESOURCES, targetResourceCoords: targetCoords, resources: { ammo: 1, medkits: 0 } }; // Start AT target
        window.enemies.push(enemy);

        // Mock performReevaluation to check it's called after pickup
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) {
            reevaluationCalled = true;
            assert.strictEqual(unit.id, enemy.id, 'performReevaluation called for the correct enemy');
            unit.state = AI_STATE_EXPLORING; // Simulate default reevaluation result
        };

        // Act
        handleSeekingResourcesState(enemy);

        // Assert
        assert.strictEqual(enemy.resources.medkits, 1, 'Enemy should have 1 medkit');
        assert.strictEqual(window.mapData[targetCoords.row][targetCoords.col], TILE_LAND, 'Map tile should be changed to LAND');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Target coordinates should be cleared');
        assert.ok(reevaluationCalled, 'performReevaluation should have been called after pickup');
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be set by mock performReevaluation');
    });

     QUnit.test('handleSeekingResourcesState: Picks up Ammo upon arrival', function(assert) {
        // Arrange
        window.AI_AMMO_PICKUP_AMOUNT = 5; // Set for test
        const targetCoords = { row: 1, col: 2 };
        window.mapData[targetCoords.row][targetCoords.col] = TILE_AMMO;
        const enemy = { id: 'E1', row: 1, col: 2, hp: 10, maxHp: 15, state: AI_STATE_SEEKING_RESOURCES, targetResourceCoords: targetCoords, resources: { ammo: 1, medkits: 0 } }; // Start AT target
        window.enemies.push(enemy);

        // Mock performReevaluation
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) {
            reevaluationCalled = true;
            unit.state = AI_STATE_EXPLORING;
        };

        // Act
        handleSeekingResourcesState(enemy);

        // Assert
        assert.strictEqual(enemy.resources.ammo, 1 + AI_AMMO_PICKUP_AMOUNT, 'Enemy ammo should increase by pickup amount');
        assert.strictEqual(window.mapData[targetCoords.row][targetCoords.col], TILE_LAND, 'Map tile should be changed to LAND');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Target coordinates should be cleared');
        assert.ok(reevaluationCalled, 'performReevaluation should have been called after pickup');
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be set by mock performReevaluation');
    });

    QUnit.test('handleSeekingResourcesState: Waits if path blocked', function(assert) {
        // Arrange
        const targetCoords = { row: 1, col: 3 };
        window.mapData[targetCoords.row][targetCoords.col] = TILE_MEDKIT;
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_SEEKING_RESOURCES, targetResourceCoords: targetCoords, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);

        // Mock performReevaluation to prevent state change
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) { reevaluationCalled = true; };

        let moveTowardsCalled = false;
        window.moveTowards = function(unit, tRow, tCol, reason) {
            moveTowardsCalled = true;
            return false; // Simulate blocked path
        };
        // Mock moveRandomly to also fail, ensuring it waits
        window.moveRandomly = function(unit) { return false; };

        // Act
        handleSeekingResourcesState(enemy);

        // Assert
        assert.ok(moveTowardsCalled, 'moveTowards should have been called');
        assert.strictEqual(enemy.row, 1, 'Enemy row should be unchanged');
        assert.strictEqual(enemy.col, 1, 'Enemy col should be unchanged');
        assert.strictEqual(enemy.state, AI_STATE_SEEKING_RESOURCES, 'Enemy should remain in SEEKING_RESOURCES state');
        assert.notOk(reevaluationCalled, 'performReevaluation should NOT have been called');
    });

    QUnit.test('handleSeekingResourcesState: Calls performReevaluation if target resource is gone', function(assert) {
        // Arrange
        const targetCoords = { row: 1, col: 3 };
        window.mapData[targetCoords.row][targetCoords.col] = TILE_LAND; // Resource is already gone
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_SEEKING_RESOURCES, targetResourceCoords: targetCoords, detectionRange: 5, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);

        // Mock performReevaluation to check it's called and simulate a state change
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) {
            reevaluationCalled = true;
            assert.strictEqual(unit.id, enemy.id, 'performReevaluation called for the correct enemy');
            assert.strictEqual(unit.targetResourceCoords, null, 'Target coords should be null before reevaluation logic runs');
            unit.state = AI_STATE_EXPLORING; // Simulate finding nothing else
        };

        // Act
        handleSeekingResourcesState(enemy);

        // Assert
        assert.ok(reevaluationCalled, 'performReevaluation should have been called');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Target coordinates should be cleared by handler');
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be set by mock performReevaluation');
    });

     QUnit.test('handleSeekingResourcesState: Calls performReevaluation if targetCoords initially null', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 15, maxHp: 15, state: AI_STATE_SEEKING_RESOURCES, targetResourceCoords: null, detectionRange: 5, resources: { ammo: 1, medkits: 0 } }; // Start with null target
        window.enemies.push(enemy);

        // Mock performReevaluation
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) {
            reevaluationCalled = true;
            unit.state = AI_STATE_EXPLORING;
        };

        // Act
        handleSeekingResourcesState(enemy);

        // Assert
        assert.ok(reevaluationCalled, 'performReevaluation should have been called');
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be set by mock performReevaluation');
    });

     QUnit.test('handleSeekingResourcesState: Calls performReevaluation if resource disappears after moving', function(assert) {
        // Arrange
        const targetCoords = { row: 1, col: 2 };
        window.mapData[targetCoords.row][targetCoords.col] = TILE_MEDKIT; // Resource exists initially
        const enemy = { id: 'E1', row: 1, col: 1, hp: 15, maxHp: 15, state: AI_STATE_SEEKING_RESOURCES, targetResourceCoords: targetCoords, detectionRange: 5, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);

        // Mock movement to succeed
        window.moveTowards = function(unit, tRow, tCol, reason) {
            unit.row = tRow; // Simulate arrival
            unit.col = tCol;
            // Simulate resource disappearing *during* the move (before the arrival check)
            window.mapData[targetCoords.row][targetCoords.col] = TILE_LAND;
            return true;
        };

        // Mock performReevaluation
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) {
            reevaluationCalled = true;
            assert.strictEqual(unit.targetResourceCoords, null, 'Target coords should be null before reevaluation');
            unit.state = AI_STATE_EXPLORING;
        };

        // Act
        handleSeekingResourcesState(enemy);

        // Assert
        assert.strictEqual(enemy.row, targetCoords.row, "Enemy should have moved to target row");
        assert.strictEqual(enemy.col, targetCoords.col, "Enemy should have moved to target col");
        assert.ok(reevaluationCalled, 'performReevaluation should have been called');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Target coordinates should be cleared by handler');
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be set by mock performReevaluation');
    });

    // --- handleHealingState Tests ---

    QUnit.test('handleHealingState: Calls useMedkit and returns true when medkits available', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 5, maxHp: 15, state: AI_STATE_HEALING, resources: { ammo: 1, medkits: 1 } };
        window.enemies.push(enemy);
        let useMedkitMockCalled = false;
        // Override the default mock to track calls for this specific test
        window.useMedkit = function(unit) {
            useMedkitMockCalled = true;
            assert.strictEqual(unit.id, enemy.id, "useMedkit mock called with correct enemy");
            // Simulate the actual useMedkit logic for state checking
            if (unit.resources.medkits > 0) {
                unit.resources.medkits--;
                unit.hp = Math.min(unit.hp + HEAL_AMOUNT, unit.maxHp);
                return true;
            }
            return false;
        };

        // Act
        const result = handleHealingState(enemy);

        // Assert
        assert.ok(useMedkitMockCalled, "useMedkit mock function should be called");
        assert.strictEqual(result, true, "handleHealingState should return true (action taken)");
        assert.strictEqual(enemy.resources.medkits, 0, "Enemy medkits should be decremented by mock");
        assert.strictEqual(enemy.hp, 5 + HEAL_AMOUNT, "Enemy HP should be increased by mock");
    });

    QUnit.test('handleHealingState: Does not call useMedkit and returns false if no medkits available', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 5, maxHp: 15, state: AI_STATE_HEALING, resources: { ammo: 1, medkits: 0 } }; // NO medkits
        window.enemies.push(enemy);
        let useMedkitMockCalled = false;
        // Override mock to track calls
        window.useMedkit = function(unit) {
            useMedkitMockCalled = true;
            return false; // Simulate no medkit used
        };
        // Mock performReevaluation to ensure it's NOT called in this path
        let reevaluationCalled = false;
        window.performReevaluation = function(unit) { reevaluationCalled = true; };


        // Act
        const result = handleHealingState(enemy);

        // Assert
        assert.notOk(useMedkitMockCalled, "useMedkit mock function should NOT be called");
        assert.strictEqual(result, false, "handleHealingState should return false (no action taken)");
        assert.strictEqual(enemy.resources.medkits, 0, "Enemy medkits should remain 0");
        assert.strictEqual(enemy.hp, 5, "Enemy HP should not change");
        assert.notOk(reevaluationCalled, "performReevaluation should NOT be called");
    });

});
