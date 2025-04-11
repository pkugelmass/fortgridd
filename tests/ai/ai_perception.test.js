console.log("ai_perception.test.js loaded");

QUnit.module('AI Perception Logic (ai_perception.js)', function(hooks) {

    // Use central helpers for constants
    hooks.before(function() {
        setupTestConstants();
        // Add specific constants if needed, e.g., AI_RANGE_MAX if not in MOCKED_CONSTANTS
        if (typeof window.AI_RANGE_MAX === 'undefined') {
            window.AI_RANGE_MAX = 10; // Default fallback if not mocked
        }
    });

    hooks.after(function() {
        cleanupTestConstants();
        delete window.AI_RANGE_MAX; // Clean up added constant
    });

    // --- Mocks & Setup ---
    let mockGameState;
    let mockEnemy;
    let mockPlayer;
    let logMock; // Although guidelines deprioritize log testing, setup might be useful for debugging

    hooks.beforeEach(function() {
        logMock = setupLogMock();

        // Basic setup, customize in each test
        mockEnemy = createMockUnit(false, { id: 'enemy1', row: 5, col: 5, detectionRange: 8 });
        mockPlayer = createMockUnit(true, { id: 'player1', row: 1, col: 1 });
        // Use a slightly larger default map for LOS tests
        mockGameState = createMockGameState({
            enemies: [mockEnemy],
            player: mockPlayer,
            gridWidth: 15,
            gridHeight: 15
        });
    });

    hooks.afterEach(function() {
        logMock.restore();
    });

    // --- Tests for hasClearLineOfSight ---
    QUnit.module('hasClearLineOfSight', function() {
        QUnit.test('Clear path within range', function(assert) {
            // Setup: Enemy at 5,5, target at 5,10 (dist 5), range 8. Clear path.
            const target = { row: 5, col: 10 };
            // Ensure path is clear in mock map
            for (let c = mockEnemy.col + 1; c <= target.col; c++) {
                mockGameState.mapData[5][c] = TILE_LAND;
            }

            // Execution & Assertion
            assert.ok(hasClearLineOfSight(mockEnemy, target, mockEnemy.detectionRange, mockGameState), 'Should have clear LOS');
        });

        QUnit.test('Path blocked by wall within range', function(assert) {
            // Setup: Enemy at 5,5, target at 5,10 (dist 5), range 8. Wall at 5,7.
            const target = { row: 5, col: 10 };
            mockGameState.mapData[5][7] = TILE_WALL; // Place wall

            // Execution & Assertion
            assert.notOk(hasClearLineOfSight(mockEnemy, target, mockEnemy.detectionRange, mockGameState), 'Should not have LOS due to wall');
        });

         QUnit.test('Clear path but target out of range', function(assert) {
            // Setup: Enemy at 5,5, target at 5,14 (dist 9), range 8. Clear path.
            const target = { row: 5, col: 14 };
             // Ensure path is clear
             for (let c = mockEnemy.col + 1; c <= target.col; c++) {
                 if (mockGameState.mapData[5]) mockGameState.mapData[5][c] = TILE_LAND;
             }

            // Execution & Assertion
            assert.notOk(hasClearLineOfSight(mockEnemy, target, mockEnemy.detectionRange, mockGameState), 'Should not have LOS because target is out of range');
        });
    });

    // --- Tests for hasClearCardinalLineOfSight ---
    QUnit.module('hasClearCardinalLineOfSight', function() {
        QUnit.test('Clear cardinal path within range', function(assert) {
            // Setup: Enemy 5,5, target 5,10 (dist 5), range 5. Clear path.
            const target = { row: 5, col: 10 };
            const range = 5;
            // Ensure path is clear
            for (let c = mockEnemy.col + 1; c <= target.col; c++) {
                mockGameState.mapData[5][c] = TILE_LAND;
            }

            // Execution & Assertion
            assert.ok(hasClearCardinalLineOfSight(mockEnemy, target, range, mockGameState), 'Should have clear cardinal LOS');
        });

        QUnit.test('Blocked cardinal path within range', function(assert) {
            // Setup: Enemy 5,5, target 5,10 (dist 5), range 5. Wall at 5,7.
            const target = { row: 5, col: 10 };
            const range = 5;
            mockGameState.mapData[5][7] = TILE_WALL; // Place wall

            // Execution & Assertion
            assert.notOk(hasClearCardinalLineOfSight(mockEnemy, target, range, mockGameState), 'Should not have cardinal LOS due to wall');
        });

        QUnit.test('Clear DIAGONAL path within range fails', function(assert) {
            // Setup: Enemy 5,5, target 7,7 (dist 4), range 5. Clear path.
            const target = { row: 7, col: 7 };
            const range = 5;
            // Ensure path is clear (though LOS function doesn't check diagonals for obstacles)
            mockGameState.mapData[6][6] = TILE_LAND;
            mockGameState.mapData[7][7] = TILE_LAND;

            // Execution & Assertion
            assert.notOk(hasClearCardinalLineOfSight(mockEnemy, target, range, mockGameState), 'Should fail because path is diagonal');
        });

         QUnit.test('Clear cardinal path but target out of range', function(assert) {
            // Setup: Enemy 5,5, target 5,11 (dist 6), range 5. Clear path.
            const target = { row: 5, col: 11 };
            const range = 5;
             // Ensure path is clear
             for (let c = mockEnemy.col + 1; c <= target.col; c++) {
                 if (mockGameState.mapData[5]) mockGameState.mapData[5][c] = TILE_LAND;
             }

            // Execution & Assertion
            assert.notOk(hasClearCardinalLineOfSight(mockEnemy, target, range, mockGameState), 'Should fail because target is out of range');
        });
    });

    // --- Tests for findNearestVisibleEnemy ---
    QUnit.module('findNearestVisibleEnemy', function() {
        QUnit.test('Finds player when closer and visible', function(assert) {
            // Setup: Enemy 5,5. Player 5,8 (dist 3). Other enemy 10,10 (dist 10). Range 8.
            mockPlayer.row = 5; mockPlayer.col = 8;
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 10, col: 10 });
            mockGameState.enemies.push(otherEnemy);
            // Ensure paths are clear
            mockGameState.mapData[5][6] = TILE_LAND; mockGameState.mapData[5][7] = TILE_LAND; mockGameState.mapData[5][8] = TILE_LAND;

            // Execution
            const found = findNearestVisibleEnemy(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(found, mockPlayer, 'Should find the player');
        });

        QUnit.test('Finds other enemy when closer and visible', function(assert) {
            // Setup: Enemy 5,5. Player 10,10 (dist 10). Other enemy 5,8 (dist 3). Range 8.
            mockPlayer.row = 10; mockPlayer.col = 10;
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 5, col: 8 });
            mockGameState.enemies.push(otherEnemy);
             // Ensure paths are clear
            mockGameState.mapData[5][6] = TILE_LAND; mockGameState.mapData[5][7] = TILE_LAND; mockGameState.mapData[5][8] = TILE_LAND;

            // Execution
            const found = findNearestVisibleEnemy(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(found, otherEnemy, 'Should find the other enemy');
        });

        QUnit.test('Finds nothing if targets out of range or LOS blocked', function(assert) {
            // Setup: Enemy 5,5. Player 5,14 (dist 9, range 8). Other enemy 7,5 (dist 2), wall at 6,5.
            mockPlayer.row = 5; mockPlayer.col = 14; // Out of range
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 7, col: 5 }); // In range but blocked
            mockGameState.enemies.push(otherEnemy);
            mockGameState.mapData[6][5] = TILE_WALL; // Block LOS to other enemy

            // Execution
            const found = findNearestVisibleEnemy(mockEnemy, mockGameState);

            // Assertion
            assert.strictEqual(found, null, 'Should find nothing due to range/LOS');
        });

        QUnit.test('Finds nothing if all targets are dead', function(assert) {
            // Setup: Enemy 5,5. Player 5,8 (dead). Other enemy 5,7 (dead). Range 8.
            mockPlayer.row = 5; mockPlayer.col = 8; mockPlayer.hp = 0;
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 5, col: 7, hp: 0 });
            mockGameState.enemies.push(otherEnemy);

            // Execution
            const found = findNearestVisibleEnemy(mockEnemy, mockGameState);

            // Assertion
            assert.strictEqual(found, null, 'Should find nothing if all targets are dead');
        });
    });

    // --- Tests for findNearbyResource ---
    QUnit.module('findNearbyResource', function() {
        QUnit.test('Finds nearest correct resource type within range and safe zone', function(assert) {
            // Setup: Enemy 5,5. Medkit at 5,7 (dist 2). Ammo at 5,9 (dist 4). Range 5.
            const medkitCoords = { row: 5, col: 7 };
            const ammoCoords = { row: 5, col: 9 };
            mockGameState.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT;
            mockGameState.mapData[ammoCoords.row][ammoCoords.col] = TILE_AMMO;
            // Ensure path clear
            mockGameState.mapData[5][6] = TILE_LAND; mockGameState.mapData[5][8] = TILE_LAND;

            // Execution
            const foundMedkit = findNearbyResource(mockEnemy, 5, TILE_MEDKIT, mockGameState);
            const foundAmmo = findNearbyResource(mockEnemy, 5, TILE_AMMO, mockGameState);

            // Assertion
            assert.deepEqual(foundMedkit, medkitCoords, 'Should find the nearest medkit');
            assert.deepEqual(foundAmmo, ammoCoords, 'Should find the nearest ammo'); // Finds ammo even though medkit is closer
        });

        QUnit.test('Finds nothing if resource out of range or LOS blocked', function(assert) {
            // Setup: Enemy 5,5. Medkit at 5,11 (dist 6, range 5). Ammo at 7,5 (dist 2), wall at 6,5.
            const medkitCoords = { row: 5, col: 11 };
            const ammoCoords = { row: 7, col: 5 };
            mockGameState.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT; // Out of range
            mockGameState.mapData[ammoCoords.row][ammoCoords.col] = TILE_AMMO; // Blocked
            mockGameState.mapData[6][5] = TILE_WALL; // Wall

            // Execution
            const foundMedkit = findNearbyResource(mockEnemy, 5, TILE_MEDKIT, mockGameState);
            const foundAmmo = findNearbyResource(mockEnemy, 5, TILE_AMMO, mockGameState);

            // Assertion
            assert.strictEqual(foundMedkit, null, 'Should not find medkit out of range');
            assert.strictEqual(foundAmmo, null, 'Should not find ammo blocked by LOS');
        });

        QUnit.test('Finds nothing if resource outside safe zone', function(assert) {
            // Setup: Enemy 5,5. Medkit at 1,1 (within range 5). Safe zone 3-7.
            const medkitCoords = { row: 1, col: 1 };
            mockGameState.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT;
            // Define a smaller safe zone for the test
            mockGameState.safeZone = { minRow: 3, maxRow: 7, minCol: 3, maxCol: 7 };

            // Execution
            const foundMedkit = findNearbyResource(mockEnemy, 5, TILE_MEDKIT, mockGameState);

            // Assertion
            assert.strictEqual(foundMedkit, null, 'Should not find medkit outside safe zone');
        });

        QUnit.test('Finds nothing if tile is not the correct resource type', function(assert) {
            // Setup: Enemy 5,5. Wall at 5,7 (dist 2). Range 5.
            const wallCoords = { row: 5, col: 7 };
            mockGameState.mapData[wallCoords.row][wallCoords.col] = TILE_WALL;

            // Execution
            const foundMedkit = findNearbyResource(mockEnemy, 5, TILE_MEDKIT, mockGameState);

            // Assertion
            assert.strictEqual(foundMedkit, null, 'Should not find a wall when looking for a medkit');
        });
    });

});
