// --- Start of script.js ---
console.log("SCRIPT START: Loading script.js...");

// --- Configuration ---
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;
const NUM_ENEMIES = 3;
const PLAYER_ATTACK_DAMAGE = 2;
const AI_ATTACK_DAMAGE = 1;

// --- Game State Variables ---
let mapData = [];
let currentTurn = 'player';
let gameActive = true;
console.log("SCRIPT VARS: Initial gameActive =", gameActive);
// Player object is defined in player.js
// Enemies array is defined in ai.js


// --- Canvas Setup ---
console.log("SCRIPT SETUP: Getting canvas element...");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
console.log("SCRIPT SETUP: Setting canvas dimensions...");
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;
console.log(`SCRIPT SETUP: Canvas dimensions set to ${canvas.width}x${canvas.height}`);


// --- Drawing Functions --- (Verified Complete Bodies)

/** Draws grid lines */
function drawGrid() {
    // console.log("DRAW: drawGrid START");
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= GRID_HEIGHT; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(canvas.width, y * CELL_SIZE); ctx.stroke(); }
    // console.log("DRAW: drawGrid END");
}

/** Draws map cell contents */
function drawMapCells() {
    // console.log("DRAW: drawMapCells START");
    if (!mapData || mapData.length === 0) { console.warn("drawMapCells skipped: mapData empty."); return; }
    const fontSize = CELL_SIZE * 0.7; ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE; const cellY = row * CELL_SIZE;
            // Use TILE_COLORS (defined in map.js, global)
            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF';
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            // Use TILE_EMOJIS (defined in map.js)
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + CELL_SIZE / 2; const centerY = cellY + CELL_SIZE / 2; ctx.fillText(emoji, centerX, centerY); }
        }
    }
    // console.log("DRAW: drawMapCells END");
}

/** Draws the player */
function drawPlayer(ctx, cellSize) {
    // console.log("DRAW: drawPlayer START");
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8; ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    // console.log("DRAW: drawPlayer END");
}

/** Draws all enemies */
function drawEnemies(ctx, cellSize) {
    // console.log("DRAW: drawEnemies START");
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const radius = (cellSize / 2) * 0.7; const defaultColor = '#ff0000';
    for (const enemy of enemies) {
        if (enemy.row === null || enemy.col === null) continue;
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2;
        ctx.fillStyle = enemy.color || defaultColor;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    }
    // console.log("DRAW: drawEnemies END");
}

/** Draws UI */
function drawUI(ctx) {
    // console.log("DRAW: drawUI START");
    ctx.fillStyle = 'white'; ctx.font = '16px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    let yOffset = 10;
    if (typeof player !== 'undefined' && player.resources) { ctx.fillText(`Scrap: ${player.resources.scrap}`, 10, yOffset); } else { ctx.fillText("Scrap: N/A", 10, yOffset); }
    yOffset += 20;
    if (typeof player !== 'undefined') { ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, 10, yOffset); } else { ctx.fillText("HP: N/A", 10, yOffset); }
    yOffset += 20;
    ctx.fillText(`Turn: ${currentTurn}`, 10, yOffset);
    if (!gameActive) {
        // console.log("DRAW: Drawing win/loss overlay because gameActive is false."); // Kept this log
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.font = '30px Arial'; ctx.fillStyle = 'red';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (typeof player !== 'undefined' && player.hp <= 0) { ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2); }
        else { ctx.fillStyle = 'lime'; ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2); }
    }
    ctx.shadowBlur = 0;
    // console.log("DRAW: drawUI END");
}


/** Main drawing function */
function redrawCanvas() {
    // console.log("--- REDRAW CANVAS START ---"); // Can uncomment if needed
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMapCells();
    drawGrid();
    drawEnemies(ctx, CELL_SIZE);
    drawPlayer(ctx, CELL_SIZE);
    drawUI(ctx);
    // console.log("--- REDRAW CANVAS END ---"); // Can uncomment if needed
}

// --- AI Turn Logic --- (Verified Complete Body)

/**
 * Executes turns for all AI enemies.
 * AI will attack if player is adjacent, otherwise move randomly.
 */
