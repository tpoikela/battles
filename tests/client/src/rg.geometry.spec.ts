
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import { Geometry } from '../../../client/src/geometry';
import {SentientActor } from '../../../client/src/actor';
import {FactoryLevel} from '../../../client/src/factory.level';
import * as Item from '../../../client/src/item';

describe('Geometry', () => {

    let factLevel = null;

    beforeEach(() => {
        factLevel = new FactoryLevel();
    });

    describe('splitLevels()', () => {
        it('can split levels into two', () => {
            const l1 = factLevel.createLevel('arena', 20, 10);

            const conf = {nLevelsX: 2, nLevelsY: 1};
            const levels = Geometry.splitLevel(l1, conf);

            expect(levels).to.have.length(2);

            const subLevel1 = levels[0][0];
            const subLevel2 = levels[1][0];

            const map1 = subLevel1.getMap();
            const map2 = subLevel2.getMap();
            expect(map1.getCell(0, 0).getBaseElem().getType())
                .to.equal('wall');
            expect(map2.getCell(9, 9).getBaseElem().getType())
                .to.equal('wall');

        });

        it('moves actors correctly', () => {
            const l1 = factLevel.createLevel('arena', 40, 40);
            const actor1 = new SentientActor('rogue1');
            const actor2 = new SentientActor('rogue2');
            const actor3 = new SentientActor('rogue3');

            l1.addActor(actor1, 0, 0);
            l1.addActor(actor2, 22, 9);
            l1.addActor(actor3, 10, 9);

            const sword = new Item.Weapon('sword');
            const food = new Item.Food('edible');
            l1.addItem(sword, 38, 38);
            l1.addItem(food, 39, 2);

            for (let i = 0; i < 3; i++) {
                const gold = new Item.Gold('gold nugget');
                l1.addItem(gold, 5 + i, 30 + i);
            }

            const conf = {nLevelsX: 2, nLevelsY: 2};
            const levels = Geometry.splitLevel(l1, conf);
            expect(levels).to.have.length(2);
            expect(levels[0]).to.have.length(2);

            const l00 = levels[0][0];
            expect(l00.getActors()).to.have.length(2);

            const l10 = levels[1][0];
            expect(l10.getActors()).to.have.length(1);
            expect(l10.getItems()).to.have.length(1);

            const l01 = levels[0][1];
            expect(l01.getItems()).to.have.length(3);

            const l11 = levels[1][1];
            expect(l11.getItems()).to.have.length(1);

        });
    });
});
