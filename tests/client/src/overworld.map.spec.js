
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
            owTilesY: 20
        };
        const overworld = OW.createOverWorld(conf);
        const map = overworld.getMap();

        expect(map).to.have.length(40);
        expect(map[0]).to.have.length(20);
    });

    it('has biomes and features added', () => {
        const conf = {
            owTilesX: 40,
            owTilesY: 20
        };
        const ow = OW.createOverWorld(conf);
        expect(ow.getBiome(0, 1)).to.not.be.empty;

        const features = ow.getFeaturesByType(OW.WCAPITAL);
        expect(features).to.have.length(1);
    });
});
