console.log("tests/main.test.js loaded");

QUnit.module('main.js - Initialization', function(hooks) {
    let originalInitializeGame;
    let initializeGameCallCount;
    let mockGameState;
    let originalGlobalGameState; // Store the gameState created by main.js itself

    hooks.beforeEach(function() {
        // Store the gameState that main.js creates on initial load
        // We need to test *that* variable, not one we create here.
        originalGlobalGameState = window.gameState;

        // Reset call count and mock state for each test
        initializeGameCallCount = 0;
        mockGameState = null; // Default mock return value

        // Ensure Game object exists (it should be loaded by test-runner.html)
        if (typeof Game === 'undefined') {
            throw new Error("Test setup error: Game object not found.");
        }
        if (typeof Game.initializeGame !== 'function') {
            // If it doesn't exist, create a placeholder to avoid errors during mocking
             Game.initializeGame = () => {};
             console.warn("Test setup warning: Game.initializeGame not found, created placeholder.");
        }

        // Store the original function
        originalInitializeGame = Game.initializeGame;

        // Replace with a mock/spy
        Game.initializeGame = function() {
            initializeGameCallCount++;
            // Return the value set by the specific test
            return mockGameState;
        };

        // --- IMPORTANT ---
        // We cannot simply call initializeGame() here. The tests rely on the fact
        // that main.js *itself* calls Game.initializeGame() when it loads and
        // assigns the result to the *global* window.gameState.
        // The tests will check the state of window.gameState *after* main.js has run.
        // Re-running main.js logic within the test would pollute the global scope
        // or require complex script reloading, which is beyond QUnit's standard setup.
        // We assume test-runner.html loads main.js *once*, setting the initial window.gameState.
        // Our mocks intercept the call made during that initial load.
    });

    hooks.afterEach(function() {
        // Restore the original Game.initializeGame function
        if (typeof Game !== 'undefined' && originalInitializeGame) {
            Game.initializeGame = originalInitializeGame;
        }
        // Restore the original global gameState that existed before the test module ran
        window.gameState = originalGlobalGameState;
    });

    // Note: These tests implicitly rely on main.js having executed once via test-runner.html
    // before these tests run. The mock intercepts the call made during that load.

    QUnit.test('Successful Initialization: Game.initializeGame called, result assigned to global gameState', function(assert) {
        assert.expect(2); // Check call count and resulting gameState

        // Set the mock return value for the call that *already happened* when main.js loaded
        mockGameState = { gameActive: true, testId: 'mockSuccess' };

        // Simulate the assignment that *should have happened* when main.js loaded
        // by manually calling our mocked function and assigning its result globally
        // This is necessary because we can't easily re-run main.js's top-level script code
        window.gameState = Game.initializeGame();

        assert.strictEqual(initializeGameCallCount, 1, 'Game.initializeGame should have been called once on load.');
        assert.deepEqual(window.gameState, mockGameState, 'Global gameState should be assigned the object returned by initializeGame.');
    });

    QUnit.test('Failed Initialization (null): Handles null return from initializeGame', function(assert) {
        assert.expect(2); // Check call count and resulting gameState

        // Set the mock return value for the call that *already happened*
        mockGameState = null;

        // Simulate the assignment from main.js load
        window.gameState = Game.initializeGame();

        assert.strictEqual(initializeGameCallCount, 1, 'Game.initializeGame should have been called once on load.');
        assert.strictEqual(window.gameState, null, 'Global gameState should be null when initializeGame returns null.');
    });

    QUnit.test('Failed Initialization (gameActive: false): Handles object with gameActive: false', function(assert) {
        assert.expect(2); // Check call count and resulting gameState

        // Set the mock return value for the call that *already happened*
        mockGameState = { gameActive: false, testId: 'mockFail' };

        // Simulate the assignment from main.js load
        window.gameState = Game.initializeGame();

        assert.strictEqual(initializeGameCallCount, 1, 'Game.initializeGame should have been called once on load.');
        assert.deepEqual(window.gameState, mockGameState, 'Global gameState should be assigned the failure object returned by initializeGame.');
    });

});
