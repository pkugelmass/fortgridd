console.log("gameState.test.js loaded");

QUnit.module('GameState Class (gameState.js)', function() {

  QUnit.test('Constructor initializes properties to defaults', function(assert) {
    // Ensure the GameState class is available (loaded via test-runner.html)
    assert.ok(typeof GameState === 'function', 'GameState class should be defined');

    const state = new GameState();

    assert.strictEqual(state.mapData, null, 'mapData should be null initially');
    assert.strictEqual(state.player, null, 'player should be null initially');
    assert.deepEqual(state.enemies, [], 'enemies should be an empty array initially');
    assert.strictEqual(state.turnNumber, 0, 'turnNumber should be 0 initially');
    assert.strictEqual(state.safeZone, null, 'safeZone should be null initially');
    assert.strictEqual(state.gameActive, false, 'gameActive should be false initially');
    assert.deepEqual(state.logMessages, [], 'logMessages should be an empty array initially');
  });

});
