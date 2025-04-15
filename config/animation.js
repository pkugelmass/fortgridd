/**
 * Animation timing and easing configuration for FortGridd.
 * Contains all animation duration constants and allowed easing types.
 * @module config/animation
 */

/** Animation duration constants (in milliseconds) */
const MOVEMENT_ANIMATION_DURATION = 180;    /**< Duration of sliding movement animation */
const KNOCKBACK_ANIMATION_DURATION = 220;   /**< Duration of knockback animation */
const RANGED_ANIMATION_DURATION = 120;      /**< Duration of ranged projectile animation per tile */
const HEAL_ANIMATION_DURATION = 180;        /**< Duration of healing animation (e.g., medkit use) */
const DAMAGE_ANIMATION_DURATION = 120;      /**< Duration of damage flash */
const ELIMINATION_ANIMATION_DURATION = 200; /**< Duration of elimination/fade-out effect */
const BLOCKED_ANIMATION_DURATION = 100;     /**< Duration of blocked/shake effect */
const PICKUP_ANIMATION_DURATION = 150;      /**< Duration of pickup/collect effect */

/**
 * Default animation easing function.
 * Allowed values: "linear", "easeIn", "easeOut", "easeInOut"
 * @type {string}
 */
const ANIMATION_EASING = "easeInOut";

/**
 * Allowed animation easing function names.
 * @type {string[]}
 */
const ALLOWED_ANIMATION_EASINGS = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut"
];