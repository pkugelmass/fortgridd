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
let mapData = []; // Populated by createMapData() from map.js
let currentTurn = 'player';
let gameActive = true; // Start assuming game is active
console.log("SCRIPT VARS: Initial gameActive =", gameActive);
// Player object is defined in player.js
// Enemies array is defined in ai.js


// --- Canvas Setup ---
console.log("SCRIPT SETUP: Getting canvas element...");
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // ctx will be used globally by drawing functions
console.log("SCRIPT SETUP: Setting canvas dimensions...");
canvas.width = GRID_WIDTH * CELL_SIZE;
canvas.height = GRID_HEIGHT * CELL_SIZE;
console.log(`SCRIPT SETUP: Canvas dimensions set to ${canvas.width}x${canvas.height}`);


// --- Drawing Orchestration --- (Individual draw functions moved to drawing.js)

/**
 * Main drawing function (clears canvas and calls individual draw functions).
 * Relies on drawGrid, drawMapCells, drawEnemies, drawPlayer, drawUI being globally defined.
 */
function redrawCanvas() {
    // console.log("--- REDRAW CANVAS START ---");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Call functions now defined in drawing.js
    // These functions access global state (mapData, player, enemies etc.)
    // and use the global ctx variable.
    // Ensure drawing.js is loaded before this script in index.html
    if (typeof drawMapCells === 'function') drawMapCells(); else console.error("drawMapCells not defined!");
    if (typeof drawGrid === 'function') drawGrid(); else console.error("drawGrid not defined!");
    if (typeof drawEnemies === 'function') drawEnemies(ctx, CELL_SIZE); else console.error("drawEnemies not defined!");
    if (typeof drawPlayer === 'function') drawPlayer(ctx, CELL_SIZE); else console.error("drawPlayer not defined!");
    if (typeof drawUI === 'function') drawUI(ctx); else console.error("drawUI not defined!");
    // console.log("--- REDRAW CANVAS END ---");
}

// --- AI Turn Logic --- (Function Definition remains here for now)

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
    const currentEnemies = [...enemies]; // Iterate over a copy in case main array changes

    for (let i = 0; i < currentEnemies.length; i++) {
         const enemy = enemies.find(e => e === currentEnemies[i]); // Get current enemy from main array
         if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue; // Skip if invalid/dead

        let attackedPlayer = false;
        const directions = [ { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];

        // --- Check for Adjacent Player (Attack Logic) ---
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

        // --- Random Movement Logic (Only if player was NOT attacked) ---
        if (!attackedPlayer) {
             const possibleMoves = [];
             for (const dir of directions) {
                 const targetRow = enemy.row + dir.dr; const targetCol = enemy.col + dir.dc;
                 // Boundary Check
                 if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
                     const targetTileType = mapData[targetRow][targetCol];
                     // Terrain Check (AI only moves on Land)
                     if (targetTileType === TILE_LAND) {
                         // Player Collision Check
                         let occupiedByPlayer = (typeof player !== 'undefined' && player.row === targetRow && player.col === targetCol);
                         // Other Enemy Collision Check
                         let occupiedByOtherEnemy = false;
                         for (let j = 0; j < enemies.length; j++) {
                             const otherEnemy = enemies[j];
                             if (enemy.id === otherEnemy.id) continue; // Don't check self
                             if (otherEnemy.row === targetRow && otherEnemy.col === targetCol) { occupiedByOtherEnemy = true; break; }
                         }
                         // Add move if valid and unoccupied
                         if (!occupiedByPlayer && !occupiedByOtherEnemy) { possibleMoves.push({ row: targetRow, col: targetCol }); }
                     }
                 }
             }
             // Execute move if possible
             if (possibleMoves.length > 0) {
                 const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 enemy.row = chosenMove.row; enemy.col = chosenMove.col;
                 redrawNeeded = true;
             } // else { // Enemy stays put }
        } // End random movement block
    } // End loop through enemies

    // Switch back to player only if game is still active
    if (gameActive) {
        if (redrawNeeded) { redrawCanvas(); } // Redraw if any AI moved/attacked
        currentTurn = 'player';
        console.log("AI Turns complete. Player turn.");
        if (!redrawNeeded && typeof drawUI === 'function') { // Check drawUI exists
             // Update UI text immediately if redraw didn't happen
             drawUI(ctx);
        }
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
        redrawCanvas(); // Update UI to show AI turn
        setTimeout(executeAiTurns, 100); // AI takes turn after delay
        return;
    }

    // Process "Move or Attack" Action
    if (actionType === 'move_or_attack') {
        // Boundary Check
        if (targetRow >= 0 && targetRow < GRID_HEIGHT && targetCol >= 0 && targetCol < GRID_WIDTH) {
            let targetEnemy = null;
            if (typeof enemies !== 'undefined') { // Ensure enemies array exists
                targetEnemy = enemies.find(enemy => enemy.row === targetRow && enemy.col === targetCol && enemy.hp > 0); // Find LIVE enemy
            }

            // A) ATTACK LOGIC
            if (targetEnemy) {
                console.log(`Player attacks Enemy ${targetEnemy.id || '??'}!`);
                targetEnemy.hp -= PLAYER_ATTACK_DAMAGE; console.log(`Enemy HP: ${targetEnemy.hp}/${targetEnemy.maxHp}`);

                if (targetEnemy.hp <= 0) { // Check defeat
                    console.log(`Enemy ${targetEnemy.id || '??'} defeated!`);
                    enemies = enemies.filter(enemy => enemy !== targetEnemy); // Remove enemy

                    if (enemies.length === 0) { // Check Win Condition
                        console.log("All enemies defeated! YOU WIN!");
                        gameActive = false; redrawCanvas(); alert("YOU WIN!"); return;
                    }
                }
                // End player turn after attack
                currentTurn = 'ai'; console.log("Player turn finished (attack). Switching to AI turn.");
                redrawCanvas(); // Update UI immediately
                setTimeout(executeAiTurns, 100); // AI takes turn after delay
            }
            // B) MOVEMENT LOGIC
            else {
                const targetTileType = mapData[targetRow][targetCol];
                // Walkable Check (Land or Scrap)
                if (targetTileType === TILE_LAND || targetTileType === TILE_SCRAP) {
                    player.row = targetRow; player.col = targetCol; // Move player

                    if (targetTileType === TILE_SCRAP) { // Resource Check
                        if (player.resources) { player.resources.scrap++; console.log(`Collected Scrap! Total: ${player.resources.scrap}`); }
                        mapData[player.row][player.col] = TILE_LAND; // Change tile back to land
                    }
                    // End player turn after move
                    currentTurn = 'ai'; console.log("Player turn finished (move). Switching to AI turn.");
                    redrawCanvas(); // Show player move immediately
                    setTimeout(executeAiTurns, 100); // AI takes turn after delay
                } // else: move blocked by terrain
            } // End Movement Logic
        } // else: move blocked by boundary
    } // End Move or Attack block
}

window.addEventListener('keydown', handleKeyDown); // Ensure listener registration is present


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
if(typeof player !== 'undefined' && player.row !== null) { console.log(`Player starting at: ${player.row}, ${player.col}`); console.log(`Initial resources:`, player.resources); } else { console.log("Player position not set."); }
console.log(`Placed ${enemies.length} enemies:`, enemies);