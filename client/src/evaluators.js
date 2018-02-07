
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

    calculateDesirability() {
        throw new Error('Pure virtual function');
    }

    setActorGoal() {
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

    setActorGoal(actor) {
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

    setActorGoal(actor) {
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

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Flee(actor, this.enemyActor);
        topGoal.addGoal(goal);
    }

}
Evaluator.Flee = EvaluatorFlee;

/* Evaluator to check if actor should flee from a fight. */
class EvaluatorPatrol extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.coords = [[2, 2], [40, 10], [20, 20]];
    }

    setCoords(coords) {
        this.coords = coords;
    }

    calculateDesirability() {
        return this.actorBias;
    }

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const coords = this.coords;
        const goal = new Goal.Patrol(actor, coords);
        topGoal.addGoal(goal);
    }
}
Evaluator.Patrol = EvaluatorPatrol;

/*
class EvaluatorCommand extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
    }

}
Evaluator.Command = EvaluatorCommand;
*/

/* Evaluator to check if actor should flee from a fight. */
class EvaluatorOrders extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.goal = null;
    }

    /* Sets the arguments used for goal injection for commanded actor. */
    setArgs(args) {
        this.goal = args.goal;
        this.srcActor = args.srcActor;
    }

    calculateDesirability() {
        // TODO evaluate srcActor status
        // Evaluate difficulty of goal
        const commanderMult = 1.0;
        const goalCateg = this.goal.getCategory();
        const mult = goalCateg === Goal.Types.Kill ? 0.5 : 1.0;
        if (this.srcActor.has('Commander')) {
            return mult * commanderMult;
        }
        return 0.0;
    }

    setActorGoal(actor) {
        if (this.goal) {
            const topGoal = actor.getBrain().getGoal();
            topGoal.addGoal(this.goal);
        }
        else {
            RG.err('EvaluatorOrder', 'setActorGoal',
                'this.goal must not be null');
        }
    }

    setSubEvaluator(evaluator) {
        this.subEval = evaluator;
    }


}
Evaluator.Orders = EvaluatorOrders;

module.exports = Evaluator;
