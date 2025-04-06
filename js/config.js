console.log("config.js loaded");

// Game Configuration Constants

// Grid & Display
const GRID_WIDTH = 25;
const GRID_HEIGHT = 25;
const CELL_SIZE = 30;

// Entities
const NUM_ENEMIES = 3;
const PLAYER_ATTACK_DAMAGE = 2;
const AI_ATTACK_DAMAGE = 1;

// --- NEW: Shrinking Map Config ---
const SHRINK_INTERVAL = 10; // How many game turns between shrinks
const SHRINK_AMOUNT = 1;    // How many cells to shrink from each side per interval
const STORM_DAMAGE = 1;     // Damage per turn taken outside safe zone