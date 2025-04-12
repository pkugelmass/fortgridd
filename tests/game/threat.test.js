/**
 * QUnit tests for Game.calculateThreatMap
 * Uses helpers from tests/test-helpers.js
 */

// No import needed; test-helpers.js and game.js are loaded globally by test-runner.html

QUnit.module('Game.calculateThreatMap', {
    before: setupTestConstants,
    after: cleanupTestConstants
});

QUnit.test('returns a zeroed map if there are no enemies', function(assert) {
    const gameState = createMockGameState({ enemies: [], gridWidth: 5, gridHeight: 5 });
    const threatMap = Game.calculateThreatMap(gameState);
    assert.ok(threatMap.flat().every(v => v === 0), 'All tiles should be zero when there are no enemies');
});

QUnit.test('marks correct tiles for a single enemy in the center', function(assert) {
    const center = 2;
    const enemy = createMockUnit(false, { row: center, col: center, hp: 5, resources: { ammo: 0 } });
    const gameState = createMockGameState({ enemies: [enemy], gridWidth: 5, gridHeight: 5 });
    const threatMap = Game.calculateThreatMap(gameState);
    let count = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const dist = Math.abs(r - center) + Math.abs(c - center);
            if (dist === 1) {
                assert.equal(threatMap[r][c], 1, `Tile (${r},${c}) should be threatened`);
                count++;
            } else {
                assert.equal(threatMap[r][c], 0, `Tile (${r},${c}) should not be threatened`);
            }
        }
    }
    assert.equal(count, 4, 'Should threaten 4 tiles (orthogonal neighbors only, not center)');
});

QUnit.test('sums threats for overlapping enemies', function(assert) {
    // Place enemies so their threat rays overlap but do not block each other
    const e1 = createMockUnit(false, { row: 1, col: 2, hp: 5 });
    const e2 = createMockUnit(false, { row: 3, col: 2, hp: 5 });
    const gameState = createMockGameState({ enemies: [e1, e2], gridWidth: 5, gridHeight: 5 });
    const threatMap = Game.calculateThreatMap(gameState);
    let overlap = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (threatMap[r][c] > 1) overlap++;
        }
    }
    assert.ok(overlap > 0, 'There should be at least one tile with overlapping threats');
});

QUnit.test('ignores dead or inactive enemies', function(assert) {
    const dead = createMockUnit(false, { row: 1, col: 1, hp: 0, resources: { ammo: 0 } });
    const inactive = createMockUnit(false, { row: 2, col: 2, hp: 5, inactive: true, resources: { ammo: 0 } });
    const alive = createMockUnit(false, { row: 3, col: 3, hp: 5, resources: { ammo: 0 } });
    const gameState = createMockGameState({ enemies: [dead, inactive, alive], gridWidth: 5, gridHeight: 5 });
    const threatMap = Game.calculateThreatMap(gameState);
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const dist = Math.abs(r - 3) + Math.abs(c - 3);
            const isOrthogonal = (r === 3 || c === 3) && dist === 1;
            if (isOrthogonal) {
                assert.equal(threatMap[r][c], 1, `Tile (${r},${c}) should be threatened by alive enemy (orthogonal)`);
            } else {
                assert.equal(threatMap[r][c], 0, `Tile (${r},${c}) should not be threatened`);
            }
        }
    }
});

QUnit.test('handles enemies at the map border without error', function(assert) {
    const edge = createMockUnit(false, { row: 0, col: 0, hp: 5, resources: { ammo: 0 } });
    const gameState = createMockGameState({ enemies: [edge], gridWidth: 5, gridHeight: 5 });
    const threatMap = Game.calculateThreatMap(gameState);
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const dist = Math.abs(r - 0) + Math.abs(c - 0);
            const isOrthogonal = (r === 0 || c === 0) && dist === 1;
            if (isOrthogonal) {
                assert.equal(threatMap[r][c], 1, `Tile (${r},${c}) should be threatened by border enemy (orthogonal)`);
            } else {
                assert.equal(threatMap[r][c], 0, `Tile (${r},${c}) should not be threatened`);
            }
        }
    }
