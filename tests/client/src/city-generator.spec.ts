

import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {CityGenerator} from '../../../client/src/city-generator';
import {Level} from '../../../client/src/level';

describe('CityGenerator', () => {

    let cityGen = null;

    beforeEach(() => {
        cityGen = new CityGenerator();
    });

    it('can create city levels with default config', () => {
        const conf = CityGenerator.getOptions();
        conf.nShops = 1;
        conf.actorFunc = (shell) => shell.type === 'bearfolk';
        const cityLevel = cityGen.create(80, 50, conf);
        // cityLevel.debugPrintInASCII();

        const elements = cityLevel.getElements();
        const shops = elements.filter(e => e.getType() === 'shop');
        expect(shops.length).to.be.above(0);

        const actors = cityLevel.getActors();
        const keepers = actors.filter(a => a.has('Shopkeeper'));
        expect(keepers.length).to.equal(conf.nShops);
        // expect(keepers[0].getType()).to.equal('bearfolk');
    });

});
