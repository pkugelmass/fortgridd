// console.log("map.js loaded"); // Removed module loaded log

// --- Configuration for Map Generation ---
// MOVED to config.js

// --- Tile Definitions ---
// MOVED to config.js

// --- Visual Mappings ---
// MOVED to config.js

/**
 * Helper function to count wall neighbours for Cellular Automata.
 * @param {Array<Array<number>>} grid - The current map grid.
 * @param {number} r - The row index to check around.
 * @param {number} c - The column index to check around.
 * @param {number} gridHeight - The height of the grid.
 * @param {number} gridWidth - The width of the grid.
 * @param {number} tileWall - The value representing a wall tile.
 * @returns {number} - The count of wall neighbours.
 */
function countWallNeighbours(grid, r, c, gridHeight, gridWidth, tileWall) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue; // Skip self
            const checkRow = r + i;
            const checkCol = c + j;
            // Count out-of-bounds as walls
            if (checkRow < 0 || checkRow >= gridHeight || checkCol < 0 || checkCol >= gridWidth) {
                count++;
            } else if (grid[checkRow]) {
                // Check if the neighbour is a regular wall OR a boundary wall
                const neighbourTile = grid[checkRow][checkCol];
                if (neighbourTile === tileWall || neighbourTile === TILE_BOUNDARY) {
                    count++;
                }
            }
        }
    }
    return count;
}

/**
 * Creates map data using Cellular Automata based on provided configuration.
 * @param {object} config - An object containing map generation parameters. Expected properties:
 *   GRID_HEIGHT, GRID_WIDTH, TILE_WALL, TILE_LAND, INITIAL_WALL_CHANCE,
 *   CA_ITERATIONS, CA_WALL_THRESHOLD, FEATURE_SPAWN_CHANCE_TREE,
 *   FEATURE_SPAWN_CHANCE_MEDKIT, FEATURE_SPAWN_CHANCE_AMMO, TILE_TREE,
 *   TILE_MEDKIT, TILE_AMMO.
 * @returns {Array<Array<number>>} - The generated map data grid.
 */
function createMapData(config) {
    // Destructure required config values with fallbacks for safety
    const {
        GRID_HEIGHT = 25, GRID_WIDTH = 25, TILE_WALL = 1, TILE_LAND = 0,
        INITIAL_WALL_CHANCE = 0.45, CA_ITERATIONS = 4, CA_WALL_THRESHOLD = 5,
        FEATURE_SPAWN_CHANCE_TREE = 0.05, FEATURE_SPAWN_CHANCE_MEDKIT = 0.02,
        FEATURE_SPAWN_CHANCE_AMMO = 0.03, TILE_TREE = 2, TILE_MEDKIT = 3, TILE_AMMO = 4
    } = config || {}; // Use empty object if config is null/undefined

    // Cannot log here easily without gameState, keep console.log for now or refactor to pass gameState
    console.log("Creating map data using Cellular Automata...");
    let currentMap = [];

    // 1. Initial Random Fill
    for (let row = 0; row < GRID_HEIGHT; row++) {
        currentMap[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            // Ensure borders are indestructible boundary walls
            if (row === 0 || row === GRID_HEIGHT - 1 || col === 0 || col === GRID_WIDTH - 1) {
                currentMap[row][col] = TILE_BOUNDARY; // Use new constant for border
            } else {
                currentMap[row][col] = (Math.random() < INITIAL_WALL_CHANCE) ? TILE_WALL : TILE_LAND; // Inner cells use regular wall/land
            }
        }
    }

    // 2. Cellular Automata Iterations
    let nextMap = [];
    for (let i = 0; i < CA_ITERATIONS; i++) {
        nextMap = currentMap.map(arr => arr.slice()); // Create a copy for the next state
        for (let row = 1; row < GRID_HEIGHT - 1; row++) { // Iterate only inner cells
            for (let col = 1; col < GRID_WIDTH - 1; col++) {
                // Pass necessary parameters to helper
                const wallNeighbours = countWallNeighbours(currentMap, row, col, GRID_HEIGHT, GRID_WIDTH, TILE_WALL);
                // Apply CA rule
                if (wallNeighbours >= CA_WALL_THRESHOLD) {
                    nextMap[row][col] = TILE_WALL;
                } else {
                    nextMap[row][col] = TILE_LAND;
                }
            }
        }
        currentMap = nextMap; // Update map for the next iteration
    }

    // 3. Feature Placement
    // Cannot log here easily without gameState, keep console.log for now or refactor to pass gameState
    console.log("Placing features...");
    // Calculate cumulative probabilities from config values
    const treeChance = FEATURE_SPAWN_CHANCE_TREE;
    const medkitChance = FEATURE_SPAWN_CHANCE_MEDKIT;
    const ammoChance = FEATURE_SPAWN_CHANCE_AMMO;
    const medkitThreshold = treeChance + medkitChance;
    const ammoThreshold = medkitThreshold + ammoChance;

    for (let row = 1; row < GRID_HEIGHT - 1; row++) { // Iterate only inner cells
        for (let col = 1; col < GRID_WIDTH - 1; col++) {
            // Place features only on land tiles
            if (currentMap[row][col] === TILE_LAND) {
                const randomValue = Math.random();
                if (randomValue < treeChance) { currentMap[row][col] = TILE_TREE; }
                else if (randomValue < medkitThreshold) { currentMap[row][col] = TILE_MEDKIT; }
                else if (randomValue < ammoThreshold) { currentMap[row][col] = TILE_AMMO; }
                // Else: remains TILE_LAND
            }
        }
    }

    // Cannot log here easily without gameState, keep console.log for now or refactor to pass gameState
    console.log("Map data creation complete.");
    return currentMap;
}
