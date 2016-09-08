
var chai = require("chai");
var expect = chai.expect;

var RG = require("../battles.js");

var World = require("../src/world.js");


describe('World.Branch', function() {
    it('Contains a number of connected levels', function() {
        var nlevels = 4;
        var levels = [];
        var branch = new World.Branch();
        for (var i = 0; i < nlevels; i++) {
            levels.push(RG.FACT.createLevel("arena", 20, 20));
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
        var level = RG.FACT.createLevel("arena", 20, 20);
        br.addLevel(level);
    }
    br.connectLevels();
};

describe('World.Dungeon', function() {
    it('Contains a number of connected branches', function() {
        var dungeon = new World.Dungeon("DarkDungeon");

        var branches = [];
        for (var i = 0; i < 4; i++) {
            var branch = new World.Branch("branch" + i);
            addLevelsToBranch(branch, i+2);
            dungeon.addBranch(branch);
            branches.push(branch);
        }
        expect(branches[0].getDungeon()).to.equal(dungeon);

        dungeon.connectBranches(branches[0], branches[1], 1, 2);

    });
});

describe('World.AreaTile', function() {
    it('Contains a level and connects from sides to other tiles', function() {
        var areaTile = new World.AreaTile();
    });
});


describe('World.Area', function() {
    it('Contains a number of connected tiles', function() {
        var area = new World.Area();
    });
});


describe('World.World', function() {
    it('Contains a number of dungeon and areas', function() {
        var conf = {
            nAreas: 2,
            nDungeons: 3,
        };
        var world = new World.World(conf);
    });
});
