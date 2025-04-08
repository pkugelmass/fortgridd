console.log("player.js loaded");

const player = {
    row: null,
    col: null,
    color: PLAYER_COLOR, // Player visual color
    resources: {
        // Initial values set during Game Initialization/Reset using config constants
        medkits: 0,
        ammo: 0
    },
    // HP values set during Game Initialization/Reset using config constant
    hp: 0,
    maxHp: 0
};

/** Finds start position */
function findStartPosition(mapData, gridWidth, gridHeight, walkableTileType, occupiedCoords = []) {
    // Function body unchanged
    let attempts = 0; const maxAttempts = gridWidth * gridHeight * 2;
    while (attempts < maxAttempts) { const randomRow = Math.floor(Math.random() * (gridHeight - 2)) + 1; const randomCol = Math.floor(Math.random() * (gridWidth - 2)) + 1; if (mapData && mapData[randomRow] && mapData[randomRow][randomCol] === walkableTileType) { let isOccupied = false; for (const pos of occupiedCoords) { if (pos.row === randomRow && pos.col === randomCol) { isOccupied = true; break; } } if (!isOccupied) { return { row: randomRow, col: randomCol }; } } attempts++; }
    console.error("Could not find a valid *unoccupied* starting position!"); return null;
}
