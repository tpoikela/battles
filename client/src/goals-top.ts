
/* This file contains the top-level goals for actors. */

import RG from './rg';
import {GoalBase, Goal, GoalStatus, statusToString} from './goals';
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
export class GoalTop extends GoalBase {

    protected evaluators: EvaluatorBase[];

    constructor(actor) {
        super(actor);
        this.setType('GoalTop');
        this.evaluators = [];
    }

    public removeEvaluators(): void {
        this.evaluators = [];
    }

    public removeEvaluatorsByType(type: string): void {
        this.evaluators = this.evaluators.filter(ee => (
            ee.getType() !== type
        ));
    }

    public addEvaluator(evaluator: EvaluatorBase): void {
        this.evaluators.push(evaluator);
    }

    public addEvalByName(name: string, bias: number): void {
        const newEval = new Evaluator[name](bias);
        this.evaluators.push(newEval);
    }

    public hasEvalType(name: string): boolean {
        const idx = this.evaluators.findIndex(ee => (
            ee.type === name
        ));
        return idx >= 0;
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
            if (this._debug) {
                const statStr = statusToString(status);
                this.dbg(`process() COMPL/FAILED got status ${statStr}`);
            }
            return GOAL_INACTIVE;
        }
        this.removeFinishedOrFailed();
        this.dbg(`process() got status ${statusToString(status)}`);
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
        const evals: any = [];
        this.evaluators.forEach(ev => {
            // Orders difficult to serialize as it can contain reference to any
            // arbitrary goal (can be top-level goal). That would require tons
            // of object refs, and it's a lot of work
            if (ev.getType() !== 'Orders' || ev.getType() !== 'UseSkill') {
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
        const [lowRange, hiRange] = [0.75, 1.5];

        this.bias = {
            attack: RNG.getUniformRange(lowRange, hiRange),
            explore: RG.BIAS.Explore,
            flee: RG.BIAS.Flee,
            order: RG.BIAS.Order,
            patrol: RG.BIAS.Patrol
        };

        this.updateEvaluators();
    }

    public updateEvaluators(): void {
        this.removeEvaluators();
        this.evaluators.push(new Evaluator.AttackActor(this.bias.attack));
        this.evaluators.push(new Evaluator.Flee(this.bias.flee));
        this.evaluators.push(new Evaluator.Explore(this.bias.explore));
    }

    /* Can be used to "inject" goals for the actor. The actor uses
     * Evaluator.Orders to check if it will obey the order. */
    public giveOrders(evaluator: EvaluatorOrders): void {
        // TODO remove this evaluator after the check
        this.dbg('Received an order!!' + JSON.stringify(evaluator));
        this.addEvaluator(evaluator);
    }

    /* Clears the given orders. Useful if a new order needs to be issued to
     * override the existing one. */
    public clearOrders(): void {
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

    public addGoal(goal: GoalBase): void {
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

