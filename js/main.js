// --- Start of main.js ---
// console.log("SCRIPT START: Loading main.js..."); // Replaced by Game.logMessage in initializeGame

// --- Configuration --- (Defined in config.js)
// --- Game State Variable --- (Replaces individual globals like mapData, player, enemies)
let gameState; // Will be initialized by initializeGame()
let currentCellSize = 0; // Still needed for drawing calculations directly in main? Or move to Renderer? Keep for now.

// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Update functions (updateStatusBar, updateLogDisplay) moved to ui.js
// Resize/Draw function (resizeAndDraw) moved to ui.js

// --- Drawing Orchestration --- (Remains in main.js for now)
/**
 * Main drawing function - orchestrates drawing layers and updates status bar.
 * @param {GameState} gameState - The current game state object.
 */
function redrawCanvas(gameState) {
    if (!ctx || currentCellSize <= 0 || !gameState) {
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Pass gameState (or relevant parts) to drawing functions
    // Corrected parameter order for drawMapCells: pass safeZone
    if (typeof drawMapCells === 'function') {
        drawMapCells(ctx, gameState.mapData, gameState.safeZone, GRID_WIDTH, GRID_HEIGHT, currentCellSize);
    } else {
        Game.logMessage("ERROR: drawMapCells not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
    if (typeof drawGrid === 'function') {
        drawGrid(ctx, GRID_WIDTH, GRID_HEIGHT, currentCellSize);
    } else {
        Game.logMessage("ERROR: drawGrid not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
    if (typeof drawEnemies === 'function') {
        drawEnemies(ctx, gameState.enemies, currentCellSize);
    } else {
        Game.logMessage("ERROR: drawEnemies not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
    if (typeof drawPlayer === 'function') {
        drawPlayer(ctx, gameState.player, currentCellSize);
    } else {
        Game.logMessage("ERROR: drawPlayer not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    }
    if (typeof drawUI === 'function') {
        drawUI(ctx, gameState);
    } else {
        Game.logMessage("ERROR: drawUI not defined!", gameState, { level: 'ERROR', target: 'CONSOLE' });
    } // drawUI might need gameState for safe zone etc.
    updateStatusBar(gameState); // Update HTML status bar using gameState
    // Log display updated by Game.logMessage (which should call the global updateLogDisplay in ui.js)
}

// --- Enemy Creation Helper --- (Remains in main.js)
/**
 * Creates a single enemy, finds a valid starting position on the map in gameState,
 * adds the position to occupiedCoords, and returns the enemy object.
 * @param {number} enemyIndex - The index for generating the enemy ID.
 * @param {Array<object>} occupiedCoords - Array of {row, col} objects to avoid placing on.
 * @param {GameState} gameState - The current game state (used for mapData).
 * @returns {object|null} The created enemy object or null if placement fails.
 */
function createAndPlaceEnemy(enemyIndex, occupiedCoords, gameState) {
    // Check dependencies (including gameState and its mapData)
    if (typeof findStartPosition !== 'function' || !gameState || !gameState.mapData || typeof GRID_WIDTH === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof TILE_LAND === 'undefined') {
        Game.logMessage("createAndPlaceEnemy: Missing required functions, gameState, or mapData.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return null;
    }

    let enemyStartPos = null;
    let placementAttempts = 0;
    const maxPlacementAttempts = 50;

    while (!enemyStartPos && placementAttempts < maxPlacementAttempts) {
        placementAttempts++;
        // Pass mapData from gameState to findStartPosition
        const potentialPos = findStartPosition(gameState.mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);

        if (potentialPos) {
            // Check accessibility (getValidMoves will eventually need gameState too)
            const dummyEnemy = { row: potentialPos.row, col: potentialPos.col, id: `test_${enemyIndex}` };
            if (typeof getValidMoves === 'function') {
                // Anticipate getValidMoves needing gameState in the future
                const validMoves = getValidMoves(dummyEnemy, gameState); // Pass gameState here
                if (validMoves.length > 0) {
                    enemyStartPos = potentialPos;
                } else {
                    occupiedCoords.push({ row: potentialPos.row, col: potentialPos.col });
                }
            } else {
                Game.logMessage("createAndPlaceEnemy: getValidMoves function not found! Cannot check spawn accessibility.", gameState, { level: 'WARN', target: 'CONSOLE' });
                enemyStartPos = potentialPos; // Fallback
            }
        } else {
            break; // findStartPosition failed
        }
    }

    if (enemyStartPos) {
        // Use constants from config.js
        const hpMin = AI_HP_MIN || 4;
        const hpMax = AI_HP_MAX || 6;
        const rangeMin = AI_RANGE_MIN || 6;
        const rangeMax = AI_RANGE_MAX || 10;
        const ammoMin = AI_AMMO_MIN || 1;
        const ammoMax = AI_AMMO_MAX || 2;

        const enemyMaxHp = Math.floor(Math.random() * (hpMax - hpMin + 1)) + hpMin;
        const enemyDetectionRange = Math.floor(Math.random() * (rangeMax - rangeMin + 1)) + rangeMin;
        const enemyStartingAmmo = Math.floor(Math.random() * (ammoMax - ammoMin + 1)) + ammoMin;

        const newEnemy = {
            id: `enemy_${enemyIndex}`,
            row: enemyStartPos.row,
            col: enemyStartPos.col,
            color: ENEMY_DEFAULT_COLOR,
            hp: enemyMaxHp,
            maxHp: enemyMaxHp,
            detectionRange: enemyDetectionRange,
            resources: {
                ammo: enemyStartingAmmo,
                medkits: AI_START_MEDKITS,
            },
            state: AI_STATE_EXPLORING,
            targetEnemy: null,
            targetResourceCoords: null,
        };
        occupiedCoords.push({ row: newEnemy.row, col: newEnemy.col });
        return newEnemy;
    } else {
        Game.logMessage(`createAndPlaceEnemy: Could not find valid position for enemy ${enemyIndex + 1}.`, gameState, { level: 'WARN', target: 'CONSOLE' });
        return null;
    }
}

// --- Reset Game Logic ---
/**
 * Resets the game state held within the global gameState object.
 * Assumes gameState has been initialized previously.
 * @param {GameState} gameStateRef - Reference to the global gameState object.
 */
function resetGame(gameStateRef) {
    if (!gameStateRef || typeof Game === 'undefined') {
        Game.logMessage("RESET ERROR: GameState object or Game object missing!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
        return; // Cannot proceed
    }
    Game.logMessage("--- GAME RESETTING ---", gameStateRef, { level: 'INFO', target: 'CONSOLE' });

    // 1. Reset GameState Properties
    gameStateRef.currentTurn = 'player';
    gameStateRef.gameActive = true;
    gameStateRef.turnNumber = 1;
    gameStateRef.safeZone = { minRow: 0, maxRow: (GRID_HEIGHT || 25) - 1, minCol: 0, maxCol: (GRID_WIDTH || 25) - 1 };
    gameStateRef.logMessages = []; // Clear log array

    // 2. Regenerate Map
    if (typeof createMapData === 'function') {
        // Construct mapConfig object (copied from initializeGame)
        const mapConfig = {
            GRID_HEIGHT: typeof GRID_HEIGHT !== 'undefined' ? GRID_HEIGHT : 25,
            GRID_WIDTH: typeof GRID_WIDTH !== 'undefined' ? GRID_WIDTH : 25,
            TILE_WALL: typeof TILE_WALL !== 'undefined' ? TILE_WALL : 1,
            TILE_LAND: typeof TILE_LAND !== 'undefined' ? TILE_LAND : 0,
            INITIAL_WALL_CHANCE: typeof INITIAL_WALL_CHANCE !== 'undefined' ? INITIAL_WALL_CHANCE : 0.45,
            CA_ITERATIONS: typeof CA_ITERATIONS !== 'undefined' ? CA_ITERATIONS : 4,
            CA_WALL_THRESHOLD: typeof CA_WALL_THRESHOLD !== 'undefined' ? CA_WALL_THRESHOLD : 5,
            FEATURE_SPAWN_CHANCE_TREE: typeof FEATURE_SPAWN_CHANCE_TREE !== 'undefined' ? FEATURE_SPAWN_CHANCE_TREE : 0.05,
            FEATURE_SPAWN_CHANCE_MEDKIT: typeof FEATURE_SPAWN_CHANCE_MEDKIT !== 'undefined' ? FEATURE_SPAWN_CHANCE_MEDKIT : 0.02,
            FEATURE_SPAWN_CHANCE_AMMO: typeof FEATURE_SPAWN_CHANCE_AMMO !== 'undefined' ? FEATURE_SPAWN_CHANCE_AMMO : 0.03,
            TILE_TREE: typeof TILE_TREE !== 'undefined' ? TILE_TREE : 2,
            TILE_MEDKIT: typeof TILE_MEDKIT !== 'undefined' ? TILE_MEDKIT : 3,
            TILE_AMMO: typeof TILE_AMMO !== 'undefined' ? TILE_AMMO : 4,
        };
        gameStateRef.mapData = createMapData(mapConfig); // Pass config object
        Game.logMessage("Map regenerated.", gameStateRef, { level: 'INFO', target: 'CONSOLE' });
    } else {
        Game.logMessage("RESET ERROR: createMapData missing!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
        Game.setGameOver(gameStateRef); // Use Game method with gameState
        return;
    }

    // 3. Reset Player State (within gameStateRef.player)
    const occupiedCoords = []; // Reset occupied list for placement
    if (gameStateRef.player && typeof findStartPosition === 'function') {
        gameStateRef.player.maxHp = PLAYER_MAX_HP || 10;
        gameStateRef.player.hp = gameStateRef.player.maxHp;
        gameStateRef.player.resources = {
            medkits: PLAYER_START_MEDKITS || 0,
            ammo: PLAYER_START_AMMO,
        };
        // Pass mapData from gameStateRef
        const startPos = findStartPosition(gameStateRef.mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) {
            gameStateRef.player.row = startPos.row;
            gameStateRef.player.col = startPos.col;
            occupiedCoords.push({ row: gameStateRef.player.row, col: gameStateRef.player.col });
            Game.logMessage("Player state reset and placed.", gameStateRef, { level: 'INFO', target: 'CONSOLE' });
        } else {
            Game.logMessage("RESET ERROR: Player start pos not found on new map!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
            Game.setGameOver(gameStateRef);
            return;
        }
    } else {
        Game.logMessage("RESET ERROR: Player object in gameState or findStartPosition missing!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
        Game.setGameOver(gameStateRef);
        return;
    }

    // 4. Reset and Replace Enemies (within gameStateRef.enemies)
    if (gameStateRef.enemies && typeof createAndPlaceEnemy === 'function') {
        gameStateRef.enemies.length = 0; // Clear the existing enemies array in gameState
        const numEnemiesToPlace = NUM_ENEMIES || 3;
        Game.logMessage(`Placing ${numEnemiesToPlace} enemies...`, gameStateRef, { level: 'INFO', target: 'CONSOLE' });
        for (let i = 0; i < numEnemiesToPlace; i++) {
            // Pass gameStateRef to createAndPlaceEnemy
            const newEnemy = createAndPlaceEnemy(i, occupiedCoords, gameStateRef);
            if (newEnemy) {
                gameStateRef.enemies.push(newEnemy); // Add to gameStateRef.enemies
            }
        }
        Game.logMessage(`Finished placing ${gameStateRef.enemies.length} enemies.`, gameStateRef, { level: 'INFO', target: 'CONSOLE' });
    } else {
        Game.logMessage("RESET ERROR: Enemies array in gameState or createAndPlaceEnemy missing!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
        Game.setGameOver(gameStateRef);
        return;
    }

    // 5. Log Reset Message (using Game method with gameStateRef)
    Game.logMessage("Game Reset.", gameStateRef, { level: 'PLAYER', target: 'BOTH', className: LOG_CLASS_SYSTEM });

    // 6. Perform Initial Size/Draw for the new game state - Handled by initializeUI if called after reset
    // 7. Update log display explicitly after reset - Handled by Game.logMessage or initializeUI

    // For now, assume the browser refresh or initial load handles it.
    // If reset needs immediate redraw without full UI re-init, call resizeAndDraw(gameStateRef) here.

    Game.logMessage("--- GAME RESET COMPLETE ---", gameStateRef, { level: 'INFO', target: 'CONSOLE' });
}

// --- Player Turn Processing ---
/**
 * Processes the player's intended action based on the intent string.
 * Modifies gameState, calls relevant game logic, logs actions, and ends the player's turn.
 * @param {string|null} actionIntent - The intent string from handleKeyDown.
 * @param {GameState} gameState - The current game state object.
 */
function processPlayerTurn(actionIntent, gameState) {
    if (!actionIntent || !gameState || !gameState.player || !gameState.mapData || !gameState.enemies || typeof Game === 'undefined') {
        Game.logMessage("processPlayerTurn: Invalid actionIntent or missing gameState/required properties.", gameState, { level: 'ERROR', target: 'CONSOLE' });
        return; // Cannot process turn
    }

    // Ensure it's still the player's turn and game is active before processing
    if (Game.isGameOver(gameState) || !Game.isPlayerTurn(gameState)) {
        return; // Ignore if not player's turn or game over
    }

    const player = gameState.player;
    const mapData = gameState.mapData;
    const enemies = gameState.enemies;
    const gridHeight = mapData.length;
    const gridWidth = mapData[0] ? mapData[0].length : 0;
    let turnEnded = false; // Flag to track if the action consumed the turn

    // --- Process Action Intent ---
    // Assume config constants (TILE_*, PLAYER_*, RANGED_*, HEAL_*, LOG_CLASS_*) are global
    switch (actionIntent) {
        case 'MOVE_UP':
        case 'MOVE_DOWN':
        case 'MOVE_LEFT':
        case 'MOVE_RIGHT': { // Block scope for targetRow/Col
            let dx = 0, dy = 0;
            if (actionIntent === 'MOVE_UP') dy = -1;
            else if (actionIntent === 'MOVE_DOWN') dy = 1;
            else if (actionIntent === 'MOVE_LEFT') dx = -1;
            else if (actionIntent === 'MOVE_RIGHT') dx = 1;

            const targetRow = player.row + dy;
            const targetCol = player.col + dx;

            // 1. Boundary Check
            if (targetRow < 0 || targetRow >= gridHeight || targetCol < 0 || targetCol >= gridWidth) {
                Game.logMessage(`Player move blocked by map edge at (${targetRow},${targetCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
                break; // Don't end turn
            }

            // 2. Check for Enemy (Melee Attack)
            const targetEnemy = enemies.find(enemy => enemy.hp > 0 && enemy.row === targetRow && enemy.col === targetCol);
            if (targetEnemy) {
                const targetId = targetEnemy.id || '??';
                const damage = PLAYER_ATTACK_DAMAGE || 1;
                Game.logMessage(`Player attacks ${targetId} at (${targetRow},${targetCol}) for ${damage} damage.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_GOOD });
                targetEnemy.hp -= damage;
                let knockbackMsg = "";
                if (targetEnemy.hp > 0) {
                    const knockbackResult = applyKnockback(player, targetEnemy, gameState);
                    if (knockbackResult.success) {
                        knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
                    } else if (knockbackResult.reason !== 'calc_error') {
                        knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
                    }
                }
                if (knockbackMsg) {
                    Game.logMessage(knockbackMsg.trim(), gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
                }
                turnEnded = true;
                break;
            }

            // 3. Check Terrain (Movement)
            const targetTileType = mapData[targetRow][targetCol];
            if (targetTileType === TILE_LAND || targetTileType === TILE_MEDKIT || targetTileType === TILE_AMMO) {
                Game.logMessage(`Player moves to (${targetRow},${targetCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
                updateUnitPosition(player, targetRow, targetCol, gameState);
                turnEnded = true;
            } else {
                Game.logMessage(`Player move blocked by terrain at (${targetRow},${targetCol}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
            }
        }
        break;

    case 'WAIT':
        Game.logMessage("Player waits.", gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
        turnEnded = true;
        break;

    case 'HEAL':
        if (player.resources.medkits >= HEAL_COST) {
            if (player.hp < player.maxHp) {
                const healAmountActual = Math.min(HEAL_AMOUNT, player.maxHp - player.hp);
                player.resources.medkits -= HEAL_COST;
                player.hp += healAmountActual;
                Game.logMessage(`Player uses Medkit, heals ${healAmountActual} HP.`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_GOOD });
                turnEnded = true;
            } else {
                Game.logMessage("Cannot heal: Full health.", gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
            }
        } else {
            Game.logMessage(`Cannot heal: Need ${HEAL_COST} medkits (Have: ${player.resources.medkits || 0}).`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_NEUTRAL });
        }
        break;

    case 'SHOOT_UP':
    case 'SHOOT_DOWN':
    case 'SHOOT_LEFT':
    case 'SHOOT_RIGHT': { // Block scope
        if (player.resources.ammo > 0) {
            player.resources.ammo--;
            let shootDirection = { dr: 0, dc: 0 };
            let dirString = "";
            if (actionIntent === 'SHOOT_UP') { shootDirection.dr = -1; dirString = "Up"; }
            else if (actionIntent === 'SHOOT_DOWN') { shootDirection.dr = 1; dirString = "Down"; }
            else if (actionIntent === 'SHOOT_LEFT') { shootDirection.dc = -1; dirString = "Left"; }
            else if (actionIntent === 'SHOOT_RIGHT') { shootDirection.dc = 1; dirString = "Right"; }

            let shotHit = false;
            let hitTarget = null;
            let blocked = false;
            let blockedBy = "";
            let hitCoord = null;

            const traceEndX = player.col + shootDirection.dc * (RANGED_ATTACK_RANGE + 1);
            const traceEndY = player.row + shootDirection.dr * (RANGED_ATTACK_RANGE + 1);
            const linePoints = traceLine(player.col, player.row, traceEndX, traceEndY);

            for (let i = 1; i < linePoints.length; i++) {
                const point = linePoints[i];
                const checkRow = point.row;
                const checkCol = point.col;
                const dist = Math.abs(checkRow - player.row) + Math.abs(checkCol - player.col);

                if (dist > RANGED_ATTACK_RANGE) break;
                if (checkRow < 0 || checkRow >= gridHeight || checkCol < 0 || checkCol >= gridWidth) {
                    blocked = true; blockedBy = "Map Edge"; hitCoord = { row: checkRow, col: checkCol }; break;
                }
                const tileType = mapData[checkRow][checkCol];
                if (tileType === TILE_WALL || tileType === TILE_TREE) {
                    blocked = true; blockedBy = (tileType === TILE_WALL ? "Wall" : "Tree"); hitCoord = { row: checkRow, col: checkCol }; break;
                }
                hitTarget = enemies.find(enemy => enemy.hp > 0 && enemy.row === checkRow && enemy.col === checkCol);
                if (hitTarget) {
                    shotHit = true; hitCoord = { row: checkRow, col: checkCol }; break;
                }
            }

            let logMsg = `Player shoots ${dirString}`;
            let knockbackMsg = "";
            let msgClass = LOG_CLASS_PLAYER_NEUTRAL;

            if (shotHit && hitTarget) {
                const targetId = hitTarget.id || '??';
                const damage = RANGED_ATTACK_DAMAGE || 1;
                hitTarget.hp -= damage;
                logMsg += ` -> hits ${targetId} at (${hitTarget.row},${hitTarget.col}) for ${damage} damage! (HP: ${hitTarget.hp}/${hitTarget.maxHp})`;
                msgClass = LOG_CLASS_PLAYER_GOOD;

                if (hitTarget.hp > 0) {
                    const knockbackResult = applyKnockback(player, hitTarget, gameState);
                    if (knockbackResult.success) {
                        knockbackMsg = ` ${targetId} knocked back to (${knockbackResult.dest.row},${knockbackResult.dest.col}).`;
                    } else if (knockbackResult.reason !== 'calc_error') {
                        knockbackMsg = ` Knockback blocked (${knockbackResult.reason}).`;
                    }
                }
            } else if (blocked) {
                logMsg += ` -> blocked by ${blockedBy}` + (hitCoord ? ` at (${hitCoord.row},${hitCoord.col})` : '') + ".";
            } else {
                logMsg += " -> missed.";
            }

            Game.logMessage(logMsg + knockbackMsg, gameState, { level: 'PLAYER', target: 'PLAYER', className: msgClass });
            turnEnded = true;

        } else {
            Game.logMessage("Cannot shoot: Out of ammo!", gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_BAD });
        }
    }
    break;

    default:
        Game.logMessage(`processPlayerTurn: Unknown actionIntent: ${actionIntent}`, gameState, { level: 'WARN', target: 'CONSOLE' });
        break;
    }

    // --- Post-Action Processing ---
    if (turnEnded) {
        const gameOver = Game.checkEndConditions(gameState);
        if (!gameOver) {
            Game.endPlayerTurn(gameState);
            runAiTurns(gameState); // Trigger AI turns
        }
    }

    // Always redraw after processing player input
    // updateLogDisplay is handled by Game.logMessage // Comment is slightly inaccurate now, logMessage adds, this displays.
    if (typeof redrawCanvas === 'function') redrawCanvas(gameState);
    if (typeof updateLogDisplay === 'function') updateLogDisplay(gameState); // Re-enabled explicit call
}

// --- Initialization ---
/** Runs the initial game setup, creating and populating the global gameState object. */
function initializeGame() {
    // Log start using Game.logMessage - gameState might not be fully ready, so create a temporary minimal one if needed
    const tempInitialGameState = { turnNumber: 0 }; // Minimal state for logging context
    Game.logMessage("Initializing game...", tempInitialGameState, { level: 'INFO', target: 'CONSOLE' });

    // Create the central GameState object
    gameState = new GameState(); // Assign to the global variable

    // Check essential dependencies (excluding UI functions moved to ui.js)
    // Note: initializeUI will check for its dependencies (handleKeyDown, processPlayerTurn, resetGame, resizeAndDraw, updateLogDisplay)
    if (typeof Game === 'undefined' || typeof redrawCanvas !== 'function' /* resizeAndDraw checked by initializeUI */ || typeof createMapData !== 'function' || typeof player !== 'undefined' /* Check global player template */ || typeof findStartPosition !== 'function' || typeof enemies !== 'undefined' /* Check global enemies template/array */ || typeof createAndPlaceEnemy !== 'function') {
        Game.logMessage("FATAL: Core game logic objects/functions missing! Check script load order and definitions.", gameState, { level: 'ERROR', target: 'BOTH', className: 'log-system log-negative' }); // Use BOTH for fatal errors
        if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 300, 150);
            ctx.font = '20px Arial';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText('FATAL ERROR: Core setup failed.', 150, 75);
        }
        gameState.gameActive = false; // Mark state as inactive
        return false;
    }

    // 1. Set Initial State Properties
    gameState.gameActive = true;
    gameState.turnNumber = 1;
    gameState.currentTurn = 'player'; // Player starts
    gameState.safeZone = { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 };
    gameState.logMessages = []; // Initialize log array

    // 2. Create Map -> gameState.mapData
    // Pass config constants to createMapData
    // Construct a config object from global constants (ensure they exist)
    const mapConfig = {
        GRID_HEIGHT: typeof GRID_HEIGHT !== 'undefined' ? GRID_HEIGHT : 25,
        GRID_WIDTH: typeof GRID_WIDTH !== 'undefined' ? GRID_WIDTH : 25,
        TILE_WALL: typeof TILE_WALL !== 'undefined' ? TILE_WALL : 1,
        TILE_LAND: typeof TILE_LAND !== 'undefined' ? TILE_LAND : 0,
        INITIAL_WALL_CHANCE: typeof INITIAL_WALL_CHANCE !== 'undefined' ? INITIAL_WALL_CHANCE : 0.45,
        CA_ITERATIONS: typeof CA_ITERATIONS !== 'undefined' ? CA_ITERATIONS : 4,
        CA_WALL_THRESHOLD: typeof CA_WALL_THRESHOLD !== 'undefined' ? CA_WALL_THRESHOLD : 5,
        FEATURE_SPAWN_CHANCE_TREE: typeof FEATURE_SPAWN_CHANCE_TREE !== 'undefined' ? FEATURE_SPAWN_CHANCE_TREE : 0.05,
        FEATURE_SPAWN_CHANCE_MEDKIT: typeof FEATURE_SPAWN_CHANCE_MEDKIT !== 'undefined' ? FEATURE_SPAWN_CHANCE_MEDKIT : 0.02,
        FEATURE_SPAWN_CHANCE_AMMO: typeof FEATURE_SPAWN_CHANCE_AMMO !== 'undefined' ? FEATURE_SPAWN_CHANCE_AMMO : 0.03,
        TILE_TREE: typeof TILE_TREE !== 'undefined' ? TILE_TREE : 2,
        TILE_MEDKIT: typeof TILE_MEDKIT !== 'undefined' ? TILE_MEDKIT : 3,
        TILE_AMMO: typeof TILE_AMMO !== 'undefined' ? TILE_AMMO : 4,
    };
    gameState.mapData = createMapData(mapConfig); // Pass config object

    // 3. Place Player -> gameState.player
    const occupiedCoords = [];
    // Pass gameState.mapData to findStartPosition
    const startPos = findStartPosition(gameState.mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
    if (startPos) {
        // Create player object and assign to gameState.player
        // We might need a dedicated player creation function later
        gameState.player = {
            // Copy properties from global player template or define here
            row: startPos.row,
            col: startPos.col,
            color: PLAYER_COLOR, // Use constant
            maxHp: PLAYER_MAX_HP || 10,
            hp: PLAYER_MAX_HP || 10,
            resources: {
                medkits: PLAYER_START_MEDKITS || 0,
                ammo: PLAYER_START_AMMO,
            },
            // Add other player properties as needed (e.g., id, name?)
        };
        occupiedCoords.push({ row: gameState.player.row, col: gameState.player.col });
        Game.logMessage("INIT: Player placed successfully.", gameState, { level: 'INFO', target: 'CONSOLE' });
    } else {
        Game.logMessage("INIT ERROR: Player start pos not found!", gameState, { level: 'ERROR', target: 'BOTH', className: 'log-system log-negative' }); // Use BOTH for fatal errors
        gameState.gameActive = false;
        return false;
    }

    // 4. Place Enemies -> gameState.enemies
    gameState.enemies = []; // Initialize enemies array in gameState
    const numEnemiesToPlace = NUM_ENEMIES || 3;
    Game.logMessage(`INIT: Placing ${numEnemiesToPlace} enemies...`, gameState, { level: 'INFO', target: 'CONSOLE' });
    for (let i = 0; i < numEnemiesToPlace; i++) {
        // Pass gameState to createAndPlaceEnemy
        const newEnemy = createAndPlaceEnemy(i, occupiedCoords, gameState);
        if (newEnemy) {
            gameState.enemies.push(newEnemy); // Add to gameState.enemies
        }
    }
    Game.logMessage(`INIT: Placed ${gameState.enemies.length} enemies.`, gameState, { level: 'INFO', target: 'CONSOLE' });

    // 5. Initialize UI (Attaches listeners, performs initial draw)
    if (typeof initializeUI === 'function') {
        initializeUI(gameState); // Call function from ui.js
    } else {
        Game.logMessage("FATAL: initializeUI function not found! Check script load order.", gameState, { level: 'ERROR', target: 'BOTH', className: 'log-system log-negative' }); // Use BOTH for fatal errors
        gameState.gameActive = false;
        return false;
    }

    // 6. Log Game Started (using Game method with gameState)
    Game.logMessage("Game Started.", gameState, { level: 'PLAYER', target: 'BOTH', className: LOG_CLASS_SYSTEM });
    Game.logMessage("INIT: Initialization sequence complete.", gameState, { level: 'INFO', target: 'CONSOLE' });
    Game.logMessage(`Initial Turn: ${gameState.currentTurn}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
    if (gameState.player) {
        Game.logMessage(`Player starting at: ${gameState.player.row}, ${gameState.player.col}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        Game.logMessage(`Initial resources: ${JSON.stringify(gameState.player.resources)}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
    }
    if (gameState.enemies) {
        Game.logMessage(`Placed ${gameState.enemies.length} enemies.`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
    }

    // Explicit log update after init messages is now handled within initializeUI

    return true; // Indicate success
}

// --- Start Game ---
if (typeof initializeGame === 'function') {
    initializeGame(); // Creates and populates the global gameState
}
