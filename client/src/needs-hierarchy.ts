
import dbg from 'debug';
const debug = dbg('bitn:Needs');

import RG from './rg';
import {Evaluator} from './evaluators';
import {RandWeights, IConstraint} from './interfaces';
import {Random} from './random';
import {Constraints} from './constraints';
import {JobSchedule} from './job-schedule';

debug.enabled = true;

type SentientActor = import('./actor').SentientActor;
type Inventory = import('./inv').Inventory;
type GoalTop = import('./goals-top').GoalTop;

const RNG = Random.getRNG();

/*
const needToEvalMap: any = {
    Hunger: 'FindFood'
};
*/

const BIAS: {[key: string]: number} = {
    Equip: 1.0,
    Flee: 1.5,
    FindAmmo: 1.0,
    FindMissile: 1.0,
    FindFood: 1.0,
    FindWeapon: 1.0,
    Rest: 1.0
};

export interface INeedEntry {
    last?: boolean;
    only?: boolean;
    constr: IConstraint;
    func?: (args: any) => boolean;
    evalName: string;
    bias: number;
}

/* Passed as props to Evaluator object. */
interface EvalArgs {
    isOneShot?: boolean;
    ammoType?: string;
}

export type EvalTuple = [string, number, EvalArgs?];

const createConstr = new Constraints();

/* All needs can be added here. This is data-driven
 * approach to defining the needs without any
 * functions. */
export const Needs: {[key: string]: INeedEntry} = {};

const needHealth: INeedEntry = {
    constr: {
        op: '<', value: 0.2, comp: ['Health', 'propLeft']
    },
    evalName: 'Flee', bias: BIAS.Flee
};
Needs.Health = needHealth;
const needRest: INeedEntry = {
    constr: {
        op: '<', value: 0.5, comp: ['Health', 'propLeft']
    },
    evalName: 'Rest', bias: BIAS.Rest
};
Needs.Rest = needRest;

const needHunger: INeedEntry = {
    constr: {
        op: 'eq', value: true, comp: ['Hunger', 'isStarving']
    },
    evalName: 'FindFood', bias: BIAS.FindFood
};
Needs.Hunger = needHunger;

/* Needs hierarchy does not have actual state. The state of needs is based on
 * components attached to an actor (ie Hunger/Health/Needs), etc. This object
 * handles mapping needs to different evaluators. */
export class NeedsHierarchy {

    public needs: INeedEntry[];
    public weightedRand: boolean;
    protected actor: SentientActor;
    protected _debug: boolean;
    protected _jobSchedule: JobSchedule;

    constructor(actor: SentientActor) {
        this.actor = actor;
        this.weightedRand = true;
        this._debug = debug.enabled;
        this.needs = [];

        // Order is important, especially for last/only flags
        this.addNeedWithEval(needHealth);
        this.addNeedWithEval(needRest);
        this.addNeedWithEval(needHunger);
    }

    public setDebug(debugEn: boolean): void {
        this._debug = debugEn;
    }

    public process(goal: GoalTop, turnArgs): void {
        const evals: EvalTuple[] = this.getEvaluators(goal);
        const {timeOfDay} = turnArgs;
        this.processJobSchedule(evals, timeOfDay);

        // Either inject only one evaluator, or inject several based on all
        // different needs
        if (this.weightedRand && evals.length > 0) {
            const weights: RandWeights = {};
            const evalArgs: any = {};
            evals.forEach((evalPair: EvalTuple) => {
                const [name, evalBias, args] = evalPair;
                if (!weights[name]) {
                    weights[name] = evalBias;
                }
                else {
                    weights[name] += evalBias;
                }
                // Combine flags set for different evaluators
                if (args) {
                    if (evalArgs[name]) {
                        evalArgs[name] = Object.assign(evalArgs[name], args);
                    }
                    else {
                        evalArgs[name] = args;
                    }
                }
            });

            const evalName = RNG.getWeighted(weights);
            const bias = weights[evalName];
            this.dbg(`Chose need [${evalName}], bias: ${bias}`);

            let evalObj: any = null;
            if (Evaluator[evalName]) {
                evalObj = new Evaluator[evalName](bias);
            }
            else {
                // Use generic evaluator as no specific one is available
                evalObj = Evaluator.create(evalName, bias);
            }
            goal.removeEvaluatorsByType(evalName); // Prevent duplicates
            goal.addEvaluator(evalObj);
            if (evalArgs[evalName]) {
                Object.keys(evalArgs[evalName]).forEach(key => {
                evalObj[key] = evalArgs[evalName][key];
                });
            }
        }
        else {
            // Simply add each evaluator
            evals.forEach((evalPair: EvalTuple) => {
                const evalName = evalPair[0];
                const evalObj = new Evaluator[evalName](BIAS[evalName]);
                goal.addEvaluator(evalObj);
                if (evalPair[2] && evalPair[2].isOneShot) {
                    evalObj.isOneShot = true;
                }
            });
        }
    }

