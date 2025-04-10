# Knockback Mechanic Design

## 1. Goal

To introduce a knockback mechanic that increases tactical positioning options, breaks up static combat lines, and adds more dynamism to encounters.

## 2. Core Mechanics

*   **Trigger:** Knockback is triggered by any successful **melee** or **ranged** attack hit.
*   **Consistency:** The knockback effect is **guaranteed** (100% chance) upon a successful hit.
*   **Distance:** The target unit is pushed **1 tile** directly away from the attacker's position.
*   **Direction:** The direction is calculated based on the relative positions of the attacker and the target at the moment of the hit. For example, if the attacker is at (5,5) and hits a target at (5,6), the target will be pushed towards (5,7). If the attacker is at (5,5) and hits (6,5), the target is pushed towards (7,5).

## 3. Obstacle Interaction

*   **Blocked Destination:** Before applying knockback, the system checks the destination tile (1 tile away from the target in the knockback direction).
*   **Check Conditions:** The destination tile is considered blocked if it is:
    *   Impassable terrain (e.g., a wall, `TILE_WALL`).
    *   Occupied by another unit (player or enemy).
    *   Outside the map boundaries.
*   **Outcome:** If the destination tile is blocked for any reason, the **knockback effect fails**, and the target unit **does not move**.
*   **No Impact Damage (Initial):** There is no additional damage dealt if the knockback fails due to hitting an obstacle in this initial implementation.

## 4. Implementation Notes

*   The knockback logic should be integrated into the combat resolution sequence, applied *after* damage calculation but before the turn potentially ends.
*   Need a helper function or logic to calculate the destination tile based on attacker/target positions.
*   Need to use existing map/unit collision checks (`isCellOccupied`, checking `mapData`) to determine if the destination tile is valid and empty.
*   Update the target unit's `row` and `col` properties if knockback is successful.
*   Ensure the game state (especially visual representation via `redrawCanvas`) is updated correctly after a successful knockback.

## 5. Future Enhancements (Consider Later)

*   Introduce impact damage if knocked into a wall or another unit.
*   Allow knockback to push units into hazards (if hazards are implemented).
    *   Consider specific weapons or abilities that cause stronger/weaker knockback.
    *   Probabilistic knockback chance instead of guaranteed.
    *   **Chain Reactions:** If knockback into another unit occurs, potentially have that unit also knocked back (low priority, complex).
