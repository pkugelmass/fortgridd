console.log("config.js loaded");

// Game Configuration Constants

// Grid & Display
const GRID_WIDTH = 50; // Or your preferred size
const GRID_HEIGHT = 45;
const MIN_CELL_SIZE = 7;
const CANVAS_PADDING = 20;

// Entities
const NUM_ENEMIES = 15; // Or your preferred number
const PLAYER_ATTACK_DAMAGE = 2; // Melee
const AI_ATTACK_DAMAGE = 1;     // Melee

// --- NEW: Ranged Combat Config ---
const RANGED_ATTACK_RANGE = 5;    // How many cells the shot travels max
const RANGED_ATTACK_DAMAGE = 2;   // Damage for a ranged hit (can differ from melee)

// Shrinking Map Config
const SHRINK_INTERVAL = 10;
const SHRINK_AMOUNT = 1;
const STORM_DAMAGE = 1;

// Healing Config
const HEAL_COST = 5;    // Medkits needed
const HEAL_AMOUNT = 3;  // HP restored