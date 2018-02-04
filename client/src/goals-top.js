
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
        const fleeBias = RG.RAND.getUniformRange(lowRange, hiRange);
        const exploreBias = RG.RAND.getUniformRange(lowRange, hiRange);
        console.log([attackBias, fleeBias, exploreBias]);

        this.evaluators.push(new Evaluator.AttackActor(attackBias));
        this.evaluators.push(new Evaluator.Flee(0.2));
        this.evaluators.push(new Evaluator.Explore(exploreBias));
    }

    activate() {
        this.arbitrate();
    }

    arbitrate() {
        let bestRated = 0;
        let chosenEval = null;

        this.evaluators.forEach(evaluator => {
            const desirability = evaluator.calculateDesirability(this.actor);
            console.log(`evals best ${bestRated}, curr: ${desirability}`);
            if (bestRated < desirability) {
                chosenEval = evaluator;
                bestRated = desirability;
            }
        });

        if (chosenEval) {
            chosenEval.setGoal(this.actor);
        }

        /*
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();

        // Arbitrate goal based on what's seen

        // If enemy seen
        const enemyCell = brain.findEnemyCell(seenCells);
        if (enemyCell) {
            const targetActor = enemyCell.getActors()[0];
            if (this.tooWounded()) {
                const fleeGoal = new Goal.FleeFromActor(this.actor, targetActor);
                this.addGoal(fleeGoal);
            }
            else {
                debug(`${this.getType()} enemy is seen`);
                const attackGoal = new Goal.AttackActor(this.actor, targetActor);
                this.addGoal(attackGoal);
            }
        }
        else {
            const exploreGoal = new Goal.Explore(this.actor);
            this.addGoal(exploreGoal);
        }
        */

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
                this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            case 'GoalFleeFromActor': if (!this.isGoalPresent(type)) {
                this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            default: {
                console.log('No type ' + type);
            }
        }
    }

    queueGoal(goal) {
        this.subGoals.push(goal);
    }

}
GoalsTop.ThinkBasic = GoalThinkBasic;

module.exports = GoalsTop;
