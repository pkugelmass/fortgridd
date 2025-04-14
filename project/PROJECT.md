# FortGridd - Planning Document

## 1. Overall Vision & Concept

FortGridd is envisioned as a turn-based tactical survival game very much inspired by Fortnite Battle Royale. It is designed to be played on a 2D grid - like a chessboard, but bigger. The core gameplay loop involves exploration and resource management (ammo, medkits at present), combat against AI opponents, and survival against a shrinking environmental hazard ("storm"). The player wins when he/she is the last player standing.

## 2. Design principles

* Puts more of a strategic / turn-based / maybe chess-like twist on FortNite and the Battle Royale.
* At present the theme is quite serious (guns! ammo!) but I would like to make it more lighthearted & fun.
* Critical design question: is it fun? We will need to balance complexity and strategic interest with simplicity and fun.
* Another challenge is to make sure the user has all the information he/she needs.
* Law of small numbers - numbers exposed to the user should be as small as possilbe - we don't want to work with 1000 hit points and guns that do 52.7 damage!

## 3. Notes on process
* Please advise me when you're doing something interesting or making use of a design pattern.
* Build unit tests as we go but keep them to what's critical.
* Check `TASKS.md` for the next task. If a task isn’t listed, add it with a brief description and today's date.
* **Before starting any single line item** in `TASKS.md` (including sub-tasks): Explain your plan for that item and ask for my agreement to proceed.
* **After completing the implementation for any single line item**: Stop and check in with me for validation. Once validated, mark it as complete in `TASKS.md` before identifying the next item.
* Add new sub-tasks or TODOs discovered during development to `TASKS.md` under a “Discovered During Work” section.
* Use consistent naming conventions, file structure, and architecture patterns.
* Never assume missing context. Ask questions if uncertain.

## 4. Project Components

    * Core game loop:
        * main.js: holds game loop, 
        * gameState: defines central gamestate object
        * game.js: controls the flow of the game
    *

## 4. Road Map

### Completed phases

    1. MVP - first working prototype with main game objects, systems, basic display
    2. Strengthen code base - refactor/centralize, write first round of unit tests
    3. Evolve AI Behavior - Develop the model for enemies to change states and make decisions via finite state machine

### Current Phase

    4. UX Enhancements - visual improvements to make the game more understandable/playable
        * Light visual pass for readability
        * Introduce animation system and initial effects
        * Improvements to game frame & UI
        * Potentially - sprites?

### Planned Phases

    5. Game balancing - rebalance factors to make the game fun
    6. Code strengthening - refactored code including improved object encapsulation, unit tests
        * Refactor Unit, Player, and Enemy into a unified class hierarchy for maintainability and extensibility (deferred to a future/polishing phase).
    7. Additional game features
        * Materials & building
        * Other weapon types?
        * Enemy classes? Progression? Player/enemy abilities?
        * Map enhancements (e.g. better storm, water / other tile types)
    8. Game balancing & code strengthening
    9. Visual overhaul
        * Sprites/graphics - high school theme
        * Music/sound
        * Camera effect—limit player view to a section of the map.
    10. UX improvements
        * Start/end screens / minimal "story"
    11. Packaging: how to share this with others?


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
