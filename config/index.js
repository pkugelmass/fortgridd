// Centralized game and style configuration for FortGridd.
// Merges all relevant constants from config/game.js and config/styles.js
// for easy import and initialization elsewhere.

const GAME_CONFIG = {
  grid: {
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    minCellSize: MIN_CELL_SIZE,
    canvasPadding: CANVAS_PADDING,
  },
  map: {
    initialWallChance: INITIAL_WALL_CHANCE,
    caIterations: CA_ITERATIONS,
    caWallThreshold: CA_WALL_THRESHOLD,
    featureSpawn: {
      tree: FEATURE_SPAWN_CHANCE_TREE,
      medkit: FEATURE_SPAWN_CHANCE_MEDKIT,
      ammo: FEATURE_SPAWN_CHANCE_AMMO,
    },
  },
  player: {
    maxHp: PLAYER_MAX_HP,
    startAmmo: PLAYER_START_AMMO,
    startMedkits: PLAYER_START_MEDKITS,
    ammoPickupAmount: PLAYER_AMMO_PICKUP_AMOUNT,
    attackDamage: PLAYER_ATTACK_DAMAGE,
  },
  enemy: {
    num: NUM_ENEMIES,
    attackDamage: AI_ATTACK_DAMAGE,
    hpMin: AI_HP_MIN,
    hpMax: AI_HP_MAX,
    rangeMin: AI_RANGE_MIN,
    rangeMax: AI_RANGE_MAX,
    ammoMin: AI_AMMO_MIN,
    ammoMax: AI_AMMO_MAX,
    pursueHpThreshold: AI_PURSUE_HP_THRESHOLD,
    startMedkits: AI_START_MEDKITS,
    ammoPickupAmount: AI_AMMO_PICKUP_AMOUNT,
  },
  ai: {
    states: {
      exploring: AI_STATE_EXPLORING,
      seekingResources: AI_STATE_SEEKING_RESOURCES,
      engagingEnemy: AI_STATE_ENGAGING_ENEMY,
      fleeing: AI_STATE_FLEEING,
      healing: AI_STATE_HEALING,
    },
    thresholds: {
      healPriority: AI_HEAL_PRIORITY_THRESHOLD,
      fleeHealth: AI_FLEE_HEALTH_THRESHOLD,
      seekAmmo: AI_SEEK_AMMO_THRESHOLD,
    },
    exploring: {
      proactiveScanRange: AI_PROACTIVE_SCAN_RANGE,
      moveAggressionChance: AI_EXPLORE_MOVE_AGGRESSION_CHANCE,
      moveRandomChance: AI_EXPLORE_MOVE_RANDOM_CHANCE,
      waitChance: AI_EXPLORE_WAIT_CHANCE,
    },
    engaging: {
      riskAversionChance: AI_ENGAGE_RISK_AVERSION_CHANCE,
    },
  },
  combat: {
    rangedAttackRange: RANGED_ATTACK_RANGE,
    rangedAttackDamage: RANGED_ATTACK_DAMAGE,
  },
  shrinkingMap: {
    shrinkInterval: SHRINK_INTERVAL,
    shrinkAmount: SHRINK_AMOUNT,
    stormDamage: STORM_DAMAGE,
  },
  healing: {
    healCost: HEAL_COST,
    healAmount: HEAL_AMOUNT,
  },
  ui: {
    maxLogMessages: MAX_LOG_MESSAGES,
    aiTurnDelay: AI_TURN_DELAY,
    consoleLogLevel: CONSOLE_LOG_LEVEL,
  },
  styles: {
    // Tile types and colors
    tileTypes: {
      land: TILE_LAND,
      wall: TILE_WALL,
      tree: TILE_TREE,
      medkit: TILE_MEDKIT,
      ammo: TILE_AMMO,
      boundary: TILE_BOUNDARY,
    },
    tileColors: TILE_COLORS,
    defaultTileColor: DEFAULT_TILE_COLOR,
    // Drawing defaults
    fontFamily: DEFAULT_FONT_FAMILY,
    textAlign: DEFAULT_TEXT_ALIGN,
    textBaseline: DEFAULT_TEXT_BASELINE,
    gridLineColor: GRID_LINE_COLOR,
    gridLineWidth: GRID_LINE_WIDTH,
    // Map cell visuals
    mapCellFontSizeRatio: MAP_CELL_FONT_SIZE_RATIO,
    // Storm visuals
    stormFillColor: STORM_FILL_COLOR,
    stormStrokeColor: STORM_STROKE_COLOR,
    stormLineWidth: STORM_LINE_WIDTH,
    stormLineSpacing: STORM_LINE_SPACING,
    // Player visuals
    playerColor: PLAYER_COLOR,
    playerRadiusRatio: PLAYER_RADIUS_RATIO,
    playerOutlineColor: PLAYER_OUTLINE_COLOR,
    playerOutlineWidth: PLAYER_OUTLINE_WIDTH,
    // Enemy visuals
    enemyBaseRadiusRatio: ENEMY_BASE_RADIUS_RATIO,
    enemyDefaultColor: ENEMY_DEFAULT_COLOR,
    // Health bar visuals
    healthBarHeight: HEALTH_BAR_HEIGHT,
    healthBarBgColor: HEALTH_BAR_BG_COLOR,
    healthBarLowColor: HEALTH_BAR_LOW_COLOR,
    healthBarMidColor: HEALTH_BAR_MID_COLOR,
    healthBarHighColor: HEALTH_BAR_HIGH_COLOR,
    healthBarLowThreshold: HEALTH_BAR_LOW_THRESHOLD,
    healthBarMidThreshold: HEALTH_BAR_MID_THRESHOLD,
    playerHealthBarWidthRatio: PLAYER_HEALTH_BAR_WIDTH_RATIO,
    playerHealthBarOffset: PLAYER_HEALTH_BAR_OFFSET,
    enemyHealthBarWidthRatio: ENEMY_HEALTH_BAR_WIDTH_RATIO,
    enemyHealthBarOffset: ENEMY_HEALTH_BAR_OFFSET,
    // Enemy ID label visuals
    enemyIdFontSizeRatioOfRadius: ENEMY_ID_FONT_SIZE_RATIO_OF_RADIUS,
    enemyIdFontColor: ENEMY_ID_FONT_COLOR,
    enemyIdFontWeight: ENEMY_ID_FONT_WEIGHT,
    enemyIdTextOutlineColor: ENEMY_ID_TEXT_OUTLINE_COLOR,
    enemyIdTextOutlineWidth: ENEMY_ID_TEXT_OUTLINE_WIDTH,
    // Unit drop shadow
    unitShadowColor: UNIT_SHADOW_COLOR,
    unitShadowBlur: UNIT_SHADOW_BLUR,
    unitShadowOffsetX: UNIT_SHADOW_OFFSET_X,
    unitShadowOffsetY: UNIT_SHADOW_OFFSET_Y,
    // UI overlay
    uiOverlayBgColor: UI_OVERLAY_BG_COLOR,
    uiOverlayHeight: UI_OVERLAY_HEIGHT,
    uiOverlayFontSize: UI_OVERLAY_FONT_SIZE,
    uiGameOverColor: UI_GAME_OVER_COLOR,
    uiWinColor: UI_WIN_COLOR,
    // Logging CSS classes
    logClassEnemyEvent: LOG_CLASS_ENEMY_EVENT,
    logClassPlayerBad: LOG_CLASS_PLAYER_BAD,
    logClassPlayerGood: LOG_CLASS_PLAYER_GOOD,
    logClassPlayerNeutral: LOG_CLASS_PLAYER_NEUTRAL,
    logClassSystem: LOG_CLASS_SYSTEM,
  },
};