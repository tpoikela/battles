
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

describe('OverWorld.createOverWorld', function() {
    this.timeout(7000);

    it('can create an overworld with features', () => {
        const owConf = {
            owTilesX: 20,
            owTilesY: 10,
            worldX: 200,
            worldY: 100,
            nLevelsX: 4,
            nLevelsY: 2,
            areaX: 4,
            areaY: 2,
            nVWalls: [0.8]
        };
        const [world, worldConf] = RG.OverWorld.createOverWorld(owConf);
        expect(world).to.exist;
        expect(worldConf).to.exist;

        const area = worldConf.area[0];
        expect(area.nCities).to.be.above(5);
        expect(area.city.length).to.be.equal(area.nCities);
        expect(area.nDungeons).to.be.above(5);
    });
});
