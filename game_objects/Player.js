/**
 * @class Player
 * Represents a player-controlled unit in the game.
 * Extends the Unit base class.
 * Handles player actions: move/attack, heal, shoot.
 */
class Player extends Unit {
   /**
    * Create a Player.
    * @param {number} x - The x position of the player.
    * @param {number} y - The y position of the player.
    * @param {Object} [config={}] - The config object for player defaults.
    * @param {string} [name] - The player's name (overrides config).
    */
   constructor(x, y, config = {}, name) {
       // Use config for defaults, fall back to arguments if provided
       const playerConfig = config.player || config; // allow either config.player or flat config
       const resolvedHealth = (typeof playerConfig.health === "number" ? playerConfig.health : 15);
       const resolvedName = (typeof name === "string" ? name : (playerConfig.name || "Player"));
       super(x, y, (typeof config.health === "number" ? config.health : resolvedHealth));
       /** @type {string} */
       this.name = resolvedName;
       /** @type {number} */
       this.score = 0;
       /** @type {boolean} */
       this.isHuman = true;

       // Optionally set player-specific resources from config
       if (playerConfig.ammo !== undefined) {
           this.resources.ammo = playerConfig.ammo;
       }
       if (playerConfig.medkits !== undefined) {
           this.resources.medkits = playerConfig.medkits;
       }
       // Optionally set color or other properties if present in config
       if (playerConfig.color) {
           this.color = playerConfig.color;
       }
       // Additional player-specific properties can be added here
   }

    /**
     * Handles player movement or melee attack intent.
     * Checks boundaries, terrain, and enemies. Executes move or attack.
     * @param {number} targetX - The intended destination x.
     * @param {number} targetY - The intended destination y.
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} True if the action consumed the player's turn, false otherwise.
     */
    moveOrAttack(targetX, targetY, gameState) {
        // Delegate to Unit, but use player-specific damage
        const damage = (typeof PLAYER_ATTACK_DAMAGE !== "undefined" ? PLAYER_ATTACK_DAMAGE : 1);
        return super.moveOrAttack(targetX, targetY, gameState, { damage });
    }

    /**
     * Handles player healing action.
     * Checks for medkits and current health. Applies healing if possible.
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} True if the action consumed the player's turn, false otherwise.
     */
    heal(gameState) {
        const HEAL_COST = (typeof window.HEAL_COST !== "undefined" ? window.HEAL_COST : 1);
        const HEAL_AMOUNT = (typeof window.HEAL_AMOUNT !== "undefined" ? window.HEAL_AMOUNT : 1);
        const maxHp = (typeof this.maxHp !== "undefined" ? this.maxHp : 15);
        if (this.resources.medkits >= HEAL_COST) {
            if (this.health < maxHp) {
                const healAmountActual = Math.min(HEAL_AMOUNT, maxHp - this.health);
                this.resources.medkits -= HEAL_COST;
                this.health += healAmountActual;
                if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                    Game.logMessage(`Player uses Medkit, heals ${healAmountActual} HP.`, gameState, { level: 'PLAYER', target: 'PLAYER' });
                }
                return true;
            } else {
                if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                    Game.logMessage("Cannot heal: Full health.", gameState, { level: 'PLAYER', target: 'PLAYER' });
                }
                return false;
            }
        } else {
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`Cannot heal: Need ${HEAL_COST} medkits (Have: ${this.resources.medkits || 0}).`, gameState, { level: 'PLAYER', target: 'PLAYER' });
            }
            return false;
        }
    }

    /**
     * Handles player shooting action.
     * Checks ammo, performs line trace, checks for hits/blocks, applies damage/knockback.
     * @param {{dx: number, dy: number}} direction - Object with delta x/y for direction.
     * @param {string} dirString - Human-readable direction string for logging ("Up", "Down", etc.).
     * @param {GameState} gameState - The current game state object.
     * @returns {boolean} True if the action consumed the player's turn, false otherwise.
     */
    shoot(direction, dirString, gameState) {
        // Delegate to Unit, but use player-specific range/damage and log string
        const range = (typeof window.RANGED_ATTACK_RANGE !== "undefined" ? window.RANGED_ATTACK_RANGE : 5);
        const damage = (typeof window.RANGED_ATTACK_DAMAGE !== "undefined" ? window.RANGED_ATTACK_DAMAGE : 1);
        // Optionally pass dirString for logging if needed
        return super.shoot(direction, gameState, { range, damage, dirString });
    }

    /**
     * Handles player-specific input or actions.
     * Stub for input handling logic.
     * @param {Object} input
     */
    handleInput(input) {
        // TODO: Implement player input handling
    }

    /**
     * Updates the player's state.
     * Stub for player update logic.
     */
    update() {
        // TODO: Implement player update logic
    }
}

// No export statement for global-scope compatibility.