
// const RG = require('../../../client/src/battles');
import {expect} from 'chai';
import {House, HouseGenerator} from '../../../client/src/houses';
import {MapGenerator} from '../../../client/src/generator';
import {CellMap} from '../../../client/src/map';

describe('HouseGenerator', () => {

    let houseGen = null;

    beforeEach(() => {
        houseGen = new HouseGenerator();
    });

    it('creates houses based on cols/rows', () => {
        const conf = {cols: 10, rows: 12, fullHouse: true};
        const house = houseGen.createHouse(conf);
        expect(house).to.be.instanceOf(House);
        let expBbox = {ulx: 0, uly: 0, lrx: 9, lry: 11};
        expect(house.getBbox()).to.deep.equal(expBbox);

        house.adjustCoord(10, 20);
        expBbox = {ulx: 0 + 10, uly: 0 + 20, lrx: 9 + 10, lry: 11 + 20};
        expect(house.getBbox()).to.deep.equal(expBbox);
    });

    it('can have windows with houses created', () => {
        const conf = {cols: 10, rows: 12, fullHouse: true};
        const house = houseGen.createHouse(conf);
        expect(house).to.be.instanceOf(House);
        const nWindows = house.addWindows(2);
        expect(nWindows).to.equal(2);
    });

    it('can be used in town maps', () => {
        const mapGen = new MapGenerator();
        const conf = {};
        const townMap = mapGen.createTownBSP(160, 100, conf).map;
        expect(townMap).to.be.an.instanceof(CellMap);
        // townMap.map.debugPrintInASCII();
    });
});
