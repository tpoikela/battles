
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const World = require('../../../client/src/world');

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

        let stairs = levels[0].getStairsToLevel(levels[1]);
        expect(stairs === null).to.equal(false);
        stairs = levels[0].getStairsToLevel(levels[2]);
        expect(stairs === null).to.equal(true);
        const entrance = branch.getEntrance();
        expect(entrance, 'Entrance null unless set').to.be.null;
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
        const branchNames = [];

        for (let i = 0; i < numBranches; i++) {
            const brName = 'branch' + i;
            const branch = new World.Branch(brName);
            addLevelsToBranch(branch, i + 2);
            dungeon.addBranch(branch);
            branches.push(branch);
            branchNames.push(brName);
            const entrStairs = new RG.Element.Stairs(false);
            branch.setEntrance(entrStairs, 0);
        }
        expect(branches[0].getDungeon()).to.equal(dungeon);

        dungeon.setEntrance(branchNames);
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

    it('can be serialized to JSON', () => {
        const testArea = new World.Area('TestArea', 1, 2);
        const areaTile = new World.AreaTile(0, 1, testArea);
        const tileLevel = RG.FACT.createLevel('ruins', 10, 10);
        areaTile.setLevel(tileLevel);
        const json = areaTile.toJSON();
        expect(json.level).to.equal(tileLevel.getID());
        expect(json.x).to.equal(0);
        expect(json.y).to.equal(1);
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

    it('can be serialized to JSON', () => {
        const area = new World.Area('SwampArea', 1, 2);
        const json = area.toJSON();
        expect(json.tiles[0][0]).to.exist;
        expect(json.tiles[0][1]).to.exist;
        expect(json.name).to.equal('SwampArea');
    });
});

describe('World.Mountain', function() {

    it('has at least one entrance', () => {
        const mountain = new RG.World.Mountain('mount1');
        const face = new RG.World.MountainFace('northFace');
        const level = RG.FACT.createLevel('arena', 30, 30);
        face.addLevel(level);
        expect(face.getEntrance()).to.be.null;
        face.addEntrance(0);
        expect(face.getEntrance().getType()).to.match(/stairs/);
        expect(face.getLevels()).to.have.length(1);

        mountain.addFace(face);
        expect(mountain.getEntrances()).to.have.length(1);
        expect(mountain.getLevels()).to.have.length(1);
    });

});

describe('World.City', () => {
    it('contains levels and entrances', () => {
        const city = new RG.World.City('City1');
        expect(city.getName()).to.equal('City1');

        const level = RG.FACT.createLevel('arena', 20, 20);
        city.addLevel(level);
        city.addEntrance(0);
        expect(city.getEntrances()).to.have.length(1);
    });
});

