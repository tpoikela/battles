
var expect = require('chai').expect;

var RG = require('../client/src/battles');

var World = require('../client/src/world.js');


describe('World.Branch', function() {
    it('Contains a number of connected levels', function() {
        var nlevels = 4;
        var levels = [];
        var branch = new World.Branch();
        for (var i = 0; i < nlevels; i++) {
            levels.push(RG.FACT.createLevel('arena', 20, 20));
            branch.addLevel(levels[i]);
            expect(branch.hasLevel(levels[i])).to.equal(true);
        }

        branch.connectLevels();

        var stairs = levels[0].getStairs(levels[1]);
        expect(stairs === null).to.equal(false);
        stairs = levels[0].getStairs(levels[2]);
        expect(stairs === null).to.equal(true);
        var entrance = branch.getEntrance();
        expect(entrance === null).to.equal(false);


    });
});

var addLevelsToBranch = function(br, nLevels) {
    for (var i = 0; i < nLevels; i++) {
        var level = RG.FACT.createLevel('arena', 20, 20);
        br.addLevel(level);
    }
    br.connectLevels();
};

describe('World.Dungeon', function() {
    it('Contains a number of connected branches', function() {
        var dungeon = new World.Dungeon('DarkDungeon');

        var branches = [];
        for (var i = 0; i < 4; i++) {
            var branch = new World.Branch('branch' + i);
            addLevelsToBranch(branch, i + 2);
            dungeon.addBranch(branch);
            branches.push(branch);
        }
        expect(branches[0].getDungeon()).to.equal(dungeon);

        dungeon.connectBranches(branches[0], branches[1], 1, 2);

    });
});

describe('World.AreaTile', function() {
    it('Contains a level and connects from sides to other tiles', function() {
        var cols = 20;
        var rows = 20;

        var testArea = new World.Area('TestArea', 1, 1);
        var areaTile = new World.AreaTile(0, 0, testArea);
        var tileLevel = RG.FACT.createLevel('ruins', cols, rows);
        areaTile.setLevel(tileLevel);
        expect(areaTile.isNorthEdge()).to.equal(true);
        expect(areaTile.isSouthEdge()).to.equal(true);
        expect(areaTile.isEastEdge()).to.equal(true);
        expect(areaTile.isWestEdge()).to.equal(true);
        expect(areaTile.cols).to.equal(cols);

        testArea = new World.Area('TestArea', 3, 3);
        var tile11 = new World.AreaTile(1, 1, testArea);
        var level11 = RG.FACT.createLevel('ruins', cols, rows);
        tile11.setLevel(level11);
        expect(tile11.isNorthEdge()).to.equal(false);
        expect(tile11.isSouthEdge()).to.equal(false);
        expect(tile11.isWestEdge()).to.equal(false);
        expect(tile11.isEastEdge()).to.equal(false);

        // Create 2 more tiles, and test connect()
        var tile21 = new World.AreaTile(2, 1, testArea);
        var level21 = RG.FACT.createLevel('ruins', cols, rows);
        tile21.setLevel(level21);
        var tile12 = new World.AreaTile(1, 2, testArea);
        var level12 = RG.FACT.createLevel('ruins', cols, rows);
        tile12.setLevel(level12);
        tile11.connect(tile21, tile12);

        expect(level21.getStairs(level11) === null).to.equal(false);
        expect(level11.getStairs(level21) === null).to.equal(false);
        expect(level12.getStairs(level11) === null).to.equal(false);
    });
});


describe('World.Area', function() {
    it('Contains a number of connected tiles', function() {
        var area = new World.Area('SwampArea');
    });
});


describe('World.World', function() {
    it('Contains a number of dungeon and areas', function() {
        var conf = {
            nAreas: 2,
            nDungeons: 3
        };
        var world = new World.World(conf);
    });
});
