/**
 * @class Map
 * Represents the game map, which is a grid of Tile objects.
 * Provides methods for tile access and finding valid start positions.
 */
class Map {
   /**
    * Create a Map.
    * @param {Object} [config={}] - The config object for map defaults.
    * @param {number} [width] - The width of the map (overrides config).
    * @param {number} [height] - The height of the map (overrides config).
    */
   constructor(config = {}, width, height) {
       const mapConfig = config.map || config; // allow either config.map or flat config
       const resolvedWidth = (typeof width === "number" ? width : (typeof mapConfig.width === "number" ? mapConfig.width : 20));
       const resolvedHeight = (typeof height === "number" ? height : (typeof mapConfig.height === "number" ? mapConfig.height : 20));
       /** @type {number} */
       this.width = resolvedWidth;
       /** @type {number} */
       this.height = resolvedHeight;
       /** @type {Tile[][]} */
       this.grid = this._generateEmptyGrid(resolvedWidth, resolvedHeight);
       /** @type {Object|null} */
       this.threatMap = null; // Placeholder for threat map logic
   }

    /**
     * Generates an empty grid of Tile objects.
     * @private
     * @param {number} width
     * @param {number} height
     * @returns {Tile[][]}
     */
    _generateEmptyGrid(width, height) {
        const grid = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(new Tile('empty', true));
            }
            grid.push(row);
        }
        return grid;
    }

    /**
     * Finds a random, unoccupied, walkable starting position on the map.
     * @param {string} walkableType - The tile type considered walkable (e.g., 'land').
     * @param {Unit[]} [occupiedUnits] - Array of units to consider as occupying tiles.
     * @returns {{x: number, y: number}|null} The coordinates {x, y} or null if no position found.
     */
    findStartPosition(walkableType, occupiedUnits = []) {
        const candidates = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.getTile(x, y);
                if (
                    tile &&
                    tile.type === walkableType &&
                    tile.passable &&
                    !tile.isOccupied() &&
                    !occupiedUnits.some(u => u.x === x && u.y === y)
                ) {
                    candidates.push({ x, y });
                }
            }
        }
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * Generates the map layout.
     * Stub for map generation logic.
     */
    generate() {
        // TODO: Implement map generation logic
    }

   /**
     * Calculates a threat map for the current game state.
     * Each cell contains the number of living enemies that can attack that tile.
     * Only living (hp > 0, not inactive) enemies are considered.
     * All enemies use the same attack range logic (AI_RANGE_MIN).
     * @param {GameState} gameState - The current game state.
     * @returns {number[][]} threatMap - 2D array [row][col] with threat counts.
     */
    calculateThreatMap(gameState) {
        const rows = this.grid.length;
        const cols = this.grid[0] ? this.grid[0].length : 0;
        const threatMap = Array.from({ length: rows }, () => Array(cols).fill(0));

        if (!gameState.enemies) return threatMap;

        for (const enemy of gameState.enemies) {
            if (!enemy || enemy.hp <= 0 || enemy.inactive) continue;
            // TODO: Implement attack range logic and increment threatMap accordingly
            // Example: for each tile in range, threatMap[y][x]++
       }

        return threatMap;
    }

    /**
     * Gets the Tile at the specified coordinates.
     * @param {number} x
     * @param {number} y
     * @returns {Tile|null}
     */
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.grid[y][x];
    }
}

// No export statement for global-scope compatibility.