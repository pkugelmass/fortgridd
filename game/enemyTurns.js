/**
 * Loops through enemies and processes each enemy's turn for the core game logic.
 * Pure logic only—no UI, rendering, or animation logic.
 * @module game/enemyTurns
 */

import { sleep } from './utils.js';

/**
 * Processes all enemy turns for the current AI phase.
 * Loops through each living enemy, re-evaluates state, and executes their turn logic.
 * @param {GameState} gameState - The current game state object.
 * @returns {Promise<void>}
 */
export async function processEnemyTurns(gameState) {
    if (typeof Game === 'undefined' || !gameState || Game.isGameOver(gameState) || Game.getCurrentTurn(gameState) !== 'ai' || !gameState.enemies) {
        if (typeof Game !== 'undefined' && gameState && !Game.isGameOver(gameState) && Game.getCurrentTurn(gameState) === 'ai') {
            Game.endAiTurn(gameState);
        }
        return;
    }
    const activeEnemies = gameState.enemies.filter(e => e && e.hp > 0);
    const currentEnemiesTurnOrder = [...activeEnemies];
    let gameEndedDuringLoop = false;
    for (const enemyRef of currentEnemiesTurnOrder) {
        try {
            const enemy = gameState.enemies.find(e => e.id === enemyRef.id);
            if (!enemy || enemy.row === null || enemy.col === null || enemy.hp <= 0) continue;
            gameState.activeUnitId = enemy.id;
            let actionTaken = false;
            let evaluationCount = 0;
            while (!actionTaken && evaluationCount < MAX_EVALUATIONS_PER_TURN) {
                evaluationCount++;
                if (typeof performReevaluation === 'function') {
                    performReevaluation(enemy, gameState);
                }
                let currentHandlerResult = false;
                switch (enemy.state) {
                    case AI_STATE_EXPLORING:
                        currentHandlerResult = await handleExploringState(enemy, gameState);
                        break;
                    case AI_STATE_SEEKING_RESOURCES:
                        currentHandlerResult = await handleSeekingResourcesState(enemy, gameState);
                        break;
                    case AI_STATE_ENGAGING_ENEMY:
                        currentHandlerResult = await handleEngagingEnemyState(enemy, gameState);
                        break;
                    case AI_STATE_FLEEING:
                        currentHandlerResult = await handleFleeingState(enemy, gameState);
                        break;
                    case AI_STATE_HEALING:
                        currentHandlerResult = await handleHealingState(enemy, gameState);
                        break;
                    default:
                        if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                            Game.logMessage(`Enemy ${enemy.id} has unknown state: ${enemy.state}. Defaulting to Exploring.`, gameState, { level: 'WARN', target: 'CONSOLE' });
                        }
                        enemy.state = AI_STATE_EXPLORING;
                        currentHandlerResult = false;
                        break;
                }
                if (currentHandlerResult) {
                    actionTaken = true;
                }
            }
        } catch (err) {
            if (typeof Game !== 'undefined' && typeof Game.logMessage === 'function') {
                Game.logMessage(
                    `[ERROR] Exception in AI update for enemy ${enemyRef && enemyRef.id ? enemyRef.id : "unknown"}: ${err && err.stack ? err.stack : err}`,
                    gameState,
                    { level: 'ERROR', target: 'CONSOLE' }
                );
            }
        }
        if (Game.checkEndConditions(gameState)) {
            gameEndedDuringLoop = true;
            gameState.activeUnitId = null;
            break;
        }
        if (typeof sleep === 'function' && typeof AI_TURN_DELAY !== 'undefined' && AI_TURN_DELAY > 0) {
            await sleep(AI_TURN_DELAY);
        }
        gameState.activeUnitId = null;
    }
    if (!gameEndedDuringLoop && !Game.isGameOver(gameState)) {
        Game.endAiTurn(gameState);
    }
}