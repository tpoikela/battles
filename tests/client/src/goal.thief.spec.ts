
import { expect } from 'chai';

import RG from '../../../client/src/rg';
import {RGTest} from '../../roguetest';
import { Brain } from '../../../client/src/brain';
import { SentientActor } from '../../../client/src/actor';
import * as Item from '../../../client/src/item';
import { RGUnitTests } from '../../rg.unit-tests';
import * as Component from '../../../client/src/component';
import * as Element from '../../../client/src/element';
import {GameMain} from '../../../client/src/game';
import {Goal} from '../../../client/src/goals';

describe('Goal.Thief', () => {
    it('manages the thief behaviour', () => {
        const game = new GameMain();

        const thief = new SentientActor('thief');
        const thiefBrain = new Brain.Thief(thief);
        thief.setBrain(thiefBrain);

        const shopkeeper = new SentientActor('keeper');
        shopkeeper.add(new Component.Shopkeeper());
        shopkeeper.setBrain(new Brain.GoalOriented(shopkeeper));
        const coins = new Item.GoldCoin();
        coins.setCount(100);
        shopkeeper.getInvEq().addItem(coins);

        const level = RGUnitTests.wrapIntoLevel([thief, shopkeeper], 5, 5);
        game.setShownLevel(level);

        const shopElem = new Element.ElementShop();
        shopElem.setShopkeeper(shopkeeper);
        const food = new Item.Food('food');
        food.add(new Component.Unpaid());
        level.addElement(shopElem, 2, 2);
        level.addItem(food, 2, 2);

        const sword = new Item.Weapon('sword');
        level.addItem(sword, 1, 1);

        game.addActiveLevel(level);
        const catcher = new RGTest.MsgCatcher();
        catcher.enabled = true;
        catcher.printMsg = false;

        let maxTries = 100;
        while (level.getItems().length === 2) {
            game.simulate(1);
            if (--maxTries === 0) {
                break;
            }
        }

        const thiefInv = thief.getInvEq().getInventory();
        expect(thiefInv.getItems()).to.deep.equal([sword]);

        for (let i = 0; i < 100; i++) {
            game.simulate(1);
        }

        expect(catcher.numCaught).to.be.above(0);


    });
});
