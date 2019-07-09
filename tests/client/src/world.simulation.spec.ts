
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {WorldSimulation} from '../../../client/src/world.simulation';
import {DayManager} from '../../../client/src/day-manager';
import {SeasonManager} from '../../../client/src/season-manager';
import {EventPool} from '../../../client/src/eventpool';

class Listener {

    public hasNotify: boolean;
    protected notified: boolean;

    constructor() {
        this.hasNotify = true;
        this.notified = false;
    }

    public notify(evt: any): void {
        this.notified = true;
    }

    public reset(): void {
        this.notified = false;
    }
}

describe('DayManager', () => {

    let pool = null;
    let listener = null;
    beforeEach(() => {
        pool = new EventPool();
        listener = new Listener();
    });

    it('keeps track of phases of day', () => {
        pool.listenEvent(RG.EVT_DAY_PHASE_CHANGED, listener);
        const dayMan = new DayManager(pool);
        const startPhase = dayMan.getCurrPhase();
        while (!dayMan.phaseChanged()) {
            dayMan.update();
        }
        const newPhase = dayMan.getCurrPhase();
        expect(newPhase).to.not.equal(startPhase);
        expect(listener.notified).to.equal(true);
        listener.reset();
        expect(listener.notified).to.equal(false);

        pool.removeListener(listener);
        pool.listenEvent(RG.EVT_DAY_CHANGED, listener);

        while (!dayMan.dayChanged()) {
            dayMan.update();
        }
        const firstPhase = dayMan.getCurrPhase();
        expect(firstPhase).to.equal(RG.DAY.DAWN);
        expect(listener.notified).to.equal(true);
    });

});

describe('SeasonManager', () => {
    let pool = null;
    beforeEach(() => {
        pool = new EventPool();
    });

    it('it keeps track of season, weather and month', () => {
        const seasonMan = new SeasonManager(pool);
        const startSeason = seasonMan.getSeason();
        while (!seasonMan.monthChanged()) {
            seasonMan.update();
        }
        while (!seasonMan.seasonChanged()) {
            seasonMan.update();
        }
        const newSeason = seasonMan.getSeason();
        expect(startSeason).to.not.equal(newSeason);

        while (!seasonMan.yearChanged()) {
            seasonMan.update();
        }
        const startSeason2 = seasonMan.getSeason();
        expect(startSeason2).to.equal(startSeason);

    });
});

describe('WorldSimulation', () => {
    let pool = null;
    beforeEach(() => {
        pool = new EventPool();
    });

    it('updates the world state on specific intervals', () => {
        const wsim = new WorldSimulation(pool);
        wsim.update();

        const startSeason = wsim.getSeason();
        expect(startSeason).to.equal(RG.SEASON.AUTUMN);
        wsim.setUpdateRates(1.0);

        // Simulate until we get season changed
        while (!wsim.changed('season')) {
            wsim.update();
        }
        const newSeason = wsim.getSeason();
        expect(newSeason).to.not.equal(startSeason);


    });
});
