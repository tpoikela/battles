
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

        // const fleeBias = RG.RAND.getUniformRange(lowRange, hiRange);
        // const exploreBias = RG.RAND.getUniformRange(lowRange, hiRange);
        // console.log([attackBias, fleeBias, exploreBias]);

        this.evaluators.push(new Evaluator.AttackActor(this.bias.attack));
        this.evaluators.push(new Evaluator.Flee(this.bias.flee));
        this.evaluators.push(new Evaluator.Explore(this.bias.explore));
        // this.evaluators.push(new Evaluator.Patrol(this.bias.patrol));
    }

    /* Can be used to "inject" goals for the actor. The actor uses
     * Evaluator.Orders to check if it will obey the order. */
    giveOrders(evaluator) {
        // TODO remove this evaluator after the check
        this.addEvaluator(evaluator);
    }


    addGoal(goal) {
        const type = goal.getType();
        this.dbg(`addGoal() ${type}`);
        if (!this.isGoalPresent(type)) {
            // this.removeAllSubGoals();
            this.addSubGoal(goal);
            if (debug.enabled) {
                console.log('Actor subgoals are now: '
                    + this.subGoals.map(g => g.getType()));
            }
        }
    }

}
GoalsTop.ThinkBasic = GoalThinkBasic;

class GoalThinkCommander extends GoalThinkBasic {

    constructor(actor) {
        super(actor);
        this.setType('GoalThinkCommander');

        this.bias.winBattle = 0.7;
        this.bias.retreat = 0.3;

        const winBattleEval = new EvaluatorsBattle.WinBattle(
            this.bias.winBattle);
        this.evaluators.push(winBattleEval);

        const retreatEval = new EvaluatorsBattle.Retreat(this.bias.retreat);
        this.evaluators.push(retreatEval);
    }

}
GoalsTop.ThinkCommander = GoalThinkCommander;

module.exports = GoalsTop;
