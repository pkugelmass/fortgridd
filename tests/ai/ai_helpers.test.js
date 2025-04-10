console.log("ai_helpers.test.js loaded");

QUnit.module('AI Helper Functions', function(hooks) {
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
        window.PLAYER_START_AMMO = 10; // Added default
        window.PLAYER_START_MEDKITS = 1; // Added default
        window.HEAL_AMOUNT = 5; // Example heal amount for tests

        // --- Mock AI Helper Functions ---
        // Default mocks (can be overridden in specific tests)
        window.findNearestVisibleEnemy = function(unit) { return null; };
        window.findNearbyResource = function(unit, range, type) { return null; };
        window.getSafeZoneCenter = function() { return { row: Math.floor(GRID_HEIGHT / 2), col: Math.floor(GRID_WIDTH / 2) }; };
        window.moveTowards = function(unit, targetRow, targetCol, reason) { return false; };
        window.moveRandomly = function(unit) { return false; };
        window.traceLine = function(startRow, startCol, endRow, endCol) { return true; };
        window.isCellOccupied = function(row, col, excludeUnitId = null) { return false; };
        // Mock hasClearLineOfSight needed for isMoveSafe tests
        window.hasClearLineOfSight = function(unit, target, range) { return true; }; // Default: assume clear LOS
    });

    // --- useMedkit Helper Tests ---

    QUnit.test('useMedkit: Decrements medkits and increases HP', function(assert) {
        // Arrange
        const enemy = { id: 'E1', hp: 5, maxHp: 15, resources: { ammo: 1, medkits: 2 } };

        // Act
        useMedkit(enemy); // Call the actual helper

        // Assert
        assert.strictEqual(enemy.resources.medkits, 1, "Medkits should decrement by 1");
        assert.strictEqual(enemy.hp, 5 + HEAL_AMOUNT, "HP should increase by HEAL_AMOUNT");
    });

    QUnit.test('useMedkit: HP is capped at maxHp', function(assert) {
        // Arrange
        const enemy = { id: 'E1', hp: 13, maxHp: 15, resources: { ammo: 1, medkits: 1 } }; // HP close to max
        window.HEAL_AMOUNT = 5; // Ensure heal amount would exceed max

        // Act
        useMedkit(enemy); // Call the actual helper

        // Assert
        assert.strictEqual(enemy.resources.medkits, 0, "Medkits should decrement by 1");
        // Assuming HEAL_AMOUNT is 5, 13 + 5 = 18, capped at 15
        assert.strictEqual(enemy.hp, 15, "HP should be capped at maxHp (15)");
    });

     QUnit.test('useMedkit: Handles enemy with defined maxHp property', function(assert) {
        // Arrange
        const enemy = { id: 'E1', hp: 18, maxHp: 20, resources: { ammo: 1, medkits: 1 } }; // Different maxHp
        window.HEAL_AMOUNT = 5;

        // Act
        useMedkit(enemy); // Call the actual helper

        // Assert
        assert.strictEqual(enemy.resources.medkits, 0, "Medkits should decrement by 1");
        // Assuming HEAL_AMOUNT is 5, 18 + 5 = 23, capped at 20
        assert.strictEqual(enemy.hp, 20, "HP should be capped at enemy specific maxHp (20)");
    });

    QUnit.test('useMedkit: Does nothing if medkits is 0', function(assert) {
        // Arrange
        const enemy = { id: 'E1', hp: 5, maxHp: 15, resources: { ammo: 1, medkits: 0 } };

        // Act
        useMedkit(enemy); // Call the actual helper

        // Assert
        assert.strictEqual(enemy.resources.medkits, 0, "Medkits should remain 0");
        assert.strictEqual(enemy.hp, 5, "HP should not change");
    });

    // --- isMoveSafe Helper Tests ---

    QUnit.test('isMoveSafe: Returns true when no threats are nearby/visible', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, targetEnemy: null, resources: { ammo: 1, medkits: 1 } };
        window.enemies = [enemy]; // Only self
        window.player = { id: 'Player', row: 4, col: 4, hp: 10 }; // Player far away

        // Mock LOS to ensure player isn't visible even if technically in range
        window.hasClearLineOfSight = function(unit, target, range) { return false; };

        // Act
        const result = isMoveSafe(enemy, 1, 2); // Check move to adjacent cell

        // Assert
        assert.true(result, "Move should be safe when no threats are visible nearby");
    });

    QUnit.test('isMoveSafe: Returns false when moving adjacent to a visible non-target enemy', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, targetEnemy: null, resources: { ammo: 1, medkits: 1 } };
        const otherEnemy = { id: 'E2', row: 0, col: 2, hp: 10 }; // Other enemy adjacent (0,2) to target move (1,2)
        window.enemies = [enemy, otherEnemy];
        window.player = { id: 'Player', row: 4, col: 4, hp: 10 }; // Player far away

        // Mock LOS: Enemy can see otherEnemy
        window.hasClearLineOfSight = function(unit, target, range) {
            return unit === enemy && target === otherEnemy;
        };

        // Act
        const result = isMoveSafe(enemy, 1, 2); // Check move adjacent to otherEnemy

        // Assert
        assert.false(result, "Move should be unsafe when adjacent to a visible non-target enemy");
    });

     QUnit.test('isMoveSafe: Returns false when moving adjacent to a visible player (not primary target)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, targetEnemy: null, resources: { ammo: 1, medkits: 1 } };
        window.enemies = [enemy];
        window.player = { id: 'Player', row: 1, col: 3, hp: 10 }; // Player adjacent (1,3) to target move (1,2)

        // Mock LOS: Enemy can see player
        window.hasClearLineOfSight = function(unit, target, range) {
            return unit === enemy && target === window.player;
        };

        // Act
        const result = isMoveSafe(enemy, 1, 2); // Check move adjacent to player

        // Assert
        assert.false(result, "Move should be unsafe when adjacent to a visible player");
    });

    QUnit.test('isMoveSafe: Returns true when moving adjacent to an *invisible* enemy', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, targetEnemy: null, resources: { ammo: 1, medkits: 1 } };
        const otherEnemy = { id: 'E2', row: 1, col: 3, hp: 10 }; // Other enemy adjacent to target move (1,2)
        window.enemies = [enemy, otherEnemy];
        window.player = { id: 'Player', row: 4, col: 4, hp: 10 };

        // Mock LOS: Enemy CANNOT see otherEnemy
        window.hasClearLineOfSight = function(unit, target, range) {
            return false; // No LOS to anything
        };

        // Act
        const result = isMoveSafe(enemy, 1, 2); // Check move adjacent to otherEnemy

        // Assert
        assert.true(result, "Move should be safe when adjacent enemy is not visible");
    });

    QUnit.test('isMoveSafe: Returns true when moving adjacent to the primary target', function(assert) {
        // Arrange
        const primaryTarget = { id: 'E2', row: 1, col: 3, hp: 10 }; // Primary target adjacent to move (1,2)
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_ENGAGING_ENEMY, detectionRange: 5, targetEnemy: primaryTarget, resources: { ammo: 1, medkits: 1 } };
        window.enemies = [enemy, primaryTarget];
        window.player = { id: 'Player', row: 4, col: 4, hp: 10 };

        // Mock LOS: Enemy can see primary target (doesn't strictly matter for the logic, but realistic)
        window.hasClearLineOfSight = function(unit, target, range) {
            return unit === enemy && target === primaryTarget;
        };

        // Act
        const result = isMoveSafe(enemy, 1, 2); // Check move adjacent to primary target

        // Assert
        assert.true(result, "Move should be safe when adjacent unit is the primary target");
    });

     QUnit.test('isMoveSafe: Returns true when moving adjacent to a dead enemy', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, targetEnemy: null, resources: { ammo: 1, medkits: 1 } };
        const deadEnemy = { id: 'E2', row: 1, col: 3, hp: 0 }; // Dead enemy adjacent to target move (1,2)
        window.enemies = [enemy, deadEnemy];
        window.player = { id: 'Player', row: 4, col: 4, hp: 10 };

        // Mock LOS: Assume enemy can see the location
        window.hasClearLineOfSight = function(unit, target, range) {
             return unit === enemy && target === deadEnemy; // Assume visible for test setup simplicity
        };

        // Act
        const result = isMoveSafe(enemy, 1, 2); // Check move adjacent to dead enemy

        // Assert
        assert.true(result, "Move should be safe when adjacent unit is dead");
    });

     QUnit.test('isMoveSafe: Returns true when moving adjacent to self (theoretical)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, targetEnemy: null, resources: { ammo: 1, medkits: 1 } };
        window.enemies = [enemy];
        window.player = { id: 'Player', row: 4, col: 4, hp: 10 };

        // Mock LOS: Assume enemy can see self (doesn't matter for logic)
        window.hasClearLineOfSight = function(unit, target, range) { return true; };

        // Act
        const result = isMoveSafe(enemy, 0, 1); // Check move adjacent to original position (0,1) is adjacent to (1,1)

        // Assert
        assert.true(result, "Move should be safe when the only adjacent unit is self");
    });

});
