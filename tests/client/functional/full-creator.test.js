
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const WorldConf = require('../../../client/src/world.creator');

describe('Creator + Factory', function() {
    this.timeout(60000);

    let world = null;

    beforeEach(() => {
        const conf = {
            name: 'My World',
            worldSize: 'Small',
            areaSize: 'Small'
        };
        const creator = new WorldConf.Creator();
        const worldConf = creator.createWorldConf(conf);

        const worldFact = new RG.Factory.World();
        world = worldFact.createWorld(worldConf);

    });

    afterEach(() => {world = null;});

    it('creates a full randomized world', () => {
        expect(world.getName()).to.equal('My World');
        expect(world.getAreas()).to.have.length(1);
    });
});
