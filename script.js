console.log("Game script loaded!");

// --- Configuration ---
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;
const NUM_ENEMIES = 3;

// --- Game State Variables ---
let mapData = [];
let currentTurn = 'player'; // NEW: Track whose turn it is ('player' or 'ai')
// Player object is defined in player.js
// Enemies array is defined in ai.js


// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;


// --- Drawing Functions --- (No changes needed in drawing functions)

/** Draws grid lines */
function drawGrid() { /* ... same as before ... */
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) { ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= GRID_HEIGHT; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(canvas.width, y * CELL_SIZE); ctx.stroke(); }
}

/** Draws map cell contents */
function drawMapCells() { /* ... same as before ... */
    if (!mapData || mapData.length === 0) return;
    const fontSize = CELL_SIZE * 0.7; ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (!mapData[row]) continue;
            const tileType = mapData[row][col];
            const cellX = col * CELL_SIZE; const cellY = row * CELL_SIZE;
            ctx.fillStyle = TILE_COLORS[tileType] || '#FFFFFF';
            ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            const emoji = TILE_EMOJIS[tileType];
            if (emoji) { const centerX = cellX + CELL_SIZE / 2; const centerY = cellY + CELL_SIZE / 2; ctx.fillText(emoji, centerX, centerY); }
        }
    }
}

/** Draws the player */
function drawPlayer(ctx, cellSize) { /* ... same as before ... */
    if (typeof player === 'undefined' || player.row === null || player.col === null) return;
    const centerX = player.col * cellSize + cellSize / 2; const centerY = player.row * cellSize + cellSize / 2;
    const radius = (cellSize / 2) * 0.8; ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
}

/** Draws all enemies */
function drawEnemies(ctx, cellSize) { /* ... same as before ... */
    if (typeof enemies === 'undefined' || enemies.length === 0) return;
    const radius = (cellSize / 2) * 0.7; const defaultColor = '#ff0000';
    for (const enemy of enemies) {
        if (enemy.row === null || enemy.col === null) continue;
        const centerX = enemy.col * cellSize + cellSize / 2; const centerY = enemy.row * cellSize + cellSize / 2;
        ctx.fillStyle = enemy.color || defaultColor;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    }
}

/** Draws UI */
function drawUI(ctx) { /* ... same as before ... */
    ctx.fillStyle = 'white'; ctx.font = '16px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    if (typeof player !== 'undefined' && player.resources) { ctx.fillText(`Scrap: ${player.resources.scrap}`, 10, 10); }
    else { ctx.fillText("Scrap: N/A", 10, 10); }
    // NEW: Display current turn (optional)
    ctx.fillText(`Turn: ${currentTurn}`, 10, 30);
    ctx.shadowBlur = 0;
}


/** Main drawing function */
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMapCells();
    drawGrid();
    drawEnemies(ctx, CELL_SIZE);
    drawPlayer(ctx, CELL_SIZE);
    drawUI(ctx); // UI includes turn display now
}

// --- AI Turn Logic --- (NEW FUNCTION)

/**
 * Executes turns for all AI enemies.
 */
function executeAiTurns() {
    console.log("Executing AI Turns...");
    if (currentTurn !== 'ai' || typeof enemies === 'undefined') {
        console.log("Not AI turn or enemies not defined, skipping AI turns.");
        // Ensure turn returns to player if something unexpected happens
        currentTurn = 'player';
        return;
    }

    // Basic AI: Each enemy attempts one random valid move
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (enemy.row === null || enemy.col === null) continue; // Skip if enemy has invalid position

        const possibleMoves = [];
        const directions = [
            { dr: -1, dc: 0 }, // Up
            { dr: 1, dc: 0 },  // Down
            { dr: 0, dc: -1 }, // Left
            { dr: 0, dc: 1 }   // Right
        ];

        // Check adjacent cells
        for (const dir of directions) {
            const targetRow = enemy.row + dir.dr;
            const targetCol = enemy.col + dir.dc;

            // 1. Boundary Check
            if (targetRow >= 0 && targetRow < GRID_HEIGHT &&
                targetCol >= 0 && targetCol < GRID_WIDTH) {

                // 2. Terrain Check (AI only moves on Land for now)
                const targetTileType = mapData[targetRow][targetCol];
                if (targetTileType === TILE_LAND) {

                    // 3. Player Collision Check
                    let occupiedByPlayer = (player.row === targetRow && player.col === targetCol);

                    // 4. Other Enemy Collision Check
                    let occupiedByOtherEnemy = false;
                    for (let j = 0; j < enemies.length; j++) {
                        if (i === j) continue; // Don't check against self
                        if (enemies[j].row === targetRow && enemies[j].col === targetCol) {
                            occupiedByOtherEnemy = true;
                            break;
                        }
                    }

                    // If walkable AND not occupied by player OR other enemy, add to possible moves
                    if (!occupiedByPlayer && !occupiedByOtherEnemy) {
                        possibleMoves.push({ row: targetRow, col: targetCol });
                    }
                }
            }
        } // End checking directions

        // Choose a random move if possible
        if (possibleMoves.length > 0) {
            const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            console.log(`Enemy ${enemy.id || i} moving from (${enemy.row},${enemy.col}) to (${chosenMove.row},${chosenMove.col})`);
            enemy.row = chosenMove.row;
            enemy.col = chosenMove.col;
        } else {
            console.log(`Enemy ${enemy.id || i} has no valid moves.`);
            // Enemy stays put
        }

    } // End loop through enemies

    // All enemies have moved (or tried to), redraw and switch turn back to player
    redrawCanvas();
    currentTurn = 'player';
    console.log("AI Turns complete. Player turn.");
}


