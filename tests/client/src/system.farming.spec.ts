

import chai from 'chai';
import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';

import {SentientActor } from '../../../client/src/actor';
import {System} from '../../../client/src/system';
import {FactoryLevel} from '../../../client/src/factory.level';
import {Entity} from '../../../client/src/entity';
import {ObjectShell} from '../../../client/src/objectshellparser';
import {WS_EVENT} from '../../../client/src/world.simulation';
import * as Component from '../../../client/src/component';

const expect = chai.expect;
chai.use(chaiBattles);

const parser = ObjectShell.getParser();
const factLevel = new FactoryLevel();

describe('System.Farming', () => {

    let useSystem = null;
    let effSystem = null;
    let farmSystem = null;
    let systems = null;
    let farmer = null;
    let level = null;

    beforeEach(() => {
        const pool = Entity.getPool();
        farmSystem = new System.Farming(['Farming', 'WorldSimEvent'], pool);
        useSystem = new System.BaseAction(['UseItem'], pool);
        effSystem = new System.Effects(['Effects'], pool);
        systems = [useSystem, farmSystem, effSystem];
        farmer = new SentientActor('super farmer');
        level = factLevel.createLevel('arena', 20, 20);
        level.addActor(farmer, 1, 1);
    });

    it('handles tilling farming action', () => {
        const hoe = parser.createItem('hoe');
        farmer.getInvEq().addItem(hoe);
        const seeds = parser.createItem('wheat seeds');
        seeds.setCount(2);
        farmer.getInvEq().addItem(seeds);

        const cell = farmer.getCell();

        for (let i = 0; i < 2; i++) {
            hoe.useItem({target: farmer.getCell()});
            RGTest.updateSystems(systems);
        }
        expect(cell.getElements()).to.have.length(1);

        seeds.useItem({target: farmer.getCell()});
        RGTest.updateSystems(systems);

        // Second use should not affect anything
        seeds.useItem({target: farmer.getCell()});
        RGTest.updateSystems(systems);
        expect(cell.getElements()).to.have.length(2);

        // Simulate phase changing to let the wheat grow
        for (let i = 0; i < 50; i++) {
            const simEvent = new Component.WorldSimEvent();
            simEvent.setEventType(WS_EVENT.PHASE_CHANGED);
            farmer.add(simEvent);
            RGTest.updateSystems(systems);
            farmer.remove(simEvent);
        }

        // We should have wheat now
        expect(cell.hasItems()).to.equal(true);
        const wheatItem = cell.getItems()[0];
        expect(wheatItem.getName()).to.equal('Wheat');
        expect(cell.getElements()).to.have.length(1);
    });

});
