
// const RG = require('../../../client/src/battles');
import {expect} from 'chai';
import {House, HouseGenerator} from '../../../client/src/houses';
import {MapGenerator} from '../../../client/src/map.generator';

describe('HouseGenerator', () => {

    let houseGen = null;

    beforeEach(() => {
        houseGen = new HouseGenerator();
    });

    it('creates houses based on cols/rows', () => {
        const conf = {cols: 10, rows: 12, fullHouse: true};
        const house = houseGen.createHouse(conf);
        expect(house).to.not.be.empty;
        expect(house).to.be.instanceOf(House);
        // console.log('House is:', JSON.stringify(house, null, 1));
        let expBbox = {ulx: 0, uly: 0, lrx: 9, lry: 11};
        expect(house.getBbox()).to.deep.equal(expBbox);

        house.adjustCoord(10, 20);
        expBbox = {ulx: 0 + 10, uly: 0 + 20, lrx: 9 + 10, lry: 11 + 20};
        expect(house.getBbox()).to.deep.equal(expBbox);
    });

    it('can be used in town maps', () => {
        const mapGen = new MapGenerator();
        const conf = {};
        const townMap = mapGen.createTownBSP(160, 100, conf);
        expect(townMap).to.not.be.empty;
        // townMap.map.debugPrintInASCII();
    });
});
