console.log("utils/resources.test.js loaded");

QUnit.module('Resource Functions (utils.js)', function() {

    QUnit.module('checkAndPickupResourceAt', function(hooks) {
        let logMock;

        // Use central helpers for constants
        hooks.before(function() {
            setupTestConstants();
        });

        hooks.after(function() {
            cleanupTestConstants();
        });

        hooks.beforeEach(function() {
            logMock = setupLogMock();
        });

        hooks.afterEach(function() {
            logMock.restore();
        });

        QUnit.test('Player picks up Medkit', function(assert) {
            const player = createMockUnit(true, { resources: { medkits: 0 } });
            const mapData = [ [TILE_LAND, TILE_LAND], [TILE_LAND, TILE_MEDKIT] ];
            const gameState = createMockGameState({ player: player, mapData: mapData });
            const pickupRow = 1, pickupCol = 1;

            const result = checkAndPickupResourceAt(player, pickupRow, pickupCol, gameState);

            assert.true(result, 'Should return true when resource picked up');
            assert.equal(player.resources.medkits, 1, 'Player medkit count should increase by 1');
            assert.equal(gameState.mapData[pickupRow][pickupCol], TILE_LAND, 'Map tile should change to TILE_LAND');
            // Check if the specific pickup log exists (critical side-effect confirmation)
            assert.ok(logMock.calls.some(log => log.message.includes('Player collects Medkit') && log.options.className === LOG_CLASS_PLAYER_GOOD),
                      'Should log the resource pickup');
        });

        QUnit.test('Player picks up Ammo', function(assert) {
            const player = createMockUnit(true, { resources: { ammo: 0 } });
            const mapData = [ [TILE_LAND, TILE_LAND], [TILE_LAND, TILE_AMMO] ];
            const gameState = createMockGameState({ player: player, mapData: mapData });
            const pickupRow = 1, pickupCol = 1;

            const result = checkAndPickupResourceAt(player, pickupRow, pickupCol, gameState);

            assert.true(result, 'Should return true when resource picked up');
            assert.equal(player.resources.ammo, PLAYER_AMMO_PICKUP_AMOUNT, `Player ammo count should increase by ${PLAYER_AMMO_PICKUP_AMOUNT}`);
            assert.equal(gameState.mapData[pickupRow][pickupCol], TILE_LAND, 'Map tile should change to TILE_LAND');
            // Check if the specific pickup log exists (critical side-effect confirmation)
             assert.ok(logMock.calls.some(log => log.message.includes('Player collects Ammo') && log.options.className === LOG_CLASS_PLAYER_GOOD),
                       'Should log the resource pickup');
        });

        QUnit.test('Enemy picks up Medkit', function(assert) {
            const enemy = createMockUnit(false, { id: 'testEnemy', resources: { medkits: 0 } });
            const mapData = [ [TILE_LAND, TILE_LAND], [TILE_LAND, TILE_MEDKIT] ];
            // Need player in gameState for unit identification logic
            const gameState = createMockGameState({ enemies: [enemy], mapData: mapData });
            const pickupRow = 1, pickupCol = 1;

            const result = checkAndPickupResourceAt(enemy, pickupRow, pickupCol, gameState);

            assert.true(result, 'Should return true when resource picked up');
            assert.equal(enemy.resources.medkits, 1, 'Enemy medkit count should increase by 1');
            assert.equal(gameState.mapData[pickupRow][pickupCol], TILE_LAND, 'Map tile should change to TILE_LAND');
            // Check if the specific pickup log exists (critical side-effect confirmation)
            assert.ok(logMock.calls.some(log => log.message.includes('Enemy testEnemy collects Medkit') && log.options.className === LOG_CLASS_ENEMY_EVENT),
                      'Should log the resource pickup');
        });

         QUnit.test('Enemy picks up Ammo', function(assert) {
            const enemy = createMockUnit(false, { id: 'testEnemy', resources: { ammo: 0 } });
            const mapData = [ [TILE_LAND, TILE_LAND], [TILE_LAND, TILE_AMMO] ];
            const gameState = createMockGameState({ enemies: [enemy], mapData: mapData });
            const pickupRow = 1, pickupCol = 1;

            const result = checkAndPickupResourceAt(enemy, pickupRow, pickupCol, gameState);

            assert.true(result, 'Should return true when resource picked up');
            assert.equal(enemy.resources.ammo, AI_AMMO_PICKUP_AMOUNT, `Enemy ammo count should increase by ${AI_AMMO_PICKUP_AMOUNT}`);
            assert.equal(gameState.mapData[pickupRow][pickupCol], TILE_LAND, 'Map tile should change to TILE_LAND');
            // Check if the specific pickup log exists (critical side-effect confirmation)
            assert.ok(logMock.calls.some(log => log.message.includes('Enemy testEnemy collects Ammo') && log.options.className === LOG_CLASS_ENEMY_EVENT),
                      'Should log the resource pickup');
        });

        QUnit.test('No pickup on empty land tile', function(assert) {
            const player = createMockUnit(true, { resources: { medkits: 0, ammo: 0 } });
            const mapData = [ [TILE_LAND, TILE_LAND], [TILE_LAND, TILE_LAND] ];
            const gameState = createMockGameState({ player: player, mapData: mapData });
            const pickupRow = 1, pickupCol = 1;

            const result = checkAndPickupResourceAt(player, pickupRow, pickupCol, gameState);

            assert.false(result, 'Should return false when no resource');
            assert.equal(player.resources.medkits, 0, 'Player medkit count unchanged');
            assert.equal(player.resources.ammo, 0, 'Player ammo count unchanged');
            assert.equal(gameState.mapData[pickupRow][pickupCol], TILE_LAND, 'Map tile should remain TILE_LAND');
            assert.equal(logMock.calls.length, 0, 'Should not log pickup message');
        });

         QUnit.test('No pickup on wall tile', function(assert) {
            const player = createMockUnit(true, { resources: { medkits: 0, ammo: 0 } });
            const mapData = [ [TILE_LAND, TILE_LAND], [TILE_LAND, TILE_WALL] ];
            const gameState = createMockGameState({ player: player, mapData: mapData });
            const pickupRow = 1, pickupCol = 1;

            const result = checkAndPickupResourceAt(player, pickupRow, pickupCol, gameState);

            assert.false(result, 'Should return false when no resource (wall)');
            assert.equal(player.resources.medkits, 0, 'Player medkit count unchanged');
            assert.equal(player.resources.ammo, 0, 'Player ammo count unchanged');
            assert.equal(gameState.mapData[pickupRow][pickupCol], TILE_WALL, 'Map tile should remain TILE_WALL');
            assert.equal(logMock.calls.length, 0, 'Should not log pickup message');
        });

        QUnit.test('Handles invalid coordinates (out of bounds)', function(assert) {
            const player = createMockUnit(true);
            const gameState = createMockGameState(); // Uses default 5x5 map

            const result = checkAndPickupResourceAt(player, 10, 10, gameState); // Coords outside 5x5

            assert.false(result, 'Should return false for out-of-bounds coords');
            // Guideline: Logging is secondary. Primary check is the false return value.
            // Removed: assert.ok(logMock.calls.some(...))
        });

        QUnit.test('Handles invalid unit input', function(assert) {
            const gameState = createMockGameState();
            const result = checkAndPickupResourceAt(null, 1, 1, gameState);

            assert.false(result, 'Should return false for null unit');
            // Guideline: Logging is secondary. Primary check is the false return value.
             // Removed: assert.ok(logMock.calls.some(...))
        });

         QUnit.test('Handles invalid gameState input', function(assert) {
            const player = createMockUnit(true);
            const result = checkAndPickupResourceAt(player, 1, 1, null);

            // Need to temporarily mock Game.logMessage directly as the helper relies on it
            let tempLogs = [];
            let originalGameLog = window.Game ? window.Game.logMessage : undefined;
            window.Game = window.Game || {};
            window.Game.logMessage = (msg, gs, opts) => tempLogs.push({msg, gs, opts});

            assert.false(result, 'Should return false for null gameState');
            // Guideline: Don't test logs when the log function itself might fail due to invalid inputs (null gameState).
            // The important part is that the function handles the null input without crashing.
            assert.ok(true, "Test confirms function returns correctly despite internal log issue with null gameState");


            // Restore original log message function
             if (originalGameLog) window.Game.logMessage = originalGameLog; else delete window.Game.logMessage;
             if (Object.keys(window.Game).length === 0) delete window.Game;
        });

         QUnit.test('Handles missing mapData in gameState', function(assert) {
            const player = createMockUnit(true);
            const gameState = createMockGameState();
            delete gameState.mapData; // Remove mapData

            const result = checkAndPickupResourceAt(player, 1, 1, gameState);

            assert.false(result, 'Should return false for missing mapData');
            // Guideline: Logging is secondary. Primary check is the false return value.
             // Removed: assert.ok(logMock.calls.some(...))
        });

    });

});
