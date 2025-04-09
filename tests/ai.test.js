console.log("ai.test.js loaded");

QUnit.module('AI FSM', function(hooks) {
    // Setup mock data before each test in this module
    hooks.beforeEach(function() {
        // Reset or mock global state needed for AI tests
        // Example: Mock mapData, player, enemies array, Game object methods
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
        window.TILE_TREE = 2; // Add other tiles if needed by tests
        window.TILE_MEDKIT = 3;
        window.TILE_AMMO = 4;

        window.player = { id: 'Player', row: 2, col: 2, hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, resources: { ammo: PLAYER_START_AMMO, medkits: PLAYER_START_MEDKITS } };
        window.enemies = []; // Reset enemies array

        // Mock relevant Game object methods used by AI
        window.Game = {
            logMessage: function(message, cssClass) { console.log(`Mock Game.logMessage: ${message} (${cssClass})`); },
            getSafeZone: function() { return { minRow: 0, maxRow: 4, minCol: 0, maxCol: 4 }; }, // Default safe zone covers whole mock map
            // Add other mocks as needed (e.g., checkEndConditions, endAiTurn)
            checkEndConditions: function() { return false; }, // Assume game doesn't end during tests unless specified
            endAiTurn: function() { console.log("Mock Game.endAiTurn called"); }
        };

        // Mock config constants (ensure they are available) - values can be overridden in specific tests
        window.AI_STATE_EXPLORING = 'EXPLORING';
        window.AI_STATE_SEEKING_RESOURCES = 'SEEKING_RESOURCES';
        window.AI_STATE_ENGAGING_ENEMY = 'ENGAGING_ENEMY';
        window.AI_STATE_FLEEING = 'FLEEING';
        window.AI_FLEE_HEALTH_THRESHOLD = 0.25;
        window.AI_SEEK_HEALTH_THRESHOLD = 0.5;
        window.AI_RANGE_MAX = 8; // Default range
        window.AI_PROACTIVE_SCAN_RANGE = 3;
        window.AI_EXPLORE_MOVE_AGGRESSION_CHANCE = 0.6;
        window.AI_EXPLORE_MOVE_RANDOM_CHANCE = 0.3;
        window.AI_EXPLORE_WAIT_CHANCE = 0.1;
        window.LOG_CLASS_ENEMY_EVENT = 'log-enemy-event';
        // Add other constants used by handleExploringState and its helpers
        window.PLAYER_MAX_HP = 15; // Example value

        // --- Mock AI Helper Functions ---
        // Default mocks (can be overridden in specific tests)
        window.findNearestVisibleEnemy = function(unit) { return null; };
        window.findNearbyResource = function(unit, range, type) { return null; };
        window.getSafeZoneCenter = function() { return { row: Math.floor(GRID_HEIGHT / 2), col: Math.floor(GRID_WIDTH / 2) }; }; // Simple center
        window.moveTowards = function(unit, targetRow, targetCol, reason) { return false; }; // Default: move fails
        window.moveRandomly = function(unit) { return false; }; // Default: move fails
        // Mock traceLine if needed by findNearestVisibleEnemy (assuming it's a dependency)
        window.traceLine = function(startRow, startCol, endRow, endCol) { return true; }; // Default: assume clear LOS
        // Mock isCellOccupied if needed by movement helpers
        window.isCellOccupied = function(row, col, excludeUnitId = null) { return false; }; // Default: assume cell is free
    });

    // --- handleExploringState Tests ---

    QUnit.test('handleExploringState: Transition to ENGAGING_ENEMY when enemy nearby and HP sufficient', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);
        window.player.row = 1; window.player.col = 2; // Player position (used by mock)

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) {
            // Simple mock: return player if within range (ignoring actual LOS for this unit test)
            const dist = Math.abs(unit.row - window.player.row) + Math.abs(unit.col - window.player.col);
            return dist <= unit.detectionRange ? window.player : null;
        };

        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_ENGAGING_ENEMY, 'Enemy should transition to ENGAGING_ENEMY state');
        assert.strictEqual(enemy.targetEnemy, window.player, 'Enemy target should be the player');
    });

    QUnit.test('handleExploringState: Transition to FLEEING when enemy nearby and HP low', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 3, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } }; // Low HP (3/15 = 20% < 25% threshold)
        window.enemies.push(enemy);
        window.player.row = 1; window.player.col = 2; // Player position (used by mock)

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) {
            const dist = Math.abs(unit.row - window.player.row) + Math.abs(unit.col - window.player.col);
            return dist <= unit.detectionRange ? window.player : null;
        };

        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_FLEEING, 'Enemy should transition to FLEEING state');
        assert.strictEqual(enemy.targetEnemy, window.player, 'Enemy target should be the player');
    });

     QUnit.test('handleExploringState: Transition to SEEKING_RESOURCES for critical medkit need', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 2, col: 2, hp: 6, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } }; // Needs medkit (6/15 = 40% < 50% threshold)
        window.enemies.push(enemy);
        const medkitCoords = { row: 1, col: 2 };
        window.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT; // Place medkit nearby

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) { return null; }; // Ensure no enemy is found
        window.findNearbyResource = function(unit, range, type) {
            if (type === TILE_MEDKIT && Math.abs(unit.row - medkitCoords.row) + Math.abs(unit.col - medkitCoords.col) <= range) {
                return medkitCoords;
            }
            return null;
        };

        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_SEEKING_RESOURCES, 'Enemy should transition to SEEKING_RESOURCES state');
        assert.deepEqual(enemy.targetResourceCoords, { row: 1, col: 2 }, 'Enemy target coordinates should be the medkit location');
    });

     QUnit.test('handleExploringState: Transition to SEEKING_RESOURCES for critical ammo need', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 2, col: 2, hp: 15, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 0, medkits: 0 } }; // Needs ammo
        window.enemies.push(enemy);
        const ammoCoords = { row: 3, col: 2 };
        window.mapData[ammoCoords.row][ammoCoords.col] = TILE_AMMO; // Place ammo nearby

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) { return null; }; // Ensure no enemy is found
        window.findNearbyResource = function(unit, range, type) {
            if (type === TILE_AMMO && Math.abs(unit.row - ammoCoords.row) + Math.abs(unit.col - ammoCoords.col) <= range) {
                return ammoCoords;
            }
            return null;
        };

        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_SEEKING_RESOURCES, 'Enemy should transition to SEEKING_RESOURCES state');
        assert.deepEqual(enemy.targetResourceCoords, { row: 3, col: 2 }, 'Enemy target coordinates should be the ammo location');
    });

    QUnit.test('handleExploringState: Transition to SEEKING_RESOURCES for proactive resource scan', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 2, col: 2, hp: 15, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } }; // Doesn't critically need resources
        window.enemies.push(enemy);
        const ammoCoords = { row: 1, col: 1 };
        window.mapData[ammoCoords.row][ammoCoords.col] = TILE_AMMO; // Place ammo within proactive scan range

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) { return null; }; // Ensure no enemy is found
        window.findNearbyResource = function(unit, range, type) {
            // Only find if range matches proactive scan range
            if (range === AI_PROACTIVE_SCAN_RANGE && type === TILE_AMMO && Math.abs(unit.row - ammoCoords.row) + Math.abs(unit.col - ammoCoords.col) <= range) {
                return ammoCoords;
            }
             if (range === AI_PROACTIVE_SCAN_RANGE && type === TILE_MEDKIT) { // Check for medkits too in proactive scan
                 return null; // Assume no medkit found for this test
             }
            return null;
        };

        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_SEEKING_RESOURCES, 'Enemy should transition to SEEKING_RESOURCES state for proactive scan');
        assert.deepEqual(enemy.targetResourceCoords, { row: 1, col: 1 }, 'Enemy target coordinates should be the proactively scanned ammo');
    });

    QUnit.test('handleExploringState: Default action - Moves when no threats or resources nearby', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 2, col: 2, hp: 15, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);
        // Ensure player is out of range or hidden (mock handles this)
        window.player.row = 4; window.player.col = 4;
        // Ensure no resources are nearby (mock handles this)

        const originalRow = enemy.row;
        const originalCol = enemy.col;
        let moveAttempted = false;

        // Mock specific helper behavior for this test
        window.findNearestVisibleEnemy = function(unit) { return null; };
        window.findNearbyResource = function(unit, range, type) { return null; };
        // Mock movement to succeed (either towards center or random)
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
         // Mock Game.logMessage to check for "waits" message if needed
         const originalLog = Game.logMessage;
         let waitMessageLogged = false;
         Game.logMessage = function(message, cssClass) {
             if (message.includes("waits")) { waitMessageLogged = true; }
             originalLog(message, cssClass); // Call original mock too
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
         // Map setup is less critical now as mocks control movement success
         window.mapData = [ // Map where enemy is blocked
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ];
        window.GRID_WIDTH = 3; window.GRID_HEIGHT = 3;
        const enemy = { id: 'E1', row: 1, col: 1, hp: 15, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } };
        window.enemies.push(enemy);
        window.player.row = 0; window.player.col = 0; // Player out of the way (mock handles visibility)

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
            // originalLog(message, cssClass); // Optional: keep logging if desired
        };


        // Act
        handleExploringState(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Enemy should remain in EXPLORING state');
        assert.strictEqual(enemy.row, originalRow, 'Enemy row should not change when blocked');
        assert.strictEqual(enemy.col, originalCol, 'Enemy col should not change when blocked');
        assert.ok(waitBlockedMessageLogged, 'Game.logMessage should have been called with "waits (no moves)"');

         // Restore original log mock
         Game.logMessage = originalLog;
    });


    // Add more tests for edge cases:
    // - Enemy at edge of map
    // - Enemy detection range variations
    // - Multiple enemies/resources nearby
    // - LOS blocked scenarios

});
