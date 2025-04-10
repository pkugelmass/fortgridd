// console.log("config.js loaded"); // Removed module loaded log

// --- Game Configuration Constants ---

// --- Gameplay & Logic ---

// Grid & Display (Core Layout)
const GRID_WIDTH = 50;              // Example Size
const GRID_HEIGHT = 44;             // Example Size
const MIN_CELL_SIZE = 8;            // Minimum cell size for rendering calculations
const CANVAS_PADDING = 20;          // Padding around the canvas

// Map Generation
const INITIAL_WALL_CHANCE = 0.465;  // Example Tuned Value
const CA_ITERATIONS = 3;            // Example Tuned Value
const CA_WALL_THRESHOLD = 5;        // Example Tuned Value

// Feature Spawn Rates
const FEATURE_SPAWN_CHANCE_TREE = 0.07;   // Example: 7% chance on land
const FEATURE_SPAWN_CHANCE_MEDKIT = 0.04; // Example: 4% chance on land (after tree check)
const FEATURE_SPAWN_CHANCE_AMMO = 0.04;   // Example: 4% chance on land (after medkit check)

// Player Stats & Starting Conditions
const PLAYER_MAX_HP = 15;
const PLAYER_START_AMMO = 0;
const PLAYER_START_MEDKITS = 0;
const PLAYER_AMMO_PICKUP_AMOUNT = 1; // Example: Amount of ammo Player gains from pickup

// AI Stats & Variations
const NUM_ENEMIES = 30;              // Example Count
const AI_ATTACK_DAMAGE = 2;
const AI_HP_MIN = 12;                // Min starting HP for AI variation
const AI_HP_MAX = 15;                // Max starting HP for AI variation
const AI_RANGE_MIN = 5;             // Min detection range for AI variation
const AI_RANGE_MAX = 8;            // Max detection range for AI variation
const AI_AMMO_MIN = 0;              // Min starting ammo for AI variation
const AI_AMMO_MAX = 0;              // Max starting ammo for AI variation
const AI_PURSUE_HP_THRESHOLD = 0.3; // HP percentage above which AI will pursue targets

// AI FSM States
const AI_STATE_EXPLORING = 'EXPLORING';
const AI_STATE_SEEKING_RESOURCES = 'SEEKING_RESOURCES';
const AI_STATE_ENGAGING_ENEMY = 'ENGAGING_ENEMY';
const AI_STATE_FLEEING = 'FLEEING';
const AI_STATE_HEALING = 'HEALING'; // Added 2025-04-09

// AI FSM Decision Thresholds
const AI_HEAL_PRIORITY_THRESHOLD = 0.5; // Example: Prioritize healing (use/seek medkit) if health < 50%
const AI_FLEE_HEALTH_THRESHOLD = 0.35; // Example: Flee if health < 25%
const AI_SEEK_AMMO_THRESHOLD = 4;      // Example: Seek ammo if count is less than this

// AI Resource Interaction
const AI_AMMO_PICKUP_AMOUNT = 1; // Example: Amount of ammo AI gains from pickup
const AI_START_MEDKITS = 0;      // Example: Starting medkits for AI (Changed from 0 on 2025-04-09)

// AI Exploring State Behavior
const AI_PROACTIVE_SCAN_RANGE = 3; // Example: Range for scanning non-critical resources
const AI_EXPLORE_MOVE_AGGRESSION_CHANCE = 0.6; // Chance to move towards safe zone center
const AI_EXPLORE_MOVE_RANDOM_CHANCE = 0.3;     // Chance to move randomly
const AI_EXPLORE_WAIT_CHANCE = 0.1;            // Chance to wait strategically (Must sum to 1 with others)

// AI Engaging State Behavior
const AI_ENGAGE_RISK_AVERSION_CHANCE = 0.2; // Example: 30% chance to hesitate if moving into target's LOS/range

// Combat
const PLAYER_ATTACK_DAMAGE = 2;     // Melee damage dealt by player
const RANGED_ATTACK_RANGE = 5;      // Max range for player/AI ranged attacks
const RANGED_ATTACK_DAMAGE = 2;     // Damage dealt by player ranged attacks (AI uses AI_ATTACK_DAMAGE for now)

// Shrinking Map Config
const SHRINK_INTERVAL = 15;         // Turns between map shrinks
const SHRINK_AMOUNT = 1;            // Cells removed per side during shrink
const STORM_DAMAGE = 1;             // HP damage per turn in the storm

// Healing Config
const HEAL_COST = 1;                // Medkits required to heal
const HEAL_AMOUNT = 1;              // HP restored per heal action

// UI / Game Logic Settings
const MAX_LOG_MESSAGES = 50;        // Max messages displayed in the game log
const AI_TURN_DELAY = 100;          // Milliseconds delay before AI turn starts
const CONSOLE_LOG_LEVEL = 'DEBUG';   // Console logging verbosity ('DEBUG', 'INFO', 'WARN', 'ERROR'). Only logs at this level or higher are shown.

// --- Visuals & Appearance ---

