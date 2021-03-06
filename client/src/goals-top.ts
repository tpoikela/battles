
/* This file contains the top-level goals for actors. */

import RG from './rg';
import {Goal, GoalStatus} from './goals';
import {Random} from './random';

import {Evaluator, EvaluatorBase, EvaluatorOrders} from './evaluators';
import {EvaluatorsBattle} from './evaluators-battle';
const debug = require('debug')('bitn:goals-top');

const {
    GOAL_COMPLETED,
    GOAL_INACTIVE,
    GOAL_FAILED
} = GoalStatus;

const RNG = Random.getRNG();

export const GoalsTop: any = {};

interface IBiasMap {
    [key: string]: number;
}

//---------------------------------------------------------------------------
// TOP-LEVEL GOALS
//---------------------------------------------------------------------------

/* Base class for all top-level goals. Includes evaluator logic and goal
 * arbitration.
 */
export class GoalTop extends Goal.Base {

    protected evaluators: EvaluatorBase[];

    constructor(actor) {
        super(actor);
        this.setType('GoalTop');
        this.evaluators = [];
    }

    public removeEvaluators(): void {
        this.evaluators = [];
    }

    public addEvaluator(evaluator: EvaluatorBase): void {
        this.evaluators.push(evaluator);
    }

    public activate(): void {
        this.arbitrate();
    }

    public getEvaluator(type: string): EvaluatorBase {
        return this.evaluators.find(e => e.getType() === type);
    }

    public process(): GoalStatus {
        this.activateIfInactive();
        const status = this.processSubGoals();
        if (status === GOAL_COMPLETED || status === GOAL_FAILED) {
            this.dbg(`process() COMPL/FAILED got status ${status}`);
            return GOAL_INACTIVE;
        }
        this.removeFinishedOrFailed();
        this.dbg(`process() got status ${status}`);
        return status;
    }

    public setBias(biases: IBiasMap): void {
        Object.keys(biases).forEach(bias => {
            const evaluator = this.evaluators.find(e => e.getType() === bias);
            if (evaluator) {
                evaluator.setBias(biases[bias]);
            }
            else {
                const list = this.evaluators.map(e => e.getType());
                const msg = `Bias ${bias} not matching any evaluator: ${list}`;
                RG.warn('GoalTop', 'setBias', msg);
            }
        });
    }

    public toJSON(): any {
        const evals = [];
        this.evaluators.forEach(ev => {
            // Orders difficult to serialize as it can contain reference to any
            // arbitrary goal (can be top-level goal). That would require tons
            // of object refs, and it's a lot of work
            if (ev.getType() !== 'Orders') {
                evals.push(ev.toJSON());
            }
        });
        return {
            type: this.getType(),
            evaluators: evals
        };
    }

    protected arbitrate(): void {
        this.dbg('arbitrate() started');
        if (this.evaluators.length === 0) {
            RG.err('GoalTop', 'arbitrate',
                `No evaluators in ${this.getType}, actor: ${this.actor}`);
        }
        let bestRated = 0;
        let chosenEval = null;

        const numEvals = this.evaluators.length;
        for (let i = 0; i < numEvals; i++) {
            const evaluator = this.evaluators[i];
            const desirability = evaluator.calculateDesirability(this.actor);
            if (bestRated < desirability || chosenEval === null) {
                chosenEval = evaluator;
                bestRated = desirability;
            }
        }

        if (chosenEval) {
            chosenEval.setActorGoal(this.actor);
        }
        else {
            RG.err('GoalTop', 'arbitrate',
                'No next goal found');
        }
        this.dbg('arbitrate() finished');
    }

}
GoalsTop.Top = GoalTop;

//---------------------------------------------------------------------------
/* Top-level goal for actors. Arbitrates each turn with a number of lower level
 * goals. */
//---------------------------------------------------------------------------
export class ThinkBasic extends GoalTop {

    public bias: {[key: string]: number};

    constructor(actor) {
        super(actor);
        this.setType('ThinkBasic');
        const [lowRange, hiRange] = [0.5, 1.5];

        this.bias = {
            attack: RNG.getUniformRange(lowRange, hiRange),
            explore: RG.BIAS.Explore,
            flee: RG.BIAS.Flee,
            order: RG.BIAS.Order,
            patrol: RG.BIAS.Patrol
        };

        this.updateEvaluators();
    }

    public updateEvaluators() {
        this.removeEvaluators();
        this.evaluators.push(new Evaluator.AttackActor(this.bias.attack));
        this.evaluators.push(new Evaluator.Flee(this.bias.flee));
        this.evaluators.push(new Evaluator.Explore(this.bias.explore));
    }

    /* Can be used to "inject" goals for the actor. The actor uses
     * Evaluator.Orders to check if it will obey the order. */
    public giveOrders(evaluator) {
        // TODO remove this evaluator after the check
        this.dbg('Received an order!!', evaluator);
        this.addEvaluator(evaluator);
    }

    /* Clears the given orders. Useful if a new order needs to be issued to
     * override the existing one. */
    public clearOrders() {
        const orders = this.evaluators.filter(ev => ev.isOrder());
        orders.forEach((order) => {
            const evOrder = order as EvaluatorOrders;
            if (evOrder.goal.isActive()) {
                evOrder.goal.terminate();
            }
            const index = this.evaluators.indexOf(evOrder);
            this.evaluators.splice(index, 1);
        });
    }

    public addGoal(goal) {
        const type = goal.getType();
        this.dbg(`addGoal() ${type}`);
        if (!this.isGoalPresent(type)) {
            this.removeSubGoalsOfType(type);
            this.addSubGoal(goal);
            if (debug.enabled) {
                RG.log('Actor subgoals are now: '
                    + this.subGoals.map(g => g.getType()));
            }
        }
    }

}
GoalsTop.ThinkBasic = ThinkBasic;

/* Top-level goal for spell casters. */
export class ThinkSpellcaster extends ThinkBasic {

    constructor(actor) {
        super(actor);
        this.setType('ThinkSpellcaster');

        this.bias.castSpell = 1.0;
        this.evaluators.push(new Evaluator.CastSpell(this.bias.castSpell));
    }

}
GoalsTop.ThinkSpellcaster = ThinkSpellcaster;

/* Top goal used by commanders in battles. */
export class ThinkCommander extends ThinkBasic {

    constructor(actor) {
        super(actor);
        this.setType('ThinkCommander');

        this.bias.attack = 0.1;
        this.bias.winBattle = 0.8;
        this.bias.retreat = 0.3;
        this.updateEvaluators();
    }

    public updateEvaluators() {
        super.updateEvaluators();
        const winBattleEval = new EvaluatorsBattle.WinBattle(
            this.bias.winBattle);
        this.evaluators.push(winBattleEval);

        const retreatEval = new EvaluatorsBattle.Retreat(this.bias.retreat);
        this.evaluators.push(retreatEval);
    }

}
GoalsTop.ThinkCommander = ThinkCommander;

