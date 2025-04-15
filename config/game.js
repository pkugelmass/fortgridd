/**
 * Core game configuration constants for FortGridd.
 * Includes player, AI, map, and game loop variables.
 * @module config/game
 */

/** Grid and display (core layout) */
const GRID_WIDTH = 50;              /**< Number of columns in the grid */
const GRID_HEIGHT = 44;             /**< Number of rows in the grid */
const MIN_CELL_SIZE = 8;            /**< Minimum cell size for rendering */
const CANVAS_PADDING = 20;          /**< Padding around the canvas */

/** Map generation */
const INITIAL_WALL_CHANCE = 0.465;  /**< Initial chance for a wall cell */
const CA_ITERATIONS = 3;            /**< Cellular automata iterations */
const CA_WALL_THRESHOLD = 5;        /**< Wall threshold for CA */

/** Feature spawn rates */
const FEATURE_SPAWN_CHANCE_TREE = 0.07;   /**< Chance to spawn a tree on land */
const FEATURE_SPAWN_CHANCE_MEDKIT = 0.04; /**< Chance to spawn a medkit on land */
const FEATURE_SPAWN_CHANCE_AMMO = 0.04;   /**< Chance to spawn ammo on land */

/** Player stats & starting conditions */
const PLAYER_MAX_HP = 15;                 /**< Maximum player HP */
const PLAYER_START_AMMO = 10;              /**< Starting ammo for player */
const PLAYER_START_MEDKITS = 0;            /**< Starting medkits for player */
const PLAYER_AMMO_PICKUP_AMOUNT = 1;       /**< Ammo gained from pickup */

/** AI stats & variations */
const NUM_ENEMIES = 30;                    /**< Number of AI enemies */
const AI_ATTACK_DAMAGE = 2;                /**< AI melee/ranged attack damage */
const AI_HP_MIN = 12;                      /**< Min starting HP for AI */
const AI_HP_MAX = 15;                      /**< Max starting HP for AI */
const AI_RANGE_MIN = 5;                    /**< Min detection range for AI */
const AI_RANGE_MAX = 8;                    /**< Max detection range for AI */
const AI_AMMO_MIN = 1;                     /**< Min starting ammo for AI */
const AI_AMMO_MAX = 5;                     /**< Max starting ammo for AI */
const AI_PURSUE_HP_THRESHOLD = 0.3;        /**< HP % above which AI will pursue targets */

/** AI FSM states */
const AI_STATE_EXPLORING = 'EXPLORING';
const AI_STATE_SEEKING_RESOURCES = 'SEEKING_RESOURCES';
const AI_STATE_ENGAGING_ENEMY = 'ENGAGING_ENEMY';
const AI_STATE_FLEEING = 'FLEEING';
const AI_STATE_HEALING = 'HEALING';

/** AI FSM decision thresholds */
const AI_HEAL_PRIORITY_THRESHOLD = 0.5;    /**< Heal if health < 50% */
const AI_FLEE_HEALTH_THRESHOLD = 0.35;     /**< Flee if health < 35% */
const AI_SEEK_AMMO_THRESHOLD = 4;          /**< Seek ammo if below this */

/** AI resource interaction */
const AI_AMMO_PICKUP_AMOUNT = 1;           /**< Ammo gained from pickup (AI) */
const AI_START_MEDKITS = 0;                /**< Starting medkits for AI */

/** AI exploring state behavior */
const AI_PROACTIVE_SCAN_RANGE = 3;         /**< Range for scanning non-critical resources */
const AI_EXPLORE_MOVE_AGGRESSION_CHANCE = 0.6; /**< Chance to move toward safe zone */
const AI_EXPLORE_MOVE_RANDOM_CHANCE = 0.3;     /**< Chance to move randomly */
const AI_EXPLORE_WAIT_CHANCE = 0.1;            /**< Chance to wait strategically */

/** AI engaging state behavior */
const AI_ENGAGE_RISK_AVERSION_CHANCE = 0.2;    /**< Chance to hesitate if moving into LOS/range */

/** Combat */
const PLAYER_ATTACK_DAMAGE = 2;            /**< Melee damage dealt by player */
const RANGED_ATTACK_RANGE = 5;             /**< Max range for ranged attacks */
const RANGED_ATTACK_DAMAGE = 2;            /**< Damage dealt by player ranged attacks */

/** Shrinking map config */
const SHRINK_INTERVAL = 15;                /**< Turns between map shrinks */
const SHRINK_AMOUNT = 1;                   /**< Cells removed per side during shrink */
const STORM_DAMAGE = 1;                    /**< HP damage per turn in the storm */

/** Healing config */
const HEAL_COST = 1;                       /**< Medkits required to heal */
const HEAL_AMOUNT = 1;                     /**< HP restored per heal action */

/** UI / game logic settings */
const MAX_LOG_MESSAGES = 50;               /**< Max messages in the game log */
const AI_TURN_DELAY = 15;                  /**< Milliseconds delay between each AI turn */
const CONSOLE_LOG_LEVEL = 'DEBUG';         /**< Console logging verbosity */