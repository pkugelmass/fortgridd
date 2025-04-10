# FortGridd Handoff Document (2025-04-09 - End of Session)

*(Purpose: To capture the immediate next steps and context for the next work session, not to restate the entire project roadmap or completed tasks.)*

## Project Context

*   **Project:** FortGridd - Turn-based tactical survival game.
*   **Current Branch:** `develop 2`
*   **Last Major Action:** Refactored unit movement and resource pickup logic into centralized helper functions (`updateUnitPosition`, `checkAndPickupResourceAt`) located in the new `js/utils.js` file. This resolved inconsistent pickup behavior and improved code organization.

## Next Task & Plan

The next immediate task identified in `TASKS.md` is:
*   **Review/Tune AI Ammo Seeking threshold and proactive logic.** (Discovered: 2025-04-09)

**Plan for Next Session:**

1.  **Locate Logic:** Identify the exact code responsible for the AI deciding to enter the `AI_STATE_SEEKING_RESOURCES` state specifically for ammo. This is likely within the `performReevaluation` function in `js/ai.js`.
2.  **Review Threshold:** Examine the current `AI_SEEK_AMMO_THRESHOLD` constant in `js/config.js` and how it's used in the decision logic.
3.  **Analyze Proactive Behavior:** Determine if the current logic is purely reactive (seek ammo only when empty) or if there's any proactive element (e.g., seeking ammo when low but not empty).
4.  **Consider Tuning Options:**
    *   Is the current fixed threshold appropriate, or should it be a percentage of max ammo (if max ammo becomes a concept)?
    *   Should the decision to seek ammo be influenced by other factors, such as:
        *   Currently seeing an enemy? (Maybe prioritize fighting/fleeing over seeking ammo).
        *   Having a ranged weapon equipped (if different weapon types are added)?
        *   Current health level? (Low health might prioritize healing/fleeing).
    *   How "proactive" should the AI be? Should it top up ammo whenever it sees some nearby and isn't immediately threatened?
5.  **Discussion & Implementation:** Discuss these tuning options and implement any agreed-upon changes to the threshold value in `config.js` and/or the decision logic in `js/ai.js`.
6.  **Playtesting:** Tuning AI behavior often requires iterative playtesting to observe the results and make further adjustments.

*(Note: While unit testing remains important (especially for recent refactors), addressing this specific AI behavior tuning task is the next item listed.)*
