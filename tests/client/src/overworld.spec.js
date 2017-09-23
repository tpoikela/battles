
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

describe('OverWorld.createOverWorld', function() {
    this.timeout(5000);

    it('can create an overworld with features', () => {
        const owConf = {
            owTilesX: 40,
            owTilesY: 20,
            worldX: 400,
            worldY: 200,
            nLevelsX: 4,
            nLevelsY: 2,
            areaX: 4,
            areaY: 2
        };
        const [world, worldConf] = RG.OverWorld.createOverWorld(owConf);
        expect(world).to.exist;
        expect(worldConf).to.exist;
    });
});
