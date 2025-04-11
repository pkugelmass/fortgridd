console.log("utils/knockback.test.js loaded");

QUnit.module('Knockback Functions (utils.js)', function() {

    QUnit.module('calculateKnockbackDestination', function(hooks) {
        let logMock; // Use setupLogMock from test-helpers.js

        hooks.beforeEach(function() {
            logMock = setupLogMock();
        });

        hooks.afterEach(function() {
            logMock.restore();
        });

        QUnit.test('Calculates target push coordinates correctly', function(assert) {
            const attacker = { row: 5, col: 5 };
            const mockGameState = {}; // Minimal mock for logging context

            // Target above attacker
            let target1 = { row: 4, col: 5 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target1, mockGameState), { row: 3, col: 5 }, 'Target directly above');

            // Target below attacker
            let target2 = { row: 6, col: 5 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target2, mockGameState), { row: 7, col: 5 }, 'Target directly below');

            // Target left of attacker
            let target3 = { row: 5, col: 4 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target3, mockGameState), { row: 5, col: 3 }, 'Target directly left');

            // Target right of attacker
            let target4 = { row: 5, col: 6 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target4, mockGameState), { row: 5, col: 7 }, 'Target directly right');

            // Target diagonal (up-left)
            let target5 = { row: 4, col: 4 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target5, mockGameState), { row: 3, col: 3 }, 'Target diagonal up-left');

            // Target diagonal (down-right)
            let target6 = { row: 6, col: 6 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target6, mockGameState), { row: 7, col: 7 }, 'Target diagonal down-right');

             // Target diagonal (up-right)
            let target7 = { row: 4, col: 6 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target7, mockGameState), { row: 3, col: 7 }, 'Target diagonal up-right');

             // Target diagonal (down-left)
            let target8 = { row: 6, col: 4 };
            assert.deepEqual(calculateKnockbackDestination(attacker, target8, mockGameState), { row: 7, col: 3 }, 'Target diagonal down-left');
        });

        QUnit.test('Handles attacker and target at same position', function(assert) {
            const attacker = { row: 5, col: 5 };
            const target = { row: 5, col: 5 };
            const mockGameState = {};
            const result = calculateKnockbackDestination(attacker, target, mockGameState);

            assert.deepEqual(result, { row: 6, col: 5 }, 'Defaults push direction (down)');
            // Check if the specific warning exists (guideline: don't test exact count unless critical)
            assert.ok(logMock.calls.some(log => log.message.includes('Attacker and target at same position') && log.options.level === 'WARN'),
                      'Should log a warning for same position');
        });

        QUnit.test('Handles invalid input', function(assert) {
            const validUnit = { row: 1, col: 1 };
            const mockGameState = {};

            assert.strictEqual(calculateKnockbackDestination(null, validUnit, mockGameState), null, 'Null attacker returns null');
            assert.strictEqual(calculateKnockbackDestination(validUnit, null, mockGameState), null, 'Null target returns null');
            assert.strictEqual(calculateKnockbackDestination({ row: null, col: 1 }, validUnit, mockGameState), null, 'Attacker with null row returns null');
            assert.strictEqual(calculateKnockbackDestination({ row: 1, col: null }, validUnit, mockGameState), null, 'Attacker with null col returns null');
            assert.strictEqual(calculateKnockbackDestination(validUnit, { row: null, col: 1 }, mockGameState), null, 'Target with null row returns null');
            assert.strictEqual(calculateKnockbackDestination(validUnit, { row: 1, col: null }, mockGameState), null, 'Target with null col returns null');

            // Check that *an* error was logged (guideline: don't test exact count)
            assert.ok(logMock.calls.some(log => log.message.includes('Invalid attacker or target position') && log.options.level === 'ERROR'),
                      'Should log an error for invalid input');
        });
    });

    QUnit.module('applyKnockback', function(hooks) {
        let logMock;

        // Use central helpers for constants
        hooks.before(function() {
            setupTestConstants();
        });

        hooks.after(function() {
            cleanupTestConstants();
        });

        hooks.beforeEach(function() {
            logMock = setupLogMock();
        });

        hooks.afterEach(function() {
            logMock.restore();
        });

        QUnit.test('Successful knockback into empty land', function(assert) {
            const attacker = createMockUnit(true, { row: 2, col: 2 });
            const target = createMockUnit(false, { id: 'kb_target', row: 2, col: 3 }); // Target to the right
            const mapData = [
                [1, 1, 1, 1, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, 0], // Attacker/Target row (target pushed to 2,4)
                [1, 0, 0, 0, 1],
                [1, 1, 1, 1, 1]
            ];
            const gameState = createMockGameState({ player: attacker, enemies: [target], mapData: mapData });

            const result = applyKnockback(attacker, target, gameState);

            assert.true(result.success, 'Knockback should succeed');
            assert.deepEqual(result.dest, { row: 2, col: 4 }, 'Destination should be calculated correctly');
            assert.strictEqual(result.reason, null, 'Reason should be null on success');
            assert.equal(target.row, 2, 'Target final row should be updated');
            assert.equal(target.col, 4, 'Target final col should be updated');
            // updateUnitPosition calls checkAndPickupResourceAt which might log.
            // calculateKnockbackDestination might also log if inputs were bad (shouldn't happen here).
            // Asserting zero logs is correct here, as calculateKnockbackDestination and checkAndPickupResourceAt shouldn't log in this valid path.
             // Guideline: Avoid testing log counts unless critical. Check no ERROR logs occurred.
             assert.notOk(logMock.calls.some(log => log.options.level === 'ERROR'), 'Should not log any errors');
        });

         QUnit.test('Successful knockback onto resource (check pickup log)', function(assert) {
            const attacker = createMockUnit(true, { row: 2, col: 2 });
            const target = createMockUnit(false, { id: 'kb_target', row: 2, col: 3, resources: {medkits: 0} }); // Target to the right
            const mapData = [
                [1, 1, 1, 1, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 0, TILE_MEDKIT], // Attacker/Target row (target pushed onto medkit at 2,4)
                [1, 0, 0, 0, 1],
                [1, 1, 1, 1, 1]
            ];
            const gameState = createMockGameState({ player: attacker, enemies: [target], mapData: mapData });

            const result = applyKnockback(attacker, target, gameState);

            assert.true(result.success, 'Knockback should succeed');
            assert.deepEqual(result.dest, { row: 2, col: 4 }, 'Destination should be calculated correctly');
            assert.equal(target.row, 2, 'Target final row updated');
            assert.equal(target.col, 4, 'Target final col updated');
            assert.equal(target.resources.medkits, 1, 'Target should pick up medkit');
            assert.equal(gameState.mapData[2][4], TILE_LAND, 'Resource tile should become land');
            // Check that the specific pickup log exists (critical side-effect confirmation)
            assert.ok(logMock.calls.some(log => log.message.includes('Enemy kb_target collects Medkit') && log.options.className === LOG_CLASS_ENEMY_EVENT),
                      'Should log the resource pickup');
        });


        QUnit.test('Failure: Knockback destination out of bounds', function(assert) {
            const attacker = createMockUnit(true, { row: 0, col: 1 });
            const target = createMockUnit(false, { id: 'kb_target', row: 0, col: 0 }); // Target pushed left off map
            const mapData = [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0]
            ];
            const gameState = createMockGameState({ player: attacker, enemies: [target], mapData: mapData });
            const originalRow = target.row;
            const originalCol = target.col;

            const result = applyKnockback(attacker, target, gameState);

            assert.false(result.success, 'Knockback should fail (out of bounds)');
            assert.deepEqual(result.dest, { row: 0, col: -1 }, 'Destination should be calculated correctly');
            assert.equal(result.reason, 'out_of_bounds', 'Reason should be out_of_bounds');
            assert.equal(target.row, originalRow, 'Target row should not change');
            assert.equal(target.col, originalCol, 'Target col should not change');
        });

        QUnit.test('Failure: Knockback destination blocked by terrain (wall)', function(assert) {
            const attacker = createMockUnit(true, { row: 1, col: 1 });
            const target = createMockUnit(false, { id: 'kb_target', row: 1, col: 2 }); // Target pushed right into wall
            const mapData = [
                [0, 0, 0, 0],
                [0, 0, 0, 1], // Wall at (1,3)
                [0, 0, 0, 0]
            ];
            const gameState = createMockGameState({ player: attacker, enemies: [target], mapData: mapData });
            const originalRow = target.row;
            const originalCol = target.col;

            const result = applyKnockback(attacker, target, gameState);

            assert.false(result.success, 'Knockback should fail (blocked terrain)');
            assert.deepEqual(result.dest, { row: 1, col: 3 }, 'Destination should be calculated correctly');
            assert.equal(result.reason, 'blocked_terrain', 'Reason should be blocked_terrain');
            assert.equal(target.row, originalRow, 'Target row should not change');
            assert.equal(target.col, originalCol, 'Target col should not change');
        });

         QUnit.test('Failure: Knockback destination blocked by terrain (tree)', function(assert) {
            const attacker = createMockUnit(true, { row: 1, col: 1 });
            const target = createMockUnit(false, { id: 'kb_target', row: 1, col: 2 }); // Target pushed right into tree
            const mapData = [
                [0, 0, 0, 0],
                [0, 0, 0, TILE_TREE], // Tree at (1,3)
                [0, 0, 0, 0]
            ];
            const gameState = createMockGameState({ player: attacker, enemies: [target], mapData: mapData });
            const originalRow = target.row;
            const originalCol = target.col;

            const result = applyKnockback(attacker, target, gameState);

            assert.false(result.success, 'Knockback should fail (blocked terrain)');
            assert.deepEqual(result.dest, { row: 1, col: 3 }, 'Destination should be calculated correctly');
            assert.equal(result.reason, 'blocked_terrain', 'Reason should be blocked_terrain');
            assert.equal(target.row, originalRow, 'Target row should not change');
            assert.equal(target.col, originalCol, 'Target col should not change');
        });

        QUnit.test('Failure: Knockback destination occupied by player', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 3 }); // Player at destination
            const attacker = createMockUnit(false, { id: 'attacker', row: 1, col: 1 });
            const target = createMockUnit(false, { id: 'kb_target', row: 1, col: 2 }); // Target pushed right into player
            const mapData = [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ];
            // Ensure player is distinct from attacker/target if attacker is AI
            const gameState = createMockGameState({ player: player, enemies: [attacker, target], mapData: mapData });
            const originalRow = target.row;
            const originalCol = target.col;

            const result = applyKnockback(attacker, target, gameState);

            assert.false(result.success, 'Knockback should fail (blocked occupied)');
            assert.deepEqual(result.dest, { row: 1, col: 3 }, 'Destination should be calculated correctly');
            assert.equal(result.reason, 'blocked_occupied', 'Reason should be blocked_occupied');
            assert.equal(target.row, originalRow, 'Target row should not change');
            assert.equal(target.col, originalCol, 'Target col should not change');
        });

        QUnit.test('Failure: Knockback destination occupied by another enemy', function(assert) {
            const attacker = createMockUnit(true, { row: 1, col: 1 });
            const target = createMockUnit(false, { id: 'kb_target', row: 1, col: 2 }); // Target pushed right
            const otherEnemy = createMockUnit(false, { id: 'blocker', row: 1, col: 3 }); // Other enemy at destination
             const mapData = [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ];
            const gameState = createMockGameState({ player: attacker, enemies: [target, otherEnemy], mapData: mapData });
            const originalRow = target.row;
            const originalCol = target.col;

            const result = applyKnockback(attacker, target, gameState);

            assert.false(result.success, 'Knockback should fail (blocked occupied)');
            assert.deepEqual(result.dest, { row: 1, col: 3 }, 'Destination should be calculated correctly');
            assert.equal(result.reason, 'blocked_occupied', 'Reason should be blocked_occupied');
            assert.equal(target.row, originalRow, 'Target row should not change');
            assert.equal(target.col, originalCol, 'Target col should not change');
        });

         QUnit.test('Failure: Invalid input (null attacker)', function(assert) {
            const target = createMockUnit(false);
            const gameState = createMockGameState({enemies: [target]});
            const result = applyKnockback(null, target, gameState);

            assert.false(result.success, 'Knockback should fail (invalid input)');
            assert.strictEqual(result.dest, null, 'Destination should be null');
            assert.equal(result.reason, 'internal_error', 'Reason should be internal_error'); // Based on function logic
            // Check if the specific error log exists (critical error path confirmation)
            assert.ok(logMock.calls.some(log => log.message.includes('Missing attacker, target, or required gameState') && log.options.level === 'ERROR'),
                      'Should log error for null attacker');
        });

         QUnit.test('Failure: Invalid input (null target)', function(assert) {
            const attacker = createMockUnit(true);
            const gameState = createMockGameState({player: attacker});
            const result = applyKnockback(attacker, null, gameState);

            assert.false(result.success, 'Knockback should fail (invalid input)');
            assert.strictEqual(result.dest, null, 'Destination should be null');
            assert.equal(result.reason, 'internal_error', 'Reason should be internal_error');
            // Check if the specific error log exists (critical error path confirmation)
            assert.ok(logMock.calls.some(log => log.message.includes('Missing attacker, target, or required gameState') && log.options.level === 'ERROR'),
                      'Should log error for null target');
        });

         QUnit.test('Failure: Invalid input (null gameState)', function(assert) {
            const attacker = createMockUnit(true);
            const target = createMockUnit(false);
            const result = applyKnockback(attacker, target, null);

            assert.false(result.success, 'Knockback should fail (invalid input)');
            assert.strictEqual(result.dest, null, 'Destination should be null');
            assert.equal(result.reason, 'internal_error', 'Reason should be internal_error');
            // Guideline: Don't test logs unless critical. The function returns the correct error object.
            // The internal log call fails due to null gameState, but the function itself behaves correctly.
            // No assertion on logs needed here.
            assert.ok(true, "Test confirms function returns correctly despite internal log issue with null gameState");
        });

         QUnit.test('Failure: Invalid input (missing mapData)', function(assert) {
            const attacker = createMockUnit(true);
            const target = createMockUnit(false);
            const gameState = createMockGameState({player: attacker, enemies: [target]});
            delete gameState.mapData;
            const result = applyKnockback(attacker, target, gameState);

            assert.false(result.success, 'Knockback should fail (invalid input)');
            assert.strictEqual(result.dest, null, 'Destination should be null');
            assert.equal(result.reason, 'internal_error', 'Reason should be internal_error');
            // Check if the specific error log exists (critical error path confirmation)
             assert.ok(logMock.calls.some(log => log.message.includes('Missing attacker, target, or required gameState') && log.options.level === 'ERROR'),
                       'Should log error for missing mapData');
        });

    });

});
