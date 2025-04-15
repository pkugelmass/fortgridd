/**
 * @abstract
 * @class Unit
 * Abstract base class for all units (Player, Enemy) in the game.
 * Handles position, health, inventory/resources, movement, and resource pickup.
 */
class Unit {
    /**
     * Create a Unit.
     * @param {number} x - The x position of the unit on the map.
     * @param {number} y - The y position of the unit on the map.
     * @param {number} health - The health of the unit.
     */
    constructor(x, y, health) {
        if (this.constructor === Unit) {
            throw new Error("Cannot instantiate abstract class Unit directly.");
        }
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.health = health;
        /** @type {boolean} */
        this.alive = true;
        /**
         * @type {{ammo: number, medkits: number}}
         * Inventory/resources for the unit.
         */
        this.resources = { ammo: 0, medkits: 0 };
    }

    /**
     * Moves the unit to a new position, updates tile occupancy, and checks for resource pickup.
     * @param {number} newX
     * @param {number} newY
     * @param {GameState} gameState
    /**
     * Handles movement or melee attack intent.
     * Checks boundaries, terrain, and enemies. Executes move or attack.
     * @param {number} targetX
     * @param {number} targetY
     * @param {GameState} gameState
     */
     * @param {object} [options] - { damage, logClass, attackType }
     * @returns {boolean} True if the action consumed the unit's turn, false otherwise.
     */
     */
    moveOrAttack(targetX, targetY, gameState, options = {}) {
        if (!gameState || !gameState.map) return false;
        const map = gameState.map;
        const tile = map.getTile(targetX, targetY);
        // 1. Boundary Check
        if (!tile) {
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`${this.constructor.name} move blocked by map edge at (${targetX},${targetY}).`, gameState, { level: 'PLAYER', target: 'PLAYER' });
            }
            return false;
        }
        // 2. Check for Enemy (Melee Attack) or Occupied Tile
        if (gameState.isTileOccupied(targetX, targetY, this)) {
            const targetUnit = (gameState.enemies || []).find(u => u.x === targetX && u.y === targetY && u.alive);
            if (targetUnit) {
                return this.attack(targetUnit, { ...options, type: 'melee' }, gameState);
            } else {
                if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                    Game.logMessage(`${this.constructor.name} move blocked by occupied tile at (${targetX},${targetY}).`, gameState, { level: 'PLAYER', target: 'PLAYER' });
                }
                return false;
            }
        }
        // 3. Check Terrain (Movement)
        if (tile.passable) {
            if (gameState.isTileOccupied(targetX, targetY, this)) {
                if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                    Game.logMessage(`${this.constructor.name} move blocked by occupied tile at (${targetX},${targetY}).`, gameState, { level: 'PLAYER', target: 'PLAYER' });
                }
                return false;
            }
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`${this.constructor.name} moves to (${targetX},${targetY}).`, gameState, { level: 'PLAYER', target: 'PLAYER' });
            }
            this.moveTo(targetX, targetY, gameState);
            return true;
        } else {
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`${this.constructor.name} move blocked by terrain at (${targetX},${targetY}).`, gameState, { level: 'PLAYER', target: 'PLAYER' });
            }
            return false;
        }
    }

    /**
     * Generalized attack logic for melee or ranged.
     * @param {Unit} target
     * @param {object} options - { damage, type }
     * @param {GameState} gameState
     * @returns {boolean}
     */
    attack(target, options = {}, gameState) {
        const type = options.type || 'melee';
        const damage = options.damage || 1;
        if (!target || !target.alive) return false;
        target.health -= damage;
        if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
            Game.logMessage(`${this.constructor.name} ${type === 'melee' ? 'attacks' : 'shoots'} ${target.constructor.name} at (${target.x},${target.y}) for ${damage} damage.`, gameState, { level: 'PLAYER', target: 'PLAYER' });
        }
        // Knockback logic (if any)
        if (target.health <= 0) {
            target.alive = false;
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`${this.constructor.name} defeated ${target.constructor.name} at (${target.x},${target.y}).`, gameState, { level: 'PLAYER', target: 'PLAYER' });
            }
        }
        return true;
    }

    /**
     * Generalized shooting logic for units.
     * @param {{dx: number, dy: number}} direction
     * @param {GameState} gameState
     * @param {object} [options] - { range, damage, logClass }
     * @returns {boolean}
     */
    shoot(direction, gameState, options = {}) {
        const range = options.range || (typeof window.RANGED_ATTACK_RANGE !== "undefined" ? window.RANGED_ATTACK_RANGE : 5);
        const damage = options.damage || (typeof window.RANGED_ATTACK_DAMAGE !== "undefined" ? window.RANGED_ATTACK_DAMAGE : 1);
        if (this.resources.ammo > 0) {
            this.resources.ammo--;
            let shotHit = false;
            let hitTarget = null;
            let blocked = false;
            let blockedBy = "";
            let hitCoord = null;
            const map = gameState.map;
            const enemies = gameState.enemies;
            const traceEndX = this.x + direction.dx * (range + 1);
            const traceEndY = this.y + direction.dy * (range + 1);
            const linePoints = window.traceLine(this.x, this.y, traceEndX, traceEndY);
            for (let i = 1; i < linePoints.length; i++) {
                const point = linePoints[i];
                const tile = map.getTile(point.x, point.y);
                const dist = Math.max(Math.abs(point.x - this.x), Math.abs(point.y - this.y));
                if (dist > range) break;
                if (!tile) {
                    blocked = true; blockedBy = "Map Edge"; hitCoord = { x: point.x, y: point.y };
                    break;
                }
                if (!tile.passable) {
                    blocked = true;
                    blockedBy = tile.type;
                    hitCoord = { x: point.x, y: point.y };
                    break;
                }
                hitTarget = (enemies || []).find(enemy => enemy.x === point.x && enemy.y === point.y && enemy.alive);
                if (hitTarget) {
                    shotHit = true; hitCoord = { x: point.x, y: point.y };
                    break;
                }
            }
            let logMsg = `${this.constructor.name} shoots`;
            let knockbackMsg = "";
            if (shotHit && hitTarget) {
                hitTarget.health -= damage;
                logMsg += ` -> hits ${hitTarget.constructor.name} at (${hitTarget.x},${hitTarget.y}) for ${damage} damage! (HP: ${hitTarget.health}/${hitTarget.maxHp || "?"})`;
                // Knockback logic (if any)
            } else if (blocked) {
                logMsg += ` -> blocked by ${blockedBy}` + (hitCoord ? ` at (${hitCoord.x},${hitCoord.y})` : '') + ".";
            } else {
                logMsg += " -> missed.";
            }
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(logMsg + knockbackMsg, gameState, { level: 'PLAYER', target: 'PLAYER' });
            }
            return true;
        } else {
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(`${this.constructor.name} cannot shoot: Out of ammo!`, gameState, { level: 'PLAYER', target: 'PLAYER' });
            }
            return false;
        }
    }
     */
    moveTo(newX, newY, gameState) {
        // Remove from old tile
        if (gameState && gameState.map) {
            const oldTile = gameState.map.getTile(this.x, this.y);
            if (oldTile) oldTile.setOccupiedBy(null);
            const newTile = gameState.map.getTile(newX, newY);
            if (newTile && newTile.passable && !newTile.isOccupied()) {
                this.x = newX;
                this.y = newY;
                newTile.setOccupiedBy(this);
                this.pickupResourceAt(newX, newY, gameState);
            }
        }
    }

    /**
     * Checks for a resource at the given coordinates and handles pickup if found.
     * Updates the unit's resources, modifies the tile, and logs the event.
     * @param {number} x
     * @param {number} y
     * @param {GameState} gameState
     * @returns {boolean} True if a resource was picked up, false otherwise.
     */
    pickupResourceAt(x, y, gameState) {
        if (!gameState || !gameState.map) return false;
        const tile = gameState.map.getTile(x, y);
        if (!tile || !tile.pickup) return false;
        let resourceCollected = false;
        let resourceType = "";
        // Example: pickup = { type: 'medkit' | 'ammo', amount: number }
        if (tile.pickup.type === 'medkit') {
            this.resources.medkits += tile.pickup.amount || 1;
            resourceType = "Medkit";
            resourceCollected = true;
        } else if (tile.pickup.type === 'ammo') {
            this.resources.ammo += tile.pickup.amount || 1;
            resourceType = "Ammo";
            resourceCollected = true;
        }
        if (resourceCollected) {
            tile.setPickup(null);
            if (typeof Game !== "undefined" && typeof Game.logMessage === "function") {
                Game.logMessage(
                    `${this.constructor.name} collects ${resourceType} at (${x},${y}).`,
                    gameState,
                    { level: 'PLAYER', target: 'PLAYER' }
                );
            }
        }
        return resourceCollected;
    }
}
}

// No export statement for global-scope compatibility.