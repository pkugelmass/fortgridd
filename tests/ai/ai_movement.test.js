console.log("ai_movement.test.js loaded");

QUnit.module('AI Movement Logic (ai_movement.js)', function(hooks) {

    // Use central helpers for constants
    hooks.before(function() {
        setupTestConstants();
        // Add specific constants if needed
        if (typeof window.AI_RANGE_MAX === 'undefined') {
            window.AI_RANGE_MAX = 10; // Default fallback if not mocked
        }
    });

    hooks.after(function() {
        cleanupTestConstants();
        delete window.AI_RANGE_MAX;
    });

    // --- Mocks & Setup ---
    let mockGameState;
    let mockEnemy;
    let mockPlayer;
    let logMock;
    let originalUpdateUnitPosition;
    let updateUnitPositionCalledWith; // To track calls

    hooks.beforeEach(function() {
        logMock = setupLogMock();
        updateUnitPositionCalledWith = null; // Reset tracker

        // Basic setup, customize in each test
        mockEnemy = createMockUnit(false, { id: 'mover1', row: 5, col: 5, detectionRange: 8 });
        mockPlayer = createMockUnit(true, { id: 'player1', row: 1, col: 1 });
        // Use a slightly larger default map
        mockGameState = createMockGameState({
            enemies: [mockEnemy],
            player: mockPlayer,
            gridWidth: 15,
            gridHeight: 15
        });

        // Mock updateUnitPosition globally for these tests
        if (typeof window.updateUnitPosition === 'function') {
            originalUpdateUnitPosition = window.updateUnitPosition;
        }
        window.updateUnitPosition = (unit, newRow, newCol, gameState) => {
            // Simple mock: update position and track call details
            unit.row = newRow;
            unit.col = newCol;
            updateUnitPositionCalledWith = { unit, newRow, newCol, gameState };
            // Real function might also handle pickup, etc. - not mocked here
        };

        // Ensure hasClearLineOfSight exists (dependency for isMoveSafe)
        // In a real scenario, it should be loaded, but provide a dummy if needed for isolated testing
        if (typeof window.hasClearLineOfSight === 'undefined') {
             window.hasClearLineOfSight = () => true; // Default mock: always visible
        }
    });

    hooks.afterEach(function() {
        logMock.restore();
        // Restore updateUnitPosition
        if (typeof originalUpdateUnitPosition !== 'undefined') {
            window.updateUnitPosition = originalUpdateUnitPosition;
        } else {
            delete window.updateUnitPosition;
        }
         // Clean up potentially mocked global hasClearLineOfSight
         delete window.hasClearLineOfSight;
    });

    // --- Tests for getValidMoves ---
    QUnit.module('getValidMoves', function() {
        QUnit.test('Finds all adjacent land tiles when open', function(assert) {
            // Setup: Enemy 5,5 on a clear 15x15 map
            const expectedMoves = [
                { row: 4, col: 5 }, { row: 6, col: 5 },
                { row: 5, col: 4 }, { row: 5, col: 6 }
            ];

            // Execution
            const moves = getValidMoves(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(
                moves.sort((a, b) => a.row - b.row || a.col - b.col),
                expectedMoves.sort((a, b) => a.row - b.row || a.col - b.col),
                'All adjacent land tiles are valid moves when open'
            );
        });

        QUnit.test('Does not include tile occupied by player', function(assert) {
            // Place player adjacent to enemy
            mockPlayer.row = 4; mockPlayer.col = 5;
            const moves = getValidMoves(mockEnemy, mockGameState);
            assert.notOk(moves.some(move => move.row === 4 && move.col === 5), 'Tile occupied by player is not a valid move');
        });

        QUnit.test('Does not include tile occupied by another enemy', function(assert) {
            // Place another enemy adjacent to mockEnemy
            const otherEnemy = createMockUnit(false, { id: 'blocker', row: 6, col: 5 });
            mockGameState.enemies.push(otherEnemy);
            const moves = getValidMoves(mockEnemy, mockGameState);
            assert.notOk(moves.some(move => move.row === 6 && move.col === 5), 'Tile occupied by another enemy is not a valid move');
        });
            assert.equal(moves.length, 4, 'Should find exactly 4 moves');
        });

        QUnit.test('Excludes walls', function(assert) {
            // Setup: Enemy 5,5. Wall at 5,6.
            mockGameState.mapData[5][6] = TILE_WALL;
            const expectedMoves = [
                { row: 4, col: 5 }, { row: 6, col: 5 }, { row: 5, col: 4 }
            ];

            // Execution
            const moves = getValidMoves(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(moves.sort((a,b) => a.row - b.row || a.col - b.col),
                             expectedMoves.sort((a,b) => a.row - b.row || a.col - b.col),
                             'Should exclude the wall tile');
             assert.equal(moves.length, 3, 'Should find exactly 3 moves');
        });

        QUnit.test('Excludes occupied tiles (player)', function(assert) {
            // Setup: Enemy 5,5. Player at 4,5.
            mockPlayer.row = 4; mockPlayer.col = 5;
            const expectedMoves = [
                { row: 6, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 6 }
            ];

            // Execution
            const moves = getValidMoves(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(moves.sort((a,b) => a.row - b.row || a.col - b.col),
                             expectedMoves.sort((a,b) => a.row - b.row || a.col - b.col),
                             'Should exclude the player tile');
            assert.equal(moves.length, 3, 'Should find exactly 3 moves');
        });

        QUnit.test('Excludes occupied tiles (other enemy)', function(assert) {
            // Setup: Enemy 5,5. Other enemy at 5,4.
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 5, col: 4 });
            mockGameState.enemies.push(otherEnemy);
             const expectedMoves = [
                { row: 4, col: 5 }, { row: 6, col: 5 }, { row: 5, col: 6 }
            ];

            // Execution
            const moves = getValidMoves(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(moves.sort((a,b) => a.row - b.row || a.col - b.col),
                             expectedMoves.sort((a,b) => a.row - b.row || a.col - b.col),
                             'Should exclude the other enemy tile');
            assert.equal(moves.length, 3, 'Should find exactly 3 moves');
        });

         QUnit.test('Excludes tiles outside safe zone', function(assert) {
            // Setup: Enemy 5,5. Safe zone 5-10. Tile 4,5 is outside.
            mockGameState.safeZone = { minRow: 5, maxRow: 10, minCol: 5, maxCol: 10 };
             const expectedMoves = [
                 { row: 6, col: 5 }, { row: 5, col: 6 } // Only moves within 5-10 range
             ];

            // Execution
            const moves = getValidMoves(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(moves.sort((a,b) => a.row - b.row || a.col - b.col),
                             expectedMoves.sort((a,b) => a.row - b.row || a.col - b.col),
                             'Should exclude tiles outside the safe zone');
             assert.equal(moves.length, 2, 'Should find exactly 2 moves');
        });

        QUnit.test('Includes resource tiles (Medkit/Ammo)', function(assert) {
            // Setup: Enemy 5,5. Medkit 4,5. Ammo 5,6.
            mockGameState.mapData[4][5] = TILE_MEDKIT;
            mockGameState.mapData[5][6] = TILE_AMMO;
            const expectedMoves = [
                { row: 4, col: 5 }, { row: 6, col: 5 },
                { row: 5, col: 4 }, { row: 5, col: 6 }
            ];

            // Execution
            const moves = getValidMoves(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(moves.sort((a,b) => a.row - b.row || a.col - b.col),
                             expectedMoves.sort((a,b) => a.row - b.row || a.col - b.col),
                             'Should include adjacent resource tiles');
            assert.equal(moves.length, 4, 'Should find exactly 4 moves');
        });

        QUnit.test('Returns empty array when completely blocked', function(assert) {
            // Setup: Enemy 5,5. Surrounded by walls.
            mockGameState.mapData[4][5] = TILE_WALL;
            mockGameState.mapData[6][5] = TILE_WALL;
            mockGameState.mapData[5][4] = TILE_WALL;
            mockGameState.mapData[5][6] = TILE_WALL;

            // Execution
            const moves = getValidMoves(mockEnemy, mockGameState);

            // Assertion
            assert.deepEqual(moves, [], 'Should return an empty array when blocked');
        });
    });

    // --- Tests for isMoveSafe ---
    QUnit.module('isMoveSafe', function() {
        QUnit.test('Move is safe when no threats nearby', function(assert) {
            // Setup: Enemy 5,5. Player 10,10. Target move 5,6.
            mockPlayer.row = 10; mockPlayer.col = 10; // Move player far away
            const targetRow = 5; const targetCol = 6;

            // Execution & Assertion
            assert.ok(isMoveSafe(mockEnemy, targetRow, targetCol, mockGameState), 'Move should be safe with no nearby threats');
        });

        QUnit.test('Move is unsafe when adjacent to visible player', function(assert) {
            // Setup: Enemy 5,5. Player 5,7. Target move 5,6 (adjacent to player).
            mockPlayer.row = 5; mockPlayer.col = 7;
            const targetRow = 5; const targetCol = 6;
            // Ensure LOS is clear
            mockGameState.mapData[5][6] = TILE_LAND;

            // Execution & Assertion
            assert.notOk(isMoveSafe(mockEnemy, targetRow, targetCol, mockGameState), 'Move should be unsafe adjacent to visible player');
        });

        QUnit.test('Move is unsafe when adjacent to visible other enemy', function(assert) {
            // Setup: Enemy 5,5. Other enemy 4,6. Target move 5,6 (adjacent to other enemy).
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 4, col: 6 });
            mockGameState.enemies.push(otherEnemy);
            const targetRow = 5; const targetCol = 6;
             // Ensure LOS is clear
            mockGameState.mapData[5][6] = TILE_LAND;

            // Execution & Assertion
            assert.notOk(isMoveSafe(mockEnemy, targetRow, targetCol, mockGameState), 'Move should be unsafe adjacent to visible other enemy');
        });

        QUnit.test('Move is safe if adjacent threat is not visible (LOS blocked)', function(assert) {
            // Setup: Enemy 5,5. Other enemy 4,6. Wall at 5,6. Target move 5,6.
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 4, col: 6 });
            mockGameState.enemies.push(otherEnemy);
            const targetRow = 5; const targetCol = 6;
            mockGameState.mapData[5][6] = TILE_WALL; // Block LOS from 5,5 to 4,6 (via 5,6)
             // Mock hasClearLineOfSight to reflect the block for this specific case
             window.hasClearLineOfSight = (unitA, unitB, range, gameState) => {
                 if (unitA === mockEnemy && unitB === otherEnemy) return false; // Blocked
                 return true; // Assume clear otherwise for simplicity
             };

            // Execution & Assertion
            assert.ok(isMoveSafe(mockEnemy, targetRow, targetCol, mockGameState), 'Move should be safe if adjacent threat is not visible');
        });

         QUnit.test('Move is safe if adjacent unit is the primary target', function(assert) {
            // Setup: Enemy 5,5 targeting Player at 5,7. Target move 5,6 (adjacent to target).
            mockPlayer.row = 5; mockPlayer.col = 7;
            mockEnemy.targetEnemy = mockPlayer; // Set primary target
            const targetRow = 5; const targetCol = 6;
             // Ensure LOS is clear
             mockGameState.mapData[5][6] = TILE_LAND;

            // Execution & Assertion
            assert.ok(isMoveSafe(mockEnemy, targetRow, targetCol, mockGameState), 'Move should be safe if adjacent unit is the primary target');
        });

         QUnit.test('Move is safe if adjacent unit is dead', function(assert) {
            // Setup: Enemy 5,5. Dead enemy at 4,6. Target move 5,6.
            const otherEnemy = createMockUnit(false, { id: 'enemy2', row: 4, col: 6, hp: 0 }); // Dead enemy
            mockGameState.enemies.push(otherEnemy);
            const targetRow = 5; const targetCol = 6;
             // Ensure LOS is clear
             mockGameState.mapData[5][6] = TILE_LAND;

            // Execution & Assertion
            assert.ok(isMoveSafe(mockEnemy, targetRow, targetCol, mockGameState), 'Move should be safe if adjacent unit is dead');
        });
    });

    // --- Tests for moveTowards ---
    QUnit.module('moveTowards', function() {
        QUnit.test('Moves one step closer (horizontally)', function(assert) {
            // Setup: Enemy 5,5. Target 5,10.
            const targetRow = 5; const targetCol = 10;
            const expectedMove = { row: 5, col: 6 };

            // Execution
            const result = moveTowards(mockEnemy, targetRow, targetCol, 'test', mockGameState);

            // Assertion
            assert.ok(result, 'Should return true indicating movement');
            assert.deepEqual(updateUnitPositionCalledWith?.newRow, expectedMove.row, 'Should move to the correct row');
            assert.deepEqual(updateUnitPositionCalledWith?.newCol, expectedMove.col, 'Should move to the correct column');
            assert.ok(logMock.calls.some(call => call.message.includes('moves towards test')), 'Should log movement');
        });

        QUnit.test('Moves one step closer (vertically)', function(assert) {
            // Setup: Enemy 5,5. Target 10,5.
            const targetRow = 10; const targetCol = 5;
            const expectedMove = { row: 6, col: 5 };

            // Execution
            const result = moveTowards(mockEnemy, targetRow, targetCol, 'test', mockGameState);

            // Assertion
            assert.ok(result, 'Should return true indicating movement');
            assert.deepEqual(updateUnitPositionCalledWith?.newRow, expectedMove.row, 'Should move to the correct row');
            assert.deepEqual(updateUnitPositionCalledWith?.newCol, expectedMove.col, 'Should move to the correct column');
        });

         QUnit.test('Moves one step closer (diagonally preferred)', function(assert) {
            // Setup: Enemy 5,5. Target 10,10.
            const targetRow = 10; const targetCol = 10;
            // Possible moves are 6,5 or 5,6. Either is valid.

            // Execution
            const result = moveTowards(mockEnemy, targetRow, targetCol, 'test', mockGameState);
            const movedTo = { row: updateUnitPositionCalledWith?.newRow, col: updateUnitPositionCalledWith?.newCol };

            // Assertion
            assert.ok(result, 'Should return true indicating movement');
            const isValidMove = (movedTo.row === 6 && movedTo.col === 5) || (movedTo.row === 5 && movedTo.col === 6);
            assert.ok(isValidMove, `Moved to a valid closer step (${movedTo.row},${movedTo.col})`);
        });

        QUnit.test('Returns false if only further moves are possible', function(assert) {
            // Setup: Enemy 5,5. Target 5,7. Wall at 5,6 (blocks closer). Other moves (4,5), (6,5), (5,4) are further.
            const targetRow = 5; const targetCol = 7;
            mockGameState.mapData[5][6] = TILE_WALL; // Block direct path
            // Ensure other adjacent tiles are clear land
            mockGameState.mapData[4][5] = TILE_LAND;
            mockGameState.mapData[6][5] = TILE_LAND;
            mockGameState.mapData[5][4] = TILE_LAND;

            // Execution
            const result = moveTowards(mockEnemy, targetRow, targetCol, 'test', mockGameState);

             // Assertion
            assert.notOk(result, 'Should return false as only further moves are possible');
            assert.strictEqual(updateUnitPositionCalledWith, null, 'updateUnitPosition should not be called');
            // Check log message? The function currently only logs failure if getValidMoves is empty.
            // assert.ok(logMock.calls.some(call => call.message.includes('cannot move towards')), 'Should log inability to move'); // No log expected here
        });

        QUnit.test('Returns false if completely blocked', function(assert) {
            // Setup: Enemy 5,5. Target 10,10. Surrounded by walls.
            mockGameState.mapData[4][5] = TILE_WALL;
            mockGameState.mapData[6][5] = TILE_WALL;
            mockGameState.mapData[5][4] = TILE_WALL;
            mockGameState.mapData[5][6] = TILE_WALL;
            const targetRow = 10; const targetCol = 10;

            // Execution
            const result = moveTowards(mockEnemy, targetRow, targetCol, 'test', mockGameState);

            // Assertion
            assert.notOk(result, 'Should return false when blocked');
            assert.strictEqual(updateUnitPositionCalledWith, null, 'updateUnitPosition should not be called');
            assert.ok(logMock.calls.some(call => call.message.includes('cannot move towards')), 'Should log inability to move');
        });
        });

        QUnit.test('Returns false if only further moves are possible', function(assert) {
            // Setup: Enemy 5,5. Target 5,7. Wall at 5,6 (blocks closer). Other moves (4,5), (6,5), (5,4) are further.
            const targetRow = 5; const targetCol = 7;
            mockGameState.mapData[5][6] = TILE_WALL; // Block direct path
            // Ensure other adjacent tiles are clear land
            mockGameState.mapData[4][5] = TILE_LAND;
            mockGameState.mapData[6][5] = TILE_LAND;
            mockGameState.mapData[5][4] = TILE_LAND;

            // Execution
            const result = moveTowards(mockEnemy, targetRow, targetCol, 'test', mockGameState);

             // Assertion
            assert.notOk(result, 'Should return false as only further moves are possible');
            assert.strictEqual(updateUnitPositionCalledWith, null, 'updateUnitPosition should not be called');
            // No log expected here as getValidMoves is not empty
        });

        QUnit.test('Returns false if completely blocked', function(assert) {
             // Setup: Enemy 5,5. Surrounded by walls.
            mockGameState.mapData[4][5] = TILE_WALL;
            mockGameState.mapData[6][5] = TILE_WALL;
            mockGameState.mapData[5][4] = TILE_WALL;
            mockGameState.mapData[5][6] = TILE_WALL;

            // Execution
            const result = moveRandomly(mockEnemy, mockGameState);

            // Assertion
            assert.notOk(result, 'Should return false when blocked');
            assert.strictEqual(updateUnitPositionCalledWith, null, 'updateUnitPosition should not be called');
        });
    });
});
