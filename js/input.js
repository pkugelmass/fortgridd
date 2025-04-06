console.log("input.js loaded");

/**
 * Handles keydown events for player movement, bump-attack, OR skipping turn (' ').
 * Relies on global vars: gameActive, currentTurn, player, enemies, mapData,
 * GRID_WIDTH, GRID_HEIGHT, TILE_LAND, TILE_SCRAP, PLAYER_ATTACK_DAMAGE,
 * AI_ATTACK_DAMAGE.
 * Relies on global functions: redrawCanvas, executeAiTurns.
 * @param {KeyboardEvent} event - The keyboard event object.
 */
function handleKeyDown(event) {
    // console.log("handleKeyDown Fired! Key:", event.key);
    if (!gameActive || currentTurn !== 'player') { return; }
    if (typeof player === 'undefined' || player.row === null || player.col === null) { return; }

    let targetRow = player.row; let targetCol = player.col;
    let actionKey = false; let actionType = null;

    switch (event.key.toLowerCase()) {
        case 'arrowup': case 'w': targetRow--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowdown': case 's': targetRow++; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowleft': case 'a': targetCol--; actionKey = true; actionType = 'move_or_attack'; break;
        case 'arrowright': case 'd': targetCol++; actionKey = true; actionType = 'move_or_attack'; break;
        case ' ': actionKey = true; actionType = 'wait'; break; // Spacebar = Wait
        default: return;
    }

    if (actionKey) event.preventDefault(); else return;

    // Process "Wait" Action
    if (actionType === 'wait') {
        console.log("Player waits.");
        currentTurn = 'ai'; console.log("Player turn finished (wait). Switching to AI turn.");
        if (typeof redrawCanvas === 'function') redrawCanvas(); // Update UI to show AI turn
        if (typeof executeAiTurns === 'function') setTimeout(executeAiTurns, 100); // AI takes turn after delay
        return;
    }

    // Process "Move or Attack" Action
    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null;
            if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                console.log(`Player attacks Enemy ${targetEnemy.id || '??'}!`);
                targetEnemy.hp -= PLAYER_ATTACK_DAMAGE; console.log(`Enemy HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);
                if (targetEnemy.hp <= 0) {
                    console.log(`Enemy ${targetEnemy.id || '??'} defeated!`);
                    enemies = enemies.filter(enemy => enemy !== targetEnemy);
                    if (enemies.length === 0) { console.log("All enemies defeated! YOU WIN!"); gameActive = false; if (typeof redrawCanvas === 'function') redrawCanvas(); alert("YOU WIN!"); return; }
                }
                currentTurn = 'ai'; console.log("Player turn finished (attack). Switching to AI turn.");
                if (typeof redrawCanvas === 'function') redrawCanvas(); // Update UI immediately
                if (typeof executeAiTurns === 'function') setTimeout(executeAiTurns, 100);
            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];
                if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) { // Walkable Check
                    player.row = targetRow; player.col = targetCol; // Move player
                    if (targetTileType === TILE_SCRAP) { if (player.resources) { player.resources.scrap++; console.log(`Collected Scrap! Total: ${player.resources.scrap}`); } mapData[player.row][player.col] = TILE_LAND; }
                    currentTurn = 'ai'; console.log("Player turn finished (move). Switching to AI turn.");
                    if (typeof redrawCanvas === 'function') redrawCanvas(); // Show player move immediately
                    if (typeof executeAiTurns === 'function') setTimeout(executeAiTurns, 100);
                }
            }
        }
    }
}