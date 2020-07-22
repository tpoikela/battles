
import dbg from 'debug';
const debug = dbg('bitn:Needs');

import RG from './rg';
import {Evaluator} from './evaluators';
import {RandWeights} from './interfaces';
import {Random} from './random';

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
    FindFood: 1.0,
    FindWeapon: 1.0,
    Rest: 1.0
};

type EvalPair = [string, number];

/* Needs hierarchy does not have actual state. The state of needs is based on
 * components attached to an actor (ie Hunger/Health/Needs), etc. This object
 * handles mapping needs to different evaluators. */
export class NeedsHierarchy {

    public weightedRand: boolean;
    protected actor: SentientActor;
    protected _debug: boolean;

    constructor(actor: SentientActor) {
        this.actor = actor;
        this.weightedRand = true;
        this._debug = debug.enabled;
    }

    public setDebug(debugEn: boolean): void {
        this._debug = debugEn;
    }

    public process(goal: GoalTop): void {
        const evals: EvalPair[] = this.getEvaluators(goal);

        // Either inject only one evaluator, or inject several based on all
        // different needs
        if (this.weightedRand && evals.length > 0) {
            const weights: RandWeights = {};
            evals.forEach((evalPair: EvalPair) => {
                const [name, evalBias] = evalPair;
                if (!weights[name]) {
                    weights[name] = evalBias;
                }
                else {
                    weights[name] += evalBias;
                }
            });

            const evalName = RNG.getWeighted(weights);
            const bias = weights[evalName];
            this.dbg(`Chose need [${evalName}], bias: ${bias}`);
            if (Evaluator[evalName]) {
                goal.addEvaluator(new Evaluator[evalName](bias));
            }
            else {
                // Use generic evaluator as no specific one is available
                goal.addEvaluator(Evaluator.create(evalName, bias));
            }
        }
        else {
            // Simply add each evaluator
            evals.forEach((evalPair: EvalPair) => {
                const evalName = evalPair[0];
                goal.addEvaluator(new Evaluator[evalName](BIAS[evalName]));
            });
        }
    }

    /* Returns the evaluators required to satisfy actors needs. */
    protected getEvaluators(goal: GoalTop): EvalPair[] {
        const actor = this.actor;
        const health = actor.get('Health');
        const evals: EvalPair[] = [];
        const inv: Inventory = this.actor.getInvEq();

        // Health checks
        if (health.propLeft() < 0.2) {
            evals.push(['Flee', BIAS.Flee]);
        }
        else if (health.propLeft() < 0.5) {
            evals.push(['Rest', 0.5]);
        }

        if (actor.has('Hunger')) {
            if (actor.get('Hunger').isStarving()) {
                evals.push(['FindFood', BIAS.FindFood]);
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

        // If out of missiles, and has weapon, find missiles

        // If no weapon, find one
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
                evals.push(['Equip', BIAS.Equip]);
            }
            return evals;
        }
        else {
            // Find better weapon..
        }

        // If no equipment, find some


        // If not close to ally/friend, find one

        return evals;
    }

    protected dbg(msg: string): void {
        if (this._debug) {
            const name = this.actor.getName();
            const id = this.actor.getID();
            debug(`@${id} ${name} |${msg}|`);
        }
    }

}

