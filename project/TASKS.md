# FortGridd Tasks (v2 - develop 2 branch)

## Phase 1: Strengthen Codebase (Started: 2025-04-08)

### Foundational Setup & Initial Cleanup

1.  **Establish Browser-Based Unit Testing:**
    *   [x] Configure test runner to use existing QUnit library files from `tests/vendor/`.
    *   [x] Create `tests/test-runner.html` to load QUnit, game scripts, and test scripts.
    *   [x] Add QUnit display elements (`<div id="qunit">`, `<div id="qunit-fixture">`) to `test-runner.html`.

2.  **Write Initial Unit Tests:**
    *   [x] Identify simple, testable units (e.g., `config.js` values, utility functions).
    *   [x] Create initial test file(s) (e.g., `tests/config.test.js`).
    *   [x] Write basic assertions using QUnit API.

3.  **Centralize Constants:**
    *   [x] Review `js/ai.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/game.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/player.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/map.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/drawing.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/main.js` for hardcoded values and move to `js/config.js`.
    *   [x] Review `js/input.js` for hardcoded values and move to `js/config.js`.
    *   [x] Update reviewed files to reference constants from `config.js`.

### Deeper Refactoring & Consistency

4.  **Code Cleanup & Refactoring:**
    *   [ ] Review all `.js` files for redundant comments.
    *   [ ] Identify and extract duplicated code into reusable helper functions (consider `js/utils.js`).
    *   [ ] Break down long/complex functions.
    *   [ ] Ensure consistent naming conventions and formatting.
    *   [ ] **Develop unit tests for refactored code to verify functionality.**

5.  **Establish Consistent Logging:**
    *   [ ] Define a logging convention (e.g., prefixes, basic utility function).
    *   [ ] Apply logging convention consistently.

### Ongoing

*   [ ] Add more unit tests as code is refactored/added.
*   [ ] Practice small, logical Git commits with clear messages.

---
## Discovered During Work
*(Add new tasks identified during development here)*

---
## Completed Tasks
*(Move completed task lines here)*
