console.log("playerActions.test.js loaded");

QUnit.module('Player Actions (playerActions.js)', function(hooks) {

    // Use central helpers for constants
    hooks.before(function() {
        setupTestConstants();
    });

    hooks.after(function() {
        cleanupTestConstants();
    });

    QUnit.module('handleMoveOrAttack', function(hooks) {
        let logMock;

        hooks.beforeEach(function() {
            logMock = setupLogMock();
        });

        hooks.afterEach(function() {
            logMock.restore();
        });

        QUnit.test('Movement: Valid move to empty land', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1 });
            const mapData = [ [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_LAND, TILE_LAND], [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const targetRow = 1, targetCol = 2;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.row, targetRow, 'Player row updated');
            assert.equal(player.col, targetCol, 'Player col updated');
            assert.ok(logMock.calls.some(log => log.message.includes('Player moves to (1,2)')), 'Move logged');
        });

        QUnit.test('Movement: Valid move onto medkit', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1, resources: { medkits: 0 } });
            const mapData = [ [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_LAND, TILE_MEDKIT], [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const targetRow = 1, targetCol = 2;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.row, targetRow, 'Player row updated');
            assert.equal(player.col, targetCol, 'Player col updated');
            assert.equal(player.resources.medkits, 1, 'Player picked up medkit');
            assert.equal(mapData[targetRow][targetCol], TILE_LAND, 'Map tile became land');
            assert.ok(logMock.calls.some(log => log.message.includes('Player moves to (1,2)')), 'Move logged');
            assert.ok(logMock.calls.some(log => log.message.includes('Player collects Medkit')), 'Pickup logged');
        });

         QUnit.test('Movement: Valid move onto ammo', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1, resources: { ammo: 0 } });
            const mapData = [ [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_LAND, TILE_AMMO], [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const targetRow = 1, targetCol = 2;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.row, targetRow, 'Player row updated');
            assert.equal(player.col, targetCol, 'Player col updated');
            assert.equal(player.resources.ammo, PLAYER_AMMO_PICKUP_AMOUNT, 'Player picked up ammo');
            assert.equal(mapData[targetRow][targetCol], TILE_LAND, 'Map tile became land');
            assert.ok(logMock.calls.some(log => log.message.includes('Player moves to (1,2)')), 'Move logged');
            assert.ok(logMock.calls.some(log => log.message.includes('Player collects Ammo')), 'Pickup logged');
        });

        QUnit.test('Movement: Blocked by wall', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1 });
            const mapData = [ [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_LAND, TILE_WALL], [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const targetRow = 1, targetCol = 2;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.false(result, 'Should return false (turn not consumed)');
            assert.equal(player.row, 1, 'Player row unchanged');
            assert.equal(player.col, 1, 'Player col unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by terrain')), 'Blocked log');
        });

         QUnit.test('Movement: Blocked by tree', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1 });
            const mapData = [ [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_LAND, TILE_TREE], [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const targetRow = 1, targetCol = 2;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.false(result, 'Should return false (turn not consumed)');
            assert.equal(player.row, 1, 'Player row unchanged');
            assert.equal(player.col, 1, 'Player col unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by terrain')), 'Blocked log');
        });

         QUnit.test('Movement: Blocked by boundary', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1 });
            const mapData = [ [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_LAND, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const targetRow = 1, targetCol = 2;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.false(result, 'Should return false (turn not consumed)');
            assert.equal(player.row, 1, 'Player row unchanged');
            assert.equal(player.col, 1, 'Player col unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by terrain')), 'Blocked log');
        });

        QUnit.test('Movement: Blocked by map edge', function(assert) {
            const player = createMockUnit(true, { row: 0, col: 0 }); // Player at corner
            const mapData = [ [TILE_LAND, TILE_LAND], [TILE_LAND, TILE_LAND] ]; // Simple map, but player is at edge
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const targetRow = -1, targetCol = 0; // Target outside map

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.false(result, 'Should return false (turn not consumed)');
            assert.equal(player.row, 0, 'Player row unchanged');
            assert.equal(player.col, 0, 'Player col unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by map edge')), 'Blocked log');
        });

        QUnit.test('Attack: Hit enemy', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1 });
            const enemy = createMockUnit(false, { row: 1, col: 2, hp: 5 });
            const mapData = [ [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY], [TILE_BOUNDARY, TILE_LAND, TILE_LAND], [TILE_BOUNDARY, TILE_BOUNDARY, TILE_BOUNDARY] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [enemy] });
            const targetRow = 1, targetCol = 2;
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.row, 1, 'Player row unchanged');
            assert.equal(player.col, 1, 'Player col unchanged');
            assert.equal(enemy.hp, initialEnemyHp - PLAYER_ATTACK_DAMAGE, 'Enemy HP reduced');
            assert.ok(logMock.calls.some(log => log.message.includes('Player attacks')), 'Attack logged');
        });

        QUnit.test('Attack: Hit enemy with successful knockback', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1 });
            const enemy = createMockUnit(false, { row: 1, col: 2, hp: 5 });
            const mapData = [ [0,0,0,0], [0,0,0,0], [0,0,0,0] ]; // Open map for knockback
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [enemy] });
            const targetRow = 1, targetCol = 2;
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(enemy.hp, initialEnemyHp - PLAYER_ATTACK_DAMAGE, 'Enemy HP reduced');
            assert.equal(enemy.row, 1, 'Enemy row unchanged by knockback'); // Corrected expectation
            assert.equal(enemy.col, 3, 'Enemy col changed by knockback'); // Pushed right
            assert.ok(logMock.calls.some(log => log.message.includes('Player attacks')), 'Attack logged');
            assert.ok(logMock.calls.some(log => log.message.includes('knocked back')), 'Knockback logged');
        });

        QUnit.test('Attack: Hit enemy with blocked knockback (wall)', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1 });
            const enemy = createMockUnit(false, { row: 1, col: 2, hp: 5 });
            const mapData = [ [0,0,0,0], [0,0,0,TILE_WALL], [0,0,0,0] ]; // Wall blocking knockback
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [enemy] });
            const targetRow = 1, targetCol = 2;
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleMoveOrAttack(player, targetRow, targetCol, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(enemy.hp, initialEnemyHp - PLAYER_ATTACK_DAMAGE, 'Enemy HP reduced');
            assert.equal(enemy.row, 1, 'Enemy row unchanged'); // Knockback blocked
            assert.equal(enemy.col, 2, 'Enemy col unchanged'); // Knockback blocked
            assert.ok(logMock.calls.some(log => log.message.includes('Player attacks')), 'Attack logged');
            assert.ok(logMock.calls.some(log => log.message.includes('Knockback blocked')), 'Knockback blocked log');
        });

    });

    QUnit.module('handleHeal', function(hooks) {
        let logMock;

        hooks.beforeEach(function() {
            logMock = setupLogMock();
        });

        hooks.afterEach(function() {
            logMock.restore();
        });

        QUnit.test('Heal: Success (HP < Max, has medkit)', function(assert) {
            const player = createMockUnit(true, { hp: 5, maxHp: 15, resources: { medkits: 1 } });
            const gameState = createMockGameState({ player: player });
            const initialHp = player.hp;
            const initialMedkits = player.resources.medkits;

            const result = PlayerActions.handleHeal(player, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.hp, initialHp + HEAL_AMOUNT, 'Player HP increased');
            assert.equal(player.resources.medkits, initialMedkits - HEAL_COST, 'Medkit consumed');
            assert.ok(logMock.calls.some(log => log.message.includes('Player uses Medkit')), 'Heal logged');
        });

         QUnit.test('Heal: Success (Heals only up to Max HP)', function(assert) {
            const player = createMockUnit(true, { hp: 14, maxHp: 15, resources: { medkits: 1 } }); // Only 1 HP needed
            const gameState = createMockGameState({ player: player });
            const initialMedkits = player.resources.medkits;

            const result = PlayerActions.handleHeal(player, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.hp, player.maxHp, 'Player HP capped at maxHp');
            assert.equal(player.resources.medkits, initialMedkits - HEAL_COST, 'Medkit consumed');
            assert.ok(logMock.calls.some(log => log.message.includes('Player uses Medkit')), 'Heal logged');
        });

        QUnit.test('Heal: Failure (Full HP)', function(assert) {
            const player = createMockUnit(true, { hp: 15, maxHp: 15, resources: { medkits: 1 } });
            const gameState = createMockGameState({ player: player });
            const initialHp = player.hp;
            const initialMedkits = player.resources.medkits;

            const result = PlayerActions.handleHeal(player, gameState);

            assert.false(result, 'Should return false (turn not consumed)');
            assert.equal(player.hp, initialHp, 'Player HP unchanged');
            assert.equal(player.resources.medkits, initialMedkits, 'Medkit not consumed');
            assert.ok(logMock.calls.some(log => log.message.includes('Cannot heal: Full health')), 'Full health log');
        });

        QUnit.test('Heal: Failure (No medkits)', function(assert) {
            const player = createMockUnit(true, { hp: 5, maxHp: 15, resources: { medkits: 0 } });
            const gameState = createMockGameState({ player: player });
            const initialHp = player.hp;
            const initialMedkits = player.resources.medkits;

            const result = PlayerActions.handleHeal(player, gameState);

            assert.false(result, 'Should return false (turn not consumed)');
            assert.equal(player.hp, initialHp, 'Player HP unchanged');
            assert.equal(player.resources.medkits, initialMedkits, 'Medkit not consumed');
            assert.ok(logMock.calls.some(log => log.message.includes('Cannot heal: Need')), 'No medkits log');
        });
    });

    QUnit.module('handleShoot', function(hooks) {
        let logMock;

        hooks.beforeEach(function() {
            logMock = setupLogMock();
        });

        hooks.afterEach(function() {
            logMock.restore();
        });

        QUnit.test('Shoot: Failure (No ammo)', function(assert) {
            const player = createMockUnit(true, { resources: { ammo: 0 } });
            const gameState = createMockGameState({ player: player });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.false(result, 'Should return false (turn not consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('Cannot shoot: Out of ammo')), 'Out of ammo log');
        });

        QUnit.test('Shoot: Hit enemy within range', function(assert) {
            const player = createMockUnit(true, { row: 5, col: 5, resources: { ammo: 1 } });
            const enemy = createMockUnit(false, { row: 3, col: 5, hp: 5 }); // Directly above
            // Create gameState with appropriate size directly
            const gameState = createMockGameState({
                player: player,
                enemies: [enemy],
                gridHeight: 6, // Ensure map is large enough
                gridWidth: 6
            });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            assert.equal(enemy.hp, initialEnemyHp - RANGED_ATTACK_DAMAGE, 'Enemy HP reduced');
            assert.ok(logMock.calls.some(log => log.message.includes('Player shoots Up -> hits')), 'Hit logged');
            // Knockback check could be added if needed, similar to melee attack test
        });

         QUnit.test('Shoot: Hit enemy at max range', function(assert) {
            const player = createMockUnit(true, { row: RANGED_ATTACK_RANGE + 1, col: 1, resources: { ammo: 1 } }); // Player at row 6 (index 6)
            const enemy = createMockUnit(false, { row: 1, col: 1, hp: 5 }); // At max range above
            // Create gameState with appropriate size directly
            const gameState = createMockGameState({
                player: player,
                enemies: [enemy],
                gridHeight: RANGED_ATTACK_RANGE + 2, // Ensure map is large enough (row 6 needs height 7)
                gridWidth: 3
            });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            assert.equal(enemy.hp, initialEnemyHp - RANGED_ATTACK_DAMAGE, 'Enemy HP reduced');
            assert.ok(logMock.calls.some(log => log.message.includes('Player shoots Up -> hits')), 'Hit logged');
        });

        QUnit.test('Shoot: Miss (clear path, beyond range)', function(assert) {
            const player = createMockUnit(true, { row: RANGED_ATTACK_RANGE + 2, col: 1, resources: { ammo: 1 } }); // Player at row 7 (index 7)
            const enemy = createMockUnit(false, { row: 1, col: 1, hp: 5 }); // Beyond max range above
            // Create gameState with appropriate size directly
            const gameState = createMockGameState({
                player: player,
                enemies: [enemy],
                gridHeight: RANGED_ATTACK_RANGE + 3, // Ensure map is large enough (row 7 needs height 8)
                gridWidth: 3
            });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            assert.equal(enemy.hp, initialEnemyHp, 'Enemy HP unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('Player shoots Up -> missed')), 'Miss logged');
        });

        QUnit.test('Shoot: Blocked by wall', function(assert) {
            const player = createMockUnit(true, { row: 3, col: 1, resources: { ammo: 1 } });
            const enemy = createMockUnit(false, { row: 1, col: 1, hp: 5 }); // Above player
            const mapData = [ [0,0,0], [0,1,0], [0,0,0], [0,0,0] ]; // Wall at (1,1) between player and enemy
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [enemy] });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            assert.equal(enemy.hp, initialEnemyHp, 'Enemy HP unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by Wall at (1,1)')), 'Blocked by wall log');
        });

         QUnit.test('Shoot: Blocked by tree', function(assert) {
            const player = createMockUnit(true, { row: 3, col: 1, resources: { ammo: 1 } });
            const enemy = createMockUnit(false, { row: 1, col: 1, hp: 5 }); // Above player
            const mapData = [ [0,0,0], [0,TILE_TREE,0], [0,0,0], [0,0,0] ]; // Tree at (1,1)
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [enemy] });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";
            const initialEnemyHp = enemy.hp;

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            assert.equal(enemy.hp, initialEnemyHp, 'Enemy HP unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by Tree at (1,1)')), 'Blocked by tree log');
        });

         QUnit.test('Shoot: Blocked by boundary', function(assert) {
            const player = createMockUnit(true, { row: 1, col: 1, resources: { ammo: 1 } });
            // Use a map where boundary is actually TILE_BOUNDARY (5)
            const mapData = [ [5,5,5], [0,0,0], [0,0,0] ]; // Boundary above
            // Create gameState with specific mapData
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            // TILE_BOUNDARY is not explicitly named in log, check for generic block
            // Check for correct log message (should now say Boundary)
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by Boundary at (0,1)')), 'Blocked by boundary log');
         });

         QUnit.test('Shoot: Blocked by map edge', function(assert) {
            const player = createMockUnit(true, { row: 0, col: 1, resources: { ammo: 1 } });
            const mapData = [ [0,0,0], [0,0,0] ];
            const gameState = createMockGameState({ player: player, mapData: mapData, enemies: [] });
            const shootDirection = { dr: -1, dc: 0 }; // Up (off map)
            const dirString = "Up";

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            assert.ok(logMock.calls.some(log => log.message.includes('blocked by Map Edge')), 'Blocked by edge log');
        });

         QUnit.test('Shoot: Hits first enemy in line', function(assert) {
            const player = createMockUnit(true, { row: 4, col: 1, resources: { ammo: 1 } });
            const enemy1 = createMockUnit(false, { row: 2, col: 1, hp: 5, id: 'enemy_near' }); // Closer enemy
            const enemy2 = createMockUnit(false, { row: 1, col: 1, hp: 5, id: 'enemy_far' }); // Further enemy
            // Create gameState with appropriate size directly
            const gameState = createMockGameState({
                player: player,
                enemies: [enemy1, enemy2],
                gridHeight: 5, // Ensure map is large enough
                gridWidth: 3
            });
            const shootDirection = { dr: -1, dc: 0 }; // Up
            const dirString = "Up";
            const initialHpNear = enemy1.hp;
            const initialHpFar = enemy2.hp;

            const result = PlayerActions.handleShoot(player, shootDirection, dirString, gameState);

            assert.true(result, 'Should return true (turn consumed)');
            assert.equal(player.resources.ammo, 0, 'Ammo consumed');
            assert.equal(enemy1.hp, initialHpNear - RANGED_ATTACK_DAMAGE, 'Near enemy HP reduced');
            assert.equal(enemy2.hp, initialHpFar, 'Far enemy HP unchanged');
            assert.ok(logMock.calls.some(log => log.message.includes('hits enemy_near')), 'Hit near enemy log');
        });

    });

});
