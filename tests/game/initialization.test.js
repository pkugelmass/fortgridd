// Tests for Game initialization logic (createAndPlaceEnemy, resetGame) from js/game.js
console.log("game/initialization.test.js loaded");

QUnit.module('Game Logic (game.js) > createAndPlaceEnemy', hooks => {
    let gameState;
    let occupiedCoords;
    // Constants are setup globally by setupTestConstants()

    let gameMocks; // For Game object methods
    let globalMocks; // For global utility functions
    // Constants are setup globally by setupTestConstants()

    hooks.beforeEach(() => {
        setupTestConstants();
        gameState = createMockGameState(); // Basic state with mapData
        occupiedCoords = [{ row: 0, col: 0 }]; // Example occupied coord

        // Mock global utilities using the new helper
        globalMocks = setupGlobalMocks({
            findStartPosition: (mapData, width, height, landTile, occupied) => {
                return { row: 1, col: 1 }; // Default mock: Find a valid position
            },
            getValidMoves: (unit, gs) => {
                return [{ row: 1, col: 2 }]; // Default mock: Position is accessible
            }
        });

        // Mock Game methods using the helper
        gameMocks = setupGameMocks({
            logMessage: (message, gs, options = {}) => {
                // Custom mock to also add to logMessages for assertion purposes
                const { target = 'PLAYER', className = null } = options;
                if ((target === 'PLAYER' || target === 'BOTH') && gs && gs.logMessages) {
                     const messageWithTurn = `T${gs.turnNumber}: ${message}`;
                     gs.logMessages.push({ message: messageWithTurn, cssClass: className });
                }
            }
        });
    });

    hooks.afterEach(() => {
        globalMocks.restore(); // Restore global mocks
        gameMocks.restore(); // Restore Game methods
        cleanupTestConstants();
    });

    QUnit.test('Success: Creates and places enemy, updates occupiedCoords', assert => {
        const initialOccupiedCount = occupiedCoords.length;
        const enemy = Game.createAndPlaceEnemy(0, occupiedCoords, gameState);

        assert.ok(enemy, 'Enemy object should be created');
        assert.equal(enemy.id, 'enemy_0', 'Enemy ID should be correct');
        assert.equal(enemy.row, 1, 'Enemy row should be set by findStartPosition mock');
        assert.equal(enemy.col, 1, 'Enemy col should be set by findStartPosition mock');
        assert.ok(enemy.hp > 0 && enemy.hp <= enemy.maxHp, 'Enemy HP should be within range');
        assert.ok(enemy.resources.ammo >= (AI_AMMO_MIN || 1), 'Enemy ammo should be within range');
        assert.equal(enemy.state, AI_STATE_EXPLORING, 'Enemy state should be EXPLORING');
        assert.equal(occupiedCoords.length, initialOccupiedCount + 1, 'occupiedCoords length should increase by 1');
        assert.deepEqual(occupiedCoords[initialOccupiedCount], { row: 1, col: 1 }, 'New enemy position should be added to occupiedCoords');
        assert.equal(globalMocks.calls['findStartPosition']?.count, 1, 'findStartPosition called');
        assert.equal(globalMocks.calls['getValidMoves']?.count, 1, 'getValidMoves called');
    });

    QUnit.test('Failure: findStartPosition returns null', assert => {
        // Override global mock for this test
        globalMocks.restore(); // Restore default mocks first
        globalMocks = setupGlobalMocks({
            findStartPosition: () => null, // Mock failure
            getValidMoves: true // Keep default spy for getValidMoves
        });

        const initialOccupiedCount = occupiedCoords.length;
        const enemy = Game.createAndPlaceEnemy(0, occupiedCoords, gameState);

        assert.strictEqual(enemy, null, 'Should return null');
        assert.equal(occupiedCoords.length, initialOccupiedCount, 'occupiedCoords length should not change');
        assert.equal(globalMocks.calls['findStartPosition']?.count, 1, 'findStartPosition called'); // It's called once before failing
        assert.notOk(globalMocks.calls['getValidMoves'], 'getValidMoves should not be called');
        assert.ok(gameMocks.calls['logMessage']?.args.some(args => args[0].includes("Could not find valid position")), 'Warning message logged');

        // No need to manually restore, afterEach handles it
    });

    QUnit.test('Failure: Found position is inaccessible (getValidMoves returns empty)', assert => {
        // Override global mocks for this test
        globalMocks.restore();
        globalMocks = setupGlobalMocks({
            findStartPosition: (mapData, width, height, landTile, occupied) => ({ row: 1, col: 1 }), // Mock success initially
            getValidMoves: () => [] // Mock inaccessible position
        });

        const initialOccupiedCount = occupiedCoords.length;
        const enemy = Game.createAndPlaceEnemy(0, occupiedCoords, gameState);

        // It should retry findStartPosition up to max attempts
        assert.strictEqual(enemy, null, 'Should return null');
        assert.ok(globalMocks.calls['findStartPosition']?.count > 1, 'findStartPosition should be called multiple times');
        assert.ok(globalMocks.calls['getValidMoves']?.count > 0, 'getValidMoves called');
        assert.ok(gameMocks.calls['logMessage']?.args.some(args => args[0].includes("Could not find valid position")), 'Warning message logged');

        // No need to manually restore
         // occupiedCoords might increase during attempts, difficult to assert exact final length
    });

});


