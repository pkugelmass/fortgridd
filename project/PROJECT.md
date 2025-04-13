# FortGridd - Planning Document

## 1. Overall Vision & Concept

FortGridd is envisioned as a turn-based tactical survival game very much inspired by Fortnite Battle Royale. It is designed to be played on a 2D grid - like a chessboard, but bigger. The core gameplay loop involves exploration and resource management (ammo, medkits at present), combat against AI opponents, and survival against a shrinking environmental hazard ("storm"). The player wins when he/she is the last player standing. 

## 2. Design principles

* It blends elements of traditional roguelikes/tactical RPGs with battle royale mechanics like the shrinking safe zone. 
* True to the battle royale theme, this is not a "1 vs many" game but rather an everyone-for-himself game.
* At present the theme is quite serious but I would like to keep the option to find a way to make it more lighthearted & fun. 
* Critical question: is it fun? There are so many options and ideas. We will need to balance complexity and interest with simplicity and fun.
* Another challenge is to make sure the user has all the information he/she needs.
* Law of small numbers - numbers exposed to the user should be as small as possilbe - we don't want to work with 1000 hit points and guns that do 52.7 damage!
* At present we can see the whole "board" but in the future we might consider a "camera" approach in which the player's viewpoint is more limited.

## 3. Notes on process
* This is a fun project for me to learn more about game design, javascript, etc. Please advise me when you're doing something interesting or making use of a design pattern.
* I'm intermediate with git - particularly best practices for how often to commit, branch, merge, etc. Appreciate your advice on that.
* Let's build unit tests as we go and keep them current.
* I'm working on a corporate laptop so don't have node.js installed.
* Check `TASKS.md` for the next task. If a task isn’t listed, add it with a brief description and today's date.
* **Before starting any single line item** in `TASKS.md` (including sub-tasks): Explain your plan for that item and ask for my agreement to proceed.
* **After completing the implementation for any single line item**: Stop and check in with me for validation. Once validated, mark it as complete in `TASKS.md` before identifying the next item.
* Add new sub-tasks or TODOs discovered during development to `TASKS.md` under a “Discovered During Work” section.
* Use consistent naming conventions, file structure, and architecture patterns.
* Never assume missing context. Ask questions if uncertain.


## 4. Road Map