QUnit.test('marks only orthogonal tiles for a ranged enemy in the center', function(assert) {
    // Assume RANGED_ATTACK_RANGE = 3 for this test
    const center = 3;
    const range = 3;
    const enemy = createMockUnit(false, { row: center, col: center, hp: 5, resources: { ammo: 1 } });
    // Patch global RANGED_ATTACK_RANGE if needed
    const oldRange = typeof RANGED_ATTACK_RANGE !== 'undefined' ? RANGED_ATTACK_RANGE : undefined;
    window.RANGED_ATTACK_RANGE = range;

    const gameState = createMockGameState({ enemies: [enemy], gridWidth: 7, gridHeight: 7 });
    const threatMap = Game.calculateThreatMap(gameState);

    let count = 0;
    for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
            const dist = Math.abs(r - center) + Math.abs(c - center);
            const isOrthogonal = (r === center || c === center) && dist > 0 && dist <= range;
            if (isOrthogonal) {
                assert.equal(threatMap[r][c], 1, `Tile (${r},${c}) should be threatened (orthogonal, range ${range})`);
                count++;
            } else {
                assert.equal(threatMap[r][c], 0, `Tile (${r},${c}) should not be threatened`);
            }
        }
    }
    assert.equal(count, 12, 'Should threaten 12 orthogonal tiles (not diagonals, not center)');

    // Restore RANGED_ATTACK_RANGE if it was set before
    if (oldRange !== undefined) {
        window.RANGED_ATTACK_RANGE = oldRange;
    }
});
QUnit.test('threat is blocked by walls', function(assert) {
    // Enemy at (2,2), wall at (2,4), range 3, grid 5x5
    const gridWidth = 5, gridHeight = 5;
    const mapData = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));
    mapData[2][4] = 1; // TILE_WALL
    const enemy = createMockUnit(false, { row: 2, col: 2, hp: 5, resources: { ammo: 1 } });
    const gameState = createMockGameState({ enemies: [enemy], gridWidth, gridHeight, mapData });
    const oldRange = typeof RANGED_ATTACK_RANGE !== 'undefined' ? RANGED_ATTACK_RANGE : undefined;
    window.RANGED_ATTACK_RANGE = 3;
    const threatMap = Game.calculateThreatMap(gameState);

    // (2,3) should be threatened, (2,4) should NOT (blocked), (2,5) and beyond should not be threatened
    assert.equal(threatMap[2][3], 1, '(2,3) should be threatened');
    assert.equal(threatMap[2][4], 0, '(2,4) is a wall, should not be threatened');
    // (2,1) and (2,0) should be threatened (left side, no block)
    assert.equal(threatMap[2][1], 1, '(2,1) should be threatened');
    assert.equal(threatMap[2][0], 1, '(2,0) should be threatened');
    // (2,5) is out of bounds, so not checked

    if (oldRange !== undefined) window.RANGED_ATTACK_RANGE = oldRange;
});

QUnit.test('threat is blocked by units', function(assert) {
    // Enemy at (2,2), another enemy at (2,3), range 3, grid 5x5
    const gridWidth = 5, gridHeight = 5;
    const mapData = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));
    const enemy = createMockUnit(false, { row: 2, col: 2, hp: 5, resources: { ammo: 1 } });
    const blocker = createMockUnit(false, { row: 2, col: 3, hp: 5, resources: { ammo: 0 } });
    const gameState = createMockGameState({ enemies: [enemy, blocker], gridWidth, gridHeight, mapData });
    const oldRange = typeof RANGED_ATTACK_RANGE !== 'undefined' ? RANGED_ATTACK_RANGE : undefined;
    window.RANGED_ATTACK_RANGE = 3;
    const threatMap = Game.calculateThreatMap(gameState);

    // (2,3) should be threatened (blocked by unit), (2,4) should not be threatened
    assert.equal(threatMap[2][3], 1, '(2,3) is blocked by unit, should be threatened');
    assert.equal(threatMap[2][4], 0, '(2,4) is beyond blocker, should not be threatened');
    // (2,1) and (2,0) should be threatened (left side, no block)
    assert.equal(threatMap[2][1], 1, '(2,1) should be threatened');
    assert.equal(threatMap[2][0], 1, '(2,0) should be threatened');

    if (oldRange !== undefined) window.RANGED_ATTACK_RANGE = oldRange;
});
});