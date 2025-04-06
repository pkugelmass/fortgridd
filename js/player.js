console.log("player.js loaded");

const player = {
    row: null,
    col: null,
    color: '#007bff',
    resources: {
        medkits: 0
    },
    // NEW: Health properties
    hp: 10,
    maxHp: 10
};

/**
 * Finds a random, valid starting position (on a specific tile type) for an entity.
 * Avoids the outermost border cells AND specific occupied coordinates.
 * @param {number[][]} mapData - The 2D array representing the map.
 * @param {number} gridWidth - Width of the grid.
 * @param {number} gridHeight - Height of the grid.
 * @param {number} walkableTileType - The tile type considered valid for starting (e.g., TILE_LAND).
 * @param {Array<{row: number, col: number}>} occupiedCoords - An array of coordinates that are already occupied.
 * @returns {{row: number, col: number} | null} - The starting position or null if none found.
 */
function findStartPosition(mapData, gridWidth, gridHeight, walkableTileType, occupiedCoords = []) { // Added occupiedCoords parameter
    let attempts = 0;
    const maxAttempts = gridWidth * gridHeight * 2; // Safety limit

    while (attempts < maxAttempts) {
        const randomRow = Math.floor(Math.random() * (gridHeight - 2)) + 1; // Avoid border
        const randomCol = Math.floor(Math.random() * (gridWidth - 2)) + 1; // Avoid border

        // Check 1: Is the randomly selected cell the correct walkable tile type?
        if (mapData[randomRow] && mapData[randomRow][randomCol] === walkableTileType) {

            // Check 2: Is this position already occupied?
            let isOccupied = false;
            for (const pos of occupiedCoords) {
                if (pos.row === randomRow && pos.col === randomCol) {
                    isOccupied = true;
                    break; // Stop checking once occupied position found
                }
            }

            // If it's walkable AND not occupied, return it
            if (!isOccupied) {
                console.log(`Found valid unoccupied start position at: ${randomRow}, ${randomCol}`);
                return { row: randomRow, col: randomCol };
            }
        }
        attempts++;
    }

    console.error("Could not find a valid *unoccupied* starting position!");
    return null; // Indicate failure
}

// Other player functions can go here later