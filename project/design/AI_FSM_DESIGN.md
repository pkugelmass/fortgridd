# AI Finite State Machine (FSM) Design

This document outlines the design for the AI Finite State Machine (FSM) in FortGridd.

## 1. Goals

*   Reduce AI predictability.
*   Enable AI interaction with resources (Medkits, Ammo).
*   Implement contextual behavior based on AI state (HP, ammo, threats).
*   Increase believability of AI actions.

## 2. States

The FSM will consist of the following initial states:

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
        *   On Enemy Defeated / Out of Sight: -> `EXPLORING`
        *   On Health < Flee Threshold: -> `FLEEING`
        *   On Out of Ammo: -> `EXPLORING` (or potentially `FLEEING` / `SEEKING_RESOURCES`)

4.  **`FLEEING`**
    *   **Purpose:** Attempt to escape from a perceived threat.
    *   **Action:** Move away from the threat's location.
    *   **Transitions:**
        *   On Threat No Longer Perceived: -> `EXPLORING`
        *   On Cornered: -> `ENGAGING_ENEMY` (potentially)
        *   *(Future)* On Medkit Detected while fleeing: -> `SEEKING_RESOURCES`

## 3. Implementation Notes

*   AI objects will have `state`, `medkits`, `targetEnemy`, `targetResourceCoords` properties.
*   State transitions will be checked within state handler functions in `js/ai.js`.
*   Perception logic (scanning, line-of-sight) is crucial for triggering transitions.
*   Relevant constants (states, thresholds) will be defined in `js/config.js`.
*   Unit tests will be created in `tests/ai.test.js` to verify FSM logic.
