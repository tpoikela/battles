const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const worldConf = require('../../../client/data/conf.world');

describe('Function: Creating game world from a file', function() {
    this.timeout(60000);
    it('can create world from external config object', () => {
        const fact = new RG.Factory.World();
        const world = fact.createWorld(worldConf);
        expect(world.getAreas()).to.have.length(worldConf.nAreas);
        expect(world.getName()).to.equal(worldConf.name);
        expect(world.getLevels()).to.have.length.above(0);
    });
});