QUnit.module('Game Logic (game.js) > resetGame', hooks => {
    let gameStateRef; // This will hold the object to be reset
    let gameMocks; // For Game object methods
    let globalMocks_reset; // For global utility functions in this module
    // Constants are setup globally by setupTestConstants()

    hooks.beforeEach(() => {
        setupTestConstants();
        // Create an initial gameState object to be reset
        gameStateRef = {
            currentTurn: 'ai',
            gameActive: false,
            turnNumber: 10,
            safeZone: { minRow: 5, maxRow: 5, minCol: 5, maxCol: 5 },
            logMessages: ['old log'],
            mapData: [[9]], // Old map
            player: { id: 'player', hp: 1, row: 0, col: 0, resources: { ammo: 0, medkits: 0 } },
            enemies: [{ id: 'old_enemy' }]
        };

        // Mock global utilities using the helper
        globalMocks_reset = setupGlobalMocks({
            createMapData: (config) => {
                return [[0, 0], [0, 0]]; // Return a simple valid map
            },
            findStartPosition: (mapData, w, h, land, occupied) => {
                if (occupied.length === 0) return { row: 1, col: 1 }; // Player pos
                return { row: 0, col: 0 }; // Enemy pos (for check inside createAndPlaceEnemy mock)
            },
            initializeUI: true, // Use default spy
            resizeAndDraw: true, // Use default spy
            updateLogDisplay: true // Use default spy
        });

        // Mock Game methods using helper
        // Mock Game methods using helper
        gameMocks = setupGameMocks({
            logMessage: true, // Use default spy
            createAndPlaceEnemy: (index, occupied, gs) => {
                // Custom mock for createAndPlaceEnemy
                const pos = { row: 0, col: index + 1 }; // Place enemies differently
                occupied.push(pos);
                // Note: This mock internally might call the mocked findStartPosition,
                // which will be tracked by globalMocks_reset.
                return createMockUnit(false, { id: `new_enemy_${index}`, row: pos.row, col: pos.col });
            }
        });
    });

    hooks.afterEach(() => {
        globalMocks_reset.restore(); // Restore global mocks
        gameMocks.restore(); // Restore Game methods
        cleanupTestConstants();
    });

    QUnit.test('Resets core gameState properties', assert => {
        Game.resetGame(gameStateRef);

        assert.equal(gameStateRef.currentTurn, 'player', 'currentTurn should be player');
        assert.true(gameStateRef.gameActive, 'gameActive should be true');
        assert.equal(gameStateRef.turnNumber, 1, 'turnNumber should be 1');
        assert.deepEqual(gameStateRef.safeZone, { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 }, 'safeZone should be reset');
        assert.ok(Array.isArray(gameStateRef.logMessages), 'logMessages should be an array');
        // Skipping assertion for specific log message content per guidelines/feedback
    });

     QUnit.test('Regenerates mapData', assert => {
        Game.resetGame(gameStateRef);
        assert.equal(globalMocks_reset.calls['createMapData']?.count, 1, 'createMapData should be called');
        assert.deepEqual(gameStateRef.mapData, [[0, 0], [0, 0]], 'mapData should be updated');
    });

     QUnit.test('Resets player state and position', assert => {
        const expectedPlayerStartPos = { row: 1, col: 1 }; // From findStartPosition mock
        Game.resetGame(gameStateRef);

        assert.equal(globalMocks_reset.calls['findStartPosition']?.count, 1, 'findStartPosition called for player'); // Only once for player
        assert.equal(gameStateRef.player.hp, gameStateRef.player.maxHp, 'Player HP reset to max');
        assert.equal(gameStateRef.player.resources.ammo, PLAYER_START_AMMO, 'Player ammo reset');
        assert.equal(gameStateRef.player.resources.medkits, PLAYER_START_MEDKITS, 'Player medkits reset');
        assert.equal(gameStateRef.player.row, expectedPlayerStartPos.row, 'Player row reset');
        assert.equal(gameStateRef.player.col, expectedPlayerStartPos.col, 'Player col reset');
    });

     QUnit.test('Clears old enemies and creates new ones', assert => {
        const numEnemies = NUM_ENEMIES || 3;
        Game.resetGame(gameStateRef);

        assert.equal(gameMocks.calls['createAndPlaceEnemy']?.count, numEnemies, `createAndPlaceEnemy called ${numEnemies} times`);
        assert.equal(gameStateRef.enemies.length, numEnemies, `enemies array should have ${numEnemies} new enemies`);
        assert.false(gameStateRef.enemies.some(e => e.id === 'old_enemy'), 'Old enemy should be removed');
        assert.ok(gameStateRef.enemies.every(e => e.id.startsWith('new_enemy_')), 'All enemies should be new');
    });

    // Skipping UI function call tests per guidelines
    // QUnit.test('Calls UI functions', assert => {
    //     Game.resetGame(gameStateRef);
    //     assert.ok(mockCalls['resizeAndDraw']?.count >= 1, 'resizeAndDraw should be called');
    //     assert.ok(mockCalls['updateLogDisplay']?.count >= 1, 'updateLogDisplay should be called');
    // });

});