At time of writing, we have a working v1 on the main branch and we are just starting to develop the next phase in a branch called "develop 2." Here are some of the potential priorities going forward:

    1. Strengthen code base
        * Establish unit testing base that can be maintained/grown going forward
        * Refine, refactor, and centralize: 
            * Clean up the code as much as possible. 
            * Remove unnecessary comments for brevity (while maintaining strong readability)
            * Refactor out helper functions and reduce duplication
            * Centralize constants in config.js for easier tuning
        * Promote consistency
            * Without overdoing it, try to create consistent appraoches to things like event logging
        
    2. Evolve AI behavior
        * Build an enemy state machine as the basis for different AI behaviors in different situations
        * Enable the AI to pick up and use resources (starting with the existing resources - medkits and ammo)
        * Develop the model for enemies to change states and make decisions
        * Tune AI parameters - constants in `config.js` (health thresholds, detection ranges, move chances, cooldowns) based on gameplay testing to achieve desired difficulty and behavior.
        * **Advanced Positional Evaluation:** Implement logic for AI to assess the tactical advantage of its current position (cover, centrality) to inform movement/waiting decisions. (Future Idea)
        * Consider different enemy types with unique stats, weapons, or behaviors (e.g., dedicated melee, snipers, support units).
        * **Initial AI Balance Pass:** After core FSM implementation, tune AI parameters (`config.js`) via gameplay testing. (Balancing Step)
        * Consider what UI improvements may be necessary to help the user understand what's going on and help me/us debug and balance the game going forward.

    3. Enhance combat (could be done in parallel with what's above)
        * Find ways to make combat more strategically interesting instead of two characters meeting and the one with more hit points wins
        * **Resource Harvesting:** Introduce mechanics for players/AI to gather resources by interacting with map elements (e.g., destroying trees/walls). (Future Idea - Could also serve as AI fallback behavior in stalemates).
        * **Resource Economy Balance:** If/when harvesting is added, tune spawn rates, yields, AI usage, etc. (Balancing Step)
        * Consider more interactive map elements (e.g., destructible cover, doors, traps); Different terrain types affecting movement or visibility; Larger or multi-level maps.

    4. Enhance player progression/abilities
        * Special abilities or skills.
        * Special pickups for temporary or permanent changes.
        * Experience points / Leveling up? Is this a roguelike - with synergies? 
        * Different weapon types or equipment to find/use.

    5. **UI/UX & Presentation (Current Phase):**
        * Focus on making the game understandable, playable, and fun for new and returning players.
        * Prioritize clear feedback for all actions (attacks, knockbacks, healing, movement) using simple animations, highlights, or effects.
        * Sequence and highlight AI turns so the player can follow the flow of the game.
        * Improve the stats/info bar and action log for clarity and usefulness.
        * Add instructions or an overview to help new players get started.
        * Optional: Add simple sprites or visual touches for engagement, but not aiming for final polish.
        * This phase is not about final visuals or release-level polish—it's about exposing the right information and making the prototype fun and accessible.

    6. **Gameplay Balancing & Tuning (Next Phase):**
        * Conduct balance passes after major feature implementations (AI FSM, Resource Harvesting, New Abilities, etc.).
        * Adjust constants in `config.js` based on playtesting feedback to achieve desired difficulty and fun factor.
        * Ensure resource availability and AI capabilities remain fair and engaging throughout the game.
        * Consider adding developer/debug overlays or tools to expose key stats for tuning.

    7. **Future/Polish & Ambitious Features:**
        * Camera effect—limit player view to a section of the map.
        * Refactor Unit, Player, and Enemy into a unified class hierarchy for maintainability and extensibility (deferred to a future/polishing phase).
        * Full visual/thematic overhaul (graphics, sprites, animations, sound, UI polish).
        * Advanced map features (multi-level, destructible terrain, etc.).
        * Additional accessibility and quality-of-life improvements.

## 5. Future Concepts & Themes (Brainstorming)

While the immediate focus is on refining core mechanics (AI, combat, code quality), we've brainstormed some potential future directions to keep in mind:

*   **High School Battle Royale Theme:**
    *   **Concept:** Re-theme the game around high school archetypes (Jock, Nerd, Bully, Mean Girl, Emo Kid, etc.) competing in a Battle Royale scenario. The player could be the "Nerd" trying to survive.
    *   **Tone:** This offers opportunities for humor, satire, and a more lighthearted feel compared to standard shooter tropes.
    *   **AI/Combat:** Archetypes could inform distinct AI behaviors, stats, and abilities (e.g., Jock = aggressive melee, Nerd = ranged/tactical).
    *   **Resources:** Items could be re-themed (e.g., textbooks, energy drinks, stolen lunch money).

*   **Character Evolution Mechanic:**
    *   **Concept:** Characters could potentially "evolve" into stronger versions of their archetype (e.g., Jock -> Quarterback, Nerd -> Valedictorian) based on certain triggers.
    *   **Challenges:** Need to balance complexity vs. the game's pace. Complex evolution trees or location-based triggers might be too much for a quick browser game.
    *   **Alternatives/Simplifications:**
        *   **Temporary Buffs:** Reward kills/actions with temporary stat boosts or better item drops.
        *   **Single-Step Evolution:** A single transformation triggered by a simple condition (X kills, specific rare item).
        *   **Distinct Starting Abilities:** Give archetypes unique starting skills instead of in-match evolution.

*   **Persistent "Sports League" (Far Future Idea):** A highly ambitious concept where characters/stats persist across multiple matches, framed as a competitive league. Likely beyond the current scope.

These ideas are for future consideration and should not distract from the current roadmap priorities unless explicitly decided otherwise.
