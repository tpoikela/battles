

import {IBBox} from './interfaces';
type EvalTuple = import('./needs-hierarchy').EvalTuple;
type INeedEntry = import('./needs-hierarchy').INeedEntry;

interface SchedEntry {
    from: number;
    to: number;
    in?: {bbox: IBBox, id: number};
    needs: INeedEntry[];
};

export class JobSchedule {

    public entries: SchedEntry[];
    protected name: string;


    constructor(name: string) {
        this.name = name;
        this.entries = [];
    }

    public addEntry(entry: SchedEntry): void {
        this.entries.forEach((e: SchedEntry) => {
            this.checkOverlap(entry, e);
        });
        this.entries.push(entry);
    }

    public getCurrentNeeds(evals: EvalTuple[], timeOfDay: number): void {
        const entry: SchedEntry = this.getCurrEntry(timeOfDay);
        if (entry) {
        }
    }

    public getCurrEntry(timeOfDay:number): SchedEntry | null {
        for (let i = 0; i < this.entries.length; i++) {
            const e: SchedEntry = this.entries[i];
            if (e.from < e.to) {
                if (timeOfDay >= e.from && timeOfDay <= e.to) {
                    return e;
                }
            }
            else {
                if (timeOfDay >= e.from || timeOfDay <= e.to) {
                    return e;
                }
            }
        }
    }

    public checkOverlap(entry: SchedEntry, e: SchedEntry): void {
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