// Tile Definitions & Visuals
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;
const TILE_MEDKIT = 3;
const TILE_AMMO = 4;
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F',   // Default land color
    [TILE_WALL]: '#999999',   // Wall color
    [TILE_TREE]: '#556B2F',   // Tree color
    [TILE_MEDKIT]: '#FF6347', // Medkit color
    [TILE_AMMO]: '#4682B4',   // Ammo color
};
const DEFAULT_TILE_COLOR = '#FFFFFF'; // Fallback color for unknown tiles

// General Drawing Defaults
const DEFAULT_FONT_FAMILY = 'Arial';
const DEFAULT_TEXT_ALIGN = 'center';
const DEFAULT_TEXT_BASELINE = 'middle';
const GRID_LINE_COLOR = '#ccc';
const GRID_LINE_WIDTH = 1;

// Map Cell Visuals
const MAP_CELL_FONT_SIZE_RATIO = 0.7; // Ratio of cell size for potential future text

// Storm Visuals
const STORM_FILL_COLOR = 'rgba(98, 13, 114, 0.35)'; // Fill color for storm area
const STORM_STROKE_COLOR = 'rgba(100, 0, 0, 0.35)'; // Line color for storm pattern
const STORM_LINE_WIDTH = 1;                         // Line width for storm pattern
const STORM_LINE_SPACING = 4;                       // Spacing for storm pattern lines

// Player Visuals
const PLAYER_COLOR = '#007bff';     // Player visual color
const PLAYER_RADIUS_RATIO = 0.8;    // Player radius as ratio of cell size / 2
const PLAYER_OUTLINE_COLOR = '#FFFFFF'; // Player outline color
const PLAYER_OUTLINE_WIDTH = 2;         // Player outline width

// Enemy Visuals
const ENEMY_BASE_RADIUS_RATIO = 0.7; // Base enemy radius as ratio of cell size / 2
const ENEMY_DEFAULT_COLOR = '#ff0000'; // Default enemy color

// Health Bar Visuals
const HEALTH_BAR_HEIGHT = 5;            // Height of health bars in pixels
const HEALTH_BAR_BG_COLOR = '#333';     // Background color of health bars
const HEALTH_BAR_LOW_COLOR = '#dc3545'; // Color for low health
const HEALTH_BAR_MID_COLOR = '#ffc107'; // Color for medium health
const HEALTH_BAR_HIGH_COLOR = '#28a745';// Color for high health
const HEALTH_BAR_LOW_THRESHOLD = 0.3;   // Percentage below which color is LOW
const HEALTH_BAR_MID_THRESHOLD = 0.6;   // Percentage below which color is MID (and above LOW)
const PLAYER_HEALTH_BAR_WIDTH_RATIO = 0.8; // Width ratio relative to cell size
const PLAYER_HEALTH_BAR_OFFSET = 4;      // Pixels below the player (Increased for shadow clearance)
const ENEMY_HEALTH_BAR_WIDTH_RATIO = 0.8;  // Width ratio relative to cell size
const ENEMY_HEALTH_BAR_OFFSET = 4;       // Pixels below the enemy (Increased for shadow clearance)

// Enemy ID Label Visuals
const ENEMY_ID_FONT_SIZE_RATIO_OF_RADIUS = 1.5; // Font size as ratio of enemy radius
const ENEMY_ID_FONT_COLOR = '#FFFFFF';          // Color of the ID text
const ENEMY_ID_FONT_WEIGHT = 'normal';            // Font weight (e.g., 'bold', 'normal')
const ENEMY_ID_TEXT_OUTLINE_COLOR = '#000000';   // Outline color for the ID text
const ENEMY_ID_TEXT_OUTLINE_WIDTH = 1;          // Outline width for the ID text

// Unit Drop Shadow Visuals
const UNIT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.4)'; // Shadow color
const UNIT_SHADOW_BLUR = 2;                     // Shadow blur radius
const UNIT_SHADOW_OFFSET_X = 0;                 // Shadow horizontal offset
const UNIT_SHADOW_OFFSET_Y = 0;                 // Shadow vertical offset

// UI Overlay Visuals (Game Over/Win)
const UI_OVERLAY_BG_COLOR = 'rgba(0, 0, 0, 0.7)'; // Background color for overlays
const UI_OVERLAY_HEIGHT = 60;                   // Height of overlays in pixels
const UI_OVERLAY_FONT_SIZE = 30;                // Font size for overlay text
const UI_GAME_OVER_COLOR = 'red';               // Text color for Game Over
const UI_WIN_COLOR = 'lime';                    // Text color for Win

// Logging CSS Classes (Appearance of log messages)
const LOG_CLASS_ENEMY_EVENT = 'log-enemy-event';
const LOG_CLASS_PLAYER_BAD = 'log-player-event log-negative';
const LOG_CLASS_PLAYER_GOOD = 'log-player-event log-positive';
const LOG_CLASS_PLAYER_NEUTRAL = 'log-player-event'; // Neutral player action (e.g., move, wait)
const LOG_CLASS_SYSTEM = 'log-system';
