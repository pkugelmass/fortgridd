console.log("config.js loaded");

// --- Game Configuration Constants ---

// Grid & Display
const GRID_WIDTH = 50;              // Example Size
const GRID_HEIGHT = 44;             // Example Size
const MIN_CELL_SIZE = 8;
const CANVAS_PADDING = 20;

// Tile Definitions & Visuals (Moved from map.js)
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;
const TILE_MEDKIT = 3;
const TILE_AMMO = 4;
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F',   [TILE_WALL]: '#A9A9A9',
    [TILE_TREE]: '#556B2F',   [TILE_MEDKIT]: '#FF6347',
    [TILE_AMMO]: '#4682B4',
};

// Map Generation (Moved from map.js)
const INITIAL_WALL_CHANCE = 0.465;  // Example Tuned Value
const CA_ITERATIONS = 3;            // Example Tuned Value
const CA_WALL_THRESHOLD = 5;        // Example Tuned Value

// Feature Spawn Rates (Used in map.js)
const FEATURE_SPAWN_CHANCE_TREE = 0.07;   // Example: 7% chance on land
const FEATURE_SPAWN_CHANCE_MEDKIT = 0.04; // Example: 4% chance on land (after tree check)
const FEATURE_SPAWN_CHANCE_AMMO = 0.04;   // Example: 4% chance on land (after medkit check)

// Player Stats & Starting Conditions
const PLAYER_MAX_HP = 15;
const PLAYER_START_AMMO = 3;
const PLAYER_START_MEDKITS = 0;
const PLAYER_COLOR = '#007bff';     // Player visual color (moved from player.js)

// AI Stats & Variations
const NUM_ENEMIES = 18;              // Example Count
const AI_ATTACK_DAMAGE = 2;
const AI_HP_MIN = 12;                // Min starting HP for AI variation
const AI_HP_MAX = 15;                // Max starting HP for AI variation
const AI_RANGE_MIN = 5;             // Min detection range for AI variation
const AI_RANGE_MAX = 8;            // Max detection range for AI variation
const AI_AMMO_MIN = 1;              // Min starting ammo for AI variation
const AI_AMMO_MAX = 2;              // Max starting ammo for AI variation
const AI_PURSUE_HP_THRESHOLD = 0.3; // HP percentage above which AI will pursue targets

// Combat
const PLAYER_ATTACK_DAMAGE = 2;     // Melee damage dealt by player
const RANGED_ATTACK_RANGE = 5;      // Max range for player/AI ranged attacks
const RANGED_ATTACK_DAMAGE = 2;     // Damage dealt by player ranged attacks (AI uses AI_ATTACK_DAMAGE for now)

// Shrinking Map Config
const SHRINK_INTERVAL = 15;
const SHRINK_AMOUNT = 1;
const STORM_DAMAGE = 1;

// Healing Config
const HEAL_COST = 1;             // Medkits required to heal
const HEAL_AMOUNT = 1;

// Logging CSS Classes
const LOG_CLASS_ENEMY_EVENT = 'log-enemy-event';
const LOG_CLASS_PLAYER_BAD = 'log-player-event log-negative';
const LOG_CLASS_PLAYER_GOOD = 'log-player-event log-positive';
const LOG_CLASS_PLAYER_NEUTRAL = 'log-player-event'; // Neutral player action (e.g., move, wait)
const LOG_CLASS_SYSTEM = 'log-system';

// UI / Game Logic
const MAX_LOG_MESSAGES = 50;        // Moved from game.js
const AI_TURN_DELAY = 100;          // Milliseconds delay before AI turn starts

// --- Drawing Defaults --- (Moved from drawing.js)
const DEFAULT_FONT_FAMILY = 'Arial';
const DEFAULT_TEXT_ALIGN = 'center';
const DEFAULT_TEXT_BASELINE = 'middle';
const GRID_LINE_COLOR = '#ccc';
const GRID_LINE_WIDTH = 1;
const DEFAULT_TILE_COLOR = '#FFFFFF'; // Fallback color for unknown tiles
const MAP_CELL_FONT_SIZE_RATIO = 0.7; // Ratio of cell size
const STORM_FILL_COLOR = 'rgba(98, 13, 114, 0.35)';
const STORM_STROKE_COLOR = 'rgba(100, 0, 0, 0.35)';
const STORM_LINE_WIDTH = 1;
const STORM_LINE_SPACING = 4;
const PLAYER_RADIUS_RATIO = 0.8;    // Ratio of cell size / 2
const PLAYER_OUTLINE_COLOR = '#FFFFFF';
const PLAYER_OUTLINE_WIDTH = 2;
const ENEMY_BASE_RADIUS_RATIO = 0.7; // Ratio of cell size / 2
const ENEMY_DEFAULT_COLOR = '#ff0000';

// --- Health Bar --- (Moved from drawing.js)
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_BG_COLOR = '#333';
const HEALTH_BAR_LOW_COLOR = '#dc3545';
const HEALTH_BAR_MID_COLOR = '#ffc107';
const HEALTH_BAR_HIGH_COLOR = '#28a745';
const HEALTH_BAR_LOW_THRESHOLD = 0.3; // Percentage below which color is LOW
const HEALTH_BAR_MID_THRESHOLD = 0.6; // Percentage below which color is MID (and above LOW)
const PLAYER_HEALTH_BAR_WIDTH_RATIO = 0.8; // Ratio of cell size
const PLAYER_HEALTH_BAR_OFFSET = 3;      // Pixels below the player
const ENEMY_HEALTH_BAR_WIDTH_RATIO = 0.8;  // Ratio of cell size
const ENEMY_HEALTH_BAR_OFFSET = 3;       // Pixels below the enemy

// --- UI Overlays --- (Moved from drawing.js)
const UI_OVERLAY_BG_COLOR = 'rgba(0, 0, 0, 0.7)';
const UI_OVERLAY_HEIGHT = 60;
const UI_OVERLAY_FONT_SIZE = 30; // Pixels
const UI_GAME_OVER_COLOR = 'red';
const UI_WIN_COLOR = 'lime';
