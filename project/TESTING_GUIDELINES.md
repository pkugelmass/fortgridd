# FortGridd Testing Guidelines

## Goal
Our primary goal for unit testing is to ensure the core game logic functions correctly, state is managed predictably, and critical edge cases or failure conditions are handled gracefully. We aim for confidence in the code's behavior, not necessarily 100% code coverage. Tests should be maintainable and provide clear value.

## What to Prioritize Testing
*   **Core Algorithms:** Pathfinding, Line of Sight (LOS), AI state transitions, combat calculations, resource pickups, knockback application.
*   **State Management:** Functions that directly modify critical parts of `gameState`.
*   **Complex Logic:** Functions with significant conditional branching (multiple `if`/`else`, `switch` statements).
*   **Input Validation & Error Handling:** Verify that functions correctly reject invalid inputs and handle expected error conditions (check return values, state changes, or *if* a critical error was thrown/logged, but avoid testing exact log strings).
*   **Boundary/Edge Cases:** Test scenarios like zero values, maximum values, off-by-one conditions, empty arrays, null inputs where applicable.
*   **Utility Functions (`utils.js`):** Test core reusable logic, but keep tests focused on input/output behavior.

## What to Deprioritize or Skip
*   **Trivial Functions:** Simple getters/setters, functions returning constants.
*   **Rendering/DOM:** Direct testing of canvas drawing (`drawing.js`) or UI manipulation (`ui.js`). Test any underlying *logic* (e.g., data formatting) separately if complex.
*   **Logging:** Avoid testing exact log message strings or counts unless the log *itself* is the primary indicator of a specific critical path being taken correctly. Prefer testing function return values or state changes. If testing an error path where a dependency (like the logger) might fail due to invalid input (e.g., null `gameState`), prioritize asserting that the function under test returns the correct value or handles the situation gracefully (doesn't crash) over asserting on the failing log call.
*   **Simple Delegation:** Functions that primarily reformat data and call another well-tested function *may* be skipped in unit tests.
*   **Overly Complex Setup:** If mocking dependencies for a function becomes extremely convoluted, consider if an integration test would be more valuable later, or if the code can be refactored for better testability.

## How to Write Tests
*   **Use Helpers:** Utilize functions in `tests/test-helpers.js` for common setup (mock units, gameState, constants).
*   **Keep Focused:** Aim for one logical concept or path per test.
*   **Clear Assertions:** Use descriptive messages in `assert` statements.
*   **Mock Dependencies:** Isolate the unit under test by mocking its dependencies where practical. Ensure mocks correctly target the actual object/function being used by the code under test (e.g., mock `Game.logMessage` directly, not `window.Game.logMessage` if the code references the `Game` constant).
*   **Prioritize Central Helpers:** Strive to perform test setup (creating mock game states, units, constants, mocking dependencies) using the functions provided in `tests/test-helpers.js`. When encountering setup challenges or failing tests due to setup issues, prioritize enhancing the central helper functions rather than implementing complex setup logic or workarounds directly within individual test files.
*   **Readability:** Write clear, understandable test code.
