
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


describe('World.Dungeon', function() {
    it('Contains a number of connected branches', function() {
    });
});

describe('World.AreaTile', function() {
    it('Contains a level and connects from sides to other tiles', function() {
    });
});


describe('World.Area', function() {
    it('Contains a number of connected tiles', function() {
    });
});


describe('World.World', function() {
    it('Contains a number of dungeon and areas', function() {
    });
});
