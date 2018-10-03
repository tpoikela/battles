
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

describe('Goal.Thief', () => {
    it('manages the thief behaviour', () => {

        const thief = new RG.Actor.Rogue();
        const thiefBrain = new RG.Brain.Thief(thief);
        thief.setBrain(thiefBrain);

        const shopkeeper = new RG.Actor.Rogue();
        shopkeeper.add(new RG.Component.Shopkeeper());
        const coins = new RG.Item.GoldCoin();
        coins.count = 100;
        shopkeeper.getInvEq().addItem(coins);

        const level = RGTest.wrapIntoLevel([thief, shopkeeper], 5, 5);

        const shopElem = new RG.Element.Shop();
        shopElem.setShopkeeper(shopkeeper);
        const food = new RG.Item.Food('food');
        food.add(new RG.Component.Unpaid());
        level.addElement(shopElem, 2, 2);
        level.addItem(food, 2, 2);

        const sword = new RG.Item.Weapon('sword');
        level.addItem(sword, 1, 1);

        const game = new RG.Game.Main();
        game.addLevel(level);
        const catcher = new RGTest.MsgCatcher();
        catcher.enabled = true;

        let maxTries = 100;
        while (level.getItems().length === 2) {
            console.log('GOT HERE');
            game.simulate();
            if (--maxTries === 0) {
                break;
            }
        }

        expect(catcher.numCaught).to.be.above(0);

        const thiefInv = thief.getInvEq().getInventory();
        expect(thiefInv.getItems()).to.deep.equal([sword]);

    });
});
