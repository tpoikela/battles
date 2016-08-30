
var chai = require("chai");
var expect = chai.expect;

var RG = require("../battles");
var ROT = require("../lib/rot.js");

var RGTest = require("./roguetest.js");

var Brain = RG.Brain;

describe('Brain.Player', function() {
    var level = RGTest.createMockLevel(10, 10);
    it('Accepts key commands', function() {
        var player = new RG.Actor.Rogue("Player");
        player.setIsPlayer(true);
        level.addActor(player, 1, 1);
        var brain = new Brain.Player(player);

        brain.decideNextAction({code: ROT.VK_R});
        expect(brain.isRunModeEnabled()).to.equal(true);
        brain.decideNextAction({code: ROT.VK_S});
        expect(brain.isRunModeEnabled()).to.equal(false);

        brain.decideNextAction({code: ROT.VK_C});

    });
});

describe('Basic functions of Rogue Brain', function() {
    it('description', function() {
        var brain = new Brain.Rogue();
    });
});
