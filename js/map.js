console.log("map.js loaded");

// --- Tile Definitions ---
// Moved from script.js
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;
const TILE_SCRAP = 3;

// --- Visual Mappings ---
// Moved from script.js
const TILE_EMOJIS = {}; // Keep empty if using colors
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F', // DarkSeaGreen
    [TILE_WALL]: '#A9A9A9', // DarkGray
    [TILE_TREE]: '#556B2F', // DarkOliveGreen
    [TILE_SCRAP]: '#B8860B', // DarkGoldenrod
};

/**
 * Creates the initial map data structure (a 2D array).
 * Generates land, walls, trees, and scrap.
 * Now RETURNS the map data array.
 * Assumes GRID_WIDTH and GRID_HEIGHT are available globally (from script.js or config.js later)
 * @returns {number[][]} The generated map data array.
 */
function createMapData() {
    console.log("Creating map data...");
    const newMapData = []; // Use a local variable
    for (let row = 0; row < GRID_HEIGHT; row++) {
        newMapData[row] = []; // Create a new row array
        for (let col = 0; col < GRID_WIDTH; col++) {
            let tile = TILE_LAND;
            if (row > 0 && row < GRID_HEIGHT - 1 && col > 0 && col < GRID_WIDTH - 1) {
                const randomValue = Math.random();
                if (randomValue < 0.05) { // Wall %
                    tile = TILE_WALL;
                } else if (randomValue < 0.13) { // Tree % (cumulative)
                    tile = TILE_TREE;
                } else if (randomValue < 0.18) { // Scrap % (cumulative)
                    tile = TILE_SCRAP;
                }
            }
            newMapData[row][col] = tile;
        }
    }
    console.log("Map data creation complete (first row sample):", newMapData[0]);
    return newMapData; // Return the generated map
}

// We can add more map-specific functions here later, like:
// function isWalkable(row, col) { ... }
// function getTileType(row, col) { ... }