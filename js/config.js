console.log("config.js loaded");

// Game Configuration Constants

// Grid & Display
const GRID_WIDTH = 50; // Example: Keep the larger size you liked
const GRID_HEIGHT = 50;
// const CELL_SIZE = 30; // No longer used for fixed sizing
const MIN_CELL_SIZE = 8; // NEW: Minimum pixel size for a cell
const CANVAS_PADDING = 20; // NEW: Pixels padding around canvas in window

// Entities
const NUM_ENEMIES = 10; // Adjust if needed for larger map
const PLAYER_ATTACK_DAMAGE = 2;
const AI_ATTACK_DAMAGE = 1;

// Shrinking Map Config
const SHRINK_INTERVAL = 10;
const SHRINK_AMOUNT = 1;
const STORM_DAMAGE = 1;

// --- NEW: Healing Config ---
const HEAL_COST = 5;    // Medkits needed to heal
const HEAL_AMOUNT = 3;  // HP restored per heal action