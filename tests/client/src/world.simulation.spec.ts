
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {WorldSimulation} from '../../../client/src/world.simulation';
import {DayManager} from '../../../client/src/day-manager';
import {SeasonManager} from '../../../client/src/season-manager';


describe('DayManager', () => {

    it('keeps track of phases of day', () => {
        const dayMan = new DayManager();
        const startPhase = dayMan.getCurrPhase();
        while (!dayMan.phaseChanged()) {
            dayMan.update();
        }
        const newPhase = dayMan.getCurrPhase();
        expect(newPhase).to.not.equal(startPhase);

        while (!dayMan.dayChanged()) {
            dayMan.update();
        }
        const firstPhase = dayMan.getCurrPhase();
        expect(firstPhase).to.equal(RG.DAY.DAWN);
    });

});

describe('SeasonManager', () => {
    it('it keeps track of season, weather and month', () => {
        const seasonMan = new SeasonManager();
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
    it('updates the world state on specific intervals', () => {
        const wsim = new WorldSimulation();
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
