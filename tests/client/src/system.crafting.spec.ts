
import chai from 'chai';
import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';

import {SentientActor } from '../../../client/src/actor';
import {System} from '../../../client/src/system';
import {Entity} from '../../../client/src/entity';
import {FactoryLevel} from '../../../client/src/factory.level';
import * as Component from '../../../client/src/component';
import {ObjectShell, Parser} from  '../../../client/src/objectshellparser';

const expect = chai.expect;
chai.use(chaiBattles);

const factLevel = new FactoryLevel();

const parser: Parser = ObjectShell.getParser();

describe('System.Crafting', () => {

    let craftSystem = null;
    let systems = null;

    beforeEach(() => {
        const pool = Entity.getPool();
        craftSystem = new System.Crafting(['Crafting'], pool);
        systems = [];
        systems.push(craftSystem);
    });

    it('handles Crafting actions and crafts items', () => {
        const crafter = new SentientActor('super crafter');
        const level = factLevel.createLevel('arena', 20, 20);
        level.addActor(crafter, 1, 1);
        for (let i = 0; i < 4; i++) {
            const ironOre = parser.createItem('iron ore');
            crafter.getInvEq().getInventory().addItem(ironOre);
        }

        const crafting = new Component.Crafting();
        crafting.setItem('iron ingot');
        // crafting.setRecipe(recipe);
        crafter.add(crafting);
        RGTest.updateSystems(systems);

        const inv = crafter.getInvEq();
        const items = inv.getInventory().getItems();
        expect(items.length).to.equal(2);
        expect(items[0].getName()).to.equal('iron ore');
        expect(items[1].getName()).to.equal('iron ingot');

        // Check for failure to create due to insufficient materials
        const crafting2 = new Component.Crafting();
        crafting2.setItem('steel sword');
        crafter.add(crafting);
        RGTest.updateSystems(systems);
        expect(items.length).to.equal(2);
        expect(crafter).not.to.have.component('Crafting');
    });
});