// --- Input Handling --- (MODIFIED)

/**
 * Handles keydown events for player movement.
 * Only processes input if it's the player's turn.
 * Switches turn to AI after successful player move.
 */
function handleKeyDown(event) {
    // >>> NEW: Only handle input if it's player's turn <<<
    if (currentTurn !== 'player') {
        console.log("Ignoring input, not player's turn.");
        return;
    }

    // Check if player object is ready
    if (typeof player === 'undefined' || player.row === null || player.col === null) {
        console.warn("Player not ready, ignoring input.");
        return;
    }

    let targetRow = player.row;
    let targetCol = player.col;
    let moved = false;

    switch (event.key.toLowerCase()) {
        case 'arrowup': case 'w': targetRow--; moved = true; break;
        case 'arrowdown': case 's': targetRow++; moved = true; break;
        case 'arrowleft': case 'a': targetCol--; moved = true; break;
        case 'arrowright': case 'd': targetCol++; moved = true; break;
        default: return;
    }

    if (moved) event.preventDefault(); else return;

    // --- Validate the move ---
    if (targetRow >= 0 && targetRow < GRID_HEIGHT &&
        targetCol >= 0 && targetCol < GRID_WIDTH) {

        const targetTileType = mapData[targetRow][targetCol];

        // Walkable Tile Check
        if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) {

            // Enemy Collision Check
            let isOccupiedByEnemy = false;
            if (typeof enemies !== 'undefined') {
                for (const enemy of enemies) {
                    if (enemy.row === targetRow && enemy.col === targetCol) { isOccupiedByEnemy = true; break; }
                }
            }

            // Proceed only if target tile is walkable AND not occupied
            if (!isOccupiedByEnemy) {
                // --- Actual Movement ---
                player.row = targetRow;
                player.col = targetCol;

                // --- Resource Collection Check ---
                if (targetTileType === TILE_SCRAP) {
                    if (player.resources) { player.resources.scrap++; console.log(`Collected Scrap! Total: ${player.resources.scrap}`); }
                    mapData[player.row][player.col] = TILE_LAND;
                }

                redrawCanvas(); // Redraw to show player move

                // --- Switch Turn to AI --- (NEW)
                currentTurn = 'ai';
                console.log("Player turn finished. Switching to AI turn.");
                // Use setTimeout to allow browser to render player move before AI moves
                // This makes it feel more turn-based visually. Delay can be adjusted.
                setTimeout(executeAiTurns, 100); // Execute AI turns after a short delay (e.g., 100ms)

            } // else: move blocked by enemy
        } // else: move blocked by terrain
    } // else: move blocked by boundary
}

window.addEventListener('keydown', handleKeyDown);


// --- Initialization --- (No changes needed here)
console.log("Initializing game...");
if (typeof createMapData === 'function') { mapData = createMapData(); }
else { console.error("createMapData function not found!"); mapData = []; }

const occupiedCoords = [];
if (typeof player !== 'undefined' && typeof findStartPosition === 'function') {
    const startPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
    if (startPos) { /* ... place player ... */ player.row = startPos.row; player.col = startPos.col; occupiedCoords.push({ row: player.row, col: player.col }); if (!player.resources) player.resources = { scrap: 0 }; }
    else { console.error("Player starting position could not be set."); }
} else { console.error("Player object or findStartPosition function not found!"); }

console.log(`Attempting to place ${NUM_ENEMIES} enemies...`);
if (typeof enemies !== 'undefined' && typeof findStartPosition === 'function') {
    for (let i = 0; i < NUM_ENEMIES; i++) { /* ... place enemies ... */ const enemyStartPos = findStartPosition(mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords); if (enemyStartPos) { const newEnemy = { id: `enemy_${i}`, row: enemyStartPos.row, col: enemyStartPos.col, color: '#ff0000' }; enemies.push(newEnemy); occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col }); console.log(`Placed enemy ${i + 1} at ${newEnemy.row}, ${newEnemy.col}`); } else { console.error(`Could not find valid position for enemy ${i + 1}`); } }
} else { console.error("Enemies array or findStartPosition function not found!"); }

redrawCanvas(); // Initial draw shows Player's turn
console.log(`Canvas initialized: ${canvas.width}x${canvas.height}`); /* ... other logs ... */