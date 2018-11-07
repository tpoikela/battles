
import {expect} from 'chai';

import RG from '../../../client/src/rg';
import Element, {ELEM} from '../../../client/src/element';
import Item from '../../../client/src/item';
import Component from '../../../client/src/component';

// type Component.Unpaid = Component.Unpaid;
type ElementBase = Element.Base;

describe('Element', () => {
    it('must have a defined type', () => {
        Object.values(ELEM).forEach((elem: ElementBase) => {
            expect(elem.getType(), JSON.stringify(elem)).not.to.be.empty;

            expect(elem.isPassable).to.exist;
        });
    });

});

describe('Element.Shop', () => {
    it('has adjustable price for items', () => {
        const arrow = new Item.Missile('Arrow');
        arrow.setValue(100);
        arrow.add(new Component.Unpaid());

        const elemShop = new Element.Shop();
        elemShop.setCostFactor(1.0, 1.0);

        const priceOne = elemShop.getItemPriceForBuying(arrow);

        arrow.setCount(10);
        const priceTen = elemShop.getItemPriceForBuying(arrow);

        expect(priceTen).to.equal(10 * priceOne);

        elemShop.setCostFactor(0.5, 0.5);

        const priceTenHalved = elemShop.getItemPriceForBuying(arrow);
        expect(priceTenHalved).to.equal(0.5 * priceTen);
    });
});

describe('LeverDoor', () => {

    let door = null;

    beforeEach(() => {
        door = new Element.LeverDoor();
    });

    it('is not passable when closed', () => {
        expect(door.isPassable()).to.equal(false);
        expect(door.isPassableByAir()).to.equal(false);
    });

});