    public addNeedWithEval(need: INeedEntry): void {
        if (!need.func) {
            need.func = createConstr.getConstraints(need.constr);
        }
        this.needs.push(need);
    }


    public processJobSchedule(evals, timeOfDay): void {
        this._jobSchedule.getCurrentNeeds(evals, timeOfDay);
    }

    /* Returns the evaluators required to satisfy actors needs. */
    protected getEvaluators(goal: GoalTop): EvalTuple[] {
        const actor = this.actor;
        const evals: EvalTuple[] = [];
        const inv: Inventory = this.actor.getInvEq();

        for (let i = 0; i < this.needs.length; i++) {
            const need = this.needs[i];
            if (need.func(this.actor)) {
                const evalPair: EvalTuple = [need.evalName, need.bias];

                // Use only current eval if only flag is set
                if (need.only) {
                    return [evalPair];
                }

                evals.push(evalPair);
                // Stop iteration if last flag is given
                if (need.last) {return evals;}
            }
        }


        // Spellcasters may need some resting
        if (actor.has('SpellPower')) {
            // TODO find potions or just rest
            // goal.addEvaluator(new Evaluator.Rest(BIAS.Rest));
            if (actor.get('SpellPower').propLeft() < 0.2) {
                evals.push(['Rest', 0.5 * BIAS.Rest]);
            }
        }


        // If no weapon, find one
        this.weaponNeeds(goal, evals);

        // If no equipment, find some

        // If not close to ally/friend, find one

        // If out of missiles, and has weapon, find missiles
        this.findAmmo(evals);

        return evals;
    }


    protected findAmmo(evals: EvalTuple[]): void {
        const inv: Inventory = this.actor.getInvEq();
        const missWeapon = inv.getMissileWeapon();
        const miss = inv.getMissile();
        if (missWeapon) {
            const ammoType = missWeapon.getType();
            evals.push(['FindAmmo' , BIAS.FindAmmo, {ammoType}]);
        }
        else if (!miss) {
            const items = inv.getInventory().getItems();
            const missile = items.find(i => i.getType() === RG.ITEM.MISSILE);
            if (!missile) {
                evals.push(['FindMissile' , BIAS.FindMissile]);
            }
            else {
                evals.push(['Equip', BIAS.Equip, {isOneShot: true}]);
            }
        }
        else {
            evals.push(['FindMissile' , BIAS.FindMissile]);
        }
    }

    protected weaponNeeds(goal, evals: EvalTuple[]): void {
        const inv: Inventory = this.actor.getInvEq();

        const weapon = inv.getWeapon();
        if (!weapon) {
            this.dbg('No weapon found. Checking inventory');
            const items = inv.getInventory().getItems();
            const wpn = items.find(i => i.getType() === RG.ITEM.WEAPON);
            // Try to equip something
            // TODO check inventory for weapons and equip
            if (!wpn) {
                this.dbg('No weapons in inv. Trying to find one');
                evals.push(['FindWeapon', BIAS.FindWeapon]);
            }
            else {
                this.dbg('Found Weapon in inv. Trying to equip one');
                goal.removeEvaluatorsByType('FindWeapon');
                evals.push(['Equip', BIAS.Equip, {isOneShot: true}]);
            }
            return;
        }
        else {
            // Find better weapon..
        }
    }

    protected dbg(msg: string): void {
        if (this._debug) {
            const name = this.actor.getName();
            const id = this.actor.getID();
            debug(`@${id} ${name} |${msg}|`);
        }
    }

}

