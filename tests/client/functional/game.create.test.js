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

    it('Can create World using config object', function() {
        const worldConf = {
            name: 'w1',
            nAreas: 2,
            area: [
                { name: 'a1', maxX: 2, maxY: 3, nDungeons: 1,
                    dungeon: [
                        {x: 0, y: 0, name: 'd1.1', nBranches: 1,
                            branch: [ { name: 'b1', nLevels: 2,
                                entranceLevel: 0}]
                        }
                    ]
                },
                { name: 'a2', maxX: 1, maxY: 3, nMountains: 1,
                    mountain: [{x: 0, y: 1, name: 'm2.1', nFaces: 1,
                        face: [{name: 'Steep', nLevels: 1, x: 10, y: 10}]
                    }]
                }
            ]
        };
        const fact = new RG.Factory.World();
        const world = fact.createWorld(worldConf);
        expect(world.getName()).to.equal('w1');
        expect(world.getAreas()).to.have.length(2);
        expect(world.getAreas()[0].getDungeons()).to.have.length(1);
        expect(world.getDungeons(), 'Found 1 dungeon').to.have.length(1);
        expect(world.getMountains(), 'Found 1 mountain').to.have.length(1);

        expect(world.getDungeons()[0].getName(),
            'Dungeon name OK.').to.equal('d1.1');
    });
});
