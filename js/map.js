console.log("map.js loaded");

// --- Configuration for Map Generation ---
// MOVED to config.js

// --- Tile Definitions ---
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;
const TILE_MEDKIT = 3;
const TILE_AMMO = 4;

// --- Visual Mappings ---
// TILE_EMOJIS removed
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F',   [TILE_WALL]: '#A9A9A9',
    [TILE_TREE]: '#556B2F',   [TILE_MEDKIT]: '#FF6347',
    [TILE_AMMO]: '#4682B4',
};

/** Helper function to count wall neighbours */
function countWallNeighbours(grid, r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) { for (let j = -1; j <= 1; j++) { if (i === 0 && j === 0) continue; const checkRow = r + i; const checkCol = c + j; if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) { count++; } else if (grid[checkRow] && grid[checkRow][checkCol] === TILE_WALL) { count++; } } }
    return count;
}

/** Creates map data using Cellular Automata & config constants */
function createMapData() {
    // Relies on constants from config.js
    console.log("Creating map data using Cellular Automata...");
    let currentMap = [];
    // 1. Initial Random Fill
    for (let row = 0; row < GRID_HEIGHT; row++) { currentMap[row] = []; for (let col = 0; col < GRID_WIDTH; col++) { if (row === 0 || row === GRID_HEIGHT - 1 || col === 0 || col === GRID_WIDTH - 1) { currentMap[row][col] = TILE_WALL; } else { currentMap[row][col] = (Math.random() < INITIAL_WALL_CHANCE) ? TILE_WALL : TILE_LAND; } } }
    // 2. Cellular Automata Iterations
    let nextMap = [];
    for (let i = 0; i < CA_ITERATIONS; i++) { nextMap = currentMap.map(arr => arr.slice()); for (let row = 1; row < GRID_HEIGHT - 1; row++) { for (let col = 1; col < GRID_WIDTH - 1; col++) { const wallNeighbours = countWallNeighbours(currentMap, row, col); if (wallNeighbours >= CA_WALL_THRESHOLD) { nextMap[row][col] = TILE_WALL; } else { nextMap[row][col] = TILE_LAND; } } } currentMap = nextMap; }
    // 3. Feature Placement (Uses constants from config.js)
    console.log("Placing features...");
    // Calculate cumulative probabilities
    const treeChance = FEATURE_SPAWN_CHANCE_TREE || 0;
    const medkitChance = FEATURE_SPAWN_CHANCE_MEDKIT || 0;
    const ammoChance = FEATURE_SPAWN_CHANCE_AMMO || 0;
    const medkitThreshold = treeChance + medkitChance;
    const ammoThreshold = medkitThreshold + ammoChance;

    for (let row = 1; row < GRID_HEIGHT - 1; row++) {
        for (let col = 1; col < GRID_WIDTH - 1; col++) {
            if (currentMap[row][col] === TILE_LAND) {
                const randomValue = Math.random();
                if (randomValue < treeChance) { currentMap[row][col] = TILE_TREE; }
                else if (randomValue < medkitThreshold) { currentMap[row][col] = TILE_MEDKIT; }
                else if (randomValue < ammoThreshold) { currentMap[row][col] = TILE_AMMO; }
            }
        }
    }
    console.log("Map data creation complete.");
    return currentMap;
}