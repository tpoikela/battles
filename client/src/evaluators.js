
/* This file contains action evaluators used in combination with actor Goals to
 * implement more diverse computational intelligence for NPCs.
 * Each evaluator should return a desirability of given action, which is a
 * number between 0 and 1.
 */

const RG = require('./rg');
const Goal = require('./goals');

const Evaluator = {};

class EvaluatorBase {

    constructor(actorBias) {
        this.actorBias = actorBias;
    }

    calculateDesirability(actor) {
        throw new Error('Pure virtual function');
    }

    setGoal(actor) {
        throw new Error('Pure virtual function');
    }

}
Evaluator.Base = EvaluatorBase;


class EvaluatorAttackActor extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
    }

    calculateDesirability(actor) {
        const brain = actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemyCell = brain.findEnemyCell(seenCells);
        if (enemyCell) {
            const result = 1;
            this.enemyActor = enemyCell.getActors()[0];
            return this.actorBias * result * 2;
        }
        return 0.0;
    }

    setGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.AttackActor(actor, this.enemyActor);
        topGoal.addGoal(goal);
    }

}
Evaluator.AttackActor = EvaluatorAttackActor;

/* Evaluator to check if an actor should resort to exploring the area. */
class EvaluatorExplore extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
    }

    calculateDesirability(actor) {
        const enemyCells = RG.Brain.getEnemyCellsAround(actor);
        if (enemyCells.length > 0) {
            return 0;
        }
        return this.actorBias;
    }

    setGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Explore(actor);
        topGoal.addGoal(goal);
    }

}
Evaluator.Explore = EvaluatorExplore;

/* Evaluator to check if actor should flee from a fight. */
class EvaluatorFlee extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
    }

    calculateDesirability(actor) {
        const enemyCells = RG.Brain.getEnemyCellsAround(actor);
        const health = actor.get('Health');
        const maxHP = health.getMaxHP();
        const HP = health.getHP();
        const propHP = HP / maxHP;
        if (enemyCells.length > 0) {
            if (propHP < this.actorBias) {
                this.enemyActor = enemyCells[0].getActors()[0];
                return this.actorBias * (1.0 - propHP) / Math.pow(propHP, 2);
            }
        }
        return 0;
    }

    setGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Flee(actor, this.enemyActor);
        topGoal.addGoal(goal);
    }

}
Evaluator.Flee = EvaluatorFlee;

module.exports = Evaluator;