function executeAiTurns() {
    if (!gameActive || currentTurn !== 'ai' || typeof enemies === 'undefined') {
        if (gameActive) currentTurn = 'player'; return;
    }
    console.log("Executing AI Turns...");
    let redrawNeeded = false;
    const currentEnemies = [...enemies]; // Iterate over a copy

    for (let i = 0; i < currentEnemies.length; i++) {
        const enemy = enemies.find(e => e === currentEnemies[i]); // Find current enemy in master list
        if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;

        let attackedPlayer = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

        // Check for Adjacent Player (Attack Logic)
        for (const dir of directions) {
            const targetRow = enemy.row + dir.dr;
            const targetCol = enemy.col + dir.dc;
            if (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol) {
                console.log(`Enemy ${enemy.id || i} attacks Player!`);
                player.hp -= AI_ATTACK_DAMAGE;
                console.log(`Player HP: ${player.hp}/${player.maxHp}`);
                attackedPlayer = true;
                redrawNeeded = true;

                if (player.hp <= 0) { // Check Game Over
                    console.log("Player defeated! GAME OVER!");
                    gameActive = false;
                    redrawCanvas(); // Draw final state immediately
                    alert("GAME OVER!");
                    return; // Exit AI turns immediately
                }
                break; // Enemy attacked, its action is done
            }
        }

        // Random Movement Logic (Only if player was NOT attacked)
        if (!attackedPlayer) {
             const possibleMoves = [];
             for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                     const targetTileType = mapData[targetRow][targetCol];
                     if (targetTileType === TILE_LAND) { // AI moves only on Land
                         let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                         let occupiedByOtherEnemy = false;
                         for (let j = 0; j < enemies.length; j++) { // Check against master list
                             const otherEnemy = enemies[j];
                             if (enemy.id === otherEnemy.id) continue;
                             if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; }
                         }
                         if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                     }
                 }
             }
             if (possibleMoves.length > 0) { // Execute move if possible
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
             }
        } // End random movement block
    } // End loop through enemies

    // Switch back to player only if game is still active
    if (gameActive) {
        if (redrawNeeded) { redrawCanvas(); } // Redraw if any AI moved/attacked
        currentTurn = 'player';
        console.log("AI Turns complete. Player turn.");
        if (!redrawNeeded) { drawUI(ctx); } // Still update UI text if nothing else changed
    } else {
         // If game ended during AI turn (player defeat), ensure final state is drawn
         redrawCanvas();
         console.log("Game Over - Input Disabled.");
    }
}


// --- Input Handling --- (Verified Complete Body)

/**
 * Handles keydown events for player movement, bump-attack, OR skipping turn (' ').
 */
function handleKeyDown(event) {
    // console.log("handleKeyDown Fired! Key:", event.key); // Keep commented out unless debugging input
    if (!gameActive || currentTurn !== 'player') { return; }
    if (typeof player === 'undefined' || player.row === null || player.col === null) { return; }

    let targetRow = player.row;
    let targetCol = player.col;
    let actionKey = false;
    let actionType = null;

    // Determine Action Type based on Key
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
        redrawCanvas(); setTimeout(executeAiTurns, 100);
        return;
    }

    // Process "Move or Attack" Action
    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null;
            if (typeof enemies !== 'undefined') { targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol); }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                console.log(`Player attacks Enemy ${targetEnemy.id || '??'}!`);
                targetEnemy.hp -= PLAYER_ATTACK_DAMAGE; console.log(`Enemy HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);
                if (targetEnemy.hp <= 0) {
                    console.log(`Enemy ${targetEnemy.id || '??'} defeated!`);
                    enemies = enemies.filter(enemy => enemy !== targetEnemy);
                    if (enemies.length === 0) { console.log("All enemies defeated! YOU WIN!"); gameActive = false; redrawCanvas(); alert("YOU WIN!"); return; }
                }
                currentTurn = 'ai'; console.log("Player turn finished (attack). Switching to AI turn.");
                redrawCanvas(); setTimeout(executeAiTurns, 100);
            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];
                if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) {
                    player.row = targetRow; player.col = targetCol;
                    if (targetTileType === TILE_SCRAP) { if (player.resources) { player.resources.scrap++; console.log(`Collected Scrap! Total: ${player.resources.scrap}`); } mapData[player.row][player.col] = TILE_LAND; }
                    currentTurn = 'ai'; console.log("Player turn finished (move). Switching to AI turn.");
                    redrawCanvas(); setTimeout(executeAiTurns, 100);
                }
            }
        }
    }
}

window.addEventListener('keydown', handleKeyDown);


// --- Initialization --- (Verified Complete Logic)
console.log("Initializing game...");
if (typeof createMapData === 'function') { mapData = createMapData(); } else { console.error("createMapData function not found!"); mapData = []; gameActive = false; }
const occupiedCoords = [];
if (gameActive && typeof player !== 'undefined' && typeof findStartPosition === 'function') { const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (startPos) { player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); if (!player.resources) player.resources = { scrap: 0 }; player.hp = player.maxHp; console.log("INIT: Player placed successfully."); } else { console.error("INIT ERROR: Player starting position could not be set."); gameActive = false; } } else if (gameActive) { console.error("INIT ERROR: Player object or findStartPosition function not found!"); gameActive = false; }
console.log("INIT: Attempting enemy placement...");
if (gameActive && typeof enemies !== 'undefined' && typeof findStartPosition === 'function') { console.log(`INIT: Placing ${NUM_ENEMIES} enemies...`); for (let i = 0; i < NUM_ENEMIES; i++) { const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000', hp: 5, maxHp: 5 }; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); console.log(`INIT: Placed enemy ${i + 1}.`); } else { console.error(`INIT ERROR: Could not find valid position for enemy ${i + 1}.`); } } console.log(`INIT: Finished placing enemies. Total placed: ${enemies.length}`); } else if (gameActive) { console.error("INIT ERROR: Enemies array or findStartPosition function not found!"); gameActive = false; }
console.log(`INIT: Checking gameActive status before initial draw: ${gameActive}`);
if (gameActive) { console.log("INIT: Calling initial redrawCanvas()..."); redrawCanvas(); console.log("INIT: Initial redrawCanvas() called."); } else { console.error("INIT: Game initialization failed. Skipping initial draw."); /* Draw error message */ ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = '20px Arial'; ctx.fillStyle = 'red'; ctx.textAlign = 'center'; ctx.fillText('Game Initialization Failed. Check Console.', canvas.width / 2, canvas.height / 2); }
console.log("INIT: Initialization sequence complete.");
// Final status logs...