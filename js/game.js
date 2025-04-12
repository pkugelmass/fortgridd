console.log("game.js loaded");

/**
 * The Game object now primarily contains functions that operate on a GameState object.
 * It no longer holds the state itself.
 */
const Game = {
    // --- State Accessors ---
    getCurrentTurn: function(gameState) { return gameState.currentTurn; },
    isPlayerTurn: function(gameState) { return gameState.gameActive && gameState.currentTurn === 'player'; },
    isGameOver: function(gameState) { return !gameState.gameActive; },
    getTurnNumber: function(gameState) { return gameState.turnNumber; },
    getSafeZone: function(gameState) { return { ...gameState.safeZone }; }, // Return a copy
    getLog: function(gameState) { return [...gameState.logMessages]; }, // Return a copy

    // --- State Modifiers ---
    /** Sets the game state to inactive (game over). */
    setGameOver: function(gameState) {
        if (!gameState.gameActive) return; // Don't run multiple times
        this.logMessage("Setting gameActive = false.", gameState, { level: 'INFO', target: 'CONSOLE' });
        gameState.gameActive = false;
        // Win/Loss message should be logged by checkEndConditions before calling this
        // Redrawing is now handled by the main loop/renderer
    },

    // --- Logging ---
    /** Helper object to assign numerical values to log levels for comparison */
    LOG_LEVEL_VALUES: {
        'DEBUG': 1,
        'INFO': 2,
        'PLAYER': 2, // Treat PLAYER level same as INFO for console filtering purposes
        'WARN': 3,
        'ERROR': 4
    },

    /**
     * Logs a message to the appropriate target(s) with specified level and styling.
     * @param {string} message - The core message content.
     * @param {GameState} gameState - The current game state.
     * @param {object} options - Logging options.
     * @param {string} [options.level='INFO'] - Severity/type ('DEBUG', 'INFO', 'WARN', 'ERROR', 'PLAYER'). Controls console output method and filtering.
     * @param {string} [options.target='PLAYER'] - Destination ('CONSOLE', 'PLAYER', 'BOTH').
     * @param {string|null} [options.className=null] - CSS class for styling messages in the player log.
     */
    logMessage: function(message, gameState, options = {}) {
        // Default options
        const { level = 'INFO', target = 'PLAYER', className = null } = options;

        const messageWithTurn = `T${gameState.turnNumber}: ${message}`;
        const consoleLogLevelValue = this.LOG_LEVEL_VALUES[CONSOLE_LOG_LEVEL] || this.LOG_LEVEL_VALUES['INFO'];
        const messageLevelValue = this.LOG_LEVEL_VALUES[level.toUpperCase()] || this.LOG_LEVEL_VALUES['INFO'];

        // --- Console Logging ---
        if (target === 'CONSOLE' || target === 'BOTH') {
            if (messageLevelValue >= consoleLogLevelValue) {
                const consoleMessage = `[${level.toUpperCase()}] ${messageWithTurn}`;
                switch (level.toUpperCase()) {
                    case 'ERROR':
                        console.error(consoleMessage);
                        break;
                    case 'WARN':
                        console.warn(consoleMessage);
                        break;
                    case 'DEBUG':
                        // console.debug might not be visually distinct, use log but could change
                        console.log(consoleMessage);
                        break;
                    case 'INFO':
                    case 'PLAYER': // Log PLAYER level to console as INFO if targeted
                    default:
                        console.log(consoleMessage);
                        break;
                }
            }
        }

        // --- Player Log (In-Game UI) ---
        if (target === 'PLAYER' || target === 'BOTH') {
            // Store as an object in gameState
            gameState.logMessages.push({ message: messageWithTurn, cssClass: className });
            // Limit log size
            if (gameState.logMessages.length > MAX_LOG_MESSAGES) {
                gameState.logMessages.shift();
            }
            // Note: The actual UI update (calling updateLogDisplay) should ideally be triggered
            // by the code that initiated the action leading to this log message,
            // rather than being directly coupled within logMessage itself.
        }
    },

    // --- End Condition Check ---
    /** Checks end conditions based on gameState and logs/calls setGameOver if met */
    checkEndConditions: function(gameState) {
        if (this.isGameOver(gameState)) return true; // Use the accessor with gameState

        // Check player state from gameState
        if (gameState.player && gameState.player.hp <= 0) {
            this.logMessage("Player eliminated! GAME OVER!", gameState, { level: 'PLAYER', target: 'BOTH', className: LOG_CLASS_PLAYER_BAD });
            this.setGameOver(gameState); // Pass gameState
            return true;
        }

        // Check enemy state from gameState
        if (gameState.enemies && gameState.enemies.filter(e => e && e.hp > 0).length === 0) {
            this.logMessage("All enemies eliminated! YOU WIN!", gameState, { level: 'PLAYER', target: 'BOTH', className: LOG_CLASS_PLAYER_GOOD });
            this.setGameOver(gameState); // Pass gameState
            return true;
        }
        return false;
    },

    // --- Safe Zone Helpers ---
    /** Checks if a given coordinate is outside the current safe zone */
    isOutsideSafeZone: function(row, col, gameState) {
        const zone = gameState.safeZone;
        if (!zone) return false; // Or handle appropriately if zone might be null initially
        return row < zone.minRow || row > zone.maxRow || col < zone.minCol || col > zone.maxCol;
    },

    // --- Threat Calculation ---
    /**
     * Calculates a threat map for the current game state.
     * Each cell contains the number of living enemies that can attack that tile.
     * Only living (hp > 0, not inactive) enemies are considered.
     * All enemies use the same attack range logic (AI_RANGE_MIN).
     * @param {GameState} gameState - The current game state.
     * @returns {number[][]} threatMap - 2D array [row][col] with threat counts.
     */
    calculateThreatMap: function(gameState) {
        // Use grid size from config.js
        // Always use the actual mapData size for threat map dimensions
        const rows = gameState.mapData.length;
        const cols = gameState.mapData[0] ? gameState.mapData[0].length : 0;
        const threatMap = Array.from({ length: rows }, () => Array(cols).fill(0));

        if (!gameState.enemies) return threatMap;

        for (const enemy of gameState.enemies) {
            if (!enemy || enemy.hp <= 0 || enemy.inactive) continue;
            const { row, col } = enemy;

            // Determine attack range: ranged if has ammo, else melee (1)
            let range = 1;
            if (enemy.resources && enemy.resources.ammo > 0 && typeof RANGED_ATTACK_RANGE !== 'undefined') {
                range = RANGED_ATTACK_RANGE;
            }

            // For each tile in range, increment threat count
            for (let dr = -range; dr <= range; dr++) {
                for (let dc = -range; dc <= range; dc++) {
                    const dist = Math.abs(dr) + Math.abs(dc);
                    // Never threaten the center tile (dist == 0)
                    if (dist === 0) continue;
                    // Only threaten orthogonal tiles (same row or same column)
                    if (!(dr === 0 || dc === 0)) continue;
                    // Only within range
                    if (dist > range) continue;
                    const r = row + dr;
                    const c = col + dc;
                    if (r >= 0 && r < rows && c >= 0 && c < cols) {
                        threatMap[r][c]++;
                    }
                }
            }
        }
        return threatMap;
    },

    // --- Shrink Logic ---
    /**
     * Shrinks the safe zone boundaries in the gameState based on SHRINK_AMOUNT.
     * Includes checks to prevent zone inversion.
     * @param {GameState} gameState - The current game state.
     * @returns {boolean} - True if the zone boundaries actually changed.
     */
    shrinkSafeZone: function(gameState) {
        // Check if it's time to shrink based on gameState.turnNumber
        if (gameState.turnNumber <= 1 || (gameState.turnNumber - 1) % SHRINK_INTERVAL !== 0) {
             return false; // Not time to shrink
        }

        this.logMessage("Shrinking safe zone!", gameState, { level: 'INFO', target: 'CONSOLE' });
        const oldZoneJSON = JSON.stringify(gameState.safeZone); // Use gameState

        // Calculate new boundaries based on gameState.safeZone
        const newMinRow = gameState.safeZone.minRow + SHRINK_AMOUNT;
        const newMaxRow = gameState.safeZone.maxRow - SHRINK_AMOUNT;
        const newMinCol = gameState.safeZone.minCol + SHRINK_AMOUNT;
        const newMaxCol = gameState.safeZone.maxCol - SHRINK_AMOUNT;

        let shrunk = false; // Flag if dimensions actually changed

        // Apply changes to gameState.safeZone with checks
        if (newMinRow <= newMaxRow) {
            gameState.safeZone.minRow = newMinRow;
            gameState.safeZone.maxRow = newMaxRow;
        } else {
            this.logMessage("Shrink prevented rows: Min/max met or crossed.", gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }

        if (newMinCol <= newMaxCol) {
            gameState.safeZone.minCol = newMinCol;
            gameState.safeZone.maxCol = newMaxCol;
        } else {
            this.logMessage("Shrink prevented cols: Col min/max met or crossed.", gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }

        // Check if gameState.safeZone actually changed
        if (JSON.stringify(gameState.safeZone) !== oldZoneJSON){
            shrunk = true;
            const zone = gameState.safeZone; // Use local var for log clarity
            this.logMessage(`Storm shrinks! Safe Zone: R[${zone.minRow}-${zone.maxRow}], C[${zone.minCol}-${zone.maxCol}]`, gameState, { level: 'PLAYER', target: 'BOTH', className: LOG_CLASS_SYSTEM });
            this.logMessage(`Safe zone after shrink: ${JSON.stringify(gameState.safeZone)}`, gameState, { level: 'DEBUG', target: 'CONSOLE' });
        }

        return shrunk; // Indicate if shrink happened
    },

    // --- Storm Damage Logic ---
    /** Applies storm damage to units outside the safe zone in gameState */
    applyStormDamage: function(gameState) {
        if (this.isGameOver(gameState)) return false; // Use accessor

        let stateChanged = false;
        let gameEnded = false;

        // Check Player
        if (gameState.player && gameState.player.hp > 0) {
             // Use the helper function
             if (this.isOutsideSafeZone(gameState.player.row, gameState.player.col, gameState)) {
                  const damage = STORM_DAMAGE; // Use constant
                  this.logMessage(`Player at (${gameState.player.row},${gameState.player.col}) takes ${damage} storm damage!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_PLAYER_BAD });
                  gameState.player.hp -= damage;
                  stateChanged = true;
                  if (this.checkEndConditions(gameState)) { gameEnded = true; } // Pass gameState
             }
        }

        // Check Enemies (use filter directly on gameState.enemies)
        if (!gameEnded && gameState.enemies) {
            let enemiesKilledByStorm = 0;
            // Filter in place or create new array? Let's modify in place for now.
            const survivingEnemies = [];
            for (const enemy of gameState.enemies) {
                if (!enemy || enemy.hp <= 0) continue; // Skip dead/invalid enemies

                // Use the helper function
                if (this.isOutsideSafeZone(enemy.row, enemy.col, gameState)) {
                     const damage = STORM_DAMAGE; // Use constant
                     this.logMessage(`Enemy ${enemy.id} at (${enemy.row},${enemy.col}) takes ${damage} storm damage!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
                     enemy.hp -= damage;
                     stateChanged = true;
                     if (enemy.hp <= 0) {
                         this.logMessage(`Enemy ${enemy.id} eliminated by storm!`, gameState, { level: 'PLAYER', target: 'PLAYER', className: LOG_CLASS_ENEMY_EVENT });
                         enemiesKilledByStorm++;
                         // Don't add to survivingEnemies
                     } else {
                         survivingEnemies.push(enemy); // Keep alive enemy
                     }
                } else {
                    survivingEnemies.push(enemy); // Keep safe enemy
                }
            }
            gameState.enemies = survivingEnemies; // Update the enemies array in gameState

            if (enemiesKilledByStorm > 0) {
                stateChanged = true;
                if (this.checkEndConditions(gameState)) { gameEnded = true; } // Pass gameState
            }
        }
         return stateChanged; // Indicate if any damage was applied or enemies removed
    },

    // --- Turn Management ---
    /** Ends player turn, switches currentTurn in gameState to 'ai' */
    endPlayerTurn: function(gameState) {
        if (this.isGameOver(gameState)) return;
        gameState.currentTurn = 'ai';
        // The actual execution of AI turns (executeAiTurns) is now handled by the main loop
    },

    /** Ends AI turn: increments turn counter, runs checks, switches currentTurn in gameState to 'player' */
    endAiTurn: function(gameState) {
        if (this.isGameOver(gameState)) return;

        gameState.turnNumber++;

        this.shrinkSafeZone(gameState); // Pass gameState, logs internally
        this.applyStormDamage(gameState); // Pass gameState, logs internally, calls checkEndConditions

        if (this.isGameOver(gameState)) return; // Stop if game ended during checks

        gameState.currentTurn = 'player';

        // Redrawing the canvas is now handled by the main loop/renderer
    },

    // --- Unit Position & Pickup Helpers MOVED to js/utils.js (2025-04-09) ---

    // --- Enemy Creation Helper --- (Moved from main.js)
    /**
     * Creates a single enemy, finds a valid starting position on the map in gameState,
     * adds the position to occupiedCoords, and returns the enemy object.
     * @param {number} enemyIndex - The index for generating the enemy ID.
     * @param {Array<object>} occupiedCoords - Array of {row, col} objects to avoid placing on.
     * @param {GameState} gameState - The current game state (used for mapData).
     * @returns {object|null} The created enemy object or null if placement fails.
     */
    createAndPlaceEnemy: function(enemyIndex, occupiedCoords, gameState) {
        // Check dependencies (including gameState and its mapData)
        // Assumes findStartPosition and getValidMoves are globally accessible or imported
        if (typeof findStartPosition !== 'function' || !gameState || !gameState.mapData || typeof GRID_WIDTH === 'undefined' || typeof GRID_HEIGHT === 'undefined' || typeof TILE_LAND === 'undefined') {
            this.logMessage("createAndPlaceEnemy: Missing required functions, gameState, or mapData.", gameState, { level: 'ERROR', target: 'CONSOLE' });
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
                    this.logMessage("createAndPlaceEnemy: getValidMoves function not found! Cannot check spawn accessibility.", gameState, { level: 'WARN', target: 'CONSOLE' });
                    enemyStartPos = potentialPos; // Fallback
                }
            } else {
                break; // findStartPosition failed
            }
        }

        if (enemyStartPos) {
            // Use constants from config.js (assumed global)
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
            this.logMessage(`createAndPlaceEnemy: Could not find valid position for enemy ${enemyIndex + 1}.`, gameState, { level: 'WARN', target: 'CONSOLE' });
            return null;
        }
    },

    // --- Reset Game Logic --- (Moved from main.js)
    /**
     * Resets the game state held within the global gameState object.
     * Assumes gameState has been initialized previously.
     * @param {GameState} gameStateRef - Reference to the global gameState object.
     */
    resetGame: function(gameStateRef) {
        // 'this' refers to the Game object here
        if (!gameStateRef) {
            console.error("RESET ERROR: GameState object missing!"); // Cannot use Game.logMessage yet
            return; // Cannot proceed
        }
        this.logMessage("--- GAME RESETTING ---", gameStateRef, { level: 'INFO', target: 'CONSOLE' });

        // 1. Reset GameState Properties
        gameStateRef.currentTurn = 'player';
        gameStateRef.gameActive = true;
        gameStateRef.turnNumber = 1;
        gameStateRef.safeZone = { minRow: 0, maxRow: (GRID_HEIGHT || 25) - 1, minCol: 0, maxCol: (GRID_WIDTH || 25) - 1 };
        gameStateRef.logMessages = []; // Clear log array

        // 2. Regenerate Map
        // Assumes createMapData is globally accessible or imported
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
            this.logMessage("Map regenerated.", gameStateRef, { level: 'INFO', target: 'CONSOLE' });
        } else {
            this.logMessage("RESET ERROR: createMapData missing!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
            this.setGameOver(gameStateRef); // Use Game method with gameState
            return;
        }

        // 3. Reset Player State (within gameStateRef.player)
        const occupiedCoords = []; // Reset occupied list for placement
        // Assumes findStartPosition is globally accessible or imported
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
                this.logMessage("Player state reset and placed.", gameStateRef, { level: 'INFO', target: 'CONSOLE' });
            } else {
                this.logMessage("RESET ERROR: Player start pos not found on new map!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
                this.setGameOver(gameStateRef);
                return;
            }
        } else {
            this.logMessage("RESET ERROR: Player object in gameState or findStartPosition missing!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
            this.setGameOver(gameStateRef);
            return;
        }

        // 4. Reset and Replace Enemies (within gameStateRef.enemies)
        // Uses this.createAndPlaceEnemy now
        if (gameStateRef.enemies && typeof this.createAndPlaceEnemy === 'function') {
            gameStateRef.enemies.length = 0; // Clear the existing enemies array in gameState
            const numEnemiesToPlace = NUM_ENEMIES || 3;
            this.logMessage(`Placing ${numEnemiesToPlace} enemies...`, gameStateRef, { level: 'INFO', target: 'CONSOLE' });
            for (let i = 0; i < numEnemiesToPlace; i++) {
                // Pass gameStateRef to createAndPlaceEnemy
                const newEnemy = this.createAndPlaceEnemy(i, occupiedCoords, gameStateRef);
                if (newEnemy) {
                    gameStateRef.enemies.push(newEnemy); // Add to gameStateRef.enemies
                }
            }
            this.logMessage(`Finished placing ${gameStateRef.enemies.length} enemies.`, gameStateRef, { level: 'INFO', target: 'CONSOLE' });
        } else {
            this.logMessage("RESET ERROR: Enemies array in gameState or createAndPlaceEnemy missing!", gameStateRef, { level: 'ERROR', target: 'CONSOLE' });
            this.setGameOver(gameStateRef);
            return;
        }

        // 5. Log Reset Message (using Game method with gameStateRef)
        this.logMessage("Game Reset.", gameStateRef, { level: 'PLAYER', target: 'BOTH', className: LOG_CLASS_SYSTEM });

        // 6. Perform Initial Size/Draw for the new game state - Handled by initializeUI if called after reset
        // 7. Update log display explicitly after reset - Handled by Game.logMessage or initializeUI

        // If reset needs immediate redraw without full UI re-init, call resizeAndDraw(gameStateRef) here.
        // Assumes resizeAndDraw is globally accessible (in ui.js)
        if (typeof resizeAndDraw === 'function') {
             resizeAndDraw(gameStateRef);
        } else {
             this.logMessage("RESET WARNING: resizeAndDraw function not found, cannot redraw immediately.", gameStateRef, { level: 'WARN', target: 'CONSOLE' });
        }
        // Ensure log is updated after reset messages
        if (typeof updateLogDisplay === 'function') {
            updateLogDisplay(gameStateRef);
        }


        this.logMessage("--- GAME RESET COMPLETE ---", gameStateRef, { level: 'INFO', target: 'CONSOLE' });
    },

    // --- Initialization --- (Moved from main.js)
    /**
     * Runs the initial game setup, creating and populating the global gameState object.
     * Returns the created gameState object or null on failure.
     * NOTE: This function now CREATES and RETURNS the gameState, it doesn't assign to a global directly.
     * The caller (in main.js) will assign it to the global `gameState`.
     */
    initializeGame: function() {
        // Log start using Game.logMessage - gameState might not be fully ready, so create a temporary minimal one if needed
        const tempInitialGameState = { turnNumber: 0, logMessages: [] }; // Minimal state for logging context
        this.logMessage("Initializing game...", tempInitialGameState, { level: 'INFO', target: 'CONSOLE' });

        // Create the central GameState object locally first
        // Assumes GameState class is globally accessible or imported
        if (typeof GameState !== 'function') {
             console.error("FATAL: GameState class not found!");
             // Cannot use Game.logMessage as gameState doesn't exist yet
             return null;
        }
        const localGameState = new GameState();

        // Check essential dependencies
        // Assumes createMapData, findStartPosition, initializeUI are global/imported
        // createAndPlaceEnemy is now this.createAndPlaceEnemy
        if (typeof createMapData !== 'function' || typeof findStartPosition !== 'function' || typeof this.createAndPlaceEnemy !== 'function' || typeof initializeUI !== 'function') {
            this.logMessage("FATAL: Core game logic objects/functions missing! Check script load order and definitions.", localGameState, { level: 'ERROR', target: 'BOTH', className: 'log-system log-negative' });
            // Draw error directly on canvas if possible (ctx assumed global for now)
            if (typeof ctx !== 'undefined') {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, 300, 150);
                ctx.font = '20px Arial';
                ctx.fillStyle = 'red';
                ctx.textAlign = 'center';
                ctx.fillText('FATAL ERROR: Core setup failed.', 150, 75);
            }
            localGameState.gameActive = false; // Mark state as inactive
            return localGameState; // Return partially failed state for potential debugging
        }

        // 1. Set Initial State Properties
        localGameState.gameActive = true;
        localGameState.turnNumber = 1;
        localGameState.currentTurn = 'player'; // Player starts
        localGameState.safeZone = { minRow: 0, maxRow: GRID_HEIGHT - 1, minCol: 0, maxCol: GRID_WIDTH - 1 };
        // logMessages already initialized by GameState constructor

        // 2. Create Map -> localGameState.mapData
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
        localGameState.mapData = createMapData(mapConfig); // Pass config object

        // 3. Place Player -> localGameState.player
        const occupiedCoords = [];
        // Pass localGameState.mapData to findStartPosition
        const startPos = findStartPosition(localGameState.mapData, GRID_WIDTH, GRID_HEIGHT, TILE_LAND, occupiedCoords);
        if (startPos) {
            // Create player object and assign to localGameState.player
            localGameState.player = {
                row: startPos.row,
                col: startPos.col,
                color: PLAYER_COLOR, // Use constant
                maxHp: PLAYER_MAX_HP || 10,
                hp: PLAYER_MAX_HP || 10,
                resources: {
                    medkits: PLAYER_START_MEDKITS || 0,
                    ammo: PLAYER_START_AMMO,
                },
            };
            occupiedCoords.push({ row: localGameState.player.row, col: localGameState.player.col });
            this.logMessage("INIT: Player placed successfully.", localGameState, { level: 'INFO', target: 'CONSOLE' });
        } else {
            this.logMessage("INIT ERROR: Player start pos not found!", localGameState, { level: 'ERROR', target: 'BOTH', className: 'log-system log-negative' });
            localGameState.gameActive = false;
            return localGameState; // Return failed state
        }

        // 4. Place Enemies -> localGameState.enemies
        localGameState.enemies = []; // Initialize enemies array in localGameState
        const numEnemiesToPlace = NUM_ENEMIES || 3;
        this.logMessage(`INIT: Placing ${numEnemiesToPlace} enemies...`, localGameState, { level: 'INFO', target: 'CONSOLE' });
        for (let i = 0; i < numEnemiesToPlace; i++) {
            // Pass localGameState to createAndPlaceEnemy (now using 'this')
            const newEnemy = this.createAndPlaceEnemy(i, occupiedCoords, localGameState);
            if (newEnemy) {
                localGameState.enemies.push(newEnemy); // Add to localGameState.enemies
            }
        }
        this.logMessage(`INIT: Placed ${localGameState.enemies.length} enemies.`, localGameState, { level: 'INFO', target: 'CONSOLE' });

        // 5. Initialize UI (Attaches listeners, performs initial draw)
        // Pass the newly created localGameState
        initializeUI(localGameState);

        // 6. Log Game Started (using Game method with localGameState)
        this.logMessage("Game Started.", localGameState, { level: 'PLAYER', target: 'BOTH', className: LOG_CLASS_SYSTEM });
        this.logMessage("INIT: Initialization sequence complete.", localGameState, { level: 'INFO', target: 'CONSOLE' });
        this.logMessage(`Initial Turn: ${localGameState.currentTurn}`, localGameState, { level: 'DEBUG', target: 'CONSOLE' });
        if (localGameState.player) {
            this.logMessage(`Player starting at: ${localGameState.player.row}, ${localGameState.player.col}`, localGameState, { level: 'DEBUG', target: 'CONSOLE' });
            this.logMessage(`Initial resources: ${JSON.stringify(localGameState.player.resources)}`, localGameState, { level: 'DEBUG', target: 'CONSOLE' });
        }
        if (localGameState.enemies) {
            this.logMessage(`Placed ${localGameState.enemies.length} enemies.`, localGameState, { level: 'DEBUG', target: 'CONSOLE' });
        }

        // Explicit log update after init messages is now handled within initializeUI

        return localGameState; // Return the fully initialized gameState
    },
};
