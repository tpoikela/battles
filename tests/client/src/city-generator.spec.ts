

import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {CityGenerator} from '../../../client/src/generator';
import {Level} from '../../../client/src/level';
import { Geometry } from '../../../client/src/geometry';

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
        //cityLevel.debugPrintInASCII();

        const elements = cityLevel.getElements();
        const shops = elements.filter(e => e.getType() === 'shop');
        expect(shops.length).to.be.above(0);

        const actors = cityLevel.getActors();
        const keepers = actors.filter(a => a.has('Shopkeeper'));
        expect(keepers.length).to.equal(conf.nShops);

        const keepComp = keepers[0].get('Shopkeeper');
        const [doorX, doorY] = keepComp.getDoorXY();
        const coord = Geometry.getBoxAround(doorX, doorY, 1, false);

        let nwalls = 0;
        coord.forEach(xy => {
            const cell = cityLevel.getMap().getCell(xy[0], xy[1]);
            const baseElem = cell.getBaseElem();
            if (/wall/.test(baseElem.getName())) {
                ++nwalls;
            }
        });
        expect(nwalls).to.be.at.least(2);


        const {cols, rows} = cityLevel.getMap();
        const extras = cityLevel.getExtras()['houses'];
        extras.forEach(house => {
            expect(house.x).to.be.below(cols);
            expect(house.y).to.be.below(rows);
        });


    });

});
