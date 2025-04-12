# FortGridd UX Improvements

## Sequential AI Turn Presentation (Current Task)

**Goal:**  
Make AI turns visually sequential and understandable by processing each AI enemy one at a time, with a visible highlight and a pause before/after each action.

### Implementation Plan

1. **Refactor AI Turn Logic**
   - Convert `runAiTurns` to an asynchronous function.
   - Use `await` and `setTimeout` to introduce delays between each enemy's turn.

2. **Highlight the Current AI**
   - Add `gameState.highlightedEnemyId` to track the active enemy.
   - In `drawEnemies`, render the highlighted enemy with a thick, bright (yellow/gold) glowing or pulsing outline around the enemy's red circle.
   - Optionally animate the outline for extra emphasis.

3. **UI Updates**
   - After setting the highlighted enemy and after each action, trigger a redraw to ensure the highlight is visible during the pause.

4. **Delays**
   - Add configurable constants to `js/config.js` for pause durations before and after each enemy acts.

5. **Disable Player Input**
   - Player input is already ignored when it is not the player's turn.

6. **End of AI Sequence**
   - After all enemies have acted, clear the highlight and end the AI turn as before.

### Highlighting Recommendation

- **Primary:** Glowing or pulsing outline around the enemy circle (yellow/gold).
- **Alternative (future):** Combine with a subtle tile highlight if more emphasis is needed.

### Rationale

- This approach is visually distinct, animation-compatible, and will remain clear even as movement animations are added.

---

## Future UX Improvements (Sections to be added)

- **Movement/Attack Animations:** Sliding units, attack effects, etc.
- **Attack/Healing Feedback:** Animations, color flashes, floating numbers.
- **Threat Indicators:** Show attack ranges or danger zones.
- **UI/Stats Bar:** Improve clarity and usefulness.
- **Instructions/Onboarding:** Help new players understand the game.
- **Action Log Redesign:** Improve readability and usefulness.
- **Developer Overlays:** Expose key stats for tuning/balance.

---

*Add new sections here as additional UX improvements are planned or implemented.*