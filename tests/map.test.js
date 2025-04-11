console.log("map.test.js loaded");

QUnit.module('Map Generation (map.js)', function(hooks) {

    // Use central helpers for constants like TILE_WALL, TILE_LAND, TILE_BOUNDARY etc.
    hooks.before(function() {
        setupTestConstants();
    });

    hooks.after(function() {
        cleanupTestConstants();
    });

    QUnit.module('countWallNeighbours', function() {
        QUnit.test('Counts walls correctly in various scenarios', function(assert) {
            const H = 5, W = 5; // Grid dimensions for tests
            const WALL = TILE_WALL;
            const LAND = TILE_LAND;
            // Note: TILE_BOUNDARY is treated like a wall by the logic when checking neighbours of inner cells

            // Scenario 1: Center cell, surrounded by land
            const grid1 = [
                [WALL, WALL, WALL, WALL, WALL],
                [WALL, LAND, LAND, LAND, WALL],
                [WALL, LAND, LAND, LAND, WALL], // Target (2,2)
                [WALL, LAND, LAND, LAND, WALL],
                [WALL, WALL, WALL, WALL, WALL]
            ];
            assert.equal(countWallNeighbours(grid1, 2, 2, H, W, WALL), 0, 'Center cell, 0 wall neighbours');

            // Scenario 2: Center cell, surrounded by walls
            const grid2 = [
                [WALL, WALL, WALL, WALL, WALL],
                [WALL, WALL, WALL, WALL, WALL],
                [WALL, WALL, LAND, WALL, WALL], // Target (2,2)
                [WALL, WALL, WALL, WALL, WALL],
                [WALL, WALL, WALL, WALL, WALL]
            ];
            assert.equal(countWallNeighbours(grid2, 2, 2, H, W, WALL), 8, 'Center cell, 8 wall neighbours');

            // Scenario 3: Corner cell (inner corner, e.g., 1,1)
            const grid3 = [
                [WALL, WALL, WALL, WALL, WALL],
                [WALL, LAND, LAND, LAND, WALL], // Target (1,1)
                [WALL, LAND, LAND, LAND, WALL],
                [WALL, LAND, LAND, LAND, WALL],
                [WALL, WALL, WALL, WALL, WALL]
            ];
             // Neighbours: (0,0)W, (0,1)W, (0,2)W, (1,0)W, (1,2)L, (2,0)W, (2,1)L, (2,2)L -> 5 Walls
            assert.equal(countWallNeighbours(grid3, 1, 1, H, W, WALL), 5, 'Inner corner cell (1,1), 5 wall neighbours (incl. bounds)');

             // Scenario 4: Edge cell (inner edge, e.g., 1,2)
            const grid4 = [
                [WALL, WALL, WALL, WALL, WALL],
                [WALL, LAND, LAND, LAND, WALL], // Target (1,2)
                [WALL, LAND, LAND, LAND, WALL],
                [WALL, LAND, LAND, LAND, WALL],
                [WALL, WALL, WALL, WALL, WALL]
            ];
             // Neighbours: (0,1)W, (0,2)W, (0,3)W, (1,1)L, (1,3)L, (2,1)L, (2,2)L, (2,3)L -> 3 Walls
            assert.equal(countWallNeighbours(grid4, 1, 2, H, W, WALL), 3, 'Inner edge cell (1,2), 3 wall neighbours (incl. bounds)');

             // Scenario 5: Mixed neighbours
            const grid5 = [
                [WALL, WALL, WALL, WALL, WALL],
                [WALL, WALL, LAND, WALL, WALL],
                [WALL, LAND, LAND, LAND, WALL], // Target (2,2)
                [WALL, WALL, LAND, WALL, WALL],
                [WALL, WALL, WALL, WALL, WALL]
            ];
             // Neighbours: (1,1)W, (1,2)L, (1,3)W, (2,1)L, (2,3)L, (3,1)W, (3,2)L, (3,3)W -> 4 Walls
            assert.equal(countWallNeighbours(grid5, 2, 2, H, W, WALL), 4, 'Center cell, 4 wall neighbours');
        });
    });

    QUnit.module('createMapData', function() {
        QUnit.test('Generates map with correct dimensions', function(assert) {
            const config = { GRID_WIDTH: 30, GRID_HEIGHT: 20 };
            const mapData = createMapData(config);

            assert.strictEqual(mapData.length, config.GRID_HEIGHT, `Map should have ${config.GRID_HEIGHT} rows`);
            assert.ok(mapData.every(row => Array.isArray(row) && row.length === config.GRID_WIDTH), `Every row should have ${config.GRID_WIDTH} columns`);
        });

        QUnit.test('Generates map with boundary walls', function(assert) {
            const config = { GRID_WIDTH: 15, GRID_HEIGHT: 10, TILE_BOUNDARY: TILE_BOUNDARY }; // Pass TILE_BOUNDARY from setup
            const mapData = createMapData(config);
            const H = config.GRID_HEIGHT;
            const W = config.GRID_WIDTH;

            let bordersAreCorrect = true;
            for (let r = 0; r < H; r++) {
                for (let c = 0; c < W; c++) {
                    if (r === 0 || r === H - 1 || c === 0 || c === W - 1) {
                        if (mapData[r][c] !== TILE_BOUNDARY) {
                            bordersAreCorrect = false;
                            console.error(`Border cell (${r},${c}) is ${mapData[r][c]}, expected ${TILE_BOUNDARY}`);
                            break;
                        }
                    }
                }
                if (!bordersAreCorrect) break;
            }
            assert.ok(bordersAreCorrect, 'All border cells should be TILE_BOUNDARY');
        });

         QUnit.test('Generates map with valid inner tile types', function(assert) {
            const config = { GRID_WIDTH: 20, GRID_HEIGHT: 20 }; // Use default tile types from setup
            const mapData = createMapData(config);
            const H = config.GRID_HEIGHT;
            const W = config.GRID_WIDTH;
            const validTileTypes = [TILE_LAND, TILE_WALL, TILE_TREE, TILE_MEDKIT, TILE_AMMO];

            let allInnerTilesValid = true;
            for (let r = 1; r < H - 1; r++) {
                for (let c = 1; c < W - 1; c++) {
                    const tile = mapData[r][c];
                    if (typeof tile !== 'number' || !validTileTypes.includes(tile)) {
                         allInnerTilesValid = false;
                         console.error(`Invalid inner tile type at (${r},${c}): ${tile}`);
                         break;
                    }
                }
                 if (!allInnerTilesValid) break;
            }
            assert.ok(allInnerTilesValid, 'All inner cells should contain valid tile type numbers');
        });

         QUnit.test('Generates map containing some land and walls internally', function(assert) {
            const config = { GRID_WIDTH: 30, GRID_HEIGHT: 30, INITIAL_WALL_CHANCE: 0.5, CA_ITERATIONS: 4 }; // Ensure reasonable chance for both
            const mapData = createMapData(config);
            const H = config.GRID_HEIGHT;
            const W = config.GRID_WIDTH;

            let foundLand = false;
            let foundWall = false;
            for (let r = 1; r < H - 1; r++) {
                for (let c = 1; c < W - 1; c++) {
                    if (mapData[r][c] === TILE_LAND) foundLand = true;
                    if (mapData[r][c] === TILE_WALL) foundWall = true;
                }
                 if (foundLand && foundWall) break; // Optimization
            }
            assert.ok(foundLand, 'Generated map should contain at least one inner land tile');
            assert.ok(foundWall, 'Generated map should contain at least one inner wall tile');
        });

        QUnit.test('Handles null or empty config object gracefully', function(assert) {
             // Test with null config
             let mapDataNull = null;
             try {
                 mapDataNull = createMapData(null);
             } catch (e) {
                 assert.notOk(true, `createMapData(null) threw an error: ${e}`);
             }
             assert.ok(Array.isArray(mapDataNull) && mapDataNull.length > 0 && Array.isArray(mapDataNull[0]) && mapDataNull[0].length > 0,
                       'createMapData(null) should return a valid map using defaults');

             // Test with empty config object
             let mapDataEmpty = null;
             try {
                 mapDataEmpty = createMapData({});
             } catch (e) {
                 assert.notOk(true, `createMapData({}) threw an error: ${e}`);
             }
             assert.ok(Array.isArray(mapDataEmpty) && mapDataEmpty.length > 0 && Array.isArray(mapDataEmpty[0]) && mapDataEmpty[0].length > 0,
                       'createMapData({}) should return a valid map using defaults');
        });

    });

});
