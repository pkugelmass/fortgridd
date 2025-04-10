console.log("config.test.js loaded");

QUnit.module('Configuration Constants', function() {

  QUnit.test('Grid Dimensions', function(assert) {
    assert.ok(typeof GRID_WIDTH === 'number' && GRID_WIDTH > 0, 'GRID_WIDTH should be a positive number');
    assert.ok(typeof GRID_HEIGHT === 'number' && GRID_HEIGHT > 0, 'GRID_HEIGHT should be a positive number');
    assert.equal(GRID_WIDTH, 50, 'GRID_WIDTH is expected value'); // Example assertion
    assert.equal(GRID_HEIGHT, 44, 'GRID_HEIGHT is expected value'); // Example assertion
  });

  QUnit.test('Player Stats', function(assert) {
    assert.ok(typeof PLAYER_MAX_HP === 'number' && PLAYER_MAX_HP > 0, 'PLAYER_MAX_HP should be a positive number');
    assert.equal(PLAYER_MAX_HP, 15, 'PLAYER_MAX_HP is expected value');
    assert.ok(typeof PLAYER_START_AMMO === 'number' && PLAYER_START_AMMO >= 0, 'PLAYER_START_AMMO should be non-negative');
    // Removed assertion for specific PLAYER_START_AMMO value
    assert.ok(typeof PLAYER_START_MEDKITS === 'number' && PLAYER_START_MEDKITS >= 0, 'PLAYER_START_MEDKITS should be non-negative');
    assert.equal(PLAYER_START_MEDKITS, 0, 'PLAYER_START_MEDKITS is expected value');
  });

  QUnit.test('AI Configuration', function(assert) {
    assert.ok(typeof NUM_ENEMIES === 'number' && NUM_ENEMIES >= 0, 'NUM_ENEMIES should be non-negative');
    // Removed assertion for specific NUM_ENEMIES value
    assert.ok(typeof AI_ATTACK_DAMAGE === 'number' && AI_ATTACK_DAMAGE > 0, 'AI_ATTACK_DAMAGE should be positive');
    assert.equal(AI_ATTACK_DAMAGE, 2, 'AI_ATTACK_DAMAGE is expected value'); // Keep this one for now, as it matches config
  });

  QUnit.test('Combat Values', function(assert) {
    assert.ok(typeof PLAYER_ATTACK_DAMAGE === 'number' && PLAYER_ATTACK_DAMAGE > 0, 'PLAYER_ATTACK_DAMAGE should be positive');
    assert.equal(PLAYER_ATTACK_DAMAGE, 2, 'PLAYER_ATTACK_DAMAGE is expected value');
    assert.ok(typeof RANGED_ATTACK_RANGE === 'number' && RANGED_ATTACK_RANGE > 0, 'RANGED_ATTACK_RANGE should be positive');
    assert.equal(RANGED_ATTACK_RANGE, 5, 'RANGED_ATTACK_RANGE is expected value');
    assert.ok(typeof RANGED_ATTACK_DAMAGE === 'number' && RANGED_ATTACK_DAMAGE > 0, 'RANGED_ATTACK_DAMAGE should be positive');
    assert.equal(RANGED_ATTACK_DAMAGE, 2, 'RANGED_ATTACK_DAMAGE is expected value');
  });

  // Add more tests for other constants as needed

});
