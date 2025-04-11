console.log("config.test.js loaded");

QUnit.module('Configuration Constants', function() {

  QUnit.test('Grid & Map Dimensions', function(assert) {
    assert.strictEqual(typeof GRID_WIDTH, 'number', 'GRID_WIDTH should be a number');
    assert.ok(GRID_WIDTH >= 10 && GRID_WIDTH <= 100, 'GRID_WIDTH should be within range 10-100');

    assert.strictEqual(typeof GRID_HEIGHT, 'number', 'GRID_HEIGHT should be a number');
    assert.ok(GRID_HEIGHT >= 10 && GRID_HEIGHT <= 100, 'GRID_HEIGHT should be within range 10-100');

    // Check a few tile types exist and are numbers
    assert.strictEqual(typeof TILE_LAND, 'number', 'TILE_LAND should be a number');
    assert.strictEqual(typeof TILE_WALL, 'number', 'TILE_WALL should be a number');
    assert.strictEqual(typeof TILE_MEDKIT, 'number', 'TILE_MEDKIT should be a number');
    assert.strictEqual(typeof TILE_AMMO, 'number', 'TILE_AMMO should be a number');
    // Optional: Check TILE_LAND is 0 if that's fundamental
    // assert.strictEqual(TILE_LAND, 0, 'TILE_LAND should be 0');
  });

  QUnit.test('Player Configuration', function(assert) {
    assert.strictEqual(typeof PLAYER_MAX_HP, 'number', 'PLAYER_MAX_HP should be a number');
    assert.ok(PLAYER_MAX_HP >= 5 && PLAYER_MAX_HP <= 100, 'PLAYER_MAX_HP should be within range 5-100');

    assert.strictEqual(typeof PLAYER_START_AMMO, 'number', 'PLAYER_START_AMMO should be a number');
    assert.ok(PLAYER_START_AMMO >= 0, 'PLAYER_START_AMMO should be non-negative');

    assert.strictEqual(typeof PLAYER_START_MEDKITS, 'number', 'PLAYER_START_MEDKITS should be a number');
    assert.ok(PLAYER_START_MEDKITS >= 0, 'PLAYER_START_MEDKITS should be non-negative');

    assert.strictEqual(typeof PLAYER_ATTACK_DAMAGE, 'number', 'PLAYER_ATTACK_DAMAGE should be a number');
    assert.ok(PLAYER_ATTACK_DAMAGE > 0, 'PLAYER_ATTACK_DAMAGE should be positive');

    assert.strictEqual(typeof PLAYER_AMMO_PICKUP_AMOUNT, 'number', 'PLAYER_AMMO_PICKUP_AMOUNT should be a number');
    assert.ok(PLAYER_AMMO_PICKUP_AMOUNT > 0, 'PLAYER_AMMO_PICKUP_AMOUNT should be positive');

    assert.strictEqual(typeof PLAYER_COLOR, 'string', 'PLAYER_COLOR should be a string');
  });

  QUnit.test('AI Configuration', function(assert) {
    assert.strictEqual(typeof NUM_ENEMIES, 'number', 'NUM_ENEMIES should be a number');
    assert.ok(NUM_ENEMIES >= 0 && NUM_ENEMIES <= 100, 'NUM_ENEMIES should be within range 0-100');

    // Check AI HP Min/Max if they exist
    if (typeof AI_HP_MIN !== 'undefined') assert.ok(typeof AI_HP_MIN === 'number' && AI_HP_MIN > 0, 'AI_HP_MIN');
    if (typeof AI_HP_MAX !== 'undefined') assert.ok(typeof AI_HP_MAX === 'number' && AI_HP_MAX > 0, 'AI_HP_MAX');


    assert.strictEqual(typeof AI_ATTACK_DAMAGE, 'number', 'AI_ATTACK_DAMAGE should be a number');
    assert.ok(AI_ATTACK_DAMAGE > 0, 'AI_ATTACK_DAMAGE should be positive');

    // AI_START_AMMO is not defined; starting ammo uses MIN/MAX
     // Add min/max if they exist
    if (typeof AI_AMMO_MIN !== 'undefined') assert.ok(typeof AI_AMMO_MIN === 'number' && AI_AMMO_MIN >= 0, 'AI_AMMO_MIN');
    if (typeof AI_AMMO_MAX !== 'undefined') assert.ok(typeof AI_AMMO_MAX === 'number' && AI_AMMO_MAX >= 0, 'AI_AMMO_MAX');


    assert.strictEqual(typeof AI_AMMO_PICKUP_AMOUNT, 'number', 'AI_AMMO_PICKUP_AMOUNT should be a number');
    assert.ok(AI_AMMO_PICKUP_AMOUNT > 0, 'AI_AMMO_PICKUP_AMOUNT should be positive');

    // AI_DETECTION_RANGE is not a single constant; range is defined by MIN/MAX
     // Add min/max if they exist
    if (typeof AI_RANGE_MIN !== 'undefined') assert.ok(typeof AI_RANGE_MIN === 'number' && AI_RANGE_MIN > 0, 'AI_RANGE_MIN');
    if (typeof AI_RANGE_MAX !== 'undefined') assert.ok(typeof AI_RANGE_MAX === 'number' && AI_RANGE_MAX > 0, 'AI_RANGE_MAX');


    // Check AI States exist and are strings (IDLE is not defined)
    assert.strictEqual(typeof AI_STATE_EXPLORING, 'string', 'AI_STATE_EXPLORING should be a string');
    assert.strictEqual(typeof AI_STATE_SEEKING_RESOURCES, 'string', 'AI_STATE_SEEKING_RESOURCES should be a string');
    assert.strictEqual(typeof AI_STATE_ENGAGING_ENEMY, 'string', 'AI_STATE_ENGAGING_ENEMY should be a string');
    assert.strictEqual(typeof AI_STATE_FLEEING, 'string', 'AI_STATE_FLEEING should be a string');
    assert.strictEqual(typeof AI_STATE_HEALING, 'string', 'AI_STATE_HEALING should be a string');

    assert.strictEqual(typeof ENEMY_DEFAULT_COLOR, 'string', 'ENEMY_DEFAULT_COLOR should be a string');
  });

  QUnit.test('Combat & Action Values', function(assert) {
    assert.strictEqual(typeof RANGED_ATTACK_RANGE, 'number', 'RANGED_ATTACK_RANGE should be a number');
    assert.ok(RANGED_ATTACK_RANGE > 0, 'RANGED_ATTACK_RANGE should be positive');

    assert.strictEqual(typeof RANGED_ATTACK_DAMAGE, 'number', 'RANGED_ATTACK_DAMAGE should be a number');
    assert.ok(RANGED_ATTACK_DAMAGE > 0, 'RANGED_ATTACK_DAMAGE should be positive');

    // Correct constant name used for healing
    assert.strictEqual(typeof HEAL_AMOUNT, 'number', 'HEAL_AMOUNT should be a number');
    assert.ok(HEAL_AMOUNT > 0, 'HEAL_AMOUNT should be positive');

    // KNOCKBACK_CHANCE is not defined in config.js, removed checks
  });

  QUnit.test('Game Mechanics', function(assert) {
      assert.strictEqual(typeof SHRINK_INTERVAL, 'number', 'SHRINK_INTERVAL should be a number');
      assert.ok(SHRINK_INTERVAL >= 5, 'SHRINK_INTERVAL should be >= 5');

      assert.strictEqual(typeof SHRINK_AMOUNT, 'number', 'SHRINK_AMOUNT should be a number');
      assert.ok(SHRINK_AMOUNT >= 1, 'SHRINK_AMOUNT should be >= 1');

      assert.strictEqual(typeof STORM_DAMAGE, 'number', 'STORM_DAMAGE should be a number');
      assert.ok(STORM_DAMAGE >= 1, 'STORM_DAMAGE should be >= 1');
  });

   QUnit.test('Logging Configuration', function(assert) {
      assert.strictEqual(typeof CONSOLE_LOG_LEVEL, 'string', 'CONSOLE_LOG_LEVEL should be a string');
      // Check if it's one of the valid levels
      const validLogLevels = ['DEBUG', 'INFO', 'PLAYER', 'WARN', 'ERROR'];
      assert.ok(validLogLevels.includes(CONSOLE_LOG_LEVEL), `CONSOLE_LOG_LEVEL should be one of ${validLogLevels.join(', ')}`);

      assert.strictEqual(typeof MAX_LOG_MESSAGES, 'number', 'MAX_LOG_MESSAGES should be a number');
      assert.ok(MAX_LOG_MESSAGES > 0, 'MAX_LOG_MESSAGES should be positive');

      // Check log classes exist and are strings
      assert.strictEqual(typeof LOG_CLASS_PLAYER_GOOD, 'string', 'LOG_CLASS_PLAYER_GOOD');
      assert.strictEqual(typeof LOG_CLASS_PLAYER_BAD, 'string', 'LOG_CLASS_PLAYER_BAD');
      assert.strictEqual(typeof LOG_CLASS_ENEMY_EVENT, 'string', 'LOG_CLASS_ENEMY_EVENT');
      assert.strictEqual(typeof LOG_CLASS_SYSTEM, 'string', 'LOG_CLASS_SYSTEM');
      // Add others as needed
   });

});
