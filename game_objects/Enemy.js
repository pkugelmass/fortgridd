/**
 * @class Enemy
 * Represents an enemy unit in the game.
 * Extends the Unit base class.
 * FSM logic is encapsulated in the evaluate() method.
 */
class Enemy extends window.Unit {
   /**
    * Create an Enemy.
    * @param {number} x - The x position of the enemy.
    * @param {number} y - The y position of the enemy.
    * @param {Object} [config={}] - The config object for enemy defaults.
    * @param {string} [type] - The type or AI archetype of the enemy (overrides config).
    */
   constructor(x, y, config = {}, type) {
       // Use config for defaults, fall back to arguments if provided
       const enemyConfig = config.enemy || config; // allow either config.enemy or flat config
       const resolvedHealth = (typeof enemyConfig.health === "number" ? enemyConfig.health : 10);
       const resolvedType = (typeof type === "string" ? type : (enemyConfig.type || "default"));
       super(x, y, (typeof config.health === "number" ? config.health : resolvedHealth));
       /** @type {string} */
       this.type = resolvedType;
       /** @type {string} */
       this.state = (enemyConfig.state || window.AI_STATE_EXPLORING);

       // Optionally set enemy-specific resources from config
       if (enemyConfig.ammo !== undefined) {
           this.resources.ammo = enemyConfig.ammo;
       }
       if (enemyConfig.medkits !== undefined) {
           this.resources.medkits = enemyConfig.medkits;
       }
       // Optionally set color or other properties if present in config
       if (enemyConfig.color) {
           this.color = enemyConfig.color;
       }
       // Additional enemy-specific properties can be added here
   }

    /**
     * Evaluates the enemy's behavior for the current turn.
     * FSM logic: calls the appropriate state handler based on this.state.
     * @param {GameState} gameState - The current game state.
     * @returns {Promise<boolean>} - True if an action was taken, false if re-evaluation is needed.
     */
    async evaluate(gameState) {
        try {
            switch (this.state) {
                case window.AI_STATE_ENGAGING_ENEMY:
                    if (typeof window.handleEngagingEnemyState === 'function') {
                        return await window.handleEngagingEnemyState(this, gameState);
                    }
                    break;
                case window.AI_STATE_FLEEING:
                    if (typeof window.handleFleeingState === 'function') {
                        return await window.handleFleeingState(this, gameState);
                    }
                    break;
                case window.AI_STATE_HEALING:
                    if (typeof window.handleHealingState === 'function') {
                        return await window.handleHealingState(this, gameState);
                    }
                    break;
                case window.AI_STATE_SEEKING_RESOURCES:
                    if (typeof window.handleSeekingResourcesState === 'function') {
                        return await window.handleSeekingResourcesState(this, gameState);
                    }
                    break;
                case window.AI_STATE_EXPLORING:
                default:
                    if (typeof window.handleExploringState === 'function') {
                        return await window.handleExploringState(this, gameState);
                    }
                    break;
            }
        } catch (err) {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage(`Enemy.evaluate: Error during FSM evaluation: ${err}`, gameState, { level: 'ERROR', target: 'CONSOLE' });
            }
            return false;
        }
        return false;
    }

    /**
     * Updates the enemy's state.
     * Stub for enemy update logic.
     */
    update() {
        // Implement additional per-frame or per-turn update logic if needed
    }
}

// Attach Enemy to global scope for global-scope loading
window.Enemy = Enemy;