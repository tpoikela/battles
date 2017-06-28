
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

const expectConnected = RGTest.expectConnected;

describe('Factory.World', function() {
    this.timeout(3000);
    let fact = null;

    beforeEach(() => {
        fact = new RG.Factory.World();
    });

    afterEach(() => {
        fact = null;
    });

    it('can create cities', () => {
        const cityConf = {
            name: 'Arkham'
        };
        const city = fact.createCity(cityConf);
        expect(city.getName()).to.equal(cityConf.name);
    });

    it('can create Branch using config object', () => {
        const brConf = {
            name: 'DangerousBranch',
            nLevels: 2,
            entranceLevel: 0
        };
        const br = fact.createBranch(brConf);
        expect(br.getName()).to.equal(brConf.name);
        expect(br.getEntrance()).to.not.be.empty;

        const l0 = br.getLevels()[0];

        // Should have entrance + stairs down == 2 stairs
        expect(l0.getStairs()).to.have.length(2);
    });

    it('Can create dungeon using config object', () => {
        const dungeonConf = {
            name: 'Cave',
            nBranches: 3,
            entrance: 'br2',
            connect: [
                // Each connection is branch1, branch2, level1, level2
                ['br1', 'br2', 0, 1],
                ['br3', 'br2', 2, 0]
            ],
            branch: [
                { name: 'br1', nLevels: 1 },
                { name: 'br2', nLevels: 2 },
                { name: 'br3', nLevels: 3 }
            ]
        };
        const dungeon = fact.createDungeon(dungeonConf);
        const branches = dungeon.getBranches();
        expect(dungeon.getName()).to.equal('Cave');
        expect(dungeon.getLevels()).to.have.length(6);
        expect(dungeon.getEntrances()).to.have.length(1);
        expectConnected(branches[0], branches[1], 1);
        expectConnected(branches[1], branches[2], 1);
    });


    it('creates properly connected dungeons with branches', () => {
        const dConf = {
            x: 0, y: 0,
            name: 'BranchTest',
            nBranches: 3,
            connect: [
                ['main', 'side', 0, 0],
                ['main', 'side2', 0, 0]
            ],
            branch: [
                {name: 'main', nLevels: 1},
                {name: 'side', nLevels: 1, entranceLevel: 0},
                {name: 'side2', nLevels: 1, entranceLevel: 0}
            ]
        };
        const dungeon = fact.createDungeon(dConf);
        const branches = dungeon.getBranches();
        expectConnected(branches[0], branches[1], 1);
        expectConnected(branches[0], branches[2], 1);

        const entrB1 = branches[1].getEntrance();
        const entrB2 = branches[2].getEntrance();
        expect(entrB1).to.exist;
        expect(entrB1.getTargetStairs()).to.be.null;
        expect(entrB2).to.exist;
        expect(entrB2.getTargetStairs()).to.be.null;
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
                { name: 'a2', maxX: 1, maxY: 4, nMountains: 1,
                    mountain: [{x: 0, y: 1, name: 'm2.1'}]
                }
            ]
        };
        const world = fact.createWorld(worldConf);
        expect(world.getName()).to.equal('w1');
        expect(world.getAreas()).to.have.length(2);
        expect(world.getAreas()[0].getDungeons()).to.have.length(1);
        expect(world.getDungeons(), 'Found 1 dungeon').to.have.length(1);
        expect(world.getMountains(), 'Found 1 mountain').to.have.length(1);

        expect(world.getDungeons()[0].getName(),
            'Dungeon name OK.').to.equal('d1.1');
    });

    it('can create cities within areas', () => {
        const worldConf = {
            name: 'ww',
            nAreas: 1,
            area: [
                { name: 'a1', maxX: 4, maxY: 5, nCities: 1,
                    city: [{ x: 2, y: 2, name: 'Ravendark' }]
                }
            ]
        };
        const world = fact.createWorld(worldConf);
        expect(world.getCities()).to.have.length(1);
    });

});
