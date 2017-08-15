
const expect = require('chai').expect;
const OW = require('../../../client/src/overworld.map');

describe('OW.Map', () => {
    it('can be created', () => {
        const ow = new OW.Map();
        expect(ow).to.exist;
    });

    it('can be created with factory function', () => {
        const conf = {
            owTilesX: 40,
            owTilesY: 20,
            printResult: false
        };
        const overworld = OW.createOverWorld(conf);
        const map = overworld.getMap();

        expect(map).to.have.length(40);
        expect(map[0]).to.have.length(20);

    });
});
