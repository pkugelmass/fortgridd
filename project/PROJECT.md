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
* Check `TASK.md` before starting a new task. If the task isn’t listed, add it with a brief description and today's date.
- **Mark completed tasks in `TASK.md`** immediately after finishing them.
- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a “Discovered During Work” section.
* *Use consistent naming conventions, file structure, and architecture patterns.
- Never assume missing context. Ask questions if uncertain.


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
        * Consider different enemy types with unique stats, weapons, or behaviors (e.g., dedicated melee, snipers, support units).
        * Consider what UI improvements may be necessary to help the user understand what's going on and help me/us debug and balance the game going forward.

    3. Enhance combat (could be done in parallel with what's above)
        * Find ways to make combat more strategically interesting instead of two characters meeting and the one with more hit points wins
        * Consider more interactive map elements (e.g., destructible cover, doors, traps); Different terrain types affecting movement or visibility; Larger or multi-level maps.

    4. Enhance player progression/abilities
        * Special abilities or skills.
        * Special pickups for temporary or permanent changes.
        * Experience points / Leveling up? Is this a roguelike - with synergies? 
        * Different weapon types or equipment to find/use.

    5. **UI/UX & Presentation:**
        * Improved graphics/sprites instead of simple shapes.
        * Animations for movement, attacks, healing, storm.
        * Sound effects and background music?
        * Clearer visual indicators for AI state, targeting, LOS.
        * Camera effect - only see a smaller part of a larger map