/* Manages time of day. */
import RG from './rg';
import {EventPool} from './eventpool';

interface DayEntry {
    from: number;
    to: number;
    visibility: number;
}

const phasesOfDay: {[key: string]: DayEntry} = {
    NIGHT: {from: 22 * 60, to: 5 * 60, visibility: -3},
    DAWN: {from: 5 * 60, to: 7 * 60, visibility: -1},
    MORNING: {from: 7 * 60, to: 11 * 60, visibility: 0},
    NOON: {from: 11 * 60, to: 13 * 60, visibility: 0},
    AFTERNOON: {from: 13 * 60, to: 18 * 60, visibility: 0},
    EVENING: {from: 18 * 60, to: 20 * 60, visibility: -1},
    DUSK: {from: 20 * 60, to: 22 * 60, visibility: -2},
};

const MAX_TIME_OF_DAY: number = 24 * 60;

/* Simple day manager to keep track of time of day and phases of the day. */
export class DayManager {

    public static fromJSON(json: any): DayManager {
        const dayMan = new DayManager();
        dayMan._currPhase = json.currPhase;
        dayMan._timeOfDayMins = json.timeOfDayMins;
        dayMan._updateRate = json.updateRate;
        dayMan._dayChanged = json.dayChanged;
        dayMan._phaseChanged = json.phaseChanged;
        return dayMan;
    }

    public pool: EventPool;
    protected _currPhase: string;
    protected _updateRate: number;
    protected _dayChanged: boolean;
    protected _phaseChanged: boolean;
    protected _timeOfDayMins: number;

    constructor(pool?: EventPool) {
        this._currPhase = RG.DAY.MORNING;
        this._updateRate = 5; // This affects how quickly time goes
        this._timeOfDayMins = 12 * 60;
        this._dayChanged = false;
        this._phaseChanged = false;
        if (pool) {
            this.pool = pool;
        }
    }

    public setUpdateRate(rate: number): void {
        if (rate >= 1) {
            this._updateRate = rate;
        }
        else {
            RG.warn('DayManager', 'setUpdateRate',
                `Rate must be >= 1. Got ${rate}`);
        }
    }

    public getTimeMins(): number {
        return this._timeOfDayMins;
    }

    public update(): void {
        const dayEntry: DayEntry = phasesOfDay[this._currPhase];
        this._dayChanged = false;
        this._phaseChanged = false;
        this._timeOfDayMins += this._updateRate;

        if (this._timeOfDayMins > MAX_TIME_OF_DAY) {
            this._timeOfDayMins = 0;
        }

        if (this._timeOfDayMins >= dayEntry.to) {
            this.nextPhase();
            this._phaseChanged = true;
        }
    }

    /* Returns true if last update() changed the day. */
    public dayChanged(): boolean {
        return this._dayChanged;
    }

    /* Returns true if last update() changed phase of the day. */
    public phaseChanged(): boolean {
        return this._phaseChanged;
    }

    /* Returns current phase (ie NIGHT/DAY etc). */
    public getCurrPhase(): string {
        return this._currPhase;
    }


    public toJSON(): any {
        return {
            currPhase: this._currPhase,
            timeOfDayMins: this._timeOfDayMins,
            updateRate: this._updateRate,
            dayChanged: this._dayChanged,
            phaseChanged: this._phaseChanged
        };
    }

    public setPool(pool: EventPool): void {
        this.pool = pool;
    }

    public toString(): string {
        return (`Curr phase: ${this._currPhase}, timeOfDay: ${this._timeOfDayMins},`
            + (this._phaseChanged ? ' *PHASE CHANGED*' : '')
            + (this._dayChanged ? ' *DAY CHANGED*' : '')
        );
    }

    protected nextPhase(): void {
        const phases = Object.keys(phasesOfDay);
        const currIndex= phases.indexOf(this._currPhase);
        let nextIndex = currIndex + 1;
        if (nextIndex >= phases.length) {
            nextIndex = 0;
            this.pool.emitEvent(RG.EVT_DAY_CHANGED, {
                prevPhase: this._currPhase,
                nextPhase: phases[nextIndex]
            });
            this._dayChanged = true;
        }
        this.pool.emitEvent(RG.EVT_DAY_PHASE_CHANGED, {
            prevPhase: this._currPhase,
            nextPhase: phases[nextIndex]
        });
        this._currPhase = phases[nextIndex];
    }

}
