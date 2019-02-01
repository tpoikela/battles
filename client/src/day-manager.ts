/* Manages time of day. */
import RG from './rg';

const phasesOfDay = {
    DAWN: {dur: 1.0, visibility: -1},
    MORNING: {dur: 3.0},
    NOON: {dur: 3.0},
    AFTERNOON: {dur: 3.0},
    EVENING: {dur: 3.0, visibility: -1},
    DUSK: {dur: 1.0, visibility: -2},
    NIGHT: {dur: 7.0, visibility: -3},
};

export class DayManager {

    protected _currPhase: string;
    protected _currPhaseLeft: number;
    protected _updateRate: number;
    protected _dayChanged: boolean;
    protected _phaseChanged: boolean;

    constructor() {
        this._currPhase = RG.DAY.MORNING;
        this._currPhaseLeft = phasesOfDay[this._currPhase].dur;
        this._updateRate = 0.05;
        this._dayChanged = false;
        this._phaseChanged = false;
    }

    public setUpdateRate(rate: number): void {
        this._updateRate = rate;
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
            this._dayChanged = true;
        }
        this._currPhase = phases[nextIndex];
        this._currPhaseLeft = phasesOfDay[this._currPhase].dur;
    }

}
