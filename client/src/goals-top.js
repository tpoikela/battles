
/* This file contains the top-level goals for actors. */

const RG = require('./rg');
const Goal = require('./goals');
const Evaluator = require('./evaluators');

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

/* Top-level goal for actors. Arbitrates each turn with a number of lower level
 * goals. */
class GoalThinkBasic extends Goal.Base {

    constructor(actor) {
        super(actor);
        this.evaluators = [];
        const [lowRange, hiRange] = [0.5, 1.5];

        const attackBias = RG.RAND.getUniformRange(lowRange, hiRange);
        // const fleeBias = RG.RAND.getUniformRange(lowRange, hiRange);
        // const exploreBias = RG.RAND.getUniformRange(lowRange, hiRange);
        const patrolBias = 1.0;
        // console.log([attackBias, fleeBias, exploreBias]);

        this.evaluators.push(new Evaluator.AttackActor(attackBias));
        this.evaluators.push(new Evaluator.Flee(0.2));
        // this.evaluators.push(new Evaluator.Explore(exploreBias));
        this.evaluators.push(new Evaluator.Patrol(patrolBias));
    }

    activate() {
        this.arbitrate();
    }

    arbitrate() {
        let bestRated = 0;
        let chosenEval = null;

        this.evaluators.forEach(evaluator => {
            const desirability = evaluator.calculateDesirability(this.actor);
            if (bestRated < desirability) {
                chosenEval = evaluator;
                bestRated = desirability;
            }
        });

        if (chosenEval) {
            chosenEval.setGoal(this.actor);
        }
        else {
            RG.err('GoalThinkBasic', 'arbitrate',
                'No next goal found');
        }

    }

    process() {
        this.activateIfInactive();
        const status = this.processSubGoals();
        if (status === GOAL_COMPLETED || status === GOAL_FAILED) {
            return GOAL_INACTIVE;
        }
        debug(`ThinkBasic process() got status ${status}`);
        return status;
    }


    addGoal(goal) {
        const type = goal.getType();
        debug(`${this.getType()} addGoal() ${type}`);
        switch (type) {
            case 'GoalExplore': if (!this.isGoalPresent(type)) {
                this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            case 'GoalAttackActor': if (!this.isGoalPresent(type)) {
                // this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            case 'GoalFleeFromActor': if (!this.isGoalPresent(type)) {
                this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            case 'GoalPatrol': if (!this.isGoalPresent(type)) {
                this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            default: {
                RG.err('GoalThinkBasic', 'addGoal',
                `No case for goal type |${type}| in switch`);
            }
        }
    }

    queueGoal(goal) {
        this.subGoals.push(goal);
    }

}
GoalsTop.ThinkBasic = GoalThinkBasic;

module.exports = GoalsTop;
