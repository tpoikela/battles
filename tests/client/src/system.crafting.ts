
import chai from 'chai';
import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';

import {SentientActor } from '../../../client/src/actor';
import {System} from '../../../client/src/system';
import {Entity} from '../../../client/src/entity';
import {FactoryLevel} from '../../../client/src/factory.level';

const expect = chai.expect;
chai.use(chaiBattles);

const factLevel = new FactoryLevel();

describe('System.Crafting', () => {

    let craftSystem = null;
    let systems = null;

    beforeEach(() => {
        const pool = Entity.getPool();
        craftSystem = new System.Crafting(['Crafting'], pool);
        systems = [];
        systems.push(craftSystem);
    });

    it.only('handles Crafting actions and crafts items', () => {
        const crafter = new SentientActor('super crafter');
        const level = factLevel.createLevel('arena', 20, 20);
        level.addActor(crafter, 1, 1);

        const crafting = new Component.Crafting();
        const recipe = {
            inputs: [],
            outputs: []
        };
        crafting.setRecipe(recipe);
        crafter.add(crafting);
        RGTest.updateSystems(systems);
    });
});
