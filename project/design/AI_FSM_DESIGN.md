# AI Finite State Machine (FSM) Design

This document outlines the design for the AI Finite State Machine (FSM) in FortGridd.

## 1. Goals

*   Reduce AI predictability.
*   Enable AI interaction with resources (Medkits, Ammo).
*   Implement contextual behavior based on AI state (HP, ammo, threats).
*   Increase believability of AI actions.

## 2. State Evaluation Priority

State transitions are determined centrally within the `performReevaluation` function based on the following priority order:

1.  **Threat Assessment:** Is an enemy visible?
    *   YES & HP Critical (`< AI_FLEE_HEALTH_THRESHOLD`): -> `FLEEING`
    *   YES & HP Not Critical: -> `ENGAGING_ENEMY`
2.  **Self-Preservation (No Threat):** Is HP low (`< AI_USE_MEDKIT_THRESHOLD`) and medkits available?
    *   YES: -> `HEALING`
3.  **Resource Acquisition (No Threat, Not Healing):** Is a needed resource (Medkit/Ammo) visible?
    *   YES: -> `SEEKING_RESOURCES`
4.  **Default:** -> `EXPLORING`

## 3. States

The FSM will consist of the following states:

1.  **`EXPLORING`** (Default State)
    *   **Purpose:** Baseline behavior when no immediate threat or high-priority resource need is detected. Simulates searching/scouting.
    *   **Action:** Move semi-randomly or patrol. Periodically scan the visible area for enemies and resources.
    *   **Transitions:**
        *   On Enemy Detected (and decides to fight): -> `ENGAGING_ENEMY`
        *   On Enemy Detected (and decides to flee): -> `FLEEING`
        *   On Medkit Detected (nearby, health < threshold): -> `SEEKING_RESOURCES`
        *   On Ammo Detected (nearby, ammo == 0): -> `SEEKING_RESOURCES`

2.  **`SEEKING_RESOURCES`**
    *   **Purpose:** Move towards a specific, needed resource (Medkit or Ammo).
    *   **Action:** Move towards the targeted resource tile.
    *   **Transitions:**
        *   On Resource Reached: Update AI stats (medkits/ammo), remove tile from map -> `EXPLORING`
        *   On Higher Priority Threat Detected: -> `ENGAGING_ENEMY` or `FLEEING`
        *   On Resource Disappears (e.g., picked up by other): -> `EXPLORING`

3.  **`ENGAGING_ENEMY`**
    *   **Purpose:** Actively fight a detected enemy.
    *   **Action:** Move towards the target enemy. Attack if adjacent/in range and has ammo.
    *   **Transitions:**
        *   On Enemy Defeated / Out of Sight: -> Re-evaluate (likely `EXPLORING`)
        *   On Health < Flee Threshold: -> Re-evaluate (will transition to `FLEEING`)
        *   On Out of Ammo: -> Re-evaluate (may transition to `SEEKING_RESOURCES` or `FLEEING`)

4.  **`FLEEING`**
    *   **Purpose:** Attempt to escape from a perceived threat.
    *   **Action:** Move away from the threat's location.
    *   **Transitions:**
        *   On Threat No Longer Perceived: -> Re-evaluate (likely `EXPLORING`)
        *   On Cornered / Cannot Flee Further: -> Re-evaluate (may transition back to `ENGAGING_ENEMY`)

5.  **`HEALING`**
    *   **Purpose:** Use an available medkit when health is low and no immediate threat is present.
    *   **Action:** Call `useMedkit` helper function. This action consumes the AI's turn.
    *   **Transitions:**
        *   After healing: -> Re-evaluate (likely `EXPLORING` or `SEEKING_RESOURCES` if still needed)

## 4. Implementation Notes

*   AI objects will have `state`, `hp`, `maxHp`, `medkits`, `resources.ammo`, `targetEnemy`, `targetResourceCoords` properties.
*   State transitions are determined centrally in `performReevaluation` based on the priority logic. State handlers focus on executing the actions for their state.
*   Perception logic (`findNearestVisibleEnemy`, `findNearbyResource`, `hasClearLineOfSight`) is crucial input for `performReevaluation`.
*   Relevant constants (states, thresholds) will be defined in `js/config.js`.
*   Unit tests will be created in `tests/ai.test.js` to verify FSM logic.
