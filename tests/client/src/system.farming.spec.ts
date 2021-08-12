

import chai from 'chai';
import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';

import {SentientActor } from '../../../client/src/actor';
import {System} from '../../../client/src/system';
import {FactoryLevel} from '../../../client/src/factory.level';
import {Entity} from '../../../client/src/entity';

const expect = chai.expect;
chai.use(chaiBattles);

const factLevel = new FactoryLevel();

describe('System.Farming', () => {

    let farmSystem = null;
    let systems = null;
    let farmer = null;
    let level = null;

    beforeEach(() => {
        const pool = Entity.getPool();
        farmSystem = new System.Farming(['Crafting'], pool);
        systems = [];
        systems.push(farmSystem);
        farmer = new SentientActor('super farmer');
        level = factLevel.createLevel('arena', 20, 20);
        level.addActor(farmer, 1, 1);
    });

    it('handles tilling farming action', () => {

    });

    it('handles planting farming action', () => {

    });

    it('handles growing farming action', () => {

    });

    it('handles harvesting farming action', () => {

    });
});
