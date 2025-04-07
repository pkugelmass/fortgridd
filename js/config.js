console.log("config.js loaded");

// --- Game Configuration Constants ---

// Grid & Display
const GRID_WIDTH = 50;              // Example Size
const GRID_HEIGHT = 44;             // Example Size
const MIN_CELL_SIZE = 8;
const CANVAS_PADDING = 20;

// Map Generation (Moved from map.js)
const INITIAL_WALL_CHANCE = 0.465;  // Example Tuned Value
const CA_ITERATIONS = 3;            // Example Tuned Value
const CA_WALL_THRESHOLD = 5;        // Example Tuned Value

// Feature Spawn Rates (Used in map.js)
const FEATURE_SPAWN_CHANCE_TREE = 0.07;   // Example: 7% chance on land
const FEATURE_SPAWN_CHANCE_MEDKIT = 0.04; // Example: 4% chance on land (after tree check)
const FEATURE_SPAWN_CHANCE_AMMO = 0.04;   // Example: 4% chance on land (after medkit check)

// Player Stats & Starting Conditions
const PLAYER_MAX_HP = 10;
const PLAYER_START_AMMO = 3;
const PLAYER_START_MEDKITS = 0;

// AI Stats & Variations
const NUM_ENEMIES = 15;              // Example Count
const AI_ATTACK_DAMAGE = 1;
const AI_HP_MIN = 4;                // Min starting HP for AI variation
const AI_HP_MAX = 6;                // Max starting HP for AI variation
const AI_RANGE_MIN = 6;             // Min detection range for AI variation
const AI_RANGE_MAX = 10;            // Max detection range for AI variation
const AI_AMMO_MIN = 1;              // Min starting ammo for AI variation
const AI_AMMO_MAX = 2;              // Max starting ammo for AI variation

// Combat
const PLAYER_ATTACK_DAMAGE = 2;     // Melee damage dealt by player
const RANGED_ATTACK_RANGE = 5;      // Max range for player/AI ranged attacks
const RANGED_ATTACK_DAMAGE = 2;     // Damage dealt by player ranged attacks (AI uses AI_ATTACK_DAMAGE for now)

// Shrinking Map Config
const SHRINK_INTERVAL = 10;
const SHRINK_AMOUNT = 1;
const STORM_DAMAGE = 1;

// Healing Config
const HEAL_COST = 5;
const HEAL_AMOUNT = 3;

// UI / Game Logic
const MAX_LOG_MESSAGES = 15;        // Moved from game.js