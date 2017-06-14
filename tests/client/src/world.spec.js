
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const World = require('../../../client/src/world.js');


describe('World.Branch', function() {
    it('Contains a number of connected levels', function() {
        const nlevels = 4;
        const levels = [];
        const branch = new World.Branch();
        for (let i = 0; i < nlevels; i++) {
            levels.push(RG.FACT.createLevel('arena', 20, 20));
            branch.addLevel(levels[i]);
            expect(branch.hasLevel(levels[i])).to.equal(true);
        }
        branch.connectLevels();

        let stairs = levels[0].getStairs(levels[1]);
        expect(stairs === null).to.equal(false);
        stairs = levels[0].getStairs(levels[2]);
        expect(stairs === null).to.equal(true);
        const entrance = branch.getEntrance();
        expect(entrance === null).to.equal(false);
    });
});

const addLevelsToBranch = function(br, nLevels) {
    for (let i = 0; i < nLevels; i++) {
        const level = RG.FACT.createLevel('arena', 20, 20);
        br.addLevel(level);
    }
    br.connectLevels();
};

describe('World.Dungeon', function() {
    it('Contains a number of connected branches', function() {
        const dungeon = new World.Dungeon('DarkDungeon');
        const branches = [];
        const numBranches = 4;

        for (let i = 0; i < numBranches; i++) {
            const branch = new World.Branch('branch' + i);
            addLevelsToBranch(branch, i + 2);
            dungeon.addBranch(branch);
            branches.push(branch);
        }
        expect(branches[0].getDungeon()).to.equal(dungeon);

        const entrances = dungeon.getEntrances();
        expect(entrances).to.have.length(numBranches);

        entrances.forEach(entr => {
            const level = entr.getSrcLevel();
            expect(level).not.to.be.empty;
        });

        dungeon.connectBranches(branches[0], branches[1], 1, 2);
    });
});

describe('World.AreaTile', function() {
    it('Contains a level and connects from sides to other tiles', function() {
        const cols = 20;
        const rows = 20;

        let testArea = new World.Area('TestArea', 1, 1);
        const areaTile = new World.AreaTile(0, 0, testArea);
        const tileLevel = RG.FACT.createLevel('ruins', cols, rows);
        areaTile.setLevel(tileLevel);
        expect(areaTile.isNorthEdge()).to.equal(true);
        expect(areaTile.isSouthEdge()).to.equal(true);
        expect(areaTile.isEastEdge()).to.equal(true);
        expect(areaTile.isWestEdge()).to.equal(true);
        expect(areaTile.cols).to.equal(cols);

        testArea = new World.Area('TestArea', 3, 3);
        const tile11 = new World.AreaTile(1, 1, testArea);
        const level11 = RG.FACT.createLevel('ruins', cols, rows);
        tile11.setLevel(level11);
        expect(tile11.isNorthEdge()).to.equal(false);
        expect(tile11.isSouthEdge()).to.equal(false);
        expect(tile11.isWestEdge()).to.equal(false);
        expect(tile11.isEastEdge()).to.equal(false);

        // Create 2 more tiles, and test connect()
        const tile21 = new World.AreaTile(2, 1, testArea);
        const level21 = RG.FACT.createLevel('ruins', cols, rows);
        tile21.setLevel(level21);
        const tile12 = new World.AreaTile(1, 2, testArea);
        const level12 = RG.FACT.createLevel('ruins', cols, rows);
        tile12.setLevel(level12);
        tile11.connect(tile21, tile12);

        expect(level21.getStairs(level11) === null).to.equal(false);
        expect(level11.getStairs(level21) === null).to.equal(false);
        expect(level12.getStairs(level11) === null).to.equal(false);
    });
});


describe('World.Area', function() {
    it('Contains a number of connected tiles', function() {
        const area = new World.Area('SwampArea', 4, 5);
        const tiles = area.getTiles();
        const levels = area.getLevels();
        expect(tiles[1][0].isNorthEdge()).to.equal(true);
        expect(tiles[1][1].isNorthEdge()).to.equal(false);
        expect(tiles[3][4].isSouthEdge()).to.equal(true);
        expect(tiles[1][0].isSouthEdge()).to.equal(false);
        expect(tiles[3][4].isEastEdge()).to.equal(true);
        expect(tiles[2][4].isEastEdge()).to.equal(false);
        expect(levels).to.have.length(20);
    });
});

describe('World.Mountain', function() {

});

describe('World.World', function() {
    let fact = null;

    beforeEach(() => {
        fact = new RG.World.Factory();
    });

    afterEach(() => {
        fact = null;
    });

    it('Contains a number areas, dungeons and mountains', function() {
        const worldConf = {
            name: 'w1',
            nAreas: 2,
            area: [
                { name: 'a1', maxX: 2, maxY: 3, nDungeons: 1,
                    dungeon: [{name: 'd1.1'}]
                },
                { name: 'a2', maxX: 1, maxY: 4, nMountains: 1,
                    mountain: [{name: 'm2.1'}]
                }
            ]
        };
        const world = fact.createWorld(worldConf);
        expect(world.getName()).to.equal('w1');
        expect(world.getAreas()).to.have.length(2);
        expect(world.getAreas()[0].getDungeons()).to.have.length(1);
        expect(world.getDungeons(), 'Found 1 dungeon').to.have.length(1);
        expect(world.getMountains(), 'Found 1 mountain').to.have.length(1);
    });

    it('Can also contain cities within areas', () => {
        const worldConf = {
            name: 'ww',
            nAreas: 1,
            area: [
                { name: 'a1', maxX: 4, maxY: 5, nCities: 1,
                    city: [{ name: 'Ravendark' }]
                }
            ]
        };
        const world = fact.createWorld(worldConf);
        expect(world.getCities()).to.have.length(1);
    });

    it('can be created from external config file', () => {
        const worldConf = require('../../../client/data/conf.world');
        const world = fact.createWorld(worldConf);
        expect(world.getAreas()).to.have.length(worldConf.nAreas);
        expect(world.getName()).to.equal(worldConf.name);
        expect(world.getLevels()).to.have.length.above(0);
    });
});
