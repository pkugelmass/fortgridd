console.log("player.js loaded");

// Simple object to hold player data
const player = {
    row: null, // Will be set by findStartPosition
    col: null,
    color: '#007bff' // A blue color for the player representation
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
function findStartPosition(mapData, gridWidth, gridHeight, walkableTileType) { // Added walkableTileType parameter
    let attempts = 0;
    const maxAttempts = gridWidth * gridHeight * 2; // Safety limit

    while (attempts < maxAttempts) {
        // Generate random coordinates, avoiding the border (1 to width/height - 2)
        const randomRow = Math.floor(Math.random() * (gridHeight - 2)) + 1;
        const randomCol = Math.floor(Math.random() * (gridWidth - 2)) + 1;

        // Check if the randomly selected cell is the specified walkable tile type
        if (mapData[randomRow] && mapData[randomRow][randomCol] === walkableTileType) { // Use parameter
            console.log(`Found start position at: ${randomRow}, ${randomCol}`);
            return { row: randomRow, col: randomCol };
        }
        attempts++;
    }

    console.error("Could not find a valid starting position!");
    return null; // Indicate failure
}

// We might add more player-specific functions here later, like:
// function drawPlayer(ctx, cellSize) { ... } // Can be moved here later
// function movePlayer(dx, dy) { ... }