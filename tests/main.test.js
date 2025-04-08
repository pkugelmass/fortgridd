console.log("tests/main.test.js loaded");

QUnit.module('main.js tests', function(hooks) {
    let originalMapData; // To store original mapData if we modify it

    // Setup function to run before each test in this module
    hooks.beforeEach(function() {
        // Store original mapData and create a simple mock map for testing
        // Assumes config.js constants like TILE_LAND, TILE_WALL are loaded
        originalMapData = typeof mapData !== 'undefined' ? mapData : undefined;
        mapData = [
            [TILE_WALL, TILE_WALL, TILE_WALL, TILE_WALL],
            [TILE_WALL, TILE_LAND, TILE_LAND, TILE_WALL],
            [TILE_WALL, TILE_LAND, TILE_LAND, TILE_WALL],
            [TILE_WALL, TILE_WALL, TILE_WALL, TILE_WALL]
        ];
        // Mock GRID_WIDTH/HEIGHT if not globally available or use config values
        // Assuming config.js is loaded, GRID_WIDTH/HEIGHT should be available
        // If not, mock them: e.g., window.GRID_WIDTH = 4; window.GRID_HEIGHT = 4;
    });

    // Teardown function to run after each test
    hooks.afterEach(function() {
        // Restore original mapData
        mapData = originalMapData;
        // Clean up mocked globals if any
        // delete window.GRID_WIDTH; delete window.GRID_HEIGHT;
    });

    // --- Tests for createAndPlaceEnemy ---

    QUnit.test('createAndPlaceEnemy - successful placement', function(assert) {
        assert.expect(2); // Expecting 2 assertions

        const occupiedCoords = [];
        const enemy = createAndPlaceEnemy(0, occupiedCoords);

        assert.ok(enemy !== null, 'Should return an enemy object when space is available');
        assert.ok(typeof enemy === 'object', 'Returned value should be an object');
    });

    QUnit.test('createAndPlaceEnemy - properties and initial values', function(assert) {
        assert.expect(11); // Number of assertions

        const occupiedCoords = [];
        const enemy = createAndPlaceEnemy(0, occupiedCoords);

        assert.ok(enemy !== null, 'Enemy object should be created');
        assert.ok(enemy.hasOwnProperty('id'), 'Enemy should have an id property');
        assert.ok(enemy.hasOwnProperty('row') && typeof enemy.row === 'number', 'Enemy should have a numeric row property');
        assert.ok(enemy.hasOwnProperty('col') && typeof enemy.col === 'number', 'Enemy should have a numeric col property');
        assert.ok(enemy.hasOwnProperty('hp') && typeof enemy.hp === 'number', 'Enemy should have a numeric hp property');
        assert.ok(enemy.hasOwnProperty('maxHp') && typeof enemy.maxHp === 'number', 'Enemy should have a numeric maxHp property');
        assert.ok(enemy.hasOwnProperty('detectionRange') && typeof enemy.detectionRange === 'number', 'Enemy should have a numeric detectionRange property');
        assert.ok(enemy.hasOwnProperty('resources') && typeof enemy.resources === 'object', 'Enemy should have a resources object');
        assert.strictEqual(enemy.state, AI_STATE_EXPLORING, 'Initial state should be EXPLORING');
        assert.strictEqual(enemy.targetEnemy, null, 'Initial targetEnemy should be null');
        assert.strictEqual(enemy.targetResourceCoords, null, 'Initial targetResourceCoords should be null');
    });

    QUnit.test('createAndPlaceEnemy - stat ranges', function(assert) {
        assert.expect(4); // Number of assertions

        const occupiedCoords = [];
        const enemy = createAndPlaceEnemy(0, occupiedCoords);
        assert.ok(enemy !== null, 'Enemy object should be created');

        // Check HP range (using constants from config.js)
        assert.ok(enemy.hp >= AI_HP_MIN && enemy.hp <= AI_HP_MAX, `HP (${enemy.hp}) should be between ${AI_HP_MIN} and ${AI_HP_MAX}`);
        // Check Detection Range
        assert.ok(enemy.detectionRange >= AI_RANGE_MIN && enemy.detectionRange <= AI_RANGE_MAX, `Detection Range (${enemy.detectionRange}) should be between ${AI_RANGE_MIN} and ${AI_RANGE_MAX}`);
        // Check Ammo Range
        assert.ok(enemy.resources.ammo >= AI_AMMO_MIN && enemy.resources.ammo <= AI_AMMO_MAX, `Ammo (${enemy.resources.ammo}) should be between ${AI_AMMO_MIN} and ${AI_AMMO_MAX}`);
        // Medkits should match config start value (implicitly tested in properties test, but can add here if desired)
        // assert.strictEqual(enemy.resources.medkits, AI_START_MEDKITS, `Medkits should be ${AI_START_MEDKITS}`);
    });

     QUnit.test('createAndPlaceEnemy - occupiedCoords update', function(assert) {
        assert.expect(3); // Number of assertions

        const occupiedCoords = [];
        const enemy = createAndPlaceEnemy(0, occupiedCoords);

        assert.ok(enemy !== null, 'Enemy object should be created');
        assert.strictEqual(occupiedCoords.length, 1, 'occupiedCoords array should contain one entry');
        assert.deepEqual(occupiedCoords[0], { row: enemy.row, col: enemy.col }, 'occupiedCoords entry should match enemy position');
    });

    QUnit.test('createAndPlaceEnemy - placement failure (no space)', function(assert) {
        assert.expect(1); // Number of assertions

        // Make all land tiles occupied
        const occupiedCoords = [ {row: 1, col: 1}, {row: 1, col: 2}, {row: 2, col: 1}, {row: 2, col: 2} ];
        const enemy = createAndPlaceEnemy(0, occupiedCoords);

        assert.strictEqual(enemy, null, 'Should return null when no valid placement position is found');
    });

    // --- Add other tests for main.js functions as needed ---

});
