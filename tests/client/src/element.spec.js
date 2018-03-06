
import {expect} from 'chai';

const RG = require('../../../client/src/battles');

RG.Element = require('../../../client/src/element');

describe('Element', () => {
    it('must have a defined type', () => {
        Object.values(RG.ELEM).forEach(elem => {
            expect(elem.getType(), JSON.stringify(elem)).not.to.be.empty;

            expect(elem.isPassable).to.exist;
        });
    });

});

describe('Element.Shop', () => {
    it('has adjustable price for items', () => {
        const arrow = new RG.Item.Missile('Arrow');
        arrow.setValue(100);
        arrow.add(new RG.Component.Unpaid());

        const elemShop = new RG.Element.Shop();
        elemShop.setCostFactor(1.0, 1.0);

        const priceOne = elemShop.getItemPriceForBuying(arrow);

        arrow.count = 10;
        const priceTen = elemShop.getItemPriceForBuying(arrow);

        expect(priceTen).to.equal(10 * priceOne);

        elemShop.setCostFactor(0.5, 0.5);

        const priceTenHalved = elemShop.getItemPriceForBuying(arrow);
        expect(priceTenHalved).to.equal(0.5 * priceTen);
    });
});
