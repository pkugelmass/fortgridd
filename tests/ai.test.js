console.log("ai.test.js loaded");

QUnit.module('AI Core Logic (ai.js)', function(hooks) {

    // Use central helpers for constants
    hooks.before(function() {
        setupTestConstants();
    });

    hooks.after(function() {
        cleanupTestConstants();
    });

    // --- Mocks ---
    let mockGameState;
    let mockEnemy;
    let logMock;
    let findNearestVisibleEnemyMock;
    let findNearbyResourceMock;
    // Mocks for runAiTurns dependencies
    let isGameOverMock;
    let getCurrentTurnMock;
    let endAiTurnMock;
    let checkEndConditionsMock;
    let handleExploringStateMock;
    let handleSeekingResourcesStateMock;
    let handleEngagingEnemyStateMock;
    let handleFleeingStateMock;
    let handleHealingStateMock;


    hooks.beforeEach(function() {
        // Reset mocks before each test
        logMock = setupLogMock(); // Mock Game.logMessage

        // Mock AI perception/resource finding (used by performReevaluation)
        findNearestVisibleEnemyMock = sinon.stub(window, 'findNearestVisibleEnemy');
        findNearbyResourceMock = sinon.stub(window, 'findNearbyResource');

        // Mock Game state functions (used by runAiTurns)
        // Assuming Game is a global object or accessible for stubbing
        if (typeof Game === 'undefined') window.Game = {}; // Ensure Game exists for stubbing if not loaded
        isGameOverMock = sinon.stub(Game, 'isGameOver').returns(false);
        getCurrentTurnMock = sinon.stub(Game, 'getCurrentTurn').returns('ai');
        endAiTurnMock = sinon.stub(Game, 'endAiTurn');
        checkEndConditionsMock = sinon.stub(Game, 'checkEndConditions').returns(false);

        // Mock AI state handlers (used by runAiTurns)
        handleExploringStateMock = sinon.stub(window, 'handleExploringState').returns(true); // Default to action taken
        handleSeekingResourcesStateMock = sinon.stub(window, 'handleSeekingResourcesState').returns(true);
        handleEngagingEnemyStateMock = sinon.stub(window, 'handleEngagingEnemyState').returns(true);
        handleFleeingStateMock = sinon.stub(window, 'handleFleeingState').returns(true);
        handleHealingStateMock = sinon.stub(window, 'handleHealingState').returns(true);

        // Basic enemy and gameState for modification in tests
        mockEnemy = createMockUnit(false, { id: 'enemy1', state: AI_STATE_EXPLORING, hp: 10, maxHp: 10, resources: { medkits: 1, ammo: 5 }, detectionRange: 5 });
        mockGameState = createMockGameState({ enemies: [mockEnemy], player: createMockUnit(true, { id: 'player1' }) });
    });

    hooks.afterEach(function() {
        // Restore all stubs
        logMock.restore();
        findNearestVisibleEnemyMock.restore();
        findNearbyResourceMock.restore();
        isGameOverMock.restore();
        getCurrentTurnMock.restore();
        endAiTurnMock.restore();
        checkEndConditionsMock.restore();
        handleExploringStateMock.restore();
        handleSeekingResourcesStateMock.restore();
        handleEngagingEnemyStateMock.restore();
        handleFleeingStateMock.restore();
        handleHealingStateMock.restore();

        // Clean up potential global Game object if created for stubbing
        if (window.Game && Object.keys(window.Game).length === 0) {
             delete window.Game;
        }
    });

    // --- Tests for performReevaluation ---
    QUnit.module('performReevaluation', function() {

        QUnit.test('Priority 1: Threat -> Fleeing (Low HP)', function(assert) {
            mockEnemy.hp = 1; // Below AI_FLEE_HEALTH_THRESHOLD * maxHp
            const mockPlayer = mockGameState.player;
            findNearestVisibleEnemyMock.returns(mockPlayer); // Player is visible

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_FLEEING, 'State should be Fleeing');
            assert.equal(mockEnemy.targetEnemy, mockPlayer, 'Target enemy should be the player');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
        });

        QUnit.test('Priority 1: Threat -> Engaging (Sufficient HP)', function(assert) {
            mockEnemy.hp = mockEnemy.maxHp; // Full HP
            const mockPlayer = mockGameState.player;
            findNearestVisibleEnemyMock.returns(mockPlayer); // Player is visible

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_ENGAGING_ENEMY, 'State should be Engaging');
            assert.equal(mockEnemy.targetEnemy, mockPlayer, 'Target enemy should be the player');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
        });

        QUnit.test('Priority 2: Self-Preservation -> Healing (Low HP, Has Medkit)', function(assert) {
            mockEnemy.hp = 1; // Below AI_HEAL_PRIORITY_THRESHOLD * maxHp
            mockEnemy.resources.medkits = 1;
            findNearestVisibleEnemyMock.returns(null); // No visible enemy

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_HEALING, 'State should be Healing');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
            assert.notOk(findNearbyResourceMock.called, 'findNearbyResource should not be called for healing state');
        });

         QUnit.test('Priority 2: Self-Preservation -> Not Healing (Low HP, No Medkit)', function(assert) {
            mockEnemy.hp = 1; // Below AI_HEAL_PRIORITY_THRESHOLD * maxHp
            mockEnemy.resources.medkits = 0; // No medkits
            findNearestVisibleEnemyMock.returns(null); // No visible enemy
            // Expect it to fall through to seeking medkit

            const medkitCoords = { row: 2, col: 2 };
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_MEDKIT, mockGameState).returns(medkitCoords);

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should be Seeking Resources (for medkit)');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, medkitCoords, 'Resource target should be the medkit');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, sinon.match.any, TILE_MEDKIT, mockGameState), 'findNearbyResource called for medkit');
        });

        QUnit.test('Priority 3: Resource Need -> Seeking Medkit (Low HP, No Medkit Found Nearby)', function(assert) {
            mockEnemy.hp = 1; // Below AI_HEAL_PRIORITY_THRESHOLD * maxHp
            mockEnemy.resources.medkits = 0; // No medkits
            findNearestVisibleEnemyMock.returns(null); // No visible enemy
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_MEDKIT, mockGameState).returns(null); // No medkit found

            // Expect it to fall through to seeking ammo (if needed) or exploring
            mockEnemy.resources.ammo = 1; // Below AI_SEEK_AMMO_THRESHOLD
            const ammoCoords = { row: 3, col: 3 };
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_AMMO, mockGameState).returns(ammoCoords);

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should be Seeking Resources (for ammo)');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, ammoCoords, 'Resource target should be the ammo');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, sinon.match.any, TILE_MEDKIT, mockGameState), 'findNearbyResource called for medkit');
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, sinon.match.any, TILE_AMMO, mockGameState), 'findNearbyResource called for ammo');
        });

        QUnit.test('Priority 3: Resource Need -> Seeking Ammo (Sufficient HP, Low Ammo)', function(assert) {
            mockEnemy.hp = mockEnemy.maxHp; // Sufficient HP
            mockEnemy.resources.ammo = 1; // Below AI_SEEK_AMMO_THRESHOLD
            findNearestVisibleEnemyMock.returns(null); // No visible enemy

            const ammoCoords = { row: 3, col: 3 };
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_AMMO, mockGameState).returns(ammoCoords);

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should be Seeking Resources (for ammo)');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, ammoCoords, 'Resource target should be the ammo');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
            // Medkit check should still happen first based on HP (even if HP is full, the check runs)
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, sinon.match.any, TILE_MEDKIT, mockGameState), 'findNearbyResource called for medkit');
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, sinon.match.any, TILE_AMMO, mockGameState), 'findNearbyResource called for ammo');
        });

        QUnit.test('Priority 4: Proactive -> Seeking Medkit', function(assert) {
            mockEnemy.hp = mockEnemy.maxHp; // Sufficient HP
            mockEnemy.resources.ammo = 10; // Sufficient Ammo
            findNearestVisibleEnemyMock.returns(null); // No visible enemy
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_MEDKIT, mockGameState).returns(null); // No *needed* medkit
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_AMMO, mockGameState).returns(null); // No *needed* ammo

            const proactiveMedkitCoords = { row: 4, col: 4 };
            // Mock the proactive search call specifically
            findNearbyResourceMock.withArgs(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT, mockGameState).returns(proactiveMedkitCoords);
            findNearbyResourceMock.withArgs(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO, mockGameState).returns(null); // No proactive ammo found

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should be Seeking Resources (proactive medkit)');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, proactiveMedkitCoords, 'Resource target should be the proactive medkit');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT, mockGameState), 'Proactive medkit search called');
            // Proactive ammo search should NOT be called if proactive medkit is found
            assert.notOk(findNearbyResourceMock.calledWith(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO, mockGameState), 'Proactive ammo search not called');
        });

         QUnit.test('Priority 4: Proactive -> Seeking Ammo', function(assert) {
            mockEnemy.hp = mockEnemy.maxHp; // Sufficient HP
            mockEnemy.resources.ammo = 10; // Sufficient Ammo
            findNearestVisibleEnemyMock.returns(null); // No visible enemy
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_MEDKIT, mockGameState).returns(null); // No *needed* medkit
            findNearbyResourceMock.withArgs(mockEnemy, sinon.match.any, TILE_AMMO, mockGameState).returns(null); // No *needed* ammo

            findNearbyResourceMock.withArgs(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT, mockGameState).returns(null); // No proactive medkit found
            const proactiveAmmoCoords = { row: 4, col: 4 };
            findNearbyResourceMock.withArgs(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO, mockGameState).returns(proactiveAmmoCoords); // Proactive ammo found

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_SEEKING_RESOURCES, 'State should be Seeking Resources (proactive ammo)');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.deepEqual(mockEnemy.targetResourceCoords, proactiveAmmoCoords, 'Resource target should be the proactive ammo');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_MEDKIT, mockGameState), 'Proactive medkit search called');
            assert.ok(findNearbyResourceMock.calledWith(mockEnemy, AI_PROACTIVE_SCAN_RANGE, TILE_AMMO, mockGameState), 'Proactive ammo search called');
        });

        QUnit.test('Priority 5: Default -> Exploring', function(assert) {
            mockEnemy.hp = mockEnemy.maxHp; // Sufficient HP
            mockEnemy.resources.ammo = 10; // Sufficient Ammo
            findNearestVisibleEnemyMock.returns(null); // No visible enemy
            findNearbyResourceMock.returns(null); // No resources found (needed or proactive)

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_EXPLORING, 'State should be Exploring');
            assert.equal(mockEnemy.targetEnemy, null, 'Target enemy should be null');
            assert.equal(mockEnemy.targetResourceCoords, null, 'Resource target should be null');
            assert.ok(findNearestVisibleEnemyMock.calledOnce, 'findNearestVisibleEnemy called');
            assert.ok(findNearbyResourceMock.called, 'findNearbyResource called multiple times'); // Called for needed and proactive checks
        });

        QUnit.test('State Change Logging', function(assert) {
            mockEnemy.state = AI_STATE_EXPLORING; // Start exploring
            mockEnemy.hp = 1; // Low HP
            const mockPlayer = mockGameState.player;
            findNearestVisibleEnemyMock.returns(mockPlayer); // See player

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_FLEEING, 'State changed to Fleeing');
            // Check if logMock was called with a message indicating the state change
            assert.ok(logMock.calls.some(call => call.message.includes('re-evaluates') && call.message.includes(AI_STATE_FLEEING)), 'State change logged');
        });

         QUnit.test('No State Change Logging', function(assert) {
            mockEnemy.state = AI_STATE_EXPLORING; // Start exploring
            mockEnemy.hp = mockEnemy.maxHp; // Full HP
            findNearestVisibleEnemyMock.returns(null); // No enemy
            findNearbyResourceMock.returns(null); // No resources

            performReevaluation(mockEnemy, mockGameState);

            assert.equal(mockEnemy.state, AI_STATE_EXPLORING, 'State remained Exploring');
            // Check if logMock was NOT called with a state change message
             assert.notOk(logMock.calls.some(call => call.message.includes('re-evaluates')), 'State change should not be logged');
        });
    });

    // --- Tests for runAiTurns ---
    QUnit.module('runAiTurns', function() {

        QUnit.test('Guard Clause: Game Over', function(assert) {
            isGameOverMock.returns(true);
            runAiTurns(mockGameState);
            assert.notOk(endAiTurnMock.called, 'endAiTurn should not be called if game is over');
            assert.notOk(handleExploringStateMock.called, 'State handler should not be called');
        });

        QUnit.test('Guard Clause: Not AI Turn', function(assert) {
            getCurrentTurnMock.returns('player');
            runAiTurns(mockGameState);
            assert.notOk(endAiTurnMock.called, 'endAiTurn should not be called if not AI turn');
            assert.notOk(handleExploringStateMock.called, 'State handler should not be called');
        });

         QUnit.test('Guard Clause: No Enemies', function(assert) {
            mockGameState.enemies = []; // No enemies
            runAiTurns(mockGameState);
            assert.ok(endAiTurnMock.calledOnce, 'endAiTurn should be called even with no enemies');
            assert.notOk(handleExploringStateMock.called, 'State handler should not be called');
        });

        QUnit.test('Basic Turn: Single Enemy, Exploring State', function(assert) {
            // performReevaluation will be called, let's assume it keeps the state Exploring
            // We need to mock findNearestVisibleEnemy and findNearbyResource to return null
            findNearestVisibleEnemyMock.returns(null);
            findNearbyResourceMock.returns(null);

            runAiTurns(mockGameState);

            // Verify performReevaluation was called (implicitly via state handler call check)
            assert.ok(handleExploringStateMock.calledOnceWith(mockEnemy, mockGameState), 'Exploring handler called');
            assert.ok(endAiTurnMock.calledOnce, 'endAiTurn called');
            assert.ok(checkEndConditionsMock.calledOnce, 'checkEndConditions called'); // Called after enemy turn
        });

        QUnit.test('Turn with State Change: Engaging State', function(assert) {
            // Make performReevaluation change state to Engaging
            const mockPlayer = mockGameState.player;
            findNearestVisibleEnemyMock.returns(mockPlayer);
            mockEnemy.hp = mockEnemy.maxHp; // Ensure not fleeing

            runAiTurns(mockGameState);

            // performReevaluation runs, sets state to Engaging
            assert.ok(handleEngagingEnemyStateMock.calledOnceWith(mockEnemy, mockGameState), 'Engaging handler called');
            assert.notOk(handleExploringStateMock.called, 'Exploring handler should not be called');
            assert.ok(endAiTurnMock.calledOnce, 'endAiTurn called');
        });

        QUnit.test('Multiple Enemies: Each takes a turn', function(assert) {
            const enemy2 = createMockUnit(false, { id: 'enemy2', state: AI_STATE_EXPLORING, hp: 5 });
            mockGameState.enemies.push(enemy2);

            // Mock perception/resources so both default to exploring
            findNearestVisibleEnemyMock.returns(null);
            findNearbyResourceMock.returns(null);

            runAiTurns(mockGameState);

            assert.equal(handleExploringStateMock.callCount, 2, 'Exploring handler called twice');
            assert.ok(handleExploringStateMock.calledWith(mockEnemy, mockGameState), 'Handler called for enemy1');
            assert.ok(handleExploringStateMock.calledWith(enemy2, mockGameState), 'Handler called for enemy2');
            assert.ok(endAiTurnMock.calledOnce, 'endAiTurn called once at the end');
            assert.equal(checkEndConditionsMock.callCount, 2, 'checkEndConditions called after each enemy');
        });

        QUnit.test('Re-evaluation Loop: Handler returns false, then true', function(assert) {
            // First call to handler returns false (needs re-eval), second returns true
            handleExploringStateMock.onFirstCall().returns(false);
            handleExploringStateMock.onSecondCall().returns(true);

            // Mock perception/resources to stay in Exploring state during re-evaluation
            findNearestVisibleEnemyMock.returns(null);
            findNearbyResourceMock.returns(null);

            runAiTurns(mockGameState);

            assert.equal(handleExploringStateMock.callCount, 2, 'Exploring handler called twice');
            assert.ok(endAiTurnMock.calledOnce, 'endAiTurn called');
        });

        QUnit.test('Re-evaluation Loop: Hits Max Evaluations', function(assert) {
            // Handler always returns false
            handleExploringStateMock.returns(false);

            // Mock perception/resources to stay in Exploring state
            findNearestVisibleEnemyMock.returns(null);
            findNearbyResourceMock.returns(null);

            runAiTurns(mockGameState);

            // Called MAX_EVALUATIONS_PER_TURN times
            assert.equal(handleExploringStateMock.callCount, MAX_EVALUATIONS_PER_TURN, `Exploring handler called ${MAX_EVALUATIONS_PER_TURN} times`);
            assert.ok(logMock.calls.some(call => call.message.includes('reached max evaluations')), 'Max evaluations warning logged');
            assert.ok(logMock.calls.some(call => call.message.includes('waits (evaluation limit)')), 'Forced wait logged');
            assert.ok(endAiTurnMock.calledOnce, 'endAiTurn called'); // Turn still ends
        });

         QUnit.test('Unknown State: Defaults to Exploring', function(assert) {
            mockEnemy.state = 'INVALID_STATE';

            // Mock perception/resources to stay exploring after default
            findNearestVisibleEnemyMock.returns(null);
            findNearbyResourceMock.returns(null);

            runAiTurns(mockGameState);

            assert.ok(logMock.calls.some(call => call.message.includes('unknown state')), 'Unknown state warning logged');
            // performReevaluation runs again after state is forced to Exploring
            assert.ok(handleExploringStateMock.calledOnce, 'Exploring handler called after defaulting');
            assert.ok(endAiTurnMock.calledOnce, 'endAiTurn called');
        });

        QUnit.test('Game Ends During AI Turns', function(assert) {
            // Make the first enemy's action end the game
            handleExploringStateMock.callsFake(() => {
                checkEndConditionsMock.returns(true); // Game ends after this action
                return true; // Action was taken
            });

             const enemy2 = createMockUnit(false, { id: 'enemy2', state: AI_STATE_EXPLORING, hp: 5 });
             mockGameState.enemies.push(enemy2);

             // Mock perception/resources
             findNearestVisibleEnemyMock.returns(null);
             findNearbyResourceMock.returns(null);

            runAiTurns(mockGameState);

            assert.ok(handleExploringStateMock.calledOnce, 'Handler called only for the first enemy'); // Game ended, second enemy doesn't act
            assert.ok(checkEndConditionsMock.calledOnce, 'checkEndConditions called'); // Called after first enemy
            assert.notOk(endAiTurnMock.called, 'endAiTurn should NOT be called if game ended');
        });

    });

});
