
import dbg from 'debug';
const debug = dbg('bitn:JobSchedule');

import {BBox} from './bbox';
import {ISchedEntry, EvaluatorTuple} from './interfaces';
import {processNeed} from './needs-hierarchy';
import {Needs} from '../data/needs';

type SentientActor = import('./actor').SentientActor;

/* Wrapper around ISchedEntry which creates the constraint
 * functions. */
export class SchedEntry {

    public static create(entry: ISchedEntry): SchedEntry {
        return new SchedEntry(entry);
    }

    public entry: ISchedEntry;
    constructor(entry: ISchedEntry) {
        entry.needs.forEach(need => {
            if (need.constr) {
                processNeed(need);
            }
        });
        this.entry = entry;
    }
}

const testSched1: ISchedEntry = {
    from: 0 * 60, to: 12 * 60,
    in: {bbox: new BBox(0, 0, 9, 9), levelID: 0},
    needs: [
        Needs.Rest
    ]
};

const testSched2: ISchedEntry = {
    from: 12 * 60, to: 24 * 60,
    in: {bbox: new BBox(70, 20, 79, 27), levelID: 0},
    needs: [
        Needs.FindWeapon
    ]
};

/* Models a job schedule for an actor. Each schedule consists of certain needs
 * that are triggered during certain time of day. */
export class JobSchedule {

    public entries: SchedEntry[];
    protected name: string;
    protected _debug: boolean;

    constructor(name: string) {
        this.name = name;
        this.entries = [];
        this.addEntry(testSched1);
        this.addEntry(testSched2);
        this._debug = debug.enabled;
        this._debug = true;
    }

    public setDebug(enable: boolean): void {
        this._debug = enable;
    }

    public dbg(...args: any[]): void {
        if (this._debug) {
            console.log(`[${this.name}`, ...args);
        }
    }

    /* Adds one entry into job schedule. */
    public addEntry(entry: ISchedEntry): void {
        this.entries.forEach((e: SchedEntry) => {
            this.checkOverlap(entry, e.entry);
        });
        this.entries.push(new SchedEntry(entry));
    }

    public getCurrentNeeds(actor: SentientActor, timeOfDay: number): EvaluatorTuple[] {
        const entry: ISchedEntry = this.getCurrEntry(timeOfDay)!;
        const evals: EvaluatorTuple[] = [];
        if (!entry) {
            // TODO should this raise an error
            return evals;
        }

        if (entry.in) {
            // TODO check we're in correct place with levelID also
            const bbox = entry.in.bbox;
            if (!bbox.hasXY(actor.getX(), actor.getY())) {
                const xy = bbox.getRandXY();
                evals.push(['FollowPath', 1.0, {xy, isOneShot: true}]);

                if (this._debug) {
                    const msg = `${actor.getX()},${actor.getY()} -> ${xy}`;
                    this.dbg('Added one shot entry to FollowPath ' + msg);
                }
                return evals;
            }
        }

        const {needs} = entry;
        // TODO this is copy-paste from NeedsHierarchy, and
        // same code should be reused
        for (let i = 0; i < needs.length; i++) {
            const need = needs[i];
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
        return evals;
    }

    public getCurrEntry(timeOfDay:number): ISchedEntry | null {
        for (let i = 0; i < this.entries.length; i++) {
            const e: ISchedEntry = this.entries[i].entry;
            if (e.from < e.to) {
                if (timeOfDay >= e.from && timeOfDay <= e.to) {
                    if (this._debug) {
                        this.dbg('Found entry:', e);
                    }
                    return e;
                }
            }
            else {
                if (timeOfDay >= e.from || timeOfDay <= e.to) {
                    this.dbg('Found entry:', e);
                    return e;
                }
            }
        }
        return null;
    }

    public checkOverlap(entry: ISchedEntry, e: ISchedEntry): void {
        if (e.to < e.from) {
            if (entry.to < entry.from) {
                // Special case
            }
            else {
                // Special case
            }
        }
        else {
            if (entry.to < entry.from) {
                // Special case
            }
            else {
                // TODO
            }
        }
    }

}
