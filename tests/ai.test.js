console.log("ai.test.js loaded");

QUnit.module('AI Core Logic (ai.js)', function(hooks) {

    // Use central helpers for constants
    hooks.before(function() {
        setupTestConstants();
    });

    hooks.after(function() {
        cleanupTestConstants();
    });

    // --- Mocks & Setup ---
    let mockGameState;
    let mockEnemy;
    let logMock;
    // Store original Game methods we might override
    let originalEndAiTurn;
    let originalCheckEndConditions;
    let originalIsGameOver;
    let originalGetCurrentTurn;
    // Potentially store original state handlers if needed for specific loop tests
    let originalHandleExploringState; // Example

    hooks.beforeEach(function() {
        logMock = setupLogMock(); // Mock Game.logMessage

        // Basic enemy and gameState for modification in tests
        // Ensure enough resources for basic actions unless overridden
        mockEnemy = createMockUnit(false, { id: 'enemy1', state: AI_STATE_EXPLORING, hp: 10, maxHp: 10, resources: { medkits: 1, ammo: 5 }, detectionRange: 5 });
        mockGameState = createMockGameState({ enemies: [mockEnemy], player: createMockUnit(true, { id: 'player1' }) });

        // Store originals and potentially set up temporary overrides for Game methods if needed by the specific test module
        // Example: Storing originals (overrides would happen in specific test modules/tests)
        if (typeof Game !== 'undefined') {
            originalEndAiTurn = Game.endAiTurn;
            originalCheckEndConditions = Game.checkEndConditions;
            originalIsGameOver = Game.isGameOver;
            originalGetCurrentTurn = Game.getCurrentTurn;
        }
        // Example: Storing original state handler
        if (typeof handleExploringState !== 'undefined') {
             originalHandleExploringState = handleExploringState;
        }

    });

    hooks.afterEach(function() {
        logMock.restore();

        // Restore original Game methods
        if (typeof Game !== 'undefined') {
            Game.endAiTurn = originalEndAiTurn;
            Game.checkEndConditions = originalCheckEndConditions;
            Game.isGameOver = originalIsGameOver;
            Game.getCurrentTurn = originalGetCurrentTurn;
        }
         // Example: Restore original state handler
         if (typeof originalHandleExploringState !== 'undefined') {
             window.handleExploringState = originalHandleExploringState;
         }
         // Clean up potentially mocked global handlers added in tests
         delete window.handleExploringState;
         delete window.handleSeekingResourcesState;
         delete window.handleEngagingEnemyState;
         delete window.handleFleeingState;
         delete window.handleHealingState;
    });

    // --- Tests for performReevaluation ---
    QUnit.module('performReevaluation', function(hooks) {

        // No specific hooks needed here yet, using the outer beforeEach/afterEach

        QUnit.test('Priority 1: Threat -> Fleeing (Low HP, Visible Enemy)', function(assert) {
            // Setup: Low HP enemy, player nearby and visible
            mockEnemy.hp = 1; // Below AI_FLEE_HEALTH_THRESHOLD * maxHp (assuming threshold < 10%)
            mockGameState.player.row = mockEnemy.row + 1; // Player adjacent
            mockGameState.player.col = mockEnemy.col;
            // Ensure no walls block LOS for this simple case
            mockGameState.mapData[mockEnemy.row][mockEnemy.col] = TILE_LAND;
            mockGameState.mapData[mockGameState.player.row][mockGameState.player.col] = TILE_LAND;

            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_FLEEING, 'State should transition to Fleeing');
            assert.deepEqual(mockEnemy.targetEnemy, mockGameState.player, 'Target enemy should be the player');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
            // We don't assert on findNearestVisibleEnemy calls directly, rely on setup
        });

        QUnit.test('Priority 1: Threat -> Engaging (Sufficient HP, Visible Enemy)', function(assert) {
            // Setup: Full HP enemy, player nearby and visible
            mockEnemy.hp = mockEnemy.maxHp; // Sufficient HP
            mockGameState.player.row = mockEnemy.row + 1; // Player adjacent
            mockGameState.player.col = mockEnemy.col;
            // Ensure no walls block LOS
            mockGameState.mapData[mockEnemy.row][mockEnemy.col] = TILE_LAND;
            mockGameState.mapData[mockGameState.player.row][mockGameState.player.col] = TILE_LAND;

            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_ENGAGING_ENEMY, 'State should transition to Engaging');
            assert.deepEqual(mockEnemy.targetEnemy, mockGameState.player, 'Target enemy should be the player');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
        });

        QUnit.test('Priority 2: Self-Preservation -> Healing (Low HP, Has Medkit, No Threat)', function(assert) {
            // Setup: Low HP, has medkit, player is far away / not visible
            mockEnemy.hp = 1; // Below AI_HEAL_PRIORITY_THRESHOLD
            mockEnemy.resources.medkits = 1;
            mockGameState.player.row = 10; // Position player far away
            mockGameState.player.col = 10;
            // Ensure map is large enough if using default 5x5
            mockGameState = createMockGameState({
                enemies: [mockEnemy],
                player: mockGameState.player, // Keep the far away player
                gridWidth: 15, // Ensure player is outside default detection range
                gridHeight: 15
            });


            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_HEALING, 'State should transition to Healing');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
            // We don't assert on findNearbyResource calls for healing state
        });

        QUnit.test('Priority 3: Resource Need -> Seeking Medkit (Low HP, No Medkit, No Threat)', function(assert) {
            // Setup: Low HP, no medkits, player far away, medkit nearby
            mockEnemy.hp = 1; // Below AI_HEAL_PRIORITY_THRESHOLD (0.6 * 10 = 6)
            mockEnemy.resources.medkits = 0; // No medkits!
            mockGameState.player.row = 10; // Position player far away
            mockGameState.player.col = 10;
            const medkitCoords = { row: mockEnemy.row + 1, col: mockEnemy.col };
            // Ensure map is large enough and place medkit
             mockGameState = createMockGameState({
                enemies: [mockEnemy],
                player: mockGameState.player,
                gridWidth: 15,
                gridHeight: 15
            });
            // Ensure the target tile is clear land before placing the medkit
            mockGameState.mapData[medkitCoords.row][medkitCoords.col] = TILE_LAND;
            mockGameState.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT;


            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should transition to Seeking Resources');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, medkitCoords, 'Resource target should be the medkit');
        });

        QUnit.test('Priority 3: Resource Need -> Seeking Ammo (Sufficient HP, Low Ammo, No Threat)', function(assert) {
            // Setup: Sufficient HP, low ammo, player far away, ammo nearby
            mockEnemy.hp = mockEnemy.maxHp; // Sufficient HP
            mockEnemy.resources.ammo = 1; // Below AI_SEEK_AMMO_THRESHOLD
            mockGameState.player.row = 10; // Position player far away
            mockGameState.player.col = 10;
            const ammoCoords = { row: mockEnemy.row + 1, col: mockEnemy.col };
            // Ensure map is large enough and place ammo
             mockGameState = createMockGameState({
                enemies: [mockEnemy],
                player: mockGameState.player,
                gridWidth: 15,
                gridHeight: 15
            });
            // Ensure no medkit is nearby to interfere
            // Ensure the target tile is clear land before placing the ammo
            mockGameState.mapData[ammoCoords.row][ammoCoords.col] = TILE_LAND;
            mockGameState.mapData[ammoCoords.row][ammoCoords.col] = TILE_AMMO;


            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should transition to Seeking Resources');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, ammoCoords, 'Resource target should be the ammo');
        });

        QUnit.test('Priority 4: Proactive -> Seeking Medkit (Sufficient HP/Ammo, No Threat)', function(assert) {
            // Setup: Sufficient HP/Ammo, player far away, medkit within proactive range
            mockEnemy.hp = mockEnemy.maxHp;
            mockEnemy.resources.ammo = 10; // Sufficient ammo
            mockEnemy.resources.medkits = 1; // Has medkits, but still seeks proactively
            mockGameState.player.row = 20; // Position player far away
            mockGameState.player.col = 20;
            // Place medkit within proactive range but outside normal detection range
            const medkitCoords = { row: mockEnemy.row + AI_PROACTIVE_SCAN_RANGE -1, col: mockEnemy.col };
             mockGameState = createMockGameState({
                enemies: [mockEnemy],
                player: mockGameState.player,
                gridWidth: 25,
                gridHeight: 25
            });
            // Ensure the target tile is clear land before placing the medkit
            mockGameState.mapData[medkitCoords.row][medkitCoords.col] = TILE_LAND;
            mockGameState.mapData[medkitCoords.row][medkitCoords.col] = TILE_MEDKIT;

            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should transition to Seeking Resources (proactive)');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, medkitCoords, 'Resource target should be the proactive medkit');
        });

        QUnit.test('Priority 4: Proactive -> Seeking Ammo (Sufficient HP/Ammo, No Threat, No Proactive Medkit)', function(assert) {
            // Setup: Sufficient HP/Ammo, player far away, NO medkit nearby, ammo within proactive range
            mockEnemy.hp = mockEnemy.maxHp;
            mockEnemy.resources.ammo = 10; // Sufficient ammo
            mockEnemy.resources.medkits = 1;
            mockGameState.player.row = 20; // Position player far away
            mockGameState.player.col = 20;
            // Place ammo within proactive range
            const ammoCoords = { row: mockEnemy.row + AI_PROACTIVE_SCAN_RANGE - 1, col: mockEnemy.col };
             mockGameState = createMockGameState({
                enemies: [mockEnemy],
                player: mockGameState.player,
                gridWidth: 25,
                gridHeight: 25
            });
            // Ensure NO medkit is nearby (clear the default map)
            // Ensure the target tile is clear land before placing the ammo
            mockGameState.mapData[ammoCoords.row][ammoCoords.col] = TILE_LAND;
            mockGameState.mapData[ammoCoords.row][ammoCoords.col] = TILE_AMMO;

            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should transition to Seeking Resources (proactive)');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, ammoCoords, 'Resource target should be the proactive ammo');
        });

        QUnit.test('Priority 5: Default -> Exploring (No Threats, Needs Met, No Proactive Finds)', function(assert) {
            // Setup: Sufficient HP/Ammo, player far away, no resources nearby
            mockEnemy.hp = mockEnemy.maxHp;
            mockEnemy.resources.ammo = 10; // Sufficient ammo
            mockEnemy.resources.medkits = 1;
            mockGameState.player.row = 20; // Position player far away
            mockGameState.player.col = 20;
             mockGameState = createMockGameState({
                enemies: [mockEnemy],
                player: mockGameState.player,
                gridWidth: 25, // Use a large map
                gridHeight: 25
            });
            // Ensure no resources are placed on the map by the helper

            // Execution
            performReevaluation(mockEnemy, mockGameState);

            // Assertions
            assert.equal(mockEnemy.state, AI_STATE_EXPLORING, 'State should default to Exploring');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
        });

        // Add edge case tests below if needed (e.g., invalid target)

    });

    // --- Tests for runAiTurns ---
    QUnit.module('runAiTurns', function(hooks) {

        // Track calls to overridden Game methods
        let endAiTurnCalled;
        let checkEndConditionsCalledCount;

        hooks.beforeEach(function() {
            // Reset trackers
            endAiTurnCalled = false;
            checkEndConditionsCalledCount = 0;

            // Override Game methods for this module's tests
            if (typeof Game !== 'undefined') {
                // Default mocks - can be overridden per test
                Game.isGameOver = () => false;
                Game.getCurrentTurn = () => 'ai';
                Game.endAiTurn = () => { endAiTurnCalled = true; };
                Game.checkEndConditions = () => {
                    checkEndConditionsCalledCount++;
                    return false; // Default: game doesn't end
                };
            }
        });

        // Note: afterEach in the outer scope handles restoring originals

        QUnit.test('Guard Clause: Game Over', async function(assert) {
            // Setup: Override isGameOver to return true
            Game.isGameOver = () => true;

            // Execution
            await runAiTurns(mockGameState);

            // Assertions
            assert.notOk(endAiTurnCalled, 'endAiTurn should not be called if game is over');
            // We don't directly check state handlers here, absence of endAiTurn implies they weren't run
        });

        QUnit.test('Guard Clause: Not AI Turn', async function(assert) {
            // Setup: Override getCurrentTurn to return 'player'
            Game.getCurrentTurn = () => 'player';

            // Execution
            await runAiTurns(mockGameState);

            // Assertions
            assert.notOk(endAiTurnCalled, 'endAiTurn should not be called if not AI turn');
        });

        QUnit.test('Guard Clause: No Enemies', async function(assert) {
            // Setup: Empty enemies array
            mockGameState.enemies = [];

            // Execution
            await runAiTurns(mockGameState);

            // Assertions
            assert.ok(endAiTurnCalled, 'endAiTurn should still be called even with no enemies');
        });

        QUnit.test('Basic Turn: Single Enemy, Exploring State', async function(assert) {
            // Setup: Default state is one enemy, exploring, no threats/needs
            // We need to ensure the state handler (e.g., handleExploringState) exists globally
            // For this test, we assume the handler runs and returns true (action taken)
            // If handleExploringState wasn't loaded, this test might fail later
            // Temporarily define handlers if they aren't loaded in test-runner.html yet
            if (typeof window.handleExploringState === 'undefined') window.handleExploringState = () => true;
            if (typeof window.handleSeekingResourcesState === 'undefined') window.handleSeekingResourcesState = () => true;
            if (typeof window.handleEngagingEnemyState === 'undefined') window.handleEngagingEnemyState = () => true;
            if (typeof window.handleFleeingState === 'undefined') window.handleFleeingState = () => true;
            if (typeof window.handleHealingState === 'undefined') window.handleHealingState = () => true;


            // Execution
            await runAiTurns(mockGameState);

            // Assertions
            assert.equal(checkEndConditionsCalledCount, 1, 'checkEndConditions should be called once for the enemy');
            assert.ok(endAiTurnCalled, 'endAiTurn should be called after the enemy turn');
            // We don't assert the specific state handler call, just the overall flow
        });

        QUnit.test('Multiple Enemies: Each takes a turn', async function(assert) {
            // Setup: Create a fresh mockGameState with two enemies
            const enemy1 = createMockUnit(false, { id: 'enemy1', state: AI_STATE_EXPLORING, hp: 5, row: 2, col: 2 });
            const enemy2 = createMockUnit(false, { id: 'enemy2', state: AI_STATE_EXPLORING, hp: 5, row: 3, col: 3 });
            const mockGameStateLocal = createMockGameState({ enemies: [enemy1, enemy2] });
            // Ensure handlers exist (as in previous test)
            if (typeof window.handleExploringState === 'undefined') window.handleExploringState = () => true;
            if (typeof window.handleSeekingResourcesState === 'undefined') window.handleSeekingResourcesState = () => true;
            if (typeof window.handleEngagingEnemyState === 'undefined') window.handleEngagingEnemyState = () => true;
            if (typeof window.handleFleeingState === 'undefined') window.handleFleeingState = () => true;
            if (typeof window.handleHealingState === 'undefined') window.handleHealingState = () => true;

            // Execution
            await runAiTurns(mockGameStateLocal);

            // Assertions
            assert.equal(checkEndConditionsCalledCount, 2, 'checkEndConditions should be called once for each enemy');
            assert.ok(endAiTurnCalled, 'endAiTurn should be called once at the end');
        });

        QUnit.test('Re-evaluation Loop: Handler returns false, then true', async function(assert) {
            // Setup: Ensure enemy stays exploring, mock handler to control return
            let exploreCallCount = 0;
            window.handleExploringState = () => {
                exploreCallCount++;
                return exploreCallCount > 1; // Return false first time, true second time
            };
            // Ensure other handlers exist if needed
            if (typeof window.handleSeekingResourcesState === 'undefined') window.handleSeekingResourcesState = () => true;
            if (typeof window.handleEngagingEnemyState === 'undefined') window.handleEngagingEnemyState = () => true;
            if (typeof window.handleFleeingState === 'undefined') window.handleFleeingState = () => true;
            if (typeof window.handleHealingState === 'undefined') window.handleHealingState = () => true;

            // Execution
            await runAiTurns(mockGameState);

            // Assertions
            assert.equal(exploreCallCount, 2, 'Exploring handler should be called twice');
            assert.equal(checkEndConditionsCalledCount, 1, 'checkEndConditions should be called once');
            assert.ok(endAiTurnCalled, 'endAiTurn should be called');
        });

        QUnit.test('Re-evaluation Loop: Hits Max Evaluations', async function(assert) {
            // Setup: Ensure enemy stays exploring, mock handler to always return false
            let exploreCallCount = 0;
            window.handleExploringState = () => {
                exploreCallCount++;
                return false; // Always return false
            };
            // Ensure other handlers exist if needed
            if (typeof window.handleSeekingResourcesState === 'undefined') window.handleSeekingResourcesState = () => true;
            if (typeof window.handleEngagingEnemyState === 'undefined') window.handleEngagingEnemyState = () => true;
            if (typeof window.handleFleeingState === 'undefined') window.handleFleeingState = () => true;
            if (typeof window.handleHealingState === 'undefined') window.handleHealingState = () => true;

            // Execution
            await runAiTurns(mockGameState);

            // Assertions
            assert.equal(exploreCallCount, MAX_EVALUATIONS_PER_TURN, `Exploring handler should be called ${MAX_EVALUATIONS_PER_TURN} times`);
            assert.ok(logMock.calls.some(call => call.message.includes('reached max evaluations')), 'Max evaluations warning logged');
            assert.ok(logMock.calls.some(call => call.message.includes('waits (evaluation limit)')), 'Forced wait logged');
            assert.equal(checkEndConditionsCalledCount, 1, 'checkEndConditions should be called once');
            assert.ok(endAiTurnCalled, 'endAiTurn should still be called');
        });

        QUnit.test('Unknown State: Defaults to Exploring', async function(assert) {
            // Setup: Set an invalid state
            mockEnemy.state = 'INVALID_STATE';
            let exploreCallCount = 0;
            // Ensure exploring handler exists and track calls
            window.handleExploringState = () => {
                exploreCallCount++;
                return true; // Assume exploring takes an action
            };
            // Ensure other handlers exist if needed
            if (typeof window.handleSeekingResourcesState === 'undefined') window.handleSeekingResourcesState = () => true;
            if (typeof window.handleEngagingEnemyState === 'undefined') window.handleEngagingEnemyState = () => true;
            if (typeof window.handleFleeingState === 'undefined') window.handleFleeingState = () => true;
            if (typeof window.handleHealingState === 'undefined') window.handleHealingState = () => true;

            // Execution
            await runAiTurns(mockGameState);

            // Assertions
            // Note: The 'unknown state' log in the switch default is unreachable because
            // performReevaluation corrects the state *before* the switch.
            // We primarily care that it recovers and calls the default handler.
            // assert.ok(logMock.calls.some(call => call.message.includes('unknown state')), 'Unknown state warning logged'); // Removed assertion
            assert.equal(exploreCallCount, 1, 'Exploring handler should be called once after defaulting');
            assert.equal(checkEndConditionsCalledCount, 1, 'checkEndConditions should be called once');
            assert.ok(endAiTurnCalled, 'endAiTurn should be called');
        });

        QUnit.test('Game Ends During AI Turns', async function(assert) {
            // Setup: Add a second enemy. Override checkEndConditions to return true after first enemy.
            const enemy2 = createMockUnit(false, { id: 'enemy2', state: AI_STATE_EXPLORING, hp: 5, row: 3, col: 3});
            mockGameState.enemies.push(enemy2);
            Game.checkEndConditions = () => {
                checkEndConditionsCalledCount++;
                return checkEndConditionsCalledCount === 1; // Return true after the first call
            };
            // Ensure handlers exist
             if (typeof window.handleExploringState === 'undefined') window.handleExploringState = () => true;
             if (typeof window.handleSeekingResourcesState === 'undefined') window.handleSeekingResourcesState = () => true;
             if (typeof window.handleEngagingEnemyState === 'undefined') window.handleEngagingEnemyState = () => true;
             if (typeof window.handleFleeingState === 'undefined') window.handleFleeingState = () => true;
             if (typeof window.handleHealingState === 'undefined') window.handleHealingState = () => true;

            // Execution
            runAiTurns(mockGameState);

            // Assertions
            assert.equal(checkEndConditionsCalledCount, 1, 'checkEndConditions should be called only once (for the first enemy)');
            assert.notOk(endAiTurnCalled, 'endAiTurn should NOT be called if game ended mid-turn');
        });

    });

});
