
import {expect} from 'chai';

import RG from '../../../client/src/rg';
import * as Element from '../../../client/src/element';
import * as Item from '../../../client/src/item';
import * as Component from '../../../client/src/component';
import {ELEM} from '../../../client/data/elem-constants';

type ElementBase = Element.ElementBase;

describe('Element', () => {
    it('must have a defined type', () => {
        Object.values(ELEM).forEach((elem: ElementBase) => {
            expect(elem.getType(), JSON.stringify(elem)).not.to.be.empty;
            expect(elem.isPassable).to.exist;
        });
    });

    it('has factory function create', () => {
        const elem = Element.create('Web');
        expect(elem).to.be.an.instanceof(Element.ElementWeb);
    });

});

describe('Element.Shop', () => {
    it('has adjustable price for items', () => {
        const arrow = new Item.Missile('Arrow');
        arrow.setValue(100);
        arrow.add(new Component.Unpaid());

        const elemShop = new Element.ElementShop();
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
        door = new Element.ElementLeverDoor();
    });

    it('is not passable when closed', () => {
        expect(door.isPassable()).to.equal(false);
        expect(door.isPassableByAir()).to.equal(false);
    });

});

describe('Lever', () => {

    let lever = null;

    beforeEach(() => {
        lever = new Element.ElementLever();
    });

    it('has proper prop type', () => {
        expect(lever.getPropType()).to.equal(RG.TYPE_ELEM);
        expect(RG.isElement(lever)).to.equal(true);

    });

});
