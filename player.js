console.log("player.js loaded");

// Simple object to hold player data
const player = {
    row: null,
    col: null,
    color: '#007bff', // A blue color for the player representation
    resources: { // Add resources object
        scrap: 0
    }
};

/**
 * Finds a random, valid starting position (on a specific tile type) for the player.
 * Avoids the outermost border cells.
 * @param {number[][]} mapData - The 2D array representing the map.
 * @param {number} gridWidth - Width of the grid.
 * @param {number} gridHeight - Height of the grid.
 * @param {number} walkableTileType - The tile type considered valid for starting (e.g., TILE_LAND).
 * @returns {{row: number, col: number} | null} - The starting position or null if none found.
 */
function findStartPosition(mapData, gridWidth, gridHeight, walkableTileType) {
    let attempts = 0;
    const maxAttempts = gridWidth * gridHeight * 2; // Safety limit

    while (attempts < maxAttempts) {
        const randomRow = Math.floor(Math.random() * (gridHeight - 2)) + 1;
        const randomCol = Math.floor(Math.random() * (gridWidth - 2)) + 1;

        if (mapData[randomRow] && mapData[randomRow][randomCol] === walkableTileType) {
            console.log(`Found start position at: ${randomRow}, ${randomCol}`);
            return { row: randomRow, col: randomCol };
        }
        attempts++;
    }

    console.error("Could not find a valid starting position!");
    return null; // Indicate failure
}

// Other player functions can go here later