/* Manages time of day. */
import RG from './rg';
import {EventPool} from './eventpool';

const phasesOfDay = {
    DAWN: {dur: 100, visibility: -1},
    MORNING: {dur: 300},
    NOON: {dur: 300},
    AFTERNOON: {dur: 300},
    EVENING: {dur: 300, visibility: -1},
    DUSK: {dur: 100, visibility: -2},
    NIGHT: {dur: 700, visibility: -3},
};

export class DayManager {

    public static fromJSON(json: any): DayManager {
        const dayMan = new DayManager();
        dayMan._currPhase = json.currPhase;
        dayMan._currPhaseLeft = json.currPhaseLeft;
        dayMan._updateRate = json.updateRate;
        dayMan._dayChanged = json.dayChanged;
        dayMan._phaseChanged = json.phaseChanged;
        return dayMan;
    }

    public pool: EventPool;
    protected _currPhase: string;
    protected _currPhaseLeft: number;
    protected _updateRate: number;
    protected _dayChanged: boolean;
    protected _phaseChanged: boolean;

    constructor(pool?: EventPool) {
        this._currPhase = RG.DAY.MORNING;
        this._currPhaseLeft = phasesOfDay[this._currPhase].dur;
        this._updateRate = 5;
        this._dayChanged = false;
        this._phaseChanged = false;
        this.pool = pool;
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

    public update(): void {
        this._dayChanged = false;
        this._phaseChanged = false;
        this._currPhaseLeft -= this._updateRate;
        if (this._currPhaseLeft <= 0) {
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

    public getCurrPhase(): string {
        return this._currPhase;
    }

    public nextPhase(): void {
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
        this._currPhaseLeft = phasesOfDay[this._currPhase].dur;
    }

    public toJSON(): any {
        return {
            currPhase: this._currPhase,
            currPhaseLeft: this._currPhaseLeft,
            updateRate: this._updateRate,
            dayChanged: this._dayChanged,
            phaseChanged: this._phaseChanged
        };
    }

    public setPool(pool: EventPool): void {
        this.pool = pool;
    }

    public toString(): string {
        return (`Curr phase: ${this._currPhase}, left: ${this._currPhaseLeft},`
            + (this._phaseChanged ? ' *PHASE CHANGED*' : '')
            + (this._dayChanged ? ' *DAY CHANGED*' : '')
        );
    }

}
