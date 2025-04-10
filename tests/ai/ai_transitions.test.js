console.log("ai_transitions.test.js loaded");

QUnit.module('AI State Transitions (performReevaluation)', function(hooks) {
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

        // --- Mock AI Helper Functions ---
        window.findNearestVisibleEnemy = function(unit) { return null; };
        window.findNearbyResource = function(unit, range, type) { return null; };
        window.getSafeZoneCenter = function() { return { row: Math.floor(GRID_HEIGHT / 2), col: Math.floor(GRID_WIDTH / 2) }; };
        window.moveTowards = function(unit, targetRow, targetCol, reason) { return false; };
        window.moveRandomly = function(unit) { return false; };
        window.traceLine = function(startRow, startCol, endRow, endCol) { return true; };
        window.isCellOccupied = function(row, col, excludeUnitId = null) { return false; };
        window.hasClearLineOfSight = function(unit, target, range) { return true; };
    });

    // --- performReevaluation Transition Tests ---

    QUnit.test('performReevaluation: Transition to FLEEING (Threat + Critical HP)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 3, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 1 } }; // Critical HP
        window.enemies.push(enemy);
        window.player.row = 1; window.player.col = 2; // Player nearby

        window.findNearestVisibleEnemy = function(unit) { return window.player; }; // Threat found

        // Act
        performReevaluation(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_FLEEING, 'State should be FLEEING');
    });

     QUnit.test('performReevaluation: Transition to ENGAGING_ENEMY (Threat + Sufficient HP)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 1 } }; // Sufficient HP
        window.enemies.push(enemy);
        window.player.row = 1; window.player.col = 2; // Player nearby

        window.findNearestVisibleEnemy = function(unit) { return window.player; }; // Threat found

        // Act
        performReevaluation(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_ENGAGING_ENEMY, 'State should be ENGAGING_ENEMY');
    });

    QUnit.test('performReevaluation: Transition to HEALING (No Threat + Low HP + Has Medkit)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 4, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 1 } }; // Low HP (4/15 ~ 26% < 50% threshold), has medkit
        window.enemies.push(enemy);

        window.findNearestVisibleEnemy = function(unit) { return null; }; // NO Threat

        // Act
        performReevaluation(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_HEALING, 'State should be HEALING');
    });

     QUnit.test('performReevaluation: NO Transition to HEALING (No Threat + Low HP + NO Medkit)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 4, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } }; // Low HP, NO medkit
        window.enemies.push(enemy);

        window.findNearestVisibleEnemy = function(unit) { return null; }; // NO Threat
        // Mock finding a resource to ensure it doesn't heal but seeks instead
        const medkitCoords = { row: 0, col: 1 };
        window.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT;
        window.findNearbyResource = function(unit, range, type) {
            if (type === TILE_MEDKIT) return medkitCoords;
            return null;
        };


        // Act
        performReevaluation(enemy);

        // Assert
        // It should seek the medkit because HP is below AI_HEAL_PRIORITY_THRESHOLD (4/15=26% < 50%)
        assert.strictEqual(enemy.state, AI_STATE_SEEKING_RESOURCES, 'State should be SEEKING_RESOURCES (not HEALING)');
    });

     QUnit.test('performReevaluation: NO Transition to HEALING (No Threat + Sufficient HP + Has Medkit)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 10, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 1 } }; // Sufficient HP (10/15 ~ 66% > 50% threshold), has medkit
        window.enemies.push(enemy);

        window.findNearestVisibleEnemy = function(unit) { return null; }; // NO Threat
        window.findNearbyResource = function(unit, range, type) { return null; }; // No resources needed

        // Act
        performReevaluation(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'State should be EXPLORING (not HEALING)');
    });

     QUnit.test('performReevaluation: Transition to SEEKING_RESOURCES (No Threat, Low HP, No Medkit, Resource Visible)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 6, maxHp: 15, state: AI_STATE_EXPLORING, detectionRange: 5, resources: { ammo: 1, medkits: 0 } }; // Low HP (6/15 = 40% < 50% heal threshold), no medkit
        window.enemies.push(enemy);
        const medkitCoords = { row: 0, col: 1 };
        window.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT;

        window.findNearestVisibleEnemy = function(unit) { return null; }; // NO Threat
        window.findNearbyResource = function(unit, range, type) {
            if (type === TILE_MEDKIT) return medkitCoords;
            return null;
        };

        // Act
        performReevaluation(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_SEEKING_RESOURCES, 'State should be SEEKING_RESOURCES');
        assert.deepEqual(enemy.targetResourceCoords, medkitCoords, 'Target should be the visible medkit');
    });

     QUnit.test('performReevaluation: Transition to EXPLORING (Default - No Threat, Sufficient HP, No Resources Needed/Visible)', function(assert) {
        // Arrange
        const enemy = { id: 'E1', row: 1, col: 1, hp: 15, maxHp: 15, state: AI_STATE_FLEEING, detectionRange: 5, resources: { ammo: 1, medkits: 1 } }; // Start in non-exploring state
        window.enemies.push(enemy);

        window.findNearestVisibleEnemy = function(unit) { return null; }; // NO Threat
        window.findNearbyResource = function(unit, range, type) { return null; }; // No resources

        // Act
        performReevaluation(enemy);

        // Assert
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'State should default to EXPLORING');
    });

});
