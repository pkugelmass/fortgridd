/**
 * Visual and style constants for FortGridd.
 * Includes colors, drawing sizes, shapes, font settings, and UI appearance.
 * @module config/styles
 */

/** Tile type definitions */
const TILE_LAND = 0;
const TILE_WALL = 1;
const TILE_TREE = 2;
const TILE_MEDKIT = 3;
const TILE_AMMO = 4;
const TILE_BOUNDARY = 5;

/**
 * Tile colors for each tile type.
 * @type {Object<number, string>}
 */
const TILE_COLORS = {
    [TILE_LAND]: '#8FBC8F',
    [TILE_WALL]: '#999999',
    [TILE_BOUNDARY]: '#999999',
    [TILE_TREE]: '#83a883',
    [TILE_MEDKIT]: '#8FBC8F',
    [TILE_AMMO]: '#8FBC8F',
};

/** Fallback color for unknown tiles */
const DEFAULT_TILE_COLOR = '#FFFFFF';

/** General drawing defaults */
const DEFAULT_FONT_FAMILY = 'Arial';
const DEFAULT_TEXT_ALIGN = 'center';
const DEFAULT_TEXT_BASELINE = 'middle';
const GRID_LINE_COLOR = '#ccc';
const GRID_LINE_WIDTH = 1;

/** Map cell visuals */
const MAP_CELL_FONT_SIZE_RATIO = 0.7;

/** Storm visuals */
const STORM_FILL_COLOR = 'rgba(98, 13, 114, 0.35)';
const STORM_STROKE_COLOR = 'rgba(100, 0, 0, 0.35)';
const STORM_LINE_WIDTH = 1;
const STORM_LINE_SPACING = 4;

/** Player visuals */
const PLAYER_COLOR = '#007bff';
const PLAYER_RADIUS_RATIO = 0.8;
const PLAYER_OUTLINE_COLOR = '#FFFFFF';
const PLAYER_OUTLINE_WIDTH = 2;

/** Enemy visuals */
const ENEMY_BASE_RADIUS_RATIO = 0.7;
const ENEMY_DEFAULT_COLOR = '#ff0000';

/** Health bar visuals */
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_BG_COLOR = '#333';
const HEALTH_BAR_LOW_COLOR = '#dc3545';
const HEALTH_BAR_MID_COLOR = '#ffc107';
const HEALTH_BAR_HIGH_COLOR = '#28a745';
const HEALTH_BAR_LOW_THRESHOLD = 0.3;
const HEALTH_BAR_MID_THRESHOLD = 0.6;
const PLAYER_HEALTH_BAR_WIDTH_RATIO = 0.8;
const PLAYER_HEALTH_BAR_OFFSET = 4;
const ENEMY_HEALTH_BAR_WIDTH_RATIO = 0.8;
const ENEMY_HEALTH_BAR_OFFSET = 4;

/** Enemy ID label visuals */
const ENEMY_ID_FONT_SIZE_RATIO_OF_RADIUS = 1.5;
const ENEMY_ID_FONT_COLOR = '#FFFFFF';
const ENEMY_ID_FONT_WEIGHT = 'normal';
const ENEMY_ID_TEXT_OUTLINE_COLOR = '#000000';
const ENEMY_ID_TEXT_OUTLINE_WIDTH = 1;

/** Unit drop shadow visuals */
const UNIT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.4)';
const UNIT_SHADOW_BLUR = 2;
const UNIT_SHADOW_OFFSET_X = 0;
const UNIT_SHADOW_OFFSET_Y = 0;

/** UI overlay visuals (Game Over/Win) */
const UI_OVERLAY_BG_COLOR = 'rgba(0, 0, 0, 0.7)';
const UI_OVERLAY_HEIGHT = 60;
const UI_OVERLAY_FONT_SIZE = 30;
const UI_GAME_OVER_COLOR = 'red';
const UI_WIN_COLOR = 'lime';

/** Logging CSS classes for log messages */
const LOG_CLASS_ENEMY_EVENT = 'log-enemy-event';
const LOG_CLASS_PLAYER_BAD = 'log-player-event log-negative';
const LOG_CLASS_PLAYER_GOOD = 'log-player-event log-positive';
const LOG_CLASS_PLAYER_NEUTRAL = 'log-player-event';
const LOG_CLASS_SYSTEM = 'log-system';