console.log("map.js loaded");

// --- Configuration for Map Generation ---
// (Could move to config.js later if desired)
const INITIAL_WALL_CHANCE = 0.3; // User preferred value
const CA_ITERATIONS = 5;          // User preferred value
const CA_WALL_THRESHOLD = 4;      // User preferred value

// --- Tile Definitions ---
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;
const TILE_MEDKIT = 3;
const TILE_AMMO = 4;   // *** NEW: Ammo tile type ***

// --- Visual Mappings ---
const TILE_EMOJIS = {};
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F',   // DarkSeaGreen
    [TILE_WALL]: '#A9A9A9',   // DarkGray
    [TILE_TREE]: '#556B2F',   // DarkOliveGreen
    [TILE_MEDKIT]: '#FF6347', // Tomato Red
    [TILE_AMMO]: '#4682B4',   // *** NEW: SteelBlue for Ammo ***
};

/**
 * Helper function to count wall neighbours around a cell.
 */
function countWallNeighbours(grid, r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue; // Skip self
            const checkRow = r + i; const checkCol = c + j;
            // Treat out-of-bounds as walls
            if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) {
                count++;
            } else if (grid[checkRow] && grid[checkRow][checkCol] === TILE_WALL) { // Check grid cell
                count++;
            }
        }
    }
    return count;
}

/**
 * Creates map data using Cellular Automata for walls, then places features.
 * @returns {number[][]} The generated map data array.
 */
function createMapData() {
    console.log("Creating map data using Cellular Automata...");
    let currentMap = [];

    // 1. Initial Random Fill (Noise)
    for (let row = 0; row < GRID_HEIGHT; row++) {
        currentMap[row] = [];
        for (let col = 0; col < GRID_WIDTH; col++) {
            if (row === 0 || row === GRID_HEIGHT - 1 || col === 0 || col === GRID_WIDTH - 1) {
                currentMap[row][col] = TILE_WALL; // Ensure borders are walls
            } else {
                currentMap[row][col] = (Math.random() < INITIAL_WALL_CHANCE) ? TILE_WALL : TILE_LAND;
            }
        }
    }

    // 2. Cellular Automata Iterations
    let nextMap = [];
    for (let i = 0; i < CA_ITERATIONS; i++) {
        nextMap = currentMap.map(arr => arr.slice()); // Create copy
        for (let row = 1; row < GRID_HEIGHT - 1; row++) {
            for (let col = 1; col < GRID_WIDTH - 1; col++) {
                const wallNeighbours = countWallNeighbours(currentMap, row, col);
                if (wallNeighbours >= CA_WALL_THRESHOLD) { nextMap[row][col] = TILE_WALL; }
                else { nextMap[row][col] = TILE_LAND; }
            }
        }
        currentMap = nextMap; // Update map
    }

    // 3. Feature Placement (Trees, Medkits, Ammo) on Land Tiles
    console.log("Placing features (Trees, Medkits, Ammo)...");
    for (let row = 1; row < GRID_HEIGHT - 1; row++) { // Exclude borders
        for (let col = 1; col < GRID_WIDTH - 1; col++) {
            if (currentMap[row][col] === TILE_LAND) { // Only on land
                const randomValue = Math.random();
                // Adjust probabilities as desired
                if (randomValue < 0.07) { // Example: 7% Tree
                    currentMap[row][col] = TILE_TREE;
                } else if (randomValue < 0.11) { // Example: 4% Medkit (0.07 + 0.04)
                    currentMap[row][col] = TILE_MEDKIT;
                } else if (randomValue < 0.15) { // Example: 4% Ammo (0.11 + 0.04)
                    currentMap[row][col] = TILE_AMMO; // *** Use new constant ***
                }
                // Leaves as TILE_LAND otherwise
            }
        }
    }

    console.log("Map data creation complete (first row sample):", currentMap[0]);
    return currentMap; // Return the final map
}