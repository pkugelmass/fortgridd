/**
 * @class Tile
 * Represents a single tile on the game map.
 */
class Tile {
    /**
     * Create a Tile.
     * @param {string} type - The type of the tile (e.g., 'grass', 'water', 'mountain').
     * @param {boolean} passable - Whether the tile can be traversed.
     */
    constructor(type, passable) {
        /** @type {string} */
        this.type = type;
        /** @type {boolean} */
        this.passable = passable;
        /** @type {Unit|null} */
        this.occupiedBy = null;
        /** @type {boolean} */
        this.inStorm = false;
        /** @type {Object|null} */
        this.pickup = null; // Placeholder for pickup object
    }

    /**
     * Checks if the tile is currently occupied.
     * @returns {boolean}
     */
    isOccupied() {
        return this.occupiedBy !== null;
    }

    /**
     * Sets the unit occupying this tile.
     * @param {Unit|null} unit
     */
    setOccupiedBy(unit) {
        this.occupiedBy = unit;
    }

    /**
     * Sets whether the tile is in the storm.
     * @param {boolean} inStorm
     */
    setInStorm(inStorm) {
        this.inStorm = inStorm;
    }

    /**
     * Sets a pickup on this tile.
     * @param {Object|null} pickup
     */
    setPickup(pickup) {
        this.pickup = pickup;
    }
}
