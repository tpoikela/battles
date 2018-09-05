
// const RG = require('../../../client/src/battles');
const expect = require('chai').expect;
const {House, HouseGenerator} = require('../../../client/src/houses');

const MapGen = require('../../../client/src/map.generator');

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
    });

    it('can be used in town maps', () => {
        const mapGen = new MapGen();
        const conf = {};
        const townMap = mapGen.createTownBSP(160, 100, conf);
        expect(townMap).to.not.be.empty;
        townMap.map.debugPrintInASCII();
    });
});
