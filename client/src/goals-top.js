
/* This file contains the top-level goals for actors. */

const RG = require('./rg');
const Goal = require('./goals');

// const GoalsBattle = require('./goals-battle');
const Evaluator = require('./evaluators');
const EvaluatorsBattle = require('./evaluators-battle');
const debug = require('debug')('bitn:goals-top');

const {
    GOAL_COMPLETED,
    GOAL_INACTIVE,
    GOAL_FAILED
} = Goal;

const GoalsTop = {};
//---------------------------------------------------------------------------
// TOP-LEVEL GOALS
//---------------------------------------------------------------------------

/* Base class for all top-level goals. Includes evaluator logic and goal
 * arbitration.
 */
class GoalTop extends Goal.Base {

    constructor(actor) {
        super(actor);
        this.setType('GoalTop');
        this.evaluators = [];
    }

    removeEvaluators() {
        this.evaluators = [];
    }

    addEvaluator(evaluator) {
        this.evaluators.push(evaluator);
    }

    activate() {
        this.arbitrate();
    }

    arbitrate() {
        this.dbg('arbitrate() started');
        if (this.evaluators.length === 0) {
            RG.err('GoalTop', 'arbitrate',
                `No evaluators in ${this.getType}, actor: ${this.actor}`);
        }
        let bestRated = 0;
        let chosenEval = null;

        this.evaluators.forEach(evaluator => {
            const desirability = evaluator.calculateDesirability(this.actor);
            if (bestRated < desirability || chosenEval === null) {
                chosenEval = evaluator;
                bestRated = desirability;
            }
        });

        if (chosenEval) {
            chosenEval.setActorGoal(this.actor);
        }
        else {
            RG.err('GoalTop', 'arbitrate',
                'No next goal found');
        }
        this.dbg('arbitrate() finished');
    }

    process() {
        this.activateIfInactive();
        const status = this.processSubGoals();
        if (status === GOAL_COMPLETED || status === GOAL_FAILED) {
            return GOAL_INACTIVE;
        }
        this.removeFinishedOrFailed();
        this.dbg(`process() got status ${status}`);
        return status;
    }

}
GoalsTop.Top = GoalTop;

//---------------------------------------------------------------------------
/* Top-level goal for actors. Arbitrates each turn with a number of lower level
 * goals. */
//---------------------------------------------------------------------------
class GoalThinkBasic extends GoalTop {

    constructor(actor) {
        super(actor);
        this.setType('GoalThinkBasic');
        const [lowRange, hiRange] = [0.5, 1.5];

        this.bias = {
            attack: RG.RAND.getUniformRange(lowRange, hiRange),
            explore: 0.2,
            flee: 0.2,
            order: 0.7,
            patrol: 1.0
        };

        this.updateEvaluators();
        // this.evaluators.push(new Evaluator.Patrol(this.bias.patrol));
    }

    updateEvaluators() {
        this.removeEvaluators();
        this.evaluators.push(new Evaluator.AttackActor(this.bias.attack));
        this.evaluators.push(new Evaluator.Flee(this.bias.flee));
        this.evaluators.push(new Evaluator.Explore(this.bias.explore));
    }

    /* Can be used to "inject" goals for the actor. The actor uses
     * Evaluator.Orders to check if it will obey the order. */
    giveOrders(evaluator) {
        // TODO remove this evaluator after the check
        this.dbg('Received an order!!', evaluator);
        this.addEvaluator(evaluator);
    }

    /* Clears the given orders. Useful if a new order needs to be issued to
     * override the existing one. */
    clearOrders() {
        const orders = this.evaluators.filter(ev => ev.isOrder());
        orders.forEach(order => {
            if (order.goal.isActive()) {
                order.goal.terminate();
            }
            const index = this.evaluators.indexOf(order);
            this.evaluators.splice(index, 1);
        });
    }

    addGoal(goal) {
        const type = goal.getType();
        this.dbg(`addGoal() ${type}`);
        if (!this.isGoalPresent(type)) {
            this.removeSubGoalsOfType(type);
            this.addSubGoal(goal);
            if (debug.enabled) {
                console.log('Actor subgoals are now: '
                    + this.subGoals.map(g => g.getType()));
            }
        }
    }

}
GoalsTop.ThinkBasic = GoalThinkBasic;

/* Top-level goal for spell casters. */
class GoalThinkSpellcaster extends GoalThinkBasic {

    constructor(actor) {
        super(actor);
        this.setType('GoalThinkSpellcaster');

        this.bias.castSpell = 1.0;
        this.evaluators.push(new Evaluator.CastSpell(this.bias.castSpell));
    }

}
GoalsTop.ThinkSpellcaster = GoalThinkSpellcaster;

/* Top goal used by commanders in battles. */
class GoalThinkCommander extends GoalThinkBasic {

    constructor(actor) {
        super(actor);
        this.setType('GoalThinkCommander');

        this.bias.attack = 0.1;
        this.bias.winBattle = 0.8;
        this.bias.retreat = 0.3;
        this.updateEvaluators();
    }

    updateEvaluators() {
        super.updateEvaluators();
        const winBattleEval = new EvaluatorsBattle.WinBattle(
            this.bias.winBattle);
        this.evaluators.push(winBattleEval);

        const retreatEval = new EvaluatorsBattle.Retreat(this.bias.retreat);
        this.evaluators.push(retreatEval);
    }

}
GoalsTop.ThinkCommander = GoalThinkCommander;

module.exports = GoalsTop;
