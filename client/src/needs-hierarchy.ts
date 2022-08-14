
import dbg from 'debug';
const debug = dbg('bitn:Needs');

import RG from './rg';
import {Evaluator} from './evaluators';
import {RandWeights, INeedEntry, EvaluatorTuple} from './interfaces';
import {Random} from './random';
import {Constraints} from './constraints';
import {JobSchedule} from './job-schedule';
import {NEED_BIAS, Needs} from '../data/needs';

type SentientActor = import('./actor').SentientActor;
type Inventory = import('./inv').Inventory;
type GoalTop = import('./goals-top').GoalTop;

const RNG = Random.getRNG();

const createConstr = new Constraints();
export function processNeed(need: INeedEntry): void {
    if (!need.func) {
        need.func = createConstr.getConstraints(need.constr);
    }
};

/* Needs hierarchy does not have actual state. The state of needs is based on
 * components attached to an actor (ie Hunger/Health/Needs), etc. This object
 * handles mapping needs to different evaluators. */
export class NeedsHierarchy {

    public needs: INeedEntry[];
    public weightedRand: boolean;
    protected actor: SentientActor;
    protected _debug: boolean;
    protected _jobSchedule: JobSchedule | null;

    constructor(actor: SentientActor) {
        this.actor = actor;
        this.weightedRand = true;
        this._debug = debug.enabled;
        this.needs = [];

        // Order is important, especially for last/only flags
        this.addNeedWithEval(Needs.Health);
        this.addNeedWithEval(Needs.Rest);
        this.addNeedWithEval(Needs.Hunger);
        if (actor.has('SpellPower')) {
            this.addNeedWithEval(Needs.SpellPower);
        }
        // this.addNeedWithEval(Needs.needWeapon);
        this._jobSchedule = null;
        this.addSchedule(new JobSchedule('testSchedule'));
    }

    public addSchedule(sch: JobSchedule): void {
        this._jobSchedule = sch;
    }

    public addNeedWithEval(need: INeedEntry): void {
        if (!need) {
            RG.err('NeedsHierarchy', 'addNeedWithEval',
                'Tried to add null/undef need');
        }
        processNeed(need);
        this.needs.push(need);
    }


    public setDebug(debugEn: boolean): void {
        this._debug = debugEn;
    }

    public process(goal: GoalTop, turnArgs: any): void {
        const {timeOfDay} = turnArgs;
        const evals: EvaluatorTuple[] = this.getEvaluators(this.actor, timeOfDay);
        this.processJobSchedule(evals, timeOfDay);

        // Either inject only one evaluator, or inject several based on all
        // different needs
        if (this.weightedRand && evals.length > 0) {
            const weights: RandWeights = {};
            const evalArgs: any = {};
            evals.forEach((evalPair: EvaluatorTuple) => {
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
            evals.forEach((evalPair: EvaluatorTuple) => {
                const evalName = evalPair[0];
                const evalObj = new Evaluator[evalName](NEED_BIAS[evalName]);
                goal.addEvaluator(evalObj);
                if (evalPair[2] && evalPair[2].isOneShot) {
                    evalObj.isOneShot = true;
                }
            });
        }
    }


    public processJobSchedule(evals: any[], timeOfDay: number): void {
        if (this._jobSchedule) {
            const newEvals = this._jobSchedule.getCurrentNeeds(this.actor, timeOfDay);
            evals.push(...newEvals);
        }
    }

    /* Returns the evaluators required to satisfy actors needs. */
    protected getEvaluators(actor: SentientActor, timeOfDay): EvaluatorTuple[] {
        const evals: EvaluatorTuple[] = [];

        for (let i = 0; i < this.needs.length; i++) {
            const need: INeedEntry = this.needs[i];
            if (need.func && need.func(actor)) {
                const evalPair: EvaluatorTuple = [need.evalName, need.bias];

                // Use only current eval if only flag is set
                if (need.only) {
                    return [evalPair];
                }

                evals.push(evalPair);
                // Stop iteration if last flag is given
                if (need.last) {return evals;}
            }
            else if (need.script) {
                const scriptEvals: EvaluatorTuple[] = need.script(actor, timeOfDay);
                if (scriptEvals.length > 0) {
                    if (need.only) {
                        return scriptEvals;
                    }
                    evals.push(...scriptEvals);
                    if (need.last) {
                        return evals;
                    }
                }
            }
        }

        // Spellcasters may need some resting
        if (actor.has('SpellPower')) {
            // TODO find potions or just rest
            // goal.addEvaluator(new Evaluator.Rest(NEED_BIAS.Rest));
            if (actor.get('SpellPower').propLeft() < 0.2) {
                evals.push(['Rest', 0.5 * NEED_BIAS.Rest]);
            }
        }


        // If no weapon, find one
        // const weaponEvals = this.weaponNeeds(this.actor);
        // evals.push(...weaponEvals);

        // If no equipment, find some

        // If not close to ally/friend, find one

        // If out of missiles, and has weapon, find missiles
        // const ammoEvals = this.findAmmo(this.actor);
        // evals.push(...ammoEvals);

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

